import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {achievementCatalogue} from '../server/achievement-catalogue.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'server/runtime-assets.json');
const target=path.join(root,'server/runtime-assets.mjs');
const serialized=fs.readFileSync(source,'utf8').trim();
fs.writeFileSync(target,`export default ${serialized};\n`);
const previewPath=path.join(root,'public/data/game-preview.json');
if(fs.existsSync(previewPath)){
 const preview=JSON.parse(fs.readFileSync(previewPath,'utf8'));
 preview.achievements=achievementCatalogue(JSON.parse(serialized).achievements);
 fs.writeFileSync(previewPath,JSON.stringify(preview));
}

