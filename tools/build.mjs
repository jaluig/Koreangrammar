#!/usr/bin/env node
// Bundles the game into one self-contained HTML file (CSS and JS inlined).
//   node tools/build.mjs              → dist/mandu-grammar-diary.html, open it anywhere
//   node tools/build.mjs --artifact   → page content without <html>/<head>/<body>,
//                                       for hosts that wrap the page themselves
//   node tools/build.mjs [--artifact] path/to/out.html
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const artifact = args.includes("--artifact");
const out = args.find((a) => !a.startsWith("--")) || join(root, "dist", artifact ? "artifact.html" : "mandu-grammar-diary.html");

const read = (file) => readFileSync(join(root, file), "utf8");

let page = read("index.html")
  .replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)">/g, (_, href) => "<style>\n" + read(href) + "</style>")
  .replace(/<script src="([^"]+)"><\/script>/g, (_, src) => "<script>\n" + read(src).replace(/<\/script/gi, "<\\/script") + "</script>");

if (artifact) {
  const head = page.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "");
  const body = page.match(/<body>([\s\S]*?)<\/body>/)[1];
  page = head.trim() + "\n" + body.trim() + "\n";
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log("Wrote " + out + " (" + Math.round(Buffer.byteLength(page) / 1024) + " KB)");
