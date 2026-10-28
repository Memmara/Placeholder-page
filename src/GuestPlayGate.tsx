import {useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Clock3,Flame,Grid2X2,Layers3,LockKeyhole,Puzzle,X,Zap} from 'lucide-react';
import {leaveGuest} from './guestAccess';

const previews:Record<string,{description:string;icon:typeof Layers3}>={
  'Daily Mix':{icon:BookOpen,description:'A short mix of questions from your chosen subjects. Answer from memory, check the explanation and revisit tricky ideas over time.'},
  'Knowledge Tower':{icon:Layers3,description:'Answer a question, then place a moving platform. Correct answers make the next platform wider; wrong answers make it narrower. Keep stacking until you miss.'},
  'Speed Select':{icon:Zap,description:'Up to 10 multiple-choice questions, with 25 seconds for each answer. Choose quickly, then check the explanation before moving on.'},
  'Streak Survival':{icon:Flame,description:'Build the longest correct-answer streak you can. One incorrect answer ends the run.'},
  'Time Attack':{icon:Clock3,description:'Answer as many questions as you can in 60 seconds. Correct answers earn points; mistakes lose points.'},
  'Flash Match':{icon:Puzzle,description:'Match each term with its definition. Tap the matching pairs or drag them together.'},
  'Memory Grid':{icon:Grid2X2,description:'Study a grid of definition cards, then remember where each definition was hidden.'},
  'Past Mistakes':{icon:BookOpen,description:'Return to concepts you previously found difficult and build stronger recall with fresh questions.'},
};
export function GuestPlayGate(){
  const [title,setTitle]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const open=(event:Event)=>setTitle((event as CustomEvent<{title:string}>).detail.title);
    window.addEventListener('memmara:guest-play',open);
    return()=>window.removeEventListener('memmara:guest-play',open);
  },[]);
  useEffect(()=>{if(title&&!dialog.current?.open)dialog.current?.showModal();},[title]);
  const preview=previews[title]??previews['Daily Mix'],Icon=preview.icon;
  return <dialog className="guest-game-dialog" ref={dialog} onClose={()=>setTitle('')} aria-labelledby="guest-game-title">
    <button className="icon-button guest-game-close" aria-label="Close game preview" onClick={()=>dialog.current?.close()}><X size={20}/></button>
    <div className="guest-game-art" aria-hidden="true"><Icon size={60}/>{title==='Knowledge Tower'&&<div className="guest-tower-sample"><i/><i/><i/></div>}</div>
    <p className="eyebrow">GAME PREVIEW</p><h2 id="guest-game-title">{title}</h2><p>{preview.description}</p>
    <div className="guest-play-note"><LockKeyhole size={18}/><span>Sign in or create an account to play and save your progress.</span></div>
    <button className="primary wide" onClick={()=>leaveGuest('/login')}>Sign in to play <ArrowRight size={18}/></button>
    <button className="secondary wide" onClick={()=>leaveGuest('/create-account')}>Create an account</button>
    <button className="text-button" onClick={()=>dialog.current?.close()}>Keep exploring</button>
  </dialog>;
}
