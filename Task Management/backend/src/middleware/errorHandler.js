import { ZodError } from "zod";

export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Invalid request data.",
      errors: error.flatten()
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists." });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier." });
  }

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  if (statusCode >= 500) console.error(error);
  return res.status(statusCode).json({
    message: statusCode >= 500 ? "An unexpected server error occurred." : error.message
  });
}
