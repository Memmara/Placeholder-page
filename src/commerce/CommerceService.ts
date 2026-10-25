export type ProductCode='tokens_5'|'tokens_10'|'plan_plus'|'plan_pro'|'pet_dougie'|'pet_dotty';

declare global{interface Window{Capacitor?:{isNativePlatform?:()=>boolean;getPlatform?:()=>string;Plugins?:Record<string,any>}}}

const nativePlatform=()=>!!(window.Capacitor?.isNativePlatform?.()||['ios','android'].includes(window.Capacitor?.getPlatform?.()??''));

async function request<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/commerce/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({}));
 if(response.status===401){location.assign('/login?next='+encodeURIComponent('/shop'));throw Error('Sign in to continue.');}
 if(!response.ok)throw Error(data.error??'Payment failed, please try again.');
 return data as T;
}

async function openExternal(url:string){
 const browser=window.Capacitor?.Plugins?.Browser;if(browser?.open){await browser.open({url});return;}
 const app=window.Capacitor?.Plugins?.App;if(app?.openUrl){await app.openUrl({url});return;}
 location.assign(url);
}

export async function purchase(productCode:ProductCode){
 const result=await request<any>('create-payment',{productCode,platform:nativePlatform()?'mobile':'web'});
 if(result.kind==='checkout'){await openExternal(result.url);return;}
 if(result.kind!=='payment_sheet')throw Error('Payment failed, please try again.');
 const moduleName='@capacitor-community/stripe';let module:any;
 try{module=await import(/* @vite-ignore */ moduleName)}catch{throw Error('Mobile payments are unavailable in this build.');}
 const Stripe=window.Capacitor?.Plugins?.Stripe??module?.Stripe;
 if(!Stripe)throw Error('Mobile payments are unavailable in this build.');
 await Stripe.initialize({publishableKey:result.publishableKey});
 await Stripe.createPaymentSheet({paymentIntentClientSecret:result.paymentIntentClientSecret,customerId:result.customerId,customerEphemeralKeySecret:result.customerEphemeralKeySecret,merchantDisplayName:'Memmara'});
 const presented=await Stripe.presentPaymentSheet();
 if(presented?.paymentResult&&presented.paymentResult!=='paymentSheetCompleted')throw Error('Payment failed, please try again.');
 return request('confirm-mobile-payment',{paymentIntentId:result.paymentIntentId});
}

export const refreshPurchase=()=>request<{ok:boolean}>('status');
export async function openShopForTokens(){
 const target='/shop?reason=out-of-tokens';
 if(nativePlatform()&&window.Capacitor?.Plugins?.App?.openUrl){await window.Capacitor.Plugins.App.openUrl({url:target});return;}
 location.assign(target);
}
