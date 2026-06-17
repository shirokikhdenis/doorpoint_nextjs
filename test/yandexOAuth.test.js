const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isAllowedAdminEmail,
  sanitizeAdminNextPath,
  readYandexUserEmail,
  buildCallbackUrl,
} = require("../src/lib/server/auth/yandexOAuth");

test("isAllowedAdminEmail matches ADMIN_EMAIL case-insensitively", () => {
  const prev = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = "Admin@Example.com";
  assert.equal(isAllowedAdminEmail("admin@example.com"), true);
  assert.equal(isAllowedAdminEmail("other@example.com"), false);
  process.env.ADMIN_EMAIL = prev;
});

test("sanitizeAdminNextPath allows internal paths only", () => {
  assert.equal(sanitizeAdminNextPath("/admin/products"), "/admin/products");
  assert.equal(sanitizeAdminNextPath("//evil.com"), "/admin");
  assert.equal(sanitizeAdminNextPath("https://evil.com"), "/admin");
});

test("buildCallbackUrl maps 0.0.0.0 dev host to localhost", () => {
  const request = { url: "http://0.0.0.0:3000/api/admin/oauth/yandex" };
  assert.equal(
    buildCallbackUrl(request),
    "http://localhost:3000/api/admin/oauth/yandex/callback",
  );
});

test("readYandexUserEmail prefers default_email", () => {
  assert.equal(
    readYandexUserEmail({ default_email: "a@yandex.ru", emails: ["b@yandex.ru"] }),
    "a@yandex.ru",
  );
  assert.equal(readYandexUserEmail({ emails: ["b@yandex.ru"] }), "b@yandex.ru");
});
