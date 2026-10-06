import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Label } from "../models/Label.js";
import { requireAuth } from "../middleware/auth.js";

const labelInput = z.object({
  workspaceId: z.string().refine(Types.ObjectId.isValid).optional(),
  projectId: z.string().refine(Types.ObjectId.isValid).optional(),
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Must be a valid hex color (e.g. #6366F1)").optional(),
  description: z.string().trim().max(200).optional()
});

export const labelRouter = Router();
labelRouter.use(requireAuth);

// List labels
labelRouter.get("/", async (req, res, next) => {
  try {
    const { workspaceId, projectId } = req.query;
    const filter = {};
    if (workspaceId && Types.ObjectId.isValid(workspaceId)) filter.workspaceId = workspaceId;
    if (projectId && Types.ObjectId.isValid(projectId)) filter.projectId = projectId;

    const labels = await Label.find(filter);
    return res.json({ labels });
  } catch (error) {
    return next(error);
  }
});

// Create label
labelRouter.post("/", async (req, res, next) => {
  try {
    const input = labelInput.parse(req.body);
    const label = await Label.create(input);
    return res.status(201).json({ label });
  } catch (error) {
    return next(error);
  }
});

// Delete label
labelRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid label ID." });
    await Label.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
