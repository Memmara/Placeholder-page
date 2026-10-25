import type {MarkingResult,NumericRule,Question} from './models';

const result=(outcome:MarkingResult['outcome'],explanation:string):MarkingResult=>({outcome,explanation,missing:outcome==='correct'?[]:['Compare each mark-scheme criterion with your answer.'],method:'rules',ruleVersion:'geography-1.0.0',reviewRequired:outcome==='review'});
const normalise=(text:string)=>text.normalize('NFC').toLowerCase().trim().replace(/[’‘]/g,"'").replace(/[‐‑–—]/g,'-').replace(/\s*([,:;])\s*/g,'$1').replace(/\s+/g,' ').replace(/[.!?]+$/,'');
function numericResponse(text:string,rule:NumericRule):number|null{
 const raw=normalise(text).replace(/^(?:answer|ans|so|therefore)\s*[:=]?\s*/,'').replace(/,/g,'').trim();
 const units=[...rule.accepted_units].sort((a,b)=>b.length-a.length);
 let token=raw,unit='';
 for(const candidate of units){if(candidate&&token.toLowerCase().endsWith(candidate.toLowerCase())){unit=candidate;token=token.slice(0,-candidate.length).trim();break;}}
 if(!unit&&rule.unit_required)return null;
 if(!unit&&/[^\d.+\-]/.test(token))return null;
 const value=Number(token);
 return Number.isFinite(value)?value:null;
}

/** Conservative portable check. The archive's Python matcher is reference data,
 * not executed in the browser. Unknown wording stays open for student review. */
export function markGeography(q:Question,response:string):MarkingResult{
 const answer=normalise(response);
 if(!answer)return {...result('unsure','No answer was entered. Read the mark scheme and revisit this idea later.'),method:'unmarked'};
 const sc=q.self_check;
 if(sc.must_score_zero?.some(text=>normalise(text)===answer))return result('incorrect','This response is explicitly listed as non-credit in the supplied bank.');
 if(sc.criteria.some(c=>c.reject_examples?.some(r=>normalise(r.text)===answer)))return result('incorrect','This response matches a rejected example in the supplied mark scheme.');
 if(q.question_type==='extended_response'||sc.marking_style==='levels')return result('review','This answer is marked using level descriptors and a holistic judgement. Compare its developed ideas, examples and any level caps with the mark scheme.');
 if(answer===normalise(q.answer)||answer===normalise(q.model_answer))return result('correct','Your response matches an authored full answer. Check the criteria to see why it earns the marks.');
 if(sc.criteria.length===1&&sc.criteria[0].examples.some(example=>normalise(example)===answer))return result('correct','Your response matches an authored credited example.');
 const finalRule=sc.criteria.at(-1)?.numeric_rule;
 if(finalRule&&q.question_type==='calculation'){
  const value=numericResponse(response,finalRule);
  if(value!==null){
   const range=(finalRule as NumericRule&{accept_range?:[number,number]}).accept_range;
   const tolerance=Math.max(finalRule.absolute_tolerance??0,Math.abs(finalRule.expected_value)*(finalRule.relative_tolerance??0),1e-10);
   const match=range?value>=range[0]-tolerance&&value<=range[1]+tolerance:Math.abs(value-finalRule.expected_value)<=tolerance;
   if(match&&!/\b(?:show|working|explain)\b/i.test(q.question))return result('correct','Your final value and unit match the supplied numeric rule.');
   if(!match&&sc.total_marks===1)return result('incorrect','The final value differs from the supplied answer.');
  }
 }
 return result('review','The rules cannot safely check this wording or all method marks. Compare it with the mark scheme and mark the points your answer earns.');
}
