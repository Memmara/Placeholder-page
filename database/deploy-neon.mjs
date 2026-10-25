import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'database/migrations/001-base.sql');
const envFile=path.join(root,'.env.local');if(fs.existsSync(envFile))process.loadEnvFile(envFile);
const connectionString=process.env.DATABASE_URL_UNPOOLED??process.env.MEMMARA_DATABASE_URL??process.env.DATABASE_URL;
if(!connectionString)throw new Error('Run Neon env pull first. Memmara needs DATABASE_URL_UNPOOLED for migrations.');
const db=new pg.Client({connectionString,ssl:{rejectUnauthorized:true},application_name:'memmara_neon_deployer'});
await db.connect();
try{
 const version=Number((await db.query('SHOW server_version_num')).rows[0].server_version_num);if(version<160000)throw new Error('Memmara requires PostgreSQL 16 or newer.');
 const sql=fs.readFileSync(file,'utf8'),hash=crypto.createHash('sha256').update(sql).digest('hex'),body=sql.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('memmara.game.schema'))");
 await db.query('CREATE TABLE IF NOT EXISTS public.memmara_schema_migrations (id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 const applied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='memmara_game_system_v1'")).rows[0];
 if(applied&&applied.sha256!==hash)throw new Error('The Neon base schema differs from the tracked migration.');
 if(!applied){await db.query(body);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('memmara_game_system_v1',$1)",[hash]);}
 await db.query('COMMIT');
}catch(error){await db.query('ROLLBACK').catch(()=>{});throw error}finally{await db.end()}

// Catalogue seeding requires a direct session because it sets search_path in
// the PostgreSQL startup options. Do not fall back to Neon's transaction pool.
process.env.MEMMARA_DATABASE_URL=connectionString;
const {seed,pool}=await import('../server/catalogue.mjs');
await seed();await pool.end();
console.log('Neon schema, account system, economy and catalogue are ready.');
