import {isIP} from 'node:net';

/** Prefer platform-owned client IP headers only. */
export function turnstileClientIp(request,env={}){
 if(env.VERCEL){
  const value=request.headers.get('x-vercel-forwarded-for')?.trim()||'';
  return isIP(value)?value:'';
 }
 const cf=request.headers.get('cf-connecting-ip')?.trim()||'';
 return isIP(cf)?cf:'';
}

/**
 * Verify a Cloudflare Turnstile token with Siteverify.
 * Local/dev without TURNSTILE_SECRET_KEY skips (form still usable).
 * Public deployments without a secret fail closed.
 */
export async function verifyTurnstileToken(token,request,env={},dependencies={}){
 const secret=env.TURNSTILE_SECRET_KEY||'';
 const publicHost=Boolean(env.VERCEL||env.CF_PAGES||env.CLOUDFLARE_DEPLOYMENT_ID||(env.NODE_ENV==='production'&&env.ENQUIRY_ORIGIN));
 if(!secret){
  if(publicHost)return {ok:false,status:503,message:'Online enquiries are not configured yet. Please call or email the team. Your enquiry has not been sent.'};
  return {ok:true};
 }
 if(typeof token!=='string'||!token||token.length>2048)return {ok:false,status:403,message:'Please complete the security check and try again.',errors:{form:'Please complete the security check.'}};
 const body={secret,response:token};
 const ip=turnstileClientIp(request,env);if(ip)body.remoteip=ip;
 try{
  const result=await (dependencies.fetch||fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)
  });
  const data=await result.json();
  if(data?.success)return {ok:true};
 }catch{/* network / timeout */}
 return {ok:false,status:403,message:'Security check failed. Please try again.',errors:{form:'Security check failed. Please try again.'}};
}
