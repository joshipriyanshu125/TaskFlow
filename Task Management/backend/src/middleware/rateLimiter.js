import rateLimit from "express-rate-limit";

const isDevOrTest = process.env.NODE_ENV !== "production";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 5000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevOrTest,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
});

// Authentication endpoints rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevOrTest,
  message: {
    message: "Too many login/signup attempts from this IP, please try again after 15 minutes."
  }
});
