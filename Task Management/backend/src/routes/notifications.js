import { Router } from "express";
import { Types } from "mongoose";
import { Notification } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

// Get user notifications
notificationRouter.get("/", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const filter = { recipientId: req.userId };
    if (unreadOnly) filter.isRead = false;

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ recipientId: req.userId, isRead: false });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
});

// Mark single notification read
notificationRouter.patch("/:id/read", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid notification ID." });
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    return res.json({ notification });
  } catch (error) {
    return next(error);
  }
});

// Mark all as read
notificationRouter.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.json({ message: "All notifications marked as read." });
  } catch (error) {
    return next(error);
  }
});
