import "dotenv/config";

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Task_management",
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: (process.env.CLIENT_ORIGIN || (
    process.env.NODE_ENV === "production"
      ? "https://taskflow-frontend-two-ecru.vercel.app"
      : "http://localhost:5173"
  )).trim().replace(/\/+$/, ""),
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV || "development",

  redisUrl: process.env.REDIS_URL,

  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM
  },
  resendApiKey: process.env.RESEND_API_KEY,

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
    privateKey: process.env.VAPID_PRIVATE_KEY || null,
    subject: process.env.VAPID_SUBJECT || null,
  },

  uploadDir: process.env.UPLOAD_DIR || "./uploads",

  emailDomain: process.env.EMAIL_DOMAIN || null,
};

// Validate critical config on startup
if (!config.jwtSecret || config.jwtSecret === 'dev-secret-change-me') {
  if (config.nodeEnv === "production") {
    console.error("ERROR: JWT_SECRET is required in production");
  } else {
    console.warn("WARNING: Using default JWT_SECRET — change it before production");
  }
}
if (config.resendApiKey) {
  if (!config.smtp.from) {
    console.warn("WARNING: EMAIL_FROM is required when RESEND_API_KEY is configured.");
  } else {
    console.log("[Email] Resend HTTP API configured.");
  }
} else if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
  console.warn("WARNING: Email is not configured. Set RESEND_API_KEY and EMAIL_FROM, or SMTP settings.");
} else if (config.nodeEnv === "production") {
  console.warn("[Email] Production SMTP may be blocked by the host; configure RESEND_API_KEY and EMAIL_FROM.");
} else {
  console.log("[Email] SMTP transport configured.");
}