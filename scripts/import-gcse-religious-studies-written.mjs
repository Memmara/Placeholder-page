import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const sourceFile=process.argv[2];
if(!sourceFile)throw new Error('Pass the GCSE Religious Studies extensive self-check JSON file.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bankFile=path.join(root,'data/questions-bank.json.gz');
const curriculumFile=path.join(root,'public/data/curriculum.json');
const source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const curriculum=JSON.parse(fs.readFileSync(curriculumFile,'utf8'));
const pointIds=new Set(curriculum.records.filter(point=>point.subject_id==='GCSE-RELIGIOUS-STUDIES').map(point=>point.specification_point_id));
const difficulty={foundation_higher_easy:'foundation_higher_easy',foundation_higher_medium:'foundation_higher_standard',higher_hard:'higher_only_standard'};
const ids=new Set();
if(!Array.isArray(source)||source.length===0)throw new Error('The Religious Studies file is empty.');
for(const question of source){
 const sc=question.self_check;
 if(!question.question_id?.startsWith('AQA8062-')||ids.has(question.question_id)||!pointIds.has(question.specification_point_id)||!difficulty[question.difficulty]||!['short_answer','explanation','extended_response'].includes(question.question_type)||!['AO1','AO2','AO3','AO4','AO5','AO6'].includes(question.ao_level)||!question.question||!question.answer||!question.mark_scheme||!question.model_answer||!Array.isArray(question.common_misconceptions))throw new Error(`Invalid or duplicate question ${question.question_id??'(missing ID)'}`);
 if(sc?.version!==1||sc.checker_version!=='A3.0.0'||sc.answer_reveal_policy!=='after_attempt'||!Array.isArray(sc.criteria)||!sc.criteria.length||!Array.isArray(sc.misconception_feedback)||Math.abs(sc.criteria.reduce((sum,c)=>sum+c.marks,0)-sc.total_marks)>1e-9)throw new Error(`Invalid self-check for ${question.question_id}`);
 ids.add(question.question_id);
}
const old=JSON.parse(zlib.gunzipSync(fs.readFileSync(bankFile)).toString('utf8'));
const existingIds=new Set(old.map(question=>question.question_id));
for(const id of ids)if(existingIds.has(id))throw new Error(`Question ID already exists: ${id}`);
const adapted=source.map(question=>({...question,difficulty:difficulty[question.difficulty],tier:question.difficulty==='higher_hard'?'higher':'both'}));
fs.writeFileSync(bankFile,zlib.gzipSync(JSON.stringify([...old,...adapted])));
console.log(`Added ${adapted.length} GCSE Religious Studies written questions across ${new Set(adapted.map(question=>question.specification_point_id)).size} specification points.`);
