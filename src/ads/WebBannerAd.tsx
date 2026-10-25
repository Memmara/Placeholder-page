import {useEffect} from 'react';
import type {GameController} from '../GameService';

declare global{interface Window{adsbygoogle?:Record<string,unknown>[]}}

export function WebBannerAd({game,active}:{game:GameController;active:boolean}){
 const client=import.meta.env.VITE_MEMMARA_ADSENSE_CLIENT as string|undefined;
 const slot=import.meta.env.VITE_MEMMARA_ADSENSE_GAME_SLOT as string|undefined;
 const free=game.data?.monetisation.plan==='free';
 const native=window.Capacitor?.isNativePlatform?.()===true;
 const enabled=import.meta.env.PROD&&active&&free&&!native&&!!client&&!!slot;
 useEffect(()=>{
  if(!enabled)return;
  const selector='script[data-memmara-adsense]';
  if(!document.querySelector(selector)){
   const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';script.dataset.memmaraAdsense='true';script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client!)}`;document.head.append(script);
  }
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(error){console.warn('AdSense banner unavailable',error)}
 },[enabled,client,slot]);
 if(!enabled)return null;
 return <aside className="web-game-ad" aria-label="Advertisement"><span>Advertisement</span><ins className="adsbygoogle" style={{display:'block'}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/></aside>;
}
