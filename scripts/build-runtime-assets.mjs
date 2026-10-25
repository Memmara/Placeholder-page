import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as catalogue from '../server/catalogue.mjs';
import * as presentation from '../server/presentation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const payload={
 catalogue:catalogue.catalogue,
 economicCatalogue:presentation.economicCatalogue,
 sets:catalogue.sets,
 achievements:catalogue.achievements,
 levels:catalogue.levels,
 boxes:catalogue.boxes,
 config:catalogue.config,
 categories:presentation.categories,
 worlds:presentation.worlds,
 epicPetCohort:presentation.EPIC_PET_COHORT,
};
fs.writeFileSync(path.join(root,'server/runtime-assets.json'),JSON.stringify(payload));
console.log(`Runtime assets written (${Buffer.byteLength(JSON.stringify(payload)).toLocaleString()} bytes).`);
