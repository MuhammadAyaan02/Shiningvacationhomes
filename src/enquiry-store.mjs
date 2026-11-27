import {createCipheriv,createDecipheriv,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const schema=[
 'CREATE TABLE IF NOT EXISTS shining_enquiries (id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS shining_enquiry_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at BIGINT NOT NULL)'
];
const queues=new Map(),stores=new Map();
export function storageIssues(env){
 const issues=[];
 if(!/^[a-fA-F0-9]{64}$/.test(env.ENQUIRY_DATA_KEY||''))issues.push('ENQUIRY_DATA_KEY must be a private 64-character hexadecimal encryption key.');
 if(env.ENQUIRY_DATABASE_URL){try{const url=new URL(env.ENQUIRY_DATABASE_URL);if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname)throw Error();}catch{issues.push('ENQUIRY_DATABASE_URL must be a PostgreSQL connection URL.');}}
 else if(env.VERCEL||env.CF_PAGES||env.CLOUDFLARE_DEPLOYMENT_ID||!env.ENQUIRY_STORAGE_DIR||!path.isAbsolute(env.ENQUIRY_STORAGE_DIR))issues.push('Configure ENQUIRY_DATABASE_URL, or an absolute persistent ENQUIRY_STORAGE_DIR on a Node server. Vercel and Cloudflare require PostgreSQL.');
 return issues;
}

export async function createEnquiryStore({directory,databaseUrl,key,retentionDays=30}){
 let query,transaction,close;
 if(databaseUrl){
  if(!/^[a-fA-F0-9]{64}$/.test(key||''))throw Error('Storage encryption key missing');
  const postgres=(await import('postgres')).default;
  const sql=postgres(databaseUrl,{max:2,prepare:false,connect_timeout:5,idle_timeout:20,ssl:'verify-full',connection:{statement_timeout:5000}});
  const run=(client,text,values=[])=>{let i=0;return client.unsafe(text.replace(/\?/g,()=>`$${++i}`),values)};
  query=(text,values)=>run(sql,text,values);
  transaction=fn=>sql.begin(async tx=>{await tx`SELECT pg_advisory_xact_lock(746726)`;return fn((text,values)=>run(tx,text,values));});
  close=()=>sql.end({timeout:5});
 }else{
  directory=path.resolve(directory);await mkdir(directory,{recursive:true,mode:0o700});
  if(!key){const keyFile=path.join(directory,'encryption.key');try{await writeFile(keyFile,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600})}catch(error){if(error.code!=='EEXIST')throw error}key=(await readFile(keyFile,'utf8')).trim();}
  const {DatabaseSync}=await import('node:sqlite');
  const db=new DatabaseSync(path.join(directory,'enquiries.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  query=async(text,values=[])=>db.prepare(text).all(...values);
  transaction=fn=>{
   const previous=queues.get(directory)||Promise.resolve();
   const next=previous.catch(()=>{}).then(async()=>{db.exec('BEGIN IMMEDIATE');try{const result=await fn(query);db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}});
   queues.set(directory,next);return next;
  };
  close=async()=>db.close();
 }
 if(!/^[a-fA-F0-9]{64}$/.test(key||''))throw Error('Invalid storage encryption key');
 const secret=Buffer.from(key,'hex');
 const hash=value=>createHmac('sha256',secret).update(value).digest('hex');
 const encrypt=data=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);const bytes=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64')};
 const decrypt=payload=>{const bytes=Buffer.from(payload,'base64'),decipher=createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'))};
 for(const statement of schema)await query(statement);
 return {
  async capture(data,requestId,now=Date.now(),clientAddress=''){
   const requestKey=hash(data.email.toLowerCase()+':'+requestId),fingerprint=hash(JSON.stringify(data));
   return transaction(async run=>{
    await run('DELETE FROM shining_enquiries WHERE expires_at < ?',[now]);
    await run('DELETE FROM shining_enquiry_limits WHERE expires_at < ?',[now]);
    const previous=(await run('SELECT id, fingerprint, status FROM shining_enquiries WHERE request_key = ?',[requestKey]))[0];
    if(previous)return previous.fingerprint===fingerprint?{...previous,existing:true}:{conflict:true};
    const window=Math.floor(now/900000),day=Math.floor(now/86400000);
    const buckets=[['email:'+hash(data.email.toLowerCase())+':'+window,5,(window+1)*900000],['global:'+window,20,(window+1)*900000],['daily:'+day,80,(day+1)*86400000]];
    if(clientAddress)buckets.push(['network:'+hash(clientAddress)+':'+window,10,(window+1)*900000]);
    for(const [bucket,max] of buckets){const row=(await run('SELECT hits FROM shining_enquiry_limits WHERE bucket = ?',[bucket]))[0];if(row&&row.hits>=max)return {limited:true};}
    for(const [bucket,,expires] of buckets)await run('INSERT INTO shining_enquiry_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT (bucket) DO UPDATE SET hits = shining_enquiry_limits.hits + 1',[bucket,expires]);
    const id=randomUUID();
    await run('INSERT INTO shining_enquiries (id,request_key,fingerprint,payload,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?)',[id,requestKey,fingerprint,encrypt({data,requestId}),'processing',now,now+retentionDays*86400000]);
    return {id,status:'processing',existing:false};
   });
  },
  async finish(id,status){if(!['sent','attention'].includes(status))throw Error('Invalid delivery status');await query('UPDATE shining_enquiries SET status = ? WHERE id = ?',[status,id]);},
  async list(){return query('SELECT id,status,created_at,expires_at FROM shining_enquiries WHERE expires_at >= ? ORDER BY created_at DESC',[Date.now()]);},
  async read(id){const row=(await query('SELECT payload FROM shining_enquiries WHERE id = ? AND expires_at >= ?',[id,Date.now()]))[0];return row?decrypt(row.payload):null;},
  async prune(){await query('DELETE FROM shining_enquiries WHERE expires_at < ?',[Date.now()]);await query('DELETE FROM shining_enquiry_limits WHERE expires_at < ?',[Date.now()]);},
  async remove(id){await query('DELETE FROM shining_enquiries WHERE id = ?',[id]);},
  close
 };
}

export function getEnquiryStore(env,local=false){
 if(!local&&storageIssues(env).length)throw Error('Persistent enquiry storage is not configured');
 const directory=env.ENQUIRY_STORAGE_DIR||path.resolve('.data/enquiries');
 const cacheKey=createHmac('sha256','store-cache').update(JSON.stringify([directory,env.ENQUIRY_DATABASE_URL,env.ENQUIRY_DATA_KEY])).digest('hex');
 if(!stores.has(cacheKey)){const pending=createEnquiryStore({directory,databaseUrl:env.ENQUIRY_DATABASE_URL,key:env.ENQUIRY_DATA_KEY});stores.set(cacheKey,pending);pending.catch(()=>stores.delete(cacheKey));}
 return stores.get(cacheKey);
}
