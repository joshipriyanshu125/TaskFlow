/**
 * Strips MongoDB operator keys (starting with $) from objects
 * to prevent NoSQL injection attacks.
 */
export function sanitizeInput(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeInput);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue; // Strip MongoDB operators
    clean[key] = typeof value === "object" ? sanitizeInput(value) : value;
  }
  return clean;
}

export function sanitizeMiddleware(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeInput(req.body);
  }
  if (req.query && typeof req.query === "object") {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith("$")) {
        delete req.query[key];
      } else if (typeof req.query[key] === "object" && req.query[key] !== null) {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  next();
}

