import type { Attempt, Bank, CurriculumPoint, MasteryEvidence, Progress, Question, Session, Settings } from './models';
import {automaticPointIds} from './studyPlan.ts';
import {contentPointEligible} from './courseContent.ts';
export const DAY=86400000;
export const SPEED_SECONDS=25;
export const day=(at=Date.now())=>new Date(at).toLocaleDateString('en-CA');
export const blank=():Progress=>({version:1,settings:null,attempts:[],reviews:{},session:null,pausedSessions:[],xp:[],reports:[],completedDays:[],lastVisit:null,usefulness:[]});
export const defaultSettings:Settings={qualification:'GCSE',board:'AQA',subjects:['GCSE-PHYSICS'],tier:'higher',yearGroup:10,studyMode:'manual',studied:['AQA8463-T01','AQA8463-T02'],goal:3,allowNew:false,theme:'dark',examDate:'',reminder:false,reminderTime:'18:00'};
export const tierFor=(s:Settings,subjectId:string)=>s.subjectTiers?.[subjectId]??s.tier;
const validTextPattern=(value:unknown):boolean=>typeof value==='string'||!!value&&typeof value==='object'&&Array.isArray((value as {all_of?:unknown}).all_of)&&(value as {all_of:unknown[]}).all_of.every(group=>Array.isArray(group)&&group.length>0&&group.every(phrase=>typeof phrase==='string'));
export function validateBank(raw:unknown,rawCurriculum:unknown):Bank{
 if(!Array.isArray(raw)||!raw.length)throw new Error('The question bank is empty.');
 const points=(rawCurriculum as {records:CurriculumPoint[]})?.records;
 if(!Array.isArray(points)||!points.length)throw new Error('Curriculum labels are missing.');
 const refs=new Set(points.map(p=>`${p.subject_id}:${p.spec_reference}`)),pointIds=new Set(points.map(p=>p.specification_point_id)),ids=new Set<string>();
 const strings=['question_id','specification_point_id','question','answer','mark_scheme','model_answer'];
 const questionTypes=['short_answer','calculation','explanation','misconception_check','practical_retrieval','analysis','multiple_choice','proof','extended_response'];
 for(const q of raw){
  if(!q||strings.some(k=>typeof q[k]!=='string'||!q[k].trim())||!['foundation_higher_easy','foundation_higher_standard','higher_only_easy','higher_only_standard'].includes(q.difficulty)||!['AO1','AO2','AO3','AO4','AO5','AO6'].includes(q.ao_level)||!questionTypes.includes(q.question_type)||!Array.isArray(q.common_misconceptions)||q.common_misconceptions.some((x:unknown)=>typeof x!=='string'))throw new Error('A question failed the import contract.');
  const subjectId=subjectForQuestionId(q.question_id);
  if(ids.has(q.question_id)||!subjectId||(!refs.has(`${subjectId}:${q.specification_point_id}`)&&!pointIds.has(q.specification_point_id)))throw new Error('A question has a duplicate ID or missing curriculum mapping.');
  if(q.question_type==='multiple_choice'){
   const options=q.options,keys=q.answer_key?.correct_option_ids;
   if(q.response_format!=='single_select'||!Array.isArray(options)||options.length<2||options.some((o:{option_id:string;text:string})=>!o||typeof o.option_id!=='string'||!o.option_id.trim()||typeof o.text!=='string'||!o.text.trim())||new Set(options.map((o:{option_id:string})=>o.option_id)).size!==options.length||!Array.isArray(keys)||keys.length!==1||!options.some((o:{option_id:string})=>o.option_id===keys[0]))throw new Error('Invalid multiple-choice options or answer key: '+q.question_id);
  }
  ids.add(q.question_id);
  const sc=q.self_check;
  if(!sc||![1,2,3,4].includes(sc.version)||sc.answer_reveal_policy!=='after_attempt'||typeof sc.total_marks!=='number'||!Number.isFinite(sc.total_marks)||typeof sc.instructions!=='string'||!Array.isArray(sc.criteria)||!sc.criteria.length||!Array.isArray(sc.misconception_feedback))throw new Error(`Question ${q.question_id} has invalid self-check data.`);
  if(sc.version===2){const p=sc.auto_check_policy,legacy=p?.version===1&&Array.isArray(p.outcomes)&&['correct','incorrect','needs_review'].every((x:string)=>p.outcomes.includes(x))&&p.unknown_answers==='needs_review'&&typeof p.self_assessment_is_independent_marking==='boolean'&&typeof p.keywords_are_not_sufficient_in_contradictory_prose==='boolean',modern=typeof p?.unknown_is_not_incorrect==='boolean'&&typeof p.keywords_alone_do_not_override_contradictions==='boolean'&&typeof p.hedged_answers_are_credited==='boolean'&&typeof p.negation_and_competing_answers_need_review==='boolean';if(!legacy&&!modern)throw new Error(`Question ${q.question_id} has an invalid auto-check policy.`);}
  const criterionIds=new Set<string>();let total=0;
  for(const c of sc.criteria){
   if(!c||typeof c.criterion_id!=='string'||!c.criterion_id||criterionIds.has(c.criterion_id)||typeof c.marks!=='number'||!Number.isFinite(c.marks)||c.marks<=0||typeof c.description!=='string'||!c.description.trim()||!Array.isArray(c.examples)||c.examples.some((x:unknown)=>typeof x!=='string')||typeof c.examples_are_exhaustive!=='boolean'||typeof c.feedback_if_missed!=='string')throw new Error(`Question ${q.question_id} has an invalid or duplicate self-check criterion.`);
   if(c.text_rule){const t=c.text_rule,legacy=t.mode==='conservative_whole_phrase',bounded=t.mode==='bounded_phrase_with_licensed_context',concept=t.mode==='concept_groups_with_alternates';if((!legacy&&!bounded&&!concept)||!Array.isArray(t.accepted_answers)||t.accepted_answers.some((x:unknown)=>typeof x!=='string')||!Array.isArray(t.rejected_answers)||t.rejected_answers.some((x:unknown)=>typeof x!=='string')||typeof t.case_sensitive!=='boolean'||typeof t.whole_word_boundaries!=='boolean'||typeof t.unknown_answer_policy!=='string'||(legacy&&(!Array.isArray(t.keywords)||typeof t.allow_fuzzy_matching!=='boolean'||typeof t.negation_policy!=='string'||typeof t.multiple_answer_policy!=='string'||!Array.isArray(t.normalisation)))||(bounded&&(t.version!==2||!Array.isArray(t.allowed_context_tokens)||!Array.isArray(t.blocking_patterns)||!Array.isArray(t.approved_misspellings)||t.allow_unrestricted_fuzzy_matching!==false||!Number.isFinite(t.maximum_auto_match_tokens)))||(concept&&(t.version!==3||!Array.isArray(t.concept_groups)||!t.concept_groups.length||t.concept_groups.some((g:{group_id:string;alternates:unknown[]})=>!g||typeof g.group_id!=='string'||!Array.isArray(g.alternates)||!g.alternates.length||g.alternates.some(x=>!validTextPattern(x)))||!Number.isFinite(t.min_groups_required))))throw new Error(`Question ${q.question_id} has an invalid text rule.`);}
   if(c.numeric_rule){const n=c.numeric_rule;if(!Number.isFinite(n.expected_value)||!Array.isArray(n.accepted_units)||n.accepted_units.some((u:unknown)=>typeof u!=='string')||(n.absolute_tolerance!==undefined&&(!Number.isFinite(n.absolute_tolerance)||n.absolute_tolerance<0))||(n.relative_tolerance!==undefined&&(!Number.isFinite(n.relative_tolerance)||n.relative_tolerance<0))||(n.comparison!==undefined&&!['equal','greater_than'].includes(n.comparison))||(n.require_unit!==undefined&&typeof n.require_unit!=='boolean')||(n.unit_conversions!==undefined&&(!Array.isArray(n.unit_conversions)||n.unit_conversions.some((x:{unit:string;multiplier_to_expected_unit:number})=>!x||typeof x.unit!=='string'||!Number.isFinite(x.multiplier_to_expected_unit)||x.multiplier_to_expected_unit<=0)))||(n.expected_unit!==undefined&&typeof n.expected_unit!=='string')||(n.number_formats!==undefined&&(!Array.isArray(n.number_formats)||n.number_formats.some((x:unknown)=>!['decimal','signed_decimal','scientific_notation','times_ten_notation','thousands_separators','fraction','ratio','number_words','percent_words','trailing_zeros'].includes(String(x)))))||(n.accepted_equivalent_phrases!==undefined&&(!Array.isArray(n.accepted_equivalent_phrases)||n.accepted_equivalent_phrases.some((x:{phrase:string;value:number;unit:string})=>!x||typeof x.phrase!=='string'||!Number.isFinite(x.value)||typeof x.unit!=='string')))||(n.missing_unit_policy!==undefined&&n.missing_unit_policy!=='needs_review')||(n.unknown_format_policy!==undefined&&n.unknown_format_policy!=='needs_review'))throw new Error(`Question ${q.question_id} has an invalid numeric rule.`);}
   if(c.symbolic_rule){const r=c.symbolic_rule;if(typeof r.left_hand_side!=='string'||typeof r.right_hand_side!=='string'||!r.symbol_aliases||typeof r.symbol_aliases!=='object')throw new Error(`Question ${q.question_id} has an invalid symbolic rule.`);}
   if(c.accepted_input_examples&&(!Array.isArray(c.accepted_input_examples)||c.accepted_input_examples.some((x:unknown)=>typeof x!=='string')))throw new Error(`Question ${q.question_id} has invalid input examples.`);
   criterionIds.add(c.criterion_id);total+=c.marks;
  }
  if(sc.version>=3&&(!Array.isArray(sc.whole_response_rules)||sc.whole_response_rules.some((r:{answer:string;criterion_ids:string[]})=>!r||typeof r.answer!=='string'||!Array.isArray(r.criterion_ids)||r.criterion_ids.some(id=>!criterionIds.has(id)))||!Array.isArray(sc.accepted_response_examples)||!Array.isArray(sc.noncredit_response_examples)))throw new Error(`Question ${q.question_id} has invalid authored response checks.`);
  if(Math.abs(total-sc.total_marks)>1e-6)throw new Error(`Question ${q.question_id} self-check criteria do not add up to the total.`);
 }
 return {questions:raw,points};
}export const subjectForQuestionId=(id:string)=>id.startsWith('AQA7037-ALGEO-')?'A-LEVEL-GEOGRAPHY':id.startsWith('AQA7042-ALHIST-')?'A-LEVEL-HISTORY':id.startsWith('AQA7132-ALBUS-')?'A-LEVEL-BUSINESS':id.startsWith('AQA7136-ALECON-')?'A-LEVEL-ECONOMICS':id.startsWith('AQA7152-ALPOL-')?'A-LEVEL-POLITICS':id.startsWith('AQA7182-')?'A-LEVEL-PSYCHOLOGY':id.startsWith('AQA7192-ALSOC-')?'A-LEVEL-SOCIOLOGY':id.startsWith('AQA7357-')?'A-LEVEL-MATHEMATICS':id.startsWith('AQA7367-')?'A-LEVEL-FURTHER-MATHS':id.startsWith('AQA7402-')?'A-LEVEL-BIOLOGY':id.startsWith('AQA7405-')?'A-LEVEL-CHEMISTRY':id.startsWith('AQA7408-')?'A-LEVEL-PHYSICS':id.startsWith('AQA7712-ALELIT-')?'A-LEVEL-ENGLISH-LITERATURE':id.startsWith('AQA8461-')?'GCSE-BIOLOGY':id.startsWith('AQA8462-')?'GCSE-CHEMISTRY':id.startsWith('AQA8463-')?'GCSE-PHYSICS':id.startsWith('AQA8300-')?'GCSE-MATHS':id.startsWith('AQA8035-')?'GCSE-GEOGRAPHY':id.startsWith('AQA8145-')?'GCSE-HISTORY':id.startsWith('AQA8700-')?'GCSE-ENGLISH-LANGUAGE':id.startsWith('AQA8702-')?'GCSE-ENGLISH-LITERATURE':id.startsWith('AQA8062-')?'GCSE-RELIGIOUS-STUDIES':id.startsWith('AQA8201-')?'GCSE-ART-DESIGN':id.startsWith('AQA8132-')?'GCSE-BUSINESS':id.startsWith('AQA8525-')?'GCSE-COMPUTER-SCIENCE':id.startsWith('AQA8552-')?'GCSE-DESIGN-TECHNOLOGY':id.startsWith('AQA8582-')?'GCSE-PHYSICAL-EDUCATION':null;
export const pointFor=(b:Bank,q:Question)=>{const byId=b.points.find(p=>p.specification_point_id===q.specification_point_id);if(byId)return byId;return b.points.find(p=>p.subject_id===subjectForQuestionId(q.question_id)&&p.spec_reference===q.specification_point_id)!;};
export const pointEligible=(p:CurriculumPoint,s:Settings)=>(p.subject_id!=='GCSE-GEOGRAPHY'||!p.geographyOption||(s.geographyOptions??[]).includes(p.geographyOption))&&(p.subject_id!=='GCSE-HISTORY'||!p.historyOption||(s.historyOptions??[]).includes(p.historyOption))&&contentPointEligible(p,s);
export function suitable(b:Bank,s:Settings,topic?:string){const auto=s.studyMode==='automatic'&&!topic?automaticPointIds(b,s):null;return b.questions.filter(q=>{const p=pointFor(b,q),covered=!!topic||(auto?auto.has(p.specification_point_id):s.studied.includes(p.topic_id)||s.allowNew);return s.subjects.includes(p.subject_id)&&pointEligible(p,s)&&(tierFor(s,p.subject_id)==='higher'||(!q.difficulty.startsWith('higher_only')&&p.tier!=='higher'))&&(!topic||p.topic_id===topic)&&covered;});}
export const PRACTICE_TITLES=[{name:'Beginner',description:'Every learning journey starts somewhere.'},{name:'Novice',description:'You’re building a practice habit.'},{name:'Explorer',description:'You’re finding your way around new ideas.'},{name:'Scholar',description:'You’re returning to help ideas stick.'},{name:'Expert',description:'Your practice rhythm is growing.'},{name:'Mentor',description:'You’re showing real consistency.'},{name:'Professor',description:'A remarkable run of practice.'}] as const;
export function levelDetails(value:number){const level=Math.max(1,Math.floor(value)),n=level-1,band=Math.floor(n/5),title=PRACTICE_TITLES[Math.min(band,PRACTICE_TITLES.length-1)];return {level,threshold:25*n*n+75*n,name:band<7?title.name:'Professor '+(band-5),description:title.description,titleStart:band*5+1,titleEnd:band*5+5};}
export function practiceLevel(value:number){const xp=Number.isFinite(value)?Math.max(0,value):0;let level=Math.floor((Math.sqrt(5625+100*xp)-75)/50)+1;while(level>1&&levelDetails(level).threshold>xp)level--;while(levelDetails(level+1).threshold<=xp)level++;return {...levelDetails(level),next:levelDetails(level+1)};}
export function evidence(p:Progress,pointId:string,now=Date.now()):MasteryEvidence{const a=p.attempts.filter(a=>a.pointId===pointId);const successes=new Set(a.filter(a=>a.delayed&&!a.hintUsed&&!a.answerRevealed&&!a.retry&&a.result.outcome==='correct').map(a=>day(a.at))).size;return {pointId,state:!a.length?'Not started':successes>=3?'Secure':'Building',delayedIndependentSuccesses:successes,reviewDue:!!p.reviews[pointId]&&p.reviews[pointId].dueAt<=now,attempts:a.length};}
export function shuffled<T>(items:T[]):T[]{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function createSession(b:Bank,p:Progress,topic?:string,speed=false):Session|null{
 const s=p.settings??defaultSettings,now=Date.now(),count=speed?10:s.goal===3?5:s.goal===6?8:12;
 // Daily and speed pools include every supplied subject, respecting the selected tier.
 const auto=s.studyMode==='automatic'?automaticPointIds(b,s,now):null;
 const pool=topic?suitable(b,s,topic):b.questions.filter(q=>{const pt=pointFor(b,q);return s.subjects.includes(pt.subject_id)&&pointEligible(pt,s)&&(tierFor(s,pt.subject_id)==='higher'||(!q.difficulty.startsWith('higher_only')&&pt.tier!=='higher'))&&(!auto||auto.has(pt.specification_point_id))&&(!speed||q.question_type==='multiple_choice');});
 if(speed&&pool.length<5)return null;
 const reasons:Record<string,string>={},picked:Question[]=[],latest=new Map<string,Attempt>();
 for(const a of p.attempts){if(!latest.has(a.pointId)||a.at>=latest.get(a.pointId)!.at)latest.set(a.pointId,a);}
 const weak=shuffled([...new Set(pool.map(q=>pointFor(b,q).specification_point_id))].filter(id=>['incorrect','partial','unsure'].includes(latest.get(id)?.result.outcome??'')&&(p.reviews[id]?.dueAt??0)<=now)).slice(0,2);
 if(!topic&&!speed)for(const id of weak){const candidates=shuffled(pool.filter(q=>pointFor(b,q).specification_point_id===id));const q=candidates.find(q=>q.question_id!==latest.get(id)?.questionId)??candidates[0];if(q){picked.push(q);reasons[q.question_id]='A fresh question on a specification point you previously found difficult.';}}
 const attemptCounts=new Map<string,number>(),questionCounts=new Map<string,number>();
 for(const a of p.attempts){attemptCounts.set(a.pointId,(attemptCounts.get(a.pointId)??0)+1);questionCounts.set(a.questionId,(questionCounts.get(a.questionId)??0)+1);}
 const questionsById=new Map(b.questions.map(question=>[question.question_id,question]));
 const formatsBySubject=new Map<string,{written:number;multipleChoice:number}>();
 for(const attempt of p.attempts){const question=questionsById.get(attempt.questionId);if(!question)continue;const subject=pointFor(b,question).subject_id,counts=formatsBySubject.get(subject)??{written:0,multipleChoice:0};if(question.question_type==='multiple_choice')counts.multipleChoice++;else counts.written++;formatsBySubject.set(subject,counts);}
 // Random tie breaking, then favour specification points and questions seen least often.
 const rest=shuffled(pool.filter(q=>!picked.some(x=>x.question_id===q.question_id))).sort((left,right)=>{
  const ap=pointFor(b,left).specification_point_id,bp=pointFor(b,right).specification_point_id;
  return (attemptCounts.get(ap)??0)-(attemptCounts.get(bp)??0)||(questionCounts.get(left.question_id)??0)-(questionCounts.get(right.question_id)??0);
 });
 // Include each available subject before filling remaining slots randomly.
 if(!topic&&!speed)for(const subject of shuffled([...new Set(pool.map(q=>pointFor(b,q).subject_id))])){if(picked.length>=count)break;if(picked.some(q=>pointFor(b,q).subject_id===subject))continue;const formatCounts=formatsBySubject.get(subject)??{written:0,multipleChoice:0},preferWritten=formatCounts.written<=formatCounts.multipleChoice;let index=rest.findIndex(q=>pointFor(b,q).subject_id===subject&&(q.question_type!=='multiple_choice')===preferWritten);if(index<0)index=rest.findIndex(q=>pointFor(b,q).subject_id===subject);if(index>=0)picked.push(rest.splice(index,1)[0]);}
 while(picked.length<count&&rest.length){const used=new Set(picked.map(q=>pointFor(b,q).specification_point_id));let index=rest.findIndex(q=>!used.has(pointFor(b,q).specification_point_id));if(index<0)index=0;picked.push(rest.splice(index,1)[0]);}
 // Where a subject supplies both formats, keep Daily Mix close to a 50/50
 // written/MCQ balance. Replace only within the same subject so coverage and
 // due weak-point questions remain intact.
 if(!topic&&!speed){
  const balance=(written:boolean,target:number)=>{
   const matches=(q:Question)=>(q.question_type!=='multiple_choice')===written;
   while(picked.filter(matches).length<target){
    const slot=picked.findIndex(chosen=>!matches(chosen)&&!weak.includes(pointFor(b,chosen).specification_point_id)&&rest.some(candidate=>matches(candidate)&&pointFor(b,candidate).subject_id===pointFor(b,chosen).subject_id&&!picked.some(existing=>pointFor(b,existing).specification_point_id===pointFor(b,candidate).specification_point_id)));
    if(slot<0)break;
    const replacement=rest.findIndex(candidate=>matches(candidate)&&pointFor(b,candidate).subject_id===pointFor(b,picked[slot]).subject_id&&!picked.some(existing=>pointFor(b,existing).specification_point_id===pointFor(b,candidate).specification_point_id));
    if(replacement<0)break;
    const [nextQuestion]=rest.splice(replacement,1),previous=picked[slot];
    picked[slot]=nextQuestion;
    rest.push(previous);
   }
  };
  balance(true,Math.ceil(picked.length/2));
  balance(false,Math.floor(picked.length/2));
 }
 if(!picked.length)return null;
 for(const q of picked)reasons[q.question_id]??=speed?`Choose one answer within ${SPEED_SECONDS} seconds.`:topic?'Practice from your chosen topic.':'Random practice from across your subjects.';
 return {id:crypto.randomUUID(),mode:speed?'speed':topic?'topic':'daily',plan:s,questionIds:shuffled(picked).map(q=>q.question_id),index:0,phase:'ready',draft:'',hintUsed:false,createdAt:now,isDaily:!topic&&!speed,reasons,revisitIds:[]};
}
export function createReviewSession(b:Bank,p:Progress):Session|null{
 const settings=p.settings??defaultSettings,eligible=suitable(b,settings),weak=new Set(p.attempts.filter(a=>['incorrect','partial','unsure'].includes(a.result.outcome)).map(a=>a.pointId));
 const latest=new Map<string,Attempt>();for(const a of p.attempts)if(!latest.has(a.pointId)||latest.get(a.pointId)!.at<a.at)latest.set(a.pointId,a);
 const points=shuffled([...weak].filter(id=>eligible.some(q=>pointFor(b,q).specification_point_id===id))).sort((a,c)=>(p.reviews[a]?.dueAt??Infinity)-(p.reviews[c]?.dueAt??Infinity)).slice(0,5);
 const questions=points.map(id=>{const options=shuffled(eligible.filter(q=>pointFor(b,q).specification_point_id===id));return options.find(q=>q.question_id!==latest.get(id)?.questionId)??options[0];}).filter((q):q is Question=>!!q);
 if(!questions.length)return null;
 return {id:crypto.randomUUID(),mode:'review',plan:settings,questionIds:questions.map(q=>q.question_id),index:0,phase:'ready',draft:'',hintUsed:false,createdAt:Date.now(),isDaily:false,reasons:Object.fromEntries(questions.map(q=>[q.question_id,'A different question on something you previously found difficult.'])),revisitIds:[]};
}
export function record(p:Progress,b:Bank,a:Attempt):Progress{
 if(p.attempts.some(x=>x.id===a.id))return p;
 const next:Progress={...p,attempts:[...p.attempts,a],reviews:{...p.reviews},xp:[...p.xp],session:p.session?{...p.session,reasons:{...p.session.reasons},revisitIds:[...p.session.revisitIds],questionIds:[...p.session.questionIds]}:null};
 const prev=next.reviews[a.pointId];const success=a.result.outcome==='correct'&&!a.hintUsed&&!a.answerRevealed&&!a.retry;
 const days=[...new Set([...(prev?.successfulDays??[]),...(success?[day(a.at)]:[])])];
 if(a.result.outcome!=='review')next.reviews[a.pointId]={pointId:a.pointId,lastAt:a.at,successfulDays:days,dueAt:a.at+DAY*(success?(a.delayed?Math.min(14,days.length*3):1):1)};
 if(p.session?.mode!=='review'&&!p.attempts.some(x=>x.questionId===a.questionId&&day(x.at)===day(a.at))){
  const adMultiplier=p.session?.xpMultiplier??1;
  next.xp.push({id:'attempt:'+a.id,sessionId:a.sessionId,amount:5*adMultiplier,at:a.at,kind:'attempt'});
  const performance=!a.hintUsed&&!a.answerRevealed&&!a.retry?(a.result.outcome==='correct'?5:a.result.outcome==='partial'?2:0):0;
  if(performance)next.xp.push({id:'performance:'+a.id,sessionId:a.sessionId,amount:performance*adMultiplier,at:a.at,kind:'performance'});
  const base=5+performance,boost=streakBoost(p.completedDays,a.at),bonus=bonusXp(base,p.completedDays,a.at);
  if(bonus)next.xp.push({id:'streak:'+a.id,sessionId:a.sessionId,amount:bonus*adMultiplier,at:a.at,kind:'streak',baseAmount:base,multiplier:boost.multiplier});
 }

 const session=next.session;
 // Replace a later slot, preserving predictable session length. Never reuse an identical question.
 if(session&&!session.isDaily&&session.mode!=='speed'&&['incorrect','partial','unsure'].includes(a.result.outcome)&&!session.revisitIds.includes(a.pointId)&&session.index+2<session.questionIds.length){const alt=suitable(b,p.settings!).find(q=>pointFor(b,q).specification_point_id===a.pointId&&!session.questionIds.includes(q.question_id));if(alt){const index=Math.min(session.index+3,session.questionIds.length-1);session.questionIds[index]=alt.question_id;session.reasons[alt.question_id]='A different question to revisit that idea.';session.revisitIds.push(a.pointId);}}
 return next;
}
export function finish(p:Progress):Progress{if(!p.session||p.session.completedAt)return p;const now=Date.now(),session={...p.session,phase:'complete' as const,completedAt:now},grant=session.isDaily&&!p.completedDays.includes(day(now)),adMultiplier=session.xpMultiplier??1;const completedDays=session.isDaily?[...new Set([...p.completedDays,day(now)])]:p.completedDays;const xp=[...p.xp];if(grant){xp.push({id:'complete:'+day(now),sessionId:session.id,amount:10*adMultiplier,at:now,kind:'completion'});const boost=streakBoost(completedDays,now),bonus=bonusXp(10,completedDays,now);if(bonus)xp.push({id:'streak-complete:'+session.id,sessionId:session.id,amount:bonus*adMultiplier,at:now,kind:'streak',baseAmount:10,multiplier:boost.multiplier});}return {...p,session,completedDays,xp};}

export function xpBreakdown(events:Progress['xp']){return events.reduce((sum,event)=>{sum[event.kind==='streak'?'streak':event.kind==='performance'||event.kind==='correction'?'performance':'participation']+=event.amount;return sum},{participation:0,performance:0,streak:0})}

function shiftDay(key:string,delta:number){const value=new Date(`${key}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+delta);return value.toISOString().slice(0,10)}
function mondayOf(key:string){const weekday=(new Date(`${key}T00:00:00Z`).getUTCDay()+6)%7;return shiftDay(key,-weekday)}
export function streakStats(activeDays:Set<string>,now=Date.now()){const today=day(now);let daily=0,cursor=activeDays.has(today)?today:shiftDay(today,-1);while(activeDays.has(cursor)){daily++;cursor=shiftDay(cursor,-1)}const currentWeek=mondayOf(today),countWeek=(start:string)=>Array.from({length:7},(_,i)=>shiftDay(start,i)).filter(date=>activeDays.has(date)).length;const thisWeekDays=countWeek(currentWeek);let weekly=0,cursorWeek=thisWeekDays>=3?currentWeek:shiftDay(currentWeek,-7);while(countWeek(cursorWeek)>=3){weekly++;cursorWeek=shiftDay(cursorWeek,-7)}return{daily,weekly,thisWeekDays}}

export function streakBoost(days:string[],now=Date.now()){const streak=streakStats(new Set(days),now);const dailyPercent=streak.daily>=14?40:streak.daily>=7?30:streak.daily>=3?20:0;const weeklyPercent=streak.weekly>=4?20:streak.weekly>=2?10:0;const percent=Math.min(50,dailyPercent+weeklyPercent);return {...streak,dailyPercent,weeklyPercent,percent,multiplier:1+percent/100}}
export function bonusXp(base:number,days:string[],now=Date.now()){return Math.floor(base*streakBoost(days,now).percent/100)}
