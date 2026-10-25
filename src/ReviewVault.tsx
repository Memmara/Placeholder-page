import React from 'react';
import {ArrowRight,BookOpen,CheckCircle2,Clock3} from 'lucide-react';
import type {Bank,Progress} from './models';
import {day,evidence} from './engine';

export function ReviewVault({bank,progress,onPractice}:{bank:Bank;progress:Progress;onPractice:()=>void}){
 const attempts=new Map<string,Progress['attempts']>();
 for(const attempt of progress.attempts)attempts.set(attempt.pointId,[...(attempts.get(attempt.pointId)??[]),attempt]);
 const touched=[...attempts].filter(([id,entries])=>bank.points.some(point=>point.specification_point_id===id&&progress.settings?.subjects.includes(point.subject_id))&&entries.some(a=>['incorrect','partial','unsure'].includes(a.result.outcome)));
 const fixed=touched.filter(([,entries])=>{
  const lastMiss=entries.reduce((index,attempt,position)=>['incorrect','partial','unsure'].includes(attempt.result.outcome)?position:index,-1);
  return new Set(entries.slice(lastMiss+1).filter(a=>a.delayed&&!a.hintUsed&&!a.answerRevealed&&a.result.outcome==='correct').map(a=>day(a.at))).size>=2;
 });
 const secure=touched.filter(([id])=>evidence(progress,id).state==='Secure');
 const struggling=touched.filter(([id])=>!fixed.some(([fixedId])=>fixedId===id));
 const due=struggling.filter(([id])=>(progress.reviews[id]?.dueAt??Infinity)<=Date.now());
 const pointName=(id:string)=>{const point=bank.points.find(p=>p.specification_point_id===id);return point?`${point.topic} · ${point.subtopic}`:id};
 return <section className="review-vault panel" aria-labelledby="vault-title"><div className="section-heading"><div><span className="eyebrow">YOUR REVIEW VAULT</span><h2 id="vault-title">Turn mistakes into mastery.</h2></div><BookOpen size={24}/></div><p>Questions you missed return after a delay. A different question checks whether the idea now sticks.</p><div className="vault-stats"><div><Clock3 size={19}/><strong>{due.length}</strong><span>Ready to revisit</span></div><div><CheckCircle2 size={19}/><strong>{fixed.length}</strong><span>Questions fixed</span></div><div><BookOpen size={19}/><strong>{struggling.length}</strong><span>Still building</span></div></div>{struggling.length>0?<div className="vault-list">{struggling.slice(0,3).map(([id])=><div key={id}><span>{pointName(id)}</span><small>{(progress.reviews[id]?.dueAt??Infinity)<=Date.now()?'Due now':`Next review ${new Date(progress.reviews[id]?.dueAt??Date.now()).toLocaleDateString('en-GB')}`}</small></div>)}</div>:<p className="fine">Your first tricky question will appear here after practice.</p>}<details className="vault-details"><summary>Questions I fixed ({fixed.length})</summary>{fixed.length?fixed.slice(0,8).map(([id])=><p key={id}>{pointName(id)}</p>):<p>Two delayed correct returns will move a missed idea here.</p>}</details><details className="vault-details"><summary>Recently mastered concepts ({secure.length})</summary>{secure.length?secure.slice(-8).map(([id])=><p key={id}>{pointName(id)}</p>):<p>Three independent delayed correct days make a concept secure.</p>}</details><div className="vault-footer"><small>{secure.length} recently mastered concept{secure.length===1?'':'s'}</small><button className="secondary" disabled={!struggling.length} onClick={onPractice}>Practise past mistakes <ArrowRight size={17}/></button></div></section>;
}
