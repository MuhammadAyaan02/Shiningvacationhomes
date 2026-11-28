import {NextResponse} from 'next/server';
import {productionCsp} from './src/security-policy.mjs';

export function middleware(request){
 // next dev uses eval-source-map; CSP without 'unsafe-eval' blocks hydration (form + tabs).
 if(process.env.NODE_ENV!=='production')return NextResponse.next();

 const nonce=btoa(crypto.randomUUID());
 const policy=productionCsp([],nonce);
 const requestHeaders=new Headers(request.headers);
 requestHeaders.set('x-nonce',nonce);
 requestHeaders.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers:requestHeaders}});
 response.headers.set('Content-Security-Policy',policy);
 return response;
}

export const config={matcher:['/((?!_next/|media/|fonts/|api/|favicon.ico).*)']};
