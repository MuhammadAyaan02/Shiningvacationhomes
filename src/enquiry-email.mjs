import {collections} from './data.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=value=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')):'';

export function enquiryEmail(data,{reference=''}={}){
 const owner=data.intent==='owner';
 const title=owner?'New property enquiry':data.intent==='monthly'?'New monthly stay enquiry':'New stay enquiry';
 const contacts=[['Full name',data.name],['Email',data.email],['Phone',data.phone]];
 const requirements=owner?[
  ['Property area',data.area],['Bedrooms',data.bedrooms]
 ]:[
  ['Type of stay',data.intent==='monthly'?'Monthly stay':'Short stay'],
  ['Travel plans',data.travelPlan],['Arrival',date(data.arrival)],['Departure',date(data.departure)],
  ['Room type',collections.find(item=>item.slug===data.collection)?.name||data.collection],['Guests',data.guests],
  ['Preferred area',data.preferredArea],
  ['Budget',data.budget?`${new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',maximumFractionDigits:2}).format(Number(data.budget))}${data.budgetBasis==='monthly'?' per month':' for the whole stay'}`:'']
 ];
 const filled=rows=>rows.filter(([,value])=>value!==undefined&&value!==null&&String(value).trim());
 const rows=items=>filled(items).map(([label,value])=>`<tr><td width="35%" valign="top" style="padding:12px 0;border-bottom:1px solid #e6e9ec;color:#52606b;font-size:13px;line-height:1.6;">${escape(label)}</td><td valign="top" style="padding:12px 0 12px 16px;border-bottom:1px solid #e6e9ec;color:#18232b;font-size:15px;line-height:1.6;word-break:break-word;">${escape(value)}</td></tr>`).join('');
 const section=(heading,items)=>`<h2 style="margin:28px 0 4px;font-size:15px;line-height:1.5;color:#18232b;">${heading}</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows(items)}</table>`;
 const intro=owner?'A property owner has shared their details. Review the requirements and reply to start the conversation.':'A guest has shared their Dubai plans. Review the requirements below and reply with suitable available options.';
 const note=owner?'Property-management enquiry · review the proposed scope with the owner.':'An enquiry is not a confirmed reservation. Confirm actual availability, complete pricing and applicable terms before arranging a stay.';
 const reply=`mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(owner?'Your Dubai property enquiry':'Your Dubai stay enquiry')}`;
 const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | Shining Vacation Homes</title></head>
<body style="margin:0;padding:0;background-color:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#18232b;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escape(title)} from ${escape(data.name)}. Review the details and reply to the enquiry.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f5f0;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border-collapse:collapse;">
<tr><td style="padding:0 12px 24px;"><p style="margin:0;color:#18232b;font-size:22px;font-weight:700;letter-spacing:0.3px;">SHINING</p><p style="margin:4px 0 0;color:#52606b;font-size:10px;letter-spacing:2px;">VACATION HOMES · DUBAI</p></td></tr>
<tr><td style="height:4px;background-color:#2454d6;font-size:1px;line-height:4px;">&nbsp;</td></tr>
<tr><td style="padding:30px 24px;background-color:#ffffff;border-left:1px solid #e6e9ec;border-right:1px solid #e6e9ec;">
<p style="margin:0 0 12px;color:#2454d6;font-size:11px;font-weight:700;letter-spacing:1.5px;">WEBSITE ENQUIRY</p>
<h1 style="margin:0 0 14px;color:#18232b;font-size:30px;line-height:1.2;letter-spacing:-0.8px;">${title}</h1>
<p style="margin:0;color:#52606b;font-size:15px;line-height:1.7;">${intro}</p>
${section(owner?'Owner details':'Guest details',contacts)}
${section(owner?'About the property':'Stay requirements',requirements)}
${data.message?`<h2 style="margin:28px 0 12px;font-size:15px;line-height:1.5;">Additional notes</h2><div style="padding:18px;background-color:#f7f5f0;border-left:3px solid #2454d6;color:#18232b;font-size:15px;line-height:1.7;word-break:break-word;">${escape(data.message).replace(/\r?\n/g,'<br>')}</div>`:''}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;"><tr><td bgcolor="#2454d6" style="border-radius:5px;background-color:#2454d6;"><a href="${escape(reply)}" style="display:inline-block;padding:15px 22px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Reply to ${owner?'owner':'guest'} &rarr;</a></td></tr></table>
<p style="margin:14px 0 0;color:#52606b;font-size:12px;line-height:1.6;">You can also use your email app’s Reply button to contact ${escape(data.name)}.</p>
</td></tr>
<tr><td style="padding:22px 24px;background-color:#eef0ed;border:1px solid #e0e4df;"><p style="margin:0;color:#52606b;font-size:12px;line-height:1.7;">${note}</p>${reference?`<p style="margin:10px 0 0;color:#52606b;font-size:11px;line-height:1.6;word-break:break-all;">Reference: ${escape(reference)}</p>`:''}</td></tr>
<tr><td style="padding:22px 12px 0;"><p style="margin:0;color:#52606b;font-size:11px;line-height:1.7;">Shining Vacation Homes<br>Website enquiry notification · Contains personal information. Share only with the team handling this enquiry.</p></td></tr>
</table></td></tr></table></body></html>`;
 const text=[`Shining Vacation Homes — ${title}`,'',intro,'',owner?'OWNER DETAILS':'GUEST DETAILS',...filled(contacts).map(([label,value])=>`${label}: ${value}`),'',owner?'PROPERTY DETAILS':'STAY REQUIREMENTS',...filled(requirements).map(([label,value])=>`${label}: ${value}`),...(data.message?['','ADDITIONAL NOTES',data.message]:[]),'',`Reply to: ${data.email}`,'',note,...(reference?['',`Reference: ${reference}`]:[])].join('\n');
 return {html,text};
}
