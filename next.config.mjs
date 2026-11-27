import {productionCsp} from './src/security-policy.mjs';
import {initOpenNextCloudflareForDev} from '@opennextjs/cloudflare';

/** Keep Node packages out of Next's webpack media chunks so OpenNext can resolve them on Cloudflare. */
export default {
  trailingSlash:true,
  serverExternalPackages:['postgres','nodemailer'],
  images:{imageSizes:[128,256,384],deviceSizes:[640,768,1024,1200,1600,2000],formats:['image/webp'],qualities:[75,85]},
  poweredByHeader:false,
  async headers(){return [{source:'/(.*)',headers:[
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
   {key:'X-Frame-Options',value:'DENY'},
   {key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'"},
   {key:'Strict-Transport-Security',value:'max-age=31536000'},
   {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]},...(process.env.NODE_ENV==='production'?[{source:'/((?!_next/|media/|fonts/|api/).*)',headers:[{key:'Content-Security-Policy',value:productionCsp()}]}]:[]),{source:'/media/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400, stale-while-revalidate=604800'}]}]},
};

initOpenNextCloudflareForDev();

