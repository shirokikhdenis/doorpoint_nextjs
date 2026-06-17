import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  setAdminSessionCookie,
  clearAdminSessionCookie,
} = require("@/lib/server/auth/adminSessionCookie");
const {
  verifyAdminCredentials,
  requestHasAdminSession,
} = require("@/lib/server/auth/adminAuth");
const { isYandexOAuthConfigured } = require("@/lib/server/auth/yandexOAuth");

export async function GET(request) {
  if (!requestHasAdminSession(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request) {
  if (isYandexOAuthConfigured()) {
    return NextResponse.json(
      { message: "Вход через пароль отключён. Используйте Яндекс ID." },
      { status: 403 },
    );
  }

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

  const response = NextResponse.json({ ok: true });
  return setAdminSessionCookie(response);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAdminSessionCookie(response);
}
