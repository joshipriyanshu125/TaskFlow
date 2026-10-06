import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { User } from "../models/User.js";
import { UserRole } from "../models/UserRole.js";
import { Session } from "../models/Session.js";
import { Workspace } from "../models/Workspace.js";
import { WorkspaceMember } from "../models/WorkspaceMember.js";
import { requireAuth } from "../middleware/auth.js";
import { createToken, createRefreshToken, verifyToken } from "../utils/token.js";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/email.js";
import { autoJoinTeams } from "./teams.js";
import { config } from "../config.js";

const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });
const signUp = credentials.extend({ 
  name: z.string().trim().min(2).max(80),
  role: z.enum(["user", "admin"]).optional()
});

export const authRouter = Router();

authRouter.post("/signup", async (req, res, next) => {
  try {
    const input = signUp.parse(req.body);
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const assignedRole = input.role || "user";
    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 12),
      role: assignedRole
    });
    await UserRole.create({ userId: user._id, role: assignedRole });

    // Auto-join teams that invited this email
    autoJoinTeams(user._id, user.email).catch((err) => {
      console.warn("[Auth Signup] Auto-join teams error:", err.message);
    });

    // Send welcome email (asynchronous / non-blocking)
    sendWelcomeEmail(user).catch((err) => console.log("Welcome email error:", err.message));

    const token = createToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());

    // Create session record
    await Session.create({
      userId: user._id,
      token,
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Check if this signup is from an invitation
    const { inviteWorkspace, inviteRole } = req.body;
    let invitedWorkspace = null;

    if (inviteWorkspace) {
      const workspace = await Workspace.findOne({ slug: inviteWorkspace });
      if (workspace) {
        // Check if user is already a member (avoid duplicates)
        const existingMember = await WorkspaceMember.findOne({
          workspaceId: workspace._id,
          userId: user._id
        });

        if (!existingMember) {
          // Add user as member of the workspace
          const member = await WorkspaceMember.create({
            workspaceId: workspace._id,
            userId: user._id,
            role: inviteRole || "member",
            status: "active"
          });
          invitedWorkspace = {
            id: workspace._id,
            name: workspace.name,
            slug: workspace.slug,
            role: member.role
          };
          console.log(`[Workspace] Added new user ${user.email} to workspace "${workspace.name}" as ${member.role}`);
        }
      }
    }

    return res.status(201).json({
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      invitedWorkspace
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/signin", async (req, res, next) => {
  try {
    const input = credentials.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase(), isDeleted: false }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }

    const token = createToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());

    // Create session record
    await Session.create({
      userId: user._id,
      token,
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return res.json({
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user", timezone: user.timezone, avatarUrl: user.avatarUrl }
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const rawToken = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (rawToken) {
      await Session.updateOne({ token: rawToken }, { $set: { isValid: false } });
    }
    return res.json({ message: "Successfully logged out." });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    const payload = verifyToken(refreshToken);
    if (!payload.sub || payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const user = await User.findOne({ _id: payload.sub, isDeleted: false });
    if (!user) return res.status(401).json({ message: "User not found or deactivated." });

    const newToken = createToken(user._id.toString());

    // Create session record for new token so requireAuth passes
    await Session.create({
      userId: user._id,
      token: newToken,
      userAgent: req.headers["user-agent"] || "",
      ipAddress: req.ip || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return res.json({ 
      token: newToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role || "user", 
        timezone: user.timezone, 
        avatarUrl: user.avatarUrl 
      } 
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired refresh token." });
  }
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: "If an account with that email exists, password reset instructions have been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send reset email
    const emailResult = await sendPasswordResetEmail(user, resetToken);
    console.log(`[Password Reset] Token for ${email} -> ${resetToken} | Email result: ${emailResult?.success ? 'sent' : `failed - ${emailResult?.error || 'unknown'}`}`);

    // In development, expose the token so users can actually test the reset flow
    const isDev = process.env.NODE_ENV === 'development' || config.nodeEnv === 'development';
    return res.json({
      message: "If an account with that email exists, password reset instructions have been sent.",
      ...(isDev ? { resetToken, resetUrl: `${config.clientOrigin}/reset-password?token=${resetToken}` } : {})
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = z
      .object({ token: z.string().min(1), password: z.string().min(8).max(128) })
      .parse(req.body);

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired password reset token." });

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password has been successfully reset. You can now sign in." });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("name email role avatarUrl timezone preferences isEmailVerified createdAt");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user: { id: user._id, ...user.toObject() } });
  } catch (error) {
    return next(error);
  }
});
