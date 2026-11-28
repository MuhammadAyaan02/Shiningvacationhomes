import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function inlineScriptHashes(html){
 const hashes=new Set();
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc\s*=/i.test(match[1])&&match[2].trim())hashes.add('sha256-'+createHash('sha256').update(match[2]).digest('base64'));
 return [...hashes];
}

/** Prerender check only. Script CSP is nonce-based in middleware (OpenNext serves different flight scripts at runtime than the static HTML hashes). */
export async function secureBuild({projectDir,files,buildId}){
 const hashes=[...new Set(files.filter(file=>file.name.endsWith('.html')).flatMap(file=>inlineScriptHashes(file.data.toString('utf8'))))];
 if(!hashes.length)throw Error('No prerendered script hashes found; refusing an unprotected build');
 await writeFile(path.join(projectDir,'.next/security-policy.json'),JSON.stringify({buildId,hashes,mode:'nonce-middleware'},null,2)+'\n');
 console.log(`Security policy: nonce middleware; recorded ${hashes.length} prerender script hashes for audit.`);
 return {hashes,platformManifests:0};
}
