#!/usr/bin/env node
const { createHash } = require("node:crypto");

const plain = process.argv[2];
if (!plain) {
  console.error("Usage: node scripts/hash-admin-password.js <password>");
  process.exit(1);
}

const hash = createHash("sha256").update(plain, "utf8").digest("hex");
console.log(`sha256:${hash}`);
