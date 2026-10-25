import type { Question, MarkingResult, MarkingProvider, NumericRule, SelfCheckCriterion } from './models';
import {markMaths} from './mathsMarking.ts';
import {markGeography} from './geographyMarking.ts';
import {markHistory} from './historyMarking.ts';
import {openShopForTokens} from './commerce/CommerceService.ts';

const norm=(s:string)=>s.normalize('NFC').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
const textNorm=(s:string)=>s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}%°]+/gu,' ').trim().replace(/\s+/g,' ');
const result=(outcome:MarkingResult['outcome'],explanation:string,missing:string[]=[]):MarkingResult=>({outcome,explanation,missing,method:'rules',ruleVersion:'authored-self-check-v2.0',reviewRequired:outcome==='review'});

function numberWords(input:string):number|null{
 const words=input.toLowerCase().replace(/-/g,' ').split(/\s+/).filter(w=>w&&w!=='and');
 if(!words.length)return null;
 const ones:Record<string,number>={zero:0,nought:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
 const tens:Record<string,number>={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
 const point=words.indexOf('point');
 const integerWords=point<0?words:words.slice(0,point);
 const digitWords=point<0?[]:words.slice(point+1);
 let total=0,group=0;
 for(const w of integerWords){if(w in ones)group+=ones[w];else if(w in tens)group+=tens[w];else if(w==='hundred')group=(group||1)*100;else if(w==='thousand'){total+=(group||1)*1000;group=0;}else if(w==='million'){total+=(group||1)*1000000;group=0;}else return null;}
 let value=total+group;
 if(point>=0){if(!digitWords.length)return null;let decimal='';for(const w of digitWords){if(w in ones&&ones[w]<10)decimal+=ones[w];else return null;}value+=Number(`0.${decimal}`);}
 return Number.isFinite(value)?value:null;
}

function parseNumericValue(input:string,formats:string[]=[]):{value:number;unit:string}|null{
 const s=input.normalize('NFC').trim().replace(/,/g,'');
 const ratio=s.match(/^([+-]?\d+)\s*:\s*(\d+)\s*(.*)$/);
 if(ratio){if(formats.length&&!formats.includes('ratio'))return null;const denominator=Number(ratio[2]);if(!denominator)return null;return {value:Number(ratio[1])/denominator,unit:ratio[3].trim()};}
 const frac=s.match(/^([+-]?\d+)\s*\/\s*(\d+)\s*(.*)$/);
 if(frac){if(formats.length&&!formats.includes('fraction'))return null;const denominator=Number(frac[2]);if(!denominator)return null;return {value:Number(frac[1])/denominator,unit:frac[3].trim()};}
 const m=s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(.*)$/i);
 if(m){if(/[eE]/.test(m[1])&&formats.length&&!formats.includes('scientific_notation'))return null;if(m[1].includes('.')&&formats.length&&!formats.includes('decimal')&&!/[eE]/.test(m[1]))return null;return {value:Number(m[1]),unit:m[2].trim()};}
 if(formats.includes('number_words')){
  const word=numberWords(s);if(word!==null)return {value:word,unit:''};
 }
 return null;
}

function unitParts(input:string,rule:NumericRule):{valueText:string;unit:string}|null{
 const s=input.trim();
 const units=[...new Set([...rule.accepted_units,...(rule.unit_conversions??[]).map(x=>x.unit)])].sort((a,b)=>b.length-a.length);
 for(const unit of units){if(!unit)continue;if(s.endsWith(unit)){const valueText=s.slice(0,s.length-unit.length).trim();if(valueText)return {valueText,unit};}}
 // Alphabetic unit names are authored case-insensitively; symbols and prefixes retain case.
 for(const unit of units){if(!unit||!/[A-Za-z]/.test(unit))continue;const suffix=s.slice(-unit.length);if(suffix.toLowerCase()===unit.toLowerCase()){const valueText=s.slice(0,s.length-unit.length).trim();if(valueText)return {valueText,unit};}}
 return {valueText:s,unit:''};
}

function numericMatch(rule:NumericRule,value:number,unit:string):boolean|null{
 if(!Number.isFinite(value))return null;
 if(rule.require_unit&&!unit)return null;
 if(unit&&!rule.accepted_units.includes(unit))return null;
 let multiplier=1;
 if(unit){const conversion=rule.unit_conversions?.find(x=>x.unit===unit);if(!conversion&&unit!==rule.expected_unit)return null;multiplier=conversion?.multiplier_to_expected_unit??1;}
 const converted=value*multiplier;
 const tolerance=Math.max(rule.absolute_tolerance??0,Math.abs(rule.expected_value)*(rule.relative_tolerance??0));
 return (rule.comparison??'equal')==='greater_than'?converted>rule.expected_value+tolerance:Math.abs(converted-rule.expected_value)<=tolerance;
}

function evaluateNumeric(rule:NumericRule,response:string):MarkingResult{
 const aliases=rule.accepted_equivalent_phrases??[];
 const alias=aliases.find(x=>norm(x.phrase)===norm(response));
 if(alias){const match=numericMatch(rule,alias.value,alias.unit);if(match===true)return result('correct','Your answer matches an authored equivalent phrase and numeric rule.');if(match===false)return result('incorrect','Your answer differs from the authored numeric value. Compare it with the mark scheme.',['Recheck the value and unit.']);}
 const parts=unitParts(response,rule);
 if(!parts)return result('review','This format is not covered by the authored numeric rule. Your answer has not been marked incorrect.',['Compare it with the model answer and mark scheme.']);
 if(rule.require_unit&&!parts.unit)return result('review',`Include the required unit${rule.expected_unit?` (${rule.expected_unit})`:''}. Your answer has not been marked incorrect.`,[rule.expected_unit??'Include the unit.']);
 if(parts.unit&&!rule.accepted_units.includes(parts.unit))return result('review','This unit is not covered by the authored numeric rule. Your answer has not been marked incorrect.',['Compare the unit with the mark scheme.']);
 const formats=rule.number_formats??[];
 const wordValue=formats.includes('number_words')?numberWords(parts.valueText):null;
 const parsed=wordValue!==null?{value:wordValue,unit:parts.unit}:parseNumericValue(`${parts.valueText} ${parts.unit}`.trim(),formats);
 if(!parsed)return result('review','This format is not covered by the authored numeric rule. Your answer has not been marked incorrect.',['Compare it with the model answer and mark scheme.']);
 const match=numericMatch(rule,parsed.value,parsed.unit);
 if(match===true)return result('correct','Your final value matches the authored numeric rule. The mark scheme shows the full criterion.');
 if(match===false)return result('incorrect','Your final value differs from the authored numeric rule. Compare it with the mark scheme.',['Recheck the value, unit and conversion.']);
 return result('review','The authored numeric rule cannot check this answer safely. Your answer has not been marked incorrect.',['Compare it with the model answer and mark scheme.']);
}

type TextMatch='match'|'rejected'|'ambiguous'|'unknown';
function conceptGroupTextMatch(rule:NonNullable<SelfCheckCriterion['text_rule']>,response:string):TextMatch{
 let prepared=response.normalize('NFC').trim();
 for(const spelling of rule.approved_misspellings??[]){const escaped=spelling.typed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');prepared=prepared.replace(new RegExp(`\\b${escaped}\\b`,'gi'),spelling.intended);}
 const exact=textNorm(prepared),tokens=exact.split(/\s+/).filter(Boolean);if(!exact)return 'unknown';
 const phraseIn=(phrase:string)=>{const value=textNorm(phrase);return !!value&&(` ${exact} `).includes(` ${value} `)};
 const patternIn=(pattern:NonNullable<typeof rule.concept_groups>[number]['alternates'][number])=>{
  if(typeof pattern==='string')return phraseIn(pattern);
  const ranges=pattern.all_of.map(alternates=>alternates.flatMap(phrase=>{const phraseTokens=textNorm(phrase).split(' ').filter(Boolean),found:{start:number;end:number}[]=[];if(!phraseTokens.length)return found;for(let start=0;start<=tokens.length-phraseTokens.length;start++)if(phraseTokens.every((token,index)=>tokens[start+index]===token))found.push({start,end:start+phraseTokens.length-1});return found;}));
  if(ranges.some(group=>!group.length))return false;
  if(!Number.isFinite(pattern.max_span_tokens))return true;
  const visit=(group:number,start=Infinity,end=-Infinity):boolean=>group===ranges.length?end-start+1<=(pattern.max_span_tokens as number):ranges[group].some(range=>visit(group+1,Math.min(start,range.start),Math.max(end,range.end)));
  return visit(0);
 };
 if(rule.rejected_answers.some(answer=>textNorm(answer)===exact))return 'rejected';
 const rejectLimit=rule.reject_max_response_tokens??rule.maximum_auto_match_tokens??45;
 if(tokens.length<=rejectLimit&&(rule.reject_phrases??[]).some(patternIn))return 'rejected';
 if(rule.accepted_answers.some(answer=>textNorm(answer)===exact))return 'match';
 if(tokens.length>(rule.maximum_auto_match_tokens??60))return 'unknown';
 if((rule.blocking_patterns??[]).some(pattern=>{try{return new RegExp(pattern,'i').test(prepared)}catch{return true}}))return 'ambiguous';
 const groups=rule.concept_groups??[],matched=groups.filter(group=>group.alternates.some(patternIn));if(!matched.length)return 'unknown';
 const guard=rule.negation_guard;
 if(guard?.competing_answers?.some(phraseIn)||guard?.post_negation?.some(phraseIn))return 'ambiguous';
 const cuePattern=(guard?.cues??[]).filter(cue=>cue!=="n't").map(cue=>cue.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 if((cuePattern&&new RegExp(`\\b(?:${cuePattern})\\b`,'i').test(prepared))||prepared.includes("n't"))return 'ambiguous';
 return matched.length>=(rule.min_groups_required??groups.length)?'match':'unknown';
}

function textMatch(rule:NonNullable<SelfCheckCriterion['text_rule']>,response:string):TextMatch{
 if(rule.mode==='concept_groups_with_alternates')return conceptGroupTextMatch(rule,response);
 if(rule.mode==='bounded_phrase_with_licensed_context')return boundedTextMatch(rule,response);
 const exact=textNorm(response);
 const accepted=rule.accepted_answers.some(x=>textNorm(x)===exact);
 if(accepted)return 'match';
 if(rule.rejected_answers.some(x=>textNorm(x)===exact))return 'rejected';
 if(rule.negation_policy!=='needs_review_unless_exact_approved_answer'&&rule.negation_policy!=='needs_review')return 'unknown';
 if(/\b(not|no|never|cannot|can't|isn't|aren't|doesn't|don't|without|incorrectly|false)\b/i.test(response))return 'ambiguous';
 const hits=rule.accepted_answers.filter(x=>{const phrase=textNorm(x);return phrase&&(` ${exact} `).includes(` ${phrase} `);});
 if(hits.length===1&&!/\b(or|alternatively|either)\b/i.test(response))return 'match';
 if(hits.length>1||/\b(or|alternatively|either)\b/i.test(response))return 'ambiguous';
 return 'unknown';
}

const authoredNorm=(s:string)=>s.normalize('NFC').trim().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
const uncertainty=/(?:\b(?:not|never|cannot|can't|isn't|aren't|doesn't|don't|without|maybe|perhaps|might|unsure|wrong|false|reject|neither)\b|\bor\s+(?:something|another|different)\b)/i;
function boundedTextMatch(rule:NonNullable<SelfCheckCriterion['text_rule']>,response:string):TextMatch{
 const raw=authoredNorm(response);
 if(raw.length>320||!raw)return 'unknown';
 let prepared=raw;
 for(const spelling of rule.approved_misspellings??[]){const escaped=spelling.typed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');prepared=prepared.replace(new RegExp(`\\b${escaped}\\b`,'gi'),spelling.intended);}
 const exact=textNorm(prepared);
 if(rule.rejected_answers.some(x=>textNorm(x)===exact))return 'rejected';
 if(uncertainty.test(prepared))return 'ambiguous';
 if((rule.blocking_patterns??[]).some(pattern=>{try{return new RegExp(pattern,'i').test(prepared)}catch{return true}}))return 'ambiguous';
 if((rule.maximum_auto_match_tokens??45)<exact.split(' ').length)return 'unknown';
 if(rule.accepted_answers.some(x=>textNorm(x)===exact))return 'match';
 const allowed=new Set((rule.allowed_context_tokens??[]).map(textNorm));
 for(const phrase of rule.accepted_answers){const target=textNorm(phrase);if(!target||!(` ${exact} `).includes(` ${target} `))continue;const rest=(` ${exact} `).replace(` ${target} `,' ').trim().split(/\s+/).filter(Boolean);if(rest.every(token=>allowed.has(token)))return 'match';}
 return 'unknown';
}

function authoredMatch(q:Question,response:string):MarkingResult{
 const sc=q.self_check,raw=authoredNorm(response),criteria=sc.criteria;
 if(!raw)return {...result('unsure','No answer was entered. Compare the rubric and try again later.'),method:'unmarked'};
 if(sc.review_response_examples?.some(x=>textNorm(x)===textNorm(raw)))return result('review','This wording is flagged by the authored bank for a point-by-point check against the mark scheme.');
 if(sc.rejected_response_examples?.some(x=>textNorm(x)===textNorm(raw)))return result('incorrect','This answer is explicitly rejected by the authored mark scheme. Compare it with the model answer.');
 // Explicit counterexamples take precedence over examples and keywords.
 if(sc.noncredit_response_examples?.some(c=>authoredNorm(c.response)===raw))return result('review','This answer is an authored non-credit example. Compare the full statement with each mark-scheme point.');
 if(sc.accepted_response_examples?.some(x=>authoredNorm(x)===raw))return result('correct','Your answer matches an authored full-credit response.');
 const required=new Set(criteria.map(c=>c.criterion_id));
 if(sc.whole_response_rules?.some(r=>r.criterion_ids.length===required.size&&r.criterion_ids.every(id=>required.has(id))&&authoredNorm(r.answer)===raw))return result('correct','Your answer matches an authored complete response.');
 if(criteria.length===1){
  const c=criteria[0];
  if(c.rejected_input_examples?.some(x=>authoredNorm(x)===raw))return result('incorrect','This response matches an authored non-credit example. Compare it with the worked answer.');
  if(c.accepted_input_examples?.some(x=>authoredNorm(x)===raw))return result('correct','Your answer matches an authored input example.');
  if(c.numeric_rule)return evaluateNumeric(c.numeric_rule,response);
  if(c.text_rule){const state=textMatch(c.text_rule,response);if(state==='match')return result('correct','Your answer matches the authored phrase and its permitted context.');if(state==='rejected')return result('incorrect','Your answer matches an authored rejected response. Compare it with the mark scheme.');}
 }
 if(criteria.length>1&&criteria.every(c=>c.text_rule&&textMatch(c.text_rule,response)==='match'))return result('correct','Your answer covers every authored text criterion.');
 return result('review','The authored rules cannot confirm this wording safely. Compare it with the point-by-point mark scheme; it has not been marked incorrect.');
}

function evaluateText(criteria:SelfCheckCriterion[],response:string,q:Question):MarkingResult{
 const rules=criteria.filter(c=>c.text_rule);
 const states=rules.map(c=>textMatch(c.text_rule!,response));
 if(states.length&&states.every(x=>x==='match'))return result('correct','Your answer matches the authored whole-phrase criteria.');
 if(states.includes('rejected'))return result('incorrect','Your answer matches an authored rejected response. Compare it with the mark scheme.');
 if(norm(response)===norm(q.answer)||norm(response)===norm(q.model_answer))return result('correct','Your answer matches the supplied model answer.');
 return result('review','Automatic marking cannot confirm this wording from the authored phrases. Your answer has not been marked incorrect. Compare it with the model answer and criteria.',['Use the point-by-point self-check and mark scheme.']);
}

export function markWithRules(q:Question,response:string):MarkingResult{
 if(q.self_check.checker_version==='maths-1.0.0')return markMaths(q,response);
 if(q.question_type==='multiple_choice'){
  const id=response.trim();
  if(!id)return {...result('unsure','No option selected. Read the explanation and try this idea again later.'),method:'unmarked'};
  if(!q.options?.some(o=>o.option_id===id))return result('review','Choose one of the supplied options.');
  return q.answer_key?.correct_option_ids.includes(id)?result('correct',q.model_answer):result('incorrect',q.option_feedback?.[id]??q.model_answer);
 }
 if(q.self_check.checker_version==='geography-1.0.0')return markGeography(q,response);
 if(q.self_check.checker_version==='history-1.0.0')return markHistory(q,response);
 if(q.self_check.checker_version==='2.0.0'||q.self_check.checker_version==='3.0.0'||q.self_check.checker_version==='A3.0.0'||q.self_check.version>=3)return authoredMatch(q,response);
 const a=norm(response);
 if(!a)return {...result('unsure','That is a useful starting point. Read the explanation, then revisit this idea later.'),method:'unmarked'};
 const criteria=q.self_check.criteria;
 const numeric=criteria.filter(c=>c.numeric_rule);
 if(numeric.length===1)return evaluateNumeric(numeric[0].numeric_rule!,response);
 if(numeric.length>1)return result('review','Automatic marking cannot check multiple numeric points at once. Use the question’s point-by-point self-check and mark scheme. Your answer has not been marked incorrect.');
 const textRules=criteria.filter(c=>c.text_rule);
 if(textRules.length)return evaluateText(criteria,response,q);
 if(a===norm(q.answer)||a===norm(q.model_answer))return result('correct','Your complete response matches a supplied reference answer.');
 return result('review','Automatic marking cannot confirm this wording from the authored phrases. Your answer has not been marked incorrect.',['Use the point-by-point self-check and mark scheme.']);
}

export const ruleProvider:MarkingProvider={async mark(req,q){return markWithRules(q,req.response)}};
/** Configure a same-origin authenticated service later; never put provider API keys in Vite variables. */
export function apiProvider(endpoint='/api/mark'):MarkingProvider{return {async mark(req){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':req.attemptId},body:JSON.stringify(req),credentials:'same-origin'});if(res.status===402||res.status===409){await openShopForTokens();throw new Error('You’re out of tokens! Choose an option below to continue.');}if(!res.ok)throw new Error('Marking is unavailable. Your answer is saved. Please retry.');const data=await res.json();if(!['correct','incorrect','partial','review','unsure'].includes(data.outcome)||typeof data.explanation!=='string'||!Array.isArray(data.missing)||!data.missing.every((x:unknown)=>typeof x==='string'))throw new Error('The marking response was invalid. Your answer is saved.');return {...data,method:'ai',reviewRequired:data.outcome==='review'};}}}

