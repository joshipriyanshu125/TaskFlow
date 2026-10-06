import { Schema, model } from "mongoose";

export const activitySchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "status_changed",
        "priority_changed",
        "assigned",
        "unassigned",
        "comment_added",
        "subtask_added",
        "subtask_completed",
        "attachment_uploaded",
        "deleted"
      ]
    },
    field: { type: String, default: "" },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

activitySchema.index({ taskId: 1, createdAt: -1 });

export const Activity = model("Activity", activitySchema);
