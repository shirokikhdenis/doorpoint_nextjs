const path = require("path");
const dotenv = require("dotenv");

let loaded = false;

const loadEnv = () => {
  if (loaded) return;
  dotenv.config({ path: path.join(process.cwd(), ".env") });
  loaded = true;
};

const validateEnv = () => {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
};

module.exports = {
  loadEnv,
  validateEnv
};
