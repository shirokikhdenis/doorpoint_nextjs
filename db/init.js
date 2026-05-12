require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { initSchema } = require("../src/lib/server/db/initSchema");

const run = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  await initSchema();
  console.log("DB schema initialized");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
