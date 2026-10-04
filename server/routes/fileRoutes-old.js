import express from "express";
import { createWriteStream } from "fs";
import { open, rename, rm } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

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

router.get("/*filepath", (req, res, next) => {
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

router.post("/*filename", async (req, res) => {
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

router.delete("/*filename", async (req, res) => {
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

router.patch("/*filename", async (req, res) => {
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

export default router;
