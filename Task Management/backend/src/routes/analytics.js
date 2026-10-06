import { Router } from "express";
import { Types } from "mongoose";
import { Task } from "../models/Task.js";
import { requireAuth } from "../middleware/auth.js";
import { cache } from "../services/redis.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get("/dashboard", async (req, res, next) => {
  try {
    const { workspaceId, projectId } = req.query;
    const cacheKey = `analytics:dashboard:${req.userId}:${workspaceId || "all"}:${projectId || "all"}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const filter = {
      $or: [{ ownerId: req.userId }, { assigneeId: req.userId }]
    };
    if (workspaceId && Types.ObjectId.isValid(workspaceId)) filter.workspaceId = new Types.ObjectId(workspaceId);
    if (projectId && Types.ObjectId.isValid(projectId)) filter.projectId = new Types.ObjectId(projectId);

    const [totalTasks, completedTasks, todoTasks, inProgressTasks, blockedTasks, overdueTasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: "done" }),
      Task.countDocuments({ ...filter, status: "todo" }),
      Task.countDocuments({ ...filter, status: { $in: ["in_progress", "in-progress"] } }),
      Task.countDocuments({ ...filter, status: "blocked" }),
      Task.countDocuments({ ...filter, status: { $ne: "done" }, dueDate: { $lt: new Date() } })
    ]);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const responseData = {
      summary: {
        totalTasks,
        completedTasks,
        todoTasks,
        inProgressTasks,
        blockedTasks,
        overdueTasks,
        completionRate: `${completionRate}%`
      }
    };

    // Cache for 60 seconds
    await cache.set(cacheKey, responseData, 60);

    return res.json(responseData);
  } catch (error) {
    return next(error);
  }
});

