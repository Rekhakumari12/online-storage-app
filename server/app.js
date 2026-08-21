import http from 'http';
import { readdir, open, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import mime from 'mime-types';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'GET') {
    if (req.url === '/') {
      serveDirectory(req, res);
    } else {
      try {
        const [url, queryString] = req.url.split('?');
        const queryParam = {};
        queryString?.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          queryParam[k] = v;
        });

        const fileHandle = await open(`./storage${decodeURIComponent(url)}`);
        const stats = await fileHandle.stat();

        if (stats.isDirectory()) {
          serveDirectory(req, res);
        } else {
          const readStream = fileHandle.createReadStream();
          res.setHeader(
            'Content-Type',
            mime.contentType(url.slice(url.lastIndexOf('/') + 1)),
          );
          res.setHeader('Content-length', stats.size);
          if (queryParam.action === 'download') {
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${url.slice(1)}"`,
            );
          }
          readStream.pipe(res);
        }
      } catch (err) {
        console.log(err.message);
        res.end('Not found!');
      }
    }
  } else if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
  } else if (req.method === 'POST') {
    const destPath = `./storage/${req.headers.filename}`;
    const writeStream = createWriteStream(destPath);
    try {
      await pipeline(req, writeStream);
      res.end('File uploaded on the server');
    } catch (e) {
      // client disconnected mid-upload: remove the partial/corrupt file
      writeStream.destroy();
      res.end('Uploading failed');
    }
  }
});

async function serveDirectory(req, res) {
  const [url] = req.url.split('?');
  const itemList = await readdir(`./storage${decodeURIComponent(url)}`, {
    withFileTypes: true,
  });
  const transformedItemList = itemList.map((item) => ({
    name: item.name,
    isDirectory: item.isDirectory(),
  }));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(transformedItemList));
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log('Server is listening to port', PORT);
});
