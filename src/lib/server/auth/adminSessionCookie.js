const {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getSessionTtlSeconds,
} = require("./adminAuth");

const isSecureCookie = () => process.env.NODE_ENV === "production";

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: isSecureCookie(),
  sameSite: "lax",
  path: "/",
});

const setAdminSessionCookie = (response) => {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(),
    ...baseCookieOptions(),
    maxAge: getSessionTtlSeconds(),
  });
  return response;
};

const clearAdminSessionCookie = (response) => {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    ...baseCookieOptions(),
    maxAge: 0,
  });
  return response;
};

module.exports = {
  setAdminSessionCookie,
  clearAdminSessionCookie,
};
