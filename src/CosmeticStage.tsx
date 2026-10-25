import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {MoveHorizontal,RotateCcw} from 'lucide-react';
import {createAvatarBody} from './cosmetics/AvatarBody';
import {createCompanion,COMPANION_IDS} from './cosmetics/Companions';
import {createWearable,WEARABLE_IDS} from './cosmetics/Wearables';
import {createObject,OBJECT_IDS} from './cosmetics/Objects';
import {rarityColours,itemColour} from './cosmetics/catalogue';
import type {Appearance,CosmeticAsset,CosmeticGear} from './cosmetics/types';

export type Gear=CosmeticGear;
export type {Appearance};
export {rarityColours,itemColour};
export const defaultAppearance:Appearance={skin:'#c98f70',hair:'#352b43',style:'swept',top:'#83cbbc',eyes:'happy',eyeShape:'round',faceDetail:'plain',height:1,gender:'prefer_not_to_say'};
const companionIds=new Set(COMPANION_IDS),wearableIds=new Set(WEARABLE_IDS),objectIds=new Set(OBJECT_IDS);
function asset(item:Gear):CosmeticAsset{if(companionIds.has(item.id))return createCompanion(item);if(wearableIds.has(item.id))return createWearable(item);if(objectIds.has(item.id))return createObject(item);throw Error('Missing model for '+item.id)}
function dispose(root:THREE.Object3D){const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();root.traverse(o=>{if(o instanceof THREE.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m)}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose())}
function studio(scene:THREE.Scene){scene.add(new THREE.HemisphereLight(0xfff6e9,0x536475,2.7));for(const [c,p,n] of [[0xfff1dd,[4,7,6],3.1],[0xa6cada,[-4,3,2],1.6],[0xc5a5ee,[-3,4,-4],2.1]] as const){const light=new THREE.DirectionalLight(c,n);light.position.set(p[0],p[1],p[2]);scene.add(light)}}
function renderer(){const r=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});r.outputColorSpace=THREE.SRGBColorSpace;r.setClearColor(0,0);return r}
function frame(cam:THREE.PerspectiveCamera,root:THREE.Object3D,aspect:number,pad=1.25){root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root);if(b.isEmpty())return;const size=b.getSize(new THREE.Vector3()),mid=b.getCenter(new THREE.Vector3()),v=THREE.MathUtils.degToRad(cam.fov),h=2*Math.atan(Math.tan(v/2)*aspect),d=Math.max(size.y/(2*Math.tan(v/2)),size.x/(2*Math.tan(h/2)),size.z*1.3)*pad;cam.position.set(mid.x+d*.17,mid.y+d*.07,mid.z+d);cam.lookAt(mid);cam.near=Math.max(.01,d/100);cam.far=Math.max(100,d*8);cam.updateProjectionMatrix()}
function drag(el:HTMLCanvasElement,angle:{current:number}){let held=false,last=0;const down=(e:PointerEvent)=>{held=true;last=e.clientX;el.setPointerCapture(e.pointerId)},move=(e:PointerEvent)=>{if(held){angle.current+=(e.clientX-last)*.012;last=e.clientX}},up=()=>{held=false};el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);return()=>{el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up)}}
function stage(el:HTMLDivElement,appearance:Appearance|null,items:Gear[],reducedMotion:boolean,angle:{current:number}){
 const r=renderer();r.setPixelRatio(Math.min(devicePixelRatio,1.4));el.appendChild(r.domElement);r.domElement.setAttribute('aria-hidden','true');const scene=new THREE.Scene();studio(scene);const spin=new THREE.Group();scene.add(spin);const motion:CosmeticAsset[]=[];
 if(appearance){
  // A wider, shorter overall silhouette keeps the character playful; equipped art follows it.
  spin.scale.set(1.06,.93*Math.min(1.12,Math.max(.88,appearance.height??1)),1.06);
  const body=createAvatarBody(appearance);spin.add(body.group);motion.push(body);const hidden=new Set<string>();
  for(const item of items){try{
   const a=asset(item);motion.push(a);
   if(['head','face','face_accessory'].includes(item.slot)){
    // These pieces were sculpted around the original head centre (3.16).
    a.group.scale.setScalar(1.09);
    a.group.position.y=3.03-3.16*1.09+(item.slot==='head'?.11:0);
   }else if(item.slot==='neck')a.group.position.y-=.1;
   if(companionIds.has(item.id)){a.group.position.x+=1.17;a.group.position.z+=.35;spin.add(a.group)}else if(item.category==='study_space')scene.add(a.group);else spin.add(a.group);
   a.hides?.forEach(n=>hidden.add(n));
  }catch(e){console.warn(e)}}
  body.group.traverse(o=>{if(hidden.has(o.name))o.visible=false});const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.8,.16,64),new THREE.MeshStandardMaterial({color:'#445e69',roughness:.82}));plinth.position.y=-.15;scene.add(plinth)
 }
 else{const a=asset(items[0]);spin.add(a.group);motion.push(a)}
 const cam=new THREE.PerspectiveCamera(appearance?31:34,1,.01,100);let alive=true,visible=true,last=0,raf=0;const media=matchMedia('(prefers-reduced-motion: reduce)');const resize=new ResizeObserver(()=>{if(!alive)return;const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);r.setSize(w,h);cam.aspect=w/h;frame(cam,appearance?scene:spin,w/h,appearance?1.27:1.38)});resize.observe(el);const view=new IntersectionObserver(e=>{visible=e[0]?.isIntersecting??true},{rootMargin:'100px'});view.observe(el);const undrag=drag(r.domElement,angle);
 const draw=(now:number)=>{if(!alive)return;raf=requestAnimationFrame(draw);if(!visible||document.hidden||now-last<34)return;last=now;spin.rotation.y=angle.current;for(const a of motion)a.update?.(now/1000,!reducedMotion&&!media.matches);r.render(scene,cam)};raf=requestAnimationFrame(draw);
 return()=>{alive=false;cancelAnimationFrame(raf);resize.disconnect();view.disconnect();undrag();dispose(scene);r.dispose();r.domElement.remove()};
}
export function Avatar3D({appearance=defaultAppearance,items=[],reducedMotion=false,small=false}:{appearance?:Appearance;items?:Gear[];reducedMotion?:boolean;small?:boolean}){const host=useRef<HTMLDivElement>(null),angle=useRef(0),[error,setError]=useState(false),signature=JSON.stringify([appearance,items.map(i=>i.id),reducedMotion]);useEffect(()=>{if(!host.current)return;try{setError(false);return stage(host.current,appearance,items,reducedMotion,angle)}catch(e){console.warn(e);setError(true)}},[signature]);return <div className={'avatar-stage'+(small?' compact':'')}><div className="avatar-canvas" ref={host} role="img" aria-label={'3D avatar'+(items.length?', wearing '+items.map(i=>i.name).join(', '):' in a starter outfit')}/>{error&&<div className="avatar-fallback">3D preview unavailable on this device</div>}<div className="avatar-rotate"><span><MoveHorizontal size={14}/>Drag to rotate</span><button className="icon-button" aria-label="Reset avatar rotation" onClick={()=>{angle.current=0}}><RotateCcw size={15}/></button></div></div>}
export function ItemPreview({item}:{item:Gear}){const host=useRef<HTMLDivElement>(null),angle=useRef(0),[error,setError]=useState(false);useEffect(()=>{if(!host.current)return;try{setError(false);return stage(host.current,null,[item],false,angle)}catch(e){console.warn(e);setError(true)}},[item.id]);return <div className="item-preview"><div className="item-preview-canvas" ref={host} role="img" aria-label={'3D model of '+item.name}/>{error&&<span className="item-preview-error">Preview unavailable</span>}<small>Drag to inspect</small></div>}

// Visible cards queue portraits through one renderer; only the active avatar and
// item inspector own their own WebGL context.
const portraits=new Map<string,string|null>(),queue:{item:Gear;callback:(url:string|null)=>void}[]=[];let shared:THREE.WebGLRenderer|null=null,running=false;
function flush(){const next=queue.shift();if(!next){running=false;return}let scene:THREE.Scene|undefined;try{shared??=renderer();shared.setPixelRatio(1);shared.setSize(230,205);scene=new THREE.Scene();studio(scene);const a=asset(next.item);scene.add(a.group);const cam=new THREE.PerspectiveCamera(34,230/205,.01,100);frame(cam,a.group,230/205,1.4);shared.render(scene,cam);const url=shared.domElement.toDataURL('image/webp',.8);portraits.set(next.item.id,url);next.callback(url)}catch(e){console.warn('Portrait unavailable',next.item.id,e);portraits.set(next.item.id,null);next.callback(null)}finally{if(scene)dispose(scene)}setTimeout(flush,15)}
function requestPortrait(item:Gear,cb:(url:string|null)=>void){if(portraits.has(item.id)){cb(portraits.get(item.id)??null);return}queue.push({item,callback:cb});if(!running){running=true;setTimeout(flush,15)}}
export function ItemArt({item}:{item:Gear}){const ref=useRef<HTMLSpanElement>(null),[url,setUrl]=useState<string|null|undefined>(()=>portraits.get(item.id));useEffect(()=>{setUrl(portraits.get(item.id));if(!ref.current)return;let active=true;const ob=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){requestPortrait(item,u=>{if(active)setUrl(u)});ob.disconnect()}},{rootMargin:'180px'});ob.observe(ref.current);return()=>{active=false;ob.disconnect()}},[item.id]);return <span ref={ref} className="item-art" role="img" aria-label={item.name}>{url?<img src={url} alt="" loading="lazy"/>:url===null?<span className="item-art-unavailable">Preview unavailable</span>:<span className="item-art-loading" aria-hidden="true">✦</span>}</span>}
