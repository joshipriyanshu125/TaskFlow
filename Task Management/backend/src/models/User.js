import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatarUrl: { type: String, default: "" },
    timezone: { type: String, default: "UTC" },
    preferences: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      emailNotifications: { type: Boolean, default: true },
      taskReminders: { type: Boolean, default: true }
    },
    isEmailVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    isDeleted: { type: Boolean, default: false },
    pushSubscription: { type: Object, default: null }
  },
  { timestamps: true }
);

export const User = model("User", userSchema);

