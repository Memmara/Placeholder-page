import type {MarkingResult,Question} from './models';

const normalise=(text:string)=>text.normalize('NFKC').toLowerCase().trim().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const result=(outcome:MarkingResult['outcome'],explanation:string):MarkingResult=>({outcome,explanation,missing:outcome==='correct'?[]:['Compare each mark-scheme criterion with your answer.'],method:'rules',ruleVersion:'history-1.0.0',reviewRequired:outcome==='review'});

/** The supplied Python matcher is retained in the source archive, not run in the browser.
 * Only exact authored answers are auto-credited; unrecognised wording gets a rubric review. */
export function markHistory(q:Question,response:string):MarkingResult{
 const answer=normalise(response);
 if(!answer)return {...result('unsure','No answer was entered. Compare the mark scheme and revisit this idea later.'),method:'unmarked'};
 const checks=q.self_check;
 if(checks.criteria.some(c=>c.reject_examples?.some(item=>normalise(item.text)===answer))||checks.test_answers?.must_score_zero?.some(item=>normalise(item)===answer))return result('incorrect','This response matches a specifically rejected answer in the supplied rubric.');
 if(answer===normalise(q.answer)||answer===normalise(q.model_answer))return result('correct','Your response matches an authored full answer. Check the rubric to see why it earns the marks.');
 if(checks.total_marks===1&&checks.criteria[0]?.examples.some(example=>normalise(example)===answer))return result('correct','Your response matches an authored credited example.');
 return result('review','The local rules cannot safely judge this wording. Compare it with the mark scheme and mark each idea you included.');
}
