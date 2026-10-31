// Temporary owner-only content import. Remove immediately after the live sync.
import crypto from 'node:crypto';
import {pool} from './catalogue.mjs';

const ownerHash='b9b7e80aaf504e7479f8d85b5370485d5d6e2a5786764f6e257ab476b0504608';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const slug=id=>({'GCSE-PHYSICS':'physics','GCSE-CHEMISTRY':'chemistry','GCSE-BIOLOGY':'biology','GCSE-MATHS':'maths','GCSE-GEOGRAPHY':'geography','GCSE-HISTORY':'history'})[id]??id.toLowerCase().replaceAll('-','_');

export async function syncDefinitions(user,body){
 if(hash(user)!==ownerHash)throw fail('Not found.',404);
 if(Array.isArray(body.points)){
  const items=body.points;
  if(items.length<1||items.length>20||items.some(({point,sequence})=>!point?.subject_id||!point.specification_point_id||!Number.isSafeInteger(sequence)||sequence<0))throw fail('Invalid curriculum batch.');
  const values=[],params=[];
  items.forEach(({point,sequence},index)=>{const n=index*8;values.push(`($${n+1},$${n+2},$${n+3},$${n+4},$${n+5},$${n+6},$${n+7},$${n+8})`);params.push(point.specification_point_id,slug(point.subject_id),point.topic_id??null,point.subtopic_id??null,sequence,point,hash(JSON.stringify(point)),true)});
  await pool.query(`INSERT INTO content_curriculum(specification_point_id,subject_id,topic_id,subtopic_id,sequence_no,payload,content_hash,active) VALUES ${values.join(',')} ON CONFLICT(specification_point_id) DO UPDATE SET subject_id=excluded.subject_id,topic_id=excluded.topic_id,subtopic_id=excluded.subtopic_id,sequence_no=excluded.sequence_no,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  return {processed:items.length};
 }
 if(Array.isArray(body.definitions)){
  const items=body.definitions;
  if(items.length<1||items.length>20||items.some(d=>!d.id?.startsWith('def-')||!d.subject_id||!d.term||!d.definition||!Array.isArray(d.incorrect_definitions)||d.incorrect_definitions.length!==3))throw fail('Invalid definition batch.');
  const values=[],params=[];
  items.forEach((d,index)=>{const n=index*4;values.push(`($${n+1},$${n+2},$${n+3},$${n+4})`);params.push(d.id,slug(d.subject_id),d,hash(JSON.stringify(d)))});
  await pool.query(`INSERT INTO content_definitions(definition_id,subject_id,payload,content_hash) VALUES ${values.join(',')} ON CONFLICT(definition_id) DO UPDATE SET subject_id=excluded.subject_id,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  return {processed:items.length};
 }
 if(Array.isArray(body.deactivateIds)){
  const ids=body.deactivateIds;
  if(ids.length<1||ids.length>20||ids.some(id=>typeof id!=='string'||!id.includes('-DEFINITION-def-')))throw fail('Invalid retirement batch.');
  await pool.query("UPDATE content_questions SET active=false,updated_at=now() WHERE question_id=ANY($1::text[]) AND question_type='multiple_choice'",[ids]);
  return {processed:ids.length};
 }
 const items=body.questions;
 if(!Array.isArray(items)||items.length<1||items.length>20||items.some(q=>!q.question_id?.includes('-DEFINITION-def-')||!q.specification_point_id||q.question_type!=='multiple_choice'||q.answer_key?.correct_option_ids?.length!==1||q.options?.length!==4))throw fail('Invalid question batch.');
 const ids=[...new Set(items.map(q=>q.specification_point_id))];
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const rows=(await db.query('SELECT specification_point_id,subject_id FROM content_curriculum WHERE active AND specification_point_id=ANY($1::text[])',[ids])).rows;
  if(rows.length!==ids.length)throw fail('A question has a missing curriculum mapping.');
  const subjects=new Map(rows.map(row=>[row.specification_point_id,row.subject_id])),values=[],params=[];
  items.forEach((q,index)=>{const n=index*6;values.push(`($${n+1},$${n+2},$${n+3},$${n+4},$${n+5},$${n+6})`);params.push(q.question_id,subjects.get(q.specification_point_id),q.specification_point_id,q.question_type,q,hash(JSON.stringify(q)))});
  await db.query(`INSERT INTO content_questions(question_id,subject_id,specification_point_id,question_type,payload,content_hash) VALUES ${values.join(',')} ON CONFLICT(question_id) DO UPDATE SET subject_id=excluded.subject_id,specification_point_id=excluded.specification_point_id,question_type=excluded.question_type,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  await db.query('COMMIT');
  return {processed:items.length};
 }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
}

