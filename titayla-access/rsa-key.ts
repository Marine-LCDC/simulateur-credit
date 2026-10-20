// Cache key preparation only, never assertions, identities or entitlement decisions.
// Two entries maximum per isolate; rotating a JWK immediately replaces its entry.
type Usage = 'sign' | 'verify';
type Importer = (jwk: JsonWebKey, usage: Usage) => Promise<CryptoKey>;
export function createRsaKeyCache(importer: Importer = (jwk, usage) =>
  crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, [usage])) {
  const entries: Partial<Record<Usage, {source:string; key:Promise<CryptoKey>}>> = {};
  return (jwk: JsonWebKey, usage: Usage) => {
    const source=JSON.stringify(jwk);
    if(entries[usage]?.source===source)return entries[usage]!.key;
    const entry={source,key:Promise.resolve().then(()=>importer(jwk,usage))};
    entries[usage]=entry;
    void entry.key.catch(()=>{if(entries[usage]===entry)delete entries[usage];});
    return entry.key;
  };
}
export const preparedRsaKey=createRsaKeyCache();
