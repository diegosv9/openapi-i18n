import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "4174");
const coverageDir = resolve(process.cwd(), "coverage");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const sendText = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
};

const resolvePath = async (urlPathname) => {
  const decoded = decodeURIComponent(urlPathname);
  const relativePath = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedPath = join(coverageDir, relativePath);

  if (!requestedPath.startsWith(coverageDir)) {
    return null;
  }

  let filePath = requestedPath;
  const fileStat = await stat(filePath).catch(() => null);

  if (fileStat?.isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  await access(filePath);

  return filePath;
};

await access(join(coverageDir, "index.html")).catch(() => {
  console.error('Coverage report not found. Run "pnpm test:coverage" first.');
  process.exit(1);
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  try {
    const filePath = await resolvePath(url.pathname);

    if (!filePath) {
      sendText(res, 403, "Forbidden");
      return;
    }

    const type = mimeTypes[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not Found");
  }
});

server.listen(port, host, () => {
  console.log(`Serving coverage report at http://${host}:${port}`);
});
