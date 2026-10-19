import assert from 'node:assert/strict';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {chromium,expect} from '@playwright/test';
import {signAssertion} from '../titayla-access/protocol.ts';
const origin='http://localhost:8788';
let allowed=true,upstream=200;
const fixture=createServer(async(req,res)=>{
 let body='';for await(const c of req)body+=c;
 const {appId}=JSON.parse(body);
 res.writeHead(upstream!==200?upstream:allowed?200:403,{'Content-Type':'application/json'});
 res.end(JSON.stringify({allowed,appId,userId:'fixture-user'}));
});
await new Promise(r=>fixture.listen(8791,'127.0.0.1',r));
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
await mkdir('test-results/worker',{recursive:true});
await writeFile('test-results/worker/entry.ts',`import {handleRequest} from '../../worker/index.ts';export default {fetch(req,env){return handleRequest(req,env,async(url,options)=>{if(String(url)!=='https://titayla.com/api/app-access/verify/')throw Error('Unexpected verifier');return fetch('http://127.0.0.1:8791',options);});}};`);
await writeFile('test-results/worker/wrangler.json',JSON.stringify({name:'simulateur-credit-local-test',main:'entry.ts',compatibility_date:'2026-09-23',assets:{directory:'../../dist',binding:'ASSETS',run_worker_first:true,html_handling:'none'},vars:{APP_ID:'simulation-credit',TITAYLA_URL:'https://titayla.com',TITAYLA_PUBLIC_KEY:JSON.stringify(publicKey)}}));
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port','8788','--config','test-results/worker/wrangler.json'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';child.stdout.on('data',c=>logs+=c);child.stderr.on('data',c=>logs+=c);
let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{await fetch(origin+'/auth/titayla/');ready=true;break;}catch{await new Promise(r=>setTimeout(r,300));}}
 assert.ok(ready,logs);
 const files=await readdir('dist',{recursive:true,withFileTypes:true});
 for(const file of files.filter(f=>f.isFile())){
  const parent=file.parentPath.replaceAll('\\','/');const path='/'+(parent+'/'+file.name).replace(/^.*?dist\//,'');
  const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,303,path);
 }
 for(const path of ['/','/legacy/index.html','/CNAME','/api/private/'])assert.ok([303,401].includes((await fetch(origin+path,{redirect:'manual'})).status));
 browser=await chromium.launch();const context=await browser.newContext({acceptDownloads:true,reducedMotion:"reduce"});
 const start=await context.request.get(origin+'/auth/titayla/start/',{maxRedirects:0});assert.equal(start.status(),303);
 const nonce=new URL(start.headers().location).searchParams.get('state');
 const token=await signAssertion('fixture-user','simulation-credit',privateKey,nonce);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/auth/titayla/#assertion='+encodeURIComponent(token));
 try{await expect(page.getByRole('heading',{name:'Simulateur de crédit',exact:true})).toBeVisible();}catch(error){console.log('Browser errors:',errors);console.log('Page body:',(await page.locator('body').innerText()).slice(0,500));throw error;}
 assert.equal(new URL(page.url()).hash,'');
 await expect(page.getByLabel('Mensualité hors assurance',{exact:true})).toHaveValue('1 159,92');
 await page.getByLabel('Montant emprunté',{exact:true}).fill('250000');
 await page.locator('#credit-monthly').locator('..').locator('..').getByRole('button').click();
 await expect(page.getByRole('status')).toContainText('calcul effectué');
 await page.getByRole('button',{name:'Voir le tableau d’amortissement',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(240);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger en PDF',exact:true}).click();
 const download=await downloadPromise;assert.equal(download.suggestedFilename(),'simulation-credit-titayla.pdf');await download.saveAs('test-results/worker/simulation.pdf');
 await page.screenshot({path:'test-results/worker/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/worker/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const request=()=>fetch(origin+'/api/titayla/session/',{headers:{cookie:'__Host-titayla-access='+token},redirect:'manual'});
 allowed=false;assert.equal((await request()).status,403);
 await page.evaluate(()=>dispatchEvent(new Event('online')));await expect(page.getByRole('heading',{name:'Vérification de votre accès'})).toBeVisible();
 allowed=true;upstream=503;assert.equal((await request()).status,503);
 for(const code of [301,302,303,307,308]){upstream=code;assert.equal((await request()).status,503);}
 assert.deepEqual(errors,[]);
 console.log('PASS: real Worker protects every built asset; browser nonce/cookie login, inverse monthly calculation, 240-row amortization, PDF download, responsive layout, revocation, outage and redirects.');
}finally{
 if(browser)await browser.close();
 if(process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGTERM');
 await new Promise(r=>fixture.close(r));
}
