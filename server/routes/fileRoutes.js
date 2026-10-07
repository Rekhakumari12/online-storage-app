import express from "express";
import { createWriteStream } from "fs";
import { rm, writeFile } from "fs/promises";
import { randomUUID } from "node:crypto";
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
  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  const fullFilePath = getStoragePath(`${id}${file.extension}`);

  if (!fullFilePath || fullFilePath === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; filename=${file.name}`);
  }
  return res.sendFile(fullFilePath, (err) => {
    if (err) {
      if (res.headersSent) return next(err);
      return res.status(404).json({ error: "File not found!" });
    }
  });
});

router.post("{/:parentDirId}", async (req, res) => {
  const requestedParentDirId = req.params.parentDirId;
  const parentDirId =
    (Array.isArray(requestedParentDirId)
      ? requestedParentDirId[0]
      : requestedParentDirId) || directoriesData[0].id;
  const directoryData = directoriesData.find((dir) => dir.id === parentDirId);
  if (!directoryData) {
    return res.status(404).json({ message: "Directory not found" });
  }

  const filename = req.get("filename")?.trim();
  if (!filename) {
    return res.status(400).json({ message: "Filename is required" });
  }

  const extension = path.extname(filename);
  const randomId = randomUUID();

  const fullFileName = `${randomId}${extension}`;
  const destLocation = getStoragePath(fullFileName);

  if (!destLocation || destLocation === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  const writeStream = createWriteStream(destLocation, { flags: "wx" });

  try {
    await pipeline(req, writeStream);
    filesData.push({
      id: randomId,
      name: filename,
      extension,
      parentDirId,
    });

    directoryData.files.push(randomId);

    await writeFile("./filesDB.json", JSON.stringify(filesData));
    await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));

    return res.json({ message: "File Uploaded Successfully" });
  } catch (e) {
    const fileIndex = filesData.findIndex((file) => file.id === randomId);
    if (fileIndex !== -1) filesData.splice(fileIndex, 1);
    directoryData.files = directoryData.files.filter(
      (fileId) => fileId !== randomId,
    );
    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData)),
      writeFile("./directoriesDB.json", JSON.stringify(directoriesData)),
    ]).catch(() => {});
    await rm(destLocation, { force: true }).catch(() => {});
    console.error(e.message);
    return res.status(500).json({ message: "File upload failed" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const fileIndex = filesData.findIndex((file) => file.id === id);
  if (fileIndex === -1) {
    return res.status(404).json({ message: "File not found" });
  }

  const file = filesData[fileIndex];
  const fullFilePath = getStoragePath(`${id}${file.extension}`);
  if (!fullFilePath || fullFilePath === storageRoot) {
    return res.status(400).json({ message: "Invalid file path" });
  }

  try {
    await rm(fullFilePath, { force: true });

    directoriesData.forEach((directory) => {
      directory.files = directory.files.filter((fileId) => fileId !== id);
    });
    filesData.splice(fileIndex, 1);
    await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    res.json({ message: "File deleted successfully" });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const file = filesData.find((file) => file.id === id);
  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  const newFileName = req.body?.newFileName;
  if (typeof newFileName !== "string" || !newFileName.trim()) {
    return res.status(400).json({ message: "A new filename is required" });
  }

  const previousName = file.name;
  file.name = newFileName.trim();
  try {
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    return res.json({ message: "File renamed successfully" });
  } catch (e) {
    file.name = previousName;
    console.error(e.message);
    return res.status(500).json({ message: "File rename failed" });
  }
});

export default router;
