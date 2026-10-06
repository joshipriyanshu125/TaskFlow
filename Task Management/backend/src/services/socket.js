import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Dynamic origin check allowing any client port in development
        callback(null, true);
      },
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true
    }
  });

  // Authentication Middleware (Token is optional for guests, but verified if provided)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.userId = decoded.userId || decoded.sub || decoded.id;
      } catch {
        // Token invalid, allow connection as unauthenticated observer
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join / Leave project rooms
    socket.on("join:project", (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on("leave:project", (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // Join / Leave workspace rooms
    socket.on("join:workspace", (workspaceId) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    socket.on("leave:workspace", (workspaceId) => {
      if (workspaceId) {
        socket.leave(`workspace:${workspaceId}`);
      }
    });
  });

  console.log("Socket.IO server initialized for real-time collaboration");
  return io;
}

/**
 * Broadcasts an event to relevant Socket.IO rooms and clients.
 * @param {string} event - The event name (e.g. 'task:updated', 'task:created')
 * @param {object} payload - The event data
 */
export function broadcastSocketEvent(event, payload = {}) {
  if (!io) return;

  const { projectId, workspaceId, recipientId, userId, task } = payload;
  const pId = projectId || task?.projectId;
  const wId = workspaceId || task?.workspaceId;
  const targetUserId = recipientId || userId || task?.ownerId || task?.assigneeId;

  let targeted = false;

  // Emit to workspace room
  if (wId) {
    io.to(`workspace:${wId}`).emit(event, payload);
    targeted = true;
  }

  // Emit to project room
  if (pId) {
    io.to(`project:${pId}`).emit(event, payload);
    targeted = true;
  }

  // Emit to user room
  if (targetUserId) {
    io.to(`user:${targetUserId}`).emit(event, payload);
    targeted = true;
  }

  // Emit global fallback if not targeted to a specific workspace or room
  if (!targeted || !wId) {
    io.emit(event, payload);
  }
}
