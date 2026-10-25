import * as THREE from 'three';
import type {CosmeticAsset,CosmeticGear} from './types';
import {ObjectKit,ink,paper,gold,wood,glass,type V3} from './objectKit';

export const OBJECT_IDS=[2,5,7,8,12,15,18,20,23,25,30,33,35,37,38,40,43,45,48,50,53,55,58,60,63,65,68,73,75,80,83,88,90,92,93,95,98,100,103,108,112,113,115,118,120,125,128,130,133,137,138,140,142,145,148,150,151,159,160,161,166,167,168,171,172,183,188,189,190,191,193,194,203,204,210,213,216,218,221,222,223,224,225,226,227,228,232,234,237,238,243,244,245,246,247,248,250,252,254,259,260,262,263,264,265,266,267,268,269,270,272,273,274,277,278,280,290,294,297].map(n=>'itm_'+String(n).padStart(3,'0'));

/** Each ID below has its own composition. Shared construction tools are not
 * cosmetic templates: portraits render exactly the geometry equipped in scene. */
export function createObject(item:CosmeticGear):CosmeticAsset {
 const k=new ObjectKit(),g=k.root,n=Number(item.id.slice(4));
 g.name='cosmetic:'+item.id;g.userData.itemId=item.id;
 const category=item.presentation?.category??item.category;
 let built=smallObjects(k,g,n);
 if(!built)built=motionObjects(k,g,n);
 if(!built)built=spaces(k,g,n);
 if(!built)throw new Error(`Missing object recipe ${item.id}`);
 if(['relic','knowledge_artefact','handheld'].includes(category)){
  g.position.set(category==='relic'?-.82:.82,1.72,.32);g.scale.setScalar(category==='handheld'?.72:.66);g.rotation.y=category==='relic'?-.18:.18;
 }
 if(category==='desk_trophy'){g.position.set(-1.45,.62,.1);g.scale.setScalar(.75);k.cyl(g,[0,-.45,0],.54,.6,.12,'#646978');k.cyl(g,[0,-.74,0],.13,.18,.52,'#646978');}
 if(category==='title'){g.position.set(0,4.14,0);g.scale.setScalar(.62);}
 g.userData.assetRecipe='object-'+n;
 k.consolidate();
 return {group:g,update:(t,m)=>{for(const move of k.motions)move(t,m)}};
}

function smallObjects(k:ObjectKit,g:THREE.Group,n:number):boolean {
 switch(n){
 case 7:{ // Three-footed egg lantern.
  k.ball(g,[0,.15,0],[.34,.43,.28],'#e3d8bd');k.arc(g,[0,.16,.04],.36,.035,ink,0,Math.PI*2,[0,.35,0]);
  k.poly(g,[[-.21,.03],[-.1,.13],[0,.05],[.12,.18],[.21,.06],[.18,-.19],[-.2,-.2]],.04,'#e8ae6d',[0,.17,.27],undefined,true);
  for(const a of [0,2.1,4.2])k.cyl(g,[Math.cos(a)*.24,-.29,Math.sin(a)*.2],.06,.085,.22,ink);
  k.arc(g,[0,.65,0],.19,.03,ink,0,Math.PI);return true;
 }
 case 8:{
  const b=k.book(g,[0,.05,0],.75,.9,.21,'#754754');
  for(const s of [-1,1])k.poly(b,[[s*.35,.36],[s*.86,.58],[s*.68,.04],[s*.49,-.3],[s*.35,-.37]],.055,'#a77762',[0,0,.02]);
  for(let j=0;j<5;j++)k.crystal(b,[-.39,-.32+j*.16,.06],[.08,.11,.1],gold);
  k.tube(b,[[.16,.47,.18],[.2,.24,.2],[.28,.15,.21]],.04,gold);k.sway(b,'y',.09,.6);return true;
 }
 case 18:{
  k.poly(g,[[-.43,-.42],[.43,-.27],[.12,.57]],.25,glass,[0,0,0],undefined,false,.53);
  k.arc(g,[.04,.03,.15],.23,.035,gold);k.cyl(g,[.04,.03,.15],.19,.19,.025,'#e9e1c6',[Math.PI/2,0,0]);
  const hand=k.group(g,[.04,.03,.19]);k.poly(hand,[[0,.18],[-.045,-.08],[.045,-.08]],.025,'#7b5980');k.sway(hand,'z',.4,.5);return true;
 }
 case 23:{
  k.arc(g,[0,.13,0],.43,.04,gold);k.ball(g,[0,.1,0],[.35,.42,.3],glass,false,.22);
  const cell=k.group(g,[0,.1,0]);k.ball(cell,[0,.02,0],[.17,.2,.17],'#d8b2bd');
  for(let j=0;j<4;j++){const a=j*Math.PI/2;k.ball(cell,[Math.cos(a)*.24,Math.sin(a)*.28,0],[.09,.13,.07],['#8fb6a8','#bdafcf','#e6c894','#b5d3db'][j]);}
  k.arc(g,[0,.65,0],.17,.035,gold,0,Math.PI);k.cyl(g,[0,-.34,0],.27,.3,.12,ink);k.turn(cell,.22);return true;
 }
 case 33:{
  const b=k.book(g,[0,.15,0],.6,.7,.3,'#8b6288');b.rotation.z=.08;
  for(const x of [-.19,.19]){k.box(g,[x,-.31,.03],[.12,.2,.12],wood);k.ball(g,[x,-.4,.1],[.12,.065,.17],wood);k.ball(b,[x*.6,.08,.2],[.045,.065,.025],ink);}
  k.sway(b,'z',.045,1);return true;
 }
 case 37:{
  k.arc(g,[0,.34,0],.23,.032,gold);const specs=[[-.22,.55],[-.01,.34],[.23,.44]];
  specs.forEach(([x,h],j)=>{const key=k.group(g,[x,.23,0]);k.arc(key,[0,0,0],.085,.025,gold);k.box(key,[0,-h/2-.05,0],[.045,h,.055],gold);if(j===0){k.box(key,[.08,-h+.03,0],[.16,.06,.06],gold);k.box(key,[.08,-h+.12,0],[.16,.04,.06],gold)}if(j===1)for(let q=0;q<3;q++)k.box(key,[(q-1)*.055,-h+.02,0],[.035,.14,.045],gold,[0,0,(q-1)*-.35]);if(j===2){k.arc(key,[-.04,-h+.01,0],.07,.018,gold);k.arc(key,[.04,-h+.01,0],.07,.018,gold)}k.sway(key,'z',.05,.8,j);});return true;
 }
 case 38:{
  k.cyl(g,[0,-.3,0],.34,.39,.1,wood);k.tube(g,[[-.18,-.25,0],[-.14,.18,0],[0,.31,0],[.14,.18,0],[.18,-.25,0]],.035,gold);
  const o=k.group(g,[0,.27,0]);k.ball(o,[0,0,0],[.11,.11,.11],gold);
  for(let j=0;j<3;j++){const a=j*2.2,p:V3=[Math.cos(a)*(.27+j*.07),j*.08,Math.sin(a)*(.27+j*.07)];k.tube(o,[[0,0,0],p],.018,gold);k.ball(o,p,[.055+j*.015,.055+j*.015,.055+j*.015],['#91b6be','#c38271','#929b7f'][j]);}k.turn(o,.18);k.page(g,[.26,-.06,.13],.17,.24,paper,[0,0,-.2]);return true;
 }
 case 43:{
  k.poly(g,[[0,.49],[.4,.03],[0,-.47],[-.4,.03]],.08,gold);
  for(const y of [-.17,.17])k.arc(g,[0,y,.065],.18,.026,ink);
  for(const sign of [-1,1]){const needle=k.group(g,[0,sign*.17,.1]);k.poly(needle,[[0,.2],[-.04,-.06],[.04,-.06]],.02,sign===1?'#719cba':'#a77d85');k.turn(needle,sign*.19,'z');}return true;
 }
 case 48:{
  for(let j=0;j<7;j++)k.ball(g,[(j-3)*.085,-.28+Math.abs(j-3)*.015,0],[.09,.08,.22],'#e4c3af');
  for(const s of [-1,1]){const coral=k.branches(g,[s*.25,-.2,-.08],.62,'#d59382');coral.rotation.z=-s*.35;}
  const pearl=k.ball(g,[0,.1,.08],[.17,.17,.17],'#f2e5d4');k.bob(pearl,.05,.7);return true;
 }
 case 53:{
  k.tube(g,[[0,-.9,0],[.04,-.3,0],[-.03,.3,0],[0,.61,0]],.055,'#696278');
  for(const s of [-1,1])k.tube(g,[[0,.18,0],[s*.2,.43,0],[s*.28,.7,0]],.043,'#696278');
  k.arc(g,[0,.65,0],.2,.07,'#bda9db',Math.PI/4,Math.PI*2);k.crystal(g,[0,.68,0],[.12,.25,.09],'#cebee8');
  k.page(g,[.18,.15,.06],.16,.26,paper,[0,0,-.25]);return true;
 }
 case 58:{
  const cube=k.group(g,[0,.04,0]);cube.rotation.set(.3,.3,.55);
  for(const y of [-.3,.3])for(const z of [-.3,.3])k.box(cube,[0,y,z],[.67,.07,.07],'#b7a0d0');
  for(const x of [-.3,.3])for(const z of [-.3,.3])k.box(cube,[x,0,z],[.07,.67,.07],'#b7a0d0');
  for(const x of [-.3,.3])for(const y of [-.3,.3])k.box(cube,[x,y,0],[.07,.07,.67],'#b7a0d0');
  const stairs=k.group(cube);for(let j=0;j<4;j++)k.box(stairs,[-.13+j*.08,-.14+j*.08,0],[.1,.05,.2],gold);k.turn(stairs,.3);return true;
 }
 case 63:{
  k.cyl(g,[0,-.29,0],.28,.32,.08,gold);const sun=k.ball(g,[0,-.05,0],[.15,.15,.15],'#ecc580',true);
  for(let j=0;j<3;j++){const a=j*2.1,p=k.group(g,[Math.cos(a)*.32,.1,Math.sin(a)*.32]);p.rotation.y=-a+Math.PI/2;k.box(p,[0,.09,0],[.24,.6,.035],gold);k.box(p,[0,.09,.03],[.19,.54,.015],'#c9dae1');k.sway(p,'y',.18,.5,j);}
  k.bob(sun,.025,.8);return true;
 }
 case 68:{
  k.book(g,[-.26,0,0],.23,.8,.1,'#645c80');
  const fan=k.group(g,[-.25,-.27,0]);for(let j=0;j<5;j++){const disc=k.group(fan);disc.rotation.z=-.3+j*.28;k.cyl(disc,[0,.42,0],.12+j*.025,.12+j*.025,.035,['#dfddea','#c9c6db','#b8b6ce','#a2a1bf','#e9e2c8'][j],[Math.PI/2,0,0]);k.box(disc,[0,.2,0],[.065,.4,.025],paper);}k.sway(fan,'z',.1,.6);return true;
 }
 case 73:{
  for(const s of [-1,1]){const pod=k.leaf(g,[s*.16,.02,0],.37,.93,wood,[0,s*.36,s*.2]);k.sway(pod,'y',.08,.7,s);k.leaf(g,[s*.16,.57,0],.16,.4,'#8fab75',[0,0,-s*.35]);}
  const seed=k.ball(g,[0,-.06,.08],[.11,.2,.11],'#dccb8b',true);k.bob(seed,.035,.6);return true;
 }
 case 83:{
  k.cyl(g,[0,-.37,0],.28,.33,.08,'#cec9c0');k.branches(g,[0,-.33,0],.7,'#aeb6b3');
  for(const [x,y,s] of [[-.27,.22,.16],[.18,.42,.21],[.32,.03,.12]]){k.ball(g,[x,y,0],[s,s*1.2,s],glass,false,.44);k.cyl(g,[x,y+s*1.2,0],s*.35,s*.4,.12,gold);}
  const drop=k.ball(g,[-.27,-.08,.04],[.065,.1,.065],'#b7b3dc',true);k.bob(drop,.06,.55);return true;
 }
 case 88:{
  k.poly(g,[[-.12,.35],[.12,.35],[.12,-.48],[0,-.35],[-.12,-.48]],.05,gold);k.arc(g,[0,.38,0],.22,.045,gold,0,Math.PI);
  k.tube(g,[[.03,.46,.03],[.15,.28,.08],[.22,-.17,.04],[.34,-.38,.04]],.035,'#a66672');return true;
 }
 case 93:{
  const chart=k.group(g,[0,-.15,0]);for(let j=0;j<3;j++){const p=k.page(chart,[(j-1)*.27,.18+Math.abs(j-1)*.12,0],.27,.5,paper,[0,(j-1)*-.3,(j-1)*-.15]);k.box(p,[0,.24,.03],[.13,.08,.02],['#9bbac1','#d6b67e','#a9b18c'][j]);}k.tube(chart,[[0,-.15,.08],[0,.12,.08],[-.3,.3,.08]],.018,ink);k.tube(chart,[[0,.12,.08],[.3,.3,.08]],.018,ink);return true;
 }
 case 98:{
  k.box(g,[0,-.38,0],[.7,.12,.4],ink);k.box(g,[-.32,.02,0],[.12,.8,.24],gold);k.box(g,[.32,-.08,0],[.12,.6,.24],gold);
  const cube=k.box(g,[0,.08,0],[.32,.32,.32],'#8caeb5',[.1,0,.12],.04);k.turn(cube,.23);k.bob(cube,.04,.6);return true;
 }
 case 103:{
  for(const x of [-.34,.34])k.box(g,[x,0,0],[.07,.82,.11],wood);for(const y of [-.37,.37])k.box(g,[0,y,0],[.75,.08,.11],wood);
  for(let j=0;j<6;j++)k.tube(g,[[-.23+j*.09,-.34,0],[-.23+j*.09,.34,0]],.012,['#88ae9d','#c499a7','#b7a6c5'][j%3]);
  k.box(g,[0,-.22,.025],[.52,.2,.04],'#a9c4ad');const shuttle=k.box(g,[0,.05,.08],[.35,.06,.05],gold);shuttle.userData.artMotionTarget=true;k.motions.push((t,m)=>{shuttle.position.x=m?Math.sin(t*.7)*.15:0});return true;
 }
 case 108:{
  k.tube(g,[[0,-.65,0],[.02,-.15,0],[.18,.35,0],[.12,.67,0]],.025,gold);k.leaf(g,[.08,.22,0],.3,.93,'#b7d5e0',[0,0,-.25]);k.poly(g,[[0,-.68],[-.08,-.4],[.08,-.4]],.035,glass,[0,0,.04]);return true;
 }
 case 112:{
  for(const r of [.19,.31,.43])k.arc(g,[0,0,0],r,.026,gold);
  k.tube(g,[[-.4,0,0],[.4,0,0]],.016,gold);const arm=k.group(g);k.poly(arm,[[0,.48],[-.035,-.3],[.035,-.3]],.03,gold,[0,0,.04]);k.turn(arm,.1,'z');k.arc(g,[0,.54,0],.08,.02,gold);return true;
 }
 case 113:{
  k.poly(g,[[-.31,-.45],[.31,-.45],[.31,.28],[.12,.48],[-.31,.48]],.12,'#aea18b');const pts:V3[]=[[-.19,.2,.09],[.06,.29,.09],[.21,.04,.09],[-.04,-.12,.09],[.13,-.29,.09]];k.tube(g,pts,.013,ink);pts.forEach(p=>k.star(g,p,.038,gold));
  const arm=k.group(g,[.32,-.1,0]);k.box(arm,[.13,0,0],[.28,.045,.07],gold);k.arc(arm,[.27,0,0],.065,.018,gold);k.sway(arm,'y',.4,.5);return true;
 }
 case 118:{
  k.cyl(g,[0,.03,0],.22,.38,.58,'#9a8f6f');k.ball(g,[0,.32,0],[.23,.19,.23],'#9a8f6f');k.arc(g,[0,.54,0],.13,.04,gold);k.arc(g,[0,.04,.32],.22,.045,gold);k.ball(g,[0,.04,.32],[.18,.18,.06],glass,false,.6);for(const x of [-.22,.22])k.box(g,[x,-.34,0],[.15,.14,.3],ink);return true;
 }
 case 128:{
  for(const s of [-1,1]){k.arc(g,[s*.2,.12,0],.24,.08,'#d9d7cb',s===-1?0:Math.PI,Math.PI);k.tube(g,[[s*.43,.12,0],[s*.3,-.13,0],[0,-.43,0]],.075,'#d9d7cb');for(let j=0;j<4;j++)k.arc(g,[s*.23,.05+j*.045,.015],.1,.012,'#b67c55',0,Math.PI*2,[Math.PI/2,0,0]);}return true;
 }
 case 133:{
  const jar=k.jar(g,[0,-.4,0],.31,.88);k.branches(jar,[0,.12,0],.56,'#759167');for(const s of [-1,1])k.leaf(jar,[s*.12,.44,.04],.17,.26,'#90b17e',[0,0,-s*.6]);
  for(let j=0;j<3;j++){const a=j*2.094;k.tube(g,[[Math.cos(a)*.19,-.22,Math.sin(a)*.19],[Math.cos(a)*.29,-.46,Math.sin(a)*.29]],.035,gold);}
  k.tube(g,[[.3,-.04,0],[.47,-.04,0],[.47,.09,0]],.025,gold);k.ball(g,[.47,.09,0],[.06,.04,.04],wood);return true;
 }
 case 138:{
  const b=k.book(g,[0,-.03,0],.66,.78,.26,'#8f9a92');k.poly(b,[[-.29,.32],[-.42,.14],[-.37,-.29],[-.2,-.36]],.1,'#7e8790',[0,0,.2]);
  k.cloud(b,[.24,.17,.18],.49);k.tube(b,[[-.15,-.1,.2],[0,.09,.24],[.15,-.1,.2],[.29,.01,.22]],.04,'#8bb5c7');k.sway(b,'y',.07,.7);return true;
 }
 case 148:{
  k.ball(g,[0,.13,0],[.35,.35,.35],glass,false,.23);const s=k.star(g,[0,.13,.08],.22,gold);k.sway(s,'y',.3,.5);
  for(const side of [-1,1]){k.tube(g,[[0,-.31,0],[side*.27,-.17,0],[side*.41,.17,0]],.035,gold);for(let j=0;j<3;j++)k.leaf(g,[side*(.14+j*.09),-.21+j*.12,.02],.12,.2,'#c6b277',[0,0,side*.7]);}return true;
 }
 case 159:{k.cyl(g,[0,-.13,0],.055,.015,.77,wood);k.ball(g,[0,.3,0],[.23,.1,.18],wood);k.arc(g,[.1,.03,0],.13,.02,'#b6a376');return true;}
 case 160:{k.cyl(g,[0,0,0],.22,.2,.58,'#eee1c9');k.cyl(g,[0,.32,0],.2,.2,.1,ink);k.arc(g,[.25,.04,0],.19,.055,'#cbb694',-Math.PI/2,Math.PI);for(let j=0;j<4;j++)k.arc(g,[0,-.16+j*.065,0],.215,.018,'#92b3a9',0,Math.PI*2,[Math.PI/2,0,0]);return true;}
 case 161:{k.cyl(g,[0,.12,0],.13,.14,.55,'#eee6d8');k.box(g,[0,-.18,0],[.34,.18,.26],wood);k.poly(g,[[-.07,.08],[.07,.08],[0,.24]],.01,'#7896a5',[0,0,.14]);return true;}
 case 167:{k.box(g,[0,-.2,0],[.65,.13,.48],'#9d8ba5',[0,.15,0],.06);k.ball(g,[0,-.07,0],[.28,.11,.2],'#aaada3');k.star(g,[.01,.035,.06],.12,'#e5dec5').rotation.x=-Math.PI/2;return true;}
 case 168:{k.desk(g,[0,-.4,0],.85,'#98715a',.42);k.chair(g,[.45,-.45,.35],'#a6b7a7',-.3);k.page(g,[-.2,.4,-.06],.26,.32,paper,[0,0,.14]);k.plant(g,[.28,.32,0],.35);return true;}
 case 171:{const j=k.jar(g,[0,-.4,0],.22,.87);k.crystal(j,[0,.45,0],[.13,.24,.06],'#c6acb9');for(let q=0;q<3;q++)k.ball(j,[(q-1)*.1,.12,0],[.08,.06,.08],'#97a89b');return true;}
 case 183:{const j=k.jar(g,[0,-.35,0],.35,.72);k.plant(j,[.03,.1,0],.7);for(let q=0;q<3;q++)k.box(j,[-.19+q*.07,.14+q*.05,.1],[.11,.045,.13],'#899382');return true;}
 case 190:{k.ball(g,[0,.1,0],[.4,.31,.3],glass,false,.25);for(const x of [-.28,.28])k.tube(g,[[x,-.38,-.25],[x,-.4,.22],[x,-.31,.34]],.035,wood);k.box(g,[0,-.24,0],[.62,.09,.5],paper);k.poly(g,[[-.17,-.17],[0,.14],[.17,-.17]],.2,'#b36664',[0,.03,0]);k.tube(g,[[.24,-.2,0],[.24,.24,0]],.012,gold);k.poly(g,[[0,0],[.14,-.04],[0,-.08]],.02,'#a4b7cd',[.24,.24,0]);return true;}
 case 191:{k.box(g,[0,-.14,0],[.85,.12,.5],wood);for(const x of [-.42,.42])k.box(g,[x,-.05,0],[.04,.2,.5],wood);for(const z of [-.24,.24])k.box(g,[0,-.05,z],[.85,.2,.04],wood);k.crystal(g,[-.25,.05,0],[.12,.17,.12],'#baa6c8');k.ball(g,[0,.03,-.03],[.12,.08,.09],'#aeb5a1');k.cone(g,[.23,.05,0],.12,.22,'#c99d80');k.arc(g,[0,-.1,.29],.1,.02,gold,0,Math.PI);return true;}
 case 203:{k.box(g,[0,-.21,0],[.43,.12,.35],wood);k.cyl(g,[0,.05,0],.055,.08,.4,wood);k.arc(g,[0,.28,0],.18,.055,wood);for(const x of [-.08,.08])k.ball(g,[x,-.19,.19],[.025,.025,.01],ink);k.arc(g,[0,-.18,.19],.08,.012,ink,Math.PI,Math.PI);return true;}
 case 204:{k.cyl(g,[0,-.12,0],.17,.17,.39,wood);for(const y of [-.32,.08])k.cyl(g,[0,y,0],.3,.3,.07,wood);const loop=k.tube(g,[[0,.1,0],[-.33,.35,0],[0,.66,.04],[.33,.35,0],[0,.19,-.12],[-.24,.44,-.08],[0,.59,.08]],.035,'#b49ac8',false,true);k.sway(loop,'y',.15,.5);return true;}
 case 213:{k.cyl(g,[0,0,0],.41,.4,.055,'#a8b1b7',[Math.PI/2,0,0]);k.arc(g,[0,0,.04],.4,.024,ink);k.ball(g,[0,0,.06],[.14,.14,.09],gold);for(let j=0;j<5;j++){const a=j*1.256;k.ball(g,[.19+Math.cos(a)*.05,-.19+Math.sin(a)*.05,.055],[.035,.035,.02],'#d395a7');}return true;}
 case 216:{k.box(g,[0,-.26,0],[.12,.38,.15],ink);k.poly(g,[[-.45,.05],[-.24,.42],[0,.52],[.25,.42],[.44,.05]],.08,'#a3bec9');for(let j=0;j<3;j++){const x=(j-1)*.24;k.arc(g,[x,.19+(.24-Math.abs(x))*.5,.055],.065,.018,gold);}k.tube(g,[[-.28,.12,.06],[-.05,.22,.06],[.22,.14,.06]],.012,ink);return true;}
 case 218:{const j=k.jar(g,[0,-.32,0],.25,.7);k.arc(g,[0,.58,0],.18,.028,wood,0,Math.PI);const fly=k.group(j,[0,.37,0]);k.ball(fly,[0,0,0],[.04,.08,.04],'#dcc770',true);for(const s of [-1,1])k.leaf(fly,[s*.07,.03,0],.08,.14,'#d7e1cb',[0,0,-s*.7]);k.bob(fly,.06,.7);return true;}
 case 228:{k.poly(g,[[-.6,-.19],[.6,-.19],[.6,.08],[.44,.23],[-.6,.23]],.1,ink);k.box(g,[-.37,.07,.07],[.1,.1,.035],'#a6da84');for(let j=0;j<3;j++)k.box(g,[.05,-.06+j*.065,.065],[.53,.022,.01],'#c4cfd4');return true;}
 case 232:{const a=k.box(g,[-.19,.18,0],[.34,.34,.34],paper,[.2,.25,.4]);const b=k.box(g,[.2,-.18,0],[.34,.34,.34],ink,[.2,.25,.4]);for(const [mesh,c] of [[a,ink],[b,paper]] as const){for(const x of [-.07,.07])for(const y of [-.07,.07])k.ball(mesh as unknown as THREE.Group,[x,y,.18],[.025,.025,.012],c);}k.sway(a,'z',.1,.5);k.sway(b,'z',-.1,.5);return true;}
 case 237:{k.tube(g,[[-.18,.35,0],[-.2,.63,0],[.12,.68,0],[.23,.41,0]],.035,ink);k.ball(g,[0,.08,0],[.29,.35,.25],glass,false,.28);k.cyl(g,[0,-.25,0],.28,.3,.08,ink);const ghost=k.group(g,[0,.08,.04]);k.ball(ghost,[0,0,0],[.16,.2,.13],'#c6dcd2',true);for(const x of [-.065,.065])k.arc(ghost,[x,.01,.13],.04,.012,ink,0,Math.PI);k.bob(ghost,.06,.6);return true;}
 case 238:{k.arc(g,[0,0,0],.35,.045,gold,0,Math.PI);k.box(g,[0,0,0],[.7,.06,.22],gold);k.poly(g,[[0,0],[0,.31],[.22,0]],.04,gold,[0,0,.03],[0,-Math.PI/2,0]);k.arc(g,[0,-.12,0],.18,.04,wood,Math.PI,Math.PI);return true;}
 case 245:{for(const x of [-.26,.26]){k.ball(g,[x,-.19,0],[.13,.1,.11],'#979b9a');k.tube(g,[[x,-.16,0],[x,.1,0],[x-.08,.22,0]],.025,wood);}k.tube(g,[[-.3,.2,0],[.33,.22,0]],.018,wood);k.cyl(g,[.03,.21,0],.12,.12,.2,paper,[0,0,Math.PI/2]);for(const s of [-1,1])k.leaf(g,[s*.06,-.08,0],.11,.2,'#d9a36b',[0,0,s*.3]);return true;}
 case 250:{for(const s of [-1,1])k.poly(g,[[0,-.19],[s*.54,-.24],[s*.54,.18],[0,.24]],.07,paper);k.box(g,[0,0,.05],[.045,.45,.05],wood);k.poly(g,[[.2,.14],[.29,.14],[.29,-.46],[.245,-.38],[.2,-.46]],.035,'#a46f88',[0,0,.06]);return true;}
 case 252:{k.box(g,[0,0,0],[1.15,.31,.08],'#594e66');for(const s of [-1,1])k.tube(g,[[-.62,s*.12,.05],[-.28,-s*.18,.05],[.16,s*.17,.05],[.66,-s*.1,.05]],.04,s===1?'#a1c8b5':'#cea9b6');return true;}
 case 260:{k.cyl(g,[0,0,0],.32,.32,.16,ink,[Math.PI/2,0,0]);for(let j=0;j<6;j++){const a=j*Math.PI/3;k.leaf(g,[Math.cos(a)*.14,Math.sin(a)*.14,.1],.14,.28,['#deaa9a','#dcce9d','#a4bca2','#8ab9c2','#a29dc4','#bd96af'][j],[0,0,a-Math.PI/2]);}k.cyl(g,[.38,0,0],.12,.12,.12,gold,[Math.PI/2,0,0]);k.box(g,[0,-.38,0],[.15,.25,.15],ink);return true;}
 case 266:{k.poly(g,[[-.62,-.18],[.52,-.18],[.62,-.08],[.52,0],[.62,.1],[.51,.2],[-.62,.2]],.07,'#c8b08c');const h=k.hourglass(g,[-.4,.015,.06],.36);h.rotation.z=.1;for(let j=0;j<3;j++)k.box(g,[.12,-.08+j*.085,.06],[.52,.018,.015],ink);return true;}
 case 278:{k.poly(g,[[-.6,-.19],[.6,-.19],[.6,.18],[-.37,.18],[-.6,-.01]],.09,'#697b80');k.poly(g,[[-.6,-.01],[-.37,.18],[-.6,.18]],.1,'#d0a65d');for(const x of [-.48,.48])for(const y of [-.1,.1])k.ball(g,[x,y,.06],[.026,.026,.015],gold);k.box(g,[0,0,.06],[.48,.055,.015],paper);return true;}
 default:return false;
 }
}

function motionObjects(k:ObjectKit,g:THREE.Group,n:number):boolean {
 switch(n){
 case 2:{
  const halo=k.group(g,[0,3.95,-.05]);halo.rotation.set(.2,0,.18);
  for(let j=0;j<3;j++){const ring=k.arc(halo,[0,j*.11,0],.6+j*.07,.045,['#d6e8e9','#a9d6de','#e7e2d3'][j],j*.8,Math.PI*1.5,[Math.PI/2,.15*j,0]);k.sway(ring,'z',.07,.35,j);}
  const bead=k.ball(halo,[.65,0,0],[.075,.075,.075],'#8bd9e5',true);bead.userData.artMotionTarget=true;k.motions.push((t,m)=>{bead.position.set(Math.cos(m?t*.4:0)*.65,.08,Math.sin(m?t*.4:0)*.65)});return true;
 }
 case 5:{
  const pts:V3[]=[[-1.15,2.5,-.35],[-.4,2.75,-.5],[.4,2.05,-.5],[1.15,2.45,-.35]];k.tube(g,pts,.012,'#99d7e4',true);
  for(const s of [-1,1]){const knot=k.group(g,[s*1.15,2.45+(s<0?.05:0),-.35]);k.arc(knot,[0,0,0],.16,.028,'#9bd9e7',0,Math.PI*2,[.3,s*.3,0],true);k.arc(knot,[0,0,0],.14,.025,'#ddd7ec',0,Math.PI*2,[Math.PI/2,0,.3],true);k.turn(knot,.24);}return true;
 }
 case 12:{for(let j=0;j<5;j++){const x=-1.3+j*.18,y=1.8+j*.37;const panel=k.poly(g,[[-.18,-.17],[.18,-.17],[.18,.06],[.06,.06],[.06,.24],[-.18,.24]],.045,['#a7d8b1','#b6adce','#e3ae9b','#a3cbd3','#b5cf9e'][j],[x,y,-.08],[0,.2,j*.11]);k.bob(panel,.055,.65,j);}return true;}
 case 15:{for(let j=0;j<6;j++){const a=(j-2.5)*.33,p=k.group(g,[0,1.9,-.65]);p.rotation.z=a;const panel=k.poly(p,[[-.1,.5],[.13,.5],[.16,1.8],[-.09,2.0]],.045,j%2?'#a3c99b':'#ab9abe');k.box(p,[.02,1.53,.03],[.065,.16,.008],ink);k.box(p,[.02,.95,.03],[.065,.2,.008],ink);k.sway(p,'z',.018,.5,j);}return true;}
 case 20:{for(let j=0;j<3;j++){const x=(j-1)*1.3;const curtain=k.poly(g,[[-.3,0],[.3,.1],[.22,2.9],[-.22,2.65]],.025,['#a1cdbd','#a8bcd6','#c7b4d5'][j],[x,.3,-.7-j*.12],[0,.1,0],true,.48);k.sway(curtain,'z',.04,.35,j);}return true;}
 case 25:{for(let j=0;j<3;j++){const oval=k.arc(g,[0,2.15,-.7-j*.15],1.05+j*.18,.08,['#81b8ac','#b4d4bf','#dfb6b3'][j]);oval.scale.y=1.25;k.sway(oval,'y',.04,.4,j);}for(let j=0;j<3;j++)k.ball(g,[j===0?-1.2:1.13,1.1+j*.65,-.64],[.17,.28,.1],['#d5b6bf','#b7b0cf','#d5c28e'][j]);return true;}
 case 30:{for(let j=0;j<6;j++){const a=j*Math.PI/3;const tile=k.poly(g,[[-.3,-.25],[.3,-.25],[.42,.13],[0,.42],[-.42,.13]],.055,j%2?'#b2c3b4':'#d1bc9e',[Math.sin(a)*1.0,.06,Math.cos(a)*1.0],[Math.PI/2,0,-a]);k.arc(g,[Math.sin(a)*1.0,.1,Math.cos(a)*1.0],.13,.018,gold,0,Math.PI*2,[Math.PI/2,0,0]);k.sway(tile,'z',.025,.3,j);}return true;}
 case 40:{for(let j=0;j<3;j++){const q=k.group(g,[-.5+j*.45,.05,.8+j*.35]);q.rotation.x=-Math.PI/2;k.arch(q,[0,0,0],.37,.47,['#b4aa98','#bba681','#8f9e98'][j],.035);}return true;}
 case 60:{for(let j=0;j<3;j++){const frame=k.group(g,[0,.08,-.72-j*.22]),w=2.3-j*.36,h=3.35-j*.32;k.arch(frame,[0,0,0],w,h,['#8c83b4','#b6a4cc','#ddc5a3'][j],.07);for(const s of [-1,1])for(let q=0;q<3;q++)k.tube(frame,[[s*w/2,h*.4+q*.45,0],[s*(w/2+.25),h*.58+q*.4,0],[s*(w/2+.32),h*.67+q*.4,0]],.035,'#b5a2c9');k.sway(frame,'y',.02,.3,j);}return true;}
 case 65:{const bloom=k.group(g,[-1.12,2.7,-.25]);for(let j=0;j<6;j++){const a=j*.48-.8;const petal=k.leaf(bloom,[Math.sin(a)*.32,Math.cos(a)*.32,0],.18,.58,'#e6bf77',[0,0,-a]);k.sway(petal,'z',.02,.45,j);}return true;}
 case 80:{for(let j=0;j<11;j++){const a=j*.51,r=1.3;const h=j>4&&j<8?.6:.18;k.crystal(g,[Math.sin(a)*r,h*.35,Math.cos(a)*r],[.32,h,.28],'#62616a');}k.arc(g,[0,.04,0],1.27,.035,'#d79b6c',.4,Math.PI*1.72,[Math.PI/2,0,0],true);return true;}
 case 92:{for(let j=0;j<3;j++){const sock=k.group(g,[-1.25+j*.18,3.2-j*.38,-.1]);sock.rotation.z=-Math.PI/2+.2;for(let q=0;q<3;q++)k.cyl(sock,[0,q*.13,0],.12-q*.022,.135-q*.022,.14,(q+j)%2?'#dcb386':'#d4e1e5');k.sway(sock,'z',.09,.55,j);}return true;}
 case 95:{for(let j=0;j<3;j++){k.poly(g,[[-.32,-.15],[0,.12],[.32,-.15],[.32,0],[0,.28],[-.32,0]],.035,'#b6cfdc',[0,.04,.75+j*.37],[Math.PI/2,0,0]);}for(const s of [-1,1]){k.tube(g,[[s*.6,.02,1.2],[s*.6,.34,1.2]],.018,wood);k.poly(g,[[0,0],[s*.2,-.07],[0,-.14]],.02,'#d6b275',[s*.6,.34,1.2]);}return true;}
 case 100:{for(const s of [-1,1])k.box(g,[s*1.1,1.9,-.3],[.14,.38,.16],s<0?'#b36e71':'#6f9cae');for(let j=0;j<3;j++)k.tube(g,[[-1.1,2.0,-.3],[-.65,2.9+j*.18,-.6],[.65,2.9+j*.18,-.6],[1.1,2.0,-.3]],.028,['#9ebfc0','#bcc7a4','#dbb88c'][j]);return true;}
 case 115:{const shapes:V3[][]=[[[0,0,0],[.1,.18,0],[.28,.22,0],[.42,.1,0],[.37,-.1,0],[.12,-.12,0],[0,0,0]],[[0,0,0],[.16,.3,0],[.2,.07,0],[.44,.15,0],[.3,-.12,0],[.04,-.13,0]],[[0,0,0],[.1,.18,0],[.2,.18,0],[.48,.4,0],[.39,.15,0],[.2,-.02,0],[.1,-.16,0]],[[0,0,0],[.17,.15,0],[.37,.09,0],[.5,-.09,0],[.24,-.12,0],[0,0,0]],[[0,0,0],[.11,.23,0],[.25,.1,0],[.4,.3,0],[.49,.04,0],[.24,-.12,0],[0,0,0]]];shapes.forEach((pts,j)=>{const a=k.group(g,[-1.3+j*.58,.8+Math.sin(j)*.13,-.45]);k.tube(a,pts,.012,'#dcc89b',true);pts.slice(0,-1).forEach(p=>k.ball(a,p,[.028,.028,.028],'#ede1c4',true));k.bob(a,.04,.5,j);});return true;}
 case 125:{const curve:V3[]=[];for(let j=0;j<32;j++){const a=.25+j*5.7/31;curve.push([Math.cos(a)*1.35,2.1+Math.sin(a)*1.35,-.72]);}k.tube(g,curve,.065,'#5c676f');k.tube(g,curve.slice(1,15).map(p=>[p[0]+.025,p[1],p[2]-.015] as V3),.026,'#a5b7ae');return true;}
 case 130:{const paths:V3[][]=[[[0,.6,-.7],[0,1.4,-.7],[-.7,1.4,-.7],[-.7,2.65,-.7],[-1.3,2.65,-.7]],[[0,1.4,-.7],[.8,1.4,-.7],[.8,2.8,-.7],[1.2,2.8,-.7]],[[0,1.1,-.72],[.3,1.8,-.72],[.3,3.3,-.72]],[[0,1.7,-.73],[-.25,2.1,-.73],[-.25,3.1,-.73]]];paths.forEach((p,j)=>{k.tube(g,p,.035,j%2?'#a2c1af':'#d2ad79',true);const end=p[p.length-1];k.arc(g,end,.09,.027,'#e5d6ad');});return true;}
 case 137:{for(let j=0;j<4;j++){const a=j*Math.PI/2+.4;const tile=k.page(g,[-1.1+Math.cos(a)*.34,2.65+Math.sin(a)*.34,-.1],.28,.34,['#d5c49b','#a0b2a2','#9facbf','#baa9c5'][j],[0,.1,-a*.15]);k.box(tile,[0,.02,.03],[.12,.06,.02],ink);k.bob(tile,.035,.6,j);}return true;}
 case 142:{for(let j=0;j<2;j++){const h=k.hourglass(g,[(j-.5)*.5,.23,.75+j*.45],.5);h.rotation.y=.4-j*.6;}k.tube(g,[[-.3,.05,.65],[0,.08,.9],[.28,.06,1.25],[.1,.04,1.65]],.035,'#d7bb8d');return true;}
 case 145:{for(let j=0;j<3;j++){const p=k.group(g,[(j-1)*.24,.2,-.65-j*.2]);p.rotation.z=(j-1)*.055;k.poly(p,[[-.85,0],[.85,0],[.85,3.3],[-.85,3.3]],.03,['#a9bad0','#bda5c8','#d6c19d'][j],[0,0,0],undefined,false,.14);k.arch(p,[-.01,0,.02],1.7,3.45,['#bcb2d2','#b1c9d3','#dbc4a0'][j],.025);k.sway(p,'y',.025,.35,j);}return true;}
 case 151:{const dyson=k.group(g,[-1.25,2.8,-.15]);k.ball(dyson,[0,0,0],[.2,.2,.2],'#e7b96e',true);for(let j=0;j<5;j++){const a=j*Math.PI*.4;const petal=k.group(dyson,[Math.cos(a)*.48,Math.sin(a)*.48,0]);petal.rotation.set(0,.35,-a+Math.PI/2);k.poly(petal,[[-.16,-.18],[.16,-.18],[.23,.22],[0,.31],[-.23,.22]],.05,j%2?'#c5c9ba':'#aebec7');k.box(petal,[0,.02,.04],[.23,.28,.025],'#667787');k.sway(petal,'x',.16,.4,j);}k.arc(dyson,[0,0,0],.58,.014,gold,0,Math.PI*1.6,[.6,.3,0]);k.turn(dyson,.1);return true;}
 case 166:{campfire(k,g,[-1.15,.05,.25],.65);return true;}
 case 172:{for(let j=0;j<3;j++){const h=k.group(g,[-1.1+j*.23,1.5+j*.3,.05]);h.rotation.z=(j-1)*.35;k.box(h,[0,0,0],[.13,.44,.12],['#d4d77b','#d9a2ba','#a5c8b7'][j]);if(j!==2)k.box(h,[0,.25,0],[.15,.13,.14],ink);else k.poly(h,[[-.05,.22],[.05,.22],[.03,.31],[-.03,.31]],.07,'#aaa572');k.bob(h,.035,.7,j);}return true;}
 case 188:{for(let j=0;j<5;j++){const q=k.group(g,[j%2?.22:-.22,.04,.7+j*.21]);for(let z=0;z<5;z++)k.box(q,[(z-2)*.035,0,0],[.014,.035,.15+Math.abs(z-2)*.04],'#8a969b',[0,(z-2)*.17,0]);}return true;}
 case 189:{for(let j=0;j<5;j++){const p=k.group(g,[-1.15+Math.sin(j)*.2,1.65+j*.37,-.05]);k.tube(p,[[0,-.18,0],[0,0,0]],.009,'#a5ad84');for(let z=0;z<4;z++){const a=z*Math.PI/2;k.leaf(p,[Math.cos(a)*.08,.07+Math.sin(a)*.04,Math.sin(a)*.05],.08,.2,'#d9dfc1',[0,a,-.3]);}k.bob(p,.045,.4,j);}return true;}
 case 210:{for(let j=0;j<4;j++){const q=k.group(g,[j%2?.22:-.22,.045,.7+j*.25]);for(let a=0;a<4;a++){const angle=a*Math.PI/2;k.arc(q,[Math.cos(angle)*.075,0,Math.sin(angle)*.095],.09,.015,'#cfe2e0',angle,Math.PI,[Math.PI/2,0,0]);}}return true;}
 case 221:{for(let j=0;j<4;j++)k.arc(g,[j%2?.2:-.2,.045,.65+j*.27],.14,.045,'#c2c7d3',.4,Math.PI*1.45,[Math.PI/2,0,j*.2]);return true;}
 case 222:{for(let j=0;j<4;j++){const page=k.page(g,[-1.15+Math.sin(j*1.5)*.24,1.7+j*.43,-.05],.3,.4,paper,[0,j*.2,(j-1.5)*.14]);k.bob(page,.04,.55,j);}return true;}
 case 234:{for(let j=0;j<5;j++){const fly=k.group(g,[-1.13+Math.sin(j*1.6)*.3,1.65+j*.35,Math.cos(j*1.6)*.16]);k.ball(fly,[0,0,0],[.03,.06,.025],'#dbca7e',true);for(const s of [-1,1])k.leaf(fly,[s*.045,.015,0],.065,.12,'#baccac',[0,0,-s*.85]);k.bob(fly,.07,.6,j);}return true;}
 case 243:{for(let j=0;j<4;j++){const page=k.page(g,[j%2?.2:-.2,.09,.7+j*.25],.22,.29,paper,[-Math.PI/2+.1,0,j*.3]);k.sway(page,'x',.12,.45,j);}return true;}
 case 244:{for(let j=0;j<4;j++){const leaf=k.leaf(g,[j%2?.18:-.18,.08,.7+j*.25],.14+j*.01,.28,['#a8ba89','#c8ae7c','#b79782','#899e74'][j],[-Math.PI/2,0,j*.8]);k.sway(leaf,'x',.08,.6,j);}return true;}
 case 254:{for(let j=0;j<3;j++){const bubble=k.ball(g,[j%2?.2:-.2,.13,.8+j*.3],[.15+j*.03,.08+j*.05,.18],glass,false,.42);k.bob(bubble,.02,.6,j);}return true;}
 case 259:{for(let j=0;j<7;j++){const a=j*.5;const bubble=k.ball(g,[-1.05+Math.sin(a)*.26,1.45+j*.29,-.1],Array(3).fill(.11+(j%3)*.025) as V3,glass,false,.38);k.bob(bubble,.04,.6,j);}k.arc(g,[-.87,2.01,.04],.055,.013,'#d9c4ad',0,Math.PI*1.7);return true;}
 case 262:{for(let j=0;j<2;j++){const a=k.group(g,[-1.1+j*.4,2.3+j*.4,-.05]);for(const s of [-1,1])k.ball(a,[s*.055,0,0],[.11,.14,.12],j?'#b4c18b':'#be7770');k.tube(a,[[0,.1,0],[.02,.2,0]],.012,wood);k.leaf(a,[.06,.17,0],.07,.14,'#8aa173',[0,0,-.7]);if(j)k.ball(a,[.1,.02,.1],[.045,.055,.018],paper);k.bob(a,.06,.6,j);}k.leaf(g,[-1.35,3.1,0],.13,.27,'#91aa77',[0,.2,-.4]);return true;}
 case 263:{const points:V3[]=[];for(let j=0;j<7;j++)points.push([Math.sin(j*.9)*.18,.06+j*.006,.65+j*.17]);k.tube(g,points,.026,'#c7c3ac');for(let j=0;j<4;j++)k.page(g,[points[j+1][0],.08,points[j+1][2]],j%2?.12:.21,.2,paper,[-Math.PI/2,0,j*.5]);return true;}
 case 264:{k.cloud(g,[0,.35,1.1],.65,'#aebdca');for(let j=0;j<3;j++){const drop=k.ball(g,[(j-1)*.22,.12,.95+j*.13],[.045,.09,.045],'#a1cad5',false,.7);k.bob(drop,.025,.65,j);k.ball(g,[(j-1)*.22,.025,.95+j*.13],[.1,.01,.07],'#bfd4dc',false,.5);}return true;}
 case 265:{for(let j=0;j<6;j++){const b=k.ball(g,[Math.sin(j*1.8)*.25,.12+j*.02,.6+j*.2],[.08+j*.009,.1,.075+j*.008],glass,false,.32);k.bob(b,.03,.55,j);}return true;}
 case 272:{const phoenix=k.group(g,[0,2.1,-.7]);k.crystal(phoenix,[0,0,0],[.16,.4,.1],'#d8bfd9');for(const s of [-1,1]){k.poly(phoenix,[[0,.1],[s*.65,.7],[s*1.25,.52],[s*.7,.1],[s*.25,-.05]],.055,s<0?'#aacbd1':'#ccb5d2');k.poly(phoenix,[[s*.1,-.2],[s*.35,-.95],[s*.08,-.72]],.05,'#bdc8df');}k.crystal(phoenix,[0,.5,0],[.15,.2,.1],gold);k.sway(phoenix,'y',.025,.4);return true;}
 case 280:{k.tube(g,[[0,.06,.55],[-.3,.08,.8],[.27,.07,1.2],[-.12,.05,1.65]],.065,'#c0dfe2');for(const [x,z,r] of [[-.25,.8,-.2],[.2,1.23,.3]])k.poly(g,[[-.2,0],[0,.4],[.2,.05]],.05,'#b0d3df',[x,.06,z],[0,r,0]);return true;}
 case 294:{const hole=k.group(g,[-1.2,2.7,-.1]);k.ball(hole,[0,0,0],[.3,.3,.16],'#202438');k.arc(hole,[0,0,0],.46,.055,'#c1a1d0',0,Math.PI*2,[.7,.15,.25],true);k.arc(hole,[0,0,-.05],.64,.016,'#d1b583',.3,Math.PI*1.8,[-.6,.2,-.25],true);k.turn(hole,.1);return true;}
 default:return false;
 }
}

function campfire(k:ObjectKit,g:THREE.Group,p:V3,scale=1){const q=k.group(g,p);q.scale.setScalar(scale);for(const s of [-1,1])k.cyl(q,[0,.06,0],.07,.07,.65,wood,[Math.PI/2,0,s*.6]);for(let j=0;j<3;j++){const flame=k.leaf(q,[(j-1)*.1,.25+(j===1?.05:0),0],.22,.5-j*.05,['#dfa574','#edc48a','#c98567'][j],[0,j*.3,(j-1)*.25]);k.sway(flame,'z',.04,.8,j);}return q;}

function spaces(k:ObjectKit,g:THREE.Group,n:number):boolean {
 switch(n){
 case 35:{
  k.cloud(g,[0,-.18,-1.25],3.6,'#adb9c7');k.box(g,[0,.04,-1.35],[4.5,.16,2.1],'#b4a88d');
  for(const s of [-1,1])for(let j=0;j<3;j++){const x=s*(1.15+j*.42),h=s<0?2.4:1.85;k.cyl(g,[x,h/2,-1.75],.13,.17,h,'#d7cab0');k.box(g,[x,h,-1.75],[.35,.15,.42],paper);}
  k.box(g,[-1.55,2.55,-1.75],[1.4,.15,.6],paper);k.box(g,[1.55,2.0,-1.75],[1.4,.15,.6],paper);
  k.shelf(g,[-1.75,.18,-1.05],.8,1.25,'#9a7962');k.shelf(g,[1.75,.18,-1.05],.8,1.1,'#9a7962');k.desk(g,[0,.1,-1.05],1.5);for(let j=0;j<4;j++)k.book(g,[-.72+j*.45,1.6+Math.sin(j)*.1,-1.8],.35,.2,.06,['#8a7c9d','#9cac9c','#b49675','#8395aa'][j],[Math.PI/2,0,j*.08]);return true;
 }
 case 45:{
  k.poly(g,[[-1.7,-1],[0,1.4],[1.7,-1],[.6,-1],[0,.1],[-.6,-1]],.16,'#75899a',[0,-.03,-1.2],[Math.PI/2,0,0]);k.desk(g,[0,.05,-1.65],1.2,'#9e8b73');
  for(const s of [-1,1])k.tube(g,[[s*.8,1.0,-2.0],[s*1.8,1.8,-2.15],[s*2.3,3.0,-2.4]],.08,s<0?'#aebbd1':'#c9b4d3',true);for(let j=0;j<5;j++)k.star(g,[(j-2)*.75,2.1+(j%2)*.5,-2.3],.08,paper);return true;
 }
 case 50:{
  k.floor(g,'#779e9e',2.35);for(const [x,h] of [[-1.7,2.2],[1.65,1.75],[.9,2.8]]){const b=k.branches(g,[x,.05,-1.7],h,['#c3918c','#bda2a0','#96b6ae'][Math.round(Math.abs(x)*2)%3]);b.rotation.z=x<0?-.12:.12;}
  k.ball(g,[0,.3,-1.2],[1,.22,.45],'#ddc9b9');for(let j=0;j<7;j++)k.tube(g,[[0,.3,-1.25],[(j-3)*.22,.9-Math.abs(j-3)*.08,-1.65]],.045,'#dfc9ba');return true;
 }
 case 55:{
  k.floor(g,'#807e99');for(let j=0;j<4;j++){const x=(j-1.5)*.23;k.poly(g,[[-2.1,0],[-1.75,1.4],[-.75,1.1],[.05,2.75],[.7,1.65],[1.75,2.15],[2.2,0]],.05,['#a6a5bb','#b9b0ca','#cbc0d3','#d8d0d9'][j],[x,.05,-1.6-j*.15]);}
  k.desk(g,[0,.06,-.9],2,'#9a8b78',.8);k.page(g,[0,.8,-.9],.85,.48,paper,[-Math.PI/2,0,-.1]);return true;
 }
 case 75:{
  k.floor(g,'#778b70');for(const s of [-1,1]){k.tube(g,[[s*.7,0,-1.3],[s*.9,.8,-1.6],[s*.72,1.7,-1.8],[s*.9,2.4,-1.7]],.24,wood);k.tube(g,[[s*.8,1.7,-1.8],[s*1.7,2.3,-1.7],[s*2.1,2.5,-1.6]],.13,wood);}
  k.tube(g,[[-.9,2.3,-1.7],[0,2.7,-1.9],[.9,2.4,-1.7]],.2,wood);for(let j=0;j<7;j++){const x=(j-3)*.55,y=2.8+Math.sin(j)*.25;k.book(g,[x,y,-1.7],.42,.35,.06,['#8aa47c','#a2b28a','#84997c'][j%3],[0,0,(j-3)*.12]);}
  k.desk(g,[0,.07,-1.25],1.4,wood);k.ball(g,[-1.35,.13,-.3],[.6,.18,.32],'#7f936c');return true;
 }
 case 90:{
  for(const s of [-1,1])k.box(g,[s*1.1,-.02,-1.1],[2.15,.2,2.2],paper,[0,0,-s*.025]);k.box(g,[0,-.04,-1.1],[.14,.28,2.3],'#a07678');
  for(const [x,h,w] of [[-1.55,2.55,.6],[1.4,1.8,.75]]){k.box(g,[x,h/2,-1.8],[w,h,.5],'#b4b0b9');k.cone(g,[x,h+.27,-1.8],w*.7,.65,'#8e6f88',[0,0,0],4);for(let j=0;j<2;j++)k.box(g,[x,h*.4+j*.55,-1.53],[.14,.24,.025],ink);}
  k.box(g,[0,.95,-1.9],[2.3,1.8,.25],'#c8bdb6');k.arch(g,[0,.12,-1.7],.8,1.65,wood,.09);k.desk(g,[0,.06,-.75],1.2,'#a98f72',.7);k.chair(g,[1.4,.03,-.55],'#af96ab',-.3);return true;
 }
 case 120:{
  k.floor(g,'#526d83');const win=k.group(g,[0,1.95,-1.9]);k.ball(win,[0,0,0],[2.0,1.42,.1],'#4c7b90');k.arc(win,[0,0,.07],1.0,.065,'#b0bdbb').scale.set(2.05,1.47,1);k.desk(g,[0,.05,-1.3],2.3,'#7a8990');for(const x of [-1.1,1.15])k.poly(win,[[-.22,0],[0,.09],[.25,0],[.05,-.06]],.015,'#a3c5c7',[x,.25-x*.2,.12]);return true;
 }
 case 140:{
  k.floor(g,'#8d9593');for(let j=0;j<4;j++){const x=(j-1.5)*1.05;const a=k.group(g,[x,.05,-1.7]);a.rotation.y=-(j-1.5)*.15;k.arch(a,[0,0,0],.92,2.5,['#9da8ad','#8ebbc4','#97b28a','#c7d1d7'][j],.12);if(j===0)for(let q=0;q<3;q++)k.crystal(a,[-.42,.4+q*.6,0],[.16,.17,.12],'#acb2af');if(j===1)k.tube(a,[[-.38,.2,0],[-.2,1.1,0],[-.38,2.1,0]],.04,'#b3d2db');if(j===2)for(let q=0;q<4;q++)k.leaf(a,[.38,.5+q*.45,0],.18,.32,'#93b57d',[0,0,-.5]);if(j===3)k.cloud(a,[0,2.4,0],.8);}
  k.cyl(g,[0,.7,-1.1],.8,.8,.1,wood);k.cyl(g,[0,.35,-1.1],.12,.28,.7,wood);return true;
 }
 case 150:{
  for(let j=0;j<6;j++)k.box(g,[0,j*.12,-.5-j*.3],[2.3-j*.12,.12,.38],['#b5adc5','#c9b5bd','#d7c6b9'][j%3]);k.box(g,[0,.76,-2.45],[3.8,.15,1.3],'#cabeb5');k.desk(g,[0,.84,-2.45],1.3,'#b8a68e');k.tube(g,[[-2,2.1,-2.7],[-1,2.9,-2.7],[0,3.15,-2.7],[1.2,2.7,-2.7],[2,3.05,-2.7]],.1,'#b6cfc7',true);k.tube(g,[[-1.6,.8,-2.3],[-1.6,2,-2.3]],.03,gold);k.poly(g,[[0,0],[.55,-.05],[.35,-.38],[0,-.3]],.035,'#b39ec5',[-1.6,2,-2.3]);return true;
 }
 case 193:{
  k.floor(g,'#939c8d',2.1);k.desk(g,[0,.04,-1.1],2.2,'#a19682');for(const s of [-1,1])for(let j=0;j<4;j++)k.ball(g,[s*1.65,.2+j*.27,-1.45],[.47-j*.06,.16,.3-j*.025],['#a1a49c','#929b95','#b6b5a8','#858f8c'][j]);k.box(g,[0,.12,-.2],[.72,.18,.55],'#929b85',undefined,.07);k.plant(g,[-.8,.77,-1.2],.65);return true;
 }
 case 194:{
  k.floor(g,'#797d72',2.1);for(let j=0;j<7;j++){const a=j*Math.PI*2/7;k.ball(g,[Math.cos(a)*.65,.12,-.9+Math.sin(a)*.55],[.2,.13,.15],'#979b93');}campfire(k,g,[0,.1,-.9],.95);k.cyl(g,[-1.2,.2,-.7],.2,.2,1.0,'#a5aca3',[0,0,Math.PI/2]);k.tube(g,[[.6,.1,-1.2],[.7,1.25,-1.1],[.4,1.4,-1.1]],.03,wood);k.ball(g,[.4,.8,-1.1],[.22,.23,.19],ink);k.arc(g,[.4,1.02,-1.1],.15,.025,gold,0,Math.PI);return true;
 }
 case 223:{
  k.floor(g,'#7f7d86');k.shelf(g,[-1.45,.08,-1.65],1.2,2.3);k.shelf(g,[1.45,.08,-1.65],1.2,2.7);k.desk(g,[0,.04,-1.1],1.35);const ladder=k.group(g,[-.8,.1,-.6]);ladder.rotation.z=-.24;ladder.rotation.x=-.15;for(const x of [-.25,.25])k.box(ladder,[x,1.35,0],[.065,2.7,.065],gold);for(let j=0;j<7;j++)k.box(ladder,[0,.2+j*.37,0],[.55,.045,.065],gold);return true;
 }
 case 224:{
  k.floor(g,'#708d8f');k.box(g,[0,1.4,-1.9],[3.4,2.8,.2],'#8ba6a4');k.cyl(g,[.5,1.75,-1.76],.92,.92,.04,'#a9d1c4',[Math.PI/2,0,0]);k.arc(g,[.5,1.75,-1.7],.96,.1,'#d4d1be');for(let j=0;j<4;j++)k.ball(g,[.5+Math.sin(j)*.5,1.75+Math.cos(j)*.5,-1.65],[.12,.18,.02],['#d2b6c2','#aabbb8','#d6c48d','#b5b5d1'][j]);k.box(g,[0,.48,-1.0],[2.8,.7,.8],'#b7c7bd');k.box(g,[0,.87,-1.0],[2.7,.15,.84],'#c6d1c5',undefined,.06);for(let j=0;j<3;j++)k.box(g,[-1.1+j*.75,.4,-.57],[.58,.24,.035],wood);return true;
 }
 case 225:{
  k.floor(g,'#818a88');for(const s of [-1,1])for(let j=0;j<4;j++){const x=s*(1.65-j*.3),y=j*.28;k.box(g,[x,y+.13,-1.3],[.55,.26,.7],['#a8a2b4','#b5aabf','#c5b4b9','#b0b7a2'][j]);k.plant(g,[x,y+.27,-1.35],.45);}k.desk(g,[0,.02,-.85],1.1);const tree=k.branches(g,[0,1.2,-1.55],1.25,wood);for(const s of [-1,1])k.leaf(tree,[s*.25,.9,0],.4,.7,'#9caf88',[0,0,-s*.7]);return true;
 }
 case 226:{
  k.cloud(g,[0,-.18,-1],3.6);for(let j=0;j<9;j++)k.box(g,[(j-4)*.4,.03,-1],[.37,.12,2.0],wood);k.desk(g,[0,.08,-1.3],1.5);k.tube(g,[[1.55,0,-1.5],[1.55,2.2,-1.5]],.035,gold);const sock=k.group(g,[1.55,2.15,-1.5]);sock.rotation.z=-Math.PI/2;for(let j=0;j<4;j++)k.cyl(sock,[0,j*.17,0],.15-j*.025,.17-j*.025,.18,j%2?'#d9b385':paper);k.sway(sock,'z',.08,.5);return true;
 }
 case 227:{
  k.floor(g,'#8a8d82');k.desk(g,[0,.05,-1.1],2.2,'#a68c6c');k.box(g,[0,1.65,-1.7],[2.3,1.25,.1],'#a8b1a6');for(let j=0;j<3;j++){k.tube(g,[[-.65+j*.65,1.32,-1.61],[-.65+j*.65,1.86,-1.61]],.035,ink);k.arc(g,[-.65+j*.65,1.96,-1.61],.13,.045,ink,j===1?0:.5,j===1?Math.PI*2:Math.PI*1.5);}k.chair(g,[1.2,.05,-.35],'#b79585');k.arch(g,[-1.4,.1,-1.45],.1,2.9,ink,.035);k.tube(g,[[-1.45,2.8,-1.45],[-.7,3.1,-1.4],[.2,2.85,-1.4]],.035,ink);k.cone(g,[.2,2.75,-1.4],.27,.25,'#c8b875',[Math.PI,0,0]);return true;
 }
 case 246:{
  k.floor(g,'#687f8e');k.box(g,[0,1.5,-1.95],[3.6,3,.15],'#8b9eaa');k.cyl(g,[0,2,-1.84],1.05,1.05,.03,'#66768d',[Math.PI/2,0,0]);k.arc(g,[0,2,-1.78],1.1,.095,gold).scale.y=.82;k.desk(g,[0,.05,-1.3],1.75,'#ab977b');k.tube(g,[[-1.7,2.5,-1.1],[-.8,2.08,-1],[.25,2.25,-1.15]],.1,'#bdc3b2');return true;
 }
 case 247:{
  k.floor(g,'#5f626a');k.tube(g,[[-2,.02,-.7],[-.9,.035,-1.3],[.6,.02,-.6],[2,.035,-1.4]],.15,'#c48c68',true);for(let j=0;j<4;j++)k.ball(g,[-1.1+j*.7,.1,-.8+(j%2)*.25],[.4,.09,.3],'#74777a');k.desk(g,[0,.08,-1.6],1.5,'#92948e');k.plant(g,[1.55,.15,-1.4],1.1,'#91a675');return true;
 }
 case 248:{
  k.floor(g,'#c5b18b');for(const s of [-1,1]){k.cyl(g,[s*1.55,.75,-1.5],.23,.3,1.5,'#b3a387');k.box(g,[s*1.55,1.55,-1.5],[.66,.16,.62],'#d7c8aa');}k.arc(g,[0,.65,-1.2],.8,.19,'#b49d7a',0,Math.PI,[Math.PI/2,0,0]);k.box(g,[0,.1,-.2],[1.1,.16,.65],'#9c8b8d',undefined,.07);for(let j=0;j<6;j++)k.star(g,[(j-2.5)*.55,2.3+Math.sin(j)*.45,-2],.07,paper);return true;
 }
 case 267:{
  k.floor(g,'#819b8b');for(let j=0;j<3;j++){const bottle=k.group(g,[(j-1)*1.22,.7+(j===1?.5:0),-1.5]);bottle.rotation.z=j===1?.7:-Math.PI/2;k.ball(bottle,[0,0,0],[.5,.85,.43],glass,false,.21);k.cyl(bottle,[0,.81,0],.18,.25,.35,gold);k.plant(bottle,[0,-.45,.05],.7);}k.desk(g,[0,.03,-.85],1.5);return true;
 }
 case 268:{
  k.floor(g,'#a09f90');k.desk(g,[0,.06,-1.1],1.7,'#a68e6d');for(const s of [-1,1]){const panel=k.group(g,[s*1.5,.85,-1.6]);panel.rotation.x=-.35;k.box(panel,[0,0,0],[.88,1.4,.09],'#546f82');for(let j=0;j<4;j++)k.box(panel,[0,-.5+j*.34,.06],[.8,.015,.015],'#a8bec8');k.box(panel,[0,0,.06],[.015,1.3,.015],'#a8bec8');}k.plant(g,[.65,.78,-1.1],.6);k.poly(g,[[-1.9,0],[1.9,0],[1.7,.65],[-1.65,.65]],.04,'#dfc291',[0,2.35,-1.55],[Math.PI/2,0,0]);return true;
 }
 case 269:{
  k.floor(g,'#858f89');k.desk(g,[0,.05,-1.0],2.2,'#798a8b');k.arc(g,[0,.5,-1.9],1.7,.11,'#887c67',0,Math.PI);for(let j=0;j<7;j++){const a=j*Math.PI/6;k.tube(g,[[0,.5,-1.9],[Math.cos(a)*1.65,.5+Math.sin(a)*1.65,-1.9]],.035,'#887c67');}k.tube(g,[[.5,2.2,-1.8],[.5,1.65,-1.8]],.018,ink);const bulb=k.ball(g,[.5,1.55,-1.8],[.12,.17,.12],'#e4c994',true);k.sway(bulb,'z',.04,.6);return true;
 }
 case 270:{
  k.box(g,[0,-.03,-1.2],[3.7,.15,2.5],wood);for(const x of [-1.7,1.7]){k.box(g,[x,1.3,-1.6],[.14,2.6,1.5],wood);k.box(g,[x,2.6,-1.6],[.18,.15,1.8],'#a19074');}k.poly(g,[[-2,0],[0,1.15],[2,0]],.18,'#849383',[0,2.55,-1.6]);k.desk(g,[0,.04,-1.5],2.0);k.plant(g,[1.2,1.9,-1.3],1.2);k.tube(g,[[1.2,2.8,-1.3],[1.2,2.15,-1.3]],.015,gold);k.box(g,[-1.3,.1,-.2],[.8,.18,.6],'#acb49d',undefined,.08);return true;
 }
 case 273:{
  k.floor(g,'#7e9ca0');for(let j=0;j<9;j++){const a=(j-4)*.22;const rib=k.group(g,[0,.25,-1.4]);rib.rotation.z=a;k.tube(rib,[[0,0,0],[-.3,1.3,-.2],[0,3,-.3],[.3,1.3,-.2]],.065,'#c9d2c7');}k.ball(g,[0,1.65,-1.95],[1.8,1.6,.08],'#80adb8',false,.45);k.desk(g,[0,.08,-1.1],2.0,'#b7baab');k.ball(g,[-1.45,.3,-.5],[.45,.24,.6],'#a5bdb8');return true;
 }
 case 274:{
  k.floor(g,'#6c7d8c');k.arc(g,[0,1.75,-1.95],1.65,.13,'#c1cbd0',.1,Math.PI*1.65);k.arc(g,[0,1.75,-1.98],1.9,.045,'#7facb8',.2,Math.PI*1.7,undefined,true);for(let j=0;j<8;j++){const a=.2+j*.63;k.box(g,[Math.cos(a)*1.65,1.75+Math.sin(a)*1.65,-1.9],[.22,.3,.16],gold,[0,0,a]);}k.desk(g,[0,.05,-1.1],2.2,'#a7b0af');k.chair(g,[1.15,.06,-.4],'#788b98',-.2);k.cyl(g,[.75,.87,-1.1],.08,.07,.16,paper);k.arc(g,[.83,.88,-1.1],.065,.02,paper,0,Math.PI);return true;
 }
 case 277:{
  k.floor(g,'#a8a79a',1.8);k.box(g,[0,1.5,-1.5],[2.8,2.8,.13],'#c4bba6');k.cyl(g,[0,2.05,-1.4],.72,.72,.025,'#d6c096',[Math.PI/2,0,0]);k.arc(g,[0,2.05,-1.34],.75,.065,paper);k.box(g,[0,2.05,-1.3],[.04,1.45,.04],paper);k.box(g,[0,2.05,-1.3],[1.45,.04,.04],paper);k.desk(g,[0,.04,-1.0],1.55,'#a58e71');k.plant(g,[-.55,.78,-1.03],.45);return true;
 }
 case 290:{
  for(let j=0;j<3;j++)k.box(g,[0,j*.14,-1.0-j*.25],[2.1-j*.32,.14,1.0],'#8c91aa');const moon=k.arc(g,[0,1.55,-1.55],1.0,.19,'#c7c4d7',.42,Math.PI*1.55);moon.rotation.z=.15;k.box(g,[0,.7,-1.35],[1.1,.15,.75],'#aea4c2');for(const s of [-1,1]){k.cyl(g,[s*1.6,1.3,-1.7],.09,.14,2.6,'#aaaabd');k.star(g,[s*1.6,2.75,-1.7],.18,gold);}k.desk(g,[-1.0,.05,-.5],.8,'#a49cac');return true;
 }
 case 297:{
  k.floor(g,'#8892a5');for(const s of [-1,1]){const dome=k.arc(g,[0,.6,-1.9],2.0,.11,'#b7b2c8',s<0?Math.PI/2:0,Math.PI/2);dome.rotation.y=s*.24;for(let j=1;j<3;j++)k.arc(g,[0,.6,-1.9],2.0-j*.2,.035,'#a3a5bf',s<0?Math.PI/2:0,Math.PI/2,[0,s*(.25+j*.15),0]);}k.desk(g,[0,.05,-1.25],2.0,'#b7a993');k.box(g,[1.9,.1,-.6],[1.2,.12,1.1],'#a1a0aa');const meteor=k.group(g,[.9,2.95,-2.15]);meteor.userData.artMotionTarget=true;k.crystal(meteor,[0,0,0],[.08,.08,.06],paper);k.tube(meteor,[[0,0,0],[-.55,.28,0],[-.95,.4,0]],.025,'#dbceb0',true);k.motions.push((t,m)=>{meteor.position.x=m?.9+Math.sin(t*.13)*.4:.9});return true;
 }
 default:return false;
 }
}
