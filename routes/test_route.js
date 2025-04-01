import express from "express";
import multer from "multer";
import { transcribeAudio } from "../controllers/test2.js";
import {correctedTranscription} from "../controllers/test2.js"
import { summarizeTranscription } from "../controllers/test2.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Transcription Route
router.post("/transcribe", upload.single("file"), transcribeAudio);
router.post("/correctTranscribe", correctedTranscription);
router.post("/summarize", summarizeTranscription)
// router.post("/corrections",)

export default router;