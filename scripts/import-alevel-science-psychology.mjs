import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bankPath=path.join(root,'data/questions-bank.json.gz');
const curriculumPath=path.join(root,'public/data/curriculum.json');
const configs={
 '7402':{subject_id:'A-LEVEL-BIOLOGY',name:'Biology'},
 '7405':{subject_id:'A-LEVEL-CHEMISTRY',name:'Chemistry'},
 '7182':{subject_id:'A-LEVEL-PSYCHOLOGY',name:'Psychology'}
};
const allowedTypes=new Set(['short_answer','calculation','explanation']);
const inputs=process.argv.slice(2);
if(!inputs.length)throw new Error('Pass the A-level Biology, Chemistry and Psychology JSON files.');
const questions=JSON.parse(zlib.gunzipSync(fs.readFileSync(bankPath)).toString('utf8'));
const curriculum=JSON.parse(fs.readFileSync(curriculumPath,'utf8'));
const incoming=[],counts=[];
for(const input of inputs){
 const source=JSON.parse(fs.readFileSync(input,'utf8'));
 if(!Array.isArray(source)||!source.length)throw new Error(`${input}: empty question array`);
 const code=source[0].question_id.match(/^AQA(\d+)-/)?.[1],cfg=configs[code];
 if(!cfg)throw new Error(`${input}: unsupported course code`);
 const seen=new Set();
 for(const q of source){
  if(!q.question_id.startsWith(`AQA${code}-`)||q.specification_point_id?.split('-')[1]!==code||seen.has(q.question_id)||!allowedTypes.has(q.question_type)||!['easy','medium','hard'].includes(q.difficulty)||!['AO1','AO2','AO3'].includes(q.ao_level)||!q.question||!q.answer||!q.mark_scheme||!q.model_answer||!Array.isArray(q.common_misconceptions))throw new Error(`${input}: invalid or duplicate question ${q.question_id}`);
  const sc=q.self_check;
  if(sc?.version!==1||sc.checker_version!=='A3.0.0'||sc.answer_reveal_policy!=='after_attempt'||!Array.isArray(sc.criteria)||!sc.criteria.length||!Array.isArray(sc.misconception_feedback)||Math.abs(sc.criteria.reduce((sum,c)=>sum+c.marks,0)-sc.total_marks)>1e-9)throw new Error(`${input}: invalid self-check ${q.question_id}`);
  seen.add(q.question_id);
  incoming.push({...q,difficulty:q.difficulty==='easy'?'foundation_higher_easy':'foundation_higher_standard',sourceDifficulty:q.difficulty,tier:'both'});
 }
 const pointIds=new Set(curriculum.records.map(p=>p.specification_point_id));
 for(const q of source){
  const spec=q.specification_point_id;
  if(pointIds.has(spec))continue;
  const parts=spec.split('-'),topicCode=parts[2],topic=topicCode.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),subtopic=parts.slice(2).join(' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const keywords=[...new Set((q.model_answer.match(/[A-Za-z][A-Za-z'-]{3,}/g)??[]).map(w=>w.toLowerCase()))].slice(0,8);
  curriculum.records.push({subject_id:cfg.subject_id,topic_id:`AQA${code}-${topicCode}`,subtopic_id:`AQA${code}-${topicCode}-${spec}`,specification_point_id:spec,exam_board:'AQA',topic,subtopic,spec_reference:spec,spec_text:`Apply A-level knowledge and retrieval skills for ${subtopic.toLowerCase()}.`,tier:'all',keywords});
  pointIds.add(spec);
 }
 const subjects=new Map((curriculum.subjects??[]).map(s=>[s.subject_id,s]));
 subjects.set(cfg.subject_id,{subject_id:cfg.subject_id,name:cfg.name,qualification:'A-Level',exam_board:'AQA',specification_code:code});
 curriculum.subjects=[...subjects.values()];
 counts.push({subject:cfg.name,questions:source.length,points:new Set(source.map(q=>q.specification_point_id)).size});
}
const ids=new Set(incoming.map(q=>q.question_id));
if(ids.size!==incoming.length)throw new Error('Input files contain duplicate question IDs.');
const final=[...questions.filter(q=>!ids.has(q.question_id)),...incoming];
fs.writeFileSync(bankPath,zlib.gzipSync(JSON.stringify(final)));
fs.writeFileSync(curriculumPath,JSON.stringify(curriculum,null,2)+'\n');
console.log(JSON.stringify({imported:counts,totalQuestions:final.length},null,2));
