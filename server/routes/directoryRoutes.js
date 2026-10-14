import express from "express";
import { rm, writeFile } from "fs/promises";
import { ObjectId } from "mongodb";
import path from "path";
import directoriesData from "../directoriesDB.json" with { type: "json" };
import filesData from "../filesDB.json" with { type: "json" };
import {
  isDirectoryOwnedByUser,
  normalizeDirectoryId,
} from "../middlewares/ownership.js";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

const router = express.Router();

router.param("id", validateIdMiddleware);
router.param("parentDirId", validateIdMiddleware);

const storageRoot = path.resolve("./storage");

const forbiddenDirectoryResponse = (res) =>
  res.status(403).json({ message: "You do not have access to this directory" });

router.get("{/:id}", async (req, res) => {
  const db = req.db;
  const user = req.user;
  const id = req.params.id || user.rootDirId.toString();

  const dirCollection = db.collection("directories");
  const fileCollection = db.collection("files");

  const directoryData = await dirCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!directoryData) {
    return res.status(404).json({ message: "Directory not found" });
  }
  if (!isDirectoryOwnedByUser(directoryData, user)) {
    return forbiddenDirectoryResponse(res);
  }

  try {
    const files = await fileCollection.find({ parentDirId: id }).toArray();
    const directories = await dirCollection.find({ parentDirId: id }).toArray();

    return res.json({
      ...directoryData,
      files: files.map((file) => ({
        ...file,
        id: file._id,
      })),
      directories: directories.map((dir) => ({
        ...dir,
        name: dir.name,
        id: dir._id,
      })),
    });
  } catch (e) {
    console.error("In directories", e.message);
    return res.status(500).json({ message: "Could not load directory" });
  }
});

router.post("{/*parentDirId}", async (req, res) => {
  const user = req.user;
  const db = req.db;

  const parentDirId = req.params.parentDirId?.[0] || user.rootDirId;
  const dirname = req.get("dirname")?.trim() || "New Folder";

  console.log(parentDirId);

  // const isFolderExist = directoriesData.some((dir) => dir.name === dirname);
  // if (isFolderExist) {
  //   return res.status(409).json({ message: "Folder already exists" });
  // }

  try {
    const parentDir = await db
      .collection("directories")
      .findOne({ _id: new ObjectId(parentDirId) });

    if (!parentDir) {
      return res.status(404).json({ message: "Parent directory not found" });
    }
    if (!isDirectoryOwnedByUser(parentDir, user)) {
      return forbiddenDirectoryResponse(res);
    }

    await db.collection("directories").insertOne({
      name: dirname,
      parentDirId,
      userId: user._id,
    });
    return res.json({ message: "Directory created" });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ message: "Could not create directory" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const db = req.db;

  // const isFolderExist = directoriesData.some(
  //   (dir) => dir.id !== id && dir.name === newDirName,
  // );
  // if (isFolderExist) {
  //   return res.status(409).json({ message: "Folder already exists" });
  // }
  try {
    const directory = await db.collection("directories").findOne({
      _id: new ObjectId(id),
    });
    if (!directory) {
      return res.status(404).json({ message: "Directory not found" });
    }
    if (!isDirectoryOwnedByUser(directory, user)) {
      return forbiddenDirectoryResponse(res);
    }

    const requestedName = req.body?.newDirName;
    if (typeof requestedName !== "string" || !requestedName.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }
    const newDirName = requestedName.trim();
    await db
      .collection("directories")
      .updateOne(
        { _id: new ObjectId(id), userId: new ObjectId(user._id) },
        { $set: { name: newDirName } },
      );
    return res.json({ message: "Directory renamed successfully" });
  } catch (e) {
    directory.name = previousName;
    console.error(e.message);
    return res.status(500).json({ message: "Could not rename directory" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { user, db } = req;
  const directory = await db.collection("directories").findOne({
    _id: new ObjectId(id),
  });

  if (!directory) {
    return res.status(404).json({ message: "Directory not found" });
  }
  if (!isDirectoryOwnedByUser(directory, user)) {
    return forbiddenDirectoryResponse(res);
  }
  if (directory._id === user.rootDirId) {
    return res
      .status(400)
      .json({ message: "Cannot delete the root directory" });
  }

  const parentId = normalizeDirectoryId(directory.parentDirId);
  const parentDirectory = directoriesData.find((dir) => dir.id === parentId);
  if (!parentDirectory) {
    return res.status(409).json({ message: "Parent directory not found" });
  }

  try {
    const directoriesToDelete = [];
    const directoryIds = new Set();
    const pendingDirectoryIds = [id];

    while (pendingDirectoryIds.length > 0) {
      const currentId = pendingDirectoryIds.pop();
      if (directoryIds.has(currentId)) continue;

      const currentDirectory = directoriesData.find(
        (dir) => dir.id === currentId,
      );
      if (
        !currentDirectory ||
        !isDirectoryOwnedByUser(currentDirectory, user)
      ) {
        continue;
      }

      directoryIds.add(currentId);
      directoriesToDelete.push(currentDirectory);
      pendingDirectoryIds.push(...currentDirectory.directories);
    }

    const linkedFileIds = new Set(
      directoriesToDelete.flatMap((dir) => dir.files),
    );
    const filesToDelete = filesData.filter(
      (file) =>
        linkedFileIds.has(file.id) ||
        directoryIds.has(normalizeDirectoryId(file.parentDirId)),
    );

    await Promise.all(
      filesToDelete.map((file) => {
        const filePath = path.resolve(
          storageRoot,
          `${file.id}${file.extension}`,
        );
        if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
          throw new Error("Invalid file path");
        }
        return rm(filePath, { force: true });
      }),
    );

    const deletedDirectoryIds = new Set(
      directoriesToDelete.map((dir) => dir.id),
    );
    const deletedFileIds = new Set(filesToDelete.map((file) => file.id));
    const remainingDirectories = directoriesData
      .filter((dir) => !deletedDirectoryIds.has(dir.id))
      .map((dir) =>
        dir.id === parentId
          ? {
              ...dir,
              directories: dir.directories.filter(
                (directoryId) => directoryId !== id,
              ),
            }
          : dir,
      );
    const remainingFiles = filesData.filter(
      (file) => !deletedFileIds.has(file.id),
    );

    await writeFile(
      "./directoriesDB.json",
      JSON.stringify(remainingDirectories),
    );
    await writeFile("./filesDB.json", JSON.stringify(remainingFiles));

    directoriesData.splice(0, directoriesData.length, ...remainingDirectories);
    filesData.splice(0, filesData.length, ...remainingFiles);
    res.json({
      message: "Directory and its contents deleted successfully",
      deletedDirectories: directoriesToDelete.length,
      deletedFiles: filesToDelete.length,
    });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ message: "Could not delete directory" });
  }
});

export default router;
