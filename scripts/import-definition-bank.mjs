import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'data/definition-bank-source.json'),'utf8'));
const curriculum=JSON.parse(fs.readFileSync(path.join(root,'public/data/curriculum.json'),'utf8')).records;
const oldQuestions=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/questions-bank.json.gz'))).toString('utf8'));
const oldDefinitions=JSON.parse(fs.readFileSync(path.join(root,'public/data/definitions.json'),'utf8'));
const aliases={'GCSE-ART-AND-DESIGN':'GCSE-ART-DESIGN','GCSE-BUSINESS-STUDIES':'GCSE-BUSINESS','GCSE-DESIGN-AND-TECHNOLOGY':'GCSE-DESIGN-TECHNOLOGY','GCSE-MATHEMATICS':'GCSE-MATHS','ALEVEL-FURTHER-MATHEMATICS':'A-LEVEL-FURTHER-MATHS'};
const normalizeSubject=id=>aliases[id]||id.replace(/^ALEVEL-/,'A-LEVEL-');
const coursePrefixes={
 'A-LEVEL-GEOGRAPHY':'AQA7037-ALGEO-','A-LEVEL-HISTORY':'AQA7042-ALHIST-','A-LEVEL-BUSINESS':'AQA7132-ALBUS-','A-LEVEL-ECONOMICS':'AQA7136-ALECON-','A-LEVEL-POLITICS':'AQA7152-ALPOL-','A-LEVEL-PSYCHOLOGY':'AQA7182-','A-LEVEL-SOCIOLOGY':'AQA7192-ALSOC-','A-LEVEL-MATHEMATICS':'AQA7357-','A-LEVEL-FURTHER-MATHS':'AQA7367-','A-LEVEL-BIOLOGY':'AQA7402-','A-LEVEL-CHEMISTRY':'AQA7405-','A-LEVEL-PHYSICS':'AQA7408-','A-LEVEL-ENGLISH-LITERATURE':'AQA7712-ALELIT-',
 'GCSE-GEOGRAPHY':'AQA8035-','GCSE-RELIGIOUS-STUDIES':'AQA8062-','GCSE-BUSINESS':'AQA8132-','GCSE-HISTORY':'AQA8145-','GCSE-ART-DESIGN':'AQA8201-','GCSE-MATHS':'AQA8300-','GCSE-BIOLOGY':'AQA8461-','GCSE-CHEMISTRY':'AQA8462-','GCSE-PHYSICS':'AQA8463-','GCSE-COMPUTER-SCIENCE':'AQA8525-','GCSE-DESIGN-TECHNOLOGY':'AQA8552-','GCSE-PHYSICAL-EDUCATION':'AQA8582-','GCSE-ENGLISH-LANGUAGE':'AQA8700-','GCSE-ENGLISH-LITERATURE':'AQA8702-'
};
const pointsBySubject=new Map(),questionsByPoint=new Map();
for(const p of curriculum){if(!pointsBySubject.has(p.subject_id))pointsBySubject.set(p.subject_id,[]);pointsBySubject.get(p.subject_id).push(p)}
for(const q of oldQuestions.filter(q=>!q.question_id.includes('-DEFINITION-'))){if(!questionsByPoint.has(q.specification_point_id))questionsByPoint.set(q.specification_point_id,[]);questionsByPoint.get(q.specification_point_id).push(q)}
const sourceIds=new Set(),definitions=[],generated=[],unmapped=[];
const clean=value=>value.toLowerCase().replace(/\s+/g,' ').trim();
const hash=value=>[...value].reduce((n,ch)=>(n*31+ch.charCodeAt(0))|0,0);
const phrase=(hay,needle)=>new RegExp('(^|[^a-z0-9])'+needle.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i').test(hay);
for(const raw of source){
 const subject=normalizeSubject(raw.subject_id),wrong=raw.incorrect_definitions;
 if(!raw.id||sourceIds.has(raw.id)||!coursePrefixes[subject]||!raw.term?.trim()||!raw.definition?.trim()||!raw.specification_point_id||!Array.isArray(wrong)||wrong.length!==3||wrong.some(x=>!x.text?.trim()||!x.feedback?.trim())||new Set([clean(raw.definition),...wrong.map(x=>clean(x.text))]).size!==4)throw Error('Invalid definition '+(raw.id??'(missing ID)'));
 sourceIds.add(raw.id);
 const term=clean(raw.term.replace(/\([^)]*\)/g,''));
 const ranked=(pointsBySubject.get(subject)||[]).map(p=>{
  let score=0;
  const title=p.specification_point_id+' '+p.topic+' '+p.subtopic;
  if(phrase(title,term))score+=12;
  if(p.keywords?.some(k=>clean(k)===term))score+=6;
  for(const q of questionsByPoint.get(p.specification_point_id)||[]){if(phrase(q.question,term))score+=3;if(phrase(q.answer,term))score+=2;}
  return {point:p,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const top=ranked[0],runnerUp=ranked[1],mapped=top?.score>=8&&(!runnerUp||top.score>=runnerUp.score*1.5)?top.point:null;
 const entry={id:raw.id,subject_id:subject,specification_point_id:mapped?.specification_point_id??null,source_specification_point_id:raw.specification_point_id,term:raw.term,definition:raw.definition,incorrect_definitions:wrong};
 definitions.push(entry);
 if(!mapped){unmapped.push({id:raw.id,subject_id:subject,term:raw.term,source_specification_point_id:raw.specification_point_id,candidates:ranked.slice(0,3).map(x=>({specification_point_id:x.point.specification_point_id,subtopic:x.point.subtopic,score:x.score}))});continue}
 const correctIndex=Math.abs(hash(raw.id))%4,letters=['A','B','C','D'];
 const choices=[...wrong.map(x=>({text:x.text,feedback:x.feedback}))];
 choices.splice(correctIndex,0,{text:raw.definition,feedback:''});
 const correctId=letters[correctIndex];
 const feedback=Object.fromEntries(choices.map((choice,index)=>[letters[index],choice.feedback]).filter(([,message])=>message));
 const question='Which definition best describes '+raw.term+'?';
 const misconceptions=wrong.map(x=>x.feedback);
 generated.push({
  question_id:coursePrefixes[subject]+'DEFINITION-'+raw.id,
  specification_point_id:mapped.specification_point_id,
  difficulty:subject.startsWith('GCSE-')?'foundation_higher_easy':'foundation_higher_standard',
  ao_level:'AO1',question_type:'multiple_choice',response_format:'single_select',tier:'both',
  question,options:choices.map((choice,index)=>({option_id:letters[index],text:choice.text})),
  answer_key:{correct_option_ids:[correctId]},option_feedback:feedback,
  answer:correctId+' — '+raw.definition,
  mark_scheme:'1 mark for selecting '+correctId+'. Otherwise 0 marks.',
  model_answer:raw.definition,common_misconceptions:misconceptions,
  self_check:{version:1,total_marks:1,instructions:'Award 1 mark only for selecting the correct option.',criteria:[{criterion_id:'C1',marks:1,description:'Selects the correct definition.',examples:[correctId],examples_are_exhaustive:true,feedback_if_missed:raw.definition}],model_answer:raw.definition,misconception_feedback:wrong.map(x=>({misconception:x.text,feedback:x.feedback})),answer_reveal_policy:'after_attempt'}
 });
}
const questions=[...oldQuestions.filter(q=>!q.question_id.includes('-DEFINITION-')),...generated];
const existing=oldDefinitions.filter(d=>!sourceIds.has(d.id));
fs.writeFileSync(path.join(root,'data/questions-bank.json.gz'),zlib.gzipSync(JSON.stringify(questions)));
fs.writeFileSync(path.join(root,'public/data/definitions.json'),JSON.stringify([...existing,...definitions]));
fs.writeFileSync(path.join(root,'data/definition-import-report.json'),JSON.stringify({total:source.length,flashMatchAndMemory:definitions.length,generatedDailyMixMcq:generated.length,needsCurriculumMapping:unmapped.length,unmapped},null,2)+'\n');
console.log(JSON.stringify({total:source.length,definitions:definitions.length,generatedDailyMixMcq:generated.length,needsCurriculumMapping:unmapped.length},null,2));
