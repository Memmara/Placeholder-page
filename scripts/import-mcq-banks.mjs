import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const questionPath=path.join(root,'public/data/questions.json');
const curriculumPath=path.join(root,'public/data/curriculum.json');
const inputs=process.argv.slice(2);
if(!inputs.length)throw Error('Pass one or more MCQ JSON files to import.');

const configs={
 ENGLANG:{subject_id:'GCSE-ENGLISH-LANGUAGE',code:'8700',prefix:'AQA8700-ENGLANG-MCQ-',name:'English Language'},
 ENGLIT:{subject_id:'GCSE-ENGLISH-LITERATURE',code:'8702',prefix:'AQA8702-ENGLIT-MCQ-',name:'English Literature'},
 CHEM:{subject_id:'GCSE-CHEMISTRY',code:'8462',prefix:'AQA8462-CHEM-MCQ-',name:'Chemistry'},
 BIO:{subject_id:'GCSE-BIOLOGY',code:'8461',prefix:'AQA8461-BIO-MCQ-',name:'Biology'},
 GEOG:{subject_id:'GCSE-GEOGRAPHY',code:'8035',prefix:'AQA8035-GEO-MCQ-',name:'Geography'},
 HIST:{subject_id:'GCSE-HISTORY',code:'8145',prefix:'AQA8145-HIST-MCQ-',name:'History'},
 RS:{subject_id:'GCSE-RELIGIOUS-STUDIES',code:'8062',prefix:'AQA8062-RS-MCQ-',name:'Religious Studies'},
 ART:{subject_id:'GCSE-ART-DESIGN',code:'8201',prefix:'AQA8201-ART-MCQ-',name:'Art and Design'},
 BUS:{subject_id:'GCSE-BUSINESS',code:'8132',prefix:'AQA8132-BUS-MCQ-',name:'Business Studies'},
 CS:{subject_id:'GCSE-COMPUTER-SCIENCE',code:'8525',prefix:'AQA8525-CS-MCQ-',name:'Computer Science'},
 DT:{subject_id:'GCSE-DESIGN-TECHNOLOGY',code:'8552',prefix:'AQA8552-DT-MCQ-',name:'Design and Technology'},
 PE:{subject_id:'GCSE-PHYSICAL-EDUCATION',code:'8582',prefix:'AQA8582-PE-MCQ-',name:'Physical Education'}
};
const topicNames={
 CHEM:{'4.1':'Atomic structure and the periodic table','4.2':'Bonding, structure and properties','4.3':'Quantitative chemistry','4.4':'Chemical changes','4.5':'Energy changes','4.6':'Rates and equilibrium','4.7':'Organic chemistry','4.8':'Chemical analysis','4.9':'Chemistry of the atmosphere','4.10':'Using resources'},
 BIO:{'4.1':'Cell biology','4.2':'Organisation','4.3':'Infection and response','4.4':'Bioenergetics','4.5':'Homeostasis and response','4.6':'Inheritance, variation and evolution','4.7':'Ecology'}
};
const historyTopics={GERMANY:['Germany, 1890–1945: Democracy and dictatorship','1AB'],CONFLICT:['Conflict and tension: First World War, 1894–1918','1BA'],HEALTH:['Britain: Health and the people','2AA'],ELIZABETH:['Elizabethan England, c1568–1603','2BC'],NORMAN:['Norman England, c1066–c1100','2BA']};
const title=s=>s.toLowerCase().split('-').map(w=>w==='spag'?'SPaG':w==='nf'?'non-fiction':w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
function configFor(question){const key=Object.keys(configs).find(k=>question.question_id.startsWith(k+'_')||question.specification_point_id.startsWith(k+'-'));if(!key)throw Error('Cannot identify subject for '+question.question_id);return [key,configs[key]];}
function hierarchy(key,spec){
 const parts=spec.split('-'),slug=parts.slice(key==='CHEM'||key==='BIO'?3:3).join('-');
 if(key==='CHEM'||key==='BIO'){
  const section=parts[2],topKey=Object.keys(topicNames[key]).sort((a,b)=>b.length-a.length).find(x=>section.startsWith(x+'.')||section===x)??section;
  return {topic:topicNames[key][topKey]??title(slug),subtopic:title(slug),topicCode:topKey.replace('.','_')};
 }
 if(key==='HIST'){
  const group=historyTopics[parts[2]]??['History knowledge and skills',null];
  return {topic:group[0],subtopic:title(parts.slice(3).join('-')),topicCode:parts[2],historyOption:group[1]};
 }
 if(key==='GEOG'){
  const area=parts[2],unit=parts[3]??'SKILLS',slug=parts.slice(4).join('-')||unit;
  const topic=area==='SKILLS'?'Geographical applications and skills':unit==='HAZARDS'?'The challenge of natural hazards':unit==='ECOSYSTEMS'?'The living world':['UK','COASTS','RIVERS','GLACIAL'].includes(unit)?'Physical landscapes in the UK':unit==='URBAN'?'Urban issues and challenges':['DEVELOPMENT','NIGERIA','POPULATION','GLOBALISATION'].includes(unit)||unit==='UK'?'The changing economic world':['RESOURCES','FOOD','WATER','ENERGY'].includes(unit)?'The challenge of resource management':'Geography knowledge and skills';
  const geographyOption=unit==='COASTS'?'coasts':unit==='RIVERS'?'rivers':unit==='GLACIAL'?'glacial':unit==='ECOSYSTEMS'&&['DESERTS','DESERTIFICATION'].includes(parts[4])?'hot deserts':unit==='ECOSYSTEMS'&&parts[4]==='COLD'?'cold environments':['FOOD','WATER','ENERGY'].includes(unit)?unit.toLowerCase():null;
  return {topic,subtopic:title([unit,slug].filter((value,index,array)=>index===0||value!==array[0]).join('-')),topicCode:`${area}-${unit}`,...(geographyOption?{geographyOption}:{})};
 }
 if(key==='RS'){
  const section=parts[2];
  if(section==='CHRISTIANITY'||section==='ISLAM')return {topic:title(section),subtopic:title(parts.slice(3).join('-')),topicCode:section};
  if(section==='THEME'){
   const code=parts[3],names={A:'Theme A: Relationships and families',B:'Theme B: Religion and life',C:'Theme C: The existence of God and revelation',D:'Theme D: Religion, peace and conflict',E:'Theme E: Religion, crime and punishment',F:'Theme F: Human rights and social justice'};
   return {topic:names[code]??`Theme ${code}`,subtopic:title(parts.slice(4).join('-')),topicCode:`THEME-${code}`};
  }
  return {topic:'Religious Studies skills',subtopic:title(parts.slice(3).join('-')||'Assessment skills'),topicCode:'SKILLS'};
 }
 if(key==='ART'){
  const unit=parts[2],fine=new Set(['DRAWING','WATERCOLOUR','ACRYLIC','PAINT']),print=new Set(['PRINTMAKING','RELIEF','INTAGLIO','SCREEN','MONOPRINT']),threeD=new Set(['3D','CERAMICS','CLAY','SCULPTURE','ASSEMBLAGE','WORKSHOP']),textile=new Set(['TEXTILE','STITCH','DYE','WEAVE','REPEAT']),photo=new Set(['PHOTO','DIGITAL','MOVING']),graphic=new Set(['TYPOGRAPHY','LOGO','ILLUSTRATION','POSTER']),portfolio=new Set(['AO1','AO2','AO3','AO4','ANALYSING','SKETCHBOOK']);
  const topic=unit==='CONTEXT'?'Artists, movements and cultural contexts':fine.has(unit)?'Fine art techniques':print.has(unit)?'Printmaking':threeD.has(unit)?'Three-dimensional design':textile.has(unit)?'Textile design':photo.has(unit)?'Photography and digital media':graphic.has(unit)?'Graphic communication':portfolio.has(unit)?'Portfolio development and assessment objectives':'Visual language and formal elements';
  return {topic,subtopic:title(parts.slice(2).join('-')),topicCode:unit==='CONTEXT'?`CONTEXT-${parts[3]}`:unit};
 }
 if(key==='BUS'){
  const unit=parts.slice(2).join('-'),operations=new Set(['PRODUCTION-METHODS','TECH-PRODUCTION','QUALITY','CUSTOMER-SERVICE','STOCK-CONTROL','SUPPLY-CHAIN','SUPPLIERS','SALES-PROCESS']),finance=new Set(['REVENUE-COSTS','PROFIT','CASH-FLOW','SHORT-TERM-FINANCE','LONG-TERM-FINANCE','BREAK-EVEN','MARGINS','ARR','CASH-FLOW-FORECAST','COST-TYPES','INCOME-STATEMENT','BUSINESS-MATHS']),marketing=new Set(['CUSTOMER-NEEDS','MARKET-RESEARCH','SEGMENTATION','COMPETITION','PRODUCT-LIFE-CYCLE','PRODUCT','PRICE','PROMOTION','PLACE','MARKETING-MIX','DIGITAL-MARKETING']),people=new Set(['ORG-STRUCTURES','RECRUITMENT','TRAINING','FINANCIAL-MOTIVATION','NON-FINANCIAL-MOTIVATION','WAYS-OF-WORKING','COMMUNICATION']),influences=new Set(['TECHNOLOGY','ETHICS','ENVIRONMENT','ECONOMIC-CLIMATE','EXCHANGE-RATES','GLOBALISATION','LEGISLATION']);
  const topic=operations.has(unit)?'Business operations':finance.has(unit)?'Business finance':marketing.has(unit)?'Marketing':people.has(unit)?'Human resources':influences.has(unit)?'Influences on business':'Business in the real world';
  return {topic,subtopic:title(unit),topicCode:topic.toUpperCase().replaceAll(' ','-')};
 }
 if(key==='CS'){
  const unit=parts.slice(2).join('-'),algorithms=new Set(['ALGO-THINKING','FLOWCHARTS-PSEUDOCODE','TRACE-TABLES','SEARCH-ALGORITHMS','SORT-ALGORITHMS']),programming=new Set(['DATA-TYPES','VARIABLES-OPERATORS','SELECTION','ITERATION','STRING-HANDLING','ARRAYS','RECORDS-FILES','SUBROUTINES','PARAMETERS-SCOPE','VALIDATION','TESTING','PROG-LANGUAGES','IDE-TOOLS']),data=new Set(['NUMBER-BASES','BINARY-ARITHMETIC','DATA-UNITS','CHARACTER-ENCODING','IMAGES','IMAGE-FILE-SIZE','SOUND','SOUND-FILE-SIZE','COMPRESSION','LOGIC-GATES','TRUTH-TABLES']),systems=new Set(['HARDWARE-SOFTWARE','OPERATING-SYSTEMS','CPU-COMPONENTS','FETCH-EXECUTE','CPU-PERFORMANCE','EMBEDDED-SYSTEMS','PRIMARY-STORAGE','SECONDARY-STORAGE']),networks=new Set(['NETWORK-TYPES','TOPOLOGY','NETWORK-HARDWARE','PROTOCOLS','ADDRESSING-PACKETS','WIRED-WIRELESS']),security=new Set(['THREATS','ATTACKS','PREVENTION','PENETRATION-TESTING']),databases=new Set(['DB-CONCEPTS','SQL-SELECT','SQL-MODIFY']);
  const topic=algorithms.has(unit)?'Fundamentals of algorithms':programming.has(unit)?'Programming':data.has(unit)?'Fundamentals of data representation':systems.has(unit)?'Computer systems':networks.has(unit)?'Computer networks':security.has(unit)?'Cyber security':databases.has(unit)?'Relational databases and SQL':'Ethical, legal and environmental impacts';
  return {topic,subtopic:title(unit),topicCode:topic.toUpperCase().replaceAll(' ','-')};
 }
 if(key==='DT'){
  const unit=parts.slice(2).join('-'),systems=new Set(['NEW-TECHNOLOGIES','ENERGY-GENERATION','ENERGY-STORAGE','MODERN-SMART-MATERIALS','SYSTEMS']),mechanisms=new Set(['MECHANISMS-MOTION','GEARS-LEVERS-CALCS','ELECTRONICS-COMPONENTS','ELECTRONICS-CALCS']),materials=new Set(['FORCES-STRESSES','MATERIAL-PROPERTIES','PAPER-BOARD','TIMBER','METALS-ALLOYS','POLYMERS','TEXTILES']),manufacture=new Set(['SOURCES-ORIGINS','FOOTPRINT','STOCK-FORMS','SCALES-PRODUCTION','TOOLS-PROCESSES','FINISHES']),design=new Set(['INVESTIGATION','DESIGN-STRATEGIES','DESIGN-COMMUNICATION','ERGONOMICS','SOCIAL-MORAL-ETHICAL','WORK-OF-OTHERS']);
  const topic=systems.has(unit)?'New and emerging technologies':mechanisms.has(unit)?'Energy, systems and mechanisms':materials.has(unit)?'Materials and their working properties':manufacture.has(unit)?'Manufacturing and material management':design.has(unit)?'Designing and communicating ideas':'Making, testing and technical principles';
  return {topic,subtopic:title(unit),topicCode:topic.toUpperCase().replaceAll(' ','-')};
 }
 if(key==='PE'){
  const unit=parts.slice(2).join('-'),anatomy=new Set(['SKELETON-FUNCTIONS','BONES-JOINTS','MUSCLES','MUSCLE-CONTRACTION','CARDIOVASCULAR','BLOOD-VESSELS','RESPIRATORY','AEROBIC-ANAEROBIC','EXERCISE-SHORT-TERM','EXERCISE-LONG-TERM','LEVERS','PLANES-AXES','JOINT-MOVEMENTS']),training=new Set(['HEALTH-FITNESS-COMPONENTS','SKILL-FITNESS-COMPONENTS','FITNESS-TESTS','PRINCIPLES-OF-TRAINING','TRAINING-METHODS','WARM-UP-COOL-DOWN','INJURIES','TRAINING-SEASONS']),psychology=new Set(['SKILL-CLASSIFICATION','GOAL-SETTING','INFO-PROCESSING','GUIDANCE-FEEDBACK','MENTAL-PREPARATION','AROUSAL-PERSONALITY','MOTIVATION-AGGRESSION']),social=new Set(['PARTICIPATION','COMMERCIALISATION','ETHICS-DEVIANCE','DRUGS']),health=new Set(['HEALTH-WELLBEING','SEDENTARY-LIFESTYLE','SOMATOTYPES-BODY-COMP','DIET-HYDRATION']);
  const topic=anatomy.has(unit)?'Applied anatomy and physiology':training.has(unit)?'Physical training':psychology.has(unit)?'Sports psychology':social.has(unit)?'Socio-cultural influences':health.has(unit)?'Health, fitness and wellbeing':'Use of data in physical education';
  return {topic,subtopic:title(unit),topicCode:topic.toUpperCase().replaceAll(' ','-')};
 }
 if(key==='ENGLANG'){
  const paper=parts.includes('P1')?'P1':parts.includes('P2')?'P2':'SKILLS';
  return {topic:paper==='P1'?'Paper 1: Explorations in creative reading and writing':paper==='P2'?"Paper 2: Writers' viewpoints and perspectives":'Writing craft and accuracy',subtopic:title(parts.slice(parts.indexOf(paper)+1).join('-')||parts.slice(2).join('-')),topicCode:paper};
 }
 const work=parts.find(p=>['MACBETH','ROMEO','CAROL','JEKYLL','INSPECTOR','POETRY','UNSEEN','SKILLS','FORM'].includes(p))??'SKILLS';
 const names={MACBETH:'Macbeth',ROMEO:'Romeo and Juliet',CAROL:'A Christmas Carol',JEKYLL:'The Strange Case of Dr Jekyll and Mr Hyde',INSPECTOR:'An Inspector Calls',POETRY:'Power and Conflict poetry',UNSEEN:'Unseen poetry',SKILLS:'Literature assessment skills',FORM:'Literary form and terminology'};
 return {topic:names[work],subtopic:title(parts.slice(parts.indexOf(work)+1).join('-')||work),topicCode:work};
}
function transform(q,index,key,cfg){
 const suffix=String(q.question_id.match(/(\d+)$/)?.[1]??index+1).padStart(3,'0');
 const hard=q.difficulty==='higher_hard',tiered=key==='CHEM'||key==='BIO';
 const difficulty=q.difficulty==='foundation_higher_easy'?'foundation_higher_easy':hard&&tiered?'higher_only_standard':'foundation_higher_standard';
 const misconception_feedback=Object.entries(q.option_feedback??{}).map(([option,feedback])=>({misconception:`Selecting option ${option}.`,feedback}));
 return {...q,question_id:cfg.prefix+suffix,difficulty,sourceDifficulty:q.difficulty.endsWith('easy')?'easy':hard?'hard':'medium',tier:hard&&tiered?'higher':'both',self_check:{...q.self_check,misconception_feedback}};
}

let questions=JSON.parse(fs.readFileSync(questionPath,'utf8'));
const curriculum=JSON.parse(fs.readFileSync(curriculumPath,'utf8'));
const imported=[],newPoints=[];
for(const input of inputs){
 const source=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
 if(!Array.isArray(source)||!source.length)throw Error(path.basename(input)+' is empty or is not a JSON array.');
 const [key,cfg]=configFor(source[0]);
 source.forEach((q,index)=>imported.push(transform(q,index,key,cfg)));
 for(const spec of [...new Set(source.map(q=>q.specification_point_id))]){
  const h=hierarchy(key,spec),sample=source.find(q=>q.specification_point_id===spec);
  newPoints.push({subject_id:cfg.subject_id,topic_id:`AQA${cfg.code}-${h.topicCode}`,subtopic_id:`AQA${cfg.code}-${h.topicCode}-${spec}`,specification_point_id:spec,exam_board:'AQA',topic:h.topic,subtopic:h.subtopic,spec_reference:spec,spec_text:`Apply knowledge and retrieval skills for ${h.subtopic.toLowerCase()}.`,tier:'all',keywords:[...new Set((sample?.model_answer??h.subtopic).toLowerCase().match(/[a-z][a-z'-]{3,}/g)?.slice(0,8)??[])],...(h.historyOption?{historyOption:h.historyOption}:{}),...(h.geographyOption?{geographyOption:h.geographyOption}:{})});
 }
 console.log(`${cfg.name}: ${source.length} questions across ${new Set(source.map(q=>q.specification_point_id)).size} specification points`);
}
const prefixes=[...new Set(imported.map(q=>q.question_id.replace(/\d+$/,'')))];
questions=questions.filter(q=>!prefixes.some(prefix=>q.question_id.startsWith(prefix)));
const importPointIds=new Set(newPoints.map(p=>p.specification_point_id));
curriculum.records=curriculum.records.filter(p=>!importPointIds.has(p.specification_point_id));
curriculum.records.push(...newPoints);
questions.push(...imported);
const subjectMeta=new Map((curriculum.subjects??[]).map(s=>[s.subject_id,s]));
for(const cfg of Object.values(configs))subjectMeta.set(cfg.subject_id,{subject_id:cfg.subject_id,name:cfg.name,qualification:'GCSE',exam_board:'AQA',specification_code:cfg.code});
for(const [subject_id,name,code] of [['GCSE-PHYSICS','Physics','8463'],['GCSE-MATHS','Maths','8300'],['GCSE-GEOGRAPHY','Geography','8035']])if(!subjectMeta.has(subject_id))subjectMeta.set(subject_id,{subject_id,name,qualification:'GCSE',exam_board:'AQA',specification_code:code});
curriculum.subjects=[...subjectMeta.values()];
fs.writeFileSync(questionPath,JSON.stringify(questions,null,2)+'\n');
fs.writeFileSync(curriculumPath,JSON.stringify(curriculum,null,2)+'\n');
console.log(`Imported ${imported.length} questions and ${newPoints.length} curriculum points. Total questions: ${questions.length}.`);
