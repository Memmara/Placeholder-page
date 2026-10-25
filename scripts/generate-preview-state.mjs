import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {presentationCatalogue,categories,worlds} from '../server/presentation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),design=path.resolve(root,'../memmara-game-system');
const read=name=>JSON.parse(fs.readFileSync(path.join(design,name+'.json'),'utf8'));
const sets=read('sets'),achievements=read('achievements'),levels=read('levels-1-50'),boxes=read('drop-boxes');
const owned=presentationCatalogue.slice(0,14),now=new Date().toISOString();
const state={
 catalogueVersion:2,categories,worlds,loadoutNotes:[],userId:'00000000-0000-4000-8000-000000000001',profile:{genderIdentity:'prefer_not_to_say'},
 avatar:{appearance:{skin:'#c98f70',hair:'#352b43',style:'swept',top:'#83cbbc',eyes:'happy',eyeShape:'round',faceDetail:'plain',height:1,gender:'prefer_not_to_say'},body_type:'prefer_not_to_say',reduced_motion:false,version:1},
 catalogue:presentationCatalogue,inventory:owned.map((item,index)=>({id:`preview-inventory-${index}`,item_id:item.id,favourite:index<2,acquired_at:now,provenance:'preview'})),
 equipped:[],wallets:[{currency:'coins',balance:1200,subject_id:null}],wishlist:[],boxes:[{id:'preview-box-1',box_id:'level_common',name:'Preview reward'}],outfits:[],showcase:[],
 sets,achievements,earned:achievements.slice(0,2).map((achievement,index)=>({achievement_id:achievement.id,progress:String(index?0.5:1),unlocked_at:index?null:now})),ledger:[{amount:1200,reason:'Preview balance',created_at:now}],
 historyImported:true,stats:{sessions:3},daily:{qualified:false,coins:10},monetisation:{plan:'free',tokens:2,organicCapacity:2,adTokenLimit:3,nextTokenAt:null,xpBoostPending:false,refillHours:5},progression:{level:'1',xp_projection:'5'},levelRewards:levels,
 boxDefinitions:boxes.map(({active_pool,...box})=>box),mode:'SCHOOL_MODE',payments:false
};
fs.writeFileSync(path.join(root,'public/data/game-preview.json'),JSON.stringify(state));
console.log(`Wrote preview game state with ${presentationCatalogue.length} items.`);
