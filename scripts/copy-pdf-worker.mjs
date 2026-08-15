// Copies the pdf.js worker (version-matched to the installed pdfjs-dist) into
// /public so it can be served at /pdf.worker.min.mjs. Runs on postinstall so
// the worker never drifts out of sync with the library API version.
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.mjs");

try {
  if (!existsSync(src)) {
    console.warn("[copy-pdf-worker] source not found, skipping:", src);
    process.exit(0);
  }
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
  console.log("[copy-pdf-worker] copied pdf.js worker -> public/pdf.worker.min.mjs");
} catch (err) {
  console.warn("[copy-pdf-worker] failed (non-fatal):", err?.message ?? err);
  process.exit(0);
}
