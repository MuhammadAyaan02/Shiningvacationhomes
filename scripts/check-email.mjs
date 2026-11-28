import nextEnv from '@next/env';
import {createSmtpTransport,deliveryIssues,deliveryProvider,isSmtpProvider,smtpConnectionMessage,verifyBrevoApi} from '../src/enquiry-delivery.mjs';
nextEnv.loadEnvConfig(process.cwd(),false);
const issues=deliveryIssues(process.env);
if(issues.length){
 console.error('Email configuration is incomplete:');
 for(const issue of issues)console.error('- '+issue);
 process.exitCode=1;
}else if(deliveryProvider(process.env)==='brevo'){
 try{await verifyBrevoApi(process.env);console.log('Brevo API authentication passed. No email was sent; inbox delivery still needs a form test.');}
 catch(error){
  if(error.status===401)console.error('Brevo rejected the API key. Create an API key (xkeysib-…) in Brevo → SMTP & API → API keys. SMTP keys (xsmtpsib-…) do not work here.');
  else if(error.status===403)console.error('Brevo API key is missing Transactional email permission. Set Transactional email to All when creating the key.');
  else console.error('Brevo API check failed. Confirm BREVO_API_KEY and network access.');
  process.exitCode=1;
 }
}else if(!isSmtpProvider(process.env)){
 console.error('This connection check is for ENQUIRY_PROVIDER=gmail or brevo.');process.exitCode=1;
}else{
 let transport;
 try{transport=await createSmtpTransport(process.env);await transport.verify();console.log('Gmail SMTP connection and authentication passed. No email was sent; inbox delivery still needs a form test.');}
 catch(error){
  console.error(smtpConnectionMessage(error)+' No email was sent.');process.exitCode=1;
 }
 finally{transport?.close();}
}
