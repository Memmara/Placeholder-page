import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const moduleUrl=import.meta.url;
const file=moduleUrl?path.resolve(path.dirname(fileURLToPath(moduleUrl)),'../.env.local'):null;
if(file&&fs.existsSync(file))process.loadEnvFile(file);
if(process.env.NODE_ENV==='production'){
 // Keep the API available when optional integrations have not been configured yet.
 // Email routes already fail closed in auth.mjs if Resend credentials are absent.
 const required=['MEMMARA_PUBLIC_URL','MEMMARA_DATABASE_URL'];
 const missing=required.filter(name=>!process.env[name]);
 if(missing.length)throw Error(`Production account configuration missing: ${missing.join(', ')}`);
 if(new URL(process.env.MEMMARA_PUBLIC_URL).protocol!=='https:')throw Error('Production accounts require an HTTPS public URL.');
}
