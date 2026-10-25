import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type Vec3=[number,number,number];
export const shade=(colour:string,amount:number)=>new T.Color(colour).lerp(new T.Color(amount<0?'#171c28':'#fff4e3'),Math.abs(amount)).getStyle();

/** Character-only construction. Never changes the helpers used by pets or props. */
export class CharacterKit {
 readonly group=new T.Group();
 private materials=new Map<string,T.MeshStandardMaterial>();
 material(colour:string,roughness=.8,metalness=0){
  const key=`${colour}:${roughness}:${metalness}`;
  let m=this.materials.get(key);
  if(!m){m=new T.MeshStandardMaterial({color:colour,roughness,metalness});this.materials.set(key,m);}
  return m;
 }
 groupAt(parent:T.Object3D,p:Vec3=[0,0,0],name=''){
  const g=new T.Group();g.position.set(...p);g.name=name;parent.add(g);return g;
 }
 mesh(parent:T.Object3D,geometry:T.BufferGeometry,colour:string,p:Vec3=[0,0,0],roughness=.8){
  const m=new T.Mesh(geometry,this.material(colour,roughness));m.position.set(...p);parent.add(m);return m;
 }
 box(parent:T.Object3D,p:Vec3,size:Vec3,colour:string,r=.05,segments=1){
  return this.mesh(parent,new RoundedBoxGeometry(...size,segments,r),colour,p);
 }
 oval(parent:T.Object3D,p:Vec3,size:Vec3,colour:string){
  const geo=new T.SphereGeometry(1,12,8);geo.scale(...size);return this.mesh(parent,geo,colour,p);
 }
 line(parent:T.Object3D,points:Vec3[],radius:number,colour:string){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return this.mesh(parent,new T.TubeGeometry(curve,Math.max(8,points.length*3),radius,5,false),colour);
 }
 /** A sculpted tapered hair lock. Elliptical cross-section avoids bead hair. */
 lock(parent:T.Object3D,points:Vec3[],width:number,depth:number,colour:string){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),rows=10,cols=8;
  const frames=curve.computeFrenetFrames(rows,false),positions:number[]=[],indices:number[]=[];
  for(let j=0;j<=rows;j++){
   const t=j/rows,p=curve.getPoint(t),taper=Math.max(.07,Math.sin(Math.PI*(.18+t*.80)));
   for(let i=0;i<=cols;i++){
    const a=i/cols*Math.PI*2,v=p.clone().addScaledVector(frames.normals[j],Math.cos(a)*width*taper).addScaledVector(frames.binormals[j],Math.sin(a)*depth*taper);
    positions.push(...v.toArray());
    if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
   }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  return this.mesh(parent,geo,colour,[0,0,0],.62);
 }
}

// The face and all its markings use the same analytic surface in head-local space.
const power=.44;
export function headSection(y:number){
 const edge=Math.max(0,Math.abs(y)-.34),corner=Math.sqrt(Math.max(0,.13*.13-edge*edge));
 const jaw=y<-.10?1-.055*Math.min(1,(-y-.10)/.37):1;
 return {width:(.347+corner)*jaw,depth:.27+corner};
}
export function faceZ(x:number,y:number){
 const {width,depth}=headSection(y);
 const base=depth*Math.pow(Math.max(0,1-Math.pow(Math.min(1,Math.abs(x)/width),2/power)),power/2);
 const nose=.043*Math.exp(-((x/.060)**2+((y+.085)/.075)**2));
 const cheek=.006*(Math.exp(-(((x-.23)/.13)**2+((y+.12)/.12)**2))+Math.exp(-(((x+.23)/.13)**2+((y+.12)/.12)**2)));
 return base+nose+cheek;
}
export function headGeometry(){
 const rows=28,cols=48,positions:number[]=[],indices:number[]=[];
 for(let j=0;j<=rows;j++){
  const y=-.47+j/rows*.94,{width,depth}=headSection(y);
  for(let i=0;i<=cols;i++){
   const a=i/cols*Math.PI*2,s=Math.sin(a),c=Math.cos(a),x=Math.sign(s)*Math.pow(Math.abs(s),power)*width;
   const z=c>=0?faceZ(x,y):-Math.pow(Math.abs(c),power)*depth;
   positions.push(x,y,z);
   if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
  }
 }
 for(const [row,up]of [[0,false],[rows,true]] as const){
  const centre=positions.length/3;positions.push(0,up?.47:-.47,0);
  for(let i=0;i<cols;i++){const n=row*(cols+1)+i;indices.push(...(up?[centre,n,n+1]:[centre,n+1,n]));}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Thin face graphics conform to the head rather than floating in front of it. */
export function surfacePatch(k:CharacterKit,parent:T.Object3D,outline:T.Shape,colour:string,offset=.003){
 const geometry=new T.ShapeGeometry(outline,16),positions=geometry.getAttribute('position');
 const points:Vec3[]=[];
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);points.push([x,y,0]);positions.setZ(i,faceZ(x,y)+offset);}
 geometry.computeVertexNormals();const mesh=k.mesh(parent,geometry,colour);mesh.userData.dynamic=true;
 return {mesh,points,update(transform:(x:number,y:number)=>[number,number]){
  for(let i=0;i<points.length;i++){const [x,y]=transform(points[i][0],points[i][1]);positions.setXYZ(i,x,y,faceZ(x,y)+offset);}
  positions.needsUpdate=true;geometry.computeVertexNormals();
 }};
}
export function ellipseShape(x:number,y:number,rx:number,ry:number){const shape=new T.Shape();shape.absellipse(x,y,rx,ry,0,Math.PI*2,false,0);return shape;}
export function surfaceStroke(k:CharacterKit,parent:T.Object3D,fn:(t:number)=>[number,number],width:number,colour:string,offset=.004){
 const rows=24,positions:number[]=[],indices:number[]=[];
 for(let i=0;i<=rows;i++){const [x,y]=fn(i/rows),tip=Math.max(.22,Math.sin(Math.PI*i/rows)**.3);positions.push(x,y-width*tip/2,faceZ(x,y-width*tip/2)+offset,x,y+width*tip/2,faceZ(x,y+width*tip/2)+offset);if(i<rows){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return k.mesh(parent,geo,colour);
}

/** Batch static, unlabelled pieces inside each visibility boundary. */
export function mergeStaticParts(root:T.Group){
 for(const child of [...root.children])if(child instanceof T.Group)mergeStaticParts(child);
 const buckets=new Map<T.Material,T.Mesh[]>();
 for(const child of root.children){if(!(child instanceof T.Mesh)||child.name||child.userData.dynamic||Array.isArray(child.material))continue;const list=buckets.get(child.material)??[];list.push(child);buckets.set(child.material,list);}
 for(const [material,meshes]of buckets){
  if(meshes.length<2)continue;
  const geometries=meshes.map(mesh=>{mesh.updateMatrix();const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();for(const key of Object.keys(geo.attributes))if(!['position','normal'].includes(key))geo.deleteAttribute(key);geo.applyMatrix4(mesh.matrix);geo.clearGroups();return geo;});
  const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  if(merged){meshes.forEach(m=>{root.remove(m);m.geometry.dispose();});root.add(new T.Mesh(merged,material));}
 }
}
