import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import pg from 'pg';
import assets from './runtime-assets.mjs';
import {economicCatalogue,presentationCatalogue,presentationById,exclusionFor} from './presentation.mjs';

export const root=import.meta.url?path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'):process.cwd();
export const catalogue=presentationCatalogue,sets=assets.sets,achievements=assets.achievements,levels=assets.levels,boxes=assets.boxes,config=assets.config;
export const byId=new Map(catalogue.map(i=>[i.id,i]));
const applicationDatabaseUrl=process.env.MEMMARA_DATABASE_URL||process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL;
const databaseConfig=applicationDatabaseUrl?{connectionString:applicationDatabaseUrl}:JSON.parse(fs.readFileSync(path.join(root,'.local-db/credentials.json'),'utf8'));
const cloudflareRuntime=process.env.CF_PAGES==='1';
export const pool=new pg.Pool({...databaseConfig,options:'-c search_path=memmara_game,public',max:cloudflareRuntime?4:16,maxUses:cloudflareRuntime?100:7500,idleTimeoutMillis:cloudflareRuntime?1000:10000,connectionTimeoutMillis:8000,application_name:'memmara_account_game_api'});
export let configId;
export async function ensureConfigId(){
 if(configId)return configId;
 configId=(await pool.query('SELECT id FROM config_versions ORDER BY published_at DESC LIMIT 1')).rows[0]?.id;
 if(!configId)throw new Error('The Memmara catalogue has not been deployed to this database.');
 return configId;
}
export async function seed(){
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('memmara-game-catalogue-v1'))");
  const hash=crypto.createHash('sha256').update(JSON.stringify({config,catalogue:economicCatalogue,sets,achievements,levels,boxes})).digest('hex');
  configId=(await db.query('INSERT INTO config_versions(payload,content_hash,published_by,published_at) VALUES($1,$2,$3,now()) ON CONFLICT(content_hash) DO UPDATE SET content_hash=excluded.content_hash RETURNING id',[config,hash,'local-catalogue-importer'])).rows[0].id;
  const migration=fs.readFileSync(path.join(root,'database/migrations/002-local-game.sql'),'utf8'),migrationHash=crypto.createHash('sha256').update(migration).digest('hex');
  const applied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='002_local_game'")).rows[0];
  if(applied&&applied.sha256!==migrationHash)throw Error('Local game migration changed after it was applied.');
  if(!applied){await db.query(migration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('002_local_game',$1)",[migrationHash]);}
  const presentationMigration=fs.readFileSync(path.join(root,'database/migrations/003-cosmetic-presentations.sql'),'utf8'),presentationHash=crypto.createHash('sha256').update(presentationMigration).digest('hex');
  const presentationApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='003_cosmetic_presentations'")).rows[0];
  if(presentationApplied&&presentationApplied.sha256!==presentationHash)throw Error('Cosmetic migration changed after it was applied.');
  if(!presentationApplied){await db.query(presentationMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('003_cosmetic_presentations',$1)",[presentationHash]);}
  const accountsMigration=fs.readFileSync(path.join(root,'database/migrations/004-accounts.sql'),'utf8'),accountsHash=crypto.createHash('sha256').update(accountsMigration).digest('hex');
  const accountsApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='004_accounts'")).rows[0];
  if(accountsApplied&&accountsApplied.sha256!==accountsHash)throw Error('Accounts migration changed after it was applied.');
  if(!accountsApplied){await db.query(accountsMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('004_accounts',$1)",[accountsHash]);}
  const reviewMigration=fs.readFileSync(path.join(root,'database/migrations/005-review-sessions.sql'),'utf8'),reviewHash=crypto.createHash('sha256').update(reviewMigration).digest('hex');
  const reviewApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='005_review_sessions'")).rows[0];
  if(reviewApplied&&reviewApplied.sha256!==reviewHash)throw Error('Review migration changed after it was applied.');
  if(!reviewApplied){await db.query(reviewMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('005_review_sessions',$1)",[reviewHash]);}
  const monetisationMigration=fs.readFileSync(path.join(root,'database/migrations/006-monetisation.sql'),'utf8'),monetisationHash=crypto.createHash('sha256').update(monetisationMigration).digest('hex');
  const monetisationApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='006_monetisation'")).rows[0];
  if(monetisationApplied&&monetisationApplied.sha256!==monetisationHash)throw Error('Monetisation migration changed after it was applied.');
  if(!monetisationApplied){await db.query(monetisationMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('006_monetisation',$1)",[monetisationHash]);}
  const genderMigration=fs.readFileSync(path.join(root,'database/migrations/007-gender-profile.sql'),'utf8'),genderHash=crypto.createHash('sha256').update(genderMigration).digest('hex');
  const genderApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='007_gender_profile'")).rows[0];
  if(genderApplied&&genderApplied.sha256!==genderHash)throw Error('Gender profile migration changed after it was applied.');
  if(!genderApplied){await db.query(genderMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('007_gender_profile',$1)",[genderHash]);}
  const commerceMigration=fs.readFileSync(path.join(root,'database/migrations/008-commerce.sql'),'utf8'),commerceHash=crypto.createHash('sha256').update(commerceMigration).digest('hex');
  const commerceApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='008_commerce'")).rows[0];
  if(commerceApplied&&commerceApplied.sha256!==commerceHash)throw Error('Commerce migration changed after it was applied.');
  if(!commerceApplied){await db.query(commerceMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('008_commerce',$1)",[commerceHash]);}
  const contentMigration=fs.readFileSync(path.join(root,'database/migrations/009-content-catalogue.sql'),'utf8'),contentHash=crypto.createHash('sha256').update(contentMigration).digest('hex');
  const contentApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='009_content_catalogue'")).rows[0];
  if(contentApplied&&contentApplied.sha256!==contentHash)throw Error('Content catalogue migration changed after it was applied.');
  if(!contentApplied){await db.query(contentMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('009_content_catalogue',$1)",[contentHash]);}
  const referralMigration=fs.readFileSync(path.join(root,'database/migrations/010-referrals-and-pets.sql'),'utf8'),referralHash=crypto.createHash('sha256').update(referralMigration).digest('hex');
  const referralApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='010_referrals_and_pets'")).rows[0];
  if(referralApplied&&referralApplied.sha256!==referralHash)throw Error('Referral migration changed after it was applied.');
  if(!referralApplied){await db.query(referralMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('010_referrals_and_pets',$1)",[referralHash]);}
  const consumerPurchasesMigration=fs.readFileSync(path.join(root,'database/migrations/011-consumer-purchases.sql'),'utf8'),consumerPurchasesHash=crypto.createHash('sha256').update(consumerPurchasesMigration).digest('hex');
  const consumerPurchasesApplied=(await db.query("SELECT sha256 FROM public.memmara_schema_migrations WHERE id='011_consumer_purchases'")).rows[0];
  if(consumerPurchasesApplied&&consumerPurchasesApplied.sha256!==consumerPurchasesHash)throw Error('Consumer purchases migration changed after it was applied.');
  if(!consumerPurchasesApplied){await db.query(consumerPurchasesMigration);await db.query("INSERT INTO public.memmara_schema_migrations(id,sha256) VALUES('011_consumer_purchases',$1)",[consumerPurchasesHash]);}
  await db.query("UPDATE subjects SET available=true WHERE id IN ('chemistry','maths','geography')");
  for(const subject of ['biology','chemistry','physics','maths'])await db.query('INSERT INTO subjects(id,name,available) VALUES($1,$2,false) ON CONFLICT DO NOTHING',['alevel_'+subject,'A-Level '+subject[0].toUpperCase()+subject.slice(1)]);
  await db.query("INSERT INTO seasonal_events(id,name,starts_at,ends_at,edition,claim_grace_ends_at,config) VALUES('season_01','Founding Scholars', '2026-10-19','2027-01-11',1,'2027-01-18','{}') ON CONFLICT DO NOTHING");
  for(const s of sets){
   await db.query('INSERT INTO item_sets(id,name,subject_id,pieces) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[s.id,s.name,s.subject,s.pieces]);
   for(const b of s.bonuses)await db.query('INSERT INTO set_bonuses(set_id,pieces_required,cosmetic_effect,title) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[s.id,b.pieces,{effect:b.effect,learning_modifier:0},b.pieces===s.pieces?s.name:null]);
  }
  for(const i of economicCatalogue){
   await db.query(`INSERT INTO items(id,name,category,slot,rarity,set_id,subject_id,source,coin_price,premium_price,real_money_product_id,purchasable_with_real_money,coin_purchasable,drop_eligible,available_in_modes,season_id,animated,headline,art_brief,upgradeable)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT(id) DO UPDATE SET premium_price=excluded.premium_price,real_money_product_id=excluded.real_money_product_id,purchasable_with_real_money=excluded.purchasable_with_real_money`,[i.id,i.name,i.category,i.slot,i.rarity,i.set_id,i.subject_tag,i.source,i.coin_price,i.premium_price??null,i.real_money_product_id??null,i.purchasable_with_real_money??false,i.purchasable_with_coins,i.drop_eligible,i.available_in_modes,i.season_id??null,i.animation_flag,i.headline,i.art_brief,i.upgradeable]);
   if(i.coin_price)await db.query("INSERT INTO shop_catalogue(id,item_id,coin_price,metadata,version) VALUES($1,$2,$3,'{}',1) ON CONFLICT DO NOTHING",['shop_'+i.id,i.id,i.coin_price]);
   if(i.unlock){await db.query('INSERT INTO unlock_conditions(id,condition_ast,metric_version,description) VALUES($1,$2,1,$3) ON CONFLICT DO NOTHING',['unlock_'+i.id,i.unlock,JSON.stringify(i.unlock)]);await db.query('INSERT INTO item_unlocks VALUES($1,$2) ON CONFLICT DO NOTHING',[i.id,'unlock_'+i.id]);}
   const visual=presentationById.get(i.id);
   await db.query(`INSERT INTO item_presentations(item_id,presentation_version,display_name,visual_category,display_slot,exclusion_group,metadata)
    VALUES($1,2,$2,$3,$4,$5,$6) ON CONFLICT(item_id) DO UPDATE SET display_name=excluded.display_name,visual_category=excluded.visual_category,display_slot=excluded.display_slot,exclusion_group=excluded.exclusion_group,metadata=excluded.metadata`,[i.id,visual.name,visual.category,visual.slot,exclusionFor(visual),visual.presentation]);
  }
  for(const a of achievements){
   await db.query('INSERT INTO unlock_conditions(id,condition_ast,metric_version,description) VALUES($1,$2,1,$3) ON CONFLICT DO NOTHING',['condition_'+a.id,a.condition,a.description]);
   await db.query('INSERT INTO achievements(id,name,category,subject_id,condition_id,hidden,prestige_points,reward) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',[a.id,a.name,a.category,a.subject??'general','condition_'+a.id,a.hidden,a.reward.prestige_points||10,a.reward]);
  }
  // Replace the curve as one transaction. Row-by-row updates can temporarily
  // collide with the unique total_xp value held by another existing level.
  await db.query('DELETE FROM xp_levels');
  for(const l of levels)await db.query('INSERT INTO xp_levels(level,total_xp,rank,title,reward) VALUES($1,$2,$3,$4,$5)',[l.level,l.total_xp,l.rank,l.title,l]);
  for(const b of boxes){
   await db.query('INSERT INTO drop_boxes(id,name,coin_min,coin_max,animation_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET coin_min=excluded.coin_min,coin_max=excluded.coin_max',[b.id,b.id.replaceAll('_',' '),...b.coin_range,'gentle_reveal']);
   const lid=(await db.query("INSERT INTO loot_tables(box_id,version,active_from,config_version) VALUES($1,1,'2026-10-19',$2) ON CONFLICT(box_id,version) DO UPDATE SET config_version=excluded.config_version RETURNING id",[b.id,configId])).rows[0].id;
   for(const [r,w] of Object.entries(b.rarity_probabilities_percent))await db.query('INSERT INTO loot_rarity_weights VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[lid,r,Math.round(w*100)]);
   for(const id of b.active_pool)await db.query('INSERT INTO loot_pool_items(loot_table_id,item_id,weight) VALUES($1,$2,1) ON CONFLICT DO NOTHING',[lid,id]);
  }
  await db.query('COMMIT');
  console.log(`Game catalogue ready: ${economicCatalogue.length} items, ${sets.length} sets, ${achievements.length} achievements.`);
 }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
}



