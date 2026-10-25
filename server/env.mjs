import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.env.local');
if(fs.existsSync(file))process.loadEnvFile(file);
if(process.env.NODE_ENV==='production'){
 const required=['MEMMARA_PUBLIC_URL','MEMMARA_DATABASE_URL','MEMMARA_RESEND_API_KEY','MEMMARA_EMAIL_FROM'];
 const missing=required.filter(name=>!process.env[name]);
 if(missing.length)throw Error(`Production account configuration missing: ${missing.join(', ')}`);
 if(new URL(process.env.MEMMARA_PUBLIC_URL).protocol!=='https:')throw Error('Production accounts require an HTTPS public URL.');
}
