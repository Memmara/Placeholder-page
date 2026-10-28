import {ArrowRight,BookOpen,Layers3} from 'lucide-react';
import {useEffect} from 'react';
import {Brand} from './Brand';
import {guestAccessEnabled,startGuest} from './guestAccess';
import './public-landing.css';
import './guest.css';

const samples=[
  {subject:'Physics',question:'A cyclist speeds up on a level road. Which energy store increases?',answer:'The kinetic energy store increases.',why:'Kinetic energy is the energy associated with motion. For the same mass, a greater speed means more kinetic energy.'},
  {subject:'Biology',question:'Which cell structure contains the chlorophyll used in photosynthesis?',answer:'The chloroplast.',why:'Chlorophyll absorbs light energy. Chloroplasts contain chlorophyll and are the site of photosynthesis in plant cells.'},
  {subject:'Chemistry',question:'An atom has six protons and eight neutrons. What is its mass number?',answer:'14.',why:'Mass number is the total number of protons and neutrons: 6 + 8 = 14. Electrons are not included.'},
  {subject:'Maths',question:'A jacket costs £40. What is the price after a 15% reduction?',answer:'£34.',why:'10% of £40 is £4, and 5% is £2. Subtract the £6 reduction from £40 to get £34.'},
];
export function GuestWelcome(){
  useEffect(()=>{
    document.title='Try Memmara | Free GCSE practice and revision games';
    document.querySelector('link[rel="canonical"]')?.setAttribute('href','https://www.memmara.com/guest');
  },[]);
  return <div className="public-landing"><header className="public-nav"><a href="/" aria-label="Memmara home"><Brand/></a><nav aria-label="Public navigation"><a href="/about">About</a><a href="/contact">Contact</a><a className="public-signin" href="/login">Sign in</a></nav></header>
    <main className="public-info-main"><header><span className="public-kicker">EXPLORE MEMMARA</span><h1>Take a look. Find your next small step.</h1><p className="public-info-lead">Browse subjects, discover Daily Mix and preview our revision minigames. Read the sample questions below, then sign in when you’re ready to play.</p>
      {guestAccessEnabled?<><button className="public-cta" onClick={()=>startGuest()}>Continue as guest <ArrowRight size={18}/></button><p className="guest-explainer">Guest mode is a preview. You can open game cards to see how they work; playing and saving learning progress require an account.</p></>:<a className="public-cta" href="/create-account">Create an account <ArrowRight size={18}/></a>}</header>
      <section className="public-info-card"><h2><BookOpen size={23}/> How to practise</h2><p>Try answering from memory before revealing an answer. Compare your response with the explanation, then revisit the idea on another day. A short Daily Mix combines questions from your selected subjects; Knowledge Tower, Speed Select and other minigames offer another way to practise.</p></section>
      <section className="public-info-card"><h2>Try a few retrieval questions</h2><p>Think of your answer first, then open the explanation below each question.</p><div className="guest-samples">{samples.map(sample=><article key={sample.subject}><span className="public-kicker">GCSE {sample.subject}</span><h3>{sample.question}</h3><details><summary>Reveal answer and explanation</summary><strong>{sample.answer}</strong><p>{sample.why}</p></details></article>)}</div></section>
      <section className="public-info-card"><h2><Layers3 size={23}/> Build your knowledge, one answer at a time</h2><p>In Knowledge Tower, a correct answer makes your next platform wider. Time the moving platform to stack it on the tower. A wrong answer makes the platform narrower, and a complete miss ends the run.</p>{guestAccessEnabled&&<button className="public-cta" onClick={()=>startGuest('/minigames')}>Explore the minigames <ArrowRight size={18}/></button>}</section>
    </main><footer className="public-footer"><Brand/><nav aria-label="Footer navigation"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a></nav></footer></div>;
}
