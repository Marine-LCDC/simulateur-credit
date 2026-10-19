import { accessHeaders, accessPath, verifyAssertion } from './protocol.ts';
// Invoke before EVERY protected document, API and action. Never cache decisions.
export async function checkAppRequest(input: { token: string; appId: string; titaylaUrl: string; publicKey: JsonWebKey; fetcher?: typeof fetch }) {
  try {
    const origin = new URL(input.titaylaUrl);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return { allowed: false, status: 503 };
    const assertion = await verifyAssertion(input.token, input.appId, input.publicKey);
    if (!assertion) return { allowed: false, status: 401 };
    const response = await (input.fetcher || fetch)(new URL('/api/app-access/verify/', origin), {
      method: 'POST', headers: { Authorization: `Bearer ${input.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: input.appId }), cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(5000),
    });
    // Workers requires manual redirect handling. Never follow or accept redirects.
    if (response.redirected || response.status >= 300 && response.status < 400) return { allowed: false, status: 503 };
    if (!response.ok) return { allowed: false, status: [401,403].includes(response.status) ? response.status : 503 };
    const result = await response.json();
    if (result.allowed !== true || result.appId !== input.appId || result.userId !== assertion.sub) return { allowed: false, status: 403 };
    return { allowed: true, status: 200, userId: assertion.sub };
  } catch { return { allowed: false, status: 503 }; }
}
export function deniedAppResponse(appId: string, titaylaUrl: string, status: number, api = false) {
  if (api || status === 503) return Response.json({ error: status === 503 ? 'Vérification temporairement indisponible.' : 'Accès requis.' }, { status, headers: accessHeaders });
  return new Response(null, { status: 303, headers: { ...accessHeaders, Location: new URL(accessPath(appId), titaylaUrl).href } });
}
