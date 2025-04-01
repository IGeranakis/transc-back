// export const test = (req,res)=>{
//     return res.status(200).json({msg:"test success"})
// }

import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import dotenv from "dotenv"
import path from "path";
import Text from "../models/text_model.js";
import Segment from "../models/segments_model.js";
import Users from "../models/user_model.js";

dotenv.config(); // Load environment variables

const SEGMENT_DURATION = 300; // 5 minutes (300 seconds)
ffmpeg.setFfmpegPath(ffmpegPath.path);

let segmentTranscriptions = []; // List to store each segment transcription

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////// FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////
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

async function transcribeSegment(segmentPath) {
    try {
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
  
      return response.data.text;
    } catch (error) {
      console.error("Whisper API Error:", error.response?.data || error.message);
      return "[Error in segment transcription]";
    }
}  

async function segmentAndTranscribe(filePath, outputDir) {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(outputDir, { recursive: true });
      const convertedFilePath = `${filePath}.mp3`;
  
      ffmpeg(filePath)
        .outputOptions(["-ac 1", "-ar 16000", "-b:a 192k", "-c:a libmp3lame"])
        .toFormat("mp3")
        .on("end", () => {
          const segmentPath = path.join(outputDir, "segment_%03d.mp3");
  
          ffmpeg(convertedFilePath)
            .outputOptions(["-f segment", `-segment_time ${SEGMENT_DURATION}`, "-c:a libmp3lame"])
            .output(segmentPath)
            .on("end", async () => {
              const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".mp3"));
              let segments = [];
  
              for (const file of files) {
                const fullPath = path.join(outputDir, file);
                const text = await transcribeSegment(fullPath);
                segments.push({ segment: file, text });
                fs.unlinkSync(fullPath);
              }
  
              fs.unlinkSync(filePath);
              fs.unlinkSync(convertedFilePath);
              fs.rmSync(outputDir, { recursive: true, force: true });
              resolve(segments);
            })
            .on("error", reject)
            .run();
        })
        .on("error", reject)
        .save(convertedFilePath);
    });
  }



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////// ROUTE FUNCTIONS ///////////////////////////////////////////////////////////////////////////////
export const transcribeAudio = async (req, res) => {
    const { uuid,name } = req.body;
    if (!req.file || !uuid) {
      return res.status(400).json({ error: "Missing file, uuid, or audioId" });
    }
    // 1. Find user by UUID
    const user = await Users.findOne({ where: { uuid } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
  
    const originalExtension = getFileExtension(req.file.mimetype);
    const renamedFilePath = `${req.file.path}.${originalExtension}`;
  
    try {
      await fs.promises.rename(req.file.path, renamedFilePath);
    } catch (err) {
      console.error("Rename error:", err);
      return res.status(500).json({ error: "File rename failed" });
    }
  
    //const outputDir = path.join("segments", uuid, `audio_${audioId}`);

    // const baseDir = path.join("segments", uuid);
    // const existing = fs.existsSync(baseDir) ? fs.readdirSync(baseDir) : [];
    // const audioId = existing
    //     .filter(f => f.startsWith("audio_"))
    //     .map(f => parseInt(f.replace("audio_", "")))
    //     .filter(n => !isNaN(n))
    //     .sort((a, b) => b - a)[0] ?? -1;

    // const nextAudioId = audioId + 1;
    // const outputDir = path.join(baseDir, `audio_${nextAudioId}`);

    const segmentsBase = "segments";
    const existing = fs.existsSync(segmentsBase) ? fs.readdirSync(segmentsBase) : [];
    const matchingUserAudio = existing
        .filter(f => f.startsWith(`${uuid}_`))
        .map(f => parseInt(f.replace(`${uuid}_`, "")))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a)[0] ?? -1;

    const nextAudioId = matchingUserAudio + 1;
    const outputDir = path.join(segmentsBase, `${uuid}_${nextAudioId}`);

    
    try {
      const segments = await segmentAndTranscribe(renamedFilePath, outputDir);

      // 1. Create an empty Text row
      const textRecord = await Text.create({
        name:name,
        corrected_text: null,
        summary: null,
        userId:user.id
      });

      // 2. Create associated Segment rows
      const segmentRecords = await Promise.all(
        segments.map(s =>
          Segment.create({
            segment: s.segment,
            text: s.text,
            textId: textRecord.id,
            
          })
        )
      )



      res.json({ uuid, audioId:`${uuid}_${nextAudioId}`,text: segments,record_id:textRecord.id });
    } catch (err) {
      console.error("Transcription error:", err);
      res.status(500).json({ error: "Transcription failed" });
    }
};

// export const correctedTranscription = async (req, res) => {
//   const { desc, speakers } = req.body;


//   if (!segmentTranscriptions || !desc || !speakers) {
//     return res.status(400).json({ error: "Missing required fields: segmentTranscriptions, desc, speakers" });
//   }

//   try {
//     const systemPrompt = `You are a helpful assistant that will help optimize the initial transcription.
//       Your task is to correct any spelling discrepancies in the transcribed text.
//       Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided.
//       The text is about ${desc}. The number of speakers is ${speakers}.
//       I'd like in the output to try to separate each speaker using a '-' and different paragraphs if the speakers are more than one.`;

//     let correctedSegments = [];

//     for (const segment of segmentTranscriptions) {
//       console.log("Processing segment:", segment.file);

//       const response = await axios.post(
//         "https://api.openai.com/v1/chat/completions",
//         {
//           model: "gpt-4o",
//           temperature: 0,
//           messages: [
//             { role: "system", content: systemPrompt },
//             { role: "user", content: segment.transcription }
//           ]
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//             "Content-Type": "application/json"
//           }
//         }
//       );

//       const correctedText = response.data.choices[0]?.message?.content || "";
//       correctedSegments.push({
//         file: segment.file,
//         correctedTranscription: correctedText
//       });
//     }

//     // Combine all corrected segments into a final full transcription
//     const fullCorrectedTranscription = correctedSegments.map(seg => seg.correctedTranscription).join(" ");

//     // console.log(fullCorrectedTranscription)

//     return res.json({
//       fullCorrectedTranscription
//     });
//   } catch (error) {
//     console.error("Error in correcting transcription:", error.response?.data || error.message);
//     res.status(500).json({ error: "Error in transcription correction" });
//   }
// };

export const correctedTranscription = async (req, res) => {
  const { uuid, textId, desc, speakers } = req.body;

  if (!uuid || !textId || !desc || !speakers) {
    return res.status(400).json({
      error: "Missing required fields: uuid, textId, desc, speakers"
    });
  }

  try {
    // 1. Find the user
    const user = await Users.findOne({ where: { uuid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2. Find the text entry (make sure it belongs to the user)
    const text = await Text.findOne({ where: { id: textId, userId: user.id } });
    if (!text) return res.status(404).json({ error: "Text not found for this user" });

    // 3. Fetch all segments associated with this text
    const segments = await Segment.findAll({
      where: { textId: textId },
      order: [['id', 'ASC']] // optional: keep segments in original order
    });

    // 4. Prepare system prompt
    const systemPrompt = `You are a helpful assistant that will help optimize the initial transcription.
      Your task is to correct any spelling discrepancies in the transcribed text.
      Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided.
      The text is about ${desc}. The number of speakers is ${speakers}.
      I'd like in the output to try to separate each speaker using a '-' and different paragraphs if the speakers are more than one.`;

    let correctedSegments = [];

    // 5. Process each segment
    for (const segment of segments) {
      console.log("Processing segment:", segment.segment);

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: segment.text }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const correctedText = response.data.choices[0]?.message?.content || "";

      correctedSegments.push({
        file: segment.segment,
        correctedTranscription: correctedText
      });
    }

    // 6. Combine into final full corrected transcription
    const fullCorrectedTranscription = correctedSegments
      .map(seg => seg.correctedTranscription)
      .join(" ");

    await Text.update(
      { corrected_text: fullCorrectedTranscription },
      { where: { id: textId, userId: user.id } }
    );

    return res.json({
      fullCorrectedTranscription,
      correctedSegments
    });
  } catch (error) {
    console.error("Error in correcting transcription:", error.response?.data || error.message);
    res.status(500).json({ error: "Error in transcription correction" });
  }
};


// export const summarizeTranscription = async (req, res) => {
//   const { transcription } = req.body;

//   if (!transcription) {
//     return res.status(400).json({ error: "Missing required field: transcription" });
//   }

//   try {
//     const systemPrompt = `You are a helpful assistant that will help summarize the transcription and use only the context provided.
//       Just provide the Summary and do not make further questions.
//       Give the summary always in the same language as the transcription.`;

//     const response = await axios.post(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         model: "gpt-4o",
//         temperature: 0,
//         messages: [
//           { role: "system", content: systemPrompt },
//           { role: "user", content: transcription }
//         ]
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     const summary = response.data.choices[0]?.message?.content || "";
//     segmentTranscriptions = [];

//     return res.json({ summary });
//   } catch (error) {
//     console.error("Error in summarizing transcription:", error.response?.data || error.message);
//     res.status(500).json({ error: "Error in summarizing transcription" });
//   }
// };


export const summarizeTranscription = async (req, res) => {
  const { textId } = req.body;

  if (!textId) {
    return res.status(400).json({ error: "Missing required field: textId" });
  }

  try {
    // 1. Find the Text row
    const text = await Text.findOne({ where: { id: textId } });
    if (!text) {
      return res.status(404).json({ error: "Text not found" });
    }

    // 2. Make sure corrected_text exists
    if (!text.corrected_text) {
      return res.status(400).json({ error: "No corrected transcription found for this text" });
    }

    // 3. Build OpenAI system prompt
    const systemPrompt = `You are a helpful assistant that will help summarize the transcription and use only the context provided.
      Just provide the Summary and do not make further questions.
      Give the summary always in the same language as the transcription.`;

    // 4. Request summary from OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.corrected_text }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const summary = response.data.choices[0]?.message?.content || "";

    // ✅ 5. Update the Text row with the summary
    await Text.update(
      { summary:summary },
      { where: { id: textId } }
    );

    return res.json({ summary, savedToDb: true });

  } catch (error) {
    console.error("Error in summarizing transcription:", error.response?.data || error.message);
    res.status(500).json({ error: "Error in summarizing transcription" });
  }
};
