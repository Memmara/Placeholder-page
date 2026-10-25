import * as THREE from 'three';
export type V=[number,number,number];
export class Kit {
 readonly group=new THREE.Group();
 private materials=new Map<string,THREE.MeshStandardMaterial>();
 mat(colour:string,metal=0,opacity=1){const key=colour+':'+metal+':'+opacity;let m=this.materials.get(key);if(!m){m=new THREE.MeshStandardMaterial({color:colour,roughness:metal?.38:.72,metalness:metal,transparent:opacity<1,opacity,side:THREE.DoubleSide});this.materials.set(key,m)}return m}
 mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,p:V,c:string,metal=0,opacity=1){const m=new THREE.Mesh(geometry,this.mat(c,metal,opacity));m.position.set(...p);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 ball(parent:THREE.Object3D,p:V,s:V,c:string,metal=0,opacity=1){const m=this.mesh(parent,new THREE.SphereGeometry(1,18,12),p,c,metal,opacity);m.scale.set(...s);return m}
 bead(parent:THREE.Object3D,p:V,r:number,c:string){return this.ball(parent,p,[r,r,r],c)}
 box(parent:THREE.Object3D,p:V,s:V,c:string,bevel=.025,metal=0){const sh=new THREE.Shape();const w=s[0]/2,h=s[1]/2;sh.moveTo(-w,-h);sh.lineTo(w,-h);sh.lineTo(w,h);sh.lineTo(-w,h);sh.closePath();const m=this.mesh(parent,new THREE.ExtrudeGeometry(sh,{depth:s[2],bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1}),[p[0],p[1],p[2]-s[2]/2],c,metal);return m}
 cylinder(parent:THREE.Object3D,p:V,top:number,bottom:number,height:number,c:string,metal=0,segments=20){return this.mesh(parent,new THREE.CylinderGeometry(top,bottom,height,segments),p,c,metal)}
 cone(parent:THREE.Object3D,p:V,r:number,h:number,c:string,segments=8){return this.mesh(parent,new THREE.ConeGeometry(r,h,segments),p,c)}
 torus(parent:THREE.Object3D,p:V,r:number,tube:number,c:string,arc=Math.PI*2,metal=0){return this.mesh(parent,new THREE.TorusGeometry(r,tube,6,32,arc),p,c,metal)}
 lathe(parent:THREE.Object3D,p:V,profile:[number,number][],c:string,metal=0){return this.mesh(parent,new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),24),p,c,metal)}
 link(parent:THREE.Object3D,a:V,b:V,r:number,c:string,metal=0){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),mid=va.clone().add(vb).multiplyScalar(.5),d=vb.clone().sub(va);const m=this.mesh(parent,new THREE.CapsuleGeometry(r,Math.max(.001,d.length()-r*2),3,10),[mid.x,mid.y,mid.z],c,metal);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
 tube(parent:THREE.Object3D,points:V[],radius:number,c:string,metal=0){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return this.mesh(parent,new THREE.TubeGeometry(curve,Math.max(12,points.length*5),radius,6,false),[0,0,0],c,metal)}
 shape(parent:THREE.Object3D,p:V,points:[number,number][],depth:number,c:string,bevel=.012,metal=0){const sh=new THREE.Shape();points.forEach((v,i)=>i?sh.lineTo(...v):sh.moveTo(...v));sh.closePath();return this.mesh(parent,new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1}),[p[0],p[1],p[2]-depth/2],c,metal)}
 leaf(parent:THREE.Object3D,p:V,width:number,height:number,c:string,depth=.035){const sh=new THREE.Shape();sh.moveTo(0,0);sh.bezierCurveTo(-width*.65,height*.3,-width*.4,height*.83,0,height);sh.bezierCurveTo(width*.5,height*.7,width*.55,height*.25,0,0);const m=this.mesh(parent,new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2}),[p[0],p[1],p[2]-depth/2],c);return m}
 eye(parent:THREE.Object3D,p:V,r=.055,c='#241F22',white=true){if(white)this.ball(parent,[p[0],p[1],p[2]-.007],[r*1.38,r*1.5,r*.45],'#F5EDDC');const e=this.ball(parent,p,[r,r*1.15,r*.5],c);this.bead(parent,[p[0]-r*.25,p[1]+r*.35,p[2]+r*.42],r*.21,'#FFFFFF');return e}
 eyes(parent:THREE.Object3D,y:number,z:number,spread=.13,r=.055){this.eye(parent,[-spread,y,z],r);this.eye(parent,[spread,y,z],r)}
 smile(parent:THREE.Object3D,y:number,z:number,width=.14,c='#403438'){return this.tube(parent,[[-width/2,y+.016,z],[0,y-.018,z+.005],[width/2,y+.016,z]],.009,c)}
 book(parent:THREE.Object3D,p:V,s:V,c:string){const group=new THREE.Group();group.position.set(...p);parent.add(group);this.box(group,[0,0,0],[s[0],s[1]*.78,s[2]],'#E7DEC7',.008);this.box(group,[0,s[1]*.46,0],[s[0]*1.07,s[1]*.1,s[2]*1.06],c,.012);this.box(group,[0,-s[1]*.46,0],[s[0]*1.07,s[1]*.1,s[2]*1.06],c,.012);this.box(group,[-s[0]*.5,0,0],[.025,s[1],s[2]*1.05],c,.008);return group}
 ring(parent:THREE.Object3D,p:V,r:number,c:string){const m=this.torus(parent,p,r,.018,c);m.rotation.x=Math.PI/2;return m}
 groupAt(parent:THREE.Object3D,p:V){const g=new THREE.Group();g.position.set(...p);parent.add(g);return g}
 finish(){return this.group}
}
export function sway(group:THREE.Object3D,amount=.04,rate=1){const initial=group.rotation.z;return(t:number,m:boolean)=>{group.rotation.z=initial+(m?Math.sin(t*rate)*amount:0)}}
