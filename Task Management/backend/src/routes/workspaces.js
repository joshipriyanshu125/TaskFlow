import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Workspace } from "../models/Workspace.js";
import { WorkspaceMember, workspaceMemberRoles } from "../models/WorkspaceMember.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Team } from "../models/Team.js";
import { Label } from "../models/Label.js";
import { Notification } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { eventBus } from "../services/events.js";
import { sendWorkspaceInvitationEmail, sendWorkspaceInviteToNewUser } from "../services/email.js";

const workspaceInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).toLowerCase().regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
  description: z.string().trim().max(500).optional()
});

export const workspaceRouter = Router();
workspaceRouter.use(requireAuth);

// List all workspaces user is a member of (auto-provisions default workspace if empty)
workspaceRouter.get("/", async (req, res, next) => {
  try {
    let memberships = await WorkspaceMember.find({ userId: req.userId, status: "active" }).populate("workspaceId");
    
    // Auto-create a default workspace if user has none
    if (memberships.length === 0) {
      const user = await User.findById(req.userId);
      const rawName = user?.name ? `${user.name}'s Workspace` : "My Workspace";
      const slug = `${(user?.name || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
      
      const newWs = await Workspace.create({
        name: rawName,
        slug,
        description: "Primary workspace for tasks and collaboration",
        ownerId: req.userId
      });

      await WorkspaceMember.create({
        workspaceId: newWs._id,
        userId: req.userId,
        role: "owner",
        status: "active"
      });

      memberships = await WorkspaceMember.find({ userId: req.userId, status: "active" }).populate("workspaceId");
    }

    const workspaces = memberships
      .filter((m) => m.workspaceId)
      .map((m) => ({
        ...m.workspaceId.toObject(),
        currentUserRole: m.role
      }));
    return res.json({ workspaces });
  } catch (error) {
    return next(error);
  }
});

// Create a new workspace
workspaceRouter.post("/", async (req, res, next) => {
  try {
    const input = workspaceInput.parse(req.body);
    const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);

    const existingSlug = await Workspace.findOne({ slug });
    if (existingSlug) return res.status(409).json({ message: "A workspace with that slug already exists." });

    const workspace = await Workspace.create({
      name: input.name,
      slug,
      description: input.description || "",
      ownerId: req.userId
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: req.userId,
      role: "owner",
      status: "active"
    });

    return res.status(201).json({ workspace });
  } catch (error) {
    return next(error);
  }
});

// Get single workspace
workspaceRouter.get("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid workspace ID." });
    const membership = await WorkspaceMember.findOne({ workspaceId: req.params.id, userId: req.userId, status: "active" });
    if (!membership) return res.status(403).json({ message: "Access denied to this workspace." });

    const workspace = await Workspace.findById(req.params.id).populate("ownerId", "name email avatarUrl");
    if (!workspace) return res.status(404).json({ message: "Workspace not found." });

    return res.json({ workspace, role: membership.role });
  } catch (error) {
    return next(error);
  }
});

// Update workspace (admin/owner only)
workspaceRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid workspace ID." });
    const membership = await WorkspaceMember.findOne({ workspaceId: req.params.id, userId: req.userId, role: { $in: ["owner", "admin"] } });
    if (!membership) return res.status(403).json({ message: "Only workspace admins or owners can update workspace details." });

    const input = workspaceInput.partial().parse(req.body);
    const workspace = await Workspace.findByIdAndUpdate(req.params.id, { $set: input }, { new: true });
    return res.json({ workspace });
  } catch (error) {
    return next(error);
  }
});

// Delete workspace (owner only - with full cascade cleanup)
workspaceRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid workspace ID." });
    const workspace = await Workspace.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!workspace) return res.status(403).json({ message: "Only the workspace owner can delete it." });

    await Promise.all([
      Workspace.findByIdAndDelete(req.params.id),
      WorkspaceMember.deleteMany({ workspaceId: req.params.id }),
      Project.deleteMany({ workspaceId: req.params.id }),
      Task.deleteMany({ workspaceId: req.params.id }),
      Team.deleteMany({ workspaceId: req.params.id }),
      Label.deleteMany({ workspaceId: req.params.id }),
      Notification.deleteMany({ workspaceId: req.params.id })
    ]);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// List members of workspace
workspaceRouter.get("/:id/members", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid workspace ID." });
    const members = await WorkspaceMember.find({ workspaceId: req.params.id }).populate("userId", "name email avatarUrl");
    return res.json({ members });
  } catch (error) {
    return next(error);
  }
});

// Add / Invite member to workspace
workspaceRouter.post("/:id/members", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid workspace ID." });

    // Any active workspace member can invite (owner, admin, or member with allowMemberInvites enabled)
    const requesterMembership = await WorkspaceMember.findOne({ workspaceId: req.params.id, userId: req.userId, status: "active" });
    if (!requesterMembership) return res.status(403).json({ message: "You must be a member of this workspace to invite others." });

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found." });

    // Only owner/admin can invite if workspace doesn't allow member invites
    const isPrivileged = ["owner", "admin"].includes(requesterMembership.role);
    if (!isPrivileged && !workspace.settings?.allowMemberInvites) {
      return res.status(403).json({ message: "Only workspace admins can invite members in this workspace." });
    }

    const { email, role } = z.object({ email: z.string().email(), role: z.enum(workspaceMemberRoles).optional() }).parse(req.body);
    const inviter = await User.findById(req.userId).select("name email");

    // Check if the invited email belongs to an existing registered user
    const targetUser = await User.findOne({ email: email.toLowerCase() });

    if (!targetUser) {
      // User not registered yet — send an invitation email with signup link
      const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
      const signupLink = `${clientOrigin}?invite=1&workspace=${encodeURIComponent(workspace.slug)}&email=${encodeURIComponent(email)}`;

      sendWorkspaceInviteToNewUser({
        to: email,
        inviterName: inviter?.name || inviter?.email || "A teammate",
        workspaceName: workspace.name,
        role: role || "member",
        signupLink
      }).catch((emailErr) => {
        console.warn("[Workspace] Failed to send new-user invite email:", emailErr.message);
      });

      return res.status(200).json({
        message: `Invitation email sent to ${email}. They will be added once they register.`,
        invited: true,
        alreadyRegistered: false
      });
    }

    // User already registered — check if already a member
    const existingMember = await WorkspaceMember.findOne({ workspaceId: req.params.id, userId: targetUser._id });
    if (existingMember) return res.status(409).json({ message: `${targetUser.name || email} is already a member of this workspace.` });

    // Add them as a member
    const newMember = await WorkspaceMember.create({
      workspaceId: req.params.id,
      userId: targetUser._id,
      role: role || "member",
      status: "active"
    });

    eventBus.emit("member:invited", {
      workspaceId: workspace._id,
      workspaceName: workspace.name,
      userId: req.userId,
      invitedUserId: targetUser._id
    });

    // Send email notification to the existing registered user
    sendWorkspaceInvitationEmail({
      to: targetUser.email,
      inviterName: inviter?.name || inviter?.email || "A teammate",
      workspaceName: workspace.name,
      role: role || "member"
    }).catch((emailErr) => {
      console.warn("[Workspace] Failed to send invite email:", emailErr.message);
    });

    return res.status(201).json({
      member: newMember,
      message: `${targetUser.name || email} has been added to the workspace and notified by email.`,
      invited: true,
      alreadyRegistered: true
    });
  } catch (error) {
    return next(error);
  }
});


// Remove member from workspace
workspaceRouter.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    const isSelf = req.params.userId === req.userId.toString();
    const isAdmin = await WorkspaceMember.findOne({ workspaceId: req.params.id, userId: req.userId, role: { $in: ["owner", "admin"] } });

    if (!isSelf && !isAdmin) return res.status(403).json({ message: "Insufficient permissions to remove this member." });

    await WorkspaceMember.findOneAndDelete({ workspaceId: req.params.id, userId: req.params.userId });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
