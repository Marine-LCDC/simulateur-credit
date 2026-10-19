// Only creates/updates the TWO named isolated preproduction Workers.
// No domains, database, Stripe, production Worker or production key is used.
import {execFileSync} from 'node:child_process';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const git=args=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(git(['status','--porcelain']),'','Commit all reviewed changes first');
assert.equal(git(['remote','get-url','origin']),'https://github.com/Marine-LCDC/simulateur-credit.git');
assert.equal(git(['branch','--show-current']),'codex/migration-titayla');
const sha=git(['rev-parse','HEAD']);
assert.equal(git(['ls-remote','origin','refs/heads/codex/migration-titayla']),sha+'\trefs/heads/codex/migration-titayla');
const configs=['wrangler.fixture.jsonc','wrangler.staging.jsonc'];
for(const [i,file]of configs.entries()){
 const c=JSON.parse(readFileSync(file,'utf8'));
 assert.equal(c.name,['simulateur-credit-recette-auth','simulateur-credit-staging'][i]);
 assert.equal(c.routes,undefined);assert.equal(c.workers_dev,true);
}
mkdirSync('test-results',{recursive:true});
const path='test-results/staging-credentials.json';let credentials;
if(existsSync(path))credentials=JSON.parse(readFileSync(path,'utf8'));
else{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 credentials={password:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey:await crypto.subtle.exportKey('jwk',pair.publicKey)};
 writeFileSync(path,JSON.stringify(credentials),{mode:0o600});
}
const cli=(args,input)=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',windowsHide:true,input,stdio:['pipe','pipe','pipe']});
for(const config of configs){
 console.log('Deploying isolated configuration:',config,'source:',sha);
 try{cli(['deploy','--config',config,'--message',sha]);}catch{throw Error('Isolated Worker deployment failed; no secrets printed. Inspect Cloudflare preproduction status.');}
}
for(const [config,name,value]of [
 ['wrangler.fixture.jsonc','FIXTURE_PASSWORD',credentials.password],
 ['wrangler.fixture.jsonc','FIXTURE_PRIVATE_JWK',JSON.stringify(credentials.privateKey)],
 ['wrangler.fixture.jsonc','FIXTURE_PUBLIC_JWK',JSON.stringify(credentials.publicKey)],
 ['wrangler.staging.jsonc','TITAYLA_PUBLIC_KEY',JSON.stringify(credentials.publicKey)],
]){
 try{cli(['secret','put',name,'--config',config],value);}catch{throw Error('Preproduction secret installation failed; no values printed: '+name);}
}
console.log('Preproduction ready. Isolated fixture keys and password stored ONLY in ignored test-results/staging-credentials.json and the named staging Workers.');
