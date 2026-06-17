import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  isYandexOAuthConfigured,
  buildCallbackUrl,
  buildAuthorizeUrl,
  createOAuthState,
  sanitizeAdminNextPath,
} = require("@/lib/server/auth/yandexOAuth");

const secureCookie = process.env.NODE_ENV === "production";

const oauthCookieOptions = {
  httpOnly: true,
  secure: secureCookie,
  sameSite: "lax",
  path: "/",
  maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
};

export async function GET(request) {
  if (!isYandexOAuthConfigured()) {
    return NextResponse.json({ message: "Yandex OAuth is not configured" }, { status: 503 });
  }

  const state = createOAuthState();
  const redirectUri = buildCallbackUrl(request);
  const nextPath = sanitizeAdminNextPath(request.nextUrl.searchParams.get("next"));
  const authorizeUrl = buildAuthorizeUrl({ redirectUri, state });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({ name: OAUTH_STATE_COOKIE, value: state, ...oauthCookieOptions });
  response.cookies.set({ name: OAUTH_NEXT_COOKIE, value: nextPath, ...oauthCookieOptions });
  return response;
}
