import {useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,ChartNoAxesColumnIncreasing} from 'lucide-react';
import type {Progress} from './models';
import {xpBreakdown} from './engine';
import './progress-analytics.css';

type Range='month'|'year';
type Metric='days'|'xp';
type Bucket={label:string;days:number;questions:number;xp:number};

function dateKey(value:number){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function monthName(date:Date){return date.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}

export function ProgressAnalytics({progress}:{progress:Progress}){
 const [range,setRange]=useState<Range>('month');
 const [metric,setMetric]=useState<Metric>('days');
 const [anchor,setAnchor]=useState(()=>new Date());
 const year=anchor.getFullYear(),month=anchor.getMonth();
 const start=new Date(year,range==='month'?month:0,1).getTime();
 const end=new Date(year,range==='month'?month+1:12,1).getTime();
 const attempts=progress.attempts.filter(a=>a.at>=start&&a.at<end);
 const awards=progress.xp.filter(e=>e.at>=start&&e.at<end);
 const days=new Set(attempts.map(a=>dateKey(a.at)));
 for(const key of progress.completedDays){const at=new Date(`${key}T12:00:00`).getTime();if(at>=start&&at<end)days.add(key)}
 const breakdown=xpBreakdown(awards);
 const xp=breakdown.participation+breakdown.performance+breakdown.streak;
 const buckets:Bucket[]=range==='month'
  ?Array.from({length:Math.ceil(new Date(year,month+1,0).getDate()/7)},(_,i)=>{
   const first=i*7+1,last=Math.min(first+6,new Date(year,month+1,0).getDate());
   const inBucket=(at:number)=>{const d=new Date(at);return d.getDate()>=first&&d.getDate()<=last};
   return {label:`${first}–${last}`,days:[...days].filter(key=>{const d=Number(key.slice(-2));return d>=first&&d<=last}).length,questions:attempts.filter(a=>inBucket(a.at)).length,xp:awards.filter(e=>inBucket(e.at)).reduce((n,e)=>n+e.amount,0)};
  })
  :Array.from({length:12},(_,i)=>({label:new Date(year,i,1).toLocaleDateString('en-GB',{month:'short'}),days:[...days].filter(key=>Number(key.slice(5,7))===i+1).length,questions:attempts.filter(a=>new Date(a.at).getMonth()===i).length,xp:awards.filter(e=>new Date(e.at).getMonth()===i).reduce((n,e)=>n+e.amount,0)}));
 const max=Math.max(1,...buckets.map(b=>b[metric]));
 const today=new Date();const current=range==='month'?year===today.getFullYear()&&month===today.getMonth():year===today.getFullYear();
 const label=range==='month'?monthName(anchor):String(year);
 function changeRange(next:Range){setRange(next);setAnchor(new Date())}
 function step(direction:number){setAnchor(new Date(year+(range==='year'?direction:0),range==='month'?month+direction:0,1))}
 return <section className="panel analytics-panel" aria-label="Participation and XP analytics">
  <div className="analytics-heading"><div><p className="eyebrow"><ChartNoAxesColumnIncreasing size={15}/> YOUR ACTIVITY</p><h2>Participation and XP</h2><p>See how often you practised and what you earned over time.</p></div><div className="analytics-range" role="group" aria-label="Analytics period"><button aria-pressed={range==='month'} onClick={()=>changeRange('month')}>Monthly</button><button aria-pressed={range==='year'} onClick={()=>changeRange('year')}>Yearly</button></div></div>
  <div className="analytics-period"><button className="icon-button" aria-label={`Previous ${range}`} onClick={()=>step(-1)}><ArrowLeft size={18}/></button><strong><CalendarDays size={18}/>{label}</strong><button className="icon-button" aria-label={`Next ${range}`} disabled={current} onClick={()=>step(1)}><ArrowRight size={18}/></button></div>
  <div className="analytics-stats"><div><strong>{days.size}</strong><span>practice {days.size===1?'day':'days'}</span></div><div><strong>{attempts.length}</strong><span>questions answered</span></div><div><strong>{xp.toLocaleString()}</strong><span>XP earned</span></div></div>
  <div className="analytics-chart-heading"><h3>{metric==='days'?'Practice days':'XP earned'} by {range==='month'?'week':'month'}</h3><div className="analytics-metric" role="group" aria-label="Chart metric"><button aria-pressed={metric==='days'} onClick={()=>setMetric('days')}>Practice days</button><button aria-pressed={metric==='xp'} onClick={()=>setMetric('xp')}>XP</button></div></div>
  <div className="analytics-chart" role="img" aria-label={`${label}: ${buckets.map(b=>`${b.label}, ${b.days} practice days and ${b.xp} XP`).join('; ')}`}>
   {buckets.map(b=><div className="analytics-bar-cell" key={b.label}><span className="analytics-bar-value">{b[metric]}</span><div className="analytics-bar-track"><span style={{height:`${b[metric]?Math.max(7,b[metric]/max*100):0}%`}}/></div><span className="analytics-bar-label">{b.label}</span></div>)}
  </div>
  <div className="analytics-breakdown"><span><i className="participation"/>{breakdown.participation} participation XP</span><span><i className="performance"/>{breakdown.performance} performance XP</span><span><i className="streak"/>{breakdown.streak} streak XP</span></div>
  <p className="analytics-note">A practice day includes an answer attempt or completed Daily Mix. XP is counted when it was awarded. Older activity is shown from progress saved on this device.</p>
 </section>
}
