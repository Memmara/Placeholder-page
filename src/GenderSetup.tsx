import {Check,UserRound} from 'lucide-react';
import type {Settings} from './models';

const options=[
 {id:'male',label:'Male',description:'Uses the male avatar'},
 {id:'female',label:'Female',description:'Uses the female avatar'},
 {id:'prefer_not_to_say',label:'Prefer not to say',description:'Keeps this private and uses the male avatar'},
] as const;

export function GenderSetup({value,onChange}:{value:Settings['gender'];onChange:(gender:NonNullable<Settings['gender']>)=>void}){
 return <div className="gender-setup"><p className="label">Gender</p><div className="gender-options" role="radiogroup" aria-label="Gender">{options.map(option=><button type="button" role="radio" aria-checked={value===option.id} className={value===option.id?'active':''} key={option.id} onClick={()=>onChange(option.id)}><span className="gender-choice-icon"><UserRound size={24}/></span><span><strong>{option.label}</strong><small>{option.description}</small></span>{value===option.id&&<Check size={19}/>}</button>)}</div><p className="fine">You can change this later in Avatar settings.</p></div>;
}
