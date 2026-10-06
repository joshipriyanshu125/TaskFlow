import { Schema, model } from "mongoose";

const labelSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    color: { type: String, default: "#6366F1", trim: true },
    description: { type: String, default: "", maxlength: 200 }
  },
  { timestamps: true }
);

labelSchema.index({ workspaceId: 1, name: 1 });

export const Label = model("Label", labelSchema);
