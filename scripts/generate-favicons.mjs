#!/usr/bin/env node
/**
 * Build favicon.ico, app icons, and public/favicon.ico from the storefront logo.
 * Usage: node scripts/generate-favicons.mjs [path-to-logo.png]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const defaultLogo = path.join(__dirname, "assets", "logo.png");

const logoPath = path.resolve(process.argv[2] || defaultLogo);

const resizeLogo = (size) =>
  sharp(logoPath)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

const writeFile = async (relativePath, data) => {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  const kb = (data.length / 1024).toFixed(1);
  console.log(`  ${relativePath} (${kb} KB)`);
};

const main = async () => {
  try {
    await fs.access(logoPath);
  } catch {
    console.error(`Logo not found: ${logoPath}`);
    process.exit(1);
  }

  console.log(`Source: ${logoPath}`);

  const icoSizes = [16, 32, 48];
  const icoPngs = await Promise.all(icoSizes.map((size) => resizeLogo(size)));
  const faviconIco = await toIco(icoPngs);

  const icon32 = await resizeLogo(32);
  const apple180 = await resizeLogo(180);

  console.log("Writing icons:");
  await writeFile("public/favicon.ico", faviconIco);
  await writeFile("src/app/favicon.ico", faviconIco);
  await writeFile("src/app/icon.png", icon32);
  await writeFile("src/app/apple-icon.png", apple180);

  console.log("Done.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
