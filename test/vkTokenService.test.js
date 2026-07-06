const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canAutoRefresh,
  applyRefreshedToken,
  getActiveVkAccessToken,
  resetVkTokenSession,
} = require("../src/lib/server/vk/vkTokenService");

test("canAutoRefresh requires refresh token, client id, secret and device id", () => {
  assert.equal(
    canAutoRefresh({ refreshToken: "r", clientId: "1", clientSecret: "s", deviceId: "d" }),
    true,
  );
  assert.equal(
    canAutoRefresh({ refreshToken: "r", clientId: "1", clientSecret: "s", deviceId: "" }),
    false,
  );
  assert.equal(canAutoRefresh({ refreshToken: "", clientId: "1", clientSecret: "s" }), false);
  assert.equal(canAutoRefresh({ refreshToken: "r", clientId: "", clientSecret: "s" }), false);
});

test("applyRefreshedToken stores access token in session", () => {
  resetVkTokenSession();
  applyRefreshedToken({
    accessToken: "vk2.a.test",
    refreshToken: "vk2.r.test",
    expiresInSec: 3600,
  });
  assert.equal(getActiveVkAccessToken(), "vk2.a.test");
  resetVkTokenSession();
});

test("decodePermissions extracts market and photos scopes", () => {
  const { decodePermissions } = require("../src/lib/server/vk/vkTokenDiagnostics");
  const mask = (1 << 27) + (1 << 2) + (1 << 18);
  assert.deepEqual(decodePermissions(mask).sort(), ["groups", "market", "photos"]);
});
