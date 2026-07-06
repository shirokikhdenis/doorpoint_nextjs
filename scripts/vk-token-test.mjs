const fs = require("fs");
const path = "/var/www/doorpoint/doorpoint_nextjs/.env";
for (const line of fs.readFileSync(path, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const run = async () => {
  const refreshBody = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.VK_CLIENT_ID,
    client_secret: process.env.VK_CLIENT_SECRET,
    refresh_token: process.env.VK_REFRESH_TOKEN,
  });
  const refreshRes = await fetch("https://id.vk.ru/oauth2/auth", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: refreshBody,
  });
  const refreshJson = await refreshRes.json();
  console.log(
    "refresh",
    JSON.stringify({
      error: refreshJson.error,
      desc: refreshJson.error_description,
      prefix: String(refreshJson.access_token || "").slice(0, 12),
    }),
  );
  const token = refreshJson.access_token;
  if (!token) process.exit(1);

  const perms = await fetch(
    `https://api.vk.ru/method/account.getAppPermissions?access_token=${encodeURIComponent(token)}&v=5.199`,
  ).then((r) => r.json());
  console.log("perms", JSON.stringify(perms));

  const upload = await fetch("https://api.vk.ru/method/photos.getMarketUploadServer", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: token,
      group_id: process.env.VK_GROUP_ID,
      main_photo: "1",
      v: "5.199",
    }),
  }).then((r) => r.json());
  console.log("upload", JSON.stringify(upload));
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
