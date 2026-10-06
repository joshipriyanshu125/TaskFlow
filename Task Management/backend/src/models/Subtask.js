import { Schema, model } from "mongoose";

export const subtaskSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    isCompleted: { type: Boolean, default: false },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date, default: null },
    position: { type: Number, default: 0 }
  },
  { timestamps: true }
);

subtaskSchema.index({ taskId: 1, position: 1 });

export const Subtask = model("Subtask", subtaskSchema);
