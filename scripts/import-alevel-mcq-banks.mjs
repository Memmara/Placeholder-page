import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const questionPath=path.join(root,'public/data/questions.json');
const curriculumPath=path.join(root,'public/data/curriculum.json');
const inputs=process.argv.slice(2);
if(!inputs.length)throw Error('Pass the five A-level MCQ JSON files to import.');

const configs={
 '7037':{subject_id:'A-LEVEL-GEOGRAPHY',code:'7037',prefix:'AQA7037-ALGEO-MCQ-',name:'Geography'},
 '7132':{subject_id:'A-LEVEL-BUSINESS',code:'7132',prefix:'AQA7132-ALBUS-MCQ-',name:'Business'},
 '7136':{subject_id:'A-LEVEL-ECONOMICS',code:'7136',prefix:'AQA7136-ALECON-MCQ-',name:'Economics'},
 '7152':{subject_id:'A-LEVEL-POLITICS',code:'7152',prefix:'AQA7152-ALPOL-MCQ-',name:'Politics'},
 '7182':{subject_id:'A-LEVEL-PSYCHOLOGY',code:'7182',prefix:'AQA7182-ALPSY-MCQ-',name:'Psychology'},
 '7192':{subject_id:'A-LEVEL-SOCIOLOGY',code:'7192',prefix:'AQA7192-ALSOC-MCQ-',name:'Sociology'},
 '7042':{subject_id:'A-LEVEL-HISTORY',code:'7042',prefix:'AQA7042-ALHIST-MCQ-',name:'History'},
 '7357':{subject_id:'A-LEVEL-MATHEMATICS',code:'7357',prefix:'AQA7357-ALMATH-MCQ-',name:'Mathematics'},
 '7367':{subject_id:'A-LEVEL-FURTHER-MATHS',code:'7367',prefix:'AQA7367-ALFM-MCQ-',name:'Further Maths'},
 '7408':{subject_id:'A-LEVEL-PHYSICS',code:'7408',prefix:'AQA7408-ALPHY-MCQ-',name:'Physics'},
 '7402':{subject_id:'A-LEVEL-BIOLOGY',code:'7402',prefix:'AQA7402-ALBIO-MCQ-',name:'Biology'}
 ,'7712':{subject_id:'A-LEVEL-ENGLISH-LITERATURE',code:'7712',prefix:'AQA7712-ALELIT-MCQ-',name:'English Literature'}
};
const title=value=>value.toLowerCase().split('-').map(word=>({dna:'DNA',rna:'RNA',atp:'ATP',pcr:'PCR',gdp:'GDP',ped:'PED',pes:'PES',xed:'XED',yed:'YED',csr:'CSR',mnc:'MNC',hr:'HR',rm:'Research methods'}[word]??word.charAt(0).toUpperCase()+word.slice(1))).join(' ');
const groups={
 '7037':{
  'Water and carbon cycles':new Set(['WCC']),
  'Coastal systems and landscapes':new Set(['COAST']),
  Hazards:new Set(['HAZ']),
  'Ecosystems under stress':new Set(['ECO']),
  'Changing places':new Set(['PLACE']),
  'Contemporary urban environments':new Set(['URBAN']),
  'Global systems and governance':new Set(['GLOBAL']),
  'Population and the environment':new Set(['POP']),
  'Geographical skills and fieldwork':new Set(['SKILLS'])
 },
 '7152':{
  'Democracy and participation':new Set(['DEM']),
  'Political parties':new Set(['PARTIES']),
  'Electoral systems':new Set(['ELECT']),
  'Voting behaviour and the media':new Set(['VOTING']),
  Conservatism:new Set(['CONS']),
  Liberalism:new Set(['LIB']),
  Socialism:new Set(['SOC']),
  'The UK constitution':new Set(['CONST']),
  Parliament:new Set(['PARL']),
  'The executive and judiciary':new Set(['EXEC']),
  'US government and politics':new Set(['USA'])
 },
 '7712':{
  'Literary terminology':new Set(['TERMS']),
  'Literary contexts':new Set(['CTX']),
  'Critical approaches':new Set(['CRIT']),
  'Love through the ages':new Set(['LOVE']),
  Othello:new Set(['OTH']),
  'Tess of the D’Urbervilles':new Set(['TESS']),
  'The Great Gatsby':new Set(['GAT']),
  Atonement:new Set(['ATO']),
  Poetry:new Set(['POE']),
  'World War One literature':new Set(['WW1']),
  'Modern times literature':new Set(['MOD'])
 },
 '7192':{
  Education:new Set(['ED']),
  'Research methods':new Set(['METH']),
  'Theory and methods':new Set(['THEORY']),
  'Crime and deviance':new Set(['CRIME']),
  'Families and households':new Set(['FAM']),
  'Beliefs in society':new Set(['BEL']),
  Media:new Set(['MEDIA']),
  'Social stratification':new Set(['STRAT']),
  'Culture and identity':new Set(['CULT'])
 },
 '7042':{
  'The Tudors: England, 1485–1603':new Set(['TUD']),
  'Revolution and dictatorship: Russia, 1917–1953':new Set(['RUS']),
  'Democracy and Nazism: Germany, 1918–1945':new Set(['GER']),
  'The making of modern Britain, 1851–2007':new Set(['BRI'])
 },
 '7132':{
  Finance:new Set(['FIN','COSTS','CASH','BUDGETS','BREAK','BALANCE','INCOME','RATIOS','INVESTMENT']),
  Marketing:new Set(['MARKET','SEGMENTATION','MARKETING','PRODUCT','PRICING','PROMOTION','DIGITAL','ANSOFF','PORTER']),
  'People and management':new Set(['MOTIVATION','HR','RECRUITMENT','TRAINING','EMPLOYER','WORKFORCE','LEADERSHIP','MANAGEMENT','ORG','CULTURE']),
  Operations:new Set(['OPS','PRODUCTIVITY','CAPACITY','QUALITY','STOCK','SUPPLY','LEAN','CRITICAL']),
  'Strategy and the business environment':new Set(['GROWTH','GLOBAL','ENVIRONMENT','TECHNOLOGY','DECISION','SWOT','CONTINGENCY','CHANGE','RESISTANCE','PURPOSE','STAKEHOLDERS','LEGAL','ENTREPRENEURS'])
 },
 '7136':{
  'Microeconomic foundations':new Set(['METHOD','SCARCITY','PPF','DEMAND','SUPPLY','EQUILIBRIUM','PED','PES','XED','YED','REVENUE','BEHAVIOURAL']),
  'Firms and labour markets':new Set(['SR','LR','PERFECT','MONOPOLISTIC','OLIGOPOLY','MONOPOLY','CONTESTABILITY','LABOUR','WAGES']),
  'Market failure and government intervention':new Set(['EXTERNALITIES','PUBLIC','INFO','GOV','INTERVENTION','TAX','SURPLUS']),
  Macroeconomics:new Set(['CIRCULAR','AD','AS','GDP','GROWTH','INFLATION','UNEMPLOYMENT','BOP','MULTIPLIER','MACRO','FISCAL','MONETARY','POLICY','FINANCIAL']),
  'International and development economics':new Set(['TRADE','COMPARATIVE','PROTECTION','EXCHANGE','GLOBALISATION','DEV','INEQUALITY'])
 },
 '7182':{
  'Introductory topics':new Set(['SOC','MEM','ATT','PSYP']),
  'Psychology in context':new Set(['APP','BIO','RM']),
  'Issues and options':new Set(['ISS','SCZ','GEN','COG','ADD','EAT','AGG','FOR','REL','STRESS'])
 },
 '7357':{
  'Pure mathematics':new Set(['ARITHMETIC','BINOMIAL','CHAIN','CIRCLES','COMPOUND','CONNECTED','DEFINITE','DIFF','DIFFERENTIAL','EXPONENTIALS','FACTOR','FUNCTIONS','GEOMETRIC','GRAPH','IMPLICIT','INDICES','INEQUALITIES','INTEGRATION','LOG','MODELLING','MODULUS','NUMERICAL','OPTIMISATION','PARAMETRIC','PARTIAL','PRODUCT','PROOF','QUADRATIC','R','RADIANS','SEQUENCES','SIMULTANEOUS','SINE','STATIONARY','STRAIGHT','TANGENTS','TRANSFORMATIONS','TRIG','VECTOR','VECTORS']),
  Statistics:new Set(['CORRELATION','DATA','DISTRIBUTIONS','HYPOTHESIS','PROBABILITY','SAMPLING']),
  Mechanics:new Set(['FORCES','KINEMATICS','MOMENTS','PROJECTILES'])
 },
 '7367':{
  'Core pure mathematics':new Set(['COMPLEX','MATRIX','ROOTS','PROOF','POLAR','CONICS','SERIES','RATIONAL','PLANES','NUMERICAL','METHOD','DISTANCES','MEAN','VECTOR','MACLAURIN','LINES','INVERSE','INTEGRATION','INEQUALITIES','IMPROPER','HYPERBOLIC','DIFF','DE','VOLUMES']),
  Statistics:new Set(['STATS']),
  Mechanics:new Set(['MECH'])
 },
 '7408':{
  'Practical skills and measurements':new Set(['SI','UNCERTAINTIES','ESTIMATES']),
  'Particles and radiation':new Set(['ATOM','STRONG','PARTICLES','EXCHANGE','HADRONS','CONSERVATION','PHOTOELECTRIC','ENERGY','WAVE']),
  Waves:new Set(['PROGRESSIVE','POLARISATION','STATIONARY','INTERFERENCE','DIFFRACTION','REFRACTION']),
  'Mechanics and materials':new Set(['SCALARS','MOMENTS','MOTION','PROJECTILES','NEWTON','MOMENTUM','WORK','DENSITY','STRESS']),
  Electricity:new Set(['CURRENT','PD','IV','RESISTIVITY','CIRCUITS','EMF','POTENTIAL','ELECTRICAL']),
  'Further mechanics and thermal physics':new Set(['CIRCULAR','SHM','THERMAL','IDEAL','KINETIC']),
  Fields:new Set(['GRAVITATIONAL','ELECTRIC','CAPACITANCE','CAPACITOR','MAGNETIC','INDUCTION','AC']),
  'Nuclear physics':new Set(['DECAY','HALF','BINDING','FISSION','RADIATION','NUCLEAR'])
 },
 '7402':{
  'Biological molecules and cells':new Set(['BIOMOLECULES','LIPIDS','PROTEINS','ENZYMES','ENZYME','ATP','DNA','CELL','MEMBRANE','ACTIVE','MICROSCOPY','MAGNIFICATION','MITOSIS','BIOCHEMICAL']),
  'Exchange and transport':new Set(['SURFACE','GAS','DIGESTION','HAEMOGLOBIN','HEART','TRANSPORT','XYLEM','PHLOEM']),
  'Genetics, variation and evolution':new Set(['GENETIC','VARIATION','TAXONOMY','EVOLUTION','INHERITANCE','MUTATIONS','GENE','EPIGENETICS','EPISTASIS','HARDY','RECOMBINANT']),
  'Energy and ecosystems':new Set(['PHOTOSYNTHESIS','CALVIN','RESPIRATION','OXIDATIVE','ENERGY','NUTRIENT','POPULATIONS','SUCCESSION','BIODIVERSITY']),
  'Responses, control and immunity':new Set(['STIMULI','NERVE','SYNAPSES','MUSCLE','HOMEOSTASIS','KIDNEY','ANTIGENS','VACCINATION','STEM','TISSUE','PROTEIN'])
 }
};
function topicFor(code,spec){
 const parts=spec.split('-'),token=parts[2]??'CONTENT';
 const topic=Object.entries(groups[code]??{}).find(([,tokens])=>tokens.has(token))?.[0]??title(token);
 return {topic,subtopic:title(parts.slice(2).join('-')),topicCode:topic.toUpperCase().replace(/[^A-Z0-9]+/g,'-')};
}
function validateSource(source,file){
 const ids=new Set();
 for(const q of source){
  if(!q?.question_id||ids.has(q.question_id)||!q.specification_point_id||q.question_type!=='multiple_choice'||q.response_format!=='single_select')throw Error(`${file}: invalid or duplicate question ${q?.question_id??'(missing ID)'}`);
  const optionIds=q.options?.map(option=>option.option_id)??[],correct=q.answer_key?.correct_option_ids;
  if(optionIds.length<2||new Set(optionIds).size!==optionIds.length||!Array.isArray(correct)||correct.length!==1||!optionIds.includes(correct[0]))throw Error(`${file}: invalid options for ${q.question_id}`);
  if(!q.self_check?.criteria?.length||q.self_check.answer_reveal_policy!=='after_attempt')throw Error(`${file}: invalid self-check for ${q.question_id}`);
  ids.add(q.question_id);
 }
}
function transform(q,index,cfg){
 const suffix=String(q.question_id.match(/(\d+)$/)?.[1]??index+1).padStart(3,'0');
 const misconception_feedback=Object.entries(q.option_feedback??{}).map(([option,feedback])=>({misconception:`Selecting option ${option}.`,feedback}));
 return {...q,question_id:cfg.prefix+suffix,difficulty:q.difficulty==='easy'?'foundation_higher_easy':'foundation_higher_standard',sourceDifficulty:q.difficulty,tier:'both',self_check:{...q.self_check,misconception_feedback}};
}

let questions=JSON.parse(fs.readFileSync(questionPath,'utf8'));
const curriculum=JSON.parse(fs.readFileSync(curriculumPath,'utf8'));
const imported=[],newPoints=[],loaded=[];
for(const input of inputs){
 const file=path.resolve(input),source=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(source)||!source.length)throw Error(path.basename(file)+' is empty or is not a JSON array.');
 validateSource(source,path.basename(file));
 const code=source[0].specification_point_id.split('-')[1],cfg=configs[code];
 if(!cfg)throw Error('Unsupported A-level specification code '+code);
 source.forEach((q,index)=>imported.push(transform(q,index,cfg)));
 for(const spec of [...new Set(source.map(q=>q.specification_point_id))]){
  const h=topicFor(code,spec),sample=source.find(q=>q.specification_point_id===spec);
  const words=(sample?.model_answer??h.subtopic).toLowerCase().match(/[a-z][a-z'-]{3,}/g)??[];
  newPoints.push({subject_id:cfg.subject_id,topic_id:`AQA${code}-${h.topicCode}`,subtopic_id:`AQA${code}-${h.topicCode}-${spec}`,specification_point_id:spec,exam_board:'AQA',topic:h.topic,subtopic:h.subtopic,spec_reference:spec,spec_text:`Apply A-level knowledge and retrieval skills for ${h.subtopic.toLowerCase()}.`,tier:'all',keywords:[...new Set(words)].slice(0,8)});
 }
 loaded.push({subject:cfg.name,questions:source.length,specificationPoints:new Set(source.map(q=>q.specification_point_id)).size});
}
const prefixes=[...new Set(imported.map(q=>q.question_id.replace(/\d+$/,'')))];
questions=questions.filter(q=>!prefixes.some(prefix=>q.question_id.startsWith(prefix)));
const pointIds=new Set(newPoints.map(point=>point.specification_point_id));
curriculum.records=curriculum.records.filter(point=>!pointIds.has(point.specification_point_id));
curriculum.records.push(...newPoints);
questions.push(...imported);
const subjects=new Map((curriculum.subjects??[]).map(subject=>[subject.subject_id,subject]));
for(const cfg of Object.values(configs))subjects.set(cfg.subject_id,{subject_id:cfg.subject_id,name:cfg.name,qualification:'A-Level',exam_board:'AQA',specification_code:cfg.code});
curriculum.subjects=[...subjects.values()];
fs.writeFileSync(questionPath,JSON.stringify(questions,null,2)+'\n');
fs.writeFileSync(curriculumPath,JSON.stringify(curriculum,null,2)+'\n');
for(const entry of loaded)console.log(`${entry.subject}: ${entry.questions} questions across ${entry.specificationPoints} specification points`);
console.log(`Imported ${imported.length} A-level questions and ${newPoints.length} curriculum points. Total questions: ${questions.length}.`);
