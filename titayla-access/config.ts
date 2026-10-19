import { validAppId } from "./protocol.ts";
export interface AccessEnv {
  APP_ID: string;
  TITAYLA_URL: string;
  TITAYLA_PUBLIC_KEY: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
export function accessConfig(env: AccessEnv) {
  if (!validAppId(env.APP_ID)) throw new Error("Invalid app configuration");
  const url = new URL(env.TITAYLA_URL);
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("Invalid portal origin");
  const publicKey = JSON.parse(env.TITAYLA_PUBLIC_KEY) as JsonWebKey;
  if (publicKey.kty !== "RSA" || publicKey.d)
    throw new Error("Public RSA key required");
  return { appId: env.APP_ID, titaylaUrl: url.origin, publicKey };
}
