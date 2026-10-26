import {Sparkles} from 'lucide-react';
import './marking-status.css';

export function MarkingStatus({timerPaused=false,compact=false,saving=false}:{timerPaused?:boolean;compact?:boolean;saving?:boolean}){
 return <div className={'marking-status'+(compact?' compact':'')} role="status" aria-live="polite" aria-label={saving?'Saving your answer':'Checking your answer'}>
  <span className="marking-status-icon" aria-hidden="true"><Sparkles size={20}/></span>
  <span><strong>{saving?'Saving your progress…':'Checking your answer…'}</strong><small>{timerPaused?'Timer paused while your answer is saved.':saving?'Your result is ready. You can continue when the save completes.':'Comparing with the mark scheme.'}</small></span>
  <span className="marking-status-dots" aria-hidden="true"><i/><i/><i/></span>
 </div>;
}
