import crypto from 'node:crypto';
import {pool} from './catalogue.mjs';

export async function inviteLink(userId){
 let row=(await pool.query('SELECT code FROM referral_codes WHERE user_id=$1',[userId])).rows[0];
 if(!row){
  for(let tries=0;tries<4&&!row;tries++){
   const code=Array.from({length:8},()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return chars[crypto.randomInt(chars.length)]}).join('');
   if(code.length!==8)continue;
   row=(await pool.query('INSERT INTO referral_codes(user_id,code) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING code',[userId,code])).rows[0];
  }
  row??=(await pool.query('SELECT code FROM referral_codes WHERE user_id=$1',[userId])).rows[0];
  if(!row)throw Error('Could not prepare an invite. Please try again.');
 }
 const count=Number((await pool.query('SELECT count(*) AS total FROM referrals WHERE inviter_user_id=$1 AND qualified_at IS NOT NULL',[userId])).rows[0].total);
 const status=(await pool.query('SELECT referral_plus_until FROM user_monetisation WHERE user_id=$1',[userId])).rows[0];
 const origin=process.env.MEMMARA_PUBLIC_URL??'http://localhost:5173';
 return {code:row.code,url:new URL('/create-account?ref='+row.code,origin).toString(),successfulInvites:count,plusUntil:status?.referral_plus_until??null};
}
export async function reserveReferral(db,invitedUserId,rawCode){
 const code=String(rawCode??'').trim().toUpperCase();if(!code)return;
 if(!/^[A-Z2-9]{8}$/.test(code))throw Object.assign(new Error('That invitation link is invalid.'),{status:400});
 const inviter=(await db.query('SELECT user_id FROM referral_codes WHERE code=$1',[code])).rows[0];
 if(!inviter)throw Object.assign(new Error('That invitation link is invalid.'),{status:400});
 if(inviter.user_id===invitedUserId)throw Object.assign(new Error('You cannot invite yourself.'),{status:400});
 await db.query('INSERT INTO referrals(invited_user_id,inviter_user_id,code) VALUES($1,$2,$3) ON CONFLICT(invited_user_id) DO NOTHING',[invitedUserId,inviter.user_id,code]);
}
export async function qualifyReferral(db,invitedUserId){
 const row=(await db.query('UPDATE referrals SET qualified_at=now() WHERE invited_user_id=$1 AND qualified_at IS NULL RETURNING inviter_user_id',[invitedUserId])).rows[0];
 if(!row)return;
 await db.query("UPDATE user_monetisation SET referral_plus_until=greatest(now(),coalesce(referral_plus_until,now()))+interval '1 month',updated_at=now() WHERE user_id=$1",[row.inviter_user_id]);
}
