import type {Settings} from './models';
import {COURSE_CONTENT,TIERED_GCSE_SUBJECTS,selectedCourseContent} from './courseContent';
import {GeographyOptions} from './GeographyOptions';
import {HistoryOptions} from './HistoryOptions';

const labels:Record<string,string>={'GCSE-MATHS':'Maths','GCSE-PHYSICS':'Physics','GCSE-CHEMISTRY':'Chemistry','GCSE-BIOLOGY':'Biology','GCSE-ENGLISH-LANGUAGE':'English Language','GCSE-ENGLISH-LITERATURE':'English Literature','GCSE-GEOGRAPHY':'Geography','GCSE-HISTORY':'History','GCSE-RELIGIOUS-STUDIES':'Religious Studies','GCSE-ART-DESIGN':'Art and Design','GCSE-BUSINESS':'Business Studies','GCSE-COMPUTER-SCIENCE':'Computer Science','GCSE-DESIGN-TECHNOLOGY':'Design and Technology','GCSE-PHYSICAL-EDUCATION':'Physical Education','A-LEVEL-BUSINESS':'Business','A-LEVEL-ECONOMICS':'Economics','A-LEVEL-PSYCHOLOGY':'Psychology','A-LEVEL-MATHEMATICS':'Mathematics','A-LEVEL-FURTHER-MATHS':'Further Maths','A-LEVEL-PHYSICS':'Physics','A-LEVEL-BIOLOGY':'Biology','A-LEVEL-HISTORY':'History','A-LEVEL-SOCIOLOGY':'Sociology','A-LEVEL-ENGLISH-LITERATURE':'English Literature','A-LEVEL-GEOGRAPHY':'Geography','A-LEVEL-POLITICS':'Politics'};

export function CourseOptions({settings,onChange}:{settings:Settings;onChange:(settings:Settings)=>void}){
 const tierFor=(subject:string)=>settings.subjectTiers?.[subject]??settings.tier;
 return <div className="course-options-page">
  <p className="fine course-options-intro">Set the tier and taught content for each course. Subjects without optional units use the full AQA specification.</p>
  {settings.subjects.map(subject=>{
   const label=labels[subject]??subject,config=COURSE_CONTENT[subject],selected=selectedCourseContent(settings,subject),hasOptions=subject==='GCSE-GEOGRAPHY'||subject==='GCSE-HISTORY'||!!config;
   return <section className="course-subject-card" key={subject} aria-labelledby={'course-'+subject}>
    <header className="course-subject-heading"><div><span className="eyebrow">AQA {subject.startsWith('A-LEVEL-')?'A-LEVEL':'GCSE'}</span><h3 id={'course-'+subject}>{label}</h3></div>{TIERED_GCSE_SUBJECTS.has(subject)?<div><small>Exam tier</small><div className="segmented" role="group" aria-label={label+' tier'}>{(['foundation','higher'] as const).map(tier=><button type="button" aria-pressed={tierFor(subject)===tier} className={tierFor(subject)===tier?'active':''} key={tier} onClick={()=>onChange({...settings,subjectTiers:{...settings.subjectTiers,[subject]:tier}})}>{tier==='higher'?'Higher':'Foundation'}</button>)}</div></div>:<span className="pill">Single tier</span>}</header>
    {subject==='GCSE-GEOGRAPHY'&&<GeographyOptions settings={settings} onChange={geographyOptions=>onChange({...settings,geographyOptions})}/>} 
    {subject==='GCSE-HISTORY'&&<HistoryOptions settings={settings} onChange={historyOptions=>onChange({...settings,historyOptions})}/>} 
    {config&&<div className="course-content-options"><p className="fine">{config.intro}</p>{config.groups.map(group=>{const chosen=group.choices.filter(choice=>selected.includes(choice.id));return <div className="geo-choice-group" key={group.label}><div><strong>{group.label}</strong><small>{group.instruction}</small></div><div className="geo-choice-buttons" role="group" aria-label={group.label}>{group.choices.map(choice=>{const active=selected.includes(choice.id),disabled=group.required>1&&!active&&chosen.length>=group.required;return <button type="button" key={choice.id} className={active?'active':''} aria-pressed={active} disabled={disabled} onClick={()=>{const groupIds=group.choices.map(item=>item.id),other=selected.filter(id=>!groupIds.includes(id));const next=group.required===1?[...other,choice.id]:active?[...other,...chosen.filter(item=>item.id!==choice.id).map(item=>item.id)]:[...other,...chosen.map(item=>item.id),choice.id];onChange({...settings,courseContent:{...(settings.courseContent??{}),[subject]:next}})}}>{active?'✓ ':''}{choice.label}</button>})}</div></div>})}</div>}
    {!hasOptions&&<div className="course-content-included"><strong>Full specification included</strong><span>There are no optional units to select for this course.</span></div>}
   </section>
  })}
 </div>
}
