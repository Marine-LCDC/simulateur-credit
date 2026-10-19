import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {signAssertion} from '../titayla-access/protocol.ts';
const credentials=JSON.parse(readFileSync('test-results/staging-credentials.json','utf8'));
const portal=JSON.parse(readFileSync('wrangler.staging.jsonc','utf8')).vars.TITAYLA_URL;
const app=JSON.parse(readFileSync('wrangler.fixture.jsonc','utf8')).vars.SIMULATOR_ORIGIN;
assert.match(app,/^https:\/\/simulateur-credit-staging\.[a-z0-9-]+\.workers\.dev$/);
assert.match(portal,/^https:\/\/simulateur-credit-recette-auth\.[a-z0-9-]+\.workers\.dev$/);
assert.equal((await fetch(portal,{redirect:'manual'})).status,401);
for(const path of ['/','/index.html','/legacy/index.html','/CNAME',...readdirSync('dist/assets').map(p=>'/assets/'+p)]){
 const response=await fetch(app+path,{redirect:'manual'});assert.equal(response.status,303,path);assert.match(response.headers.get('cache-control'),/no-store/);
}
mkdirSync('test-results/staging',{recursive:true});
const browser=await chromium.launch();
try{
 for(const kind of ['individual','pass']){
  const context=await browser.newContext({acceptDownloads:true,reducedMotion:'reduce',httpCredentials:{origin:portal,username:'recette',password:credentials.password},viewport:{width:1280,height:900}});
  const start=await context.request.get(app+'/auth/titayla/start/',{maxRedirects:0});assert.equal(start.status(),303);
  const location=new URL(start.headers().location);location.searchParams.set('profil',kind);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(location.href);
  await expect(page.getByRole('heading',{name:'Simulateur de crédit',exact:true})).toBeVisible();
  assert.equal(new URL(page.url()).hash,'');
  const cookie=(await context.cookies(app)).find(c=>c.name==='__Host-titayla-access');assert.ok(cookie.secure&&cookie.httpOnly&&cookie.sameSite==='Lax');
  await page.getByLabel('Montant emprunté',{exact:true}).fill('250000');await page.getByRole('button',{name:'Calculer : Mensualité hors assurance',exact:true}).click();
  await expect(page.getByLabel('Mensualité hors assurance',{exact:true})).toHaveValue('1 449,90');
  await page.getByRole('button',{name:'Voir le tableau d’amortissement',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(240);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger en PDF',exact:true}).click();const pdf=await pending;await pdf.saveAs('test-results/staging/'+kind+'.pdf');
  assert.match(readFileSync('test-results/staging/'+kind+'.pdf').subarray(0,8).toString(),/%PDF-/);
  if(kind==='individual'){await page.screenshot({path:'test-results/staging/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/staging/mobile.png',fullPage:true});}
  assert.deepEqual(errors,[]);await context.close();
 }
 for(const kind of ['none','expired']){
  const token=await signAssertion('preproduction-'+kind,'simulation-credit',credentials.privateKey,'a'.repeat(64));
  const r=await fetch(app+'/api/titayla/session/',{headers:{cookie:'__Host-titayla-access='+token},redirect:'manual'});assert.equal(r.status,403);
 }
 for(const token of ['invalid',await signAssertion('preproduction-individual','other-app',credentials.privateKey,'a'.repeat(64)),await signAssertion('preproduction-individual','simulation-credit',credentials.privateKey,'a'.repeat(64),Date.now()-360000)]){
  assert.equal((await fetch(app+'/api/titayla/session/',{headers:{cookie:'__Host-titayla-access='+token},redirect:'manual'})).status,401);
 }
 const result={time:new Date().toISOString(),app,portal,syntheticDataOnly:true,checks:['private fixture requires authentication','all built assets denied without app session','individual SSO via HTTPS','Pass SSO via HTTPS','secure HttpOnly cookie','same-browser nonce','browser inverse calculation','240 amortization rows','PDF downloads for individual and Pass','no entitlement denied','expired entitlement denied','invalid, expired and other-app assertions denied'],productionChanges:0};
 writeFileSync('test-results/staging/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
