import { accessHeaders, accessPath, verifyAssertion, validNonce } from './protocol.ts';
import { checkAppRequest } from './guard.ts';
type Config = { appId: string; titaylaUrl: string; publicKey: JsonWebKey; fetcher?: typeof fetch };
export const appSessionCookie = '__Host-titayla-access';
export const appStateCookie = '__Host-titayla-state';
const cookie = (name: string, value: string, seconds: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
export function readAppCookie(request: Request, name: string) {
  const values = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).filter(v => v.startsWith(`${name}=`));
  return values.length === 1 ? values[0].slice(name.length + 1) : '';
}
export function startAppLogin(config: Config) {
  const origin = new URL(config.titaylaUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid origin');
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
  const destination = new URL(accessPath(config.appId),origin); destination.searchParams.set('state',state);
  return new Response(null,{status:303,headers:{...accessHeaders,Location:destination.href,'Set-Cookie':cookie(appStateCookie,state,300)}});
}
// Serve only on GET /auth/titayla/. No secret/token is interpolated into HTML.
export function appCallbackPage() {
  const nonce = crypto.randomUUID();
  const script = `const token=new URLSearchParams(location.hash.slice(1)).get('assertion');history.replaceState(null,'',location.pathname);fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error();location.replace('/');}).catch(()=>{document.getElementById('status').textContent='Accès impossible. Revenez sur Titayla pour réessayer.';});`;
  return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Connexion Titayla</title><p id="status">Vérification de votre accès…</p><script nonce="${nonce}">${script}</script></html>`,{headers:{...accessHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`}});
}
// Serve on POST /auth/titayla/. Consumes the same-browser nonce even on failure.
export async function acceptAppLogin(request: Request, config: Config) {
  const headers = new Headers(accessHeaders); headers.append('Set-Cookie',cookie(appStateCookie,'',0));
  const fail = (status: number) => Response.json({error:'Accès impossible.'},{status,headers});
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) return fail(403);
    if (Number(request.headers.get('content-length')) > 8192) return fail(400);
    const {token} = await request.json();
    if (typeof token !== 'string') return fail(400);
    const state = readAppCookie(request,appStateCookie);
    const assertion = await verifyAssertion(token,config.appId,config.publicKey);
    if (!validNonce(state) || !assertion || assertion.nonce !== state) return fail(401);
    const decision = await checkAppRequest({...config,token});
    if (!decision.allowed) return fail(decision.status);
    headers.append('Set-Cookie',cookie(appSessionCookie,token,Math.max(0,assertion.exp-Math.floor(Date.now()/1000))));
    return Response.json({allowed:true},{headers});
  } catch {return fail(503);}
}
export function endAppSession() {
  return new Response(null,{status:303,headers:{...accessHeaders,Location:'/', 'Set-Cookie':cookie(appSessionCookie,'',0)}});
}
