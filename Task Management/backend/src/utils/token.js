import jwt from "jsonwebtoken";
import { config } from "../config.js";


export function createToken(userId, expiresIn = config.jwtExpiresIn) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn });
}

export function createRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: "refresh" }, config.jwtSecret, { expiresIn: "30d" });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
