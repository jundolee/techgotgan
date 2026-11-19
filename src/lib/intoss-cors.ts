const DEVELOPMENT_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

function getAllowedOrigins(): Set<string> {
  const appName = process.env.APP_IN_TOSS_APP_NAME?.trim().toLowerCase() || "techgotgan";
  const configuredOrigins = (process.env.APP_IN_TOSS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    ...DEVELOPMENT_ORIGINS,
    `https://${appName}.apps.tossmini.com`,
    `https://${appName}.private-apps.tossmini.com`,
    ...configuredOrigins,
  ]);
}

export function withIntossCors(request: Request, response: Response): Response {
  const origin = request.headers.get("origin");
  const headers = new Headers(response.headers);
  headers.append("Vary", "Origin");

  if (origin && getAllowedOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function intossOptions(request: Request): Response {
  return withIntossCors(request, new Response(null, { status: 204 }));
}
