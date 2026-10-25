import type {ActionResult,AdIntent,GameController} from '../GameService';

export type RewardKind='token'|'xp_boost';
export type AdOutcome={status:'rewarded'|'closed'|'unavailable'|'error';provider:'web_google'|'admob'|'development';message:string};
type CompleteReceipt={earned:boolean;providerTransactionId?:string};

declare global {
 interface Window {
  Capacitor?:{isNativePlatform?:()=>boolean;getPlatform?:()=>string;Plugins?:Record<string,any>};
  googletag?:any;
 }
}

function platform(){
 const capacitor=window.Capacitor;
 return capacitor?.isNativePlatform?.()||['ios','android'].includes(capacitor?.getPlatform?.()??'')?'admob':'web_google';
}

async function loadGoogleTag(){
 if(window.googletag?.apiReady)return;
 window.googletag=window.googletag||{cmd:[]};
 if(!document.querySelector('script[data-memmara-rewarded]')){
  const script=document.createElement('script');script.async=true;script.dataset.memmaraRewarded='true';script.src='https://securepubads.g.doubleclick.net/tag/js/gpt.js';document.head.append(script);
 }
 await new Promise<void>((resolve,reject)=>{const timeout=window.setTimeout(()=>reject(Error('The web ad service did not become ready.')),10000);window.googletag.cmd.push(()=>{window.clearTimeout(timeout);resolve()})});
}

async function showWebRewarded(intent:AdIntent):Promise<CompleteReceipt>{
 const adUnit=import.meta.env.VITE_MEMMARA_WEB_REWARDED_AD_UNIT as string|undefined;
 if(!adUnit)throw Error('Rewarded ads are not configured for this website yet.');
 await loadGoogleTag();
 return new Promise((resolve,reject)=>window.googletag.cmd.push(()=>{
  const g=window.googletag,slot=g.defineOutOfPageSlot(adUnit,g.enums.OutOfPageFormat.REWARDED);
  if(!slot){reject(Error('Rewarded ads are unavailable on this device.'));return;}
  slot.addService(g.pubads());slot.setTargeting('memmara_reward',intent.rewardKind);
  let earned=false,finished=false;
  const clean=()=>{if(finished)return;finished=true;g.pubads().removeEventListener('rewardedSlotReady',ready);g.pubads().removeEventListener('rewardedSlotGranted',granted);g.pubads().removeEventListener('rewardedSlotClosed',closed);g.destroySlots([slot]);};
  const ready=(event:any)=>{if(event.slot===slot)event.makeRewardedVisible()};
  const granted=(event:any)=>{if(event.slot===slot)earned=true};
  const closed=(event:any)=>{if(event.slot!==slot)return;clean();resolve({earned})};
  g.pubads().addEventListener('rewardedSlotReady',ready);g.pubads().addEventListener('rewardedSlotGranted',granted);g.pubads().addEventListener('rewardedSlotClosed',closed);
  g.enableServices();g.display(slot);
  window.setTimeout(()=>{if(!finished){clean();reject(Error('No rewarded ad is available right now.'))}},30000);
 }));
}

async function showAdMobRewarded(intent:AdIntent):Promise<CompleteReceipt>{
 const nativeAdMob=window.Capacitor?.Plugins?.AdMob,moduleName='@capacitor-community/admob';let plugin:any=null;
 if(!nativeAdMob)try{plugin=await import(/* @vite-ignore */ moduleName)}catch{throw Error('The AdMob mobile plugin is unavailable in this build.');}
 const AdMob=nativeAdMob??plugin?.AdMob,RewardAdPluginEvents=plugin?.RewardAdPluginEvents??{Rewarded:'onRewardedVideoAdReward',Dismissed:'onRewardedVideoAdDismissed',FailedToShow:'onRewardedVideoAdFailedToShow'},platformName=window.Capacitor?.getPlatform?.();
 const configured=(platformName==='ios'?import.meta.env.VITE_MEMMARA_ADMOB_IOS_REWARDED_ID:import.meta.env.VITE_MEMMARA_ADMOB_ANDROID_REWARDED_ID) as string|undefined;
 const adId=import.meta.env.DEV?(platformName==='ios'?'ca-app-pub-3940256099942544/1712485313':'ca-app-pub-3940256099942544/5224354917'):configured;
 if(!AdMob||!adId)throw Error('Rewarded ads are not configured for this mobile build.');
 await AdMob.initialize();
 return new Promise(async(resolve,reject)=>{
  let earned=false,transactionId:string|undefined;const handles:any[]=[];
  const remove=()=>handles.forEach(handle=>void handle.remove?.());
  handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded,(reward:any)=>{earned=true;transactionId=reward?.transactionId;}));
  handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed,()=>{remove();resolve({earned,providerTransactionId:transactionId})}));
  handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow,(reason:any)=>{remove();reject(Error(reason?.message??'The rewarded ad could not be shown.'))}));
  try{await AdMob.prepareRewardVideoAd({adId,isTesting:import.meta.env.DEV,ssv:{userId:intent.id,customData:intent.completionToken}});await AdMob.showRewardVideoAd();}catch(error){remove();reject(error)}
 });
}

async function showDevelopmentRewarded():Promise<CompleteReceipt>{
 if(import.meta.env.VITE_MEMMARA_ADS_SIMULATE!=='1')throw Error('No rewarded ad provider is available.');
 await new Promise(resolve=>window.setTimeout(resolve,900));return {earned:true,providerTransactionId:crypto.randomUUID()};
}

export async function showRewardedAd(game:GameController,rewardKind:RewardKind):Promise<AdOutcome>{
 let provider=platform() as 'web_google'|'admob'|'development';
 if(import.meta.env.DEV&&import.meta.env.VITE_MEMMARA_ADS_SIMULATE==='1')provider='development';
 try{
  const created=await game.action('ad-intent',{rewardKind,provider}) as ActionResult;if(!created.adIntent)throw Error('The reward could not be prepared.');
  const receipt=provider==='web_google'?await showWebRewarded(created.adIntent):provider==='admob'?await showAdMobRewarded(created.adIntent):await showDevelopmentRewarded();
  if(!receipt.earned)return {status:'closed',provider,message:'Ad closed before the reward was earned.'};
  await game.action('ad-complete',{intentId:created.adIntent.id,completionToken:created.adIntent.completionToken,providerTransactionId:receipt.providerTransactionId});
  return {status:'rewarded',provider,message:rewardKind==='token'?'+1 practice token':'2× XP is ready for your next game'};
 }catch(error){return {status:'unavailable',provider,message:error instanceof Error?error.message:'Rewarded ads are unavailable right now.'};}
}

export const showTokenAd=(game:GameController)=>showRewardedAd(game,'token');
export const showXpBoostAd=(game:GameController)=>showRewardedAd(game,'xp_boost');
