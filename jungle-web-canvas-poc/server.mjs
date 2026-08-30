import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 8123;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (urlPath === "/") urlPath = "/index.html";
    const rel = urlPath.replace(/^\/+/, "");
    const filePath = resolve(ROOT, rel);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const data = await readFile(filePath);
    // This is the shared tablet/dev server. Avoid serving a stale game module
    // after a renderer switch or a source update.
    res.writeHead(200, {
      "content-type": TYPES[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store, max-age=0",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => {
  console.log(`Jungle Camp PoC running at http://localhost:${PORT}`);
});
