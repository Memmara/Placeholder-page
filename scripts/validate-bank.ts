import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {validateBank,subjectForQuestionId} from '../src/engine.ts';

type Manifest={version:number;subjects:Record<string,{url:string;count:number}>};
type Question={question_id:string;question_type:string};

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=path.join(root,'data/questions-bank.json.gz');
const curriculumPath=path.join(root,'public/data/curriculum.json');
const manifestPath=path.join(root,'public/data/questions/manifest.json');

const questions=JSON.parse(zlib.gunzipSync(fs.readFileSync(sourcePath)).toString('utf8')) as Question[];
const curriculum=JSON.parse(fs.readFileSync(curriculumPath,'utf8'));
const bank=validateBank(questions,curriculum);
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')) as Manifest;
if(manifest.version!==1)throw new Error(`Unsupported question manifest version: ${manifest.version}`);

const sourceIds=new Set(bank.questions.map(question=>question.question_id));
const generatedIds=new Set<string>();
const bySubject:Record<string,{questions:number;multipleChoice:number;written:number}>={};

for(const [subject,entry] of Object.entries(manifest.subjects)){
 if(!entry.url.startsWith('/data/questions/')||entry.url.includes('..'))throw new Error(`Unsafe manifest URL for ${subject}.`);
 const file=path.join(root,'public',entry.url.replace(/^\//,''));
 const generated=JSON.parse(fs.readFileSync(file,'utf8')) as Question[];
 if(generated.length!==entry.count)throw new Error(`${subject} manifest count is ${entry.count}, but its file contains ${generated.length}.`);
 let multipleChoice=0;
 for(const question of generated){
  if(generatedIds.has(question.question_id))throw new Error(`Generated subject files contain duplicate ID ${question.question_id}.`);
  if(!sourceIds.has(question.question_id))throw new Error(`Generated subject files contain unknown ID ${question.question_id}.`);
  const inferred=subjectForQuestionId(question.question_id);
  if(inferred!==subject)throw new Error(`${question.question_id} is in ${subject}, but belongs to ${inferred??'an unknown subject'}.`);
  generatedIds.add(question.question_id);
  if(question.question_type==='multiple_choice')multipleChoice++;
 }
 bySubject[subject]={questions:generated.length,multipleChoice,written:generated.length-multipleChoice};
}

if(generatedIds.size!==sourceIds.size){
 const missing=[...sourceIds].filter(id=>!generatedIds.has(id)).slice(0,10);
 throw new Error(`Generated subject files are missing ${sourceIds.size-generatedIds.size} questions${missing.length?`: ${missing.join(', ')}`:''}.`);
}

console.log(JSON.stringify({
 valid:true,
 questions:bank.questions.length,
 curriculumPoints:bank.points.length,
 subjects:Object.keys(bySubject).length,
 questionsBySubject:bySubject,
},null,2));
