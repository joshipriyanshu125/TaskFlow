import { Schema, model } from "mongoose";

export const workspaceMemberRoles = ["owner", "admin", "member", "guest"];
export const workspaceMemberStatuses = ["active", "invited", "suspended"];

const workspaceMemberSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: workspaceMemberRoles, default: "member" },
    status: { type: String, enum: workspaceMemberStatuses, default: "active" },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMember = model("WorkspaceMember", workspaceMemberSchema);
