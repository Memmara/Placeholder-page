import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {add,line,polygon,cloth as originalCloth,type V,type P} from './wearableKit';
import {shade} from './characterKit';

/** Local garment builders: props, pets and accessory recipes never call these. */
export function garmentBlock(g:T.Group,c:string,p:V,size:V,r=.035){return add(g,new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(n=>n*.45))),c,p);}
type CoatOptions={hem?:number;rightHem?:number;open?:boolean;sleeves?:boolean;wide?:number;sleeveLength?:number;base?:boolean};
export function tailoredCoat(g:T.Group,c:string,opts:CoatOptions={}){
 const hem=opts.hem??1.43,rightHem=opts.rightHem??hem,open=opts.open??true,base=!!opts.base;
 const width=base?.472:Math.max(.51,opts.wide??.51),depth=base?.293:.335,top=2.48,rows=14,cols=32;
 const positions:number[]=[],indices:number[]=[];
 // Closed double wall with hem/top/end facings. Outer clothing nests over the base tee.
 for(let wall=0;wall<2;wall++)for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const v=j/rows,a=(open?.21:0)+i/cols*(Math.PI*2-(open?.42:0)),s=Math.sin(a),co=Math.cos(a);
  const lower=hem+(rightHem-hem)*Math.max(0,s),y=lower+(top-lower)*v;
  const flare=y<1.48?Math.min(.095,(1.48-y)*.09):0;
  const w=width+flare+(base?0:Math.sin(v*Math.PI)*.012)-wall*.018,d=depth-wall*.018;
  const fold=(base?.002:.006)*Math.sin(a*5+.4)*(1-v);
  positions.push(Math.sign(s)*Math.pow(Math.abs(s),.48)*w,y,Math.sign(co)*Math.pow(Math.abs(co),.48)*(d+fold));
  if(j<rows&&i<cols){const n=wall*(rows+1)*(cols+1)+j*(cols+1)+i;if(wall)indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);else indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
 }
 const count=(rows+1)*(cols+1);
 const join=(a:number,b:number)=>indices.push(a,b,a+count,b,b+count,a+count);
 for(let i=0;i<cols;i++){join(i+1,i);join(rows*(cols+1)+i,rows*(cols+1)+i+1);}
 if(open)for(let j=0;j<rows;j++){join(j*(cols+1),(j+1)*(cols+1));join((j+1)*(cols+1)+cols,j*(cols+1)+cols);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();add(g,geo,c);
 if(opts.sleeves!==false)for(const s of[-1,1]){
  const end=opts.sleeveLength??1.89,shoulder=2.48;
  garmentBlock(g,c,[s*.54,(shoulder+end)/2,.012],[base?.398:.448,shoulder-end+.035,base?.411:.452],base?.075:.09);
  garmentBlock(g,shade(c,-.08),[s*.54,end+.025,.016],[base?.405:.455,.085,base?.418:.458],.028);
  line(g,shade(c,-.12),[[s*.455,2.43,.207],[s*.565,2.40,.232],[s*.69,2.34,.213]],.008);
 }
 if(open){
  polygon(g,c,[[-.12,2.48],[-.41,2.40],[-.25,2.03],[-.075,2.25]],[0,0,depth+.019],.045);
  polygon(g,c,[[.12,2.48],[.41,2.40],[.25,2.03],[.075,2.25]],[0,0,depth+.019],.045);
 }else{
  garmentBlock(g,shade(c,-.08),[0,2.475,.177],[.36,.070,.25],.03);
 }
 if(base)garmentBlock(g,shade(c,-.07),[0,hem+.045,.005],[width*2,.075,depth*2+.012],.025);
}

/** Preserve the authored outline/warp, add a substantial folded cloth edge. */
export function foldedCloth(g:T.Group,c:string,outline:P[],z=-.34,depth=.035,curve=.15){
 const panel=originalCloth(g,c,outline,z,Math.max(.038,depth),curve);
 const edge:V[]=outline.map(([x,y])=>[x,y,z-curve*Math.sin(x*3+.4)*(Math.max(0,2.5-y)/2)+(z<0?-.024:.024)]);
 // Follow the polygon's actual edges; a smoothed spline bows away from corners.
 if(edge.length>2)for(let i=0;i<edge.length;i++){
  const path=new T.LineCurve3(new T.Vector3(...edge[i]),new T.Vector3(...edge[(i+1)%edge.length]));
  add(g,new T.TubeGeometry(path,1,.007,5,false),shade(c,-.10));
 }
 for(const material of Array.isArray(panel.material)?panel.material:[panel.material])material.dispose();
 panel.material=new T.MeshStandardMaterial({color:c,roughness:.87,side:T.DoubleSide});
 return panel;
}

export function wardrobeShoe(g:T.Group,c:string,side:number,height=.27,wide=.22){
 const x=side*.235,w=Math.min(.425,Math.max(.39,wide*1.82));
 garmentBlock(g,'#EDE6D8',[x,.045,.13],[w+.022,.09,.66],.034);
 garmentBlock(g,c,[x,.16,.13],[w,.235,.62],.072);
 garmentBlock(g,shade(c,-.10),[x,.19,-.09],[w*.94,.24,.22],.055);
 // Even a low shoe overlaps the permanent ankle; a tall boot is one joined shaft.
 const high=Math.max(.305,height),base=.14;
 garmentBlock(g,c,[x,(base+high)/2,.012],[w*.86,high-base,.355],.048);
 garmentBlock(g,shade(c,-.06),[x,high-.035,.012],[w*.90,.070,.37],.025);
 line(g,shade(c,-.15),[[x-w*.42,.105,.36],[x,.095,.435],[x+w*.42,.105,.36]],.008);
 return g;
}

export function trouserLegs(g:T.Group,c:string,top:number,bottom:number,width=.22){
 garmentBlock(g,c,[0,top-.035,.012],[.88,.20,.51],.045);
 for(const s of[-1,1]){
  const w=width>.255?.40:.385;
  garmentBlock(g,c,[s*.235,(top+bottom)/2,.015],[w,top-bottom+.075,.405],.052);
  garmentBlock(g,shade(c,-.07),[s*.235,bottom+.025,.015],[w+.012,.095,.418],.025);
  line(g,shade(c,-.13),[[s*(.235+w*.47),top-.06,.17],[s*(.235+w*.47),(top+bottom)*.5,.193],[s*(.235+w*.47),bottom+.08,.178]],.007);
 }
}

export function garmentCuff(g:T.Group,c:string,side:number,y=1.86){return garmentBlock(g,c,[side*.54,y,.025],[.465,.080,.465],.032);}

/** A continuous shoulder drape with a neck opening and a scalloped hem. */
export function shoulderDrape(g:T.Group,c:string,trim:string){
 const profile=[[2.60,.19,.17],[2.46,.61,.35],[2.33,.78,.39],[1.93,.82,.41],[1.45,.75,.43]],cols=48;
 const positions:number[]=[],indices:number[]=[],edge:V[]=[];
 for(let j=0;j<profile.length;j++)for(let i=0;i<=cols;i++){
  const a=i/cols*Math.PI*2,s=Math.sin(a),co=Math.cos(a),[y,w,d]=profile[j];
  const hem=j===profile.length-1?.055*Math.cos(a*8):0;
  const p:V=[Math.sign(s)*Math.abs(s)**.55*w,y+hem,Math.sign(co)*Math.abs(co)**.55*d];positions.push(...p);
  if(j===profile.length-1)edge.push(p);
  if(j<profile.length-1&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=add(g,geo,c);(mesh.material as T.MeshStandardMaterial).side=T.DoubleSide;
 line(g,trim,edge,.014);knitCollar(g,trim,[0,2.59,0],.43,.38,.07,.035);
}

export function knitCollar(g:T.Group,c:string,p:V,width:number,depth:number,height:number,thickness:number){
 const shape=new T.Shape(),hole=new T.Path(),steps=40;
 for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,x=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.52,z=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.52;if(i===0){shape.moveTo(x*width/2,z*depth/2);hole.moveTo(x*(width/2-thickness),z*(depth/2-thickness));}else{shape.lineTo(x*width/2,z*depth/2);hole.lineTo(x*(width/2-thickness),z*(depth/2-thickness));}}
 shape.closePath();hole.closePath();shape.holes.push(hole);
 const geo=new T.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1});geo.translate(0,0,-height/2);geo.rotateX(Math.PI/2);return add(g,geo,c,p);
}

export function hood(g:T.Group,c:string,lining:string,top=3.88,bottom=2.91){
 const positions:number[]=[],indices:number[]=[],rows=16,cols=28;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const v=j/rows,a=.66+i/cols*(Math.PI*2-1.32),s=Math.sin(a),co=Math.cos(a),y=bottom+(top-bottom)*v;
  const pinch=v>.72?Math.sqrt(Math.max(.01,1-((v-.72)/.28)**2)):1;
  positions.push(Math.sign(s)*Math.pow(Math.abs(s),.50)*(.55-.018*Math.sin(v*Math.PI))*pinch,y,Math.sign(co)*Math.pow(Math.abs(co),.5)*.49*pinch-.025);
  if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const m=add(g,geo,c);m.material=new T.MeshStandardMaterial({color:c,roughness:.88,side:T.DoubleSide});
 for(const s of[-1,1])line(g,lining,[[s*.33,bottom,.38],[s*.37,3.45,.39],[s*.27,top-.09,.28],[s*.06,top,.015]],.034);
}

/** Material pooling and static batching are limited to this garment's own mesh tree. */
export function finishGarment(group:T.Group){
 const materials=new Map<string,T.Material>();
 group.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material)||!(o.material instanceof T.MeshStandardMaterial))return;const m=o.material,key=[m.color.getHex(),m.roughness,m.metalness,m.opacity,m.side,m.transparent,m.depthWrite,m.emissive.getHex(),m.emissiveIntensity].join(':');const shared=materials.get(key);if(shared&&shared!==m){o.material=shared;m.dispose();}else materials.set(key,m);});
}
