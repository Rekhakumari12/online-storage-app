import cors from "cors";
import crypto from "crypto";
import express from "express";
import { createWriteStream } from "fs";
import { mkdir, open, readdir, rename, rm } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

const app = express();
const port = 8080;
const storageRoot = path.resolve("./storage");

const getStoragePath = (relativePath) => {
  if (typeof relativePath !== "string") return null;

  const resolvedPath = path.resolve(storageRoot, relativePath);
  return resolvedPath === storageRoot ||
    resolvedPath.startsWith(`${storageRoot}${path.sep}`) // sep - Provides the platform-specific path segment separator
    ? resolvedPath
    : null;
};

app.use(express.json());
app.use(cors());
// Enabling cors
app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });
  next();
});

// //serving files, this is handled inside the specific route where it's needed
// app.use((req, res, next) => {
//   if (req.query.action === "download") {
//     res.set("Content-Disposition", "attachment");
//   }
//   express.static("./storage")(req, res, next);
// });

// serving directory list

app.get("/directory{/*dirname}", async (req, res) => {
  const { dirname } = req.params;
  const transformPath = `${dirname ? dirname.join("/") : ""}`;
  const fullDirPath = getStoragePath(transformPath);
  if (!fullDirPath) {
    return res.status(400).json({ message: "Invalid directory path" });
  }

  try {
    const fileList = await readdir(fullDirPath, {
      withFileTypes: true,
    });

    const transformedItemList = fileList.map((item, i) => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      id: crypto.randomUUID(),
    }));

    res.json(transformedItemList);
  } catch (e) {
    console.log(e.message);
    res.json({ message: e.message });
  }
});

app.post("/directory/*dirname", async (req, res) => {
  const { dirname } = req.params;
  const transformPath = `${dirname ? dirname.join("/") : ""}`;
  const destLocation = getStoragePath(transformPath);
  if (!destLocation || destLocation === storageRoot) {
    return res.status(400).json({ message: "Invalid directory path" });
  }

  try {
    const isFolderExist = await open(destLocation, "r")
      .then(async () => {
        await fileHandle.close();
        return true;
      })
      .catch(() => false);

    if (isFolderExist) {
      res.status(409).json({ message: "Folder already exist" });
      return;
    }
    await mkdir(destLocation);
    res.json({ message: "Directory created" });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/files/*filepath", (req, res, next) => {
  const filepath = `${req.params.filepath.join("/")}`;
  const fullFilePath = getStoragePath(filepath);
  if (!fullFilePath || fullFilePath === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  console.log(filepath);
  if (req.query.action === "download") {
    res.set("Content-Disposition", "attachment");
  }
  res.sendFile(fullFilePath, (err) => {
    if (err) {
      if (res.headersSent) return next(err);
      res.status(404).json({ error: "File not found!" });
    }
  });
});

app.post("/files/*filename", async (req, res) => {
  const filename = `${req.params.filename.join("/")}`;
  console.log(filename);
  const destLocation = getStoragePath(filename);
  if (!destLocation || destLocation === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  const isFileExist = await open(destLocation, "r")
    .then(async () => {
      await fileHandle.close();
      return true;
    })
    .catch(() => false);

  if (isFileExist) {
    res.status(409).json({ message: "File already exist" });
    return;
  }

  const writeStream = createWriteStream(destLocation);

  try {
    await pipeline(req, writeStream);
    res.json({ message: "File Uploaded Successfully" });
  } catch (e) {
    console.log(e.message);
    res.json({ message: e.message });
  }
});

app.delete("/files/*filename", async (req, res) => {
  const filename = `${req.params.filename.join("/")}`;
  const filepath = getStoragePath(filename);
  if (!filepath || filepath === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  try {
    await rm(filepath, { recursive: true });
    res.json({ message: "File deleted successfully " });
  } catch (e) {
    console.log(e.message);
  }
});

app.patch("/*filename", async (req, res) => {
  const filename = `${req.params.filename.join("/")}`;
  console.log(filename);
  const newFileName = req.body.newFileName;
  const oldFilePath = getStoragePath(filename);
  const newFilePath = getStoragePath(newFileName);
  if (
    !oldFilePath ||
    oldFilePath === storageRoot ||
    !newFilePath ||
    newFilePath === storageRoot
  ) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  try {
    await rename(oldFilePath, newFilePath);
    res.json({ message: "File renamed successfully " });
  } catch (e) {
    console.log(e.message);
  }
});

app.listen(port, () => {
  console.log("Server is running ");
});
