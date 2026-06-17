import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { setAdminSessionCookie } = require("@/lib/server/auth/adminSessionCookie");
const { buildRequestUrl } = require("@/lib/server/http/requestOrigin");
const {
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  isYandexOAuthConfigured,
  isAllowedAdminEmail,
  buildCallbackUrl,
  exchangeAuthorizationCode,
  fetchYandexUserInfo,
  readYandexUserEmail,
  sanitizeAdminNextPath,
} = require("@/lib/server/auth/yandexOAuth");

const ADMIN_LOGIN_PATH = "/admin/login";

const loginRedirect = (request, errorCode) => {
  const url = buildRequestUrl(request, ADMIN_LOGIN_PATH);
  if (errorCode) url.searchParams.set("error", errorCode);
  return NextResponse.redirect(url);
};

const clearOAuthCookies = (response) => {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/" };
  response.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", ...options, maxAge: 0 });
  response.cookies.set({ name: OAUTH_NEXT_COOKIE, value: "", ...options, maxAge: 0 });
  return response;
};

export async function GET(request) {
  if (!isYandexOAuthConfigured()) {
    return loginRedirect(request, "oauth_not_configured");
  }

  const { searchParams } = request.nextUrl;
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return clearOAuthCookies(loginRedirect(request, "oauth_denied"));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const nextPath = sanitizeAdminNextPath(request.cookies.get(OAUTH_NEXT_COOKIE)?.value);

  if (!code || !state || !savedState || state !== savedState) {
    return clearOAuthCookies(loginRedirect(request, "oauth_state"));
  }

  try {
    const accessToken = await exchangeAuthorizationCode(code, buildCallbackUrl(request));
    const userInfo = await fetchYandexUserInfo(accessToken);
    const email = readYandexUserEmail(userInfo);

    if (!email || !isAllowedAdminEmail(email)) {
      return clearOAuthCookies(loginRedirect(request, "access_denied"));
    }

    const response = NextResponse.redirect(buildRequestUrl(request, nextPath));
    setAdminSessionCookie(response);
    return clearOAuthCookies(response);
  } catch {
    return clearOAuthCookies(loginRedirect(request, "oauth_failed"));
  }
}
