import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Team } from "../models/Team.js";
import { WorkspaceMember } from "../models/WorkspaceMember.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { sendTeamInvitationEmail } from "../services/email.js";

const teamInput = z.object({
  workspaceId: z.string().refine(Types.ObjectId.isValid, "Invalid workspace ID"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  leadId: z.string().refine(Types.ObjectId.isValid, "Invalid user ID").optional()
});

const inviteInput = z.object({
  email: z.string().trim().email(),
  role: z.enum(["lead", "member"]).optional()
});

export const teamRouter = Router();
teamRouter.use(requireAuth);

// Get all teams in a workspace
teamRouter.get("/", async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: "Valid workspaceId query parameter is required." });
    }

    const member = await WorkspaceMember.findOne({ workspaceId, userId: req.userId, status: "active" });
    if (!member) return res.status(403).json({ message: "Access denied to this workspace." });

    const teams = await Team.find({ workspaceId })
      .populate("leadId", "name email avatarUrl")
      .populate("members.userId", "name email avatarUrl");
    return res.json({ teams });
  } catch (error) {
    return next(error);
  }
});

// Create a team
teamRouter.post("/", async (req, res, next) => {
  try {
    const input = teamInput.parse(req.body);
    const member = await WorkspaceMember.findOne({ workspaceId: input.workspaceId, userId: req.userId, role: { $in: ["owner", "admin"] } });
    if (!member) return res.status(403).json({ message: "Admin permission required to create teams." });

    const team = await Team.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description || "",
      leadId: input.leadId || req.userId,
      members: [{ userId: req.userId, role: "lead" }]
    });

    const populated = await Team.findById(team._id)
      .populate("leadId", "name email avatarUrl")
      .populate("members.userId", "name email avatarUrl");

    eventBus.emit("team:created", { team: populated, workspaceId: input.workspaceId, userId: req.userId });

    return res.status(201).json({ team: populated });
  } catch (error) {
    return next(error);
  }
});

// Get single team
teamRouter.get("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid team ID." });
    const team = await Team.findById(req.params.id)
      .populate("leadId", "name email avatarUrl")
      .populate("members.userId", "name email avatarUrl");
    if (!team) return res.status(404).json({ message: "Team not found." });
    return res.json({ team });
  } catch (error) {
    return next(error);
  }
});

// Update team
teamRouter.patch("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid team ID." });
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found." });

    const member = await WorkspaceMember.findOne({
      workspaceId: team.workspaceId,
      userId: req.userId,
      role: { $in: ["owner", "admin"] }
    });
    const isLead = team.leadId?.toString() === req.userId.toString();
    if (!member && !isLead) return res.status(403).json({ message: "Only team lead or workspace admins can update team." });

    const input = z.object({ name: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(300).optional(), leadId: z.string().refine(Types.ObjectId.isValid).optional() }).parse(req.body);

    const updated = await Team.findByIdAndUpdate(req.params.id, { $set: input }, { new: true })
      .populate("leadId", "name email avatarUrl")
      .populate("members.userId", "name email avatarUrl");

    eventBus.emit("team:updated", { team: updated, workspaceId: team.workspaceId, userId: req.userId });

    return res.json({ team: updated });
  } catch (error) {
    return next(error);
  }
});

// Delete team (owner-only)
teamRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid team ID." });
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found." });

    // Only the workspace owner can delete a team
    const workspaceOwner = await WorkspaceMember.findOne({
      workspaceId: team.workspaceId,
      userId: req.userId,
      role: "owner"
    });
    if (!workspaceOwner) return res.status(403).json({ message: "Only the workspace owner can delete teams." });

    await Team.findByIdAndDelete(req.params.id);
    eventBus.emit("team:deleted", { teamId: req.params.id, workspaceId: team.workspaceId, userId: req.userId });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// Invite a person to a team by email
teamRouter.post("/:id/invite", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid team ID." });
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found." });

    // Only the team lead or workspace owner/admin can invite
    const isLead = team.leadId?.toString() === req.userId.toString();
    const workspaceMember = await WorkspaceMember.findOne({
      workspaceId: team.workspaceId,
      userId: req.userId,
      role: { $in: ["owner", "admin"] }
    });
    if (!isLead && !workspaceMember) return res.status(403).json({ message: "Only the team lead or workspace admins can invite members." });

    const input = inviteInput.parse(req.body);

    // Check if already a member
    const existingMember = team.members.find((m) => m.userId?.toString() === req.userId.toString());
    if (existingMember) return res.status(409).json({ message: "This user is already a member of the team." });

    // Check if already invited
    const alreadyInvited = team.invitedEmails?.find((inv) => inv.email === input.email.toLowerCase());
    if (alreadyInvited) return res.status(409).json({ message: "This email has already been invited to the team." });

    // Check if the email belongs to an existing user in the workspace
    const targetUser = await User.findOne({ email: input.email.toLowerCase() });
    if (targetUser) {
      // Check if they're already a workspace member
      const wsMember = await WorkspaceMember.findOne({ workspaceId: team.workspaceId, userId: targetUser._id });
      if (wsMember) {
        // Add them directly to the team
        team.members.push({ userId: targetUser._id, role: input.role || "member" });
        await team.save();

        // Send notification email
        sendTeamInvitationEmail({
          to: targetUser.email,
          inviterName: req.user?.name || "A teammate",
          teamName: team.name,
          workspaceName: "",
          role: input.role || "member"
        }).catch((err) => console.warn("[Team Invite] Email failed:", err.message));

        const populated = await Team.findById(team._id)
          .populate("leadId", "name email avatarUrl")
          .populate("members.userId", "name email avatarUrl");

        eventBus.emit("team:updated", { team: populated, workspaceId: team.workspaceId, userId: req.userId });

        return res.status(201).json({ team: populated });
      }
    }

    // User not registered or not in workspace — store the invite email
    team.invitedEmails = team.invitedEmails || [];
    team.invitedEmails.push({
      email: input.email.toLowerCase(),
      role: input.role || "member"
    });
    await team.save();

    // Send invitation email
    sendTeamInvitationEmail({
      to: input.email,
      inviterName: req.user?.name || "A teammate",
      teamName: team.name,
      workspaceName: "",
      role: input.role || "member"
    }).catch((err) => console.warn("[Team Invite] Email failed:", err.message));

    const populated = await Team.findById(team._id)
      .populate("leadId", "name email avatarUrl")
      .populate("members.userId", "name email avatarUrl");

    eventBus.emit("team:updated", { team: populated, workspaceId: team.workspaceId, userId: req.userId });

    return res.status(201).json({ team: populated, invited: true });
  } catch (error) {
    return next(error);
  }
});

// Remove a member from a team (owner-only)
teamRouter.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid team ID." });
    if (!Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: "Invalid user ID." });

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found." });

    // Only the workspace owner can remove people from a team
    const workspaceOwner = await WorkspaceMember.findOne({
      workspaceId: team.workspaceId,
      userId: req.userId,
      role: "owner"
    });
    if (!workspaceOwner) return res.status(403).json({ message: "Only the workspace owner can remove team members." });

    const memberIndex = team.members.findIndex((m) => m.userId?.toString() === req.params.userId);
    if (memberIndex === -1) return res.status(404).json({ message: "Member not found in this team." });

    team.members.splice(memberIndex, 1);
    await team.save();

    const populated = await Team.findById(team._id)
      .populate("leadId", "name email avatarUrl")
      .populate("members.userId", "name email avatarUrl");

    eventBus.emit("team:updated", { team: populated, workspaceId: team.workspaceId, userId: req.userId });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// Auto-join teams on signup — called from auth signup
export async function autoJoinTeams(userId, email) {
  try {
    const teams = await Team.find({
      "invitedEmails.email": email.toLowerCase()
    });

    for (const team of teams) {
      const alreadyMember = team.members.find((m) => m.userId?.toString() === userId.toString());
      if (!alreadyMember) {
        const invite = team.invitedEmails.find((inv) => inv.email === email.toLowerCase());
        team.members.push({ userId, role: invite?.role || "member" });
        // Remove from invitedEmails since they've now joined
        team.invitedEmails = team.invitedEmails.filter((inv) => inv.email !== email.toLowerCase());
        await team.save();
      }
    }
  } catch (err) {
    console.warn("[Team Auto-Join] Error:", err.message);
  }
}

