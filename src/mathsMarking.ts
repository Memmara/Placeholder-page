import type {MarkingResult,NumericRule,Question} from './models';

const marked=(outcome:MarkingResult['outcome'],explanation:string):MarkingResult=>({outcome,explanation,missing:outcome==='correct'?[]:['Compare your response with each mark-scheme point.'],method:'rules',ruleVersion:'maths-1.0.0',reviewRequired:outcome==='review'});
const superscripts:Record<string,string>={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
const canonical=(value:string)=>value.normalize('NFC').trim().toLowerCase().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g,s=>'^'+[...s].map(c=>superscripts[c]).join('')).replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/\s+/g,' ').replace(/[.]+$/,'');
const bare=(value:string)=>canonical(value).replace(/^(?:answer|ans|so the answer is|therefore)\s*[:=]?\s*/,'').trim();
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
type Parsed={value:number;kind:'decimal'|'fraction'|'scientific';numerator?:number;denominator?:number;unit:string};
function parse(value:string):Parsed|null{
 const raw=bare(value).replace(/,/g,'').replace(/\s+/g,'');
 const match=raw.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[+-]?\d+\/[1-9]\d*)(%|£|p|m|cm|mm|km|kg|g|ml|l|°|°c|m²|cm²)?$/i);
 if(match){const token=match[1],fraction=token.match(/^([+-]?\d+)\/([1-9]\d*)$/);return {value:fraction?Number(fraction[1])/Number(fraction[2]):Number(token),kind:fraction?'fraction':/e/i.test(token)?'scientific':'decimal',numerator:fraction?Number(fraction[1]):undefined,denominator:fraction?Number(fraction[2]):undefined,unit:match[2]??''};}
 const currency=raw.match(/^£([+-]?\d+(?:\.\d+)?)$/);
 if(currency)return {value:Number(currency[1]),kind:'decimal',unit:'£'};
 const science=raw.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\*(?:10)\^?([+-]?\d+)(.*)$/);
 if(science)return {value:Number(science[1])*10**Number(science[2]),kind:'scientific',unit:science[3]};
 return null;
}

export function markMaths(q:Question,response:string):MarkingResult{
 const answer=bare(response);
 if(!answer)return marked('unsure','No answer was entered. Review the worked solution, then revisit this question.');
 const criteria=q.self_check.criteria;
 const rejects=criteria.at(-1)?.reject_examples??[];
 if(rejects.some(r=>bare(r.text)===answer))return marked('incorrect','This answer matches an explicitly rejected example in the supplied mark scheme.');
 // Proof and show-your-working questions cannot be credited for a final result alone.
 if(q.question_type==='proof'||/\b(?:show that|prove|show your working|you must show)\b/i.test(q.question))return marked('review','Working is required here. Compare each step with the mark scheme before deciding whether to mark it correct.');
 // The supplied answer is an authored final response. It is full credit only when
 // the question does not require written reasoning or a specific alternative form.
 const exact=answer===bare(q.answer);
 if(exact)return marked('correct','Your final answer matches the supplied answer. Check the mark scheme for the method.');
 const ratio=criteria.at(-1)?.ratio_rule as {expected_ratio:number[];simplest_required?:boolean}|undefined;
 if(ratio){
  const match=answer.replace(/\s/g,'').match(/^([1-9]\d*):([1-9]\d*)$/);
  if(match){const left=Number(match[1]),right=Number(match[2]),[wantLeft,wantRight]=ratio.expected_ratio;
   if(left*wantRight!==right*wantLeft)return marked('incorrect','The ratio differs from the supplied answer.');
   if(ratio.simplest_required&&gcd(left,right)!==1)return marked('incorrect','The ratio is equivalent but must be in simplest form.');
   return marked('correct','Your ratio matches the supplied rule.');
  }
 }
 const values=criteria.at(-1)?.values_rule as {expected_values:number[];ordered?:boolean;tolerance?:number}|undefined;
 if(values&&/^\s*[()\[\]xypq=,;\s+\-\d.]+\s*$/i.test(answer)){
  const parsedValues=[...answer.matchAll(/(?<![a-z])[-+]?(?:\d+(?:\.\d*)?|\.\d+)/g)].map(m=>Number(m[0]));
  if(parsedValues.length===values.expected_values.length){const sorted=values.ordered?parsedValues:[...parsedValues].sort((a,b)=>a-b),target=values.ordered?values.expected_values:[...values.expected_values].sort((a,b)=>a-b);
   return sorted.every((n,i)=>Math.abs(n-target[i])<=Math.max(values.tolerance??0,1e-10))?marked('correct','All values match the supplied rule.'):marked('incorrect','At least one value differs from the supplied answer.');
  }
 }
 const numeric=criteria.map(c=>c.numeric_rule).filter((rule):rule is NumericRule=>!!rule).at(-1);
 const parsed=parse(response);
 if(numeric&&parsed){
  const forms=numeric.forms??[];
  const needsFraction=forms.includes('frac')&&!forms.includes('dec')&&!forms.includes('mixed');
  const needsDecimal=forms.includes('dec')&&!forms.includes('frac')&&!forms.includes('mixed');
  if((needsFraction&&parsed.kind!=='fraction')||(needsDecimal&&parsed.kind!=='decimal'))return marked('review','This question asks for a particular answer form. Compare your form with the mark scheme.');
  if(numeric.simplify_required&&parsed.kind==='fraction'&&gcd(parsed.numerator!,parsed.denominator!)!==1)return marked('incorrect','The fraction has the right value but is not in simplest form.');
  if(parsed.kind==='fraction'&&Number.isInteger(numeric.expected_value)&&parsed.denominator!==1)return marked('review','Evaluate the division before writing the final answer.');
  if((numeric.unit_required||numeric.require_unit)&&!parsed.unit)return marked('review','The answer needs a unit. Compare the value and unit with the mark scheme.');
  if(parsed.unit&&numeric.accepted_units.length&&!numeric.accepted_units.includes(parsed.unit))return marked('review','This unit needs checking against the mark scheme.');
  if(parsed.unit&&!numeric.accepted_units.length&&parsed.unit!=='%')return marked('review','This unit needs checking against the mark scheme.');
  if(forms.includes('sf')&&parsed.kind!=='scientific')return marked('review','Check the requested standard form against the mark scheme.');
  if(numeric.alternative_answers?.length)return marked('review','This question has alternative numeric answers. Compare your form with the mark scheme.');
  const expected=numeric.expected_value,converted=parsed.unit==='%'?parsed.value/100:parsed.value;
  const tolerance=Math.max(numeric.absolute_tolerance??0,Math.abs(expected)*(numeric.relative_tolerance??0),1e-10);
  if(Math.abs(converted-expected)<=tolerance)return marked('correct','Your final value and required form match the supplied rule.');
  return marked('incorrect','The final value differs from the supplied answer. Check the method and units in the mark scheme.');
 }
 // Written, algebraic and multi-part responses need the authored criteria. An
 // equivalent-looking string alone cannot establish all method marks safely.
 return marked('review','The checker cannot safely confirm this format. Compare it with the mark scheme and mark it correct if your work earns the marks.');
}
