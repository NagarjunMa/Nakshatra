import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 54329;
const portfolioId = "11111111-1111-4111-8111-111111111111";

const publicSnapshot = {
  portfolio_id: portfolioId,
  share_token: "e2e-portfolio-token",
  template_id: 1,
  theme_color: "#f2c6a7",
  sun_sign: "kanya",
  data: {
    privacy_mode: "progressive",
    personal: {
      name: "Aditi Rao",
      preferred_name: "Aditi",
      dob: "1996-08-12",
      gender: "female",
      current_location: "Boston",
      profile_summary: "A thoughtful introduction",
    },
    vitals: { height: "5 ft 5 in", complexion: "Fair" },
    astrology: { rashi: "kanya", nakshatra: "Uttara Phalguni", pada: "2" },
    education: { degree: "MS", institution: "Northeastern", year: "2020" },
    career: { title: "Engineer", company: "Nakshatra", location: "Boston" },
    lifestyle: { hobbies: "Reading, Travel", diet: "Vegetarian" },
    preferences: { narrative: "A kind and curious partnership" },
    style: {
      appearance: "light",
      template_name: "Celestial Union",
      theme_color: "#f2c6a7",
      rashi_palette: "kanya-peach",
    },
    visibility: {
      family: "restricted",
      family_details: "restricted",
      astrology: "public",
      astrology_details: "restricted",
      contact: "restricted",
    },
  },
};

const publicMedia = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/portrait.svg`,
    thumbnail_path: null,
    media_type: "hero",
    visibility: "public",
    sort_order: 0,
    alt_text: "Public portrait",
    metadata: { width: 900, height: 1200, aspectRatio: 0.75, orientation: "portrait" },
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/landscape.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 1,
    alt_text: "Public landscape",
    metadata: { width: 1600, height: 900, aspectRatio: 16 / 9, orientation: "landscape" },
  },
];

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(value));
}

function sendPortfolioImage(response, landscape) {
  const width = landscape ? 1600 : 900;
  const height = landscape ? 900 : 1200;
  const label = landscape ? "PUBLIC GALLERY" : "PUBLIC HERO";
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "image/svg+xml",
  });
  response.end(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#3f3150"/><circle cx="50%" cy="42%" r="22%" fill="#f2c6a7"/><text x="50%" y="82%" fill="#fffdf8" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  );
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    });
    return response.end();
  }

  if (url.pathname === "/health") return sendJson(response, 200, { ok: true });
  if (url.pathname === "/auth/v1/user") return sendJson(response, 401, { message: "Unauthorized" });
  if (url.pathname === "/rest/v1/public_portfolio_snapshots") {
    return sendJson(response, 200, publicSnapshot);
  }
  if (url.pathname === "/rest/v1/portfolio_media") {
    return sendJson(response, 200, publicMedia);
  }
  if (url.pathname === "/rest/v1/rpc/record_view") {
    return sendJson(response, 200, null);
  }
  if (request.method === "POST" && url.pathname.startsWith("/storage/v1/object/sign/photos/")) {
    return sendJson(response, 200, {
      signedURL: `${url.pathname.replace("/storage/v1", "")}?token=e2e`,
    });
  }
  if (request.method === "GET" && url.pathname.startsWith("/storage/v1/object/sign/photos/")) {
    return sendPortfolioImage(response, url.pathname.endsWith("landscape.svg"));
  }

  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, host);

function closeServer() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
