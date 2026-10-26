import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'server/runtime-assets.json');
const target=path.join(root,'server/runtime-assets.mjs');
const serialized=fs.readFileSync(source,'utf8').trim();
fs.writeFileSync(target,`export default ${serialized};\n`);

