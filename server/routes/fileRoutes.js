import express from "express";
import { createWriteStream } from "fs";
import { open, rm, writeFile } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import directoriesData from "../directoriesDB.json" with { type: "json" };
import filesData from "../filesDB.json" with { type: "json" };

const router = express.Router();

const storageRoot = path.resolve("./storage");

const getStoragePath = (relativePath) => {
  if (typeof relativePath !== "string") return null;

  const resolvedPath = path.resolve(storageRoot, relativePath);
  return resolvedPath === storageRoot ||
    resolvedPath.startsWith(`${storageRoot}${path.sep}`) // sep - Provides the platform-specific path segment separator
    ? resolvedPath
    : null;
};

router.get("/:id", (req, res, next) => {
  const { id } = req.params;

  const file = filesData.find((file) => file.id === id);
  const fullFilePath = getStoragePath(`${id}${file.extension}`);

  if (!fullFilePath || fullFilePath === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

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

router.post("/:filename", async (req, res) => {
  const { filename } = req.params;
  const parentDirId = req.headers.parentdirid || directoriesData[0].id;

  const extension = path.extname(filename);
  const randomId = crypto.randomUUID();

  const fullFileName = `${randomId}${extension}`;
  const destLocation = getStoragePath(fullFileName);

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
    filesData.push({
      id: randomId,
      name: filename,
      extension,
      parentDirId,
    });

    const directoryData = directoriesData.find((dir) => dir.id === parentDirId);
    directoryData.files.push(randomId);

    await writeFile("./filesDB.json", JSON.stringify(filesData));
    await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));

    res.json({ message: "File Uploaded Successfully" });
  } catch (e) {
    console.log(e);
    res.json({ message: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const fileIndex = filesData.findIndex((file) => file.id === id);
  const file = filesData[fileIndex];

  const directory = directoriesData.find((dir) => dir.id === file.parentDirId);
  console.log(directory);
  directory.files = directory.files.filter((fileId) => fileId !== id);

  const fullFilePath = getStoragePath(`${id}${file.extension}`);
  if (!fullFilePath || fullFilePath === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  try {
    await rm(fullFilePath, { recursive: true });
    filesData.splice(fileIndex, 1);
    console.log(directoriesData);
    await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    res.json({ message: "File deleted successfully " });
  } catch (e) {
    console.log(e.message);
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const file = filesData.find((file) => file.id === id);
  file.name = req.body.newFileName;
  try {
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    res.json({ message: "File renamed successfully " });
  } catch (e) {
    console.log(e.message);
  }
});

export default router;
