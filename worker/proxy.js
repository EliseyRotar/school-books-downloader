// Folio proxy — deploy as a free Cloudflare Worker to unlock CORS-blocked
// platforms in the in-browser Reader. Stateless: it simply relays the request
// from your browser and relaxes CORS. It never stores credentials.
//
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // The reader sends requests as <proxy>/https://<target>/<path>
    let target = decodeURIComponent(url.pathname.slice(1));
    if (target.startsWith("http://") || target.startsWith("https://")) {
      const req = new Request(target, {
        method: request.method,
        headers: prune(request.headers),
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "follow"
      });
      const upstream = await fetch(req);
      const headers = new Headers(upstream.headers);
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Vary", "Origin");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // Navigate / and /-preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    return new Response("Folio proxy. Use +https://host/path as the URL.", { status: 200 });
  }
};

function prune(headers) {
  const h = new Headers(headers);
  ["host", "origin", "referer", "sec-fetch-*"].forEach((k) => h.delete(k));
  return h;
}