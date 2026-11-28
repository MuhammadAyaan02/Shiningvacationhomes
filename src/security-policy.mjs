export function productionCsp(hashes=[],nonce=''){
 if(hashes.some(hash=>!/^sha256-[A-Za-z0-9+/]{43}=$/.test(hash)))throw Error('Invalid CSP hash');
 if(nonce&&!/^[A-Za-z0-9+/=]+$/.test(nonce))throw Error('Invalid CSP nonce');
 const script=nonce
  ?`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
  :`script-src 'self' ${[...new Set(hashes)].map(hash=>`'${hash}'`).join(' ')}`.trim();
 // Turnstile: frame + connect required; script loads via nonce/'strict-dynamic' from the app bundle.
 return ["default-src 'self'",script,"script-src-attr 'none'","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https://challenges.cloudflare.com","font-src 'self'","connect-src 'self' https://challenges.cloudflare.com","frame-src https://challenges.cloudflare.com","frame-ancestors 'none'","base-uri 'self'","object-src 'none'","form-action 'self'"].join('; ');
}
