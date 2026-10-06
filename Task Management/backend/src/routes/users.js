import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  timezone: z.string().max(60).optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      emailNotifications: z.boolean().optional(),
      taskReminders: z.boolean().optional()
    })
    .optional()
});

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get("/profile", async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("name email role avatarUrl timezone preferences isEmailVerified createdAt");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

userRouter.patch("/profile", async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: input },
      { new: true, runValidators: true }
    ).select("name email role avatarUrl timezone preferences isEmailVerified createdAt");

    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ message: "Profile updated successfully.", user });
  } catch (error) {
    return next(error);
  }
});

userRouter.post("/push-subscription", async (req, res, next) => {
  try {
    const { subscription } = z.object({ subscription: z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }) }).parse(req.body);
    await User.findByIdAndUpdate(req.userId, { $set: { pushSubscription: subscription } });
    return res.json({ message: "Push subscription saved successfully." });
  } catch (error) {
    return next(error);
  }
});

userRouter.delete("/me", async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $set: { isDeleted: true } });
    return res.json({ message: "Account deleted successfully." });
  } catch (error) {
    return next(error);
  }
});
