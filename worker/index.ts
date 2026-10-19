import { accessConfig, type AccessEnv } from "../titayla-access/config.ts";
import { accessHeaders } from "../titayla-access/protocol.ts";
import { checkAppRequest, deniedAppResponse } from "../titayla-access/guard.ts";
import {
  appCallbackPage,
  startAppLogin,
  acceptAppLogin,
  endAppSession,
  readAppCookie,
  appSessionCookie,
} from "../titayla-access/callback.ts";
const publicAssets = new Set<string>();
function noStore(response: Response) {
  const result = new Response(response.body, response);
  for (const [key, value] of Object.entries(accessHeaders))
    result.headers.set(key, value);
  result.headers.set("CDN-Cache-Control", "no-store");
  result.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  result.headers.set("Vary", "Cookie");
  result.headers.set("X-Content-Type-Options", "nosniff");
  return result;
}
export async function handleRequest(
  request: Request,
  env: AccessEnv,
  fetcher?: typeof fetch,
) {
  const path = new URL(request.url).pathname;
  try {
    if (publicAssets.has(path) && ["GET", "HEAD"].includes(request.method)) {
      // Assets canonicalizes *.html to extensionless URLs. Resolve internally;
      // the public URL stays fixed and never redirects into a protected path.
      const assetUrl = new URL(request.url);
      if (path === "/offline.html") assetUrl.pathname = "/offline";
      return noStore(await env.ASSETS.fetch(new Request(assetUrl, request)));
    }
    const config = { ...accessConfig(env), ...(fetcher ? { fetcher } : {}) };
    if (path === '/auth/titayla/catalogue/' && request.method === 'GET') return noStore(Response.redirect(config.titaylaUrl + '/applications/',303));
    if (path === "/auth/titayla/start/" && request.method === "GET")
      return noStore(startAppLogin(config));
    if (path === "/auth/titayla/" && request.method === "GET")
      return noStore(appCallbackPage());
    if (path === "/auth/titayla/" && request.method === "POST")
      return noStore(await acceptAppLogin(request, config));
    if (path === "/auth/deconnexion/" && request.method === "POST") {
      if (request.headers.get("origin") !== new URL(request.url).origin)
        return noStore(new Response(null, { status: 403 }));
      return noStore(endAppSession());
    }
    const decision = await checkAppRequest({
      ...config,
      token: readAppCookie(request, appSessionCookie),
    });
    const api =
      path.startsWith("/api/") || !["GET", "HEAD"].includes(request.method);
    if (!decision.allowed)
      return noStore(
        deniedAppResponse(
          config.appId,
          config.titaylaUrl,
          decision.status,
          api,
        ),
      );
    if (path === "/api/titayla/session/" && request.method === "GET")
      return noStore(Response.json({ allowed: true }));
    // Nothing reaches assets without a fresh signature AND online entitlement check.
    // With html_handling:none map the app root explicitly; no asset redirect.
    const assetUrl = new URL(request.url);
    if (path === "/") assetUrl.pathname = "/index.html";
    return noStore(await env.ASSETS.fetch(new Request(assetUrl, request)));
  } catch {
    return noStore(
      new Response("Vérification temporairement indisponible.", {
        status: 503,
      }),
    );
  }
}
const worker = {
  fetch(request: Request, env: AccessEnv) {
    return handleRequest(request, env);
  },
};
export default worker;
