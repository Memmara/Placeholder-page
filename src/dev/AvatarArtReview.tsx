import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as T from 'three';
import {createAvatarBody} from '../cosmetics/AvatarBody';
import {createWearable,WEARABLE_IDS} from '../cosmetics/Wearables';
import {createObject,OBJECT_IDS} from '../cosmetics/Objects';
import {createCompanion} from '../cosmetics/Companions';
import type {Appearance,CosmeticGear,CosmeticAsset} from '../cosmetics/types';
import reworked from '../../../memmara-cosmetics-redesign/items.reworked.json';
import additional from '../../../memmara-cosmetics-redesign/items.additional.json';
import treatment from '../../../memmara-avatar-redesign/clothing-treatments.json';
import themes from '../../../memmara-cosmetics-redesign/themes.reworked.json';

// Read-only developer contact sheet. It never reads or writes an account or loadout.
const ids=new Set(treatment.garments.map(i=>i.item_id)),wearable=new Set(WEARABLE_IDS),objects=new Set(OBJECT_IDS);
const items=[...reworked,...additional].map(i=>({...i,name:i.presentation.display_name,category:i.presentation.category,slot:i.presentation.display_slot,presentation:{...i.presentation,palette:themes.find(t=>t.name===i.theme_name)?.art_direction.palette.match(/#[0-9A-Fa-f]{6}/g)}})) as CosmeticGear[];
const garments=items.filter(i=>ids.has(i.id));
const appearance:Appearance={skin:'#c98f70',hair:'#352b43',style:'swept',top:'#83cbbc',eyes:'happy',eyeShape:'round',faceDetail:'plain',height:1};
const styles=['swept','curly','short','braids','bob','ponytail','bun','waves','locs','none'];
function asset(i:CosmeticGear){return wearable.has(i.id)?createWearable(i):objects.has(i.id)?createObject(i):createCompanion(i);}
function dispose(root:T.Object3D){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function makePortrait(renderer:T.WebGLRenderer,a:Appearance,gear:CosmeticGear[],angle:number,closeup=false){
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff6e9,0x536475,2.7));
 for(const [colour,power,pos]of [[0xfff1dd,3.1,[4,7,6]],[0xa6cada,1.6,[-4,3,2]],[0xc5a5ee,2.1,[-3,4,-4]]] as const){const light=new T.DirectionalLight(colour,power);light.position.set(pos[0],pos[1],pos[2]);scene.add(light);}
 const spin=new T.Group();spin.scale.set(1.06,.93*(a.height??1),1.06);spin.rotation.y=angle;scene.add(spin);
 const avatar=createAvatarBody(a);spin.add(avatar.group);avatar.update?.(0,false);
 const hidden=new Set<string>();
 for(const i of gear){const art:CosmeticAsset=asset(i);if(['head','face','face_accessory'].includes(i.slot)){art.group.scale.setScalar(1.09);art.group.position.y=3.03-3.16*1.09+(i.slot==='head'?.11:0);}else if(i.slot==='neck')art.group.position.y-=.1;spin.add(art.group);art.update?.(0,false);art.hides?.forEach(n=>hidden.add(n));}
 avatar.group.traverse(o=>{if(hidden.has(o.name))o.visible=false;});
 spin.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(closeup?avatar.head:spin),size=box.getSize(new T.Vector3()),mid=box.getCenter(new T.Vector3()),camera=new T.PerspectiveCamera(31,320/380,.01,100);
 const dist=Math.max(size.y/(2*Math.tan(T.MathUtils.degToRad(31)/2)),size.x/(2*Math.tan(T.MathUtils.degToRad(31)/2)*320/380))*1.14;
 camera.position.set(mid.x+dist*.10,mid.y+dist*.04,mid.z+dist);camera.lookAt(mid);renderer.render(scene,camera);
 const url=renderer.domElement.toDataURL('image/png');dispose(scene);return url;
}
function Review(){
 const [mode,setMode]=useState('garments'),[hair,setHair]=useState('swept'),[angle,setAngle]=useState(.20),[height,setHeight]=useState(1),[skin,setSkin]=useState('#c98f70'),[overlay,setOverlay]=useState(''),[pictures,setPictures]=useState<{id:string;name:string;url:string}[]>([]),[error,setError]=useState('');
 const generation=useRef(0);
 useEffect(()=>{
  const current=++generation.current;setPictures([]);setError('');let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});renderer.setSize(320,380);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);}catch(e){setError(String(e));return;}
  const list=mode==='hair'?styles.map(style=>({id:style,name:style,style,gear:[] as CosmeticGear[]})):garments.map(i=>({id:i.id,name:i.name,style:hair,gear:[i]}));
  const extra=items.find(i=>i.id===overlay);let n=0,timer=0;
  const next=()=>{if(current!==generation.current)return;try{const entry=list[n++],gear=extra?[...entry.gear.filter(i=>i.slot!==extra.slot),extra]:entry.gear;const url=makePortrait(renderer,{...appearance,style:entry.style,skin,height},gear,angle,mode==='hair');setPictures(p=>[...p,{id:entry.id,name:entry.name,url}]);if(n<list.length)timer=window.setTimeout(next,12);else renderer.dispose();}catch(e){setError(String(e));renderer.dispose();}};
  timer=window.setTimeout(next,0);return()=>{generation.current++;clearTimeout(timer);renderer.dispose();};
 },[mode,hair,angle,height,skin,overlay]);
 return <><style>{`*{box-sizing:border-box}body{margin:0;background:#141821;color:#f3eee5;font:14px system-ui}header{position:sticky;top:0;background:#141821f5;padding:20px 32px;border-bottom:1px solid #343b47;z-index:2}h1{margin:0 0 8px;font-size:23px}p{margin:6px 0;color:#b9c4cd}.controls{display:flex;gap:14px;flex-wrap:wrap;margin-top:16px}label{display:grid;gap:5px}select{background:#252c38;color:white;border:1px solid #556174;padding:8px;border-radius:7px}.gallery{padding:24px 32px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.card{background:linear-gradient(#262e3c,#202634);border:1px solid #394555;border-radius:16px;padding:12px;text-align:center}.card img{width:100%;height:320px;object-fit:contain}.card h2{font-size:15px;margin:5px}.card small{color:#a5b8c7}.error{padding:30px;color:#ffad9c}@media(max-width:900px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style><header><h1>Memmara · character and clothing review</h1><p>Actual procedural models · read-only art sheet · no saved appearance or inventory changes.</p><div className="controls"><label>Collection<select value={mode} onChange={e=>setMode(e.target.value)}><option value="garments">52 garments</option><option value="hair">10 hairstyles</option></select></label><label>Angle<select value={angle} onChange={e=>setAngle(Number(e.target.value))}><option value={.20}>Three quarter</option><option value={0}>Front</option><option value={Math.PI/2}>Side</option><option value={Math.PI}>Back</option></select></label><label>Hair<select value={hair} onChange={e=>setHair(e.target.value)}>{styles.map(s=><option key={s}>{s}</option>)}</select></label><label>Height<select value={height} onChange={e=>setHeight(Number(e.target.value))}>{[.88,1,1.12].map(h=><option key={h} value={h}>{Math.round(h*100)}%</option>)}</select></label><label>Skin<select value={skin} onChange={e=>setSkin(e.target.value)}>{['#f6d6bd','#e6b58b','#c98f70','#ad7350','#835235','#543c31'].map(s=><option key={s}>{s}</option>)}</select></label><label>Compatibility overlay<select value={overlay} onChange={e=>setOverlay(e.target.value)}><option value="">None</option>{items.filter(i=>['head','face','face_accessory','hands','torso_base','legs','feet','neck','hand_right','back','shoulder'].includes(i.slot)).map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></label></div><p>{pictures.length} / {mode==='hair'?10:52} rendered</p></header>{error&&<p className="error">{error}</p>}<main className="gallery">{pictures.map(p=><article className="card" key={p.id}><img src={p.url} alt={p.name}/><h2>{p.name}</h2><small>{p.id}</small></article>)}</main></>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
