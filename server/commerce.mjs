import crypto from 'node:crypto';
import {pool} from './catalogue.mjs';
import {rate} from './auth.mjs';

const PRODUCTS={
 tokens_5:{productId:'stripe_tokens_5',priceEnv:'MEMMARA_STRIPE_PRICE_TOKENS_5',amount:99,tokens:5,mode:'payment'},
 tokens_10:{productId:'stripe_tokens_10',priceEnv:'MEMMARA_STRIPE_PRICE_TOKENS_10',amount:179,tokens:10,mode:'payment'},
 plan_plus:{productId:'stripe_plan_plus',priceEnv:'MEMMARA_STRIPE_PRICE_PLUS',amount:299,plan:'plus',mode:'subscription'},
 plan_pro:{productId:'stripe_plan_pro',priceEnv:'MEMMARA_STRIPE_PRICE_PRO',amount:999,plan:'pro',mode:'subscription'},
 pet_dougie:{productId:'stripe_pet_dougie',priceEnv:'MEMMARA_STRIPE_PRICE_DOUGIE',amount:99,itemId:'itm_301',mode:'payment'},
 pet_dotty:{productId:'stripe_pet_dotty',priceEnv:'MEMMARA_STRIPE_PRICE_DOTTY',amount:99,itemId:'itm_302',mode:'payment'}
};
const json=(res,status,value)=>{res.statusCode=status;res.end(JSON.stringify(value))};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const production=process.env.NODE_ENV==='production'||String(process.env.MEMMARA_PUBLIC_URL??'').startsWith('https://');
async function read(req,limit=1_000_000){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>limit)throw fail('Request too large.',413)}return raw}
export const commerceConfigured=()=>process.env.MEMMARA_COMMERCE_ENABLED==='1'&&!!process.env.MEMMARA_STRIPE_SECRET_KEY;

async function stripe(method,path,params,headers={}){
 const body=params?new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v)])):undefined;
 const response=await fetch('https://api.stripe.com/v1/'+path,{method,headers:{Authorization:`Bearer ${process.env.MEMMARA_STRIPE_SECRET_KEY}`,...headers,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body});
 const data=await response.json();if(!response.ok)throw fail(data.error?.message??'Stripe could not complete this request.',502);return data;
}
async function customerFor(user){
 const row=(await pool.query(`SELECT m.stripe_customer_id,COALESCE(c.email,a.email) email,u.display_name,u.purchases_disabled,u.account_type FROM user_monetisation m JOIN users u ON u.id=m.user_id LEFT JOIN auth_credentials c ON c.user_id=u.id LEFT JOIN auth_account_emails a ON a.user_id=u.id WHERE m.user_id=$1`,[user])).rows[0];
 if(!row)throw fail('Account could not be loaded.',404);
 if(row.account_type==='school_managed')throw fail('Purchases are unavailable on school-managed accounts.',403);
 if(row.purchases_disabled&&production)throw fail('Purchases are disabled for this account.',403);
 if(row.stripe_customer_id)return row.stripe_customer_id;
 const customer=await stripe('POST','customers',{email:row.email,name:row.display_name,'metadata[memmara_user_id]':user});
 await pool.query('UPDATE user_monetisation SET stripe_customer_id=$2 WHERE user_id=$1',[user,customer.id]);return customer.id;
}
function product(code){const value=PRODUCTS[code];if(!value)throw fail('Unknown shop item.',404);return value}
async function createPayment(user,body){
 if(!commerceConfigured())throw fail('Payments are not configured in this preview yet.',503);
 if(['plan_pro','pet_dougie','pet_dotty'].includes(body.productCode))throw fail('This item is not available for Stripe purchase.',410);
 const item=product(body.productCode),customer=await customerFor(user),publicUrl=process.env.MEMMARA_PUBLIC_URL??'http://localhost:5173';
 if(body.platform==='mobile'){
  if(!process.env.MEMMARA_STRIPE_PUBLISHABLE_KEY)throw fail('Mobile payments are not configured yet.',503);
  const ephemeral=await stripe('POST','ephemeral_keys',{customer},{'Stripe-Version':'2024-12-18.acacia'});let intent;
  if(item.mode==='subscription'){
   const nativePrice=process.env[item.priceEnv];if(!nativePrice)throw fail('This Stripe price has not been configured yet.',503);
   const subscription=await stripe('POST','subscriptions',{customer,'items[0][price]':nativePrice,payment_behavior:'default_incomplete','payment_settings[save_default_payment_method]':'on_subscription','expand[0]':'latest_invoice.payment_intent','metadata[memmara_user_id]':user,'metadata[product_code]':body.productCode});
   intent=subscription.latest_invoice?.payment_intent;if(!intent?.client_secret)throw fail('Stripe could not prepare this subscription.',502);
   await stripe('POST','payment_intents/'+intent.id,{'metadata[memmara_user_id]':user,'metadata[product_code]':body.productCode,'metadata[product_id]':item.productId,'metadata[subscription_id]':subscription.id});
  }else intent=await stripe('POST','payment_intents',{amount:item.amount,currency:'gbp',customer,'automatic_payment_methods[enabled]':'true','metadata[memmara_user_id]':user,'metadata[product_code]':body.productCode,'metadata[product_id]':item.productId});
  return {kind:'payment_sheet',publishableKey:process.env.MEMMARA_STRIPE_PUBLISHABLE_KEY,customerId:customer,customerEphemeralKeySecret:ephemeral.secret,paymentIntentClientSecret:intent.client_secret,paymentIntentId:intent.id};
 }
 const price=process.env[item.priceEnv];if(!price)throw fail('This Stripe price has not been configured yet.',503);
 const session=await stripe('POST','checkout/sessions',{
  mode:item.mode,customer,'line_items[0][price]':price,'line_items[0][quantity]':1,client_reference_id:user,
  success_url:`${publicUrl}/shop?payment=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${publicUrl}/shop?payment=cancelled`,
  'metadata[memmara_user_id]':user,'metadata[product_code]':body.productCode,'metadata[product_id]':item.productId,
  ...(item.mode==='subscription'?{'subscription_data[metadata][memmara_user_id]':user,'subscription_data[metadata][product_code]':body.productCode}:{})
 });
 return {kind:'checkout',url:session.url};
}
async function fulfil(user,code,transactionId,platform='stripe_web'){
 const item=product(code),db=await pool.connect();
 try{await db.query('BEGIN');await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);
  const purchase=(await db.query(`INSERT INTO purchases(user_id,product_id,platform,provider_transaction_id,state,region,currency,minor_units,price_snapshot,idempotency_key,request_hash) VALUES($1,$2,$3,$4,'granted','GB','GBP',$5,$6,$7,$8) ON CONFLICT(platform,provider_transaction_id) DO NOTHING RETURNING id`,[user,item.productId,platform,transactionId,item.amount,{productCode:code,amount:item.amount,currency:'GBP'},'stripe:'+transactionId,crypto.createHash('sha256').update(user+code+transactionId).digest('hex')])).rows[0];
  if(!purchase){await db.query('ROLLBACK');return false;}
  if(item.tokens)await db.query('UPDATE user_monetisation SET purchased_tokens=purchased_tokens+$2,updated_at=now() WHERE user_id=$1',[user,item.tokens]);
  if(item.itemId)await db.query("INSERT INTO inventory(user_id,item_id,provenance) VALUES($1,$2,'premium_purchase') ON CONFLICT(user_id,item_id) DO UPDATE SET revoked_at=NULL",[user,item.itemId]);
  if(item.plan)await db.query('UPDATE user_monetisation SET account_plan=$2,updated_at=now() WHERE user_id=$1',[user,item.plan]);
  await db.query('COMMIT');return true;
 }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
}
function verifyWebhook(raw,signature){
 const secret=process.env.MEMMARA_STRIPE_WEBHOOK_SECRET;if(!secret||!signature)throw fail('Webhook signature missing.',400);
 const parts=Object.fromEntries(String(signature).split(',').map(part=>part.split('='))),timestamp=Number(parts.t),provided=parts.v1;if(!timestamp||!provided||Math.abs(Date.now()/1000-timestamp)>300)throw fail('Webhook signature expired.',400);
 const expected=crypto.createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex');const a=Buffer.from(expected),b=Buffer.from(provided);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw fail('Webhook signature invalid.',400);
}
async function processEvent(event){
 const object=event.data?.object??{},metadata=object.metadata??{};
 if(event.type==='checkout.session.completed'&&metadata.memmara_user_id&&metadata.product_code)await fulfil(metadata.memmara_user_id,metadata.product_code,object.id,'stripe_checkout');
 if(event.type==='payment_intent.succeeded'&&metadata.memmara_user_id&&metadata.product_code)await fulfil(metadata.memmara_user_id,metadata.product_code,object.id,'stripe_payment_sheet');
 if(event.type.startsWith('customer.subscription.')){
  const user=metadata.memmara_user_id,code=metadata.product_code;if(!user||!code)return;const item=product(code),active=['active','trialing'].includes(object.status);
  await pool.query(`UPDATE user_monetisation SET account_plan=$2,stripe_subscription_id=$3,subscription_status=$4,subscription_current_period_end=to_timestamp($5),updated_at=now() WHERE user_id=$1`,[user,active?item.plan:'free',object.id,object.status,object.current_period_end??0]);
 }
}
async function webhook(req,res){
 const raw=await read(req);verifyWebhook(raw,req.headers['stripe-signature']);const event=JSON.parse(raw);
 if(!event.id||!event.type)throw fail('Webhook payload is invalid.',400);
 const stored=(await pool.query('INSERT INTO stripe_webhook_events(event_id,event_type,payload) VALUES($1,$2,$3) ON CONFLICT(event_id) DO UPDATE SET payload=excluded.payload RETURNING processed_at',[event.id,event.type,event])).rows[0];
 if(!stored.processed_at)try{await processEvent(event);await pool.query('UPDATE stripe_webhook_events SET processed_at=now(),error=NULL WHERE event_id=$1',[event.id])}catch(error){await pool.query('UPDATE stripe_webhook_events SET error=$2 WHERE event_id=$1',[event.id,String(error.message).slice(0,500)]);throw error}
 json(res,200,{received:true});
}
export async function handleCommerce(req,res,url,user){
 try{
  const route=url.pathname.slice('/api/commerce/'.length);
  if(route==='webhook'){await webhook(req,res);return}
  if(!user)throw fail('Sign in required.',401);
  if(req.method==='GET'&&route==='status'){json(res,200,{ok:true,configured:commerceConfigured()});return}
  if(req.method!=='POST')throw fail('Method not allowed.',405);
  await rate('commerce-write:'+user,20,15);
  const body=JSON.parse(await read(req)||'{}');
  if(route==='create-payment'){json(res,200,await createPayment(user,body));return}
  if(route==='confirm-mobile-payment'){
   if(!commerceConfigured())throw fail('Payments are not configured.',503);const intent=await stripe('GET','payment_intents/'+encodeURIComponent(body.paymentIntentId));if(intent.status!=='succeeded')throw fail('Payment has not completed.',409);
   if(intent.metadata?.memmara_user_id!==user)throw fail('Payment account mismatch.',403);await fulfil(user,intent.metadata.product_code,intent.id,'stripe_payment_sheet');json(res,200,{ok:true});return;
  }
  throw fail('Not found.',404);
 }catch(error){json(res,error.status??500,{error:error.status?error.message:'Payment failed, please try again.'})}
}
