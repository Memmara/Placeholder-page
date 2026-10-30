// Temporary deployment helper for the owner-only repair; remove with the route.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
for(const subject of ['a-level-biology','a-level-chemistry','a-level-psychology']){
 const questions=JSON.parse(fs.readFileSync(path.join(root,'public/data/questions',`${subject}.json`),'utf8'));
 const dir=path.join(root,'public/data/content-sync',subject);
 fs.mkdirSync(dir,{recursive:true});
 for(let offset=0;offset<questions.length;offset+=20)fs.writeFileSync(path.join(dir,`${offset}.json`),JSON.stringify(questions.slice(offset,offset+20)));
 console.log(`${subject}: ${questions.length} questions in ${Math.ceil(questions.length/20)} batches`);
}
