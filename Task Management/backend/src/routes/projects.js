import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Project, projectStatuses } from "../models/Project.js";
import { WorkspaceMember } from "../models/WorkspaceMember.js";
import { Task } from "../models/Task.js";
import { Activity } from "../models/Activity.js";
import { Comment } from "../models/Comment.js";
import { Attachment } from "../models/Attachment.js";
import { requireAuth } from "../middleware/auth.js";

const projectInput = z.object({
  workspaceId: z.string().refine(Types.ObjectId.isValid, "Invalid workspace ID"),
  teamId: z.string().refine(Types.ObjectId.isValid).optional(),
  name: z.string().trim().min(2).max(100),
  key: z.string().trim().min(2).max(10).toUpperCase().optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(projectStatuses).optional(),
  isPrivate: z.boolean().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional()
});

export const projectRouter = Router();
projectRouter.use(requireAuth);

// List projects in a workspace
projectRouter.get("/", async (req, res, next) => {
  try {
    const { workspaceId, status, teamId } = req.query;
    const filter = {};
    if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
      const isMember = await WorkspaceMember.findOne({ workspaceId, userId: req.userId, status: "active" });
      if (!isMember) return res.status(403).json({ message: "Access denied to this workspace." });
      filter.workspaceId = workspaceId;
    }
    if (teamId && Types.ObjectId.isValid(teamId)) filter.teamId = teamId;
    if (status) filter.status = status;

    const projects = await Project.find(filter).populate("ownerId", "name email avatarUrl").sort({ createdAt: -1 });
    return res.json({ projects });
  } catch (error) {
    return next(error);
  }
});

// Create project
projectRouter.post("/", async (req, res, next) => {
  try {
    const input = projectInput.parse(req.body);
    const member = await WorkspaceMember.findOne({ workspaceId: input.workspaceId, userId: req.userId, status: "active" });
    if (!member) return res.status(403).json({ message: "Access denied to create projects in this workspace." });

    const key = input.key || input.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();

    const project = await Project.create({
      ...input,
      key,
      ownerId: req.userId
    });

    return res.status(201).json({ project });
  } catch (error) {
    return next(error);
  }
});

// Get single project
projectRouter.get("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
    const project = await Project.findById(req.params.id).populate("ownerId", "name email avatarUrl").populate("teamId", "name");
    if (!project) return res.status(404).json({ message: "Project not found." });

    const member = await WorkspaceMember.findOne({ workspaceId: project.workspaceId, userId: req.userId, status: "active" });
    if (!member) return res.status(403).json({ message: "Access denied to this project." });

    return res.json({ project });
  } catch (error) {
    return next(error);
  }
});

// Update project
projectRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Project not found." });

    const member = await WorkspaceMember.findOne({
      workspaceId: existing.workspaceId,
      userId: req.userId,
      role: { $in: ["owner", "admin"] }
    });
    const isOwner = existing.ownerId.toString() === req.userId.toString();
    if (!member && !isOwner) return res.status(403).json({ message: "Only project owner or workspace admins can update project." });

    const input = projectInput.partial().parse(req.body);
    const project = await Project.findByIdAndUpdate(req.params.id, { $set: input }, { new: true });
    return res.json({ project });
  } catch (error) {
    return next(error);
  }
});

// Archive project
projectRouter.patch("/:id/archive", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
    const project = await Project.findByIdAndUpdate(req.params.id, { $set: { status: "archived" } }, { new: true });
    if (!project) return res.status(404).json({ message: "Project not found." });
    return res.json({ message: "Project archived.", project });
  } catch (error) {
    return next(error);
  }
});

// Restore project
projectRouter.patch("/:id/restore", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
    const project = await Project.findByIdAndUpdate(req.params.id, { $set: { status: "active" } }, { new: true });
    if (!project) return res.status(404).json({ message: "Project not found." });
    return res.json({ message: "Project restored.", project });
  } catch (error) {
    return next(error);
  }
});

// Delete project (with cascade task cleanup)
projectRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid project ID." });
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Project not found." });

    const member = await WorkspaceMember.findOne({
      workspaceId: existing.workspaceId,
      userId: req.userId,
      role: { $in: ["owner", "admin"] }
    });
    const isOwner = existing.ownerId.toString() === req.userId.toString();
    if (!member && !isOwner) return res.status(403).json({ message: "Permission denied to delete project." });

    const tasks = await Task.find({ projectId: req.params.id }).select("_id");
    const taskIds = tasks.map((t) => t._id);

    await Promise.all([
      Project.findByIdAndDelete(req.params.id),
      Task.deleteMany({ projectId: req.params.id }),
      Comment.deleteMany({ taskId: { $in: taskIds } }),
      Attachment.deleteMany({ taskId: { $in: taskIds } }),
      Activity.deleteMany({ taskId: { $in: taskIds } })
    ]);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

