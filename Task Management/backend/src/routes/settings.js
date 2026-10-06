import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { sendDailyTaskEmail } from "../services/email.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// Get email domain configuration status
settingsRouter.get("/email-domain", async (req, res, next) => {
  try {
    return res.json({
      domain: config.emailDomain,
      configured: !!config.emailDomain,
      smtpConfigured: !!(config.smtp.host && config.smtp.user && config.smtp.pass)
    });
  } catch (error) {
    return next(error);
  }
});

// Set email domain (owner-only for workspace, but here we allow any authenticated user to set their own)
settingsRouter.post("/email-domain", async (req, res, next) => {
  try {
    const input = z.object({
      domain: z.string().trim().min(3).max(253).refine(
        (d) => /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(d),
        "Invalid domain format"
      )
    }).parse(req.body);

    // In a real app, this would be stored per-user or per-workspace in the database
    // For now, we update the config (this is a simplified approach for the demo)
    config.emailDomain = input.domain;

    return res.json({
      domain: config.emailDomain,
      configured: true,
      message: "Email domain configured successfully."
    });
  } catch (error) {
    return next(error);
  }
});

// Send today's tasks email on demand
settingsRouter.post("/email-domain/send-today", async (req, res, next) => {
  try {
    if (!config.emailDomain) {
      return res.status(400).json({ message: "Email domain is not configured. Please set up a domain first." });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Find unfinished tasks due today or overdue for the current user
    const dueTasks = await Task.find({
      ownerId: req.userId,
      status: { $ne: "done" },
      $or: [
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
        { dueDate: { $lt: startOfDay } }
      ]
    });

    const user = await User.findById(req.userId).select("name email");
    if (!user) return res.status(404).json({ message: "User not found." });

    const result = await sendDailyTaskEmail(user, dueTasks);

    if (result.success) {
      return res.json({
        message: `Daily task email sent to ${user.email}.`,
        taskCount: dueTasks.length,
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({ message: "Failed to send email.", error: result.error });
    }
  } catch (error) {
    return next(error);
  }
});

export default settingsRouter;
