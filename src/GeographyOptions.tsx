import type {Settings} from './models';

const groups=[
 {id:'environment',label:'The living world',instruction:'Choose one environment',choices:['hot deserts','cold environments'],required:1},
 {id:'landscapes',label:'UK physical landscapes',instruction:'Choose two landscapes',choices:['coasts','rivers','glacial'],required:2},
 {id:'resource',label:'Global resource management',instruction:'Choose one resource',choices:['food','water','energy'],required:1}
] as const;

export function geographyOptionsValid(settings:Settings){
 if(!settings.subjects.includes('GCSE-GEOGRAPHY'))return true;
 const selected=settings.geographyOptions??[];
 return groups.every(group=>group.choices.filter(choice=>selected.includes(choice)).length===group.required);
}

export function GeographyOptions({settings,onChange}:{settings:Settings;onChange:(options:string[])=>void}){
 const selected=settings.geographyOptions??[];
 return <section className="geography-options" aria-labelledby="geo-options-title">
  <h3 id="geo-options-title">Your Geography options</h3>
  <p className="fine">Choose what your school teaches. Daily Mix and automatic plans will use these choices.</p>
  {groups.map(group=>{
   const chosen=group.choices.filter(choice=>selected.includes(choice));
   return <div className="geo-choice-group" key={group.id}><div><strong>{group.label}</strong><small>{group.instruction}</small></div><div className="geo-choice-buttons" role="group" aria-label={group.instruction}>
    {group.choices.map(choice=>{
     const active=selected.includes(choice),disabled=group.required>1&&!active&&chosen.length>=group.required;
     return <button type="button" key={choice} className={active?'active':''} aria-pressed={active} disabled={disabled} onClick={()=>{
      const other=selected.filter(value=>!(group.choices as readonly string[]).includes(value));
      onChange(group.required===1?[...other,choice]:active?[...other,...chosen.filter(value=>value!==choice)]:[...other,...chosen,choice]);
     }}>{active?'✓ ':''}{choice==='glacial'?'Glacial landscapes':choice.replace(/^./,letter=>letter.toUpperCase())}</button>;
    })}
   </div></div>;
  })}
  {!geographyOptionsValid(settings)&&<p className="fine">Choose one environment, two landscapes and one resource to continue.</p>}
 </section>;
}
