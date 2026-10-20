import test from 'node:test';
import assert from 'node:assert/strict';
import {createRsaKeyCache} from '../titayla-access/rsa-key.ts';
import {signAssertion,verifyAssertion} from '../titayla-access/protocol.ts';
test('bounded key preparation shares concurrent imports; never grants or tokens',async()=>{
 let imports=0;const cache=createRsaKeyCache(async(jwk,usage)=>({id:++imports,usage,n:jwk.n}));
 const a={kty:'RSA',n:'a',e:'AQAB'};
 const keys=await Promise.all(Array.from({length:20},()=>cache({...a},'verify')));
 assert.equal(imports,1);assert.ok(keys.every(k=>k===keys[0]));
 await cache(a,'sign');assert.equal(imports,2);
 await cache({...a,n:'b'},'verify');assert.equal(imports,3);
 await cache(a,'verify');assert.equal(imports,4,'old key is evicted rather than accumulated');
});
test('failed import is evicted; older rejection cannot evict a rotated key',async()=>{
 let rejectOld,imports=0;
 const cache=createRsaKeyCache(jwk=>{imports++;return jwk.n==='bad'?new Promise((_,reject)=>{rejectOld=reject;}):Promise.resolve({id:imports});});
 const bad=cache({n:'bad'},'verify');await Promise.resolve();
 const good=await cache({n:'good'},'verify');rejectOld(Error('invalid key'));await assert.rejects(bad);
 assert.equal(await cache({n:'good'},'verify'),good);assert.equal(imports,2);
 let attempts=0;const retry=createRsaKeyCache(async()=>{if(++attempts===1)throw Error('failed');return good;});
 await assert.rejects(retry({},'verify'));assert.equal(await retry({},'verify'),good);assert.equal(attempts,2);
});
test('4096 bit assertions remain fresh, nonce-bound, expiring and rotation-sensitive',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:4096,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
 const now=Date.now(),nonce='a'.repeat(64);
 const a=await signAssertion('synthetic','simulation-credit',privateKey,nonce,now),b=await signAssertion('synthetic','simulation-credit',privateKey,nonce,now);
 assert.notEqual(a,b,'each assertion keeps its own jti');
 const p=await verifyAssertion(a,'simulation-credit',publicKey,now);assert.equal(p.exp-p.iat,300);assert.equal(p.nonce,nonce);
 assert.equal(await verifyAssertion(a,'simulation-credit',publicKey,now+301000),null);
 assert.equal(await verifyAssertion(a,'prompteur',publicKey,now),null);
 assert.equal(await verifyAssertion(a,'simulation-credit',privateKey,now),null);
 const wrong={...publicKey,n:publicKey.n.slice(0,-2)+'AA'};
 assert.equal(await verifyAssertion(a,'simulation-credit',wrong,now),null);
 assert.ok(await verifyAssertion(a,'simulation-credit',publicKey,now));
});
