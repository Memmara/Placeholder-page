import {Sparkles} from 'lucide-react';
import './marking-status.css';

export function MarkingStatus({timerPaused=false,compact=false}:{timerPaused?:boolean;compact?:boolean}){
 return <div className={'marking-status'+(compact?' compact':'')} role="status" aria-live="polite" aria-label="Checking and saving your answer">
  <span className="marking-status-icon" aria-hidden="true"><Sparkles size={20}/></span>
  <span><strong>Checking your answer…</strong><small>{timerPaused?'Timer paused while your answer is checked.':'Comparing with the mark scheme and saving your progress.'}</small></span>
  <span className="marking-status-dots" aria-hidden="true"><i/><i/><i/></span>
 </div>;
}
