import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_SESSION_API_PATH = "/api/admin/session";

const isAdminUiPath = (pathname) => pathname === "/admin" || pathname.startsWith("/admin/");
const isAdminApiPath = (pathname) =>
  pathname === "/api/admin" || pathname.startsWith("/api/admin/");

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const adminUi = isAdminUiPath(pathname);
  const adminApi = isAdminApiPath(pathname);
  if (!adminUi && !adminApi) return NextResponse.next();

  if (pathname === ADMIN_SESSION_API_PATH) {
    return NextResponse.next();
  }

  if (pathname === ADMIN_LOGIN_PATH) {
    if (requestHasAdminSession(request)) {
      return NextResponse.redirect(new URL("/admin", request.url));
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

  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
  if (pathname !== ADMIN_LOGIN_PATH) {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
