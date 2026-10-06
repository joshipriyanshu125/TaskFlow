import { Schema, model } from "mongoose";

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    avatarUrl: { type: String, default: "" },
    settings: {
      defaultRole: { type: String, enum: ["member", "guest"], default: "member" },
      allowMemberInvites: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export const Workspace = model("Workspace", workspaceSchema);
