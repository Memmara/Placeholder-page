import {useEffect} from 'react';
import type {GameController} from '../GameService';

declare global{interface Window{Capacitor?:{isNativePlatform?:()=>boolean;getPlatform?:()=>string;Plugins?:Record<string,any>}}}

const TEST_BANNERS={android:'ca-app-pub-3940256099942544/9214589741',ios:'ca-app-pub-3940256099942544/2934735716'};

export function NativeBannerAd({game,active}:{game:GameController;active:boolean}){
 const plan=game.data?.monetisation.plan;
 useEffect(()=>{
  const native=window.Capacitor?.isNativePlatform?.(),platform=window.Capacitor?.getPlatform?.() as 'android'|'ios'|undefined;
  if(!native||(platform!=='android'&&platform!=='ios'))return;
  const mobilePlatform:'android'|'ios'=platform;
  let disposed=false,AdMob:any;
  async function sync(){
   const nativePlugin=window.Capacitor?.Plugins?.AdMob,moduleName='@capacitor-community/admob';let module:any=null;
   if(!nativePlugin)try{module=await import(/* @vite-ignore */ moduleName)}catch{return}
   AdMob=nativePlugin??module?.AdMob;if(!AdMob||disposed)return;
   if(plan!=='free'||!active){await AdMob.removeBanner?.().catch(()=>{});return;}
   const configured=(mobilePlatform==='android'?import.meta.env.VITE_MEMMARA_ADMOB_ANDROID_BANNER_ID:import.meta.env.VITE_MEMMARA_ADMOB_IOS_BANNER_ID) as string|undefined;
   const adId=import.meta.env.DEV?TEST_BANNERS[mobilePlatform]:configured;if(!adId)return;
   await AdMob.initialize();if(disposed)return;
   await AdMob.showBanner({adId,adSize:'ADAPTIVE_BANNER',position:'BOTTOM_CENTER',margin:76,isTesting:import.meta.env.DEV});
  }
  void sync();return()=>{disposed=true;void AdMob?.removeBanner?.().catch(()=>{})};
 },[plan,active]);
 return null;
}

