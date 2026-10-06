import { EventEmitter } from "events";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { sendPushNotification } from "./push.js";
import { publishRealtimeEvent } from "./pubsub.js";

async function notifyUser(userId, payload) {
  try {
    const user = await User.findById(userId).select("pushSubscription preferences");
    if (user?.pushSubscription) {
      await sendPushNotification(user.pushSubscription, payload);
    }
  } catch (err) {
    // Non-blocking
  }
}

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this._registerListeners();
  }

  _registerListeners() {
    // When a task is created
    this.on("task:created", async ({ task, userId }) => {
      try {
        // 1. Real-time Pub/Sub broadcast
        await publishRealtimeEvent("task:created", { task, userId, projectId: task.projectId, workspaceId: task.workspaceId });

        // 2. Push/In-app notification if assigned to someone else
        if (task.assigneeId && task.assigneeId.toString() !== userId.toString()) {
          const notif = await Notification.create({
            recipientId: task.assigneeId,
            senderId: userId,
            workspaceId: task.workspaceId,
            type: "task_assigned",
            title: "New Task Assigned",
            message: `You have been assigned the task "${task.title}".`,
            entityType: "task",
            entityId: task._id
          });
          notifyUser(task.assigneeId, { title: notif.title, body: notif.message, url: `/tasks/${task._id}` });
        }
      } catch (err) {
        console.error("[EventBus] task:created error:", err.message);
      }
    });

    // When a task is updated
    this.on("task:updated", async ({ task, userId, changes }) => {
      try {
        // 1. Real-time Pub/Sub broadcast
        await publishRealtimeEvent("task:updated", { task, userId, changes, projectId: task.projectId, workspaceId: task.workspaceId });

        // 2. Notifications
        if (changes.assigneeId && changes.assigneeId.toString() !== userId.toString()) {
          await Notification.create({
            recipientId: changes.assigneeId,
            senderId: userId,
            workspaceId: task.workspaceId,
            type: "task_assigned",
            title: "Task Assigned to You",
            message: `You have been assigned the task "${task.title}".`,
            entityType: "task",
            entityId: task._id
          });
        }

        if (changes.status && task.assigneeId && task.assigneeId.toString() !== userId.toString()) {
          await Notification.create({
            recipientId: task.assigneeId,
            senderId: userId,
            workspaceId: task.workspaceId,
            type: "task_status_changed",
            title: "Task Status Updated",
            message: `Task "${task.title}" status changed to "${changes.status}".`,
            entityType: "task",
            entityId: task._id
          });
        }
      } catch (err) {
        console.error("[EventBus] task:updated error:", err.message);
      }
    });

    // When a task is deleted
    this.on("task:deleted", async ({ taskId, projectId, workspaceId, userId }) => {
      try {
        await publishRealtimeEvent("task:deleted", { taskId, projectId, workspaceId, userId });
      } catch (err) {
        console.error("[EventBus] task:deleted error:", err.message);
      }
    });

    // When tasks are reordered
    this.on("task:reordered", async ({ tasks, projectId, workspaceId, userId }) => {
      try {
        await publishRealtimeEvent("task:reordered", { tasks, projectId, workspaceId, userId });
      } catch (err) {
        console.error("[EventBus] task:reordered error:", err.message);
      }
    });

    // When a comment is added, notify the task owner/assignee
    this.on("comment:added", async ({ comment, task, userId }) => {
      try {
        await publishRealtimeEvent("comment:added", { comment, taskId: task._id, projectId: task.projectId, workspaceId: task.workspaceId, userId });

        const recipientId = task.assigneeId || task.ownerId;
        if (recipientId && recipientId.toString() !== userId.toString()) {
          await Notification.create({
            recipientId,
            senderId: userId,
            workspaceId: task.workspaceId,
            type: "comment_added",
            title: "New Comment",
            message: `A new comment was added to "${task.title}".`,
            entityType: "comment",
            entityId: comment._id
          });
        }
      } catch (err) {
        console.error("[EventBus] comment:added error:", err.message);
      }
    });

    // When a member is invited to a workspace, notify them
    this.on("member:invited", async ({ workspaceId, workspaceName, userId, invitedUserId }) => {
      try {
        await Notification.create({
          recipientId: invitedUserId,
          senderId: userId,
          workspaceId,
          type: "workspace_invite",
          title: "Workspace Invitation",
          message: `You have been added to workspace "${workspaceName}".`,
          entityType: "workspace",
          entityId: workspaceId
        });
      } catch (err) {
        console.error("[EventBus] member:invited notification error:", err.message);
      }
    });

    // When a team is created, updated, or deleted
    this.on("team:created", async ({ team, workspaceId, userId }) => {
      try {
        await publishRealtimeEvent("team:created", { team, workspaceId, userId });
      } catch (err) {
        console.error("[EventBus] team:created error:", err.message);
      }
    });

    this.on("team:updated", async ({ team, workspaceId, userId }) => {
      try {
        await publishRealtimeEvent("team:updated", { team, workspaceId, userId });
      } catch (err) {
        console.error("[EventBus] team:updated error:", err.message);
      }
    });

    this.on("team:deleted", async ({ teamId, workspaceId, userId }) => {
      try {
        await publishRealtimeEvent("team:deleted", { teamId, workspaceId, userId });
      } catch (err) {
        console.error("[EventBus] team:deleted error:", err.message);
      }
    });

    console.log("Event bus initialized with real-time Pub/Sub & notification listeners");
  }
}

export const eventBus = new AppEventBus();

