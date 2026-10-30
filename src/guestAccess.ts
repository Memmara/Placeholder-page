import {blank,defaultSettings} from './engine';
import type {Progress} from './models';

// Set VITE_MEMMARA_GUEST_ACCESS=false and rebuild to remove public guest entry.
// This module is also imported by the server-side marking/commerce graph.
// Vite defines import.meta.env in the browser bundle; Cloudflare's runtime does not.
export const guestAccessEnabled = import.meta.env?.VITE_MEMMARA_GUEST_ACCESS !== 'false';
const flag='memmara.guest.session.v1';
const progressKey='memmara.guest.progress.v1';
export function isGuestSession(){
  if(['/login','/create-account','/reset-password','/verify-email'].includes(location.pathname)){
    sessionStorage.removeItem(flag);
    return false;
  }
  return guestAccessEnabled && sessionStorage.getItem(flag)==='1';
}
export function startGuest(path:'/dashboard'|'/minigames'='/dashboard'){
  if(!guestAccessEnabled)return;
  sessionStorage.setItem(flag,'1');
  location.assign(path);
}
export function leaveGuest(path='/login'){
  sessionStorage.removeItem(flag);
  location.assign(path);
}
export function requestGuestPlay(title='Daily Mix'){
  window.dispatchEvent(new CustomEvent('memmara:guest-play',{detail:{title}}));
}
export const guestUser={id:'guest-device',displayName:'Guest',email:'',avatarUrl:null,providers:[] as string[],emailVerified:false,createdAt:new Date().toISOString(),lastSignInAt:null,loginCount:0};
export function initialGuestProgress():Progress{
  return {...blank(),settings:{...defaultSettings,subjects:['GCSE-PHYSICS','GCSE-BIOLOGY','GCSE-CHEMISTRY','GCSE-MATHS'],allowNew:true}};
}
export async function guestAuthRequest(route:string,body?:unknown){
  if(route==='me')return {user:guestUser};
  if(route==='providers')return {google:false,apple:false,microsoft:false};
  if(route==='sessions')return {sessions:[]};
  if(route==='logout'||route==='logout-all'){sessionStorage.removeItem(flag);return {ok:true};}
  if(route==='profile')return {user:{...guestUser,displayName:String((body as {displayName?:string})?.displayName??'Guest')}};
  if(route==='progress'){
    if(body===undefined){
      const saved=localStorage.getItem(progressKey);
      let progress=initialGuestProgress();
      try{if(saved){const candidate=JSON.parse(saved);if(candidate.version===1&&Array.isArray(candidate.attempts))progress=candidate;}}catch{}
      return {progress:{...progress,session:null,pausedSessions:[]},version:Number(localStorage.getItem(progressKey+'.version')??0)};
    }
    const version=Number(localStorage.getItem(progressKey+'.version')??0)+1;
    localStorage.setItem(progressKey,JSON.stringify((body as {progress:Progress}).progress));
    localStorage.setItem(progressKey+'.version',String(version));
    return {version};
  }
  throw Error('Sign in to use account features. Your guest progress stays on this device.');
}
