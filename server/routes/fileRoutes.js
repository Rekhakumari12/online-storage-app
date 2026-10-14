import express from "express";
import { createWriteStream } from "fs";
import { rm } from "fs/promises";
import { ObjectId } from "mongodb";
import path from "path";
import { pipeline } from "stream/promises";
import { normalizeDirectoryId } from "../middlewares/ownership.js";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

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

router.param("id", validateIdMiddleware);
router.param("parentDirId", validateIdMiddleware);

router
  .route("/:id")
  .get(async (req, res, next) => {
    const { id } = req.params;

    const db = req.db;
    const file = await db
      .collection("files")
      .findOne({ _id: new ObjectId(id), userId: req.user._id });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const fullFilePath = getStoragePath(`${id}${file.extension}`);
    if (!fullFilePath || fullFilePath === storageRoot) {
      return res.status(400).json({ message: "Invalid file path" });
    }

    if (req.query.action === "download") {
      return res.download(fullFilePath, file.name);
    }

    return res.sendFile(fullFilePath, (err) => {
      if (err) {
        if (res.headersSent) return next(err);
        return res.status(404).json({ error: "File not found!" });
      }
    });
  })
  .delete(async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    const fileCollection = db.collection("files");
    const file = await fileCollection.findOne({
      _id: new ObjectId(id),
      userId: req.user._id,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const fullFilePath = getStoragePath(`${id}${file.extension}`);
    if (!fullFilePath || fullFilePath === storageRoot) {
      return res.status(400).json({ message: "Invalid file path" });
    }

    try {
      await rm(fullFilePath);
      // remove file from files db
      await fileCollection.deleteOne({ _id: new ObjectId(id) });
      res.json({ message: "File deleted successfully" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Internal server error" });
    }
  })
  .patch(async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    const fileCollection = db.collection("files");
    const file = await fileCollection.findOne({
      _id: new ObjectId(id),
      userId: req.user._id,
    });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const newFileName = req.body?.newFileName;
    if (typeof newFileName !== "string" || !newFileName.trim()) {
      return res.status(400).json({ message: "A new filename is required" });
    }

    try {
      await fileCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { name: newFileName } },
      );
      return res.json({ message: "File renamed successfully" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "File rename failed" });
    }
  });

router.post("{/:parentDirId}", async (req, res) => {
  const requestedParentDirId = req.params.parentDirId;
  const db = req.db;
  const dirCollection = db.collection("directories");

  const parentDirId =
    normalizeDirectoryId(requestedParentDirId) || req.user.rootDirId;
  const directoryData = await dirCollection.find({
    _id: new ObjectId(parentDirId),
    userId: req.user._id,
  });

  if (!directoryData) {
    return res.status(404).json({ message: "Root directory not found" });
  }

  const filename = req.get("filename")?.trim() || "Untitled";
  const extension = path.extname(filename);
  const fileCollection = db.collection("files");
  let insertedId;
  let destLocation;
  let fileCreated = false;
  let clientAborted = req.aborted;
  let writeStream;

  const handleClientAbort = () => {
    clientAborted = true;
    writeStream?.destroy(new Error("Client cancelled the upload"));
  };
  const handleClientDisconnect = () => {
    if (!res.writableFinished) handleClientAbort();
  };

  req.once("aborted", handleClientAbort);
  res.once("close", handleClientDisconnect);

  try {
    if (clientAborted) return;

    const insertedFile = await fileCollection.insertOne({
      name: filename,
      extension,
      parentDirId,
      userId: req.user._id,
    });

    insertedId = insertedFile.insertedId;

    const fullFileName = `${insertedId.toString()}${extension}`;
    destLocation = getStoragePath(fullFileName);

    if (!destLocation || destLocation === storageRoot) {
      await fileCollection.deleteOne({ _id: insertedId });
      return res.status(400).json({
        message: "Invalid file path or filepath should not be root dir path",
      });
    }

    if (clientAborted) throw new Error("Client cancelled the upload");

    writeStream = createWriteStream(destLocation, { flags: "wx" });
    writeStream.once("open", () => {
      fileCreated = true;
    });

    await pipeline(req, writeStream);
    if (clientAborted) throw new Error("Client cancelled the upload");
    return res.json({ message: "File Uploaded Successfully" });
  } catch (e) {
    if (!clientAborted) console.error("Error while uploading", e.message);
    if (fileCreated) {
      try {
        await rm(destLocation, { force: true });
      } catch (cleanupError) {
        console.error("Failed to remove incomplete upload:", cleanupError);
      }
    }
    if (insertedId) {
      try {
        await fileCollection.deleteOne({ _id: insertedId });
      } catch (cleanupError) {
        console.error(
          "Failed to remove incomplete upload record:",
          cleanupError,
        );
      }
    }
    if (clientAborted || req.aborted || res.destroyed) return;
    return res.status(500).json({ message: "File upload failed" });
  } finally {
    req.off("aborted", handleClientAbort);
    res.off("close", handleClientDisconnect);
  }
});

export default router;
