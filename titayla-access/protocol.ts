// Portable Web Crypto; signing key belongs exclusively to Titayla.
import { preparedRsaKey } from './rsa-key.ts';
export const accessHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
export const validAppId = (id: string) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);
export const accessPath = (id: string) => `/acces/${encodeURIComponent(id)}/`;
function encode(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
const encoder = new TextEncoder();
export interface Assertion { iss: 'titayla'; sub: string; aud: string; iat: number; exp: number; jti: string; nonce: string; version: string }
export const validNonce = (value: string) => /^[a-f0-9]{64}$/.test(value);
export async function signAssertion(sub: string, appId: string, jwk: JsonWebKey, nonce: string, now = Date.now(), version = 'initial') {
  if (!validAppId(appId) || !sub || jwk.kty !== 'RSA' || !validNonce(nonce)) throw new Error('Invalid configuration');
  const key = await preparedRsaKey(jwk, 'sign');
  const iat = Math.floor(now / 1000);
  const payload: Assertion = { iss: 'titayla', sub, aud: appId, iat, exp: iat + 300, jti: crypto.randomUUID(), nonce, version };
  const body = `${encode(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))}.${encode(encoder.encode(JSON.stringify(payload)))}`;
  return `${body}.${encode(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(body))))}`;
}
export async function verifyAssertion(token: string, appId: string, jwk: JsonWebKey, now = Date.now()): Promise<Assertion | null> {
  try {
    if (!validAppId(appId) || token.length > 4096 || jwk.kty !== 'RSA' || jwk.d) return null;
    const parts = token.split('.'); if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (header.alg !== 'RS256' || header.typ !== 'JWT') return null;
    const key = await preparedRsaKey(jwk, 'verify');
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))) return null;
    const p = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const seconds = Math.floor(now / 1000);
    if (p.iss !== 'titayla' || p.aud !== appId || typeof p.sub !== 'string' || !p.sub || typeof p.jti !== 'string' || !p.jti || typeof p.version !== 'string' || !p.version || typeof p.nonce !== 'string' || !validNonce(p.nonce) ||
      !Number.isInteger(p.iat) || !Number.isInteger(p.exp) || p.iat > seconds || p.exp <= seconds || p.exp <= p.iat || p.exp - p.iat > 300) return null;
    return p;
  } catch { return null; }
}
