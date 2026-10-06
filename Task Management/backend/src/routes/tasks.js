import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { Task, taskPriorities, taskStatuses } from "../models/Task.js";
import { Comment } from "../models/Comment.js";
import { Attachment } from "../models/Attachment.js";
import { Activity } from "../models/Activity.js";
import { eventBus } from "../services/events.js";

const dateValue = z.coerce.date();
const taskInput = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(4000).optional(),
  dueDate: dateValue.nullable().optional(),
  priority: z.enum(taskPriorities).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  status: z.enum(taskStatuses).optional(),
  workspaceId: z.string().refine(Types.ObjectId.isValid).optional(),
  projectId: z.string().refine(Types.ObjectId.isValid).optional(),
  assigneeId: z.string().refine(Types.ObjectId.isValid).optional(),
  labels: z.array(z.string().refine(Types.ObjectId.isValid)).optional()
});

const taskQuery = z.object({
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  search: z.string().trim().optional(),
  workspaceId: z.string().refine(Types.ObjectId.isValid).optional(),
  projectId: z.string().refine(Types.ObjectId.isValid).optional(),
  assigneeId: z.string().refine(Types.ObjectId.isValid).optional(),
  dueFrom: dateValue.optional(),
  dueTo: dateValue.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["position", "createdAt", "dueDate", "priority"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
});

export const taskRouter = Router();
taskRouter.use(requireAuth);

// 1. GET /api/tasks (List tasks with search, pagination, and filters)
taskRouter.get("/", async (req, res, next) => {
  try {
    const query = taskQuery.parse(req.query);
    const filter = {
      $or: [{ ownerId: req.userId }, { assigneeId: req.userId }]
    };

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.workspaceId) filter.workspaceId = query.workspaceId;
    if (query.projectId) filter.projectId = query.projectId;
    if (query.assigneeId) filter.assigneeId = query.assigneeId;

    if (query.search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: query.search, $options: "i" } },
          { description: { $regex: query.search, $options: "i" } },
          { category: { $regex: query.search, $options: "i" } }
        ]
      });
    }

    if (query.dueFrom || query.dueTo) {
      filter.dueDate = {
        ...(query.dueFrom && { $gte: query.dueFrom }),
        ...(query.dueTo && { $lte: query.dueTo })
      };
    }

    const sortField = query.sortBy || "position";
    const sortDirection = query.sortOrder === "desc" ? -1 : 1;
    const sort = { [sortField]: sortDirection, createdAt: -1 };

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip(skip).limit(limit).populate("assigneeId", "name email avatarUrl").populate("labels"),
      Task.countDocuments(filter)
    ]);

    return res.json({
      tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return next(error);
  }
});

// 2. POST /api/tasks (Create a task)
taskRouter.post("/", async (req, res, next) => {
  try {
    const input = taskInput.parse(req.body);
    const status = input.status || "todo";
    const last = await Task.findOne({ ownerId: req.userId, status }).sort({ position: -1 }).select("position");

    const task = await Task.create({
      ...input,
      ownerId: req.userId,
      position: (last?.position ?? -1) + 1
    });

    await Activity.create({
      taskId: task._id,
      userId: req.userId,
      action: "created",
      newValue: { title: task.title, status: task.status }
    });

    eventBus.emit("task:created", { task, userId: req.userId });

    return res.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
});

// 3. PATCH /api/tasks/reorder (Drag-and-drop order updates)
taskRouter.patch("/reorder", async (req, res, next) => {
  try {
    const { tasks, workspaceId } = z
      .object({
        tasks: z
          .array(
            z.object({
              id: z.string().refine(Types.ObjectId.isValid),
              position: z.number().int().min(0),
              status: z.enum(taskStatuses).optional()
            })
          )
          .min(1),
        workspaceId: z.string().refine(Types.ObjectId.isValid).optional()
      })
      .parse(req.body);

    const taskIds = tasks.map((task) => task.id);
    const existing = await Task.find({
      _id: { $in: taskIds },
      $or: [{ ownerId: req.userId }, { assigneeId: req.userId }]
    });

    if (existing.length === 0) {
      return res.status(404).json({ message: "No matching tasks found to reorder." });
    }

    const detectedWorkspaceId = workspaceId || existing[0]?.workspaceId?.toString();

    await Task.bulkWrite(
      tasks.map((task) => ({
        updateOne: {
          filter: { 
            _id: task.id, 
            $or: [{ ownerId: req.userId }, { assigneeId: req.userId }] 
          },
          update: {
            $set: {
              position: task.position,
              ...(task.status && { status: task.status })
            }
          }
        }
      }))
    );

    eventBus.emit("task:reordered", { 
      tasks, 
      userId: req.userId,
      workspaceId: detectedWorkspaceId
    });

    return res.json({ message: "Task order saved." });
  } catch (error) {
    return next(error);
  }
});

// 4. GET /api/tasks/:id (Get single task details)
taskRouter.get("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [{ ownerId: req.userId }, { assigneeId: req.userId }]
    }).populate("ownerId", "name email avatarUrl").populate("assigneeId", "name email avatarUrl").populate("labels");

    if (!task) return res.status(404).json({ message: "Task not found." });
    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

// 5. PATCH /api/tasks/:id (Update task)
taskRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    const updates = taskInput.partial().parse(req.body);

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ ownerId: req.userId }, { assigneeId: req.userId }]
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found." });

    await Activity.create({
      taskId: task._id,
      userId: req.userId,
      action: "updated",
      newValue: updates
    });

    eventBus.emit("task:updated", { task, userId: req.userId, changes: updates });

    return res.json({ task });
  } catch (error) {
    return next(error);
  }
});

// 6. DELETE /api/tasks/:id (Delete task - owner only)
taskRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found." });

    // Only the owner can delete tasks
    if (task.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Only the task owner can delete this task." });
    }

    await Task.findByIdAndDelete(req.params.id);

    await Promise.all([
      Comment.deleteMany({ taskId: task._id }),
      Attachment.deleteMany({ taskId: task._id }),
      Activity.deleteMany({ taskId: task._id })
    ]);

    eventBus.emit("task:deleted", {
      taskId: task._id,
      projectId: task.projectId,
      workspaceId: task.workspaceId,
      userId: req.userId
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ------------------- SUBTASKS -------------------
taskRouter.post("/:id/subtasks", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    const { title, dueDate, assigneeId } = z.object({
      title: z.string().trim().min(1).max(140),
      dueDate: dateValue.nullable().optional(),
      assigneeId: z.string().refine(Types.ObjectId.isValid).optional()
    }).parse(req.body);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found." });

    task.subtasks.push({ title, dueDate: dueDate || null, assigneeId: assigneeId || undefined, isCompleted: false });
    await task.save();

    return res.status(201).json({ subtasks: task.subtasks });
  } catch (error) {
    return next(error);
  }
});

taskRouter.patch("/:id/subtasks/:subtaskId", async (req, res, next) => {
  try {
    const { isCompleted, title } = z.object({ isCompleted: z.boolean().optional(), title: z.string().trim().min(1).optional() }).parse(req.body);
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found." });

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) return res.status(404).json({ message: "Subtask not found." });

    if (typeof isCompleted === "boolean") subtask.isCompleted = isCompleted;
    if (title) subtask.title = title;

    await task.save();
    return res.json({ subtasks: task.subtasks });
  } catch (error) {
    return next(error);
  }
});

taskRouter.delete("/:id/subtasks/:subtaskId", async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found." });

    task.subtasks.pull({ _id: req.params.subtaskId });
    await task.save();

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ------------------- COMMENTS -------------------
taskRouter.get("/:id/comments", async (req, res, next) => {
  try {
    const comments = await Comment.find({ taskId: req.params.id }).populate("authorId", "name email avatarUrl").sort({ createdAt: 1 });
    return res.json({ comments });
  } catch (error) {
    return next(error);
  }
});

taskRouter.post("/:id/comments", async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().trim().min(1).max(5000) }).parse(req.body);
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found." });

    const comment = await Comment.create({
      taskId: req.params.id,
      authorId: req.userId,
      content
    });

    await Activity.create({
      taskId: req.params.id,
      userId: req.userId,
      action: "comment_added",
      newValue: { commentId: comment._id }
    });

    eventBus.emit("comment:added", { comment, task, userId: req.userId });

    const populated = await Comment.findById(comment._id).populate("authorId", "name email avatarUrl");
    return res.status(201).json({ comment: populated });
  } catch (error) {
    return next(error);
  }
});

// ------------------- ATTACHMENTS -------------------
taskRouter.get("/:id/attachments", async (req, res, next) => {
  try {
    const attachments = await Attachment.find({ taskId: req.params.id }).populate("uploaderId", "name email avatarUrl");
    return res.json({ attachments });
  } catch (error) {
    return next(error);
  }
});

taskRouter.post("/:id/attachments", async (req, res, next) => {
  try {
    const input = z.object({
      filename: z.string().trim().min(1),
      url: z.string().url(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional()
    }).parse(req.body);

    const attachment = await Attachment.create({
      taskId: req.params.id,
      uploaderId: req.userId,
      ...input
    });

    return res.status(201).json({ attachment });
  } catch (error) {
    return next(error);
  }
});

// ------------------- ACTIVITY HISTORY -------------------
taskRouter.get("/:id/activities", async (req, res, next) => {
  try {
    const activities = await Activity.find({ taskId: req.params.id }).populate("userId", "name email avatarUrl").sort({ createdAt: -1 });
    return res.json({ activities });
  } catch (error) {
    return next(error);
  }
});
