import crypto from "crypto";
import http from "http";
import mime from "mime-types";
import { createWriteStream } from "node:fs";
import { open, readdir, rename, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

// use TCP connection behind the seen
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  if (req.method === "GET") {
    if (req.url === "/") {
      serveDirectory(req, res);
    } else {
      try {
        const [url, queryString] = req.url.split("?");
        const queryParam = {};
        queryString?.split("&").forEach((pair) => {
          const [k, v] = pair.split("=");
          queryParam[k] = v;
        });
        // using open version of file handling bcs the need of stats
        const fileHandle = await open(`./storage${decodeURIComponent(url)}`);
        const stats = await fileHandle.stat();

        if (stats.isDirectory()) {
          serveDirectory(req, res);
        } else {
          const readStream = fileHandle.createReadStream();
          res.setHeader(
            "Content-Type",
            mime.contentType(url.slice(url.lastIndexOf("/") + 1)),
          );
          res.setHeader("Content-length", stats.size);
          if (queryParam.action === "download") {
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="${url.slice(1)}"`,
            );
          }
          // pipe method handles the backpressure automatically
          readStream.pipe(res);
        }
      } catch (err) {
        console.log(err.message);
        // always do res.end() otherwise browser keep on loading assuming that data is processing.
        // otherwise content-length header should be set instead of using end()
        res.end("Not found!");
      }
    }
  } else if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
  } else if (req.method === "POST") {
    // creating the file in the storage destination
    // #1 filename will come from request header
    const destPath = `./storage/${req.headers.filename}`;
    // flag "r" opens an existing file strictly for reading. If the file does not exist, the operation will fail and throw an error.
    const isFileExist = await open(destPath, "r")
      .then(() => true)
      .catch(() => false);
    if (isFileExist) {
      res.statusCode = 409;
      res.end("File already exists");
    }
    // data will be written in streams inside destPath, not entire so this will be efficient
    const writeStream = createWriteStream(destPath);
    try {
      // handle the backpressure and also handle the errors
      await pipeline(req, writeStream);
      res.end("File uploaded on the server");
    } catch (e) {
      // client disconnected mid-upload: remove the partial/corrupt file
      writeStream.destroy();
      res.end("Uploading failed");
    }
  } else if (req.method === "DELETE") {
    // native nodejs doesn't support res.bod(it's express.js feature)
    req.on("data", async (chunk) => {
      try {
        const filename = chunk.toString();
        await rm(`./storage/${filename}`);
        res.end("file deleted successfully");
      } catch (e) {
        res.end(e.message);
      }
    });
  } else if (req.method === "PATCH") {
    req.on("data", async (chunk) => {
      try {
        const file = JSON.parse(chunk);
        await rename(
          `./storage/${file.oldFileName}`,
          `./storage/${file.newFileName}`,
        );
        res.end("File renamed successfully");
      } catch (e) {
        res.end(e.message);
      }
    });
  }
});

async function serveDirectory(req, res) {
  const [url] = req.url.split("?");
  console.log(url);
  const itemList = await readdir(`./storage${decodeURIComponent(url)}`, {
    withFileTypes: true,
  });
  const transformedItemList = itemList.map((item, i) => ({
    name: item.name,
    isDirectory: item.isDirectory(),
    id: crypto.randomUUID(),
  }));
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(transformedItemList));
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log("Server is listening to port", PORT);
});
