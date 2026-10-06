import { Schema, model } from "mongoose";
export const UserRole = model("UserRole", new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  role: { type: String, enum: ["user", "admin"], default: "user" }
}, { timestamps: true }));
