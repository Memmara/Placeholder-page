import {Readable} from 'node:stream';

type Env={HYPERDRIVE?:{connectionString:string};MEMMARA_DATABASE_URL?:string;DATABASE_URL?:string;[key:string]:unknown};
let configured=false;
function configure(env:Env){
 if(configured)return;
 const database=env.HYPERDRIVE?.connectionString||env.MEMMARA_DATABASE_URL||env.DATABASE_URL;
 if(!database)throw new Error('Add a Hyperdrive binding named HYPERDRIVE or provide DATABASE_URL.');
 process.env.MEMMARA_DATABASE_URL=database;
 for(const [key,value] of Object.entries(env))if(key.startsWith('MEMMARA_')&&typeof value==='string')process.env[key]=value;
 process.env.MEMMARA_PUBLIC_URL=process.env.MEMMARA_PUBLIC_URL??'https://memmara.com';
 configured=true;
}

export const onRequest=async(context:any):Promise<Response>=>{
 try{
  configure(context.env as Env);
  const request=context.request as Request,url=new URL(request.url),body=request.method==='GET'||request.method==='HEAD'?null:Buffer.from(await request.arrayBuffer());
  const req=Readable.from(body?[body]:[]) as any;req.method=request.method;req.url=url.pathname+url.search;req.headers=Object.fromEntries(request.headers.entries());req.socket={remoteAddress:request.headers.get('CF-Connecting-IP')??'0.0.0.0'};
  const headers=new Map<string,string|string[]>();let resolveResponse!:(response:Response)=>void;
  const responsePromise=new Promise<Response>(resolve=>{resolveResponse=resolve});
  const res:any={statusCode:200,setHeader(name:string,value:string|string[]){headers.set(name.toLowerCase(),value)},getHeader(name:string){return headers.get(name.toLowerCase())},end(value?:string|Uint8Array){const output=new Headers();for(const [name,entry] of headers)for(const part of Array.isArray(entry)?entry:[entry])output.append(name,String(part));resolveResponse(new Response(value??null,{status:res.statusCode,headers:output}))}};
  const {handleApiRequest}=await import('../../server/game.mjs');
  context.waitUntil?.(Promise.resolve());void handleApiRequest(req,res);return await responsePromise;
 }catch(error){console.error('Memmara Pages API:',error);return Response.json({error:'The account service is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}
};
