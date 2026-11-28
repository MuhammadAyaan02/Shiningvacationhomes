import {collections} from './data.mjs';
import {createHash} from 'node:crypto';
import {deliveryIssues,deliveryProvider,isSmtpProvider,sendBrevoEnquiry,sendSmtpEnquiry} from './enquiry-delivery.mjs';
import {enquiryEmail} from './enquiry-email.mjs';

import {isEmailAddress} from './email-address.mjs';
import {verifyTurnstileToken} from './turnstile.mjs';
// shortcut: per-process limits reset on restart; use shared host protection before public promotion.
const limits=new Map();
// shortcut: SMTP retry deduplication is per process for 15 minutes; use shared storage across server instances.
const smtpRequests=new Map();
const response=(status,data,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const todayDubai=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai'}).format(new Date());
const dateValid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function validateEnquiry(input,today=todayDubai()){
 const errors={},data={};
 if(!input||typeof input!=='object'||Array.isArray(input))return {errors:{form:'Invalid enquiry.'},data};
 for(const [key,max] of Object.entries({intent:10,name:100,email:254,phone:40,collection:80,arrival:10,departure:10,travelPlan:200,guests:2,preferredArea:120,budget:12,budgetBasis:10,area:120,bedrooms:10,message:3000,companyWebsite:200})){
  if(input[key]!==undefined&&typeof input[key]!=='string'){errors[key]='Use a text value.';continue;}
  data[key]=(input[key]||'').trim();if(data[key].length>max)errors[key]=`Use no more than ${max} characters.`;
 }
 if(!['guest','monthly','owner'].includes(data.intent))errors.intent='Choose an enquiry type.';
 if(!data.name||/[\r\n\u0000-\u001f]/.test(data.name))errors.name='Enter your full name on one line.';
 if(!isEmailAddress(data.email))errors.email='Enter a valid email address.';
 if(!data.phone)errors.phone='Enter your phone number.';
 else if(!/^[+\d\s().-]{5,40}$/.test(data.phone))errors.phone='Enter a valid telephone number.';
 if(data.companyWebsite)errors.form='Unable to accept this enquiry.';
 if(data.intent==='owner'){
  if(!['Studio','1','2','3','4','5','6'].includes(data.bedrooms))errors.bedrooms='Choose the number of bedrooms.';
  for(const key of ['collection','arrival','departure','travelPlan','guests','preferredArea','budget','budgetBasis'])delete data[key];
 }else{
  if(data.collection&&!collections.some(c=>c.slug===data.collection))errors.collection='Choose a listed accommodation style.';
  if(data.guests&&!/^(?:[1-9]|1[0-2])$/.test(data.guests))errors.guests='Choose between 1 and 12 guests, or Not sure yet.';
  if(data.budget){
   if(!/^\d+(?:\.\d{1,2})?$/.test(data.budget)||Number(data.budget)<1||Number(data.budget)>100000000)errors.budget='Enter a budget between AED 1 and AED 100,000,000, with up to two decimal places.';
   if(!['total','monthly'].includes(data.budgetBasis))errors.budgetBasis='Choose whether the budget is for the whole stay or each month.';
  }else delete data.budgetBasis;
  if(!data.arrival)errors.arrival='Choose a check-in date.';
  else if(!dateValid(data.arrival))errors.arrival='Enter a valid date.';
  else if(data.arrival<today)errors.arrival='Choose today or a future date.';
  if(!data.departure)errors.departure='Choose a check-out date.';
  else if(!dateValid(data.departure))errors.departure='Enter a valid date.';
  else if(data.arrival&&data.departure<=data.arrival)errors.departure='Check-out must be after check-in.';
  delete data.area;delete data.bedrooms;
 }
 delete data.companyWebsite;
 return {data,errors};
}

const maxBodyBytes=16384;
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)throw new Error('empty');
 let timer;
 try{
  return await Promise.race([
   (async()=>{
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBodyBytes){await reader.cancel();throw new Error('large')}chunks.push(value)}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    return JSON.parse(new TextDecoder().decode(bytes));
   })(),
   new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('timeout'));reader.cancel().catch(()=>{});},10000);})
  ]);
 }finally{clearTimeout(timer);reader.releaseLock();}
}

export async function readEnquiryRequest(request,env={},dependencies={}){
 if(request.method!=='POST')return response(405,{message:'Use POST.'},{Allow:'POST'});
 const url=new URL(request.url);
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 // Public runtimes must use an explicit origin; never derive trust from a Host header.
 if((env.VERCEL||env.NODE_ENV==='production')&&!env.ENQUIRY_ORIGIN&&(!local||env.VERCEL))return response(503,{message:'Online enquiries are not configured yet. Please call or email the team. Your enquiry has not been sent.'});
 const origin=request.headers.get('origin'),expected=env.ENQUIRY_ORIGIN||url.origin;
 // Next's local Request URL can use localhost even when the browser uses 127.0.0.1.
 let localOrigin=false;
 if(local&&!env.VERCEL&&!env.ENQUIRY_ORIGIN&&origin){try{const source=new URL(origin);localOrigin=['localhost','127.0.0.1','[::1]'].includes(source.hostname)&&source.protocol===url.protocol&&source.port===url.port&&source.origin===origin;}catch{}}
 if(!origin||(origin!==expected&&!localOrigin)||request.headers.get('sec-fetch-site')==='cross-site')return response(403,{message:'This enquiry must be sent from this website.'});
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return response(415,{message:'Use JSON.'});
 if(Number(request.headers.get('content-length'))>maxBodyBytes)return response(413,{message:'The enquiry is too large. Please shorten it and try again.'});
 let input;try{input=await readBody(request)}catch(error){return response(error.message==='timeout'?408:error.message==='large'?413:400,{message:error.message==='timeout'?'The submission took too long. Please try again.':'The enquiry could not be read. Please check its size and try again.'})}
 const turnstileToken=typeof input?.turnstileToken==='string'?input.turnstileToken:typeof input?.['cf-turnstile-response']==='string'?input['cf-turnstile-response']:'';
 if(input&&typeof input==='object'){delete input.turnstileToken;delete input['cf-turnstile-response'];}
 const challenge=await verifyTurnstileToken(turnstileToken,request,env,dependencies);
 if(!challenge.ok)return response(challenge.status,{message:challenge.message,...(challenge.errors?{errors:challenge.errors}:{})});
 const {data,errors}=validateEnquiry(input,dependencies.today);
 if(Object.keys(errors).length)return response(422,{message:'Please check the highlighted fields.',errors});
 const requestId=request.headers.get('idempotency-key')||'';
 if(!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))return response(400,{message:'Reload the form and try again.'});
 return {data,requestId};
}

export async function handleEnquiry(request,env={},dependencies={}){
 const parsed=dependencies.parsed||await readEnquiryRequest(request,env,dependencies);
 if(parsed instanceof Response)return parsed;
 const {data,requestId}=parsed;
 if(deliveryIssues(env).length)return response(503,{message:'Online enquiries are not configured yet. Please call or email the team. Your enquiry has not been sent.'});
 const smtp=isSmtpProvider(env),requests=dependencies.smtpRequests||smtpRequests;
 const requestKey=`${data.email.toLowerCase()}:${requestId}`,fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 if(smtp){
  for(const [key,value] of requests)if(Date.now()-value.start>900000)requests.delete(key);
  const previous=requests.get(requestKey);
  if(previous){if(previous.fingerprint!==fingerprint)return response(409,{message:'This submission has changed. Reload the form and try again.'});return (await previous.result).clone();}
  if(requests.size>=1000)return response(429,{message:'Please try again later.'},{'Retry-After':'900'});
 }
 const now=Date.now(),key=data.email.toLowerCase(),store=dependencies.limits||limits;
 for(const [key,value] of store)if(now-value.start>900000)store.delete(key);
 if(store.size>=1000&&!store.has(key))return response(429,{message:'Please try again later.'},{'Retry-After':'900'});
 const entry=store.get(key)||{start:now,count:0};
 if(entry.count>=5)return response(429,{message:'Please wait before sending another enquiry.'},{'Retry-After':'900'});
 entry.count++;store.set(key,entry);
 const {text,html}=enquiryEmail(data,{reference:dependencies.enquiryReference||requestId});
 const deliver=async()=>{try{
  const subject=`Shining Vacation Homes - ${data.intent==='owner'?'Property management':data.intent==='monthly'?'Monthly stay':'Stay'} enquiry`;
  let reference;
  if(smtp)reference=await sendSmtpEnquiry(env,{replyTo:data.email,subject,text,html,requestId},dependencies.createTransport);
  else if(deliveryProvider(env)==='brevo'){
   try{reference=await sendBrevoEnquiry(env,{replyTo:data.email,subject,text,html,requestId},dependencies);}
   catch(error){return response(error.status===429?429:502,{message:'The email service could not accept your enquiry. Please retry or contact the team directly.'});}
  }else{
  const result=await (dependencies.fetch||fetch)('https://api.resend.com/emails',{
   method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`enquiry-${requestId}`},
   body:JSON.stringify({from:env.ENQUIRY_FROM,to:env.ENQUIRY_TO.split(',').map(v=>v.trim()).filter(Boolean),reply_to:data.email,subject,text,html})
  });
  if(!result.ok)return response(result.status===429?429:502,{message:'The email service could not accept your enquiry. Please retry or contact the team directly.'});
  const receipt=await result.json();if(!receipt.id)throw new Error('No receipt');
  reference=receipt.id;
  }
  return response(202,{message:data.intent==='owner'?'Your property enquiry has been submitted. Our team will contact you to discuss the details.':'Your requirements have been submitted. Our team will contact you to discuss suitable available options. No accommodation has been reserved.',reference});
 }catch{return response(502,{message:'Delivery could not be confirmed. Please retry or contact the team directly.'})}};
 if(!smtp)return deliver();
 const result=deliver();requests.set(requestKey,{start:Date.now(),fingerprint,result});
 // Keep ambiguous SMTP failures cached too: retrying immediately could send a duplicate.
 return (await result).clone();
}
