import { accessHeaders, accessPath, verifyAssertion } from './protocol.ts';
// Invoke before EVERY protected document, API and action. Never cache decisions.
export async function checkAppRequest(input: { token: string; appId: string; titaylaUrl: string; publicKey: JsonWebKey; fetcher?: typeof fetch }) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const origin = new URL(input.titaylaUrl);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return { allowed: false, status: 503 };
    const assertion = await verifyAssertion(input.token, input.appId, input.publicKey);
    if (!assertion) return { allowed: false, status: 401 };
    const controller = new AbortController();
    // Settle independently of transport cooperation, including a stalled body.
    // A late result is discarded and can never create an application session.
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Access verification timeout')); }, 5000);
    });
    return await Promise.race([deadline, (async () => {
    const response = await (input.fetcher || fetch)(new URL('/api/app-access/verify/', origin), {
      method: 'POST', headers: { Authorization: `Bearer ${input.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: input.appId }), cache: 'no-store', redirect: 'manual', signal: controller.signal,
    });
    // Workers requires manual redirect handling. Never follow or accept redirects.
    if (response.redirected || response.status >= 300 && response.status < 400) return { allowed: false, status: 503 };
    if (!response.ok) return { allowed: false, status: [401,403].includes(response.status) ? response.status : 503 };
    const result = await response.json();
    if (controller.signal.aborted) return { allowed: false, status: 503 };
    if (result.allowed !== true || result.appId !== input.appId || result.userId !== assertion.sub) return { allowed: false, status: 403 };
    return { allowed: true, status: 200, userId: assertion.sub };
    })()]);
  } catch { return { allowed: false, status: 503 }; }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
export function deniedAppResponse(appId: string, titaylaUrl: string, status: number, api = false) {
  if (api) return Response.json({ error: status === 503 ? 'Vérification temporairement indisponible.' : 'Accès requis.' }, { status, headers: accessHeaders });
  if (status === 503) return new Response('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Vérification temporairement indisponible</title><main><h1>Vérification temporairement indisponible</h1><p>Votre accès n’a pas pu être vérifié. Réessayez dans quelques instants.</p><a href="/auth/titayla/start/">Réessayer auprès de Titayla</a></main></html>', {status, headers: {...accessHeaders, 'Content-Type':'text/html; charset=utf-8', 'Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'"}});
  return new Response(null, { status: 303, headers: { ...accessHeaders, Location: new URL(accessPath(appId), titaylaUrl).href } });
}
