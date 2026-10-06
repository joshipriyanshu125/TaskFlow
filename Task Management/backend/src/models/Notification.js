import { Schema, model } from "mongoose";

export const notificationTypes = [
  "task_assigned",
  "task_status_changed",
  "task_due_soon",
  "comment_added",
  "mention",
  "workspace_invite",
  "team_added",
  "system"
];

const notificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User" },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    type: { type: String, enum: notificationTypes, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, default: "" },
    entityType: { type: String, enum: ["task", "project", "workspace", "comment", "user"] },
    entityId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = model("Notification", notificationSchema);
