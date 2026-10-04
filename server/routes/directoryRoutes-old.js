import crypto from "crypto";
import express from "express";
import { mkdir, open, readdir } from "fs/promises";
import path from "path";

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

router.get("{/*dirname}", async (req, res) => {
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

router.post("/*dirname", async (req, res) => {
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

export default router;
