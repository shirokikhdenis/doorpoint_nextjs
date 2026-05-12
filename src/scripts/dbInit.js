const { validateEnv } = require("../lib/server/env");
const { initSchema } = require("../lib/server/db/initSchema");
const { getPool } = require("../lib/server/db/postgres");

const main = async () => {
  validateEnv();
  await initSchema();
  await getPool().end();
  console.log("Database schema initialized.");
};

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
