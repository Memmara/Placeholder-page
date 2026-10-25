const raw=process.argv[2]??process.env.MEMMARA_SMOKE_URL;
if(!raw)throw new Error('Provide the deployed URL, for example: pnpm smoke:production -- https://memmara.com');
const base=new URL(raw);
if(!['https:'].includes(base.protocol)&&!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('Production smoke tests require HTTPS.');

const timeout=10_000;
async function request(path,accept='text/html'){
 const response=await fetch(new URL(path,base),{headers:{Accept:accept},redirect:'follow',signal:AbortSignal.timeout(timeout)});
 const text=await response.text();
 return {response,text};
}
function requireThat(value,message){if(!value)throw new Error(message)}
function security(response,label){
 requireThat(response.headers.get('x-content-type-options')==='nosniff',`${label} is missing MIME-sniffing protection.`);
 requireThat(response.headers.get('x-frame-options')==='DENY',`${label} is missing clickjacking protection.`);
 requireThat(!!response.headers.get('referrer-policy'),`${label} is missing a referrer policy.`);
 if(base.protocol==='https:')requireThat(!!response.headers.get('strict-transport-security'),`${label} is missing HTTPS enforcement.`);
}

const home=await request('/');
requireThat(home.response.ok,`Homepage returned ${home.response.status}.`);
requireThat(/Memmara/i.test(home.text),'Homepage did not contain Memmara branding.');
security(home.response,'Homepage');

const health=await request('/api/game/health','application/json');
requireThat(health.response.ok,`Database health check returned ${health.response.status}.`);
const healthJson=JSON.parse(health.text);
requireThat(healthJson.ready===true&&healthJson.database==='connected','Database health check did not report ready.');
requireThat(health.response.headers.get('cache-control')?.includes('no-store'),'Health response may be cached.');
security(health.response,'API');

const providers=await request('/api/auth/providers','application/json');
requireThat(providers.response.ok,`Provider check returned ${providers.response.status}.`);
const providerJson=JSON.parse(providers.text);
for(const provider of ['google','apple','microsoft'])requireThat(typeof providerJson[provider]==='boolean',`Provider check omitted ${provider}.`);

const me=await request('/api/auth/me','application/json');
requireThat(me.response.ok,`Anonymous session check returned ${me.response.status}.`);
requireThat(JSON.parse(me.text).user===null,'Anonymous request unexpectedly returned a user.');

for(const path of ['/.env','/.env.local','/.git/config']){
 const probe=await request(path,'text/plain');
 requireThat(!/DATABASE_URL|STRIPE_SECRET|PRIVATE KEY|repositoryformatversion/i.test(probe.text),`${path} exposed sensitive configuration.`);
}

console.log(JSON.stringify({
 ok:true,
 origin:base.origin,
 database:healthJson.database,
 providers:providerJson,
 checks:['homepage','security headers','database health','anonymous auth','provider status','secret-file exposure'],
},null,2));
