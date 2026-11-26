// The site's only code: `/ingest/*` goes on to PostHog (web/README.md#Analytics); everything else is a built file,
// served before this runs (wrangler.jsonc)
const POSTHOG = "https://us.i.posthog.com";
const PREFIX = "/ingest";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${PREFIX}/`)) return new Response(null, { status: 404 });
    const headers = new Headers(request.headers);
    headers.delete("cookie");
    // PostHog's cookieless count hashes the player's address, not Cloudflare's
    headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") ?? "");
    return fetch(`${POSTHOG}${url.pathname.slice(PREFIX.length)}${url.search}`, {
      method: request.method,
      headers,
      body: request.body,
    });
  },
};
