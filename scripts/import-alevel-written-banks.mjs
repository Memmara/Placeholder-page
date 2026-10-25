import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const questionPath=path.join(root,'public/data/questions.json');
const curriculumPath=path.join(root,'public/data/curriculum.json');
const inputs=process.argv.slice(2);
if(!inputs.length)throw Error('Pass the A-level extensive self-check JSON files to import.');

const configs={
 '7357':{subject_id:'A-LEVEL-MATHEMATICS',name:'Mathematics'},
 '7367':{subject_id:'A-LEVEL-FURTHER-MATHS',name:'Further Maths'},
 '7408':{subject_id:'A-LEVEL-PHYSICS',name:'Physics'}
};
const allowedTypes=new Set(['short_answer','calculation','explanation','misconception_check','practical_retrieval','analysis','proof','extended_response']);
const title=value=>value.toLowerCase().split('-').map(word=>({si:'SI',pd:'Potential difference',iv:'I–V',emf:'EMF',ac:'AC',shm:'SHM'}[word]??word.charAt(0).toUpperCase()+word.slice(1))).join(' ');
const physicsTopics={
 'Practical skills and measurements':new Set(['SI','UNCERTAINTIES','ESTIMATES']),
 'Particles and radiation':new Set(['ATOM','STRONG','PARTICLES','EXCHANGE','HADRONS','CONSERVATION','PHOTOELECTRIC','ENERGY','WAVE']),
 Waves:new Set(['PROGRESSIVE','POLARISATION','STATIONARY','INTERFERENCE','DIFFRACTION','REFRACTION']),
 'Mechanics and materials':new Set(['SCALARS','MOMENTS','MOTION','PROJECTILES','NEWTON','MOMENTUM','WORK','DENSITY','STRESS']),
 Electricity:new Set(['CURRENT','PD','IV','RESISTIVITY','CIRCUITS','EMF','POTENTIAL','ELECTRICAL']),
 'Further mechanics and thermal physics':new Set(['CIRCULAR','SHM','THERMAL','IDEAL','KINETIC']),
 Fields:new Set(['GRAVITATIONAL','ELECTRIC','CAPACITANCE','CAPACITOR','MAGNETIC','INDUCTION','AC']),
 'Nuclear physics':new Set(['DECAY','HALF','BINDING','FISSION','RADIATION','NUCLEAR'])
};
function physicsTopic(spec){const token=spec.split('-')[2]??'CONTENT';return Object.entries(physicsTopics).find(([,tokens])=>tokens.has(token))?.[0]??'A-level Physics';}
function validate(source,file){
 const ids=new Set();
 for(const q of source){
  if(!q?.question_id||ids.has(q.question_id)||!q.specification_point_id||!q.question||!q.answer||!q.mark_scheme||!q.model_answer)throw Error(`${file}: invalid or duplicate question ${q?.question_id??'(missing ID)'}`);
  if(!['easy','medium','hard'].includes(q.difficulty)||!['AO1','AO2','AO3'].includes(q.ao_level)||!Array.isArray(q.common_misconceptions))throw Error(`${file}: invalid metadata for ${q.question_id}`);
  const sc=q.self_check;
  if(!sc||sc.checker_version!=='A3.0.0'||sc.answer_reveal_policy!=='after_attempt'||!Array.isArray(sc.criteria)||!sc.criteria.length||Math.abs(sc.criteria.reduce((sum,c)=>sum+c.marks,0)-sc.total_marks)>1e-9)throw Error(`${file}: invalid self-check for ${q.question_id}`);
  ids.add(q.question_id);
 }
}
function transform(q){return {...q,difficulty:q.difficulty==='easy'?'foundation_higher_easy':'foundation_higher_standard',sourceDifficulty:q.difficulty,tier:'both',question_type:allowedTypes.has(q.question_type)?q.question_type:'calculation'};}
function curriculumPoint(q,cfg){
 const spec=q.specification_point_id,topic=physicsTopic(spec),subtopic=title(spec.split('-').slice(2).join('-'));
 const topicCode=topic.toUpperCase().replace(/[^A-Z0-9]+/g,'-');
 const words=(q.model_answer.match(/[A-Za-z][A-Za-z'-]{3,}/g)??[]).map(word=>word.toLowerCase());
 return {subject_id:cfg.subject_id,topic_id:`AQA${spec.split('-')[1]}-${topicCode}`,subtopic_id:`AQA${spec.split('-')[1]}-${topicCode}-${spec}`,specification_point_id:spec,exam_board:'AQA',topic,subtopic,spec_reference:spec,spec_text:`Apply A-level knowledge and retrieval skills for ${subtopic.toLowerCase()}.`,tier:'all',keywords:[...new Set(words)].slice(0,8)};
}

let questions=JSON.parse(fs.readFileSync(questionPath,'utf8'));
const curriculum=JSON.parse(fs.readFileSync(curriculumPath,'utf8'));
const incoming=[],loaded=[];
for(const input of inputs){
 const file=path.resolve(input),source=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(source)||!source.length)throw Error(path.basename(file)+' is empty or is not a JSON array.');
 validate(source,path.basename(file));
 const code=source[0].specification_point_id.split('-')[1],cfg=configs[code];
 if(!cfg||source.some(q=>q.specification_point_id.split('-')[1]!==code))throw Error(path.basename(file)+': unsupported or mixed specification codes.');
 incoming.push(...source.map(transform));
 for(const spec of new Set(source.map(q=>q.specification_point_id))){
  if(!curriculum.records.some(point=>point.subject_id===cfg.subject_id&&point.spec_reference===spec))curriculum.records.push(curriculumPoint(source.find(q=>q.specification_point_id===spec),cfg));
 }
 const subjects=new Map((curriculum.subjects??[]).map(subject=>[subject.subject_id,subject]));
 subjects.set(cfg.subject_id,{subject_id:cfg.subject_id,name:cfg.name,qualification:'A-Level',exam_board:'AQA',specification_code:code});
 curriculum.subjects=[...subjects.values()];
 loaded.push({subject:cfg.name,questions:source.length,specificationPoints:new Set(source.map(q=>q.specification_point_id)).size});
}
const incomingIds=new Set(incoming.map(q=>q.question_id));
if(incomingIds.size!==incoming.length)throw Error('Question IDs overlap between the supplied banks.');
questions=questions.filter(q=>!incomingIds.has(q.question_id));
const existingIds=new Set(questions.map(q=>q.question_id));
const collision=incoming.find(q=>existingIds.has(q.question_id));
if(collision)throw Error('Question ID collides with another bank: '+collision.question_id);
questions.push(...incoming);
fs.writeFileSync(questionPath,JSON.stringify(questions,null,2)+'\n');
fs.writeFileSync(curriculumPath,JSON.stringify(curriculum,null,2)+'\n');
for(const entry of loaded)console.log(`${entry.subject}: ${entry.questions} written questions across ${entry.specificationPoints} specification points`);
console.log(`Imported ${incoming.length} A-level written questions. Total questions: ${questions.length}.`);
