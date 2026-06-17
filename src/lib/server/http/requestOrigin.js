const resolveRequestOrigin = (request) => {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const url = new URL(request.url);
  // `next dev -H 0.0.0.0` — bind address, not a browser hostname.
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  return url.origin;
};

const buildRequestUrl = (request, path) => new URL(path, `${resolveRequestOrigin(request)}/`);

module.exports = {
  resolveRequestOrigin,
  buildRequestUrl,
};
