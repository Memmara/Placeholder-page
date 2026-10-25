import * as T from 'three';
import {CharacterKit,shade,headSection,type Vec3} from './characterKit';

/** The existing style values, rebuilt around the same head frame. */
export function createHair(k:CharacterKit,head:T.Group,style:string,colour:string,feminine=false){
 const hair=k.groupAt(head,[0,0,0],'hair');if(style==='none')return hair;
 const crown=k.groupAt(hair,[0,0,0],'hairCrown'),fringe=k.groupAt(hair,[0,0,0],'hairFringe');
 const sides=k.groupAt(hair,[0,0,0],'hairSides'),length=k.groupAt(hair,[0,0,0],'hairLength'),crest=k.groupAt(hair,[0,0,0],'hairCrest');
 const dark=shade(colour,-.10),light=shade(colour,.045);
 // Closed crown and continuous nape beneath all silhouette locks.
 // Hats hide only the upper crown. The fitted temples/nape stay visible beneath them.
 for(const upper of[true,false]){
  const positions:number[]=[],indices:number[]=[],rows=upper?10:14,cols=48;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const a=i/cols*Math.PI*2,c=Math.cos(a),line=c>=0?.17+.12*c:.17+.39*c;
   const start=upper?.575:.46,end=upper?.46:line,y=start-j/rows*(start-end);
   const section=headSection(Math.min(.47,y-.015));
   const taper=y>.485?Math.sqrt(Math.max(.0001,1-((y-.485)/.09)**2)):1;
   const width=(section.width+.042)*taper,depth=(section.depth+.042)*taper,sx=Math.sin(a);
   positions.push(width*Math.sign(sx)*Math.pow(Math.abs(sx),.44),y,depth*Math.sign(c)*Math.pow(Math.abs(c),.44));
   if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
  }
  const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(positions,3));cap.setIndex(indices);cap.computeVertexNormals();k.mesh(upper?crown:sides,cap,colour,[0,0,0],.64);
 }
 for(const s of[-1,1])k.lock(sides,[[s*.482,.22,.01],[s*.493,.08,.025],[s*.478,-.07,.04]],.058,.055,colour);
 const lock=(parent:T.Group,p:Vec3[],w:number,d:number,c=colour)=>k.lock(parent,p,w,d,c);
 if(style==='swept'){
  for(let i=0;i<3;i++)lock(fringe,[[-.37+i*.13,.35,.28],[-.20+i*.16,.46,.38],[.07+i*.15,.39,.42],[.20+i*.11,.24,.33]],.11-i*.012,.075,i===1?light:colour);
  lock(crest,[[-.31,.43,.05],[-.10,.53,.08],[.18,.51,.06],[.36,.39,.08]],.13,.085);
 }else if(style==='short'){
  for(let i=0;i<3;i++)lock(fringe,[[-.27+i*.18,.35,.30],[-.18+i*.18,.40,.39],[-.10+i*.18,.30,.42]],.095,.05,i===1?light:colour);
 }else if(style==='curly'){
  const clusters:Vec3[]=[[-.33,.39,.28],[-.12,.43,.36],[.12,.42,.35],[.33,.38,.24],[-.32,.48,-.07],[-.09,.55,.0],[.15,.53,-.05],[.32,.45,-.16],[-.16,.44,-.29],[.10,.45,-.31]];
  clusters.forEach((p,i)=>{const geo=new T.IcosahedronGeometry(.14+(i%3)*.013,2);geo.scale(1,.85+(i%2)*.10,.92);const curl=k.mesh(i<4?fringe:crest,geo,i%3===0?light:colour,p,.67);curl.rotation.set(i*.4,i*.7,i*.3);});
  for(const s of[-1,1])lock(sides,[[s*.40,.25,.12],[s*.49,.15,.10],[s*.45,.01,.13]],.095,.09);
 }else if(style==='braids'){
  for(const s of[-1,1]){
   lock(fringe,[[s*.03,.48,.26],[s*.24,.40,.37],[s*.42,.19,.20]],.11,.08);
   lock(length,[[s*.47,.24,.13],[s*.535,.02,.18],[s*.53,-.21,.20],[s*.50,-.46,.20]],.095,.077);
   for(const phase of[0,Math.PI]){
    const strand:Vec3[]=[];
    for(let i=0;i<=12;i++)strand.push([s*(.525+Math.sin(i*.9+phase)*.045),.20-i*.049,.23+Math.cos(i*.9+phase)*.022]);
    lock(length,strand,.025,.025,phase===0?light:dark);
   }
   k.box(length,[s*.505,-.365,.20],[.13,.055,.13],'#C2B191',.018,1);
  }
 }else if(style==='bob'){
  curtain(k,length,colour,.60,.51);
  for(let i=0;i<3;i++)lock(fringe,[[-.28+i*.24,.40,.30],[-.26+i*.24,.31,.43],[-.22+i*.22,.21,.43]],.14,.055,i===1?light:colour);
  for(const s of[-1,1])lock(length,[[s*.47,.28,.16],[s*.55,.02,.20],[s*.51,-.37,.20]],.10,.085);
 }else if(style==='ponytail'){
  lock(fringe,[[-.31,.37,.32],[-.09,.43,.39],[.20,.28,.39]],.125,.06);
  lock(length,[[.06,.34,-.40],[.13,.23,-.53],[.21,-.09,-.60],[.15,-.46,-.51]],.17,.12);
  k.box(length,[.11,.245,-.51],[.22,.065,.15],'#C2B191',.02,1);
 }else if(style==='bun'){
  for(const s of[-1,1])lock(fringe,[[s*.03,.44,.32],[s*.25,.35,.37],[s*.40,.23,.24]],.10,.055);
  k.box(crest,[0,.55,-.19],[.36,.28,.34],colour,.125,3);
  lock(crest,[[-.16,.50,-.20],[-.13,.66,-.23],[.10,.66,-.20],[.17,.52,-.16]],.065,.05,light);
 }else if(style==='waves'){
  curtain(k,length,colour,.73,.51);
  for(const s of[-1,1])for(let i=0;i<2;i++)lock(length,[[s*(.46+i*.015),.31,.23-i*.20],[s*(.56+i*.02),.09,.27-i*.20],[s*(.54+i*.015),-.19,.27-i*.20],[s*.51,-.51,.22-i*.20]],.09,.07,i===1?light:colour);
  lock(fringe,[[-.3,.38,.31],[-.1,.44,.40],[.20,.31,.40],[.34,.20,.32]],.125,.065);
 }else if(style==='locs'){
  for(let i=0;i<5;i++){const x=-.33+i*.16;lock(fringe,[[x,.43,.24],[x-.045,.31,.39],[x+.045,.20+(i%2)*.05,.42]],.071,.065,i%3===0?light:colour);}
  for(const s of[-1,1])for(let i=0;i<3;i++)lock(length,[[s*(.47+i*.01),.29,-.04-i*.10],[s*(.53+i*.012),.01,.02-i*.12],[s*(.50+i*.012),-.37-(i%2)*.05,.03-i*.12]],.067,.065,i===1?dark:colour);
 }else{
  lock(fringe,[[-.26,.37,.30],[0,.44,.38],[.29,.26,.38]],.14,.075);
 }
 // Keep the selected hairstyle while giving the feminine face a softer,
 // longer outline around the temples and nape.
 if(feminine){
  if(style==='swept'||style==='short'||style==='curly')curtain(k,length,colour,.43,.49);
  for(const s of[-1,1])lock(length,[[s*.42,.30,.25],[s*.49,.10,.29],[s*.45,-.17,.27]],.066,.052,s<0?light:colour);
 }
 return hair;
}
function curtain(k:CharacterKit,parent:T.Group,colour:string,length:number,width:number){
 const positions:number[]=[],indices:number[]=[],rows=8,cols=28;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const t=j/rows,a=.88+i/cols*(Math.PI*2-1.76),s=Math.sin(a),c=Math.cos(a),bulge=1+Math.sin(t*Math.PI)*.035;
  const hem=.018*Math.cos(a*5)*t*t;
  positions.push(Math.sign(s)*Math.pow(Math.abs(s),.44)*width*bulge,.22-t*length+hem,Math.sign(c)*Math.pow(Math.abs(c),.44)*(.438+t*.012)-.008);
  if(j<rows&&i<cols){const n=j*(cols+1)+i;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 const m=k.mesh(parent,geo,colour,[0,0,0],.66);m.material=k.material(colour,.66).clone();m.material.side=T.DoubleSide;
}

