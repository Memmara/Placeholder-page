import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.join(root,'data/questions-bank.json.gz'),target=path.join(root,'public/data/questions');
const course={7037:'A-LEVEL-GEOGRAPHY',7042:'A-LEVEL-HISTORY',7132:'A-LEVEL-BUSINESS',7136:'A-LEVEL-ECONOMICS',7152:'A-LEVEL-POLITICS',7182:'A-LEVEL-PSYCHOLOGY',7192:'A-LEVEL-SOCIOLOGY',7357:'A-LEVEL-MATHEMATICS',7367:'A-LEVEL-FURTHER-MATHS',7402:'A-LEVEL-BIOLOGY',7405:'A-LEVEL-CHEMISTRY',7408:'A-LEVEL-PHYSICS',7712:'A-LEVEL-ENGLISH-LITERATURE',8035:'GCSE-GEOGRAPHY',8062:'GCSE-RELIGIOUS-STUDIES',8132:'GCSE-BUSINESS',8145:'GCSE-HISTORY',8201:'GCSE-ART-DESIGN',8300:'GCSE-MATHS',8461:'GCSE-BIOLOGY',8462:'GCSE-CHEMISTRY',8463:'GCSE-PHYSICS',8525:'GCSE-COMPUTER-SCIENCE',8552:'GCSE-DESIGN-TECHNOLOGY',8582:'GCSE-PHYSICAL-EDUCATION',8700:'GCSE-ENGLISH-LANGUAGE',8702:'GCSE-ENGLISH-LITERATURE'};
const groups=new Map();for(const q of JSON.parse(zlib.gunzipSync(fs.readFileSync(source)).toString('utf8'))){const id=course[q.question_id.match(/^AQA(\d+)/)?.[1]];if(!id)throw new Error('Unknown question course: '+q.question_id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(q)}
fs.mkdirSync(target,{recursive:true});const manifest={version:1,subjects:{}};
for(const [id,questions] of groups){const name=id.toLowerCase()+'.json';fs.writeFileSync(path.join(target,name),JSON.stringify(questions));manifest.subjects[id]={url:'/data/questions/'+name,count:questions.length};}
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(`Split ${[...groups.values()].reduce((n,q)=>n+q.length,0).toLocaleString()} questions into ${groups.size} subject files.`);
