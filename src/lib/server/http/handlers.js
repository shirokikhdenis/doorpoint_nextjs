const { NextResponse } = require("next/server");

const json = (data, status = 200, init = {}) => NextResponse.json(data, { status, ...init });

const empty = (status = 204) => new NextResponse(null, { status });

const getQuery = (request) => Object.fromEntries(new URL(request.url).searchParams.entries());

const readBody = async (request) => {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const withErrorHandling = async (action) => {
  try {
    return await action();
  } catch (error) {
    return json({ message: error?.message || "Internal error" }, 500);
  }
};

module.exports = {
  json,
  empty,
  getQuery,
  readBody,
  withErrorHandling
};
