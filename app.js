import http from 'http';
import { readdir, open, readFile } from 'node:fs/promises';
import mime from 'mime-types';

const server = http.createServer(async (req, res) => {
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
        res.setHeader('Content-Type', mime.contentType(url.slice(1)));
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
});

async function serveDirectory(req, res) {
  const itemList = await readdir(`./storage${decodeURIComponent(req.url)}`);
  let dynamicHtml = '';
  itemList.forEach((item) => {
    dynamicHtml += `<li> ${item}
    <a href=".${req.url === '/' ? '' : req.url}/${item}?action=open">Open</a>
    <a href=".${req.url === '/' ? '' : req.url}/${item}?action=download">Download</a>
    </li>`;
  });
  const htmlBoilerplate = await readFile('./index.html', 'utf-8');
  res.end(htmlBoilerplate.replace('${dynamicHtml}', dynamicHtml));
}

const PORT = 8080;
server.listen(PORT, () => {
  console.log('Server is listening to port', PORT);
});
