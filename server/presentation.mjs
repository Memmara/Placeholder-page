import assets from './runtime-assets.mjs';
const coinOnlyDog=i=>['itm_301','itm_302'].includes(i.id)?{...i,premium_price:null,real_money_product_id:null,purchasable_with_real_money:false}:i;
export const economicCatalogue=assets.economicCatalogue.map(coinOnlyDog);
export const categories=assets.categories;
export const worlds=assets.worlds;
export const presentationCatalogue=assets.catalogue.map(coinOnlyDog);
export const presentationById=new Map(presentationCatalogue.map(i=>[i.id,i]));
export const EPIC_PET_COHORT=Object.freeze(assets.epicPetCohort);
export const rearCategories=new Set(['cape','wings','back_item']);
export const exclusionFor=i=>rearCategories.has(i.category)?'rear_attachment':`category:${i.category}`;

// Old equip/outfit rows are preserved as a rollback snapshot. Ownership is never moved.
// New slots are materialised once per user; any conflicts are made visible in state.
export async function migrateLoadout(db,user){
 if((await db.query('SELECT 1 FROM cosmetic_loadout_versions WHERE user_id=$1',[user])).rowCount)return;
 await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user]);
 if((await db.query('SELECT 1 FROM cosmetic_loadout_versions WHERE user_id=$1',[user])).rowCount)return;
 const notes=[];
 async function copy(rows,table,outfitId){
  const slots=new Set(),groups=new Set();
  for(const row of rows){const i=presentationById.get(row.item_id);if(!i)continue;const group=exclusionFor(i);
   if(slots.has(i.slot)||(group&&groups.has(group))){notes.push({itemId:i.id,name:i.name,outfitId:outfitId??null,reason:'This piece now shares a space with another piece. It remains in your collection; choose it to replace the other attachment.'});continue;}
   slots.add(i.slot);if(group)groups.add(group);
   if(outfitId)await db.query('INSERT INTO cosmetic_outfit_items(user_id,outfit_id,slot,inventory_id) VALUES($1,$2,$3,$4)',[user,outfitId,i.slot,row.inventory_id]);
   else await db.query('INSERT INTO cosmetic_equipped_items(user_id,slot,inventory_id) VALUES($1,$2,$3)',[user,i.slot,row.inventory_id]);
  }
 }
 const equipped=(await db.query('SELECT e.inventory_id,i.item_id FROM equipped_items e JOIN inventory i ON i.id=e.inventory_id AND i.user_id=e.user_id WHERE e.user_id=$1 AND i.revoked_at IS NULL ORDER BY e.equipped_at DESC,i.item_id',[user])).rows;
 await copy(equipped,'equipped');
 const outfits=(await db.query('SELECT id FROM outfits WHERE user_id=$1 ORDER BY created_at,id',[user])).rows;
 for(const o of outfits){const rows=(await db.query('SELECT e.inventory_id,i.item_id FROM outfit_items e JOIN inventory i ON i.id=e.inventory_id AND i.user_id=e.user_id WHERE e.user_id=$1 AND e.outfit_id=$2 AND i.revoked_at IS NULL ORDER BY i.item_id',[user,o.id])).rows;await copy(rows,'outfit',o.id);}
 await db.query('INSERT INTO cosmetic_loadout_versions(user_id,retained_conflicts) VALUES($1,$2)',[user,JSON.stringify(notes)]);
}


