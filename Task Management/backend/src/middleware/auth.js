
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { config } from "../config.js";
import { Session } from "../models/Session.js";

export async function requireAuth(req, res, next) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication token is required." });
  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    if (!sub || !Types.ObjectId.isValid(sub)) throw new Error();

    // Check if session is still valid in database (not logged out)
    const session = await Session.findOne({ token, isValid: true });
    if (!session || (session.expiresAt && session.expiresAt < new Date())) {
      return res.status(401).json({ message: "Session expired or logged out." });
    }

    req.userId = new Types.ObjectId(sub);
    req.session = session;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
}
