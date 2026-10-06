import { Router } from "express";
import { z } from "zod";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { requireAuth } from "../middleware/auth.js";

const searchQuery = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(["tasks", "projects", "all"]).optional().default("all"),
  workspaceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/", async (req, res, next) => {
  try {
    const { q, type, workspaceId, limit } = searchQuery.parse(req.query);
    const results = {};

    if (type === "tasks" || type === "all") {
      const taskFilter = {
        $or: [{ ownerId: req.userId }, { assigneeId: req.userId }],
        $and: [{
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } }
          ]
        }]
      };
      if (workspaceId) taskFilter.workspaceId = workspaceId;

      results.tasks = await Task.find(taskFilter)
        .select("title status priority dueDate workspaceId projectId createdAt")
        .sort({ updatedAt: -1 })
        .limit(limit);
    }

    if (type === "projects" || type === "all") {
      const projectFilter = {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { key: { $regex: q, $options: "i" } }
        ]
      };
      if (workspaceId) projectFilter.workspaceId = workspaceId;

      results.projects = await Project.find(projectFilter)
        .select("name key status workspaceId createdAt")
        .sort({ updatedAt: -1 })
        .limit(limit);
    }

    return res.json({ query: q, results });
  } catch (error) {
    return next(error);
  }
});
