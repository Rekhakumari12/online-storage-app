import express from "express";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "fs/promises";
import path from "path";
import directoriesData from "../directoriesDB.json" with { type: "json" };
import filesData from "../filesDB.json" with { type: "json" };

const router = express.Router();

const storageRoot = path.resolve("./storage");

// directory id is optional, if not present then return the root dir
router.get("{/:id}", async (req, res) => {
  const { id } = req.params;
  const directoryData = id
    ? directoriesData.find((folder) => folder.id === id)
    : directoriesData[0];
  if (!directoryData) {
    return res.status(404).json({ message: "Directory not found" });
  }

  try {
    const files = directoryData.files
      .map((fileId) => filesData.find((file) => fileId === file.id))
      .filter(Boolean);
    const directoriesWithName = directoryData.directories
      .map((dirId) => directoriesData.find((dir) => dir.id === dirId))
      .filter(Boolean);

    return res.json({
      ...directoryData,
      files,
      directories: directoriesWithName,
    });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ message: "Could not load directory" });
  }
});

router.post("{/*parentDirId}", async (req, res) => {
  const parentDirId = req.params.parentDirId?.[0] || directoriesData[0].id;
  const parentDir = directoriesData.find((dir) => dir.id === parentDirId);
  if (!parentDir) {
    return res.status(404).json({ message: "Parent directory not found" });
  }

  const dirname = req.get("dirname")?.trim();
  if (!dirname) {
    return res.status(400).json({ message: "Folder name is required" });
  }

  const isFolderExist = directoriesData.some((dir) => dir.name === dirname);
  if (isFolderExist) {
    return res.status(409).json({ message: "Folder already exists" });
  }

  const id = randomUUID();
  const newDirectory = {
    id,
    name: dirname,
    parentDirId,
    files: [],
    directories: [],
  };
  directoriesData.push(newDirectory);
  parentDir.directories.push(id);

  try {
    await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
    return res.json({ message: "Directory created" });
  } catch (e) {
    directoriesData.splice(directoriesData.indexOf(newDirectory), 1);
    parentDir.directories = parentDir.directories.filter(
      (directoryId) => directoryId !== id,
    );
    console.error(e.message);
    return res.status(500).json({ message: "Could not create directory" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const directory = directoriesData.find((dir) => dir.id === id);
  if (!directory) {
    return res.status(404).json({ message: "Directory not found" });
  }

  const requestedName = req.body?.newDirName;
  if (typeof requestedName !== "string" || !requestedName.trim()) {
    return res.status(400).json({ message: "Folder name is required" });
  }
  const newDirName = requestedName.trim();

  const isFolderExist = directoriesData.some(
    (dir) => dir.id !== id && dir.name === newDirName,
  );
  if (isFolderExist) {
    return res.status(409).json({ message: "Folder already exists" });
  }

  const previousName = directory.name;
  directory.name = newDirName;

  try {
    await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
    return res.json({ message: "Directory renamed successfully" });
  } catch (e) {
    directory.name = previousName;
    console.error(e.message);
    return res.status(500).json({ message: "Could not rename directory" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const directory = directoriesData.find((dir) => dir.id === id);

  if (!directory) {
    return res.status(404).json({ message: "Directory not found" });
  }
  if (directory === directoriesData[0]) {
    return res
      .status(400)
      .json({ message: "Cannot delete the root directory" });
  }

  const normalizeDirectoryId = (parentDirId) =>
    Array.isArray(parentDirId) ? parentDirId[0] : parentDirId;
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
      if (!currentDirectory) continue;

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
