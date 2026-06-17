const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveRequestOrigin, buildRequestUrl } = require("../src/lib/server/http/requestOrigin");

test("resolveRequestOrigin maps 0.0.0.0 to localhost", () => {
  const request = { url: "http://0.0.0.0:3000/admin/login" };
  assert.equal(resolveRequestOrigin(request), "http://localhost:3000");
});

test("resolveRequestOrigin prefers NEXT_PUBLIC_SITE_URL", (t) => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;
  t.after(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  const request = { url: "http://0.0.0.0:3000/admin" };
  assert.equal(resolveRequestOrigin(request), "http://localhost:3000");
});

test("buildRequestUrl keeps path on normalized origin", (t) => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;
  t.after(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.SITE_URL;
  const request = { url: "http://0.0.0.0:3000/api/admin/oauth/yandex/callback" };
  assert.equal(buildRequestUrl(request, "/admin").href, "http://localhost:3000/admin");
});
