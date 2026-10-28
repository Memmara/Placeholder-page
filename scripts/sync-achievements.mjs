// Updates catalogue metadata without resetting accounts, rewards or balances.
import '../server/env.mjs';
import {pool,achievements} from '../server/catalogue.mjs';
let db;
try {
  db=await pool.connect();
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('memmara-game-catalogue-v1'))");
  for(const a of achievements){
    await db.query(`INSERT INTO unlock_conditions(id,condition_ast,metric_version,description)
      VALUES($1,$2,1,$3) ON CONFLICT(id) DO UPDATE SET condition_ast=excluded.condition_ast,description=excluded.description`,
      ['condition_'+a.id,a.condition,a.description]);
    await db.query(`INSERT INTO achievements(id,name,category,subject_id,condition_id,hidden,prestige_points,reward)
      VALUES($1,$2,$3,'general',$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,
      category=excluded.category,subject_id=excluded.subject_id,condition_id=excluded.condition_id,
      hidden=excluded.hidden,prestige_points=excluded.prestige_points,reward=excluded.reward`,
      [a.id,a.name,a.category,'condition_'+a.id,a.hidden,a.reward.prestige_points??10,a.reward]);
  }
  await db.query('COMMIT');
  console.log(`Updated ${achievements.length} universal achievements. Existing earned rewards preserved.`);
} catch(error) {
  if(db) await db.query('ROLLBACK');
  console.error('Achievement sync failed:',error.code??error.name);
  process.exitCode=1;
} finally {db?.release();await pool.end();}
