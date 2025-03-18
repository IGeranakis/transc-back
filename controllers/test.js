// export const test = (req,res)=>{
//     return res.status(200).json({msg:"test success"})
// }

import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const SEGMENT_DURATION = 300; // 5 minutes (300 seconds)
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Function to get file extension from MIME type
function getFileExtension(mimeType) {
  const mimeMap = {
    "audio/flac": "flac",
    "audio/m4a": "m4a",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mpga": "mpga",
    "audio/oga": "oga",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
  };
  return mimeMap[mimeType] || "mp3";
}

async function segmentAndTranscribe(filePath) {
  return new Promise((resolve, reject) => {
    const outputDir = "segments/";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Step 1: Convert Opus to MP3 first
    const convertedFilePath = `${filePath}.mp3`;
    console.log("Converting Opus to MP3...");

    ffmpeg(filePath)
      .outputOptions([
        "-ac 1",  // Convert to mono
        "-ar 16000",  // Convert to 16kHz sample rate
        "-b:a 192k",  // Ensure high quality
        "-c:a libmp3lame"  // Convert explicitly to MP3
      ])
      .toFormat("mp3")
      .on("end", () => {
        console.log("File conversion to MP3 complete!");

        // Step 2: Now segment the converted MP3 file
        const segmentPath = `${outputDir}segment_%03d.mp3`;
        console.log("Starting segmentation...");

        ffmpeg(convertedFilePath)
          .outputOptions([
            "-f segment",
            `-segment_time ${SEGMENT_DURATION}`,
            "-c:a libmp3lame",  // Ensure it's MP3 format
          ])
          .output(segmentPath)
          .on("end", async () => {
            console.log("Segmentation complete!");

            const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp3"));
            let fullTranscription = "";

            if (files.length === 0) {
              console.error("No segments were created!");
              return reject("FFmpeg did not generate any segments");
            }

            for (const file of files) {
              console.log("Transcribing:", file);
              const segmentTranscription = await transcribeSegment(`${outputDir}${file}`);
              fullTranscription += segmentTranscription + " ";
              fs.unlinkSync(`${outputDir}${file}`);
            }

            fs.unlinkSync(filePath);
            fs.unlinkSync(convertedFilePath);
            resolve(fullTranscription);
          })
          .on("error", (err, stdout, stderr) => {
            console.log("Segment Path:", segmentPath);
            console.error("FFmpeg Error:", err);
            console.error("FFmpeg Stdout:", stdout);
            console.error("FFmpeg Stderr:", stderr);
            reject(err);
          })
          .run();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("FFmpeg Conversion Error:", err);
        console.error("FFmpeg Stdout:", stdout);
        console.error("FFmpeg Stderr:", stderr);
        reject("Error in file conversion");
      })
      .save(convertedFilePath);
  });
}

// Function to transcribe a single segment
async function transcribeSegment(segmentPath) {
  try {
    console.log("Sending segment to Whisper:", segmentPath);

    const formData = new FormData();
    formData.append("file", fs.createReadStream(segmentPath));
    formData.append("model", "whisper-1");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    console.log("Segment Transcription Complete:", response.data.text);
    return response.data.text;
  } catch (error) {
    console.error("Whisper API Error for Segment:", error.response?.data || error.message);
    return "[Error in segment transcription]";
  }
}

export const transcribeAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("Uploaded File Details:", req.file);

  const originalExtension = getFileExtension(req.file.mimetype);
  const renamedFilePath = `${req.file.path}.${originalExtension}`;

  try {
    fs.renameSync(req.file.path, renamedFilePath);
    console.log("Renamed File Path:", renamedFilePath);
  } catch (err) {
    console.error("Error renaming file:", err);
    return res.status(500).json({ error: "File renaming failed" });
  }

  try {
    const transcription = await segmentAndTranscribe(renamedFilePath);

    // ✅ CHECK IF FILE EXISTS BEFORE DELETING
    if (fs.existsSync(renamedFilePath)) {
      fs.unlink(renamedFilePath, (err) => {
        if (err) {
          console.error("Error deleting uploaded file:", err);
        } else {
          console.log("Uploaded file deleted:", renamedFilePath);
        }
      });
    } else {
      console.log("File already deleted or moved:", renamedFilePath);
    }

    res.json({ text: transcription.trim() });
  } catch (error) {
    console.error("Transcription Process Error:", error);
    res.status(500).json({ error: "Transcription process failed", details: error.message });
  }
};