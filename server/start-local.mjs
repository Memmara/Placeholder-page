// Start the local Memmara app and its PostgreSQL-backed account/game API.
import './env.mjs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import pg from '../database/node_modules/pg/lib/index.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const children=[];
let stopping=false;
function shutdown(code=0){
 if(stopping)return;
 stopping=true;
 for(const child of [...children].reverse())child.kill('SIGINT');
 setTimeout(()=>process.exit(code),1500).unref();
}
function launch(file,args=[],required=false){
 const child=spawn(process.execPath,[path.join(root,file),...args],{cwd:root,stdio:'inherit',windowsHide:true});
 children.push(child);
 child.on('error',error=>{console.error(file+': '+error.message);if(required)shutdown(1)});
 child.on('exit',code=>{if(!stopping){console.error(file+' stopped'+(code===null?'':` (exit ${code})`)+'.');if(required)shutdown(code??1)}});
 return child;
}
async function ready(url){
 for(let attempt=0;attempt<40;attempt++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(1500)});if(response.ok)return true}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 return false;
}
process.on('SIGINT',()=>shutdown());
process.on('SIGTERM',()=>shutdown());

if(!fs.existsSync(path.join(root,'.local-db/credentials.json'))){
 console.error('Memmara did not start because the local account database is not configured. Run database setup first.');
 shutdown(1);
}else{
 const database=launch('database/database.mjs',['serve'],true);
 let connected=false;
 for(let attempt=0;attempt<60&&database.exitCode===null;attempt++){
  try{
   const credentials=JSON.parse(fs.readFileSync(path.join(root,'.local-db/credentials.json'),'utf8'));
   // The database child migrates the previous internal names before the game starts.
   if(credentials.database==='memmara'){
    const client=new pg.Client({...credentials,connectionTimeoutMillis:1000});
    try{await client.connect();await client.query('SELECT 1');connected=true;break}
    finally{await client.end().catch(()=>{})}
   }
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!connected){
  console.error('Memmara did not start because the account database did not become ready. Check the database error above.');
  shutdown(1);
 }else{
  launch('server/game.mjs',[],true);
  if(await ready('http://127.0.0.1:5178/api/game/health')){
   launch('node_modules/vite/bin/vite.js',['--host','localhost','--port','5173','--strictPort'],true);
   console.log('Memmara account service is ready. Open http://localhost:5173/ when VITE says ready.');
  }else{
   console.error('Memmara did not start because the account service did not become ready. Check the error above.');
   shutdown(1);
  }
 }
}
