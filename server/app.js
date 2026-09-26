import crypto from "crypto";
import express from "express";
import { createWriteStream } from "fs";
import { open, readdir, rename, rm } from "fs/promises";
import { pipeline } from "stream/promises";

const app = express();
const port = 8080;

app.use(express.json());

// Enabling cors
app.use((req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });
  next();
});

// //serving files
// app.use((req, res, next) => {
//   if (req.query.action === "download") {
//     res.set("Content-Disposition", "attachment");
//   }
//   express.static("./storage")(req, res, next);
// });

// serving directory list
app.get("/", async (req, res) => {
  const fileList = await readdir(`./storage`, {
    withFileTypes: true,
  });

  const transformedItemList = fileList.map((item, i) => ({
    name: item.name,
    isDirectory: item.isDirectory(),
    id: crypto.randomUUID(),
  }));

  res.json(transformedItemList);
});

app.get("/:filename", (req, res) => {
  const { filename } = req.params;
  if (req.query.action === "download") {
    res.set("Content-Disposition", "attachment");
  }
  res.sendFile(`${import.meta.dirname}/storage/${filename}`);
});

app.post("/:filename", async (req, res) => {
  const { filename } = req.params;
  console.log(filename);
  const destLocation = `./storage/${filename}`;

  const isFileExist = await open(destLocation, "r")
    .then(() => true)
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

app.delete("/:filename", async (req, res) => {
  const { filename } = req.params;
  const filepath = `./storage/${filename}`;
  try {
    await rm(filepath);
    res.json({ message: "File deleted successfully " });
  } catch (e) {
    console.log(e.message);
  }
});

app.patch("/:filename", async (req, res) => {
  console.log(req.body, req.params);
  const { filename } = req.params;
  const newFileName = req.body.newFileName;
  const filepath = `./storage/${filename}`;
  try {
    await rename(filepath, `./storage/${newFileName}`);
    res.json({ message: "File renamed successfully " });
  } catch (e) {
    console.log(e.message);
  }
});

app.listen(port, () => {
  console.log("Server is running ");
});
