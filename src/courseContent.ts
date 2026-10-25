import type {CurriculumPoint,Settings} from './models';

export const TIERED_GCSE_SUBJECTS=new Set(['GCSE-MATHS','GCSE-PHYSICS','GCSE-CHEMISTRY','GCSE-BIOLOGY']);

export interface ContentGroup {label:string;instruction:string;required:number;choices:{id:string;label:string}[]}
export const COURSE_CONTENT:Record<string,{intro:string;groups:ContentGroup[]}>={
 'GCSE-ENGLISH-LITERATURE':{
  intro:'Choose the texts and anthology taught by your school. Unseen poetry and assessment skills are always included.',
  groups:[
   {label:'Shakespeare',instruction:'Choose one text',required:1,choices:[{id:'AQA8702-MACBETH',label:'Macbeth'},{id:'AQA8702-ROMEO',label:'Romeo and Juliet'}]},
   {label:'19th-century novel',instruction:'Choose one text',required:1,choices:[{id:'AQA8702-CAROL',label:'A Christmas Carol'},{id:'AQA8702-JEKYLL',label:'Dr Jekyll and Mr Hyde'}]},
   {label:'Modern text',instruction:'Included in this question bank',required:1,choices:[{id:'AQA8702-INSPECTOR',label:'An Inspector Calls'}]},
   {label:'Poetry anthology',instruction:'Included in this question bank',required:1,choices:[{id:'AQA8702-POETRY',label:'Power and Conflict'}]}
  ]
 },
 'GCSE-RELIGIOUS-STUDIES':{
  intro:'Choose the beliefs and themes taught by your school. General assessment skills are always included.',
  groups:[
   {label:'Religions',instruction:'Choose two',required:2,choices:[{id:'AQA8062-CHRISTIANITY',label:'Christianity'},{id:'AQA8062-ISLAM',label:'Islam'}]},
   {label:'Thematic studies',instruction:'Choose four themes',required:4,choices:[
    {id:'AQA8062-THEME-A',label:'A · Relationships and families'},{id:'AQA8062-THEME-B',label:'B · Religion and life'},{id:'AQA8062-THEME-C',label:'C · Existence of God and revelation'},
    {id:'AQA8062-THEME-D',label:'D · Religion, peace and conflict'},{id:'AQA8062-THEME-E',label:'E · Religion, crime and punishment'},{id:'AQA8062-THEME-F',label:'F · Human rights and social justice'}
   ]}
  ]
 }
};

export function defaultCourseContent(subject:string){return COURSE_CONTENT[subject]?.groups.flatMap(group=>group.choices.slice(0,group.required).map(choice=>choice.id))??[]}
export function selectedCourseContent(settings:Settings,subject:string){return settings.courseContent?.[subject]??defaultCourseContent(subject)}
export function courseContentValid(settings:Settings){return settings.subjects.every(subject=>{const config=COURSE_CONTENT[subject];if(!config)return true;const selected=selectedCourseContent(settings,subject);return config.groups.every(group=>group.choices.filter(choice=>selected.includes(choice.id)).length===group.required)})}
export function normaliseCourseContent(settings:Settings):Settings{return {...settings,courseContent:{...(settings.courseContent??{}),...Object.fromEntries(settings.subjects.filter(subject=>COURSE_CONTENT[subject]).map(subject=>[subject,selectedCourseContent(settings,subject)]))}}}
export function contentPointEligible(point:CurriculumPoint,settings:Settings){const config=COURSE_CONTENT[point.subject_id];if(!config)return true;const optional=new Set(config.groups.flatMap(group=>group.choices.map(choice=>choice.id)));return !optional.has(point.topic_id)||selectedCourseContent(settings,point.subject_id).includes(point.topic_id)}
