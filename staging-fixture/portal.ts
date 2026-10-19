// ISOLATED SYNTHETIC PREPRODUCTION ONLY. Never import into the app Worker.
// No Supabase, Stripe, customer data, emails, or production signing key.
import {getAppAccess} from './access-policy.ts';
import {signAssertion,verifyAssertion,validNonce} from '../titayla-access/protocol.ts';
interface Env {FIXTURE_PASSWORD:string;FIXTURE_PRIVATE_JWK:string;FIXTURE_PUBLIC_JWK:string;SIMULATOR_ORIGIN:string}
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
const userId=(kind:string)=>'preproduction-'+kind;
function rights(kind:string){
 const user=userId(kind);
 return getAppAccess({userId:user,app:{id:'simulation-credit',accessModel:'subscription'},subscriptions:kind==='none'?[]:[{id:'synthetic-'+kind,userId:user,status:kind==='expired'?'canceled':'active',cancelAtPeriodEnd:false,accessStartsAt:'2020-01-01',accessEndsAt:'2099-01-01',items:[kind==='pass'?{passId:'fixture-immobilier'}:{appId:'simulation-credit'}]}],passes:[{id:'fixture-immobilier',appIds:['simulation-credit']}]});
}
export default {async fetch(request:Request,env:Env){
 try{
  const url=new URL(request.url);
  if(url.pathname==='/api/app-access/verify/'&&request.method==='POST'){
   const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
   const assertion=await verifyAssertion(token,'simulation-credit',JSON.parse(env.FIXTURE_PUBLIC_JWK));
   const body=await request.json() as {appId?:string};
   if(!assertion||body.appId!=='simulation-credit')return Response.json({allowed:false},{status:401,headers});
   const kind=assertion.sub.replace(/^preproduction-/,'');
   if(!['individual','pass','none','expired'].includes(kind))return Response.json({allowed:false},{status:403,headers});
   const allowed=rights(kind).allowed;
   return Response.json({allowed,appId:'simulation-credit',userId:assertion.sub},{status:allowed?200:403,headers});
  }
  // Human test access requires a separate fixture credential, never production Auth.
  const expected='Basic '+btoa('recette:'+env.FIXTURE_PASSWORD);
  if(!env.FIXTURE_PASSWORD||request.headers.get('authorization')!==expected)return new Response('Préproduction privée — comptes fictifs uniquement.',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="Recette simulateur"'}});
  if(url.pathname==='/acces/simulation-credit/'&&request.method==='GET'){
   const nonce=url.searchParams.get('state')||'';
   if(!validNonce(nonce))return Response.redirect(env.SIMULATOR_ORIGIN+'/auth/titayla/start/',303);
   const kind=url.searchParams.get('profil')||'individual';
   if(!['individual','pass','none','expired'].includes(kind)||!rights(kind).allowed)return new Response('Ce compte fictif ne dispose pas de droit.',{status:403,headers});
   const token=await signAssertion(userId(kind),'simulation-credit',JSON.parse(env.FIXTURE_PRIVATE_JWK),nonce);
   return new Response(null,{status:303,headers:{...headers,Location:env.SIMULATOR_ORIGIN+'/auth/titayla/#assertion='+encodeURIComponent(token)}});
  }
  return new Response('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Préproduction du simulateur</title><h1>Recette privée — données fictives</h1><p>Aucun compte ni abonnement réel n’est utilisé.</p><a href="'+env.SIMULATOR_ORIGIN+'/auth/titayla/start/">Ouvrir le simulateur avec un droit individuel fictif</a></html>',{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
 }catch{return new Response('Préproduction indisponible.',{status:503,headers});}
}};
