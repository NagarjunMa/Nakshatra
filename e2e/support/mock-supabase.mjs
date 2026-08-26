import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 54329;
const portfolioId = "11111111-1111-4111-8111-111111111111";

const publicSnapshot = {
  data: {
    privacy_mode: "balanced",
    personal: {
      name: "Aditi Rao",
      preferred_name: "Aditi",
      age: 29,
      gender: "female",
      current_location: "Boston",
      short_bio: "Warm, grounded, and curious about the world.",
      profile_summary: "A thoughtful introduction",
      shared_life_plans: "A warm home, shared purpose, and room to grow together.",
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
  {
    id: "44444444-4444-4444-8444-444444444444",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/protected-original.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "approved_only",
    sort_order: 2,
    alt_text: "Protected portrait",
    metadata: {
      width: 900,
      height: 1200,
      aspectRatio: 0.75,
      orientation: "portrait",
      blurPath: `${portfolioId}/protected-blur.svg`,
    },
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/square-one.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 3,
    alt_text: "Public square moment",
    metadata: { width: 1000, height: 1000, aspectRatio: 1, orientation: "square" },
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/portrait-two.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 4,
    alt_text: "Public portrait moment",
    metadata: { width: 900, height: 1200, aspectRatio: 0.75, orientation: "portrait" },
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/landscape-two.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 5,
    alt_text: "Second public landscape",
    metadata: { width: 1600, height: 900, aspectRatio: 16 / 9, orientation: "landscape" },
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/square-two.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 6,
    alt_text: "Second public square moment",
    metadata: { width: 1000, height: 1000, aspectRatio: 1, orientation: "square" },
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    portfolio_id: portfolioId,
    storage_path: `${portfolioId}/portrait-three.svg`,
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 7,
    alt_text: "Third public portrait moment",
    metadata: { width: 900, height: 1200, aspectRatio: 0.75, orientation: "portrait" },
  },
];

const publicMediaWithPreviews = publicMedia.map((item) =>
  item.media_type === "gallery" && !item.metadata?.blurPath
    ? {
        ...item,
        metadata: {
          ...item.metadata,
          blurPath: item.storage_path.replace(/\.svg$/, "-blur.svg"),
        },
      }
    : item
);

function resolvedPortfolio(isPrivate) {
  let clearGallerySeen = false;
  const media = publicMediaWithPreviews.map((item) => {
    const protectedPhoto = item.visibility !== "public";
    const privateGallery = isPrivate && item.media_type === "gallery";
    const clearPrivateGallery = privateGallery && !protectedPhoto && !clearGallerySeen;
    if (clearPrivateGallery) clearGallerySeen = true;
    const blurred = protectedPhoto || (privateGallery && !clearPrivateGallery);
    return {
      key: `safe-${item.sort_order}`,
      accessPath: blurred ? item.metadata.blurPath : item.storage_path,
      altText: item.alt_text,
      mediaType: item.media_type,
      sortOrder: item.sort_order,
      width: item.metadata.width,
      height: item.metadata.height,
      aspectRatio: item.metadata.aspectRatio,
      orientation: item.metadata.orientation,
      presentation: blurred ? "blurred" : "clear",
    };
  });
  return {
    data: { ...publicSnapshot.data, privacy_mode: isPrivate ? "private" : "balanced" },
    templateId: 3,
    themeColor: "#f2c6a7",
    sunSign: "kanya",
    media,
  };
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(value));
}

function sendPortfolioImage(response, path) {
  const landscape = path.includes("landscape");
  const square = path.includes("square");
  const width = landscape ? 1600 : square ? 1000 : 900;
  const height = landscape ? 900 : square ? 1000 : 1200;
  const label = path.includes("protected") ? "PROTECTED PREVIEW" : landscape ? "PUBLIC GALLERY" : "PUBLIC PORTRAIT";
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
  if (request.method === "POST" && url.pathname === "/auth/v1/otp") {
    return sendJson(response, 200, {});
  }
  if (url.pathname === "/rest/v1/public_portfolio_snapshots" || url.pathname === "/rest/v1/portfolio_media") {
    return sendJson(response, 403, { message: "Direct public table access is disabled" });
  }
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/resolve_public_portfolio") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    return request.on("end", () => {
      const token = JSON.parse(body || "{}").p_share_token;
      if (token !== "e2e-portfolio-token" && token !== "e2e-private-token") return sendJson(response, 200, null);
      return sendJson(response, 200, resolvedPortfolio(token === "e2e-private-token"));
    });
  }
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/resolve_approved_portfolio") {
    return sendJson(response, 200, null);
  }
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/record_public_portfolio_view") {
    return sendJson(response, 200, true);
  }
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/consume_api_rate_limit") {
    return sendJson(response, 200, { allowed: true, retryAfter: 0 });
  }
  if (request.method === "POST" && url.pathname.startsWith("/storage/v1/object/sign/photos/")) {
    return sendJson(response, 200, {
      signedURL: `${url.pathname.replace("/storage/v1", "")}?token=e2e`,
    });
  }
  if (request.method === "GET" && url.pathname.startsWith("/storage/v1/object/sign/photos/")) {
    return sendPortfolioImage(response, url.pathname);
  }

  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, host);

function closeServer() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
