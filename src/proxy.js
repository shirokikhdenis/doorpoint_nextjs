import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");
const { buildRequestUrl } = require("@/lib/server/http/requestOrigin");

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_SESSION_API_PATH = "/api/admin/session";
const ADMIN_OAUTH_YANDEX_PATH = "/api/admin/oauth/yandex";
const ADMIN_OAUTH_YANDEX_CALLBACK_PATH = "/api/admin/oauth/yandex/callback";

const isPublicAdminApiPath = (pathname) =>
  pathname === ADMIN_SESSION_API_PATH ||
  pathname === ADMIN_OAUTH_YANDEX_PATH ||
  pathname === ADMIN_OAUTH_YANDEX_CALLBACK_PATH;

const isAdminUiPath = (pathname) => pathname === "/admin" || pathname.startsWith("/admin/");
const isAdminApiPath = (pathname) =>
  pathname === "/api/admin" || pathname.startsWith("/api/admin/");

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const adminUi = isAdminUiPath(pathname);
  const adminApi = isAdminApiPath(pathname);
  if (!adminUi && !adminApi) return NextResponse.next();

  if (isPublicAdminApiPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === ADMIN_LOGIN_PATH) {
    if (requestHasAdminSession(request)) {
      return NextResponse.redirect(buildRequestUrl(request, "/admin"));
    }
    return NextResponse.next();
  }

  const hasSession = requestHasAdminSession(request);
  if (hasSession) {
    return NextResponse.next();
  }

  if (adminApi) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = buildRequestUrl(request, ADMIN_LOGIN_PATH);
  if (pathname !== ADMIN_LOGIN_PATH) {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
