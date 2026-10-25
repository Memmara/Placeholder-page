import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import pg from 'pg';
import {initdb,pg_ctl} from '@embedded-postgres/windows-x64';

const run=promisify(execFile),here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,'..'),privateDir=path.join(project,'.local-db');
const dataDir=path.join(privateDir,'data'),credentialsFile=path.join(privateDir,'credentials.json');
const schemaFile=path.resolve(project,'..','memmara-game-system','schema.sql');
const migrationId='memmara_game_system_v1';
const nativeOptions={windowsHide:true,timeout:120000,maxBuffer:1024*1024};
function runControl(args){return new Promise((resolve,reject)=>{const child=spawn(pg_ctl,args,{windowsHide:true,stdio:'ignore'});const timeout=setTimeout(()=>{child.kill();reject(Error('PostgreSQL controller timed out. Inspect .local-db/postgres.log.'))},70000);child.once('error',error=>{clearTimeout(timeout);reject(error)});child.once('exit',code=>{clearTimeout(timeout);code===0?resolve():reject(Error('PostgreSQL controller exited with code '+code))})})}

async function protectDirectory(){
 fs.mkdirSync(privateDir,{recursive:true});
 if(process.platform!=='win32')throw Error('This local runtime is configured for Windows x64.');
 const identity=await run('whoami.exe',['/user','/fo','csv','/nh'],nativeOptions);
 const sid=identity.stdout.match(/S-1-\d+(?:-\d+)+/)?.[0];
 if(!sid)throw Error('Cannot resolve the current Windows account for private database access.');
 await run('icacls.exe',[privateDir,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`],nativeOptions);
}
function loadConfig(){if(!fs.existsSync(credentialsFile))throw Error('Run setup first.');return JSON.parse(fs.readFileSync(credentialsFile,'utf8'));}
function client(config,database=config.database){return new pg.Client({...config,database,connectionTimeoutMillis:8000,application_name:'memmara_schema_manager'});}
async function migrateLegacyNames(){
 const config=loadConfig(),legacy=['mem','ra'].join('');
 if(config.database!==(legacy))return;
 const admin=client(config,'postgres');await admin.connect();
 const temporary='memmara_rename_'+crypto.randomBytes(6).toString('hex'),temporaryPassword=crypto.randomBytes(32).toString('hex');
 try{await admin.query(`CREATE ROLE "${temporary}" WITH LOGIN SUPERUSER PASSWORD '${temporaryPassword}'`);}
 finally{await admin.end();}
 const manager=client({...config,user:temporary,password:temporaryPassword},'postgres');await manager.connect();
 try{
  await manager.query(`ALTER DATABASE "${legacy}" WITH ALLOW_CONNECTIONS false`);
  await manager.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[legacy]);
  await manager.query(`ALTER DATABASE "${legacy}" RENAME TO memmara`);
  await manager.query('ALTER DATABASE memmara WITH ALLOW_CONNECTIONS true');
  await manager.query(`ALTER ROLE "${config.user}" RENAME TO memmara_owner`);
  await manager.query('ALTER DATABASE memmara OWNER TO memmara_owner');
 }catch(error){await manager.query(`ALTER DATABASE "${legacy}" WITH ALLOW_CONNECTIONS true`).catch(()=>{});await manager.query('ALTER DATABASE memmara WITH ALLOW_CONNECTIONS true').catch(()=>{});throw error;}
 finally{await manager.end();}
 const renamed={...config,database:'memmara',user:'memmara_owner'},db=client(renamed);await db.connect();
 try{
  await db.query('BEGIN');
  await db.query(`ALTER SCHEMA "${legacy}_game" RENAME TO memmara_game`);
  await db.query(`ALTER TABLE public."${legacy}_schema_migrations" RENAME TO memmara_schema_migrations`);
  await db.query('ALTER FUNCTION memmara_game.apply_wallet_delta() SET search_path=memmara_game,pg_temp');
  const cosmetic=fs.readFileSync(path.join(here,'migrations/003-cosmetic-presentations.sql'),'utf8').match(/CREATE FUNCTION memmara_game\.check_cosmetic_equipment\(\)[\s\S]*?\$\$;/)?.[0];
  if(cosmetic)await db.query(cosmetic.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));
  for(const [id,file] of [['memmara_game_system_v1',schemaFile],['002_local_game',path.join(here,'migrations/002-local-game.sql')],['003_cosmetic_presentations',path.join(here,'migrations/003-cosmetic-presentations.sql')]]){
   const hash=crypto.createHash('sha256').update(fs.readFileSync(file,'utf8')).digest('hex');
   await db.query('UPDATE public.memmara_schema_migrations SET id=$1,sha256=$2 WHERE id=$3',[id,hash,id==='memmara_game_system_v1'?legacy+'_game_system_v1':id]);
  }
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}finally{await db.end();}
 fs.writeFileSync(credentialsFile,JSON.stringify(renamed,null,2));
 const cleanup=client(renamed,'postgres');await cleanup.connect();
 try{await cleanup.query(`DROP ROLE IF EXISTS "${temporary}"`);}finally{await cleanup.end();}
 await applySchema();
 const statusFile=path.resolve(project,'..','memmara-game-system','local-database-status.json');
 if(fs.existsSync(statusFile)){const report=JSON.parse(fs.readFileSync(statusFile,'utf8'));fs.writeFileSync(statusFile,JSON.stringify({...report,status:'RENAMED_AND_SCHEMA_VERIFIED',verified_at:new Date().toISOString()},null,2)+'\n');}
 console.log('Local PostgreSQL names migrated to Memmara.');
}
async function initialise(){
 await protectDirectory();
 if(!fs.existsSync(credentialsFile)){
  if(fs.existsSync(path.join(dataDir,'PG_VERSION')))throw Error('Existing cluster has no saved credentials; refusing to replace it.');
  const config={host:'127.0.0.1',port:54329,user:'memmara_owner',password:crypto.randomBytes(32).toString('hex'),database:'memmara'};
  fs.writeFileSync(credentialsFile,JSON.stringify(config,null,2),{mode:0o600,flag:'wx'});
 }
 const config=loadConfig();
 if(!fs.existsSync(path.join(dataDir,'PG_VERSION'))){
  const pwfile=path.join(privateDir,'init-password.tmp');
  fs.writeFileSync(pwfile,config.password+'\n',{mode:0o600});
  try{await run(initdb,['-D',dataDir,'-U',config.user,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C',`--pwfile=${pwfile}`],nativeOptions);}
  finally{fs.rmSync(pwfile,{force:true});}
 }
}
async function isRunning(){
 if(!fs.existsSync(credentialsFile))return false;
 const db=client(loadConfig(),'postgres');
 try{await db.connect();const actual=(await db.query('SHOW data_directory')).rows[0].data_directory;
  if(path.resolve(actual).toLowerCase()!==path.resolve(dataDir).toLowerCase())throw Error('The configured port belongs to another PostgreSQL cluster.');return true;
 }catch(error){if(error.code==='ECONNREFUSED')return false;throw error;}
 finally{await db.end().catch(()=>{});}
}
async function start(){
 const config=loadConfig();if(await isRunning())return;
 await runControl(['-D',dataDir,'-l',path.join(privateDir,'postgres.log'),'-o',`-h 127.0.0.1 -p ${config.port} -c max_connections=30 -c shared_buffers=64MB -c timezone=Europe/London -c log_statement=none`,'-w','-t','60','start']);
}
async function createDatabase(){
 const config=loadConfig(),admin=client(config,'postgres');await admin.connect();
 try{if(!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[config.database])).rowCount){await admin.query('CREATE DATABASE memmara OWNER memmara_owner');}}
 finally{await admin.end();}
}
export async function applySchema(){
 const config=loadConfig(),db=client(config);await db.connect();
 try{
  const version=Number((await db.query('SHOW server_version_num')).rows[0].server_version_num);
  if(version<160000)throw Error('PostgreSQL 16 or newer is required.');
  const sql=fs.readFileSync(schemaFile,'utf8'),hash=crypto.createHash('sha256').update(sql).digest('hex');
  const body=sql.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('memmara.game.schema'))");
  await db.query('CREATE TABLE IF NOT EXISTS public.memmara_schema_migrations (id text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const existing=(await db.query('SELECT sha256 FROM public.memmara_schema_migrations WHERE id=$1',[migrationId])).rows[0];
  if(existing){if(existing.sha256!==hash)throw Error('The applied migration differs from schema.sql. Create a new migration instead of replacing it.');}
  else{
   if((await db.query("SELECT 1 FROM pg_namespace WHERE nspname='memmara_game'")).rowCount)throw Error('Untracked memmara_game schema exists. Refusing to overwrite it.');
   await db.query(body);
   await db.query('INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES($1,$2)',[migrationId,hash]);
  }
  await db.query('COMMIT');
  const rows=(await db.query("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='memmara_game' ORDER BY tablename")).rows;
  const result={status:existing?'already_applied':'applied',database:config.database,host:config.host,port:config.port,postgres_version:version,schema:'memmara_game',table_count:rows.length,rls_table_count:rows.filter(x=>x.rowsecurity).length,sha256:hash};
  fs.writeFileSync(path.join(here,'applied-schema.json'),JSON.stringify({...result,verified_at:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify(result));
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}
 finally{await db.end();}
}
async function status(){
 const running=fs.existsSync(path.join(dataDir,'PG_VERSION'))&&await isRunning();
 if(!running){console.log(JSON.stringify({running:false,data_preserved:fs.existsSync(path.join(dataDir,'PG_VERSION'))}));return;}
 const config=loadConfig(),db=client(config);await db.connect();
 try{const result=(await db.query("SELECT current_database() AS database, current_setting('listen_addresses') AS listen_addresses, current_setting('server_version') AS version, (SELECT count(*)::int FROM pg_tables WHERE schemaname='memmara_game') AS tables, (SELECT count(*)::int FROM public.memmara_schema_migrations) AS migrations")).rows[0];console.log(JSON.stringify({running:true,...result,port:config.port}));}
 finally{await db.end();}
}
async function main(){
 const command=process.argv[2]??'status';
 if(command==='setup'){await initialise();await start();await migrateLegacyNames();await createDatabase();await applySchema();}
 else if(command==='start'){await start();await migrateLegacyNames();await status();}
 else if(command==='serve'){
  await start();await migrateLegacyNames();await status();console.log('Memmara PostgreSQL is available locally. Database files persist after shutdown.');
  await new Promise(resolve=>{const heartbeat=setInterval(()=>{},30000);const shutdown=async()=>{clearInterval(heartbeat);await runControl(['-D',dataDir,'-m','fast','-w','stop']).catch(()=>{});resolve()};process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown)});
 }
 else if(command==='stop'){if(await isRunning())await runControl(['-D',dataDir,'-m','fast','-w','stop']);console.log('PostgreSQL stopped; database files retained.');}
 else if(command==='apply'){await start();await migrateLegacyNames();await applySchema();}
 else if(command==='status')await status();
 else throw Error('Use setup, start, serve, stop, apply or status.');
}
if(path.resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);if(error.stderr)console.error(error.stderr);process.exitCode=1;});
