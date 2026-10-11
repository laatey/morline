import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const proxyKey = process.env["PROXY_KEY"];
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!proxyKey || !apiKey)
    return Response.json({ error: "Proxy not configured" }, { status: 500 });

  const auth = request.headers.get("authorization") ?? "";
  const provided =
    auth.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-proxy-key") ||
    request.headers.get("x-api-key") ||
    "";
  if (!safeEqual(provided, proxyKey))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  let path = (params._splat ?? "").replace(/^\/+/, "");
  if (!path.startsWith("v1/") && path !== "v1") path = `v1/${path}`;
  if (path === "v1/chat") path = "v1/chat/completions";
  const target = `${GATEWAY}/${path}${url.search}`;
  const headers = new Headers();
  for (const [k, v] of request.headers) {
    const key = k.toLowerCase();
    if (
      ["content-type", "accept", "anthropic-version", "anthropic-beta"].includes(key) ||
      key.startsWith("x-lovable-aig-")
    )
      headers.set(k, v);
  }
  headers.set("Authorization", `Bearer ${apiKey}`);

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
  });
  const out = new Headers();
  for (const [k, v] of upstream.headers) {
    const key = k.toLowerCase();
    if (key === "content-type" || key === "retry-after" || key.startsWith("x-lovable-aig-"))
      out.set(k, v);
  }
  out.set("Cache-Control", "no-cache, no-transform");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const Route = createFileRoute("/api/public/ai/$")({
  server: { handlers: { GET: proxy, POST: proxy } },
});
