import * as T from 'three';
import {CharacterKit,shade,headGeometry,surfacePatch,surfaceStroke,ellipseShape,mergeStaticParts} from './characterKit';
import {createHair} from './avatarHair';
import type {Appearance,AvatarBody} from './types';

/** Rounded-square character; saved appearance and all attachment frames remain stable. */
export function createAvatarBody(appearance:Appearance):AvatarBody{
 // Prefer-not-to-say intentionally uses the male base requested for Memmara.
 const k=new CharacterKit(),group=k.group,skin=appearance.skin,top=appearance.top,female=appearance.gender==='female';
 const body=k.groupAt(group,[0,0,0],'body');
 k.box(body,[0,2.01,0],[.80,1.04,.42],skin,.065);
 const neck=k.box(body,[0,2.58,0],[.26,.27,.24],skin,.055);neck.name='neck';
 k.box(body,[0,1.40,0],[.75,.28,.40],skin,.06);
 const bottoms=k.groupAt(body,[0,0,0],'starterBottoms');
 k.box(bottoms,[0,1.41,.005],[.86,.23,.50],'#293D50',.05);
 for(const s of[-1,1]){
  k.box(body,[s*.235,.81,.015],[.29,1.19,.27],skin,.045);
  k.box(body,[s*.235,.235,.015],[.25,.27,.25],skin,.04);
  k.box(body,[s*.235,.13,.10],[.29,.18,.43],skin,.05);
  k.box(bottoms,[s*.235,.95,.015],[.375,.88,.385],'#293D50',.045);
  k.box(bottoms,[s*.235,.49,.015],[.35,.40,.365],'#293D50',.045);
  k.box(bottoms,[s*.235,.32,.015],[.36,.10,.38],'#354C60',.022,1);
 }
 const shoes=k.groupAt(body,[0,0,0],'starterShoes');
 for(const s of[-1,1]){
  k.box(shoes,[s*.235,.055,.13],[.41,.11,.64],'#EDEBDF',.04);
  k.box(shoes,[s*.235,.16,.12],[.385,.23,.59],'#D7DED9',.075);
  k.box(shoes,[s*.235,.255,.015],[.34,.21,.34],'#497B78',.055);
  k.box(shoes,[s*.235,.255,.235],[.31,.055,.19],'#EDEBDF',.02,1);
 }
 const starterTop=k.groupAt(body,[0,0,0],'starterTop');
 const torso=k.box(starterTop,[0,2.01,.006],[.94,1.05,.56],top,.065);torso.name='torso_clothing';
 k.box(starterTop,[0,1.51,.006],[.94,.085,.565],shade(top,-.08),.025,1);
 k.box(starterTop,[0,2.49,.15],[.35,.075,.22],shade(top,.12),.035);
 k.box(starterTop,[-.22,1.94,.291],[.20,.19,.022],shade(top,-.07),.025,1);
 const arms:T.Group[]=[];
 for(const s of[-1,1]){
  const arm=k.groupAt(body,[s*.54,2.38,0]);arms.push(arm);
  k.box(arm,[s*.012,-.30,.01],[.30,.73,.29],skin,.055);
  k.box(arm,[s*.018,-.77,.035],[.28,.53,.27],skin,.048);
  const sleeve=k.groupAt(arm,[0,0,0],'starterSleeve');
  k.box(sleeve,[0,-.17,.01],[.38,.48,.39],top,.07);
  k.box(sleeve,[s*.005,-.385,.015],[.385,.075,.395],shade(top,-.065),.025,1);
  const hand=k.groupAt(arm,[s*.018,-1.015,.055],'hand');
  k.box(hand,[0,-.065,.015],[.25,.24,.23],skin,.065);
  const thumb=k.box(hand,[-s*.13,-.025,.065],[.11,.15,.115],skin,.045);thumb.rotation.z=s*.30;
 }
 const head=k.groupAt(body,[0,3.03,0],'head');head.scale.set(female?1.13:1.09,female?1.06:1.09,1.09);
 const face=k.mesh(head,headGeometry(),skin);face.name='face';
 for(const s of[-1,1]){
  k.oval(head,[s*.474,-.015,-.005],[.065,.108,.065],skin);
  k.oval(head,[s*.503,-.015,.031],[.018,.054,.022],shade(skin,-.19));
 }
 const eyes=k.groupAt(head,[0,0,0],'eyes'),eyeUpdates:((open:number,gaze:number)=>void)[]=[];
 const browColour=shade(appearance.hair,-.18),mouthColour=shade(skin,-.48);
 const linerColour=shade(appearance.hair,-.30);
 const lipColour=new T.Color('#B75D76').lerp(new T.Color(skin),.22).getStyle();
 for(const s of[-1,1]){
  const cx=s*.184,cy=.025,w=appearance.eyeShape==='wide'?.119:appearance.eyeShape==='soft'?.104:.110,h=appearance.eyeShape==='soft'?.072:.083;
  const bounds=(x:number)=>{const arc=Math.sqrt(Math.max(0,1-((x-cx)/w)**2)),tilt=-s*(x-cx)*.06;return {lo:cy-h*.72*arc+tilt,hi:cy+h*arc+tilt};};
  const shape=new T.Shape();
  for(let i=0;i<=20;i++){const x=cx-w+i/20*w*2,{hi}=bounds(x);if(!i)shape.moveTo(x,hi);else shape.lineTo(x,hi);}
  for(let i=20;i>=0;i--){const x=cx-w+i/20*w*2;shape.lineTo(x,bounds(x).lo);}shape.closePath();
  const white=surfacePatch(k,eyes,shape,'#F2EBDD',.003);
  const iris=surfacePatch(k,eyes,ellipseShape(cx+.007,cy+.002,.046,.061),'#59402F',.0045);
  const pupil=surfacePatch(k,eyes,ellipseShape(cx+.009,cy+.004,.029,.047),'#251F24',.006);
  const shine=surfacePatch(k,eyes,ellipseShape(cx-.008,cy+.029,.010,.014),'#FFF9EF',.0075);
  const closed=surfaceStroke(k,eyes,t=>{const x=cx-w+t*2*w;return[x,bounds(x).lo+.002];},.010,browColour,.004);closed.visible=false;closed.name='closed_lid';
  eyeUpdates.push((open,gaze)=>{
   white.mesh.visible=open>.055;iris.mesh.visible=open>.055;pupil.mesh.visible=open>.055;shine.mesh.visible=open>.055;closed.visible=open<=.055;
   white.update((x,y)=>{const b=bounds(x);return[x,b.lo+(y-b.lo)*open];});
   for(const patch of[iris,pupil,shine])patch.update((x,y)=>{const nx=x+gaze,b=bounds(nx);return[nx,T.MathUtils.clamp(y,b.lo+.001,Math.max(b.lo+.001,b.lo+(b.hi-b.lo)*open-.001))];});
  });
  surfaceStroke(k,head,t=>{const x=cx-.10+t*.20;return[x,.173+Math.sin(t*Math.PI)*(female?.041:.025)-s*(t-.5)*.007];},female?.024:.034,browColour);
  if(female){
   // A clean upper liner gives the eye a readable feminine shape at mobile size.
   surfaceStroke(k,head,t=>{const x=cx-w*.94+t*w*1.88;return[x,bounds(x).hi+.004];},.014,linerColour,.0055);
   // Three separated outer lashes avoid the heavy solid-block look.
   surfaceStroke(k,head,t=>[cx+s*(w*.84+t*.075),cy+.052+t*.055],.010,linerColour,.006);
   surfaceStroke(k,head,t=>[cx+s*(w*.86+t*.066),cy+.040+t*.042],.009,linerColour,.006);
   surfaceStroke(k,head,t=>[cx+s*(w*.88+t*.052),cy+.030+t*.030],.008,linerColour,.006);
  }
 }
 const smile=appearance.eyes==='calm'?.023:.044;
 surfaceStroke(k,head,t=>{const x=(t-.5)*.27;return[x,-.232+smile*(2*t-1)**2+.005*(t-.5)];},female?.018:.013,female?lipColour:mouthColour);
 surfaceStroke(k,head,t=>{const x=(t-.5)*(female?.18:.15);return[x,-.255+.016*(2*t-1)**2];},female?.011:.006,female?shade(lipColour,.16):shade(skin,-.11),.0035);
 if(female){
  // Soft blush and a small nose highlight add warmth without changing the head rig.
  const blush=new T.Color('#D77A86').lerp(new T.Color(skin),.62).getStyle();
  for(const s of[-1,1]){const mark=surfacePatch(k,head,ellipseShape(s*.285,-.135,.066,.022),blush,.0025);mark.mesh.userData.dynamic=false;}
  surfaceStroke(k,head,t=>[.014+t*.026,-.105-t*.040],.006,shade(skin,-.20),.003);
 }
 if(appearance.faceDetail==='freckles')for(const s of[-1,1])for(let i=0;i<3;i++){
  const mark=surfacePatch(k,head,ellipseShape(s*(.235+i*.035),-.12+(i%2)*.021,.007,.006),shade(skin,-.25));mark.mesh.userData.dynamic=false;
 }
 if(appearance.faceDetail==='rosy')for(const s of[-1,1]){
  const tint=new T.Color(skin).lerp(new T.Color('#D87978'),.28).getStyle(),mark=surfacePatch(k,head,ellipseShape(s*.27,-.14,.065,.023),tint);mark.mesh.userData.dynamic=false;
 }
 createHair(k,head,appearance.style,appearance.hair,female);
 const [leftArm,rightArm]=arms;
 const update=(elapsed:number,motion:boolean)=>{
  // The frames remain still so hats, gloves, sleeves and props never drift apart.
  const phase=elapsed%5.7,blink=motion&&phase>5.38?Math.sin((phase-5.38)/.32*Math.PI)**2:0;
  const resting=appearance.eyes==='calm'?.82:1,openness=resting*(1-blink),gaze=motion?Math.sin(elapsed*.28)*.003:0;
  eyeUpdates.forEach(fn=>fn(openness,gaze));
  torso.scale.z=motion?1+Math.sin(elapsed*1.45)*.002:1;
 };
 mergeStaticParts(group);update(0,false);return {group,head,leftArm,rightArm,update};
}
