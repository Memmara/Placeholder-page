import {Clock3,Sparkles,Zap} from 'lucide-react';
import {useEffect,useState} from 'react';
import type {GameController} from '../GameService';
import {useRewardedAds} from './useRewardedAds';

function refillLabel(value:string|null){
 if(!value)return 'Base tokens full';const ms=Math.max(0,new Date(value).getTime()-Date.now()),hours=Math.floor(ms/3600000),minutes=Math.ceil(ms%3600000/60000);return `Next token in ${hours?hours+'h ':''}${minutes}m`;
}

export function RewardedAdsCard({game}:{game:GameController}){
 const ads=useRewardedAds(game),[tick,setTick]=useState(0);const state=game.data?.monetisation;
 useEffect(()=>{const timer=window.setInterval(()=>setTick(value=>value+1),30000);return()=>window.clearInterval(timer)},[]);void tick;
 if(!state||state.plan!=='free')return null;
 return <section className="panel rewarded-card" aria-labelledby="practice-energy-title">
  <div className="rewarded-summary"><span className="rewarded-icon"><Zap size={24}/></span><div><span className="eyebrow">PRACTICE TOKENS</span><h2 id="practice-energy-title">{state.unlimited?'Unlimited tokens ready':`${state.tokens} token${state.tokens===1?'':'s'} ready`}</h2><p>{state.unlimited?'Your test account can practise without spending tokens.':<><Clock3 size={15}/>{refillLabel(state.nextTokenAt)} · up to {state.organicCapacity} refill automatically every {state.refillHours} hours</>}</p></div></div>
  <div className="rewarded-actions">
   {!state.unlimited&&<button className="secondary" disabled={!!ads.busy||state.tokens>=state.adTokenLimit} onClick={()=>void ads.showTokenAd()}><Zap size={17}/>{ads.busy==='token'?'Opening ad…':state.tokens>=state.adTokenLimit?'Token balance full':'Watch ad · +1 token'}</button>}
   <button className={state.xpBoostPending?'secondary boost-ready':'secondary'} disabled={!!ads.busy||state.xpBoostPending} onClick={()=>void ads.showXpBoostAd()}><Sparkles size={17}/>{ads.busy==='xp_boost'?'Opening ad…':state.xpBoostPending?'2× XP ready':'Watch ad · 2× next game XP'}</button>
  </div>
  {ads.result&&<p className={'ad-result '+ads.result.status} role="status">{ads.result.message}</p>}
  <p className="fine">Rewards are added only after the ad provider confirms completion. Closing an ad early keeps your balance unchanged.</p>
 </section>;
}
