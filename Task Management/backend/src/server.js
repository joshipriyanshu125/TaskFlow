import http from "http";
import path from "path";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { sanitizeMiddleware } from "./utils/sanitize.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/users.js";
import { workspaceRouter } from "./routes/workspaces.js";
import { teamRouter } from "./routes/teams.js";
import { projectRouter } from "./routes/projects.js";
import { taskRouter } from "./routes/tasks.js";
import { labelRouter } from "./routes/labels.js";
import { notificationRouter } from "./routes/notifications.js";
import { analyticsRouter } from "./routes/analytics.js";
import { uploadRouter } from "./routes/upload.js";
import { adminRouter } from "./routes/admin.js";
import { searchRouter } from "./routes/search.js";
import { aiRouter } from "./routes/ai.js";
import { settingsRouter } from "./routes/settings.js";
import { initScheduler } from "./workers/scheduler.js";
import { cache } from "./services/redis.js";
import { initSocketServer } from "./services/socket.js";
import "./services/pubsub.js"; // Initialize Redis Pub/Sub subscriber

const app = express();
const server = http.createServer(app);

// Initialize Real-time WebSockets
initSocketServer(server);

// CORS configuration supporting dynamic local ports and clientOrigin
const allowedOrigins = [
  config.clientOrigin,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000"
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        config.nodeEnv === "development" ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(sanitizeMiddleware);

// Static file uploads (Object Storage)
app.use("/uploads", express.static(path.resolve(config.uploadDir)));

// Rate Limiting
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

// Dynamic Health Check
app.get("/health", (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = cache.isRedisReady ? "connected" : "in-memory fallback";

  return res.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
      scheduler: "active",
      storage: "local"
    }
  });
});

// Core API Routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/teams", teamRouter);
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/labels", labelRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/admin", adminRouter);
app.use("/api/search", searchRouter);
app.use("/api/ai", aiRouter);
app.use("/api/settings", settingsRouter);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Connect DB & Start Server
connectDatabase()
  .then(() => {
    initScheduler();
    server.listen(config.port, () => console.log(`API & Real-time WebSockets listening on http://localhost:${config.port}`));
  })
  .catch((error) => {
    console.error("Unable to start the API", error);
    process.exit(1);
  });
