import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=p=>createHash('sha256').update(readFileSync(p,'utf8').replace(/\r\n/g,'\n')).digest('hex');
test('all original calculator components, styles, engine, PDF and tests retain source content',()=>{
 const m=JSON.parse(readFileSync('docs/source-manifest.json','utf8'));
 for(const [file,sha] of Object.entries(m.files))assert.equal(hash(file),sha,file);
});
test('legacy HTML and original domain remain archived, outside published assets',()=>{
 assert.match(readFileSync('legacy/index.html','utf8'),/html2pdf/);
 assert.equal(readFileSync('legacy/CNAME','utf8').trim(),'simulateur.lesclesducredit.fr');
 for(const p of readdirSync('dist',{recursive:true}))assert.doesNotMatch(String(p),/legacy|CNAME|\.map$/);
});
test('staging cannot attach any production domain, production protects every asset',()=>{
 for(const file of ['wrangler.staging.jsonc','wrangler.production.jsonc']){
  const c=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(c.assets.run_worker_first,true);
  assert.equal(c.vars.APP_ID,'simulation-credit');
  assert.equal(c.preview_urls,false);
  assert.doesNotMatch(JSON.stringify(c),/les-cles-du-credit|simulationcredit\.titayla/);
 }
 const s=JSON.parse(readFileSync('wrangler.staging.jsonc','utf8'));
 assert.equal(s.name,'simulateur-credit-staging');assert.equal(s.routes,undefined);
});
