import express from "express";
import Ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import multer from "multer";
import path from "path";
Ffmpeg.setFfmpegPath("C:ffmpeg\\bin\\ffmpeg.exe");
Ffmpeg.setFfprobePath("C:ffmpeg\\bin\\ffprobe.exe");

const app = express();
const port = process.env.PORT || 4040;
const outputDir = "public/output_videos";

const resolutions = [
  { name: "144p", width: 256, height: 144 },
  { name: "360p", width: 640, height: 360 },
  { name: "720p", width: 1280, height: 720 },
];


const convertVideo = (resolution, callback) => {
  const inputFilePath = "public/videos/1698490406899.mp4";
  const inputFileName = path.basename(
    inputFilePath,
    path.extname(inputFilePath)
  );
  const outputFilePath = `${outputDir}/${inputFileName}_${resolution.name}.mp4`;
  if (fs.existsSync(outputFilePath)) {
    console.log(`Video already exists ,skipping converison`);
    callback();
    return;
  }

  Ffmpeg(inputFilePath)
    .size(`${resolution.width}x${resolution.height}`)
    .output(outputFilePath)
    .on("end", () => {
      console.log(`Video in ${resolution.name} is ready`);
      callback();
    })
    .on("error", (err) => {
      console.log(`Error in ${resolution.name}`);
      callback(err);
    })
    .run();
};


const convertVideos = () => {
  const conversionPromises = resolutions.map((resolution) => {
    return new Promise((resolve, reject) => {
      convertVideo(resolution, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  Promise.all(conversionPromises)
    .then(() => {
      console.log("All videos converted successfully");
  
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error("Video conversion failed:", error);
    });
};


if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}


convertVideos();

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname));
    console.log(Date.now() + path.extname(file.originalname));
  },
});
const videoStorage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "public/videos");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, Date.now() + path.extname(file.originalname));
    console.log(Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: imageStorage });
const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(mp4|MPEG-4|mkv)$/)) {
      return cb(new Error("Please upload a Video"));
    }
    cb(undefined, true);
  },
});
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  res.send("Hello People");
});

app.get("/upload", async (req, res) => {
  res.render("upload");
});
app.post("/upload", upload.single("image"), async (req, res) => {
  res.send("Image uploaded");
});
app.post("/uploadVideo", videoUpload.single("video"), async (req, res) => {
  res.send("Video Uploaded");
});
app.get("/video", async (req, res) => {
  const range = req.headers.range;
  if (!range) {
    console.log("here");
    return res.status(400).send("Requires range header");
  }
  const videoPath = "public/output_videos/1698472840146_720p.mp4";
  const videoSize = fs.statSync(videoPath).size;
  const CHUNK_SIZE = 10 ** 4;
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Range": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };
  res.writeHead(206, headers);
  const videoStream = fs.createReadStream(videoPath, { start, end });
  videoStream.pipe(res);
});

// app.listen(port, () => {
//   console.log(`server is running on port ${port}`);
// });
