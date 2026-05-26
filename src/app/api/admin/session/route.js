import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getSessionTtlSeconds,
  verifyAdminCredentials,
  requestHasAdminSession,
} = require("@/lib/server/auth/adminAuth");

const secureCookie = process.env.NODE_ENV === "production";

const withSessionCookie = (response, value, maxAge) => {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
};

export async function GET(request) {
  if (!requestHasAdminSession(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const login = String(body?.login || "");
  const password = String(body?.password || "");
  if (!verifyAdminCredentials(login, password)) {
    return NextResponse.json({ message: "Неверный логин или пароль" }, { status: 401 });
  }

  const ttlSeconds = getSessionTtlSeconds();
  const response = NextResponse.json({ ok: true });
  return withSessionCookie(response, createAdminSessionToken(), ttlSeconds);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return withSessionCookie(response, "", 0);
}
