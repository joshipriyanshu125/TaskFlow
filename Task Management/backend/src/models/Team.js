import { Schema, model } from "mongoose";

const teamSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 300 },
    leadId: { type: Schema.Types.ObjectId, ref: "User" },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["lead", "member"], default: "member" }
      }
    ],
    invitedEmails: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ["lead", "member"], default: "member" },
        invitedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

teamSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Team = model("Team", teamSchema);
