import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual collection loader without touching a real account.
const source=fs.readFileSync(new URL('../server/game.mjs',import.meta.url),'utf8');
const loader=source.slice(source.indexOf('async function state(user)'),source.indexOf('async function updateAchievements('));
async function check(failRead=false){
  let connections=0,released=0,queries=[];
  const db={release(){released++;},async query(sql){
    queries.push(sql);
    if(failRead&&sql.includes('SELECT gender_identity'))throw Error('simulated read failure');
    if(sql.includes('history_version'))return {rows:[{history_version:2}]};
    if(sql.includes('count(*)'))return {rows:[{count:0,sessions:0}]};
    return {rows:[]};
  }};
  const context={
    pool:{async connect(){connections++;return db;},query(){throw Error('loader opened a separate connection');}},
    migrateLoadout:async()=>{},claim:async()=>null,date:()=> '2026-10-28',
    refreshMonetisation:async()=>({account_plan:'free',practice_tokens:0,purchased_tokens:0,tokenConfig:{capacity:1,hours:5,unlimited:false}}),
    serialAll:async tasks=>{const rows=[];for(const task of tasks)rows.push(await task());return rows;},
    config:{economy:{base_daily_mix_coins:10}},boxes:[],byId:new Map(),storedDate:v=>String(v??''),
    catalogue:[],sets:[],achievements:[],levels:[],categories:[],worlds:[],commerceConfigured:()=>false,
    updateAchievements:()=>{throw Error('achievements blocked collection loading');},
  };
  const state=vm.runInNewContext('('+loader+')',context);
  if(failRead)await assert.rejects(()=>state('test-user'),/simulated read failure/);
  else {const result=await state('test-user');assert.equal(result.userId,'test-user');assert.equal(result.monetisation.tokens,0);}
  assert.equal(connections,1);
  assert.equal(released,1);
  assert(queries.includes(failRead?'ROLLBACK':'COMMIT'));
}
await check();
await check(true);
console.log('PASS: collection uses one request-scoped connection, never waits for achievements, returns zero token balance, and releases its connection on success and failure.');
