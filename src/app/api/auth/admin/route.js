import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export async function GET(request) {
  return NextResponse.json({ isAdmin: requestHasAdminSession(request) });
}
