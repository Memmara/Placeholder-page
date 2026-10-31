// Temporary owner-only repair endpoint. Remove after the verified live import.
import crypto from 'node:crypto';
import {pool} from './catalogue.mjs';

const ownerHash='b9b7e80aaf504e7479f8d85b5370485d5d6e2a5786764f6e257ab476b0504608';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const codeSubjects={8300:'maths',8035:'geography',8145:'history',8132:'business_studies',8525:'computer_science',8582:'physical_education'};
const curriculumSubjects={'GCSE-MATHS':'maths','GCSE-GEOGRAPHY':'geography','GCSE-HISTORY':'history','GCSE-BUSINESS':'business_studies','GCSE-COMPUTER-SCIENCE':'computer_science','GCSE-PHYSICAL-EDUCATION':'physical_education'};

export async function syncContentImport(user,body){
 if(hash(user)!==ownerHash)throw fail('Not found.',404);
 if(Array.isArray(body.points)){
  const points=body.points;
  if(points.length<1||points.length>100||points.some(({point,sequence})=>!curriculumSubjects[point?.subject_id]||!point.specification_point_id||!Number.isSafeInteger(sequence)||sequence<0))throw fail('Invalid curriculum batch.');
  const values=[],params=[];
  points.forEach(({point,sequence},index)=>{const n=index*8;values.push(`($${n+1},$${n+2},$${n+3},$${n+4},$${n+5},$${n+6},$${n+7},$${n+8})`);params.push(point.specification_point_id,curriculumSubjects[point.subject_id],point.topic_id??null,point.subtopic_id??null,sequence,point,hash(JSON.stringify(point)),true);});
  await pool.query(`INSERT INTO content_curriculum(specification_point_id,subject_id,topic_id,subtopic_id,sequence_no,payload,content_hash,active) VALUES ${values.join(',')} ON CONFLICT(specification_point_id) DO UPDATE SET subject_id=excluded.subject_id,topic_id=excluded.topic_id,subtopic_id=excluded.subtopic_id,sequence_no=excluded.sequence_no,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  return {processed:points.length};
 }
 const questions=body.questions;
 if(!Array.isArray(questions)||questions.length<1||questions.length>100)throw fail('Invalid import batch.');
 const ids=new Set();
 for(const q of questions){
  const subject=codeSubjects[q.question_id?.match(/^AQA(\d+)/)?.[1]];
  if(!subject||ids.has(q.question_id)||!q.specification_point_id||q.question_type==='multiple_choice'||!q.self_check?.criteria?.length)throw fail('Invalid written question.');
  ids.add(q.question_id);
 }
 const points=[...new Set(questions.map(q=>q.specification_point_id))];
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const mapped=await db.query('SELECT specification_point_id FROM content_curriculum WHERE active AND specification_point_id=ANY($1::text[])',[points]);
  if(mapped.rowCount!==points.length)throw fail('A question has a missing curriculum mapping.');
  const values=[],params=[];
  questions.forEach((q,index)=>{const n=index*6;values.push(`($${n+1},$${n+2},$${n+3},$${n+4},$${n+5},$${n+6})`);params.push(q.question_id,codeSubjects[q.question_id.match(/^AQA(\d+)/)[1]],q.specification_point_id,q.question_type,q,hash(JSON.stringify(q)));});
  await db.query(`INSERT INTO content_questions(question_id,subject_id,specification_point_id,question_type,payload,content_hash) VALUES ${values.join(',')} ON CONFLICT(question_id) DO UPDATE SET subject_id=excluded.subject_id,specification_point_id=excluded.specification_point_id,question_type=excluded.question_type,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  await db.query('COMMIT');
  return {processed:questions.length};
 }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
}
