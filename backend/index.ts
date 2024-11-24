import express, { Request, Response } from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import sanitize from "sanitize-filename";
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    exposedHeaders: ["Content-Disposition"],
  })
);app.use(express.json());

app.get("/api/download", async (req: Request, res: Response): Promise<void> => {
  const videoUrl = req.query.url as string;
  const format = (req.query.format as string) || "mp4";

  if (!ytdl.validateURL(videoUrl)) {
    res.status(400).json({ error: "Invalid YouTube URL" });
    return;
  }

  try {
    // Get video info to extract the title
    const info = await ytdl.getInfo(videoUrl);
    let title = info.videoDetails.title || "video1";

    // Sanitize the title for safe file naming
    title = sanitize(title).substring(0, 100) || "video"; // Use sanitize-filename

    const tempDir = path.resolve(__dirname, "output");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    if (format === "mp3") {
      // Handle MP3 Download
      const audioFilePath = path.join(tempDir, `${title}.webm`); // Downloaded as WebM
      const mp3FilePath = path.join(tempDir, `${title}.mp3`); // Converted to MP3

      const audioStream = ytdl(videoUrl, { quality: "highestaudio" });
  
      const audioWriteStream = fs.createWriteStream(audioFilePath);

      audioStream.pipe(audioWriteStream);

      audioWriteStream.on("finish", () => {
        // Convert WebM to MP3 using FFmpeg
        ffmpeg()
          .input(audioFilePath)
          .output(mp3FilePath)
          .audioCodec("libmp3lame")
          .on("end", () => {
            // Send the MP3 file to the client
               
            res.download(mp3FilePath, `${title}.mp3`, (err) => {
              console.log(title);
              if (err) {
                console.error("Download error:", err);
              }
              // Clean up temporary files
              fs.unlinkSync(audioFilePath);
              fs.unlinkSync(mp3FilePath);
            });
          })
          .on("error", (err) => {
            console.error("FFmpeg conversion error:", err);
            res.status(500).json({ error: "Failed to convert audio to MP3." });
          })
          .run();
      });

      audioWriteStream.on("error", (err) => {
        console.error("Audio write stream error:", err);
        res.status(500).json({ error: "Failed to process audio." });
      });

      audioStream.on("error", (err) => {
        console.error("Audio stream error:", err);
        res.status(500).json({ error: "Failed to process audio." });
      });
    } else if (format === "mp4") {
      // Handle MP4 Download
      const videoFilePath = path.join(tempDir, `${title}.mp4`);
      const audioFilePath = path.join(tempDir, `${title}.audio.mp3`);
      const outputFilePath = path.join(tempDir, `${title}.final.mp4`);
    
      // Download video and audio streams to temporary files
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const videoStream = ytdl(videoUrl, { quality: "highestvideo" });
          const videoWriteStream = fs.createWriteStream(videoFilePath);
          videoStream.pipe(videoWriteStream);
          videoWriteStream.on("finish", resolve);
          videoStream.on("error", reject);
          videoWriteStream.on("error", reject);
        }),
        new Promise<void>((resolve, reject) => {
          const audioStream = ytdl(videoUrl, { quality: "highestaudio" });
          const audioWriteStream = fs.createWriteStream(audioFilePath);
          audioStream.pipe(audioWriteStream);
          audioWriteStream.on("finish", resolve);
          audioStream.on("error", reject);
          audioWriteStream.on("error", reject);
        }),
      ]);

      // Merge audio and video using FFmpeg
      ffmpeg()
        .input(videoFilePath)
        .input(audioFilePath)
        .outputOptions(["-c:v copy", "-c:a aac", "-strict experimental"])
        .save(outputFilePath)
        .on("end", () => {
          res.download(outputFilePath, `${title}.mp4`, (err) => {
            if (err) {
              console.error("Download error:", err);
            }
            // Clean up temporary files
            fs.unlinkSync(videoFilePath);
            fs.unlinkSync(audioFilePath);
            fs.unlinkSync(outputFilePath);
          });
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          res.status(500).json({ error: "Failed to process video." });
        });
    } else {
      res.status(400).json({ error: "Invalid format. Use 'mp4' or 'mp3'." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download video." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
