import {getCountries,getCountryCallingCode} from 'libphonenumber-js';

/** Unique ITU dial codes (one entry per code), sorted numerically. */
export const countryCodes=[...new Map(
 getCountries().map(iso=>{
  const dial='+'+getCountryCallingCode(iso);
  return [dial,{iso,dial}];
 })
).values()].sort((a,b)=>Number(a.dial.slice(1))-Number(b.dial.slice(1))||a.dial.localeCompare(b.dial));

export const defaultCountryDial='+971';
