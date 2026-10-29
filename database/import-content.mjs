import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const envFile=path.join(root,'.env.local');if(fs.existsSync(envFile))process.loadEnvFile(envFile);
const connectionString=process.env.DATABASE_URL_UNPOOLED??process.env.MEMMARA_DATABASE_URL??process.env.DATABASE_URL;
if(!connectionString)throw new Error('Run Neon env pull first. Memmara needs DATABASE_URL_UNPOOLED for content imports.');
const codeSubjects={8461:'biology',8462:'chemistry',8463:'physics',8300:'maths',8035:'geography',8145:'history',8700:'english_language',8702:'english_literature',8062:'religious_studies',8132:'business_studies',8201:'art_and_design',8525:'computer_science',8552:'design_and_technology',8582:'physical_education',7132:'alevel_business',7136:'alevel_economics',7182:'alevel_psychology',7367:'alevel_further_maths',7402:'alevel_biology',7405:'alevel_chemistry',7357:'alevel_maths',7408:'alevel_physics',7042:'alevel_history',7192:'alevel_sociology',7712:'alevel_english_literature',7037:'alevel_geography',7152:'alevel_politics'};
const subjectForQuestion=q=>codeSubjects[q.question_id.match(/^AQA(\d+)/)?.[1]]??String(q.subject_id??'unknown').toLowerCase().replaceAll('-','_');
const curriculumSubject=id=>({'GCSE-PHYSICS':'physics','GCSE-CHEMISTRY':'chemistry','GCSE-BIOLOGY':'biology','GCSE-MATHS':'maths','GCSE-GEOGRAPHY':'geography','GCSE-HISTORY':'history'})[id]??String(id).toLowerCase().replaceAll('-','_');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'public/data',name),'utf8'));
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const questions=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/questions-bank.json.gz'))).toString('utf8')),curriculumSource=read('curriculum.json'),curriculum=Array.isArray(curriculumSource)?curriculumSource:curriculumSource.records,definitions=read('definitions.json');
const pool=new pg.Pool({connectionString,ssl:{rejectUnauthorized:true},max:4,options:'-c search_path=memmara_game,public',application_name:'memmara_content_importer'});
const db=await pool.connect();
try{
 await db.query('BEGIN');
 for(let i=0;i<questions.length;i+=250){
  const batch=questions.slice(i,i+250),values=[],params=[];
  batch.forEach((q,index)=>{const offset=index*6;values.push(`($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6})`);params.push(q.question_id,subjectForQuestion(q),q.specification_point_id,q.question_type,q,hash(q));});
  await db.query(`INSERT INTO content_questions(question_id,subject_id,specification_point_id,question_type,payload,content_hash) VALUES ${values.join(',')} ON CONFLICT(question_id) DO UPDATE SET subject_id=excluded.subject_id,specification_point_id=excluded.specification_point_id,question_type=excluded.question_type,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);
  if(i%2500===0)console.log(`Questions: ${Math.min(i+250,questions.length).toLocaleString()} / ${questions.length.toLocaleString()}`);
 }
 for(let i=0;i<curriculum.length;i+=250){const batch=curriculum.slice(i,i+250),values=[],params=[];batch.forEach((p,index)=>{const o=index*8;values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8})`);params.push(p.specification_point_id,curriculumSubject(p.subject_id),p.topic_id??null,p.subtopic_id??null,i+index,p,hash(p),true)});await db.query(`INSERT INTO content_curriculum(specification_point_id,subject_id,topic_id,subtopic_id,sequence_no,payload,content_hash,active) VALUES ${values.join(',')} ON CONFLICT(specification_point_id) DO UPDATE SET subject_id=excluded.subject_id,topic_id=excluded.topic_id,subtopic_id=excluded.subtopic_id,sequence_no=excluded.sequence_no,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()`,params);}
 for(const d of definitions)await db.query('INSERT INTO content_definitions(definition_id,subject_id,payload,content_hash) VALUES($1,$2,$3,$4) ON CONFLICT(definition_id) DO UPDATE SET subject_id=excluded.subject_id,payload=excluded.payload,content_hash=excluded.content_hash,active=true,updated_at=now()',[d.id,d.subject_id?curriculumSubject(d.subject_id):null,d,hash(d)]);
 await db.query('COMMIT');console.log(`Imported ${questions.length.toLocaleString()} questions, ${curriculum.length.toLocaleString()} curriculum points and ${definitions.length.toLocaleString()} definitions.`);
}catch(error){await db.query('ROLLBACK');throw error}finally{db.release();await pool.end()}
