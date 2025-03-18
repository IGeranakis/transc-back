import express from "express";
import multer from "multer";
import { transcribeAudio } from "../controllers/test.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Transcription Route
router.post("/transcribe", upload.single("file"), transcribeAudio);

export default router;