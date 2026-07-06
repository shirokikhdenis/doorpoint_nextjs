const fs = require("fs");

const envPath = "/var/www/doorpoint/doorpoint_nextjs/.env";
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const code = process.argv[2];
const deviceId = process.argv[3];
const verifier = process.argv[4];
const secret = process.argv[5] || process.env.VK_CLIENT_SECRET;

if (!code || !deviceId || !verifier) {
  console.error("Usage: node vk-oauth-exchange.mjs <code> <device_id> <code_verifier> [client_secret]");
  process.exit(2);
}

const run = async () => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.VK_CLIENT_ID || "54664168",
    client_secret: secret,
    code,
    device_id: deviceId,
    code_verifier: verifier,
    redirect_uri: "https://oauth.vk.com/blank.html",
  });

  for (const endpoint of ["https://id.vk.ru/oauth2/auth", "https://id.vk.com/oauth2/auth"]) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await res.json();
    console.log(endpoint, JSON.stringify(json));
    if (json.access_token) {
      const updates = {
        VK_ACCESS_TOKEN: json.access_token,
        VK_REFRESH_TOKEN: json.refresh_token || process.env.VK_REFRESH_TOKEN,
        VK_CLIENT_SECRET: secret,
        VK_CLIENT_ID: process.env.VK_CLIENT_ID || "54664168",
        VK_DEVICE_ID: deviceId,
      };
      let env = fs.readFileSync(envPath, "utf8");
      for (const [key, value] of Object.entries(updates)) {
        const re = new RegExp(`^${key}=.*$`, "m");
        if (re.test(env)) env = env.replace(re, `${key}=${value}`);
        else env += `\n${key}=${value}`;
      }
      if (!/^VK_API_BASE=/m.test(env)) env += "\nVK_API_BASE=https://api.vk.ru/method";
      fs.writeFileSync(envPath, env.trim() + "\n");
      console.log("ENV_UPDATED=1");

      const perms = await fetch(
        `https://api.vk.ru/method/account.getAppPermissions?access_token=${encodeURIComponent(json.access_token)}&v=5.199`,
      ).then((r) => r.json());
      console.log("perms", JSON.stringify(perms));

      const upload = await fetch("https://api.vk.ru/method/photos.getMarketUploadServer", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: json.access_token,
          group_id: process.env.VK_GROUP_ID,
          main_photo: "1",
          v: "5.199",
        }),
      }).then((r) => r.json());
      console.log("upload", JSON.stringify(upload));
      return;
    }
  }
  process.exit(1);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
