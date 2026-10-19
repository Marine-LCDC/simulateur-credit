// Local preparation only: no deployment, domain mutation or secret installation.
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const git=args=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(git(['status','--porcelain']),'','Commit and push preparation sources first');
assert.equal(git(['remote','get-url','origin']),'https://github.com/Marine-LCDC/simulateur-credit.git');
assert.equal(git(['branch','--show-current']),'codex/migration-titayla');
const commit=git(['rev-parse','HEAD']);assert.equal(git(['ls-remote','origin','refs/heads/codex/migration-titayla']),commit+'\trefs/heads/codex/migration-titayla');
const dir='test-results/production-preflight';
const snapshot=JSON.parse(readFileSync(dir+'/snapshot.json','utf8'));
assert.equal(snapshot.productionMutation,false);assert.equal(snapshot.domain.existingWorker,null,'Worker exists: reaudit before preparing first publication');
assert.equal(snapshot.domain.targetExists,false,'Domain is already attached: reaudit');
const key=JSON.parse(readFileSync(dir+'/titayla-public.jwk.json','utf8'));
assert.equal(key.kty,'RSA');assert.ok(!key.d&&key.n&&key.e);
const fingerprint=createHash('sha256').update(JSON.stringify({kty:key.kty,n:key.n,e:key.e})).digest('hex');
assert.equal(fingerprint,snapshot.publicKey.fingerprint);
const config=JSON.parse(readFileSync('wrangler.production.jsonc','utf8'));
assert.equal(config.name,'simulateur-credit');assert.equal(config.vars.APP_ID,'simulation-credit');assert.equal(config.vars.TITAYLA_URL,'https://titayla.com');
assert.deepEqual(config.routes,[{pattern:'simulateur-credit.titayla.com',custom_domain:true}]);
assert.equal(config.assets.run_worker_first,true);assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
config.main=resolve(config.main);config.assets.directory=resolve(config.assets.directory);
config.vars.TITAYLA_PUBLIC_KEY=JSON.stringify(key);delete config.$schema;
mkdirSync(dir,{recursive:true});
const bootstrap=structuredClone(config);delete bootstrap.routes;
for(const [name,c]of [['wrangler.bootstrap.json',bootstrap],['wrangler.attach-domain.json',config]]){
 const path=dir+'/'+name;writeFileSync(path,JSON.stringify(c,null,2)+'\n');
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--dry-run','--config',path,'--outdir',dir+'/dry-run-'+name],{windowsHide:true,stdio:'pipe'});
}
const digest=createHash('sha256');
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){assert.ok(!e.isSymbolicLink());const file=dir+'/'+e.name;if(e.isDirectory())walk(file);else{digest.update(file);digest.update(readFileSync(file));}}}
walk('dist');
const manifest={commit,productionMutation:false,publicKeyFingerprint:fingerprint,assetDigest:digest.digest('hex'),bootstrapConfig:dir+'/wrangler.bootstrap.json',domainConfig:dir+'/wrangler.attach-domain.json',titaylaBaseline:snapshot.titayla.version,firstWorkerDeploymentOnly:true,requiredApproval:['New production Worker','New domain attachment','Titayla merged registry and code','Single app_url catalogue update'],positiveRealSessionTestPending:true};
writeFileSync(dir+'/simulator-release.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
