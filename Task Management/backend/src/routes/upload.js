import { Router } from "express";
import { upload } from "../services/upload.js";
import { requireAuth } from "../middleware/auth.js";

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

// Upload a single file (e.g. task attachment or user avatar)
uploadRouter.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file was uploaded." });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.status(201).json({
    message: "File uploaded successfully.",
    file: {
      filename: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl
    }
  });
});
