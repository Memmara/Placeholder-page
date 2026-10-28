import {useCallback,useState} from 'react';
import type {GameController} from '../GameService';
import {showRewardedAd,showTokenAd,showXpBoostAd,showDailyMixAd,type AdOutcome,type RewardKind} from './AdManager';

export function useRewardedAds(game:GameController){
 const [busy,setBusy]=useState<RewardKind|null>(null),[result,setResult]=useState<AdOutcome|null>(null);
 const run=useCallback(async(kind:RewardKind)=>{setBusy(kind);setResult(null);const outcome=kind==='token'?await showTokenAd(game):kind==='daily_mix_unlock'?await showDailyMixAd(game):await showXpBoostAd(game);setResult(outcome);setBusy(null);return outcome},[game]);
 return {busy,result,showRewardedAd:(kind:RewardKind)=>run(kind),showTokenAd:()=>run('token'),showXpBoostAd:()=>run('xp_boost'),showDailyMixAd:()=>run('daily_mix_unlock'),clearResult:()=>setResult(null)};
}

export {showRewardedAd,showTokenAd,showXpBoostAd,showDailyMixAd};
