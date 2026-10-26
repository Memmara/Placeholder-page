import {useEffect,useState} from 'react';
import {Copy,Gift,Users,X} from 'lucide-react';
import {authRequest} from './auth';
import './invite-friends.css';

type Invite={code:string;url:string;successfulInvites:number;plusUntil:string|null};
export function InviteFriends({open,onClose}:{open:boolean;onClose:()=>void}){
 const [invite,setInvite]=useState<Invite|null>(null),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 useEffect(()=>{if(!open)return;authRequest('referral-link').then(setInvite).catch(e=>setError(e instanceof Error?e.message:'Could not load your invite link.'))},[open]);
 if(!open)return null;
 async function copy(){if(!invite)return;try{await navigator.clipboard.writeText(invite.url);setCopied(true)}catch{setError('Copy the link from the field below.')}}
 return <div className="invite-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title"><button className="icon-button invite-close" aria-label="Close invitation" onClick={onClose}><X size={20}/></button><div className="invite-icon"><Gift size={30}/></div><p className="eyebrow">LEARN TOGETHER</p><h2 id="invite-title">Invite a friend</h2><p>Get one month of Memmara Plus when a new friend joins through your link and verifies their account.</p>{invite?<><div className="invite-link"><input aria-label="Your invite link" readOnly value={invite.url}/><button className="primary" onClick={()=>void copy()}><Copy size={16}/>{copied?'Copied':'Copy'}</button></div><p className="invite-status"><Users size={16}/>{invite.successfulInvites} successful invite{invite.successfulInvites===1?'':'s'}{invite.plusUntil?' · Plus until '+new Date(invite.plusUntil).toLocaleDateString('en-GB'):''}</p></>:<p>{error||'Preparing your link…'}</p>}<small>The reward is added after your friend creates a new account and verifies their email, or joins with a verified social account. Existing accounts do not qualify.</small></section></div>;
}
