import type {Settings} from './models';

const groups = [
 {label:'Period study',choices:[
  ['1AA','America, 1840–1895'],['1AB','Germany, 1890–1945'],['1AC','Russia, 1894–1945'],['1AD','America, 1920–1973']
 ]},
 {label:'Wider world depth study',choices:[
  ['1BA','First World War, 1894–1918'],['1BB','Inter-war years, 1918–1939'],['1BC','East and West, 1945–1972'],['1BD','Asia, 1950–1975'],['1BE','Gulf and Afghanistan, 1990–2009']
 ]},
 {label:'Thematic study',choices:[
  ['2AA','Health and the people'],['2AB','Power and the people'],['2AC','Migration, empires and the people']
 ]},
 {label:'British depth study',choices:[
  ['2BA','Norman England'],['2BB','Medieval England: Edward I'],['2BC','Elizabethan England'],['2BD','Restoration England']
 ]}
] as const;

export function historyOptionsValid(settings:Settings){
 if(!settings.subjects.includes('GCSE-HISTORY'))return true;
 const selected=settings.historyOptions??[];
 return groups.every(group=>group.choices.filter(([code])=>selected.includes(code)).length===1);
}

export function HistoryOptions({settings,onChange}:{settings:Settings;onChange:(options:string[])=>void}){
 const selected=settings.historyOptions??[];
 return <section className="geography-options history-options" aria-labelledby="history-options-title">
  <h3 id="history-options-title">Your History options</h3>
  <p className="fine">Choose the four options your school teaches. Source and interpretation skills are included automatically.</p>
  {groups.map(group=><div className="geo-choice-group" key={group.label}>
   <div><strong>{group.label}</strong><small>Choose one</small></div>
   <div className="geo-choice-buttons" role="group" aria-label={group.label}>{group.choices.map(([code,label])=><button type="button" key={code} className={selected.includes(code)?'active':''} aria-pressed={selected.includes(code)} onClick={()=>{
    const groupCodes=group.choices.map(([id])=>id);
    onChange([...selected.filter(id=>!groupCodes.includes(id as typeof groupCodes[number])),code]);
   }}>{selected.includes(code)?'✓ ':''}{label}</button>)}</div>
  </div>)}
  {!historyOptionsValid(settings)&&<p className="fine">Choose one option from each of the four groups to continue.</p>}
 </section>;
}
