// Stable IDs preserve earned badges and the cosmetics already linked to them.
// Targets use server-owned activity; no subject or qualification is required.
export function achievementCatalogue(legacy) {
  const definitions = [
    ['Arcade newcomer','minigames','minigame_runs',5,'Play 5 minigame runs. A run counts after your first answer.'],
    ['Arcade regular','minigames','minigame_runs',25,'Play 25 minigame runs.'],
    ['Arcade veteran','minigames','minigame_runs',100,'Play 100 minigame runs.'],
    ['Arcade legend','minigames','minigame_runs',500,'Play 500 minigame runs.'],
    ['Quick recall','minigames','minigame_correct_rewards',25,'Earn 25 correct-answer Minigame XP rewards. Up to 12 count each day.'],
    ['Sharp thinker','minigames','minigame_correct_rewards',100,'Earn 100 correct-answer Minigame XP rewards.'],
    ['Arcade expert','minigames','minigame_correct_rewards',500,'Earn 500 correct-answer Minigame XP rewards.'],
    ['Arcade champion','minigames','minigame_correct_rewards',2000,'Earn 2,000 correct-answer Minigame XP rewards.'],
    ['Make it yours','avatar','avatar_customised',1,'Save your avatar appearance for the first time.'],
    ['Outfit assembled','avatar','equipped_slots',3,'Equip cosmetics in 3 different slots at the same time.'],
    ['Signature look','avatar','equipped_slots',6,'Equip cosmetics in 6 different slots at the same time.'],
    ['Wardrobe curator','avatar','saved_outfits',3,'Save 3 different outfits.'],
    ['One week together','sign_in','best_sign_in_streak',7,'Open Memmara on 7 consecutive days. Staying signed in counts.'],
    ['A month together','sign_in','best_sign_in_streak',30,'Open Memmara on 30 consecutive days.'],
    ['Hundred-day hello','sign_in','best_sign_in_streak',100,'Open Memmara on 100 consecutive days.'],
    ['Always returning','sign_in','best_sign_in_streak',180,'Open Memmara on 180 consecutive days.'],
    ['Familiar face','sign_in','sign_in_days',30,'Open Memmara on 30 different days. They do not need to be consecutive.'],
    ['Part of the routine','sign_in','sign_in_days',100,'Open Memmara on 100 different days.'],
    ['Familiar favourite','sign_in','sign_in_days',250,'Open Memmara on 250 different days.'],
    ['Five hundred hellos','sign_in','sign_in_days',500,'Open Memmara on 500 different days.'],
    ['Seasoned scholar','long_term','unique_daily_mix_dates',90,'Complete Daily Mix on 90 different days.'],
    ['Half-year learner','long_term','unique_daily_mix_dates',180,'Complete Daily Mix on 180 different days.'],
    ['Year-round learner','long_term','unique_daily_mix_dates',365,'Complete Daily Mix on 365 different days.'],
    ['Five hundred small steps','long_term','unique_daily_mix_dates',500,'Complete Daily Mix on 500 different days.'],
    ['A month of practice','streaks','best_practice_streak',30,'Complete daily practice on 30 consecutive days.'],
    ['Season of study','streaks','best_practice_streak',90,'Complete daily practice on 90 consecutive days.'],
    ['Unshakable rhythm','streaks','best_practice_streak',180,'Complete daily practice on 180 consecutive days.'],
    ['Year-long rhythm','streaks','best_practice_streak',365,'Complete daily practice on 365 consecutive days.'],
  ];
  const overrides = new Map(definitions.map((entry,i)=>['ach_'+String(i+1).padStart(2,'0'),entry]));
  overrides.set('ach_32',['Turning it around','learning','distinct_recovered_points',20,'Correct 20 previously missed concepts after a delay of at least 24 hours.']);
  overrides.set('ach_41',['Arcade explorer','minigames','minigame_days',10,'Play minigames on 10 different days.']);
  overrides.set('ach_42',['Arcade habit','minigames','minigame_days',50,'Play minigames on 50 different days.']);
  overrides.set('ach_43',['A year in the arcade','minigames','minigame_days',200,'Play minigames on 200 different days.']);
  overrides.set('ach_alevel_biology',['Three-day hello','sign_in','best_sign_in_streak',3,'Open Memmara on 3 consecutive days.']);
  overrides.set('ach_alevel_chemistry',['Fortnight of hellos','sign_in','best_sign_in_streak',14,'Open Memmara on 14 consecutive days.']);
  overrides.set('ach_alevel_physics',['Sixty-day companion','sign_in','best_sign_in_streak',60,'Open Memmara on 60 consecutive days.']);
  overrides.set('ach_alevel_maths',['Year-long companion','sign_in','best_sign_in_streak',365,'Open Memmara on 365 consecutive days.']);
  overrides.set('ach_long_365',['Five hundred sessions','long_term','qualifying_sessions',500,'Complete 500 verified practice sessions.']);
  for(const [id,target,name] of [['ach_38',5,'Mix Starter'],['ach_39',20,'Mix Regular'],['ach_40',60,'Mix Veteran']])
    overrides.set(id,[name,'daily_mix','unique_daily_mix_dates',target,`Complete Daily Mix on ${target} different days.`]);
  return legacy.map(a=>{
    const replacement=overrides.get(a.id);
    const [name,category,metric,target,description]=replacement??[a.name,a.category,a.condition.metric,a.condition.target,a.description];
    return {...a,name,category,description,subject:null,requires_supported_subject:false,
      filters:undefined,icon_brief:category+' milestone emblem',
      condition:{metric,operator:'gte',target,filters:{trusted_server_events:true}},
      progress_metric:metric,reward:{...a.reward,shards:null,
        coins:category==='sign_in'?Math.min(a.reward.coins,target<=7?5:target<=30?10:target<=100?20:target<=250?40:80):a.reward.coins}};
  });
}

export function bestDailyStreak(dates) {
  const ordered=[...new Set(dates)].sort();
  let best=0,current=0,previous=null;
  for(const date of ordered){
    const timestamp=Date.parse(date+'T12:00:00Z');
    current=previous!==null&&timestamp-previous===86400000?current+1:1;
    best=Math.max(best,current);previous=timestamp;
  }
  return best;
}
