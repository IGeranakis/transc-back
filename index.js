import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import db from "./config/database.js"
import SequelizeStore from "connect-session-sequelize"
import session from "express-session";
import cors from "cors"
// var express = require("express");
// var bodyParser = require("body-parser");
import testRouter from "./routes/test_route.js";
import userRouter from "./routes/user_route.js";
import authRouter from "./routes/auth_route.js";

import Users from "./models/user_model.js";


// import multer from "multer";
// import axios from "axios";
// import fs from "fs";
// import FormData from "form-data";
// import ffmpeg from "fluent-ffmpeg";
// import ffmpegPath from "@ffmpeg-installer/ffmpeg";

// Load environment variables
dotenv.config();

// ffmpeg.setFfmpegPath(ffmpegPath.path);
// dotenv.config()

const app = express();
const SEGMENT_DURATION = 300; // 5 minutes (300 seconds)
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));


const sessionStore=SequelizeStore(session.Store);
const store = new sessionStore({
    db:db
});

(async()=>{
    //await db.sync();
    await Users.sequelize.sync();  
})();



app.use(session({
    secret:process.env.SESS_SECRET,
    resave:false,
    saveUninitialized:false,
    store:store,
    cookie:{
        secure:false,
        httpOnly:true,
        sameSite:"lax",
        maxAge: 24 * 60 * 60 * 1000,
    }
}))

app.use(cors({
    credentials:true,
    origin:'http://localhost:3000',
    
})); 

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000'); // Frontend URL
    res.header('Access-Control-Allow-Credentials', 'true');  // Allow cookies
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});






app.use(express.json());


// // File Upload Setup
// const upload = multer({ dest: "uploads/" });

// // Transcription Route
// app.post("/transcribe", upload.single("file"), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   console.log("Uploaded File Details:", req.file);

//   const originalExtension = getFileExtension(req.file.mimetype);
//   const renamedFilePath = `${req.file.path}.${originalExtension}`;

//   fs.renameSync(req.file.path, renamedFilePath);

//   console.log("Renamed File Path:", renamedFilePath);

//   try {
//     const transcription = await segmentAndTranscribe(renamedFilePath);
//     res.json({ text: transcription.trim() });
//   } catch (error) {
//     res.status(500).json({ error: "Error in transcription process" });
//   }
// });

// // Function to get file extension from MIME type
// function getFileExtension(mimeType) {
//   const mimeMap = {
//     "audio/flac": "flac",
//     "audio/m4a": "m4a",
//     "audio/mp3": "mp3",
//     "audio/mp4": "mp4",
//     "audio/mpeg": "mp3",
//     "audio/mpga": "mpga",
//     "audio/oga": "oga",
//     "audio/ogg": "ogg",
//     "audio/wav": "wav",
//     "audio/webm": "webm",
//   };
//   return mimeMap[mimeType] || "mp3";
// }

// // Function to split audio into segments and transcribe
// async function segmentAndTranscribe(filePath) {
//   return new Promise((resolve, reject) => {
//     const outputDir = "segments/";
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir);
//     }

//     const segmentPath = `${outputDir}segment_%03d.mp3`;

//     ffmpeg(filePath)
//       .outputOptions([
//         "-f segment",
//         `-segment_time ${SEGMENT_DURATION}`,
//         "-c copy",
//       ])
//       .output(segmentPath)
//       .on("end", async () => {
//         console.log("Segmentation complete!");

//         const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp3"));
//         let fullTranscription = "";

//         for (const file of files) {
//           console.log("Transcribing:", file);
//           const segmentTranscription = await transcribeSegment(`${outputDir}${file}`);
//           fullTranscription += segmentTranscription + " ";
//           fs.unlinkSync(`${outputDir}${file}`);
//         }

//         fs.unlinkSync(filePath);
//         resolve(fullTranscription);
//       })
//       .on("error", (err) => {
//         console.error("FFmpeg Error:", err);
//         reject(err);
//       })
//       .run();
//   });
// }

// // Function to transcribe a single segment
// async function transcribeSegment(segmentPath) {
//   try {
//     console.log("Sending segment to Whisper:", segmentPath);

//     const formData = new FormData();
//     formData.append("file", fs.createReadStream(segmentPath));
//     formData.append("model", "whisper-1");

//     const response = await axios.post(
//       "https://api.openai.com/v1/audio/transcriptions",
//       formData,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           ...formData.getHeaders(),
//         },
//       }
//     );

//     console.log("Segment Transcription Complete:", response.data.text);
//     return response.data.text;
//   } catch (error) {
//     console.error("Whisper API Error for Segment:", error.response?.data || error.message);
//     return "[Error in segment transcription]";
//   }
// }





app.use(testRouter);
app.use(userRouter);
app.use(authRouter);


// var routes = require("./routes/routes.js")(app);

var server = app.listen(process.env.APP_PORT, function () {
    console.log("Listening on port %s...", server.address().port);
    console.log("APIKEY",process.env.OPENAI_API_KEY);
});   

// app.listen(process.env.APP_PORT,()=>{
//     console.log("Listening on port %s...", server.address().port);
// });