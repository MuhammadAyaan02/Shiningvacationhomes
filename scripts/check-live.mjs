import {routes} from '../src/seo.js';
const value=process.argv[2];
let base;
try{base=new URL(value);if(!value||base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();}
catch{console.error('Usage: npm run check:live -- https://your-approved-domain');process.exit(1);}
const issues=[];
for(const route of routes){
 const response=await fetch(new URL(route,base),{redirect:'manual',signal:AbortSignal.timeout(10000)}).catch(()=>null);
 if(!response||response.status!==200){issues.push(`${route}: expected 200, received ${response?.status||'network error'}`);if(route==='/')break;continue;}
 const html=await response.text();
 for(const name of ['content-security-policy','x-content-type-options','strict-transport-security','x-frame-options'])if(!response.headers.has(name))issues.push(`${route}: missing ${name}`);
 const policy=response.headers.get('content-security-policy')||'',scripts=policy.split(';').find(rule=>rule.trim().startsWith('script-src '))||'';
 if(scripts.includes("'unsafe-inline'")||!(scripts.includes("'nonce-")||scripts.includes("'sha256-")))issues.push(`${route}: expected nonce- or hash-based script policy`);
 if(!html.includes(`rel="canonical" href="${new URL(route,base).href}"`))issues.push(`${route}: canonical does not match the published origin`);
 if(/name="robots" content="[^"]*noindex/i.test(html))issues.push(`${route}: noindex is present`);
 if((html.match(/<h1(?: |>)/g)||[]).length!==1)issues.push(`${route}: expected one H1`);
}
if(!issues.length){
 for(const route of ['/robots.txt','/sitemap.xml']){const response=await fetch(new URL(route,base),{signal:AbortSignal.timeout(10000)});const body=await response.text();if(!response.ok||!body.includes(base.origin))issues.push(`${route}: missing published origin or failed response`);}
 const response=await fetch(new URL('/api/enquiry/',base),{signal:AbortSignal.timeout(10000)});if(response.status!==405)issues.push('/api/enquiry/: GET must be rejected');
}
if(issues.length){console.error('Public release checks failed:');for(const issue of issues)console.error('- '+issue);process.exitCode=1;}
else console.log(`Public HTTP checks passed for ${routes.length} routes. This read-only check sends no enquiry. Production database capture and approved inbox delivery still need verification.`);
