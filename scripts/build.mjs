import {spawnSync} from 'node:child_process';
import {readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** Drop macOS AppleDouble sidecars (._*) that external volumes recreate and that break OpenNext page tracing. */
async function stripAppleDouble(dir){
 let entries;try{entries=await readdir(dir,{withFileTypes:true})}catch(error){if(error.code==='ENOENT')return;throw error;}
 await Promise.all(entries.map(async entry=>{
  const target=path.join(dir,entry.name);
  if(entry.name.startsWith('._'))await rm(target,{force:true,recursive:true});
  else if(entry.isDirectory())await stripAppleDouble(target);
 }));
}

const root=fileURLToPath(new URL('../',import.meta.url));
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,COPYFILE_DISABLE:'1',NEXT_TELEMETRY_DISABLED:'1'}});
if(result.status!==0)process.exit(result.status??1);
await stripAppleDouble(path.join(root,'.next'));
const {readBuildArtifacts}=await import('./build-artifacts.mjs');
const {secureBuild}=await import('./secure-build.mjs');
const artifacts=await readBuildArtifacts({projectDir:root});
await secureBuild({projectDir:root,...artifacts});
await stripAppleDouble(path.join(root,'.next'));
