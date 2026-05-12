const { loadEnv } = require("../env");
const { Pool } = require("pg");

let pool;

const getPool = () => {
  loadEnv();
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  return pool;
};

const query = async (text, params = []) => {
  const db = getPool();
  return db.query(text, params);
};

const withTransaction = async (handler) => {
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getPool,
  query,
  withTransaction
};
