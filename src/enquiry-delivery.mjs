import {lookup} from 'node:dns/promises';
import {isEmailAddress} from './email-address.mjs';
export const deliveryProvider=env=>env.ENQUIRY_PROVIDER||'resend';
export const isSmtpProvider=env=>deliveryProvider(env)==='gmail';
export const deliveryRecipients=env=>(env.ENQUIRY_TO||(deliveryProvider(env)==='gmail'?env.SMTP_USER:'')||'').split(',').map(value=>value.trim()).filter(Boolean);
export const deliveryBcc=env=>(env.ENQUIRY_BCC||'').split(',').map(value=>value.trim()).filter(Boolean);
export const brevoApiKey=env=>(env.BREVO_API_KEY||'').trim();

const parseSender=value=>{
 const trimmed=(value||'').trim(),match=trimmed.match(/^([^<>\r\n]+)<([^<>]+)>$/);
 if(match){const address=match[2].trim();return isEmailAddress(address)?{name:match[1].trim().replace(/^["']|["']$/g,''),address}:null;}
 return isEmailAddress(trimmed)?{address:trimmed}:null;
};

export function deliveryIssues(env){
 const issues=[],provider=deliveryProvider(env);
 if(!['gmail','resend','brevo'].includes(provider))return ['ENQUIRY_PROVIDER must be gmail, brevo or resend.'];
 if(provider==='gmail'){
  if(!isEmailAddress(env.SMTP_USER||''))issues.push('SMTP_USER must contain your Google account email.');
  if(!/^[a-zA-Z]{16}$/.test((env.SMTP_APP_PASSWORD||'').replace(/\s/g,'')))issues.push('SMTP_APP_PASSWORD must contain a 16-letter Google App Password.');
 }else if(provider==='brevo'){
  if(!brevoApiKey(env))issues.push('BREVO_API_KEY is required (create an API key in Brevo → SMTP & API → API keys). SMTP keys starting with xsmtpsib- do not work on Cloudflare Workers.');
  if(!parseSender(env.ENQUIRY_FROM||''))issues.push('ENQUIRY_FROM must contain a verified Brevo sender email.');
  if(!deliveryRecipients(env).length)issues.push('ENQUIRY_TO is required.');
 }else{
  for(const key of ['RESEND_API_KEY','ENQUIRY_FROM'])if(!env[key]?.trim())issues.push(`${key} is required.`);
  if(env.ENQUIRY_FROM&&!parseSender(env.ENQUIRY_FROM))issues.push('ENQUIRY_FROM must contain a valid verified sender email.');
 }
 const recipients=deliveryRecipients(env);
 if(!recipients.length&&provider==='resend')issues.push('ENQUIRY_TO is required.');
 if(env.ENQUIRY_TO&&!env.ENQUIRY_TO.split(',').every(value=>isEmailAddress(value.trim())))issues.push('ENQUIRY_TO must contain valid recipient emails.');
 if(env.ENQUIRY_BCC&&!env.ENQUIRY_BCC.split(',').every(value=>isEmailAddress(value.trim())))issues.push('ENQUIRY_BCC must contain valid recipient emails.');
 return issues;
}

export function gmailTransportOptions(env){
 return {host:'smtp.gmail.com',port:465,secure:true,
  tls:{servername:'smtp.gmail.com',rejectUnauthorized:true},
  auth:{user:env.SMTP_USER.trim(),pass:env.SMTP_APP_PASSWORD.replace(/\s/g,'')},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,dnsTimeout:10000,
  disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false};
}

export const smtpTransportOptions=gmailTransportOptions;

export async function createSmtpTransport(env,{resolveHost=lookup,createTransport}={}){
 const options=smtpTransportOptions(env);
 const hostname=options.host;
 let timer;
 try{
  // Use the OS resolver; some networks cannot serve Nodemailer's direct DNS queries.
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new Error('SMTP DNS lookup timed out');error.code='EDNS';reject(error);},5000);});
  const addresses=await Promise.race([resolveHost(hostname,{all:true,order:'ipv4first'}),timeout]);
  if(!addresses.length){const error=new Error('SMTP DNS lookup returned no address');error.code='EDNS';throw error;}
  options.host=addresses[0].address;
 }catch(error){error.code='EDNS';throw error;}
 finally{clearTimeout(timer);}
 // Keep Gmail's hostname for SNI and certificate validation when connecting to the resolved address.
 options.tls={...options.tls,servername:hostname};
 return (createTransport||(await import('nodemailer')).default.createTransport)(options);
}

export const createGmailTransport=createSmtpTransport;

export function smtpConnectionMessage(error){
 if(error.code==='EDNS')return 'The system could not resolve smtp.gmail.com before authentication.';
 if(error.code==='EACCES'||error.errno===-4092||error.cause?.code==='EACCES')return 'This execution environment denied the outgoing SMTP connection (EACCES), before authentication. Run this check in a normal terminal or deployment host that permits SMTP.';
 if(error.code==='EAUTH')return 'Google rejected authentication. Check the account, App Password and 2-Step Verification.';
 return 'The SMTP connection could not be verified. Check host network access and account settings.';
}

export const gmailConnectionMessage=smtpConnectionMessage;

function enquiryFrom(env){
 const sender=parseSender(env.ENQUIRY_FROM);
 if(sender)return sender?.name?{name:sender.name,address:sender.address}:{name:'Shining Vacation Homes',address:sender.address};
 return {name:'Shining Vacation Homes',address:env.SMTP_USER.trim()};
}

export async function sendSmtpEnquiry(env,message,createTransport){
 const transport=createTransport?createTransport(smtpTransportOptions(env)):await createSmtpTransport(env);
 const to=deliveryRecipients(env),from=enquiryFrom(env);
 let deadline;
 try{
  const sending=transport.sendMail({
   from,to,replyTo:message.replyTo,subject:message.subject,text:message.text,html:message.html,
   messageId:`<enquiry-${message.requestId}@${(from.address.split('@')[1]||'shiningvacationhomes.com')}>`
  });
  const timeout=new Promise((_,reject)=>{deadline=setTimeout(()=>{transport.close();reject(new Error('SMTP deadline exceeded'));},20000);deadline.unref?.();});
  const result=await Promise.race([sending,timeout]);
  if(!result.messageId||result.rejected?.length)throw new Error('SMTP acceptance not confirmed');
  const accepted=(result.accepted||[]).map(String);
  if(!to.every(address=>accepted.some(item=>item.includes(address))))throw new Error('SMTP acceptance not confirmed');
  return result.messageId;
 }finally{clearTimeout(deadline);transport.close();}
}

export const sendGmailEnquiry=sendSmtpEnquiry;

/** Brevo Transactional Email API — works on Cloudflare Workers (no outbound SMTP). */
export async function sendBrevoEnquiry(env,message,dependencies={}){
 const sender=enquiryFrom(env),to=deliveryRecipients(env).map(email=>({email})),bcc=deliveryBcc(env).map(email=>({email}));
 const body={
  sender:{name:sender.name||'Shining Vacation Homes',email:sender.address},
  to,subject:message.subject,htmlContent:message.html,textContent:message.text,
  replyTo:{email:message.replyTo},
  headers:{'IdempotencyKey':`enquiry-${message.requestId}`}
 };
 if(bcc.length)body.bcc=bcc;
 const result=await (dependencies.fetch||fetch)('https://api.brevo.com/v3/smtp/email',{
  method:'POST',signal:AbortSignal.timeout(10000),
  headers:{'api-key':brevoApiKey(env),'accept':'application/json','content-type':'application/json'},
  body:JSON.stringify(body)
 });
 if(result.status===429){const error=new Error('Brevo rate limited');error.status=429;throw error;}
 if(!result.ok){const error=new Error('Brevo rejected the enquiry');error.status=result.status;throw error;}
 const receipt=await result.json();
 if(!receipt?.messageId)throw new Error('No Brevo message id');
 return String(receipt.messageId);
}

export async function verifyBrevoApi(env,dependencies={}){
 // Use a transactional-email endpoint: /v3/account needs broader permissions than form sending.
 const result=await (dependencies.fetch||fetch)('https://api.brevo.com/v3/smtp/templates?limit=1&sort=desc',{
  method:'GET',signal:AbortSignal.timeout(10000),
  headers:{'api-key':brevoApiKey(env),'accept':'application/json'}
 });
 if(!result.ok){const error=new Error('Brevo API authentication failed');error.status=result.status;throw error;}
 return result.json();
}
