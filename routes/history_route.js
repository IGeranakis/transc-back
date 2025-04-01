import express from "express";
import multer from "multer";
import { getAllTextsForUser } from "../controllers/history.js";
import { verifyUser, adminOnly } from "../middleware/auth_user.js";


const router = express.Router();

// Transcription Route
router.get("/history/user/:uuid", getAllTextsForUser);
// router.post("/correctTranscribe",verifyUser, correctedTranscription);
// router.post("/summarize",verifyUser,summarizeTranscription)
// router.post("/corrections",)

export default router;