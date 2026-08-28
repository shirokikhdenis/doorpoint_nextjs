import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");
const { buildRequestUrl } = require("@/lib/server/http/requestOrigin");

const ADMIN_LOGIN_PATH = "/admin/login";

const isAdminUiPath = (pathname) => pathname === "/admin" || pathname.startsWith("/admin/");

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (!isAdminUiPath(pathname)) return NextResponse.next();

  if (pathname === ADMIN_LOGIN_PATH) {
    if (requestHasAdminSession(request)) {
      return NextResponse.redirect(buildRequestUrl(request, "/admin"));
    }
    return NextResponse.next();
  }

  if (requestHasAdminSession(request)) {
    return NextResponse.next();
  }

  const loginUrl = buildRequestUrl(request, ADMIN_LOGIN_PATH);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
