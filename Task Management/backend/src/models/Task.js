import { Schema, model } from "mongoose";

export const taskStatuses = ["todo", "in_progress", "blocked", "done", "completed", "archived"];
export const taskPriorities = ["low", "medium", "high", "urgent"];

const taskSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: "", maxlength: 4000 },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: taskPriorities, default: "medium" },
    category: { type: String, trim: true, maxlength: 50, default: "General" },
    status: { type: String, enum: taskStatuses, default: "todo" },
    position: { type: Number, required: true, default: 0 },
    labels: [{ type: Schema.Types.ObjectId, ref: "Label" }],
    subtasks: [
      {
        title: { type: String, required: true, trim: true },
        isCompleted: { type: Boolean, default: false },
        assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
        dueDate: { type: Date, default: null }
      }
    ],
    recurrence: {
      pattern: { type: String, enum: ["daily", "weekly", "monthly", null], default: null },
      interval: { type: Number, default: 1, min: 1, max: 365 },
      endDate: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

taskSchema.index({ ownerId: 1, status: 1, position: 1 });
taskSchema.index({ ownerId: 1, priority: 1 });
taskSchema.index({ ownerId: 1, category: 1 });
taskSchema.index({ ownerId: 1, dueDate: 1 });
taskSchema.index({ projectId: 1, status: 1, position: 1 });
taskSchema.index({ workspaceId: 1, status: 1 });
taskSchema.index({ title: "text", description: "text", category: "text" });

export const Task = model("Task", taskSchema);
