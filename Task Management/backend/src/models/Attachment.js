import { Schema, model } from "mongoose";

export const attachmentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/octet-stream" }
  },
  { timestamps: true }
);

export const Attachment = model("Attachment", attachmentSchema);
