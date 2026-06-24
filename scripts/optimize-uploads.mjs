#!/usr/bin/env node
/**
 * Batch-optimize raster images in public/uploads (resize + JPEG).
 *
 * Usage:
 *   node scripts/optimize-uploads.mjs
 *   node scripts/optimize-uploads.mjs --dry-run
 *   node scripts/optimize-uploads.mjs --subdir products --min-size-kb 200
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  optimizeRasterBuffer,
  resolveImagePreset,
  shouldOptimizeExtension,
  shouldSkipExtension,
  shouldSkipOptimization,
} = require("../src/lib/server/imageOptimize.js");
const { replaceImageUrlInDb } = require("../src/lib/server/uploadImageUrlMigration.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const uploadsRoot = path.join(root, "public", "uploads");

const parseArgs = (argv) => {
  const options = {
    dryRun: false,
    subdir: "",
    minSizeKb: 200,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--subdir") {
      options.subdir = String(argv[i + 1] || "").trim().replace(/^\/+|\/+$/g, "");
      i += 1;
      continue;
    }
    if (arg === "--min-size-kb") {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value >= 0) {
        options.minSizeKb = value;
      }
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(`Usage: node scripts/optimize-uploads.mjs [options]

Options:
  --dry-run           Log actions without writing files or DB updates
  --subdir PATH       Only process public/uploads/PATH (e.g. products, furnitura)
  --min-size-kb N     Skip files smaller than N KB when already within preset bounds (default: 200)
  -h, --help          Show this help
`);
      process.exit(0);
    }
  }

  return options;
};

const walkFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const toPublicUploadUrl = (relativePath) => `/uploads/${relativePath.replace(/\\/g, "/")}`;

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const scanRoot = options.subdir ? path.join(uploadsRoot, options.subdir) : uploadsRoot;

  try {
    await fs.access(scanRoot);
  } catch {
    console.error(`Uploads directory not found: ${scanRoot}`);
    process.exit(1);
  }

  const stats = {
    scanned: 0,
    skipped: 0,
    optimized: 0,
    dbRowsUpdated: 0,
    savedBytes: 0,
  };

  const files = await walkFiles(scanRoot);
  console.log(`Scanning ${files.length} files under ${scanRoot}`);

  for (const fullPath of files) {
    stats.scanned += 1;
    const relativePath = path.relative(uploadsRoot, fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    if (shouldSkipExtension(ext) || !shouldOptimizeExtension(ext)) {
      stats.skipped += 1;
      continue;
    }

    const subdir = path.dirname(relativePath);
    const preset = resolveImagePreset(subdir === "." ? "" : subdir.replace(/\\/g, "/"));
    const buffer = await fs.readFile(fullPath);
    const fileSize = buffer.length;

    if (
      await shouldSkipOptimization(buffer, {
        preset,
        fileSizeBytes: fileSize,
        minSizeKb: options.minSizeKb,
      })
    ) {
      stats.skipped += 1;
      continue;
    }

    const optimized = await optimizeRasterBuffer(buffer, { preset });
    const baseName = path.basename(fullPath, ext);
    const outputPath = path.join(path.dirname(fullPath), `${baseName}.jpg`);
    const oldUrl = toPublicUploadUrl(relativePath);
    const newRelativePath = path.join(path.dirname(relativePath), `${baseName}.jpg`);
    const newUrl = toPublicUploadUrl(newRelativePath);
    const saved = Math.max(0, fileSize - optimized.buffer.length);

    if (options.dryRun) {
      console.log(
        `[dry-run] ${relativePath} -> ${path.relative(uploadsRoot, outputPath)} (${(fileSize / 1024).toFixed(1)} KB -> ${(optimized.buffer.length / 1024).toFixed(1)} KB)`,
      );
      stats.optimized += 1;
      stats.savedBytes += saved;
      continue;
    }

    await fs.writeFile(outputPath, optimized.buffer);
    if (outputPath !== fullPath) {
      await fs.unlink(fullPath);
    }

    if (oldUrl !== newUrl) {
      const { updated } = await replaceImageUrlInDb(oldUrl, newUrl);
      stats.dbRowsUpdated += updated;
    }

    stats.optimized += 1;
    stats.savedBytes += saved;
    console.log(
      `Optimized ${relativePath} (${(fileSize / 1024).toFixed(1)} KB -> ${(optimized.buffer.length / 1024).toFixed(1)} KB)`,
    );
  }

  console.log("");
  console.log("Done.");
  console.log(`Scanned: ${stats.scanned}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Optimized: ${stats.optimized}`);
  console.log(`DB rows updated: ${stats.dbRowsUpdated}`);
  console.log(`Saved: ${(stats.savedBytes / (1024 * 1024)).toFixed(2)} MB`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
