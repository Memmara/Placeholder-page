import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3=[number,number,number];
export type Motion=(time:number,motion:boolean)=>void;
export const ink='#25334a',paper='#eee4cd',gold='#cba36b',wood='#856349',glass='#a8dce1';
export class ObjectKit {
 root=new THREE.Group(); motions:Motion[]=[]; materials=new Map<string,THREE.MeshStandardMaterial>();
 mat(colour:string,glow=false,alpha=1){const key=colour+glow+alpha;if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color:colour,roughness:alpha<1?.28:.61,metalness:glow?.18:.08,emissive:glow?colour:'#000000',emissiveIntensity:glow?.28:0,transparent:alpha<1,opacity:alpha,depthWrite:alpha===1,side:THREE.DoubleSide}));return this.materials.get(key)!;}
 group(parent:THREE.Group=this.root,p:V3=[0,0,0]){const g=new THREE.Group();g.position.set(...p);parent.add(g);return g;}
 mesh(parent:THREE.Group,geo:THREE.BufferGeometry,colour:string,p:V3=[0,0,0],rotation:V3=[0,0,0],glow=false,alpha=1){const m=new THREE.Mesh(geo,this.mat(colour,glow,alpha));m.position.set(...p);m.rotation.set(...rotation);m.castShadow=alpha===1;m.receiveShadow=true;parent.add(m);return m;}
 ball(g:THREE.Group,p:V3,s:V3,c:string,glow=false,alpha=1){const m=this.mesh(g,new THREE.SphereGeometry(1,14,10),c,p,[0,0,0],glow,alpha);m.scale.set(...s);return m;}
 box(g:THREE.Group,p:V3,s:V3,c:string,r:V3=[0,0,0],radius=.045){return this.mesh(g,new RoundedBoxGeometry(...s,1,Math.min(radius,...s.map(v=>v/3))),c,p,r);}
 cyl(g:THREE.Group,p:V3,top:number,bottom:number,h:number,c:string,r:V3=[0,0,0],segments=16){return this.mesh(g,new THREE.CylinderGeometry(top,bottom,h,segments),c,p,r);}
 cone(g:THREE.Group,p:V3,radius:number,h:number,c:string,r:V3=[0,0,0],sides=6){return this.mesh(g,new THREE.ConeGeometry(radius,h,sides),c,p,r);}
 tube(g:THREE.Group,points:V3[],radius:number,c:string,glow=false,closed=false){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);return this.mesh(g,new THREE.TubeGeometry(curve,Math.max(8,points.length*5),radius,6,closed),c,[0,0,0],[0,0,0],glow);}
 arc(g:THREE.Group,p:V3,radius:number,thick:number,c:string,start=0,span=Math.PI*2,r:V3=[0,0,0],glow=false){const m=this.mesh(g,new THREE.TorusGeometry(radius,thick,6,Math.max(12,Math.round(span*8)),span),c,p,r,glow);m.rotateZ(start);return m;}
 poly(g:THREE.Group,pts:[number,number][],depth:number,c:string,p:V3=[0,0,0],r:V3=[0,0,0],glow=false,alpha=1){const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const geometry=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:Math.min(.025,depth*.3),bevelThickness:Math.min(.02,depth*.3)});geometry.translate(0,0,-depth/2);return this.mesh(g,geometry,c,p,r,glow,alpha);}
 leaf(g:THREE.Group,p:V3,w:number,h:number,c:string,r:V3=[0,0,0]){const s=new THREE.Shape();s.moveTo(0,-h/2);s.bezierCurveTo(-w*.75,-h*.05,-w*.55,h*.33,0,h/2);s.bezierCurveTo(w*.6,h*.2,w*.75,-h*.18,0,-h/2);const m=this.mesh(g,new THREE.ExtrudeGeometry(s,{depth:.025,bevelEnabled:true,bevelSegments:1,bevelSize:.02,bevelThickness:.02}),c,p,r);return m;}
 star(g:THREE.Group,p:V3,size:number,c:string,points=5){const pts:[number,number][]=[];for(let j=0;j<points*2;j++){const a=j*Math.PI/points+Math.PI/2,r=j%2?size*.44:size;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}return this.poly(g,pts,.045,c,p);}
 crystal(g:THREE.Group,p:V3,s:V3,c:string){const m=this.mesh(g,new THREE.OctahedronGeometry(1),c,p);m.scale.set(...s);return m;}
 page(g:THREE.Group,p:V3,w:number,h:number,c=paper,r:V3=[0,0,0]){const pg=this.group(g,p);pg.rotation.set(...r);this.poly(pg,[[-w/2,-h/2],[w/2,-h/2],[w/2,h*.3],[w*.26,h/2],[-w/2,h/2]],.025,c);this.poly(pg,[[w*.26,h/2],[w*.26,h*.3],[w/2,h*.3]],.032,'#fff7e7',[0,0,.02]);for(let n=0;n<3;n++)this.box(pg,[-w*.04,h*.14-n*h*.17,.025],[w*.58,.018,.008],'#9aafbe');return pg;}
 book(g:THREE.Group,p:V3,w=.6,h=.8,d=.16,c='#765177',r:V3=[0,0,0]){const b=this.group(g,p);b.rotation.set(...r);this.box(b,[0,0,0],[w*.94,h*.92,d],paper);this.box(b,[0,0,d*.61],[w,h,.035],c);this.box(b,[0,0,-d*.61],[w,h,.035],c);this.box(b,[-w/2,0,0],[.055,h,d*1.3],c);this.box(b,[w*.2,-h*.45,d*.66],[.07,h*.32,.015],gold);return b;}
 jar(g:THREE.Group,p:V3,w=.3,h=.65){const j=this.group(g,p);this.ball(j,[0,h*.4,0],[w,h*.46,w],glass,false,.27);this.arc(j,[0,h*.82,0],w*.7,.028,gold,0,Math.PI*2,[Math.PI/2,0,0]);this.cyl(j,[0,h*.9,0],w*.77,w*.77,.09,wood);return j;}
 plant(g:THREE.Group,p:V3,scale=1,c='#83a676'){const q=this.group(g,p);q.scale.setScalar(scale);this.cyl(q,[0,.12,0],.16,.12,.25,'#b48167');this.tube(q,[[0,.2,0],[.04,.42,0],[-.02,.68,0]],.022,'#627e52');for(let n=0;n<4;n++){const y=.32+n*.09,sign=n%2?1:-1;this.leaf(q,[sign*.12,y,.015],.16,.28,c,[0,0,-sign*.85]);}return q;}
 cloud(g:THREE.Group,p:V3,scale=1,c='#e2e7ed'){const q=this.group(g,p);q.scale.setScalar(scale);this.ball(q,[0,0,0],[.52,.18,.27],c);this.ball(q,[-.26,.1,0],[.26,.2,.25],c);this.ball(q,[.12,.18,0],[.29,.25,.28],c);this.ball(q,[.4,.035,0],[.23,.14,.24],c);return q;}
 desk(g:THREE.Group,p:V3,w=1.5,c=wood,depth=.62){const d=this.group(g,p);this.box(d,[0,.66,0],[w,.11,depth],c);for(const x of [-w*.42,w*.42])for(const z of [-depth*.36,depth*.36])this.cyl(d,[x,.33,z],.04,.055,.66,c);this.book(d,[-w*.15,.77,0],.35,.26,.05,'#718b8e',[Math.PI/2,0,-.15]);return d;}
 chair(g:THREE.Group,p:V3,c='#697d91',rotation=0){const q=this.group(g,p);q.rotation.y=rotation;this.box(q,[0,.4,0],[.5,.12,.5],c);this.box(q,[0,.72,-.22],[.5,.6,.1],c);for(const x of [-.19,.19])for(const z of [-.18,.18])this.cyl(q,[x,.2,z],.025,.032,.4,wood);return q;}
 arch(g:THREE.Group,p:V3,w:number,h:number,c:string,thick=.08){return this.tube(g,[[p[0]-w/2,p[1],p[2]],[p[0]-w/2,p[1]+h*.62,p[2]],[p[0],p[1]+h,p[2]],[p[0]+w/2,p[1]+h*.62,p[2]],[p[0]+w/2,p[1],p[2]]],thick,c);}
 branches(g:THREE.Group,p:V3,size:number,c:string){const q=this.group(g,p);this.tube(q,[[0,0,0],[.08,size*.4,.02],[-.04,size,.01]],size*.07,c);this.tube(q,[[.05,size*.3,.01],[-size*.3,size*.55,0],[-size*.4,size*.8,.08]],size*.045,c);this.tube(q,[[.02,size*.55,.01],[size*.3,size*.7,0],[size*.4,size*.9,-.04]],size*.04,c);return q;}
 floor(g:THREE.Group,c='#79899a',radius=2.5){return this.cyl(g,[0,-.1,-.7],radius,radius,.18,c,[0,0,0],32);}
 shelf(g:THREE.Group,p:V3,w=1.1,h=1.4,c=wood){const q=this.group(g,p);for(const y of [0,h*.5,h])this.box(q,[0,y,0],[w,.08,.35],c);for(const x of [-w/2,w/2])this.box(q,[x,h/2,0],[.07,h,.35],c);for(let n=0;n<4;n++)this.book(q,[-w*.35+n*w*.23,h*.21,.02],w*.15,h*.34,.12,['#65828b','#a0747b','#9c9a71','#665d80'][n]);return q;}
 hourglass(g:THREE.Group,p:V3,scale=1){const q=this.group(g,p);q.scale.setScalar(scale);for(const y of [-.36,.36])this.cyl(q,[0,y,0],.26,.26,.06,gold);this.cone(q,[0,.16,0],.22,.32,glass,[Math.PI,0,0]);this.cone(q,[0,-.16,0],.22,.32,glass);for(const x of [-.22,.22])this.cyl(q,[x,0,0],.018,.018,.7,gold);this.cone(q,[0,-.2,.07],.13,.17,'#e4cda0');return q;}
 turn(part:THREE.Object3D,speed=.25,axis:'x'|'y'|'z'='y'){part.userData.artMotionTarget=true;const initial=part.rotation[axis];this.motions.push((t,m)=>{part.rotation[axis]=initial+(m?t*speed:0)});}
 sway(part:THREE.Object3D,axis:'x'|'y'|'z'='z',amp=.08,speed=.7,phase=0){part.userData.artMotionTarget=true;const initial=part.rotation[axis];this.motions.push((t,m)=>{part.rotation[axis]=initial+(m?Math.sin(t*speed+phase)*amp:0)});}
 bob(part:THREE.Object3D,amp=.05,speed=.8,phase=0){part.userData.artMotionTarget=true;const initial=part.position.y;this.motions.push((t,m)=>{part.position.y=initial+(m?Math.sin(t*speed+phase)*amp:0)});}
 /** Batch static geometry by material while retaining every authored moving
  * node. This keeps large room silhouettes inexpensive to draw. */
 consolidate(){
  this.root.updateMatrixWorld(true);
  const mergeAt=(container:THREE.Object3D)=>{
   const buckets=new Map<THREE.Material,THREE.Mesh[]>(),dynamic:THREE.Object3D[]=[];
   const visit=(node:THREE.Object3D)=>{for(const child of [...node.children]){if(child.userData.artMotionTarget){dynamic.push(child);continue}if(child instanceof THREE.Mesh&&!Array.isArray(child.material)){if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material)!.push(child)}visit(child);}};
   visit(container);
   const inverse=new THREE.Matrix4().copy(container.matrixWorld).invert();
   for(const [material,meshes] of buckets){if(meshes.length<2)continue;const geometries=meshes.map(m=>{const base=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();base.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));return base});const merged=mergeGeometries(geometries,false);for(const geometry of geometries)geometry.dispose();if(!merged)continue;const combined=new THREE.Mesh(merged,material);combined.castShadow=!material.transparent;combined.receiveShadow=true;container.add(combined);for(const old of meshes){old.removeFromParent();old.geometry.dispose();}}
   for(const node of dynamic)mergeAt(node);
  };
  mergeAt(this.root);
 }
}
