import type {Bank,Settings} from './models';
import {contentPointEligible} from './courseContent.ts';
const tierFor=(settings:Settings,subject:string)=>settings.subjectTiers?.[subject]??settings.tier;

const WEEK=7*86400000;
const TEACHING_WEEKS=40;
const STARTER_WEEKS=4;
const LAG_WEEKS=3;
const collator=new Intl.Collator('en-GB',{numeric:true});
const subjectForQuestionId=(id:string)=>id.startsWith('AQA7037-ALGEO-')?'A-LEVEL-GEOGRAPHY':id.startsWith('AQA7042-ALHIST-')?'A-LEVEL-HISTORY':id.startsWith('AQA7132-ALBUS-')?'A-LEVEL-BUSINESS':id.startsWith('AQA7136-ALECON-')?'A-LEVEL-ECONOMICS':id.startsWith('AQA7152-ALPOL-')?'A-LEVEL-POLITICS':id.startsWith('AQA7182-ALPSY-')?'A-LEVEL-PSYCHOLOGY':id.startsWith('AQA7192-ALSOC-')?'A-LEVEL-SOCIOLOGY':id.startsWith('AQA7357-')?'A-LEVEL-MATHEMATICS':id.startsWith('AQA7367-')?'A-LEVEL-FURTHER-MATHS':id.startsWith('AQA7402-ALBIO-')?'A-LEVEL-BIOLOGY':id.startsWith('AQA7408-')?'A-LEVEL-PHYSICS':id.startsWith('AQA7712-ALELIT-')?'A-LEVEL-ENGLISH-LITERATURE':id.startsWith('AQA8300-')?'GCSE-MATHS':id.startsWith('AQA8035-')?'GCSE-GEOGRAPHY':id.startsWith('AQA8145-')?'GCSE-HISTORY':id.startsWith('AQA8461-')?'GCSE-BIOLOGY':id.startsWith('AQA8462-')?'GCSE-CHEMISTRY':id.startsWith('AQA8700-')?'GCSE-ENGLISH-LANGUAGE':id.startsWith('AQA8702-')?'GCSE-ENGLISH-LITERATURE':id.startsWith('AQA8062-')?'GCSE-RELIGIOUS-STUDIES':id.startsWith('AQA8201-')?'GCSE-ART-DESIGN':id.startsWith('AQA8132-')?'GCSE-BUSINESS':id.startsWith('AQA8525-')?'GCSE-COMPUTER-SCIENCE':id.startsWith('AQA8552-')?'GCSE-DESIGN-TECHNOLOGY':id.startsWith('AQA8582-')?'GCSE-PHYSICAL-EDUCATION':'GCSE-PHYSICS';
const pointEligible=(point:Bank['points'][number],settings:Settings)=>(point.subject_id!=='GCSE-GEOGRAPHY'||!point.geographyOption||(settings.geographyOptions??[]).includes(point.geographyOption))&&(point.subject_id!=='GCSE-HISTORY'||!point.historyOption||(settings.historyOptions??[]).includes(point.historyOption))&&contentPointEligible(point,settings);

/** Approximate three-year Year 9–11 sequence. Curriculum points, not topics, are the unit. */
export function automaticCoverageFraction(yearGroup:9|10|11|12|13,now=Date.now()){
 const today=new Date(now);
 const startYear=today.getMonth()>=8?today.getFullYear():today.getFullYear()-1;
 const academicStart=new Date(startYear,8,1).getTime();
 const elapsedWeeks=Math.max(0,(now-academicStart)/WEEK);
 const availableWeeks=Math.min(TEACHING_WEEKS,Math.max(STARTER_WEEKS,elapsedWeeks-LAG_WEEKS));
 return Math.min(1,yearGroup>=12?((yearGroup-12)+availableWeeks/TEACHING_WEEKS)/2:((yearGroup-9)+availableWeeks/TEACHING_WEEKS)/3);
}

export function automaticPointIds(bank:Bank,settings:Settings,now=Date.now()){
 const year=settings.yearGroup??9;
 const fraction=automaticCoverageFraction(year,now);
 const questionRefs=new Set(bank.questions.map(q=>`${subjectForQuestionId(q.question_id)}:${q.specification_point_id}`));
 const result=new Set<string>();
 for(const subject of settings.subjects){
  const points=bank.points.filter(p=>p.subject_id===subject&&(tierFor(settings,subject)==='higher'||p.tier!=='higher')&&pointEligible(p,settings)&&questionRefs.has(`${p.subject_id}:${p.spec_reference}`)).sort((a,b)=>subject==='GCSE-MATHS'?(mathsRank(a.spec_reference)-mathsRank(b.spec_reference)):collator.compare(a.spec_reference,b.spec_reference));
  if(subject==='GCSE-HISTORY'){
   for(const topicId of new Set(points.map(point=>point.topic_id))){
    const optionPoints=points.filter(point=>point.topic_id===topicId);
    for(const point of optionPoints.slice(0,Math.max(1,Math.ceil(optionPoints.length*fraction))))result.add(point.specification_point_id);
   }
  }else for(const point of points.slice(0,Math.max(1,Math.ceil(points.length*fraction))))result.add(point.specification_point_id);
 }
 return result;
}

const mathsOrder:Record<string,number>={N:0,A:1,R:2,G:3,P:4,S:5};
function mathsRank(ref:string){return (mathsOrder[ref[0]]??9)*100+Number(ref.slice(1));}
