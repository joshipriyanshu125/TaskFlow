import { Schema, model } from "mongoose";

export const projectStatuses = ["planning", "active", "paused", "completed", "archived"];

const projectSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    key: { type: String, uppercase: true, trim: true, maxlength: 10 },
    description: { type: String, default: "", maxlength: 2000 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: projectStatuses, default: "active" },
    isPrivate: { type: Boolean, default: false },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null }
  },
  { timestamps: true }
);

projectSchema.index({ workspaceId: 1, name: 1 });
projectSchema.index({ workspaceId: 1, status: 1 });
projectSchema.index({ name: "text", description: "text" });

export const Project = model("Project", projectSchema);
