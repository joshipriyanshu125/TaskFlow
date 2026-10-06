import { Schema, model } from "mongoose";

export const commentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [{ type: String }]
  },
  { timestamps: true }
);

commentSchema.index({ taskId: 1, createdAt: 1 });

export const Comment = model("Comment", commentSchema);
