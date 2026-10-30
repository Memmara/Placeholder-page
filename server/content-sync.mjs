// Temporary, owner-only production content repair. Remove after the verified import.
import crypto from 'node:crypto';
import {pool} from './catalogue.mjs';

const ownerHash='b9b7e80aaf504e7479f8d85b5370485d5d6e2a5786764f6e257ab476b0504608';
const batchSize=20;
const courses={
 'gcse-english-language':{subject:'english_language',course:'GCSE-ENGLISH-LANGUAGE',code:'8700',count:987},
 'a-level-biology':{subject:'alevel_biology',course:'A-LEVEL-BIOLOGY',code:'7402',count:1010},
 'a-level-chemistry':{subject:'alevel_chemistry',course:'A-LEVEL-CHEMISTRY',code:'7405',count:504},
 'a-level-psychology':{subject:'alevel_psychology',course:'A-LEVEL-PSYCHOLOGY',code:'7182',count:1050}
};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
async function readJson(path,origin){
 const response=await fetch(new URL(path,origin),{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw fail(`Content asset unavailable (${response.status}).`,503);
 return response.json();
}
export async function syncContent(user,body,origin){
 if(crypto.createHash('sha256').update(user).digest('hex')!==ownerHash)throw fail('Not found.',404);
 const key=String(body.subject??''),course=courses[key],offset=Number(body.offset);
 if(!course||!Number.isSafeInteger(offset)||offset<0||offset>=course.count)throw fail('Invalid content import page.');
 if(offset%batchSize!==0)throw fail('Invalid content import page.');
 const slice=await readJson(`/data/content-sync/${key}/${offset}.json`,origin);
 if(!Array.isArray(slice)||slice.length!==Math.min(batchSize,course.count-offset)||slice.some(q=>!q.question_id?.startsWith(`AQA${course.code}-`)||!q.specification_point_id||!q.self_check))throw fail('Deployed content did not match the expected bank.',503);
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  if(offset===0){
   const curriculum=await readJson('/data/curriculum.json',origin);
   if(!Array.isArray(curriculum.records))throw fail('Deployed curriculum is invalid.',503);
   const points=curriculum.records.map((point,index)=>({point,index})).filter(({point})=>point.subject_id===course.course);
   for(const {point,index} of points)await db.query(`INSERT INTO content_curriculum(specification_point_id,subject_id,topic_id,subtopic_id,sequence_no,payload,content_hash,active) VALUES($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT(specification_point_id) DO UPDATE SET subject_id=excluded.subject_id,topic_id=excluded.topic_id,subtopic_id=excluded.subtopic_id,sequence_no=excluded.sequence_no,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,[point.specification_point_id,course.subject,point.topic_id??null,point.subtopic_id??null,index,point,hash(point)]);
  }
  const values=[],params=[];
  slice.forEach((question,index)=>{const n=index*6;values.push(`($${n+1},$${n+2},$${n+3},$${n+4},$${n+5},$${n+6})`);params.push(question.question_id,course.subject,question.specification_point_id,question.question_type,question,hash(question));});
  await db.query(`INSERT INTO content_questions(question_id,subject_id,specification_point_id,question_type,payload,content_hash) VALUES ${values.join(',')} ON CONFLICT(question_id) DO UPDATE SET subject_id=excluded.subject_id,specification_point_id=excluded.specification_point_id,question_type=excluded.question_type,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  await db.query('COMMIT');
  return {subject:key,processed:slice.length,nextOffset:offset+slice.length<course.count?offset+slice.length:null,total:course.count};
 }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
}
