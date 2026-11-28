'use client';
import {Suspense,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {countryCodes,defaultCountryDial} from '../src/country-codes.mjs';
import {dateErrors} from '../src/dates.js';
import {DateField} from './date-field.jsx';

const turnstileSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||'';

function EnquiryPrefill({form,setIntent,setArrival,setDeparture}){
 const params=useSearchParams(),search=params.toString();
 useEffect(()=>{
  const query=new URLSearchParams(search),el=form.current;if(!el)return;
  setIntent(['monthly','owner'].includes(query.get('intent'))?query.get('intent'):'guest');
  const arrival=query.get('arrival'),departure=query.get('departure');
  if(arrival&&/^\d{4}-\d{2}-\d{2}$/.test(arrival))setArrival(arrival);
  if(departure&&/^\d{4}-\d{2}-\d{2}$/.test(departure))setDeparture(departure);
  for(const key of ['guests','collection']){
   const field=el.elements[key],value=query.get(key);
   if(value&&field&&Array.from(field.options||[]).some(o=>o.value===value))field.value=value;
  }
 },[search,form,setIntent,setArrival,setDeparture]);
 return null;
}

function TurnstileField({onToken,widgetId}){
 const host=useRef(null);
 useEffect(()=>{
  if(!turnstileSiteKey||!host.current)return;
  let cancelled=false,script=document.querySelector('script[data-cf-turnstile]');
  const setToken=token=>onToken(token||'');
  const render=()=>{
   if(cancelled||!window.turnstile||!host.current)return;
   if(widgetId.current!=null){try{window.turnstile.remove(widgetId.current);}catch{/* already gone */}widgetId.current=null;}
   host.current.innerHTML='';
   widgetId.current=window.turnstile.render(host.current,{
    sitekey:turnstileSiteKey,
    theme:'light',
    callback:setToken,
    'expired-callback':()=>setToken(''),
    'error-callback':()=>setToken(''),
   });
  };
  if(window.turnstile)render();
  else{
   if(!script){
    script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;script.defer=true;script.dataset.cfTurnstile='';
    document.head.appendChild(script);
   }
   script.addEventListener('load',render);
  }
  return ()=>{cancelled=true;script?.removeEventListener('load',render);if(widgetId.current!=null&&window.turnstile){try{window.turnstile.remove(widgetId.current);}catch{/* ignore */}widgetId.current=null;};};
 },[onToken,widgetId]);
 if(!turnstileSiteKey)return null;
 return <div className="turnstile-field"><div ref={host}/><p className="visually-hidden">Complete the security check before sending.</p></div>;
}

export function EnquiryForm(){
 const form=useRef(null),feedback=useRef(null),requestId=useRef(null),busy=useRef(false),turnstileWidget=useRef(null);
 const [ready,setReady]=useState(false),[pending,setPending]=useState(false),[intent,setIntent]=useState('guest'),[message,setMessage]=useState(''),[errors,setErrors]=useState({}),[min,setMin]=useState(''),[countryDial,setCountryDial]=useState(defaultCountryDial),[arrival,setArrival]=useState(''),[departure,setDeparture]=useState(''),[turnstileToken,setTurnstileToken]=useState('');
 useEffect(()=>{setReady(true);setMin(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai'}).format(new Date()));},[]);
 const clear=()=>{setMessage('');setErrors({});requestId.current=null;for(const name of ['arrival','departure','phoneNumber'])form.current.elements[name]?.setCustomValidity('');};
 const resetTurnstile=()=>{setTurnstileToken('');if(turnstileWidget.current!=null&&window.turnstile){try{window.turnstile.reset(turnstileWidget.current);}catch{/* ignore */}}};
 const field=(name,hint)=>({id:name,'aria-invalid':errors[name]?'true':undefined,'aria-describedby':[hint,errors[name]?name+'-error':null].filter(Boolean).join(' ')||undefined});
 const error=name=>errors[name]?<p className="field-error" id={name+'-error'}>{errors[name]}</p>:null;
 const submit=async event=>{
  event.preventDefault();if(!ready||busy.current)return;
  const el=form.current;el.elements.name.setCustomValidity(el.elements.name.value.trim()?'':'Enter your full name.');
  el.elements.phoneNumber.setCustomValidity(el.elements.phoneNumber.value.trim()?'':'Enter your phone number.');
  if(intent!=='owner'){
   const issues=dateErrors(arrival,departure,min);
   el.elements.arrival.setCustomValidity(issues.start);el.elements.departure.setCustomValidity(issues.end);
  }
  if(!el.reportValidity()){
   if(intent!=='owner'){
    const issues=dateErrors(arrival,departure,min);
    if(issues.start||issues.end)setErrors({...(issues.start?{arrival:issues.start}:{}),...(issues.end?{departure:issues.end}:{})});
   }
   return;
  }
  if(turnstileSiteKey&&!turnstileToken){setErrors({form:'Please complete the security check.'});setMessage('Please complete the security check.');feedback.current?.focus();return;}
  const body=Object.fromEntries(new FormData(el));
  body.phone=`${countryDial} ${(body.phoneNumber||'').trim()}`.trim();
  delete body.phoneNumber;delete body.countryDial;delete body['cf-turnstile-response'];
  if(turnstileToken)body.turnstileToken=turnstileToken;
  requestId.current ||= crypto.randomUUID();busy.current=true;setPending(true);setErrors({});setMessage('Sending your requirements.');
  try{
   const response=await fetch('/api/enquiry/',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestId.current},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
   const result=await response.json();setErrors(result.errors||{});setMessage(result.message+(result.reference?' Reference: '+result.reference:''));
   if(response.ok){el.reset();setCountryDial(defaultCountryDial);setArrival('');setDeparture('');requestId.current=null;resetTurnstile();}
   else resetTurnstile();
  }catch{setMessage('Delivery could not be confirmed. Please retry or contact the team directly.');resetTurnstile();}
  finally{busy.current=false;setPending(false);feedback.current?.focus();}
 };
 return <form ref={form} id="enquiry-form" className="enquiry-form" action="/api/enquiry/" method="post" onSubmit={submit} onInput={clear} onInvalidCapture={event=>{const details=event.target.closest('details');if(details)details.open=true;}} aria-busy={pending}>
  <h2>{intent==='owner'?'Tell us about your property.':'Tell us about your stay.'}</h2>
  <p className="form-intro">{intent==='owner'?'Share your property details and questions with the team.':'Share your requirements. Our team will contact you to discuss suitable available options.'}</p>
  <Suspense fallback={null}><EnquiryPrefill form={form} setIntent={setIntent} setArrival={setArrival} setDeparture={setDeparture}/></Suspense>
  <fieldset className="form-fields" disabled={!ready||pending}>
   <legend className="visually-hidden">Your enquiry details</legend>
   {intent==='owner'?<><input type="hidden" name="intent" value="owner"/><p className="form-purpose">Property management enquiry</p></>:<label>Type of stay<select {...field('intent')} name="intent" value={intent} onChange={e=>{setIntent(e.target.value);clear();}}><option value="guest">A short stay</option><option value="monthly">A monthly stay</option></select></label>}{error('intent')}
   <div className="two-fields"><div><label>Full name <span>(required)</span><input {...field('name')} name="name" autoComplete="name" required maxLength={100} onChange={e=>e.target.setCustomValidity(e.target.value.trim()?'':'Enter your full name.')}/></label>{error('name')}</div><div><label>Email <span>(required)</span><input {...field('email')} name="email" type="email" autoComplete="email" required maxLength={254}/></label>{error('email')}</div></div>
   <div className="phone-field"><span className="phone-field-label" id="phone-label">Phone <span>(required)</span></span><div className="phone-input" role="group" aria-labelledby="phone-label"><label className="visually-hidden" htmlFor="countryDial">Country code</label><select id="countryDial" name="countryDial" value={countryDial} onChange={e=>setCountryDial(e.target.value)} autoComplete="tel-country-code">{countryCodes.map(c=><option key={c.dial} value={c.dial}>{c.dial}</option>)}</select><label className="visually-hidden" htmlFor="phoneNumber">Phone number</label><input {...field('phone')} id="phoneNumber" name="phoneNumber" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={20} placeholder="Phone number" onChange={e=>e.target.setCustomValidity(e.target.value.trim()?'':'Enter your phone number.')}/></div>{error('phone')}</div>
   <div id="guest-fields" hidden={intent==='owner'}><fieldset disabled={intent==='owner'} className="form-fields"><legend className="visually-hidden">Stay requirements</legend>
    <div className="two-fields"><div><DateField name="arrival" label="Arrival" required min={min} value={arrival} onChange={value=>{setArrival(value);if(departure&&departure<=value)setDeparture('');clear();}} invalid={!!errors.arrival} describedBy={errors.arrival?'arrival-error':undefined}/>{error('arrival')}</div><div><DateField name="departure" label="Departure" required min={arrival||min} value={departure} onChange={value=>{setDeparture(value);clear();}} invalid={!!errors.departure} describedBy={errors.departure?'departure-error':undefined}/>{error('departure')}</div></div>
    <div className="two-fields"><div><label>Room type<select {...field('collection')} name="collection" defaultValue=""><option value="">Select room type</option><option value="studio-apartments">Studio</option><option value="one-bedroom-apartments">1 bedroom</option><option value="two-bedroom-apartments">2 bedroom</option><option value="three-bedroom-apartments">3 bedroom</option><option value="luxury-villas">Villa</option><option value="townhouses">Townhouse</option></select></label>{error('collection')}</div><div><label>No. of guests<select {...field('guests')} name="guests" defaultValue=""><option value="">Not sure yet</option>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>{error('guests')}</div></div>
   </fieldset></div>
   <div id="owner-fields" hidden={intent!=='owner'}><fieldset disabled={intent!=='owner'} className="form-fields"><legend className="visually-hidden">Property details</legend><div className="two-fields"><div><label>Property area<input {...field('area')} name="area" maxLength={120} placeholder="Your Dubai neighbourhood"/></label>{error('area')}</div><div><label>Bedrooms<select {...field('bedrooms')} name="bedrooms"><option>Studio</option>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label>{error('bedrooms')}</div></div></fieldset></div>
   <label>Anything else we should know? <span>(optional)</span><textarea {...field('message')} name="message" rows={3} maxLength={3000} placeholder="Anything important to your plans"/></label>{error('message')}
   <div className="form-trap" aria-hidden="true"><label>Leave this field empty<input name="companyWebsite" tabIndex={-1} autoComplete="off"/></label></div>
   <p className="subnote">We use these details to respond to your enquiry. Please do not include payment details or identity documents.</p>
   <TurnstileField onToken={setTurnstileToken} widgetId={turnstileWidget}/>
   <button className="button" type="submit">{pending?'Sending…':intent==='owner'?'Send property enquiry':'Send my requirements'}</button>
  </fieldset>
  <noscript><p>Please enable JavaScript to use this form, or <a href="mailto:info@shiningvacationhomes.com">email the team</a>. No form information is collected while JavaScript is unavailable.</p></noscript>
  <p ref={feedback} id="form-feedback" role="status" tabIndex={-1}>{message}</p>{errors.form&&<p className="field-error" role="alert">{errors.form}</p>}
  {intent!=='owner'?<p className="subnote">Own a Dubai property? <a href="mailto:info@shiningvacationhomes.com">Email us about management.</a></p>:null}
 </form>;
}
