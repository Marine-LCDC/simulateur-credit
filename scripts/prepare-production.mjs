// Read-only remote preflight. The only filesystem writes are local evidence.
// Never deploys, alters settings, changes a catalogue row, or reads customer rows.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {resolve4} from 'node:dns/promises';
import assert from 'node:assert/strict';
const account='690699e6b1b9ab890f6902d8946d0e52';
const config=readFileSync(join(homedir(),'AppData/Roaming/xdg.config/.wrangler/config/default.toml'),'utf8');
const token=config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];assert.ok(token,'Refresh local Wrangler authentication first');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function cf(path){
 const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'error'});
 const json=await r.json();assert.ok(r.ok&&json.success,'Cloudflare read failed; refresh auth or inspect permissions: '+path);return json.result;
}
const [settings,prompteur,deployments,domains,scripts]=await Promise.all([
 cf('/workers/scripts/titayla/settings'),cf('/workers/scripts/prompteur/settings'),cf('/workers/scripts/titayla/deployments'),cf('/workers/domains'),cf('/workers/scripts'),
]);
const binding=(s,name)=>s.bindings.find(b=>b.name===name);
const value=name=>binding(settings,name)?.text;
assert.equal(value('STRIPE_MODE'),'live');assert.equal(value('TITAYLA_ACCESS_MODE'),'live');assert.equal(value('CATALOG_SOURCE'),'supabase');
const registry=JSON.parse(value('TITAYLA_APP_ORIGINS'));assert.equal(registry.prompteur,'https://prompteur.titayla.com');
assert.ok(!registry['simulation-credit']||registry['simulation-credit']==='https://simulateur-credit.titayla.com');
const publicKey=JSON.parse(binding(prompteur,'TITAYLA_PUBLIC_KEY').text);
assert.equal(publicKey.kty,'RSA');assert.ok(publicKey.n&&publicKey.e&&!publicKey.d);assert.ok(Buffer.from(publicKey.n,'base64url').length>=256);
await crypto.subtle.importKey('jwk',publicKey,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
const protectedMetadata=Object.fromEntries(settings.bindings.map(b=>[b.name,{type:b.type,...(b.type==='plain_text'?{fingerprint:hash(b.text)}:{})}]));
const supabase=value('NEXT_PUBLIC_SUPABASE_URL'),apikey=value('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
async function catalogue(query){const r=await fetch(supabase+'/rest/v1/'+query,{method:'GET',headers:{apikey},redirect:'error'});assert.equal(r.status,200,'Public catalogue unavailable');return r.json();}
const [apps,composition,plans]=await Promise.all([
 catalogue('apps?select=id,slug,status,sales_status,access_model,app_url&id=in.(simulation-credit,prompteur)&order=id'),
 catalogue('pass_apps?select=pass_id,app_id&app_id=in.(simulation-credit,prompteur)&order=app_id,pass_id'),
 catalogue('pricing_plans?select=id,app_id,pass_id,active&order=id'),
]);
const active=[...deployments.deployments].sort((a,b)=>b.created_on.localeCompare(a.created_on))[0];
assert.equal(active.versions.length,1);assert.equal(active.versions[0].percentage,100);
const target=domains.find(d=>d.hostname==='simulateur-credit.titayla.com');
assert.ok(!target||target.service==='simulateur-credit','Target domain belongs to another application');
const worker=scripts.find(s=>s.id==='simulateur-credit');
let dns;try{dns={addresses:await resolve4('simulateur-credit.titayla.com')};}catch(e){
 const r=await fetch('https://cloudflare-dns.com/dns-query?name=simulateur-credit.titayla.com&type=A',{headers:{Accept:'application/dns-json'}});
 assert.ok(r.ok,'DNS over HTTPS unavailable');const d=await r.json();dns={localResolverStatus:e.code,httpsResolver:'Cloudflare DNS over HTTPS',status:d.Status,answers:d.Answer??[]};
}
const api=await fetch('https://titayla.com/api/droits/?app=simulation-credit',{redirect:'manual'});
const snapshot={capturedAt:new Date().toISOString(),productionMutation:false,account,
 titayla:{version:active.versions[0].version_id,deployment:active.id,annotation:active.annotations?.['workers/message'],bindings:protectedMetadata,
  preserve:{AUTH_PUBLIC_ENABLED:value('AUTH_PUBLIC_ENABLED'),SUBSCRIPTION_NOTIFICATIONS_CAPTURE:value('SUBSCRIPTION_NOTIFICATIONS_CAPTURE'),SUBSCRIPTION_NOTIFICATIONS_DELIVERY:value('SUBSCRIPTION_NOTIFICATIONS_DELIVERY'),STRIPE_MODE:value('STRIPE_MODE'),TITAYLA_ACCESS_MODE:value('TITAYLA_ACCESS_MODE'),CATALOG_SOURCE:value('CATALOG_SOURCE')},registry,plannedRegistry:{...registry,'simulation-credit':'https://simulateur-credit.titayla.com'}},
 publicKey:{source:'Existing deployed Prompteur public binding; no rotation',fingerprint:hash({kty:publicKey.kty,n:publicKey.n,e:publicKey.e}),privateKeyExported:false,positiveRealSessionTestPending:true},
 catalogue:{apps,composition,plans,fingerprint:hash({apps,composition,plans})},
 domain:{targetExists:!!target,targetService:target?.service??null,dns,allAssociations:domains.map(d=>({hostname:d.hostname,service:d.service,environment:d.environment})),existingWorker:worker?{id:worker.id,modified_on:worker.modified_on}:null},
 auth:{anonymousRightsStatus:api.status},
 exclusions:['No customer/subscription rows read','No payment or email','No Worker deployment','No production setting update','No legacy domain modification'],
};
const dir='test-results/production-preflight';mkdirSync(dir,{recursive:true});
writeFileSync(dir+'/snapshot.json',JSON.stringify(snapshot,null,2)+'\n');
writeFileSync(dir+'/titayla-public.jwk.json',JSON.stringify(publicKey,null,2)+'\n');
writeFileSync(dir+'/registry.before.json',JSON.stringify(registry,null,2)+'\n');
writeFileSync(dir+'/registry.after.json',JSON.stringify(snapshot.titayla.plannedRegistry,null,2)+'\n');
console.log(JSON.stringify({productionMutation:false,version:snapshot.titayla.version,annotation:snapshot.titayla.annotation,preserve:snapshot.titayla.preserve,publicKeyFingerprint:snapshot.publicKey.fingerprint,simulator:apps.find(a=>a.id==='simulation-credit'),targetDomainAlreadyAttached:!!target,existingProductionSimulatorWorker:!!worker,anonymousRightsStatus:api.status,evidence:dir+'/snapshot.json'},null,2));
