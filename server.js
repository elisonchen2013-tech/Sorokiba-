const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const {createKibaBrain}=require('./kiba-brain');
const {spawn}=require('child_process');

const kibaPythonSessions=new Map();
const kibaProposalDrafts=new Map();
const KIBA_PROPOSAL_DRAFT_TTL_MS=10*60*1000;
const pruneKibaProposalDrafts=()=>{
  const now=Date.now();
  for(const [id,draft] of kibaProposalDrafts){
    if(draft.expiresAt<=now)kibaProposalDrafts.delete(id);
  }
};
let kibaPython=null;
let kibaPythonBuffer='';
let kibaPythonRequestCounter=0;
const kibaPythonWaiters=new Map();

function rejectAllKibaPython(reason){
  for(const [id,waiter] of kibaPythonWaiters){
    clearTimeout(waiter.timer);
    waiter.reject(reason);
  }
  kibaPythonWaiters.clear();
}

function startKibaPython(){
  if(kibaPython||process.env.KIBA_PYTHON_DISABLED==='1')return;
  try{
    kibaPython=spawn(process.env.KIBA_PYTHON||'python3',[path.join(__dirname,'kiba_ai.py')],{stdio:['pipe','pipe','pipe']});
    kibaPython.stdout.on('data',chunk=>{
      kibaPythonBuffer+=chunk.toString();
      let idx;
      while((idx=kibaPythonBuffer.indexOf('\n'))>=0){
        const line=kibaPythonBuffer.slice(0,idx).trim();
        kibaPythonBuffer=kibaPythonBuffer.slice(idx+1);
        if(!line)continue;
        try{
          const parsed=JSON.parse(line);
          const requestId=String(parsed?.requestId||'');
          const waiter=kibaPythonWaiters.get(requestId);
          if(waiter){
            clearTimeout(waiter.timer);
            kibaPythonWaiters.delete(requestId);
            waiter.resolve(parsed);
          }else{
            console.warn('Resposta tardia do Kiba Python ignorada:',requestId||'sem id');
          }
        }catch(e){
          console.warn('Resposta inválida do Kiba Python ignorada:',e.message);
        }
      }
    });
    kibaPython.stderr.on('data',chunk=>console.error('[Kiba Python]',chunk.toString().trim()));
    kibaPython.on('error',err=>{
      console.error('Kiba Python indisponível:',err.message);
      rejectAllKibaPython(err);
      kibaPython=null;
    });
    kibaPython.on('exit',()=>{
      kibaPython=null;
      kibaPythonBuffer='';
      rejectAllKibaPython(new Error('Kiba Python encerrou'));
    });
  }catch(err){
    console.error('Não foi possível iniciar Kiba Python:',err.message);
    kibaPython=null;
  }
}

function askKibaPython(payload){
  startKibaPython();
  return new Promise((resolve,reject)=>{
    if(!kibaPython)return reject(new Error('Python indisponível'));
    const requestId='kiba_py_'+(++kibaPythonRequestCounter)+'_'+Date.now().toString(36);
    const timer=setTimeout(()=>{
      if(kibaPythonWaiters.has(requestId)){
        kibaPythonWaiters.delete(requestId);
        try{if(kibaPython&&!kibaPython.killed)kibaPython.kill();}
        catch(e){}
        kibaPython=null;
        kibaPythonBuffer='';
        reject(new Error('Kiba Python timeout'));
      }
    },3500);
    kibaPythonWaiters.set(requestId,{resolve,reject,timer});
    try{
      kibaPython.stdin.write(JSON.stringify({...payload,requestId})+'\n');
    }catch(err){
      clearTimeout(timer);
      kibaPythonWaiters.delete(requestId);
      reject(err);
    }
  });
}
function kibaPythonSession(user){
  const key=String(user?.username||'anonymous');
  if(!kibaPythonSessions.has(key))kibaPythonSessions.set(key,{recentResponses:[],conversation:[]});
  return kibaPythonSessions.get(key);
}
function safeKibaUser(user){
  if(!user)return {};
  return {
    username:user.username,name:user.name,isMayor:!!user.isMayor,
    money:Number(user.money||0),bankBalance:Number(user.bankBalance||0),
    level:Number(user.level||1),xp:Number(user.xp||0),
    jobId:user.jobId,jobName:user.jobName,
    inventory:user.inventory&&typeof user.inventory==='object'?user.inventory:{}
  };
}

const kibaEmergencyAnswer=(question,user)=>{
  const q=String(question||'').toLowerCase();
  const name=String(user?.name||'cidadão').split(/\s+/)[0]||'cidadão';
  if(/\bxp\b|experiencia|nivel/.test(q))return name+', no momento estou usando meu modo de segurança. Seu perfil registra '+Number(user?.xp||0)+' XP e nível '+Number(user?.level||1)+'.';
  if(/dinheiro|saldo|grana|banco/.test(q))return name+', meu modo de segurança encontrou '+Number(user?.money||0).toLocaleString('pt-BR')+' de dinheiro disponível no seu perfil.';
  if(/profissao|emprego|trabalho|carreira/.test(q))return name+', posso consultar as profissões de Sorokiba. Minha consulta principal demorou, então o modo de segurança está respondendo agora.';
  return 'Consegui receber sua pergunta, mas a pesquisa principal demorou. O Kiba continua disponível em modo de segurança e não vai ficar preso pensando.';
};

const app = express();
app.use(cors());
app.use(bodyParser.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname)));

const fs = require('fs');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

let users = {};
let kibaMemories = {};
let city = { population:0, economy:8500, infrastructure:65, quality:72, taxRate:15, treasury:50000, news:[], events:[], proposals:[], missionRewards:{}, companies:[], redeemCodes:[] };

const companyTypes={moda:{label:'Moda',description:'Roupas, tênis, bonés e óculos.',productTypes:['roupa']},tecnologia:{label:'Tecnologia',description:'Celulares e outros produtos tecnológicos.',productTypes:['tecnologia']},automotiva:{label:'Automotiva',description:'Carros e outros veículos da cidade.',productTypes:['veiculo']},alimentacao:{label:'Alimentação',description:'Comidas e bebidas consumíveis.',productTypes:['consumivel']}};
const inferCompanyType=c=>{if(companyTypes[c?.companyType])return c.companyType;const t=c?.products?.[0]?.type;return({roupa:'moda',tecnologia:'tecnologia',veiculo:'automotiva',consumivel:'alimentacao',decoracao:'casa',equipamento:'equipamentos'})[t]||'varejo'};
const ensureCompanyData=()=>{if(!city||typeof city!=='object')city={};if(!Array.isArray(city.companies))city.companies=[];city.companies.forEach(c=>{if(!Array.isArray(c.products))c.products=[];if(!Number.isFinite(Number(c.balance)))c.balance=0;c.companyType=inferCompanyType(c)})};
const processCompanyFees=()=>{
  if(!city||!Array.isArray(city.companies))return;
  let changed=false;
  const now=Date.now(),week=7*24*60*60*1000;
  city.companies.forEach(c=>{
    if(!c.nextFeeAt)c.nextFeeAt=new Date(now+week).toISOString();
    while(new Date(c.nextFeeAt).getTime()<=now){
      const owner=users[c.ownerUsername],fee=250;
      let paid=0;
      if(Number(c.balance||0)>=fee){c.balance-=fee;paid=fee}
      else if(owner&&Number(owner.money||0)>=fee){owner.money-=fee;paid=fee}
      if(paid){
        city.treasury=Number(city.treasury||0)+paid;
        c.lastFee={date:new Date().toISOString(),amount:paid,status:'paid'};
        c.nextFeeAt=new Date(new Date(c.nextFeeAt).getTime()+week).toISOString();
      }else{
        c.lastFee={date:new Date().toISOString(),amount:fee,status:'pending'};
        c.feeDebt=(Number(c.feeDebt)||0)+fee;
        c.nextFeeAt=new Date(new Date(c.nextFeeAt).getTime()+week).toISOString();
      }
      changed=true;
    }
  });
  if(changed)saveData();
};
const loadData = async () => {
  try {
    users = (await db.get('users')) || users;
    kibaMemories = (await db.get('kibaMemories')) || kibaMemories;
    if(!kibaMemories || typeof kibaMemories!=='object')kibaMemories={};
    Object.values(users).forEach(u=>{if(!u.inventory)u.inventory={};if(!u.companyInventory)u.companyInventory={};if(!u.hospitalPharmacyInventory||typeof u.hospitalPharmacyInventory!=='object')u.hospitalPharmacyInventory={};if(!u.rewardAccessories)u.rewardAccessories={};if(!u.rewardItems)u.rewardItems={};if(!u.character)u.character=defaultCharacter();if(u.equippedVehicleProductId===undefined)u.equippedVehicleProductId=null;if(!Array.isArray(u.tokens)){u.tokens=u.token?[u.token]:[]}u.tokens=u.tokens.filter(t=>typeof t==='string'&&t).slice(-8);if(u.token&&!u.tokens.includes(u.token))u.tokens.push(u.token)});
    city = (await db.get('city')) || city;
    Object.values(users).forEach(u=>{if(!u.cityPass||typeof u.cityPass!=='object')u.cityPass={seasonId:'city-pass-v1',xp:0,claimedRewards:[],candies:0,tickets:0,daily:null,weekly:null};if(!Number.isFinite(Number(u.cityPass.xp)))u.cityPass.xp=0;if(!Array.isArray(u.cityPass.claimedRewards))u.cityPass.claimedRewards=[];u.cityPass.candies=Math.max(0,Number(u.cityPass.candies)||0);u.cityPass.tickets=Math.max(0,Number(u.cityPass.tickets)||0)});
    ensureRedeemCodes();
    const qb = await db.get('questionBank');
    if (qb) Object.assign(questionBank, qb);
    ensureCompanyData();
  } catch(e){ console.error('Falha ao carregar do Postgres',e); ensureCompanyData(); }
};

let serverInitError=null;
const serverReadyPromise=(async()=>{
  try{
    await db.init();
    await loadData();
  }catch(err){
    serverInitError=err;
    console.error('❌ Falha ao inicializar o banco:',err);
  }
})();

// Arquivos estáticos podem abrir imediatamente; APIs só prosseguem depois que o banco estiver pronto.
app.use((req,res,next)=>{
  if(!req.path.startsWith('/api/')) return next();
  serverReadyPromise.then(()=>{
    if(serverInitError)return res.status(503).json({error:'O servidor ainda está inicializando o banco. Tente novamente em alguns segundos.'});
    next();
  }).catch(()=>res.status(503).json({error:'O servidor ainda está inicializando.'}));
});

let saveTimer=null;
const saveData=()=>{if(saveTimer)return;saveTimer=setTimeout(async()=>{saveTimer=null;try{await db.set('users',users);await db.set('city',city);await db.set('questionBank',questionBank);await db.set('kibaMemories',kibaMemories);if(typeof updateKibaChangeLog==='function')await updateKibaChangeLog(buildKibaGameSnapshot())}catch(e){console.error('Falha ao salvar no Postgres',e)}},500)};
setInterval(()=>processCompanyFees(),60*60*1000);
let tokenCounter=0;
const generateToken=()=>`token_${++tokenCounter}_${Date.now()}`;
const createUser=(name,username,password,isMayor,recoveryCode=null)=>({
  name:String(name).trim().slice(0,80),
  username:String(username).trim(),
  password:String(password),
  recoveryCode:recoveryCode?String(recoveryCode).trim().slice(0,120):null,
  isMayor:!!isMayor,
  token:null,
  tokens:[],
  money:1000,
  bankBalance:0,
  level:1,
  xp:0,
  jobId:'estudante',
  jobName:'Estudante',
  life:100,
  hunger:100,
  hydration:100,
  energy:100,
  inventory:{},
  hospitalPharmacyInventory:{},
  companyInventory:{},
  equippedCompanyProducts:{},
  equippedVehicleProductId:null,
  character:defaultCharacter(),
  achievements:[],
  answeredQuestions:[],
  questionUsage:{},
  missionBatchCount:0,
  missionCooldownUntil:null,
  professionalXpByJob:{},
  transactions:[],
  cityPass:{seasonId:'city-pass-v1',xp:0,claimedRewards:[],candies:0,tickets:0,daily:null,weekly:null},
  createdAt:new Date().toISOString(),
  countedInPopulation:false
});


const jobs=[
{id:'estudante',name:'Estudante',salary:100,xpRequired:0,task:'Estude para o futuro',icon:'🎓'},
{id:'entregador',name:'Entregador de Food',salary:250,xpRequired:200,task:'Faça entregas pela cidade',icon:'📦'},
{id:'mecanico',name:'Mecânico',salary:400,xpRequired:400,task:'Conserte veículos e máquinas',icon:'🔧'},
{id:'professor',name:'Professor',salary:500,xpRequired:600,task:'Ensine as próximas gerações',icon:'📚'},
{id:'policial',name:'Policial',salary:600,xpRequired:700,task:'Proteja a cidade',icon:'🛡️'},
{id:'eletricista',name:'Eletricista',salary:650,xpRequired:900,task:'Instale e mantenha sistemas elétricos',icon:'⚡'},
{id:'investigador',name:'Investigador',salary:700,xpRequired:1100,task:'Investigue crimes e mistérios',icon:'🕵️'},
{id:'advogado',name:'Advogado',salary:750,xpRequired:1300,task:'Defenda clientes',icon:'⚖️'},
{id:'militar',name:'Militar',salary:800,xpRequired:1500,task:'Atue na defesa e segurança nacional',icon:'🎖️'},
{id:'engenheiro',name:'Engenheiro',salary:850,xpRequired:1800,task:'Construa infraestrutura',icon:'🏗️'},
{id:'medico',name:'Médico',salary:950,xpRequired:2200,task:'Trate dos enfermos',icon:'⚕️'},
{id:'juiz',name:'Juiz do Tribunal',salary:1200,xpRequired:3000,task:'Julgue casos importantes',icon:'🏛️'}];

const questionBank={
 estudante:[{id:'e1',text:'Qual é a capital do Brasil?',options:['São Paulo','Brasília','Rio de Janeiro','Salvador'],correct:1,difficulty:1},{id:'e2',text:'2+2 é?',options:['3','4','5','22'],correct:1,difficulty:1}],
 medico:[{id:'m1',text:'Febre, dor de garganta e tosse: qual a causa mais provável?',options:['Dengue','Gripe','Diabetes','Hipertensão'],correct:1,difficulty:1},{id:'m2',text:'Qual exame é usado para verificar fraturas ósseas?',options:['Ressonância','Ultrassom','Raio-X','ECG'],correct:2,difficulty:2}],
 policial:[{id:'p1',text:'Ao abordar um suspeito, o policial deve:',options:['Ignorar','Insistir sem backup','Garantir segurança e chamar apoio','Filmar com celular'],correct:2,difficulty:1}],
 entregador:[{id:'d1',text:'Melhor prática para entregas seguras:',options:['Dirigir rápido','Ignorar endereços','Conferir pedido antes de sair','Levar menos itens'],correct:2,difficulty:1}],
 eletricista:[{id:'el1',text:'Qual equipamento é usado para medir tensão elétrica?',options:['Termômetro','Multímetro','Bússola','Cronômetro'],correct:1,difficulty:1},{id:'el2',text:'Antes de trabalhar em uma instalação elétrica, uma medida essencial é:',options:['Aumentar a tensão','Desligar e verificar a ausência de energia','Molhar os fios','Retirar a proteção'],correct:1,difficulty:2}],
 militar:[{id:'mi1',text:'Em uma situação de emergência, uma prioridade de uma equipe militar é:',options:['Ignorar o plano','Manter comunicação e seguir protocolos','Agir sem coordenação','Abandonar os equipamentos'],correct:1,difficulty:1},{id:'mi2',text:'Para uma operação organizada, é importante:',options:['Comunicação clara','Trabalhar sem liderança','Ignorar informações','Mudar o plano sem comunicar'],correct:0,difficulty:1}],
 generic:[{id:'g1',text:'Qual é a cor do céu em um dia claro?',options:['Azul','Verde','Vermelho','Amarelo'],correct:0,difficulty:1}]};
try{const qfile=path.join(DATA_DIR,'questionBank.json');if(fs.existsSync(qfile))Object.assign(questionBank,JSON.parse(fs.readFileSync(qfile,'utf8')))}catch(e){console.error('Failed loading questionBank.json',e)}
try{if(!city.missionRewards)city.missionRewards={};jobs.forEach(j=>{if(!city.missionRewards[j.id]){const money=Math.max(50,Math.floor(j.salary*.15));const xp=Math.max(20,Math.floor(j.salary*.08));const questions=j.xpRequired>=1000?3:2;city.missionRewards[j.id]={moneyPerMission:money,xpPerMission:xp,questionsPerMission:questions}}})}catch(e){console.error('Failed initializing missionRewards',e)}

const shopItems=[
{id:1,name:'Pão Integral',price:10,hunger:30,icon:'🍞',description:'Um pão delicioso'},
{id:2,name:'Água',price:5,hydration:50,icon:'💧',description:'Água fresca'},
{id:3,name:'Maçã',price:8,hunger:20,energy:10,icon:'🍎',description:'Maçã vermelha'},
{id:4,name:'Refrigerante',price:7,hydration:20,energy:15,icon:'🥤',description:'Refrigerante gelado'},
{id:5,name:'Pizza',price:20,hunger:50,icon:'🍕',description:'Pizza quentinha'},
{id:6,name:'Café',price:6,energy:30,icon:'☕',description:'Café coado'}];
const hospitalServices=[
  {id:1,name:'Exame de sangue',icon:'🧪',category:'Laboratório',price:60,life:0,description:'Avalia hidratação, glicose e sinais de inflamação.',durationRange:'1–2 h no jogo',durationSeconds:[30,45],reason:'Indicado quando há fraqueza, hidratação baixa ou mal-estar.',estimatedTime:'1-2 horas'},
  {id:2,name:'Exame de urina',icon:'🧫',category:'Laboratório',price:40,life:0,description:'Ajuda a verificar hidratação e sinais urinários.',durationRange:'15–30 min no jogo',durationSeconds:[12,22],reason:'Pode complementar a avaliação quando há sede intensa ou mal-estar.',estimatedTime:'15-30 minutos'},
  {id:3,name:'Teste de glicose',icon:'🩸',category:'Laboratório',price:35,life:0,description:'Medição rápida de glicose com amostra capilar.',durationRange:'5–10 min no jogo',durationSeconds:[5,9],reason:'Ajuda a investigar fraqueza ou energia muito baixa.',estimatedTime:'5-10 minutos'},
  {id:4,name:'Raio-X',icon:'🩻',category:'Imagem',price:80,life:0,description:'Imagem para investigar lesões e alterações no tórax.',durationRange:'10–20 min no jogo',durationSeconds:[9,16],reason:'Indicado para dor localizada, lesão ou sintomas respiratórios.',estimatedTime:'10-20 minutos'},
  {id:5,name:'Eletrocardiograma',icon:'💓',category:'Monitoramento',price:60,life:0,description:'Registra o ritmo cardíaco e auxilia a avaliação de palpitações.',durationRange:'5–15 min no jogo',durationSeconds:[5,12],reason:'Recomendado para palpitações, tontura ou frequência cardíaca elevada.',estimatedTime:'5-15 minutos'},
  {id:6,name:'Avaliação respiratória',icon:'🫁',category:'Respiração',price:50,life:0,description:'Verifica oxigenação, frequência e esforço respiratório.',durationRange:'10–30 min no jogo',durationSeconds:[10,20],reason:'Indicada para falta de ar, tosse ou oxigenação baixa.',estimatedTime:'10-30 minutos'},
  {id:7,name:'Tomografia',icon:'🧠',category:'Imagem',price:150,life:0,description:'Imagem detalhada solicitada após avaliação médica.',durationRange:'15–30 min no jogo',durationSeconds:[13,23],reason:'Reservada a sintomas persistentes ou quadro que exige imagem detalhada.',estimatedTime:'15-30 minutos'},
  {id:8,name:'Ressonância',icon:'🧬',category:'Imagem',price:220,life:0,description:'Imagem de alta resolução solicitada para investigação complementar.',durationRange:'30–60 min no jogo',durationSeconds:[22,38],reason:'Pode ser solicitada pelo médico após avaliar os primeiros resultados.',estimatedTime:'30-60 minutos'}
];

const hospitalPharmacyItems=[
  {id:'soro-oral',name:'Sais de reidratação oral',category:'Hidratação',price:18.90,description:'Item de suporte para o indicador de hidratação do personagem.',gameEffect:{hydration:14,life:1},note:'Efeito fictício de jogo; não substitui avaliação médica.'},
  {id:'paracetamol',name:'Analgésico e antitérmico (genérico)',category:'Bem-estar',price:24.90,description:'Item de suporte para os indicadores de vida e energia do personagem.',gameEffect:{life:5,energy:3},note:'Efeito fictício de jogo; siga a orientação da médica.'},
  {id:'suplemento-energetico',name:'Suplemento de recuperação',category:'Recuperação',price:34.90,description:'Ajuda a recuperar energia e alimentação no jogo.',gameEffect:{energy:8,hunger:4},note:'Produto fictício de jogo; não trata doenças.'},
  {id:'antiemetico',name:'Suporte para desconforto gástrico',category:'Digestivo',price:29.90,description:'Pequeno apoio aos indicadores do personagem durante a recuperação.',gameEffect:{life:3,hydration:3},note:'Efeito fictício de jogo; não substitui acompanhamento.'},
  {id:'analgesico',name:'Analgésico de suporte (genérico)',category:'Bem-estar',price:27.90,description:'Item de suporte para o indicador de vida do personagem.',gameEffect:{life:5},note:'Efeito fictício de jogo; siga a orientação da médica.'},
  {id:'solucao-salina',name:'Solução salina',category:'Cuidados gerais',price:19.90,description:'Produto de cuidados gerais sem efeito de cura no jogo.',gameEffect:{hydration:2},note:'Efeito fictício de jogo; não trata pneumonia nem outras doenças.'},
  {id:'xarope-tosse',name:'Xarope de suporte para tosse (fictício)',category:'Respiração',price:39.90,description:'Item de suporte para o indicador de vida durante o acompanhamento do personagem.',gameEffect:{life:4,energy:2},note:'Produto fictício de jogo; não trata pneumonia nem substitui avaliação médica.'},
  {id:'pastilhas-garganta',name:'Pastilhas para garganta (fictícias)',category:'Respiração',price:18.90,description:'Item de suporte para energia do personagem durante a recuperação.',gameEffect:{energy:3},note:'Produto fictício de jogo; efeito limitado aos indicadores.'},
  {id:'antiacido',name:'Suporte digestivo (fictício)',category:'Digestivo',price:26.90,description:'Item de suporte para hidratação e energia do personagem.',gameEffect:{hydration:2,energy:2},note:'Produto fictício de jogo; não substitui avaliação médica.'},
  {id:'antialergico',name:'Suporte antialérgico (fictício)',category:'Bem-estar',price:32.90,description:'Item de suporte para energia do personagem.',gameEffect:{energy:4},note:'Produto fictício de jogo; não é medicamento real nem orientação de tratamento.'},
  {id:'kit-curativo',name:'Kit de curativos',category:'Cuidados gerais',price:24.90,description:'Item de apoio para recuperação do personagem após uma lesão no jogo.',gameEffect:{life:3},note:'Item fictício de jogo; não substitui cuidados médicos.'},
  {id:'multivitaminico',name:'Suplemento multivitamínico (fictício)',category:'Recuperação',price:44.90,description:'Item de suporte para energia e alimentação do personagem.',gameEffect:{energy:5,hunger:3},note:'Produto fictício de jogo; não previne nem trata doenças.'}
];
const hospitalConditions=[
  {id:'desidratacao',name:'Desidratação',baseProbability:0.34,severity:'Leve',lifeLoss:2,symptoms:['sede','tontura','fraqueza'],exams:[1,2],treatment:'Reidratação gradual e monitoramento.',medications:['Soro de hidratação do jogo'],pharmacyMedicationIds:['soro-oral'],recoverySeconds:[20,32],admissionThreshold:25},
  {id:'exaustao',name:'Exaustão corporal',baseProbability:0.28,severity:'Leve',lifeLoss:2,symptoms:['fraqueza','cansaço','fome'],exams:[1,3],treatment:'Repouso, alimentação e acompanhamento clínico.',medications:['Suplemento energético do jogo'],pharmacyMedicationIds:['suplemento-energetico'],recoverySeconds:[18,28],admissionThreshold:20},
  {id:'gripe',name:'Gripe',baseProbability:0.24,severity:'Leve',lifeLoss:2,symptoms:['febre','tosse','mal-estar'],exams:[1,6],treatment:'Repouso e acompanhamento dos sintomas.',medications:['Antitérmico fictício do jogo'],pharmacyMedicationIds:['paracetamol','xarope-tosse'],recoverySeconds:[20,30],admissionThreshold:25},
  {id:'febre-suspeita',name:'Quadro febril',baseProbability:0.22,severity:'Moderada',lifeLoss:3,symptoms:['febre','mal-estar','dor'],exams:[1],treatment:'Observação e tratamento conforme a resposta clínica.',medications:['Antitérmico fictício do jogo'],pharmacyMedicationIds:['paracetamol'],recoverySeconds:[24,38],admissionThreshold:25},
  {id:'diabetes',name:'Alteração glicêmica (investigação de diabetes)',baseProbability:0.12,severity:'Moderada',lifeLoss:2,symptoms:['sede','fraqueza','cansaço','fome'],exams:[3,1],treatment:'Monitoramento da glicose e retorno para confirmar a hipótese.',medications:['Plano de controle glicêmico do jogo'],pharmacyMedicationIds:[],recoverySeconds:[24,36],admissionThreshold:20,followupRequired:true},
  {id:'intoxicacao-alimentar',name:'Intoxicação alimentar',baseProbability:0.10,severity:'Moderada',lifeLoss:3,symptoms:['nausea','vomito','dor_abdominal','mal-estar'],exams:[1,2],treatment:'Hidratação e observação até a melhora dos sintomas.',medications:['Soro de hidratação do jogo'],pharmacyMedicationIds:['soro-oral','antiemetico','antiacido'],recoverySeconds:[22,34],admissionThreshold:30},
  {id:'sintoma-cardio',name:'Alteração cardiovascular',baseProbability:0.18,severity:'Moderada',lifeLoss:4,symptoms:['palpitacao','tontura'],exams:[5,1],treatment:'Monitoramento cardíaco e acompanhamento médico.',medications:['Medicação de monitoramento do jogo'],pharmacyMedicationIds:[],recoverySeconds:[30,45],admissionThreshold:35},
  {id:'pneumonia',name:'Pneumonia (suspeita)',baseProbability:0.10,severity:'Moderada',lifeLoss:4,symptoms:['tosse','febre','falta_ar'],exams:[6,4,1],treatment:'Avaliação respiratória, observação e tratamento hospitalar conforme a evolução.',medications:['Tratamento respiratório fictício do jogo'],pharmacyMedicationIds:[],recoverySeconds:[32,48],admissionThreshold:60,followupRequired:true},
  {id:'problema-respiratorio',name:'Quadro respiratório',baseProbability:0.16,severity:'Moderada',lifeLoss:4,symptoms:['falta_ar','tosse'],exams:[6,4],treatment:'Acompanhamento respiratório e observação clínica.',medications:['Tratamento respiratório fictício do jogo'],pharmacyMedicationIds:['solucao-salina','pastilhas-garganta'],recoverySeconds:[28,42],admissionThreshold:30},
  {id:'investigacao-cancer',name:'Investigação de possível câncer (não confirmado)',baseProbability:0.03,severity:'Moderada',lifeLoss:1,symptoms:['dor_persistente','perda_peso'],exams:[1,7,8],treatment:'Os sinais não confirmam câncer. São necessários exames complementares e retorno médico para aprofundar a investigação.',medications:['Acompanhamento médico; sem medicação específica antes da confirmação'],pharmacyMedicationIds:[],recoverySeconds:[16,24],admissionThreshold:0,followupRequired:true},
  {id:'lesao',name:'Lesão ou dor musculoesquelética',baseProbability:0.14,severity:'Leve',lifeLoss:2,symptoms:['dor'],exams:[4,7,8],treatment:'Repouso e acompanhamento da dor; exames adicionais se persistir.',medications:['Analgésico fictício do jogo'],pharmacyMedicationIds:['analgesico','kit-curativo'],recoverySeconds:[22,35],admissionThreshold:25},
  {id:'indisposicao',name:'Indisposição leve',baseProbability:0.12,severity:'Leve',lifeLoss:1,symptoms:['mal-estar'],exams:[3,1],treatment:'Repouso, hidratação e retorno se os sintomas persistirem.',medications:['Cuidados de suporte do jogo'],recoverySeconds:[12,20],admissionThreshold:15},
  {id:'sem-alteracoes',name:'Sem alteração clínica relevante',baseProbability:0.05,severity:'Leve',lifeLoss:0,symptoms:[],exams:[3],treatment:'Não foi indicado tratamento específico; acompanhe seus indicadores.',medications:[],recoverySeconds:[0,0],admissionThreshold:0}
];

const HOSPITAL_GAME_DAY_MS=60*1000;

const hospitalClamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const hospitalRandomBetween=range=>Math.floor(range[0]+Math.random()*(range[1]-range[0]+1));
const summarizeHospitalStatus=(user={})=>{
  const life=Number(user.life ?? 100);
  const hunger=Number(user.hunger ?? 100);
  const hydration=Number(user.hydration ?? 100);
  const energy=Number(user.energy ?? 100);
  const temperature=Number((36.5 + (100 - hydration) * 0.018 + (100 - energy) * 0.01).toFixed(1));
  const pressure=Number((110 + (100 - hydration) * 0.22 + (100 - energy) * 0.18).toFixed(0));
  const heartRate=Number((72 + (100 - energy) * 0.18 + (100 - hunger) * 0.12).toFixed(0));
  const oxygenation=Number((97 - (100 - hydration) * 0.03 - (100 - energy) * 0.02).toFixed(0));
  const respiration=Number((18 + (100 - hydration) * 0.03 + (100 - energy) * 0.02).toFixed(0));
  const triage={temperature: hospitalClamp(temperature,35.5,40), bloodPressure: `${hospitalClamp(pressure,90,150)}/70`, heartRate: hospitalClamp(heartRate,58,120), oxygenation: hospitalClamp(oxygenation,88,100), respiration: hospitalClamp(respiration,14,32), hydration: hospitalClamp(hydration,0,100), energy:hospitalClamp(energy,0,100), hunger:hospitalClamp(hunger,0,100), life:hospitalClamp(life,0,100)};
  const recommendations=[];
  if (hydration < 55) recommendations.push('Reidratação e atenção à hidratação do personagem.');
  if (energy < 50 || hunger < 50) recommendations.push('Ajuste de alimentação e repouso antes de exames mais intensos.');
  if (life < 45) recommendations.push('Consulta mais detalhada para avaliar estabilidade e possível internação.');
  if (temperature > 37.4 || triage.heartRate > 90) recommendations.push('Exames laboratoriais e monitoramento cardiovascular.');
  return {vitals:triage,recommendations:recommendations.length?recommendations:['Consulta inicial e observação clínica.'],status:life<35?'Prioridade alta':hydration<60||energy<60?'Atenção':'Estável'};
};
const hospitalDifferential=(user,symptoms=[],duration='recentemente')=>{
  const vitals=summarizeHospitalStatus(user).vitals;
  const picked=new Set(Array.isArray(symptoms)?symptoms:[]);
  const supported=condition=>{
    if(condition.id==='desidratacao')return vitals.hydration<75||['sede','tontura','fraqueza'].some(x=>picked.has(x));
    if(condition.id==='exaustao')return vitals.energy<65||vitals.hunger<50||['fraqueza','cansaço','fome'].some(x=>picked.has(x));
    if(condition.id==='febre-suspeita')return vitals.temperature>37.3||['febre','mal-estar'].some(x=>picked.has(x));
    if(condition.id==='sintoma-cardio')return vitals.heartRate>94||['palpitacao','tontura'].some(x=>picked.has(x));
    if(condition.id==='problema-respiratorio')return vitals.oxygenation<95||['falta_ar','tosse'].some(x=>picked.has(x));
    if(condition.id==='pneumonia')return picked.has('tosse')&&(picked.has('febre')||picked.has('falta_ar')||duration==='alguns_dias')||vitals.oxygenation<93&&picked.has('tosse');
    if(condition.id==='gripe')return picked.has('febre')&&(picked.has('tosse')||picked.has('mal-estar')||picked.has('fraqueza'));
    if(condition.id==='diabetes')return picked.has('sede')&&(picked.has('cansaço')||picked.has('fraqueza')||picked.has('fome'))||vitals.energy<40&&picked.has('sede');
    if(condition.id==='intoxicacao-alimentar')return picked.has('nausea')||picked.has('vomito')||picked.has('dor_abdominal')&&picked.has('mal-estar');
    if(condition.id==='investigacao-cancer')return duration==='alguns_dias'&&(picked.has('dor_persistente')||picked.has('perda_peso'));
    if(condition.id==='lesao')return picked.has('dor');
    if(condition.id==='indisposicao')return picked.size>0||vitals.life<85;
    return false;
  };
  const riskFor=condition=>{
    let risk=condition.baseProbability*0.65;
    if(condition.id==='desidratacao')risk+=Math.max(0,75-vitals.hydration)*0.012+(['sede','tontura','fraqueza'].some(x=>picked.has(x))?0.18:0);
    if(condition.id==='exaustao')risk+=Math.max(0,65-vitals.energy)*0.012+Math.max(0,55-vitals.hunger)*0.008+(['fraqueza','cansaço','fome'].some(x=>picked.has(x))?0.18:0);
    if(condition.id==='febre-suspeita')risk+=Math.max(0,vitals.temperature-37.2)*0.18+(picked.has('febre')?0.24:0);
    if(condition.id==='sintoma-cardio')risk+=Math.max(0,vitals.heartRate-92)*0.02+(picked.has('palpitacao')?0.25:0);
    if(condition.id==='problema-respiratorio')risk+=Math.max(0,96-vitals.oxygenation)*0.05+(picked.has('falta_ar')?0.3:0)+(picked.has('tosse')?0.14:0);
    if(condition.id==='pneumonia')risk+=(picked.has('febre')?0.18:0)+(picked.has('falta_ar')?0.22:0)+(picked.has('tosse')?0.18:0)+Math.max(0,95-vitals.oxygenation)*0.04;
    if(condition.id==='gripe')risk+=(picked.has('febre')?0.2:0)+(picked.has('tosse')?0.12:0)+(picked.has('mal-estar')?0.08:0);
    if(condition.id==='diabetes')risk+=(picked.has('sede')?0.22:0)+(picked.has('cansaço')||picked.has('fraqueza')?0.1:0)+Math.max(0,50-vitals.energy)*0.008;
    if(condition.id==='intoxicacao-alimentar')risk+=(picked.has('nausea')||picked.has('vomito')?0.3:0)+(picked.has('dor_abdominal')?0.12:0);
    if(condition.id==='investigacao-cancer')risk+=(picked.has('dor_persistente')?0.3:0)+(picked.has('perda_peso')?0.3:0)+(duration==='alguns_dias'?0.15:0);
    if(condition.id==='lesao')risk+=picked.has('dor')?0.3:0;
    if(condition.id==='indisposicao')risk+=(picked.has('mal-estar')?0.2:0)+(vitals.life<85?0.16:0);
    if(condition.id==='indisposicao'&&vitals.life<35)risk+=0.55;
    if(duration==='alguns_dias'&&picked.size)risk+=0.04;
    return Math.round(hospitalClamp(risk,0.05,0.95)*100);
  };
  return hospitalConditions.filter(supported).map(condition=>({
    id:condition.id,
    name:condition.name,
    probability:riskFor(condition),
    severity:vitals.life<30||condition.id==='pneumonia'&&(vitals.life<45||vitals.oxygenation<92)?'Grave':vitals.life<55||vitals.hydration<35||vitals.oxygenation<92?'Moderada':condition.severity,
    symptoms:condition.symptoms,
    exams:condition.exams
  })).filter(condition=>condition.probability>=25).sort((a,b)=>b.probability-a.probability).slice(0,3);
};
const hospitalRecommendedExams=(user,symptoms,duration)=>{
  const vitals=summarizeHospitalStatus(user).vitals;
  const selected=new Set();
  const differential=hospitalDifferential(user,symptoms,duration);
  differential.forEach(condition=>condition.exams.forEach(id=>selected.add(id)));
  if(vitals.hydration<60)selected.add(1);
  if(vitals.energy<50||vitals.hunger<45)selected.add(3);
  if(vitals.heartRate>90||(symptoms||[]).includes('palpitacao'))selected.add(5);
  if(vitals.oxygenation<95||(symptoms||[]).some(x=>x==='tosse'||x==='falta_ar'))selected.add(6);
  if((symptoms||[]).includes('dor'))selected.add(4);
  if(duration==='alguns_dias'&&(symptoms||[]).includes('dor'))selected.add(8);
  if(duration==='alguns_dias'&&vitals.life<55)selected.add(7);
  if(!selected.size)selected.add(3);
  const preferred=[8,7].filter(id=>selected.has(id));
  const ordered=[...preferred,...[...selected].filter(id=>!preferred.includes(id))];
  return ordered.slice(0,3).map(id=>hospitalServices.find(service=>service.id===id)).filter(Boolean);
};
const hospitalVisitFor=user=>user.hospitalVisit&&typeof user.hospitalVisit==='object'?user.hospitalVisit:null;
const hospitalPublicVisit=visit=>visit?{
  id:visit.id,stage:visit.stage,arrivedAt:visit.arrivedAt,triage:visit.triage||null,
  symptoms:visit.symptoms||null,differential:(visit.differential||[]).map(item=>({name:item.name,probability:item.probability,severity:item.severity,clue:item.id==='desidratacao'?'Indicadores de hidratação':item.id==='exaustao'?'Energia e alimentação':item.id==='diabetes'?'Sede, energia e glicose':item.id==='intoxicacao-alimentar'?'Sintomas digestivos':item.id==='pneumonia'?'Tosse com febre ou falta de ar':item.id==='gripe'?'Febre e sintomas gripais':item.id==='investigacao-cancer'?'Sintomas persistentes que precisam de exames complementares':item.id==='sintoma-cardio'?'Ritmo cardíaco':item.id==='problema-respiratorio'?'Respiração e oxigenação':item.id==='lesao'?'Dor localizada e sinais de lesão':item.id==='sem-alteracoes'?'Sinais dentro do esperado':'Temperatura e sinais gerais'})),
  recommendedServices:(Array.isArray(visit.recommendedServiceIds)?visit.recommendedServiceIds:[]).map(id=>hospitalServices.find(s=>s.id===id)).filter(Boolean),
  exam:visit.exam||null,diagnosis:visit.diagnosis||null,treatment:visit.treatment||null,
  updates:visit.updates||[],admissionRequired:!!visit.admissionRequired,
  followupRequired:!!visit.followupRequired,followupAt:visit.followupAt||null,followupCompletedAt:visit.followupCompletedAt||null,
  pharmacyPrescription:visit.pharmacyPrescription?{id:visit.pharmacyPrescription.id,diagnosisName:visit.pharmacyPrescription.diagnosisName,issuedAt:visit.pharmacyPrescription.issuedAt,instructions:visit.pharmacyPrescription.instructions,items:(visit.pharmacyPrescription.items||[]).map(item=>{const product=hospitalPharmacyItems.find(candidate=>candidate.id===item.id);return product?{id:item.id,quantity:item.quantity,fulfilled:Number(visit.pharmacyPrescription.fulfilled?.[item.id]||0),purchased:Number(visit.pharmacyPrescription.purchased?.[item.id]||0),used:Number(visit.pharmacyPrescription.used?.[item.id]||0),product:{id:product.id,name:product.name}}:null}).filter(Boolean)}:null
}:null;
const advanceHospitalVisit=user=>{
  const visit=hospitalVisitFor(user);
  if(!visit)return false;
  const now=Date.now();
  let changed=false;
  if(visit.exam?.status==='processing'&&Date.parse(visit.exam.endsAt)<=now){
    visit.exam.status='complete';visit.exam.completedAt=new Date(now).toISOString();
    const matches=visit.differential.some(item=>item.exams.includes(visit.exam.serviceId));
    visit.exam.finding=matches?'O exame encontrou sinais que precisam ser interpretados junto com os sintomas e a triagem.':'Não foram observadas alterações relevantes neste exame; o médico avaliará se é necessário outro procedimento.';
    visit.stage='results';visit.updates.unshift({at:visit.exam.completedAt,text:`Resultado do ${visit.exam.serviceName} disponível. A equipe médica foi avisada.`});
    changed=true;
  }
  if(visit.treatment?.status==='processing'){
    const last=Date.parse(visit.treatment.lastTickAt||visit.treatment.startedAt);
    const elapsed=Math.floor(Math.max(0,now-last)/5000);
    if(elapsed>0){
      const condition=hospitalConditions.find(item=>item.id===visit.diagnosis?.conditionId)||hospitalConditions[hospitalConditions.length-1];
      const ticks=Math.min(elapsed,8);
      user.life=Math.min(100,Number(user.life||0)+ticks*2);
      user.hydration=Math.min(100,Number(user.hydration||0)+ticks*(condition.id==='desidratacao'?4:1));
      user.energy=Math.min(100,Number(user.energy||0)+ticks*(condition.id==='exaustao'?3:1));
      user.hunger=Math.min(100,Number(user.hunger||0)+ticks*(condition.id==='exaustao'?2:0));
      visit.treatment.lastTickAt=new Date(last+ticks*5000).toISOString();
      visit.lastDeteriorationAt=visit.treatment.lastTickAt;
      const totalDuration=Date.parse(visit.treatment.endsAt)-Date.parse(visit.treatment.startedAt);
      visit.treatment.progress=totalDuration>0?Math.min(100,Math.round((now-Date.parse(visit.treatment.startedAt))/totalDuration*100)):100;
      visit.updates.unshift({at:new Date(now).toISOString(),text:'A equipe conferiu seus sinais e atualizou o plano de recuperação.'});
      if(now>=Date.parse(visit.treatment.endsAt)){
        visit.treatment.status='complete';visit.treatment.completedAt=new Date(now).toISOString();visit.treatment.progress=100;visit.stage='followup';
        if(visit.followupRequired&&!visit.followupCompletedAt){
          visit.followupAt=new Date(now+HOSPITAL_GAME_DAY_MS).toISOString();
          visit.updates.unshift({at:visit.treatment.completedAt,text:'O tratamento terminou. O médico marcou um retorno para o próximo dia do jogo, quando a equipe aprofundará a investigação.'});
        }else visit.updates.unshift({at:visit.treatment.completedAt,text:'O tratamento terminou. O médico está conferindo sua recuperação.'});
      }
      changed=true;
    }
  }
  const ongoingDiagnosis=visit.diagnosis&&visit.diagnosis.lifeLoss>0&&visit.treatment?.status!=='processing'&&(visit.stage==='treatment'||(visit.stage==='followup'&&visit.admissionRequired&&(Number(user.life||0)<50||Number(user.hydration||0)<35)));
  if(ongoingDiagnosis){
    const last=Date.parse(visit.lastDeteriorationAt||visit.diagnosis.reviewedAt);
    const ticks=Math.min(40,Math.floor(Math.max(0,now-last)/15000));
    if(ticks>0){
      user.life=Math.max(0,Number(user.life||0)-ticks*Number(visit.diagnosis.lifeLoss||0));
      visit.lastDeteriorationAt=new Date(last+ticks*15000).toISOString();
      changed=true;
    }
  }
  if(changed){
    visit.updates=(Array.isArray(visit.updates)?visit.updates:[]).slice(0,20);
    saveData();
  }
  return changed;
};
const hospitalPlayerStatus=user=>({life:Number(user.life??100),hunger:Number(user.hunger??100),hydration:Number(user.hydration??100),energy:Number(user.energy??100),money:Number(user.money??0)});

const defaultCharacter=()=>({gender:'masculino',skin:'#f1c27d',hair:'#2b2118',hairStyle:'curto',shirt:'#4f6cff',pants:'#273449',shoes:'#151a22',bodyType:'normal',eyeStyle:'normal',browStyle:'normal',mouthStyle:'normal',
  earStyle:'normal',noseStyle:'normal',accessories:[],held:null});
const normalizeCharacter=c=>{const d=defaultCharacter(),s=c&&typeof c==='object'?c:{};const color=(v,f)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):f;const genders=['masculino','feminino'];const hairs=['curto','medio','longo','cacheado','crespo','coque','raspado','moicano','franja','lateral'];const bodies=['magro','normal','forte'];const eyes=['normal','grande','fechado','estreito','brilhante'];const brows=['normal','reto','arqueada','forte','preocupada'];const mouths=['normal','sorriso','serio','aberta','surpreso','triste'];
  const ears=['normal','pequena','redonda','pontuda'];const noses=['normal','fino','arredondado','arrebitado'];return{gender:genders.includes(s.gender)?s.gender:d.gender,skin:color(s.skin,d.skin),hair:color(s.hair,d.hair),hairStyle:hairs.includes(s.hairStyle)?s.hairStyle:d.hairStyle,shirt:color(s.shirt,d.shirt),pants:color(s.pants,d.pants),shoes:color(s.shoes,d.shoes),bodyType:bodies.includes(s.bodyType)?s.bodyType:d.bodyType,eyeStyle:eyes.includes(s.eyeStyle)?s.eyeStyle:d.eyeStyle,browStyle:brows.includes(s.browStyle)?s.browStyle:d.browStyle,mouthStyle:mouths.includes(s.mouthStyle)?s.mouthStyle:d.mouthStyle,noseStyle:noses.includes(s.noseStyle)?s.noseStyle:d.noseStyle,earStyle:ears.includes(s.earStyle)?s.earStyle:d.earStyle,accessories:Array.isArray(s.accessories)?s.accessories.map(x=>String(x).slice(0,80)).slice(0,8):[],held:s.held?String(s.held).slice(0,80):null}};
const findQuestionById=qid=>{for(const k of Object.keys(questionBank)){const q=questionBank[k].find(x=>x.id===qid);if(q)return q}return null};
const getMissionState=user=>{const now=Date.now();user.missionBatchCount=Number.isFinite(Number(user.missionBatchCount))?Number(user.missionBatchCount):0;user.missionCooldownUntil=user.missionCooldownUntil||null;if(user.missionCooldownUntil){const cooldown=new Date(user.missionCooldownUntil).getTime();if(Number.isFinite(cooldown)&&cooldown<=now){user.missionCooldownUntil=null;user.missionBatchCount=0}}return{batchCount:user.missionBatchCount,remaining:Math.max(0,2-user.missionBatchCount),cooldownUntil:user.missionCooldownUntil}};
const startCooldownIfNeeded=user=>{if(Number(user.missionBatchCount)>=2)user.missionCooldownUntil=new Date(Date.now()+30*60*1000).toISOString()};
const createMission=(jobId,username)=>{const cfg=(city.missionRewards&&city.missionRewards[jobId])||{questionsPerMission:2,xpPerMission:50,moneyPerMission:50};const duration=Math.max(60,cfg.questionsPerMission*60);const jobQuestions=(questionBank[jobId]&&questionBank[jobId].length?questionBank[jobId]:questionBank.generic).slice();const answered=(users[username]&&users[username].answeredQuestions)||[];const questionUsage=(users[username]&&users[username].questionUsage)||{};let pool=jobQuestions.filter(q=>Number(questionUsage[q.id]||0)<2&&!answered.includes(q.id));if(pool.length<(cfg.questionsPerMission||2)){const minUse=Math.min(...jobQuestions.map(q=>Number(questionUsage[q.id]||0)));pool=jobQuestions.filter(q=>Number(questionUsage[q.id]||0)===minUse&&!answered.includes(q.id));}if(pool.length<(cfg.questionsPerMission||2))pool=jobQuestions.slice();if(!pool.length)return null;const n=Math.min(cfg.questionsPerMission||2,pool.length),chosen=[],poolCopy=pool.slice();for(let i=0;i<n;i++)chosen.push(poolCopy.splice(Math.floor(Math.random()*poolCopy.length),1)[0]);if(users[username]){users[username].questionUsage=users[username].questionUsage||{};chosen.forEach(q=>{users[username].questionUsage[q.id]=Number(users[username].questionUsage[q.id]||0)+1})}const avgDiff=chosen.reduce((s,q)=>s+(q.difficulty||1),0)/chosen.length;return{id:`mission_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,jobId,started_at:new Date().toISOString(),duration_seconds:duration,questionRefs:chosen.map(q=>q.id),questions:chosen.map(q=>({id:q.id,text:q.text,options:q.options})),rewardXp:Math.max(20,Math.floor((cfg.xpPerMission||50)*avgDiff)),rewardMoney:Math.max(50,Math.floor((cfg.moneyPerMission||50)*avgDiff)),answers:[],status:'active'}};

app.post('/api/register',(req,res)=>{const{name,username,password,recoveryCode}=req.body;if(!name||!username||!password||!recoveryCode)return res.status(400).json({error:'Preencha todos os campos'});if(users[username])return res.status(400).json({error:'Usuário já existe'});const isMayor=Object.keys(users).length===0;users[username]=createUser(name,username,password,isMayor,recoveryCode);if(!users[username].countedInPopulation){city.population=Number(city.population||0)+1;users[username].countedInPopulation=true}users[username].token=generateToken();users[username].tokens=[users[username].token];saveData();res.json({message:isMayor?'Conta criada! Você é o prefeito.':'Conta criada com sucesso!',token:users[username].token,user:users[username]})});
app.post('/api/login',(req,res)=>{const{username,password}=req.body,user=users[username];if(!user||user.password!==password)return res.status(401).json({error:'Usuário ou senha incorretos'});user.token=generateToken();user.tokens=Array.isArray(user.tokens)?user.tokens.filter(t=>typeof t==='string'&&t&&t!==user.token):[];user.tokens.push(user.token);user.tokens=user.tokens.slice(-8);if(!user.countedInPopulation){city.population=Number(city.population||0)+1;user.countedInPopulation=true}saveData();res.json({message:'Login realizado!',token:user.token,user})});
app.post('/api/recover-password',async(req,res)=>{try{const{username,name,recoveryCode,newPassword}=req.body||{};if(!username||!name||!recoveryCode||!newPassword)return res.status(400).json({error:'Preencha todos os campos'});if(String(newPassword).length<6)return res.status(400).json({error:'A nova senha deve ter no mínimo 6 caracteres'});const user=users[username];if(!user||user.name!==name||user.recoveryCode!==recoveryCode)return res.status(401).json({error:'Dados de recuperação incorretos'});user.password=newPassword;user.token=null;user.tokens=[];saveData();res.json({message:'Senha alterada com sucesso! Você já pode entrar novamente.'})}catch(e){console.error('Falha na recuperação de senha',e);res.status(500).json({error:'Não foi possível recuperar a senha agora.'})}});
const auth=(req,res,next)=>{const header=String(req.headers.authorization||'');const token=header.startsWith('Bearer ')?header.slice(7).trim():'';const user=token?Object.values(users).find(u=>(Array.isArray(u.tokens)&&u.tokens.includes(token))||u.token===token):null;if(!user)return res.status(401).json({error:'Não autenticado'});req.user=user;req.username=user.username;next()};
app.use('/api',(req,res,next)=>{if(['/api/register','/api/login','/api/recover-password'].includes(req.originalUrl.split('?')[0]))return next();auth(req,res,next)});
// ==================== PASSE DA CIDADE ====================
const CITY_PASS_ID='city-pass-v1';
const CITY_PASS_MAX_LEVEL=45;
const cityPassNextXp=level=>Math.max(250,300+(Math.max(1,Number(level)||1)-1)*45);
const cityPassLevelFromXp=xp=>{
  let level=1,total=0;const value=Math.max(0,Number(xp)||0);
  for(let next=2;next<=CITY_PASS_MAX_LEVEL;next++){total+=cityPassNextXp(next-1);if(value<total)return level;level=next}
  return CITY_PASS_MAX_LEVEL;
};
const cityPassThresholds=()=>{
  const rows=[];let total=0;
  for(let level=1;level<=CITY_PASS_MAX_LEVEL;level++){if(level>1)total+=cityPassNextXp(level-1);rows.push({level,xpToReach:total,xpToNext:level<CITY_PASS_MAX_LEVEL?cityPassNextXp(level):0})}
  return rows;
};
const cityPassRewardFor=level=>{
  const n=Number(level)||1;
  if(n===CITY_PASS_MAX_LEVEL)return{type:'bundle',money:5000,candies:500,tickets:10,label:'Recompensa máxima da temporada'};
  if(n%10===0)return{type:'bundle',money:750+n*25,candies:150+n*5,tickets:3,label:'Recompensa de marco'};
  if(n%3===0)return{type:'candies',amount:80+n*5,label:'Balas'};
  if(n%3===1)return{type:'money',amount:100+n*20,label:'Dinheiro'};
  return{type:'tickets',amount:1+(n>=25?1:0),label:'Tickets'};
};
const cityPassRewardText=r=>{
  if(!r)return'';
  if(r.type==='money')return Number(r.amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  if(r.type==='candies')return Number(r.amount||0)+' balas';
  if(r.type==='tickets')return Number(r.amount||0)+' ticket(s)';
  const parts=[];if(r.money)parts.push(Number(r.money).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));if(r.candies)parts.push(Number(r.candies)+' balas');if(r.tickets)parts.push(Number(r.tickets)+' ticket(s)');return parts.join(' + ');
};
const cityPassDefaultMissions=(user,now)=>{
  const jobId=String(user?.jobId||'estudante'),jobName=String(user?.jobName||'sua profissão'),stamp=Date.now().toString(36);
  return{
    daily:[
      {id:'daily_'+stamp+'_a',title:'Complete 2 missões',description:'Conclua duas missões normais dentro deste ciclo diário.',type:'missions',target:2,xp:300},
      {id:'daily_'+stamp+'_b',title:'Complete 1 missão de '+jobName,description:'Faça uma missão da profissão '+jobName+'.',type:'jobMissions',jobId:jobId,target:1,xp:250},
      {id:'daily_'+stamp+'_c',title:'Ganhe 400 XP',description:'Aumente seu XP do jogo em 400 durante este ciclo.',type:'xpGained',target:400,xp:300}
    ],
    weekly:[
      {id:'weekly_'+stamp+'_a',title:'Complete 8 missões',description:'Conclua oito missões durante a semana.',type:'missions',target:8,xp:1400},
      {id:'weekly_'+stamp+'_b',title:'Complete 3 missões de '+jobName,description:'Faça três missões da profissão '+jobName+'.',type:'jobMissions',jobId:jobId,target:3,xp:1700},
      {id:'weekly_'+stamp+'_c',title:'Entre no Top 10 dos mais ricos',description:'Fique entre os dez cidadãos com maior patrimônio disponível.',type:'richRank',target:10,xp:2200},
      {id:'weekly_'+stamp+'_d',title:'Entre no Top 3 de XP',description:'Fique entre os três cidadãos com maior XP.',type:'xpRank',target:3,xp:2400},
      {id:'weekly_'+stamp+'_e',title:'Ganhe 2.500 XP',description:'Aumente seu XP do jogo em 2.500 durante esta semana.',type:'xpGained',target:2500,xp:1900}
    ]
  };
};
const cityPassDate=iso=>Date.parse(iso||'');
const cityPassCompletedMissionsSince=(user,sinceMs)=>{const missions=Array.isArray(user?.missions)?user.missions:[];return missions.filter(m=>m&&m.status==='completed'&&cityPassDate(m.createdAt||m.started_at)>=sinceMs)};
const cityPassRankings=()=>{
  const list=Object.values(users).map(u=>({name:String(u.name||u.username||'Cidadão'),username:String(u.username||''),level:Number(u.level||1),xp:Number(u.xp||0),money:Number(u.money||0),bankBalance:Number(u.bankBalance||0),wealth:Number(u.money||0)+Number(u.bankBalance||0),jobName:String(u.jobName||'Cidadão')}));
  const rich=[...list].sort((a,b)=>b.wealth-a.wealth||b.money-a.money||a.username.localeCompare(b.username)).map((u,i)=>({...u,rank:i+1}));
  const xp=[...list].sort((a,b)=>b.xp-a.xp||b.level-a.level||a.username.localeCompare(b.username)).map((u,i)=>({...u,rank:i+1}));
  return{rich,xp,topRich:rich.slice(0,10),topXp:xp.slice(0,10)};
};
const cityPassProgress=(mission,user,rankings,cycle)=>{
  const sinceMs=cityPassDate(cycle?.startedAt),completed=cityPassCompletedMissionsSince(user,Number.isFinite(sinceMs)?sinceMs:Date.now());let progress=0;
  if(mission.type==='missions')progress=completed.length;
  else if(mission.type==='jobMissions')progress=completed.filter(m=>String(m.jobId)===String(mission.jobId)).length;
  else if(mission.type==='xpGained')progress=Math.max(0,Number(user.xp||0)-Number(cycle?.xpBaseline||0));
  else if(mission.type==='richRank'){const found=rankings.rich.find(x=>x.username===user.username);progress=found&&found.rank<=mission.target?mission.target:Math.max(0,mission.target-(found?.rank||mission.target+1));}
  else if(mission.type==='xpRank'){const found=rankings.xp.find(x=>x.username===user.username);progress=found&&found.rank<=mission.target?mission.target:Math.max(0,mission.target-(found?.rank||mission.target+1));}
  const completedNow=progress>=Number(mission.target||1);return{...mission,progress:Math.min(Number(mission.target||1),Math.max(0,progress)),completed:!!mission.completed||completedNow,completedAt:mission.completedAt||null};
};
const cityPassResetCycle=(user,key,now,days)=>{
  const missions=cityPassDefaultMissions(user,now)[key],state=user.cityPass||{};
  state[key]={startedAt:new Date(now).toISOString(),resetsAt:new Date(now+days*24*60*60*1000).toISOString(),xpBaseline:Number(user.xp||0),missions};user.cityPass=state;
};
const ensureCityPassState=user=>{
  if(!user||typeof user!=='object')return null;const now=Date.now();user.cityPass=user.cityPass&&typeof user.cityPass==='object'?user.cityPass:{};
  if(user.cityPass.seasonId!==CITY_PASS_ID)user.cityPass={seasonId:CITY_PASS_ID,xp:0,claimedRewards:[],candies:0,tickets:0,daily:null,weekly:null};
  user.cityPass.xp=Math.max(0,Number(user.cityPass.xp)||0);user.cityPass.claimedRewards=Array.isArray(user.cityPass.claimedRewards)?user.cityPass.claimedRewards.map(Number).filter(Number.isFinite):[];user.cityPass.candies=Math.max(0,Number(user.cityPass.candies)||0);user.cityPass.tickets=Math.max(0,Number(user.cityPass.tickets)||0);
  const resetCycle=(key,days)=>{const cycle=user.cityPass[key],expires=cityPassDate(cycle?.resetsAt);if(!cycle||!Number.isFinite(expires)||expires<=now){cityPassResetCycle(user,key,now,days);return true}return false};
  let changed=resetCycle('daily',1);changed=resetCycle('weekly',7)||changed;return{state:user.cityPass,changed};
};
const refreshCityPass=user=>{
  const ensured=ensureCityPassState(user);if(!ensured)return null;const rankings=cityPassRankings();let changed=!!ensured.changed;
  ['daily','weekly'].forEach(key=>{const cycle=user.cityPass[key];if(!cycle||!Array.isArray(cycle.missions))return;cycle.missions=cycle.missions.map(m=>{const next=cityPassProgress(m,user,rankings,cycle);if(next.completed&&!m.completed){user.cityPass.xp+=Number(m.xp||0);next.completedAt=new Date().toISOString();changed=true}return next})});
  user.cityPass.level=cityPassLevelFromXp(user.cityPass.xp);if(changed)saveData();return{state:user.cityPass,rankings};
};
const cityPassRewardApply=(user,reward)=>{
  if(reward.type==='money')user.money=Number(user.money||0)+Math.max(0,Number(reward.amount)||0);
  else if(reward.type==='candies')user.cityPass.candies+=Math.max(0,Number(reward.amount)||0);
  else if(reward.type==='tickets')user.cityPass.tickets+=Math.max(0,Number(reward.amount)||0);
  else if(reward.type==='bundle'){user.money=Number(user.money||0)+Math.max(0,Number(reward.money)||0);user.cityPass.candies+=Math.max(0,Number(reward.candies)||0);user.cityPass.tickets+=Math.max(0,Number(reward.tickets)||0)}
};
app.get('/api/city-pass',(req,res)=>{
  const result=refreshCityPass(req.user),s=result.state,rankings=result.rankings,level=cityPassLevelFromXp(s.xp),thresholds=cityPassThresholds();
  const current=thresholds.find(x=>x.level===level)||thresholds[thresholds.length-1],next=level<CITY_PASS_MAX_LEVEL?thresholds.find(x=>x.level===level+1):current,currentLevelXp=Number(current.xpToReach||0),nextTotal=Number(next?.xpToReach||current.xpToReach||0);
  res.json({pass:{id:CITY_PASS_ID,maxLevel:CITY_PASS_MAX_LEVEL,xp:Number(s.xp||0),level,currentLevelXp,nextLevelXp:Math.max(0,nextTotal-currentLevelXp),nextLevelTotal:nextTotal,claimedRewards:s.claimedRewards,candies:Number(s.candies||0),tickets:Number(s.tickets||0),daily:s.daily,weekly:s.weekly,thresholds,resetAt:{daily:s.daily?.resetsAt||null,weekly:s.weekly?.resetsAt||null},rewards:Array.from({length:CITY_PASS_MAX_LEVEL},(_,i)=>{const lvl=i+1;return{level:lvl,reward:cityPassRewardFor(lvl),claimed:s.claimedRewards.includes(lvl),unlocked:level>=lvl}})},rankings:{richTop:rankings.topRich.map(x=>({rank:x.rank,name:x.name,username:x.username,wealth:x.wealth,money:x.money,bankBalance:x.bankBalance,level:x.level})),xpTop:rankings.topXp.map(x=>({rank:x.rank,name:x.name,username:x.username,xp:x.xp,level:x.level})),meRichRank:(rankings.rich.find(x=>x.username===req.user.username)||{}).rank||null,meXpRank:(rankings.xp.find(x=>x.username===req.user.username)||{}).rank||null}});
});
app.get('/api/city-rankings',(req,res)=>{const r=cityPassRankings(),meRich=r.rich.find(x=>x.username===req.user.username),meXp=r.xp.find(x=>x.username===req.user.username);res.json({rich:r.topRich.map(x=>({rank:x.rank,name:x.name,username:x.username,wealth:x.wealth,money:x.money,bankBalance:x.bankBalance})),xp:r.topXp.map(x=>({rank:x.rank,name:x.name,username:x.username,xp:x.xp,level:x.level})),me:{richRank:meRich?.rank||null,xpRank:meXp?.rank||null}})});
app.post('/api/city-pass/claim/:level',(req,res)=>{const result=refreshCityPass(req.user),s=result.state,level=Math.max(1,Math.min(CITY_PASS_MAX_LEVEL,Number(req.params.level)||0));if(cityPassLevelFromXp(s.xp)<level)return res.status(403).json({error:'Esse nível do Passe ainda está bloqueado.'});if(s.claimedRewards.includes(level))return res.status(409).json({error:'Essa recompensa já foi resgatada.'});const reward=cityPassRewardFor(level);cityPassRewardApply(req.user,reward);s.claimedRewards.push(level);saveData();res.json({message:'Recompensa do nível '+level+' resgatada!',reward:cityPassRewardText(reward),user:{...req.user}})});


const kibaBrain=createKibaBrain({
  getSnapshot:async()=>buildKibaSnapshot(null),
  getUsers:async()=>Object.values(users),
  getKnowledge:async()=>Array.isArray(city.kibaKnowledge)?city.kibaKnowledge.slice(-100):[]
});

const kibaMemoryFor=username=>{
  const key=String(username||'anonymous');
  if(!Array.isArray(kibaMemories[key]))kibaMemories[key]=[];
  return kibaMemories[key];
};
const saveKibaMemoryCandidates=(username,candidates)=>{
  if(!Array.isArray(candidates)||!candidates.length)return;
  const memory=kibaMemoryFor(username);
  const now=new Date().toISOString();
  candidates.slice(0,3).forEach(item=>{
    const content=String(item?.content||'').trim().slice(0,180);
    const kind=String(item?.kind||'note').slice(0,30);
    const importance=Math.max(1,Math.min(5,Number(item?.importance)||2));
    if(!content||/senha|password|token|cpf|rg|telefone|celular|e-?mail|endereco|endereço/i.test(content))return;
    const duplicate=memory.find(m=>String(m.content).toLowerCase()===content.toLowerCase());
    if(duplicate){
      duplicate.updatedAt=now;
      duplicate.importance=Math.max(Number(duplicate.importance)||1,importance);
      return;
    }
    memory.push({
      id:'km_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),
      content,kind,importance,createdAt:now,updatedAt:now
    });
  });
  memory.sort((a,b)=>
    (Number(b.importance)||0)-(Number(a.importance)||0) ||
    String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))
  );
  kibaMemories[String(username||'anonymous')]=memory.slice(0,50);
  saveData();
};

const buildKibaSnapshot=user=>{
  const currentUser=user&&typeof user==='object'?user:null;
  const publicCompanies=Array.isArray(city.companies)?city.companies.map(c=>({
    name:c.name,
    description:c.description,
    companyType:c.companyType,
    ownerName:c.ownerName||c.owner||null,
    products:Array.isArray(c.products)?c.products.map(p=>({
      name:p.name,type:p.type,price:Number(p.price||0),description:p.description||''
    })):[],
    balance:Number(c.balance||0)
  })):[];

  return {
    city:{
      population:Number(city.population||0),
      economy:Number(city.economy||0),
      infrastructure:Number(city.infrastructure||0),
      quality:Number(city.quality||0),
      taxRate:Number(city.taxRate||0),
      treasury:currentUser?.isMayor?Number(city.treasury||0):null
    },
    jobs:jobs.map(j=>({
      id:j.id,name:j.name,salary:Number(j.salary||0),
      xpRequired:Number(j.xpRequired||0),task:j.task,icon:j.icon
    })),
    missionRewards:Object.fromEntries(Object.entries(city.missionRewards||{}).map(([id,r])=>[
      id,{
        moneyPerMission:Number(r?.moneyPerMission||0),
        xpPerMission:Number(r?.xpPerMission||0),
        questionsPerMission:Number(r?.questionsPerMission||0)
      }
    ])),
    companies:publicCompanies,
    shopItems:shopItems.map(item=>({
      id:item.id,name:item.name,price:Number(item.price||0),
      hunger:Number(item.hunger||0),hydration:Number(item.hydration||0),
      energy:Number(item.energy||0),icon:item.icon,description:item.description
    })),
    hospital:{
      services:hospitalServices.map(s=>({
        id:s.id,name:s.name,price:Number(s.price||0),category:s.category,
        estimatedTime:s.estimatedTime,durationRange:s.durationRange,description:s.description
      })),
      conditions:hospitalConditions.map(c=>({
        id:c.id,name:c.name,severity:c.severity,symptoms:c.symptoms,
        exams:c.exams
      }))
    },
    pharmacy:hospitalPharmacyItems.map(item=>({
      id:item.id,name:item.name,category:item.category,price:Number(item.price||0),description:item.description
    })),
    news:Array.isArray(city.news)?city.news.slice(-40):[],
    events:Array.isArray(city.events)?city.events.slice(-40):[],
    proposals:Array.isArray(city.proposals)?city.proposals.slice(-30):[],
    memory:Array.isArray(kibaMemories[String(currentUser?.username||'anonymous')])?
      kibaMemories[String(currentUser?.username||'anonymous')].slice(0,50):[],
    kibaKnowledge:Array.isArray(city.kibaKnowledge)?city.kibaKnowledge.slice(-100):[],
    users:Object.values(users).map(u=>({
      name:u.name,
      username:u.username,
      isMayor:!!u.isMayor,
      level:Number(u.level||1),
      xp:Number(u.xp||0),
      jobName:u.jobName
    })),
    currentUser:{
      level:Number(currentUser?.level||1),
      xp:Number(currentUser?.xp||0),
      money:Number(currentUser?.money||0),
      bankBalance:Number(currentUser?.bankBalance||0),
      jobId:currentUser?.jobId||null,
      jobName:currentUser?.jobName||'Cidadão',
      life:Number(currentUser?.life??100),
      hunger:Number(currentUser?.hunger??100),
      hydration:Number(currentUser?.hydration??100),
      energy:Number(currentUser?.energy??100),
      inventory:currentUser?.inventory&&typeof currentUser.inventory==='object'?currentUser.inventory:{},
      companyInventory:currentUser?.companyInventory&&typeof currentUser.companyInventory==='object'?currentUser.companyInventory:{}
    }
  };
};

const kibaClientConversation=req=>{
  const list=Array.isArray(req.body?.conversation)?req.body.conversation:[];
  return list.slice(-12).map(item=>({
    role:item?.role==='assistant'?'assistant':'user',
    content:String(item?.content||'').slice(0,500)
  })).filter(item=>item.content);
};

app.post('/api/kiba/ask',async(req,res)=>{
  const question=String(req.body?.question||'').trim();
  if(!question)return res.status(400).json({error:'Digite uma pergunta para o Kiba.'});
  if(question.length>500)return res.status(400).json({error:'A pergunta é muito longa.'});

  const session=kibaPythonSession(req.user);
  const currentPage=String(req.body?.currentPage||'city').slice(0,40);
  const started=Date.now();
  const snapshot=buildKibaSnapshot(req.user);
  const browserConversation=kibaClientConversation(req);
  const combinedConversation=[...session.conversation,...browserConversation]
    .slice(-24);
  const user=safeKibaUser(req.user);

  try{
    const pythonPromise=askKibaPython({
      question,user,snapshot,currentPage,
      recentResponses:session.recentResponses,
      conversation:combinedConversation
    });
    const jsPromise=kibaBrain.ask({user:req.user,question});
    const py=await Promise.race([
      pythonPromise,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Kiba Python demorou demais')),2500))
    ]);
    if(py&&py.answer){
      const planLength=Array.isArray(py.researchPlan)?py.researchPlan.length:1;
      const minimumThinkMs=Math.min(4200,2300+Math.max(1,planLength)*400);
      const spent=Date.now()-started;
      if(spent<minimumThinkMs){
        await new Promise(resolve=>setTimeout(resolve,minimumThinkMs-spent));
      }
      if(Array.isArray(py.memoryCandidates))saveKibaMemoryCandidates(req.user.username,py.memoryCandidates);
      const result={
        ...py,
        engine:'kiba-python-proprietary',
        elapsedMs:Date.now()-started,
        memoryCount:kibaMemoryFor(req.user.username).length
      };
      session.recentResponses.push(result.answer);
      session.conversation.push({role:'user',content:question,intent:result.intent||'general'});
      session.conversation.push({role:'assistant',content:result.answer});
      session.recentResponses=session.recentResponses.slice(-12);
      session.conversation=session.conversation.slice(-24);
      return res.json(result);
    }
    throw new Error('Resposta Python vazia');
  }catch(e){
    console.warn('Kiba Python indisponível; usando cérebro JS:',e.message);
    try{
      try{
        const result=await Promise.race([
          jsPromise,
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('Cérebro JS demorou demais')),1200))
        ]);
        return res.json({
          ...result,
          engine:'kiba-js-fallback',
          elapsedMs:Date.now()-started
        });
      }catch(fallbackError){
        console.error('Fallback do Kiba também falhou:',fallbackError);
        return res.json({
          answer:kibaEmergencyAnswer(question,req.user),
          intent:'emergency',
          confidence:0.2,
          elapsedMs:Date.now()-started,
          searched:[{name:'Modo de segurança',detail:'Perfil básico do cidadão'}],
          agents:[{agent:'Kiba Safe Mode',reason:'Resposta local para impedir a conversa de ficar travada.'}],
          researchPlan:['Modo de segurança'],
          engine:'kiba-emergency'
        });
      }
    }catch(err){
      console.error('Falha nos dois cérebros do Kiba:',err);
      return res.status(500).json({error:'O Kiba não conseguiu consultar a cidade agora.'});
    }
  }
});

app.get('/api/kiba/memory',(req,res)=>{
  const memory=kibaMemoryFor(req.user.username).map(item=>({
    id:item.id,kind:item.kind,content:item.content,
    importance:item.importance,createdAt:item.createdAt,updatedAt:item.updatedAt
  }));
  res.json({memory});
});

app.delete('/api/kiba/memory/:id',(req,res)=>{
  const memory=kibaMemoryFor(req.user.username);
  const id=String(req.params.id||'');
  const next=memory.filter(item=>String(item.id)!==id);
  if(next.length===memory.length)return res.status(404).json({error:'Memória não encontrada.'});
  kibaMemories[req.user.username]=next;
  saveData();
  res.json({message:'Memória removida.'});
});

app.delete('/api/kiba/memory',(req,res)=>{
  kibaMemories[req.user.username]=[];
  saveData();
  res.json({message:'Memória do Kiba limpa.'});
});

// === Conta: código de recuperação para contas antigas ===
app.get('/api/me/recovery-status',(req,res)=>{
  res.json({configured:!!(req.user.recoveryCode&&String(req.user.recoveryCode).trim())});
});
app.post('/api/me/recovery-code',(req,res)=>{
  const{currentPassword,recoveryCode}=req.body||{};
  if(!currentPassword||!recoveryCode)return res.status(400).json({error:'Preencha a senha atual e o código de recuperação.'});
  if(req.user.password!==String(currentPassword))return res.status(401).json({error:'Senha atual incorreta.'});
  const code=String(recoveryCode).trim();
  if(code.length<6||code.length>120)return res.status(400).json({error:'O código deve ter entre 6 e 120 caracteres.'});
  if(req.user.recoveryCode)return res.status(400).json({error:'Esta conta já possui um código de recuperação.'});
  req.user.recoveryCode=code;
  saveData();
  res.json({message:'Código de recuperação salvo com sucesso.'});
});

// === Códigos de resgate ===
const ensureRedeemCodes=()=>{
  if(!city||typeof city!=='object')city={};
  if(!Array.isArray(city.redeemCodes))city.redeemCodes=[];
  city.redeemCodes.forEach(c=>{
    c.code=String(c.code||'').trim().toUpperCase();
    c.redeemedBy=c.redeemedBy&&typeof c.redeemedBy==='object'?c.redeemedBy:{};
  });
};
ensureRedeemCodes();

app.get('/api/me/redeem-history',(req,res)=>{
  ensureRedeemCodes();
  const history=[];
  city.redeemCodes.forEach(c=>{
    const entry=c.redeemedBy&&c.redeemedBy[req.username];
    if(!entry)return;
    history.push({
      code:c.code,
      date:entry.date||c.createdAt||null,
      reward:c.reward||{}
    });
  });
  history.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  res.json({history});
});
app.get('/api/redeem-codes',(req,res)=>{
  ensureRedeemCodes();
  const now=Date.now();
  const active=city.redeemCodes.filter(c=>new Date(c.expiresAt).getTime()>now).map(c=>({code:c.code,expiresAt:c.expiresAt}));
  res.json(active);
});
app.post('/api/redeem-code',(req,res)=>{
  ensureRedeemCodes();
  const code=String(req.body?.code||'').trim().toUpperCase();
  if(!code)return res.status(400).json({error:'Digite um código.'});
  const found=city.redeemCodes.find(c=>c.code===code);
  if(!found)return res.status(404).json({error:'Código não encontrado.'});
  const expires=Date.parse(found.expiresAt);
  if(!Number.isFinite(expires)||expires<=Date.now())return res.status(410).json({error:'Este código já venceu.'});
  found.redeemedBy=found.redeemedBy&&typeof found.redeemedBy==='object'?found.redeemedBy:{};
  if(found.redeemedBy[req.username])return res.status(409).json({error:'Você já resgatou este código.'});

  const r=found.reward||{};
  const qty=Math.max(1,Math.min(999,Number(r.quantity)||1));
  let rewardText='';
  if(r.type==='money'){
    const amount=Math.max(0,Math.min(100000000,Number(r.amount)||0));
    req.user.money=Number(req.user.money||0)+amount;
    rewardText='R$ '+amount.toLocaleString('pt-BR',{minimumFractionDigits:2});
  }else if(r.type==='food'){
    const item=shopItems.find(x=>x.id===Number(r.itemId));
    if(!item)return res.status(400).json({error:'A comida configurada para este código não existe mais.'});
    req.user.inventory=req.user.inventory||{};
    req.user.inventory[item.id]=(Number(req.user.inventory[item.id])||0)+qty;
    rewardText=qty+'x '+item.name;
  }else if(r.type==='accessory'){
    const id=String(r.itemId||('reward_acc_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)));
    req.user.rewardAccessories=req.user.rewardAccessories||{};
    req.user.rewardAccessories[id]=req.user.rewardAccessories[id]||{id,name:String(r.name||'Acessório'),description:String(r.description||'Recompensa'),emoji:String(r.emoji||'🎁'),type:'equipamento',position:String(r.position||'side'),createdAt:new Date().toISOString()};
    req.user.companyInventory=req.user.companyInventory||{};
    req.user.companyInventory[id]=(Number(req.user.companyInventory[id])||0)+qty;
    rewardText=qty+'x '+req.user.rewardAccessories[id].name;
  }else if(r.type==='xp'){
    const amount=Math.max(0,Math.min(1000000,Number(r.amount)||0));
    req.user.xp=Number(req.user.xp||0)+amount;
    rewardText=amount+' XP';
  }else if(['life','hunger','hydration','energy'].includes(r.type)){
    const amount=Math.max(0,Math.min(100,Number(r.amount)||0));
    req.user[r.type]=Math.min(100,Number(req.user[r.type]||0)+amount);
    rewardText='+'+amount+' '+r.type;
  }else if(r.type==='item'){
    const id=String(r.itemId||'').slice(0,80);
    if(!id)return res.status(400).json({error:'Item inválido.'});
    req.user.rewardItems=req.user.rewardItems||{};
    req.user.rewardItemMeta=req.user.rewardItemMeta||{};
    req.user.rewardItems[id]=(Number(req.user.rewardItems[id])||0)+qty;
    req.user.rewardItemMeta[id]={
      id,
      name:String(r.name||'Item de recompensa'),
      emoji:String(r.emoji||'🎁').slice(0,8),
      description:String(r.description||'Recompensa recebida por código.').slice(0,300)
    };
    rewardText=qty+'x '+String(r.name||id);
  }else{
    return res.status(400).json({error:'Tipo de recompensa inválido.'});
  }
  found.redeemedBy[req.username]={date:new Date().toISOString()};
  saveData();
  res.json({message:'Código resgatado com sucesso!',reward:rewardText,user:req.user});
});

const requireActiveSession=(req,res,next)=>{req.user.lastActiveAt=Date.now();next()};
app.post('/api/me/activity',requireActiveSession,(req,res)=>{const activeSeconds=Math.max(0,Math.min(30,Number(req.body?.activeSeconds)||0));req.user.activeNeedSeconds=Math.max(0,Number(req.user.activeNeedSeconds)||0)+activeSeconds;const minutes=Math.floor(req.user.activeNeedSeconds/60);if(minutes>0){req.user.activeNeedSeconds-=minutes*60;req.user.hunger=Math.max(0,Number(req.user.hunger??100)-minutes);req.user.hydration=Math.max(0,Number(req.user.hydration??100)-minutes);req.user.energy=Math.max(0,Number(req.user.energy??100)-minutes);}saveData();res.json({hunger:req.user.hunger,hydration:req.user.hydration,energy:req.user.energy,life:req.user.life})});
app.post('/api/me/offline',(req,res)=>{req.user.lastActiveAt=0;saveData();res.json({ok:true})});
app.get('/api/me',(req,res)=>{req.user.character=normalizeCharacter(req.user.character);res.json({user:{name:req.user.name,username:req.user.username,money:req.user.money,level:req.user.level,xp:req.user.xp,jobName:req.user.jobName,life:req.user.life,hunger:req.user.hunger,hydration:req.user.hydration,energy:req.user.energy,profilePhoto:req.user.profilePhoto||null,character:req.user.character},isMayor:req.user.isMayor})});
app.get('/api/achievements',(req,res)=>{const defaults=[{id:'first_login',name:'Primeiro passo',description:'Entrou em Sorokiba pela primeira vez.',icon:'🚀'}];const list=Array.isArray(req.user.achievements)?req.user.achievements:[];const known=new Map(defaults.map(x=>[x.id,x]));list.forEach(x=>known.set(String(x.id||'custom_'+Math.random()),x));res.json([...known.values()]);});
app.put('/api/me/profile-photo',(req,res)=>{
  const photo=String(req.body?.profilePhoto||'').trim();
  if(photo && !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo))return res.status(400).json({error:'Imagem de perfil inválida.'});
  if(photo.length>900000)return res.status(400).json({error:'A foto é muito grande. Escolha uma imagem menor.'});
  req.user.profilePhoto=photo||null;saveData();
  res.json({message:photo?'Foto de perfil atualizada!':'Foto de perfil removida.',profilePhoto:req.user.profilePhoto});
});
app.put('/api/me/character',(req,res)=>{const next=normalizeCharacter(req.body?.character);ensureCompanyData();const owned=req.user.companyInventory||{};const valid=new Set();city.companies.forEach(c=>c.products.forEach(p=>{if(Number(owned[p.id]||0)>0&&['equipamento','tecnologia','decoracao','roupa'].includes(p.type))valid.add(p.id)}));Object.values(req.user.rewardAccessories||{}).forEach(p=>{if(Number(owned[p.id]||0)>0)valid.add(p.id)});next.accessories=next.accessories.filter(id=>valid.has(id));if(next.held&&!valid.has(next.held))next.held=null;req.user.character=next;saveData();res.json({message:'Personagem atualizado!',character:req.user.character})});
app.get('/api/city',(req,res)=>res.json(city));
app.get('/api/jobs',(req,res)=>res.json({jobs,currentJob:req.user.jobId,xp:req.user.xp}));
app.post('/api/jobs/select',(req,res)=>{const j=jobs.find(x=>x.id===req.body.jobId);if(!j)return res.status(404).json({error:'Profissão não encontrada'});if(req.user.xp<j.xpRequired)return res.status(403).json({error:'XP insuficiente'});req.user.jobId=j.id;req.user.jobName=j.name;saveData();res.json({message:`Profissão escolhida: ${j.name}`,user:req.user})});
const companyProductTypes={consumivel:'Consumível',equipamento:'Equipamento',tecnologia:'Tecnologia',veiculo:'Veículo',roupa:'Roupa',decoracao:'Decoração'};
const productCityCompatibility={consumivel:'necessidades',equipamento:'personagem',tecnologia:'personagem',veiculo:'veiculo',roupa:'personagem',decoracao:'cidade'};
const productCityCompatibilityLabel={necessidades:'Necessidades do cidadão',personagem:'Personalização do personagem',veiculo:'Garagem e trânsito',cidade:'Cidade e decoração'};
const productDesign=b=>{const x=b&&typeof b==='object'?b:{};const safe=(v,n)=>ct(v,n);return{name:safe(x.name,60),material:safe(x.material,40),finish:safe(x.finish,40),primaryColor:/^#[0-9a-f]{6}$/i.test(x.primaryColor||'')?x.primaryColor:'#20242c',secondaryColor:/^#[0-9a-f]{6}$/i.test(x.secondaryColor||'')?x.secondaryColor:'#e8edf5',dimensions:safe(x.dimensions,80),weight:safe(x.weight,30),durability:Math.max(0,Math.min(100,Number(x.durability)||0)),details:safe(x.details,180),realism:safe(x.realism,100)}};
const compatibleProduct=(companyType,productType)=>(companyTypes[companyType]||companyTypes.varejo).productTypes.includes(productType);
const companyId=()=> 'company_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
const productId=()=> 'prod_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const ct=(v,m)=>String(v??'').trim().slice(0,m);
const effects=v=>{const s=v&&typeof v==='object'?v:{},o={};['hunger','hydration','energy','life'].forEach(k=>{const n=Number(s[k]||0);if(Number.isFinite(n)&&n)o[k]=Math.max(-100,Math.min(100,Math.round(n)))});return o};
const vehicleCustomization=v=>{const s=v&&typeof v==='object'?v:{};const pick=(key,fallback)=>{const x=String(s[key]??fallback).trim();return /^#[0-9a-f]{6}$/i.test(x)?x:fallback};const allowed=(key,list,fb)=>list.includes(String(s[key]??''))?String(s[key]):fb;return{bodyColor:pick('bodyColor','#dfe6ee'),secondaryColor:pick('secondaryColor','#273449'),wheelColor:pick('wheelColor','#151a22'),windowColor:pick('windowColor','#7fc8e8'),neonColor:pick('neonColor','#7c5cff'),plateColor:pick('plateColor','#f2f2f2'),wheels:allowed('wheels',['Esportivas','Clássicas','Off-road','Luxo','Corrida'],'Esportivas'),windows:allowed('windows',['Originais','Escuros','Claros','Reflexivos'],'Originais'),bodyStyle:allowed('bodyStyle',['Esportivo','Urbano','Off-road','Luxo','Clássico'],'Urbano'),finish:allowed('finish',['Brilhante','Fosco','Metalizado','Perolizado'],'Brilhante'),lights:allowed('lights',['Originais','LED','Esportivos','Matrix'],'Originais'),bumper:allowed('bumper',['Original','Esportivo','Off-road','Premium'],'Original'),exhaust:allowed('exhaust',['Original','Duplo','Esportivo','Performance'],'Original'),spoiler:!!s.spoiler,neon:!!s.neon,sportKit:!!s.sportKit,roof:!!s.roof,tint:Math.max(0,Math.min(100,Math.round(Number(s.tint)||0)))}};
const technologyCustomization=b=>{const x=b||{};const category=ct(x.category,40)||'Celular';const version=ct(x.version,30)||'1.0';const specs=ct(x.specs,300);const color=/^#[0-9a-f]{6}$/i.test(x.color||'')?x.color:'#5b6cff';const accent=/^#[0-9a-f]{6}$/i.test(x.accent||'')?x.accent:'#25d0a5';const pick=(v,list,fb)=>list.includes(String(v))?String(v):fb;const utilityDescription=ct(x.utilityDescription,120)||'Aumenta energia';const effectTarget=pick(x.effectTarget,['Energia','Vida','Hidratação','Fome','XP','Dinheiro','Velocidade','Sorte','Eficiência'],'Energia');const effect=Math.max(1,Math.min(20,Math.round(Number(x.effect)||1)));return{category,version,specs,color,accent,material:pick(x.material,['Alumínio','Vidro','Plástico premium','Aço','Fibra de carbono'],'Alumínio'),finish:pick(x.finish,['Fosco','Brilhante','Metalizado','Texturizado'],'Fosco'),screen:pick(x.screen,['LCD','OLED','AMOLED','Mini-LED','Sem tela'],'OLED'),camera:pick(x.camera,['Única','Dupla','Tripla','Profissional','Sem câmera'],'Dupla'),storage:pick(x.storage,['32 GB','64 GB','128 GB','256 GB','512 GB','1 TB'],'128 GB'),battery:ct(x.battery,30)||'4500 mAh',utilityDescription,effectTarget,effect}};
const clothingCustomization=b=>{const x=b||{};const allowed=['Camiseta','Calça','Jaqueta','Boné','Tênis','Óculos'];const category=allowed.includes(x.category)?x.category:'Camiseta';const styles=['Casual','Esportivo','Urbano','Social','Elegante','Streetwear','Vintage'];const style=styles.includes(x.style)?x.style:'Casual';const sizes=['P','M','G','GG'];const size=sizes.includes(x.size)?x.size:'M';const patterns=['Lisa','Listras','Pontos','Xadrez','Degradê','Camuflagem','Geométrica'];const pattern=patterns.includes(x.pattern)?x.pattern:'Lisa';const fits=['Normal','Solto','Justo','Oversized'];const fit=fits.includes(x.fit)?x.fit:'Normal';const fabrics=['Algodão','Jeans','Couro sintético','Poliéster','Malha','Tecido premium'];const fabric=fabrics.includes(x.fabric)?x.fabric:'Algodão';const collars=['Redonda','V','Alta','Sem gola'];const collar=collars.includes(x.collar)?x.collar:'Redonda';const details=['Nenhum','Faixa','Costura','Bolso','Faixa dupla'];const detail=details.includes(x.detail)?x.detail:'Nenhum';const soles=['Clássica','Esportivo','Alto','Transparente'];const sole=soles.includes(x.sole)?x.sole:'Clássica';const lenses=['Transparente','Escura','Colorida','Reflexiva'];const lens=lenses.includes(x.lens)?x.lens:'Transparente';const shapes=['Clássico','Redondo','Quadrado','Aviador','Aerodinâmico'];const shape=shapes.includes(x.shape)?x.shape:'Clássico';const shoeModels=['Corrida','Basquete','Skate','Casual','Futebol'];const shoeModel=shoeModels.includes(x.shoeModel)?x.shoeModel:'Corrida';const closures=['Cadarço','Velcro','Slip-on'];const closure=closures.includes(x.closure)?x.closure:'Cadarço';const shoeDetails=['Nenhum','Listras','Costura','Faixa','Refletivo','Textura'];const shoeDetail=shoeDetails.includes(x.shoeDetail)?x.shoeDetail:'Nenhum';const frameStyles=['Esportivo','Minimalista','Retro','Premium'];const frameStyle=frameStyles.includes(x.frameStyle)?x.frameStyle:'Esportivo';const frameMaterials=['Acetato','Metal','Policarbonato','Esportivo'];const frameMaterial=frameMaterials.includes(x.frameMaterial)?x.frameMaterial:'Acetato';const pick=(v,f)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f;return{category,style,size,primaryColor:pick(x.primaryColor,'#20242c'),secondaryColor:pick(x.secondaryColor,'#e8edf5'),pattern,fit,fabric,collar,detail,sole,lens,lensColor:pick(x.lensColor,'#e8edf5'),shape,shoeModel,closure,shoeDetail,frameStyle,frameMaterial}};
const productInput=b=>{const type=String(b?.type||'consumivel'),name=ct(b?.name,80),description=ct(b?.description,300),price=Number(b?.price),image=typeof b?.image==='string'?b.image.trim():'';const emoji=ct(b?.emoji,8)||'📦';if(!companyProductTypes[type])return{error:'Tipo de produto inválido.'};if(!name)return{error:'Informe o nome do produto.'};if(!Number.isFinite(price)||price<=0||price>1000000)return{error:'Preço inválido.'};if(image.length>550000)return{error:'A foto é grande demais.'};if(image&&!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(image)&&!/^https?:\/\//i.test(image))return{error:'Foto inválida.'};const tech=type==='tecnologia'?technologyCustomization(b?.technologyCustomization):null;const clothing=type==='roupa'?clothingCustomization(b?.clothingCustomization):null;return{product:{id:productId(),name,description,price:Math.round(price*100)/100,type,effects:type==='consumivel'?effects(b?.effects):{},image,emoji,technologyCustomization:tech,clothingCustomization:clothing,vehicleCustomization:type==='veiculo'?vehicleCustomization(b?.vehicleCustomization):null,productDesign:productDesign(b?.productDesign),cityCompatibility:productCityCompatibility[type]||'cidade',cityCompatibilityLabel:productCityCompatibilityLabel[productCityCompatibility[type]]||'Cidade',createdAt:new Date().toISOString()}}};
const validCompanyImage=v=>{const image=typeof v==='string'?v.trim():'';if(!image)return '';if(image.length>550000)return null;if(!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(image)&&!/^https?:\/\//i.test(image))return null;return image};
const publicCompany=c=>({id:c.id,name:c.name,description:c.description,companyImage:c.companyImage||'',companyType:inferCompanyType(c),companyTypeLabel:(companyTypes[inferCompanyType(c)]||companyTypes.varejo).label,companyTypeDescription:(companyTypes[inferCompanyType(c)]||companyTypes.varejo).description,ownerUsername:c.ownerUsername,ownerName:c.ownerName,featured:!!c.featured,createdAt:c.createdAt,productCount:c.products.length,products:c.products,totalSales:c.totalSales||0,salesCount:c.salesCount||0,level:c.level||1,xp:c.xp||0});
app.get('/api/my-companies',(req,res)=>{ensureCompanyData();processCompanyFees();const mine=city.companies.filter(c=>c.ownerUsername===req.username).map(c=>({...publicCompany(c),balance:c.balance||0,totalSales:c.totalSales||0,salesCount:c.salesCount||0,level:c.level||1,xp:c.xp||0,nextFeeAt:c.nextFeeAt||null,weeklyFee:250}));res.json({companies:mine})});
app.post('/api/companies/:id/vehicle-sightings',(req,res)=>res.status(400).json({error:'Veículos são registrados automaticamente nas saudações.'}));
app.get('/api/company-sales',(req,res)=>{ensureCompanyData();processCompanyFees();const c=city.companies.find(x=>x.id===req.query.companyId&&x.ownerUsername===req.username);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});res.json({sales:c.sales||[],balance:c.balance||0,totalSales:c.totalSales||0,salesCount:c.salesCount||0,level:c.level||1,xp:c.xp||0,weeklyFee:250,nextFeeAt:c.nextFeeAt||null})});
app.get('/api/companies',(req,res)=>{ensureCompanyData();const q=ct(req.query?.search,80).toLowerCase();let list=city.companies.map(publicCompany);if(q)list=list.filter(c=>c.name.toLowerCase().includes(q)||c.description.toLowerCase().includes(q)||c.products.some(p=>p.name.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)));const featured=list.filter(c=>c.featured).slice(0,6);const recent=list.filter(c=>!featured.some(x=>x.id===c.id)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);res.json({companies:list,featured,recent})});
app.get('/api/companies/:id',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});res.json({company:publicCompany(c),isOwner:c.ownerUsername===req.username})});
app.post('/api/companies',(req,res)=>{ensureCompanyData();if((Number(req.user.money)||0)<10000)return res.status(400).json({error:'Você precisa de R$ 10.000 para criar uma empresa.'});if(city.companies.filter(c=>c.ownerUsername===req.username).length>=3)return res.status(400).json({error:'Você já possui o limite de 3 empresas.'});const name=ct(req.body?.name,80),description=ct(req.body?.description,500),companyType=companyTypes[req.body?.companyType]?String(req.body.companyType):'varejo',companyImage=validCompanyImage(req.body?.companyImage);if(companyImage===null)return res.status(400).json({error:'Foto da empresa inválida ou grande demais.'});if(!name)return res.status(400).json({error:'Informe o nome da empresa.'});if(city.companies.some(c=>c.name.toLowerCase()===name.toLowerCase()))return res.status(400).json({error:'Já existe uma empresa com esse nome.'});const p=productInput(req.body?.product||{});if(p.error)return res.status(400).json({error:p.error});if(!compatibleProduct(companyType,p.product.type))return res.status(400).json({error:'Esse produto não é compatível com a área da empresa.'});req.user.money=(Number(req.user.money)||0)-10000;const c={id:companyId(),name,description,companyType,companyImage:companyImage||'',ownerUsername:req.username,ownerName:req.user.name,balance:0,totalSales:0,salesCount:0,xp:0,level:1,sales:[],featured:false,createdAt:new Date().toISOString(),products:[p.product],nextFeeAt:new Date(Date.now()+7*24*60*60*1000).toISOString()};city.companies.push(c);req.user.companyIds=Array.isArray(req.user.companyIds)?req.user.companyIds:[];req.user.companyIds.push(c.id);saveData();res.json({message:'Empresa criada com sucesso!',company:publicCompany(c)})});
app.delete('/api/companies/:id',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});if(c.ownerUsername!==req.username)return res.status(403).json({error:'Apenas o dono pode excluir a empresa.'});const reason=ct(req.body?.reason,500);if(reason.length<10)return res.status(400).json({error:'Informe uma justificativa com pelo menos 10 caracteres.'});const refund=5000;req.user.money=(Number(req.user.money)||0)+refund;const productIds=new Set((c.products||[]).map(p=>String(p.id)));Object.values(users).forEach(u=>{if(Array.isArray(u.companyIds))u.companyIds=u.companyIds.filter(id=>String(id)!==String(c.id));if(u.companyInventory)productIds.forEach(id=>delete u.companyInventory[id]);if(u.equippedCompanyProducts)productIds.forEach(id=>delete u.equippedCompanyProducts[id]);if(String(u.equippedVehicleProductId||'')&&productIds.has(String(u.equippedVehicleProductId)))u.equippedVehicleProductId=null});city.companies=city.companies.filter(x=>x.id!==c.id);saveData();res.json({message:'Empresa excluída. R$ 5.000 foram devolvidos.',refund,reason})});app.put('/api/companies/:id',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});if(c.ownerUsername!==req.username)return res.status(403).json({error:'Apenas o dono pode modificar a empresa.'});if(req.body?.companyImage!==undefined){const image=validCompanyImage(req.body.companyImage);if(image===null)return res.status(400).json({error:'Foto da empresa inválida ou grande demais.'});c.companyImage=image}if(req.body?.description!==undefined)c.description=ct(req.body.description,500);saveData();res.json({message:'Empresa atualizada!',company:publicCompany(c)})});
app.post('/api/companies/:id/products',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});if(c.ownerUsername!==req.username)return res.status(403).json({error:'Apenas o dono pode adicionar produtos.'});if(c.products.length>=50)return res.status(400).json({error:'Limite de 50 produtos.'});const p=productInput(req.body||{});if(p.error)return res.status(400).json({error:p.error});if(!compatibleProduct(inferCompanyType(c),p.product.type))return res.status(400).json({error:'Esse produto não é compatível com a área desta empresa.'});c.products.push(p.product);saveData();res.json({message:'Produto adicionado!',company:publicCompany(c)})});
app.put('/api/companies/:id/products/:productId',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});if(c.ownerUsername!==req.username)return res.status(403).json({error:'Apenas o dono pode modificar produtos.'});const p=c.products.find(x=>x.id===req.params.productId);if(!p)return res.status(404).json({error:'Produto não encontrado.'});if(req.body?.productDesign)p.productDesign=productDesign(req.body.productDesign);if(p.type==='veiculo')p.vehicleCustomization=vehicleCustomization(req.body?.vehicleCustomization);else if(p.type==='tecnologia')p.technologyCustomization=technologyCustomization(req.body?.technologyCustomization);else if(p.type==='roupa')p.clothingCustomization=clothingCustomization(req.body?.clothingCustomization);if(req.body?.emoji)p.emoji=ct(req.body.emoji,8);saveData();res.json({message:'Produto personalizado com sucesso!',product:p})});app.delete('/api/companies/:id/products/:productId',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});if(c.ownerUsername!==req.username)return res.status(403).json({error:'Apenas o dono pode remover produtos.'});const i=c.products.findIndex(p=>p.id===req.params.productId);if(i<0)return res.status(404).json({error:'Produto não encontrado.'});c.products.splice(i,1);saveData();res.json({message:'Produto removido.'})});
app.post('/api/companies/:id/products/:productId/buy',(req,res)=>{ensureCompanyData();const c=city.companies.find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:'Empresa não encontrada.'});const p=c.products.find(x=>x.id===req.params.productId);if(!p)return res.status(404).json({error:'Produto não encontrado.'});if(c.ownerUsername===req.username && !(c.companyType==='alimentacao' && p.type==='consumivel'))return res.status(403).json({error:'O dono da empresa não pode comprar o próprio produto.'});const qty=Math.max(1,Math.min(99,Math.floor(Number(req.body?.quantity)||1))),total=p.price*qty;if(req.user.money<total)return res.status(400).json({error:'Dinheiro insuficiente.'});req.user.money-=total;const seller=users[c.ownerUsername];if(seller)seller.money=(Number(seller.money)||0)+total;c.balance=(Number(c.balance)||0)+total;c.totalSales=(Number(c.totalSales)||0)+total;c.salesCount=(Number(c.salesCount)||0)+qty;c.xp=(Number(c.xp)||0)+Math.max(1,Math.floor(total/10));c.level=Math.max(1,1+Math.floor((Number(c.xp)||0)/500));c.sales=Array.isArray(c.sales)?c.sales:[];c.sales.unshift({date:new Date().toISOString(),buyer:req.user.name,product:p.name,quantity:qty,total});c.sales=c.sales.slice(0,100);req.user.companyInventory=req.user.companyInventory||{};const inventoryProductId=String(p.id);req.user.companyInventory[inventoryProductId]=(Number(req.user.companyInventory[inventoryProductId])||0)+qty;saveData();res.json({message:p.name+' comprado! Foi para seu inventário.',user:req.user,companyInventory:req.user.companyInventory})});
app.get('/api/company-inventory',(req,res)=>{ensureCompanyData();const inv=req.user.companyInventory||{},items=[];city.companies.forEach(c=>c.products.forEach(p=>{const q=Number(inv[p.id]||0);if(q>0)items.push({companyId:c.id,companyName:c.name,companyType:inferCompanyType(c),companyTypeLabel:(companyTypes[inferCompanyType(c)]||companyTypes.varejo).label,product:p,quantity:q})}));Object.values(req.user.rewardAccessories||{}).forEach(p=>{const q=Number(inv[p.id]||0);if(q>0)items.push({companyId:'reward',companyName:'Recompensas',product:p,quantity:q})});res.json({items})});
app.post('/api/company-inventory/use',(req,res)=>{ensureCompanyData();const id=String(req.body?.productId||''),inv=req.user.companyInventory||{};if(Number(inv[id]||0)<1)return res.status(400).json({error:'Você não possui esse produto.'});let p=null;for(const c of city.companies){p=c.products.find(x=>x.id===id);if(p)break}if(!p)return res.status(404).json({error:'Produto não encontrado.'});const e=p.effects||{};if(p.type==='consumivel'){if(e.hunger)req.user.hunger=Math.max(0,Math.min(100,Number(req.user.hunger||0)+e.hunger));if(e.hydration)req.user.hydration=Math.max(0,Math.min(100,Number(req.user.hydration||0)+e.hydration));if(e.energy)req.user.energy=Math.max(0,Math.min(100,Number(req.user.energy||0)+e.energy));if(e.life)req.user.life=Math.max(0,Math.min(100,Number(req.user.life||0)+e.life));inv[id]--;saveData();return res.json({message:p.name+' usado e consumido.',user:req.user})}if(p.type==='tecnologia'&&p.technologyCustomization){const t=p.technologyCustomization,v=Math.max(1,Math.min(20,Number(t.effect)||1));if(t.effectTarget==='Energia')req.user.energy=Math.min(100,Number(req.user.energy||0)+v);else if(t.effectTarget==='Vida')req.user.life=Math.min(100,Number(req.user.life||0)+v);else if(t.effectTarget==='Hidratação')req.user.hydration=Math.min(100,Number(req.user.hydration||0)+v);else if(t.effectTarget==='Fome')req.user.hunger=Math.min(100,Number(req.user.hunger||0)+v);else if(t.effectTarget==='XP')req.user.xp=Number(req.user.xp||0)+v;else if(t.effectTarget==='Dinheiro')req.user.money=Number(req.user.money||0)+v;else {req.user.equippedCompanyProducts=req.user.equippedCompanyProducts||{};req.user.equippedCompanyProducts[id]=true;saveData();return res.json({message:p.name+' foi ativado: '+t.utilityDescription+'.',user:req.user})}saveData();return res.json({message:p.name+' ativado: '+t.utilityDescription+' (+'+v+' em '+t.effectTarget+').',user:req.user})}req.user.equippedCompanyProducts=req.user.equippedCompanyProducts||{};req.user.equippedCompanyProducts[id]=true;saveData();res.json({message:p.name+' foi ativado/equipado.',user:req.user})});
app.post('/api/company-inventory/equip',(req,res)=>{ensureCompanyData();const id=String(req.body?.productId||''),inv=req.user.companyInventory||{};if(Number(inv[id]||0)<1)return res.status(400).json({error:'Você não possui esse produto.'});let p=null;for(const c of city.companies){p=c.products.find(x=>x.id===id);if(p)break}if(!p)return res.status(404).json({error:'Produto não encontrado.'});if(p.type==='consumivel')return res.status(400).json({error:'Consumíveis não são equipáveis.'});if(p.type==='veiculo'){req.user.equippedVehicleProductId=id;saveData();return res.json({message:p.name+' foi colocado na sua garagem.',user:req.user})}req.user.equippedCompanyProducts=req.user.equippedCompanyProducts||{};req.user.equippedCompanyProducts[id]=true;saveData();res.json({message:p.name+' foi equipado para a cidade.',user:req.user})});
app.post('/api/company-inventory/unequip',(req,res)=>{ensureCompanyData();const id=String(req.body?.productId||'');if(req.user.equippedVehicleProductId===id){req.user.equippedVehicleProductId=null;saveData();return res.json({message:'Veículo retirado da garagem.',user:req.user})}req.user.equippedCompanyProducts=req.user.equippedCompanyProducts||{};delete req.user.equippedCompanyProducts[id];if(Array.isArray(req.user.character?.accessories))req.user.character.accessories=req.user.character.accessories.filter(x=>String(x)!==id);if(req.user.character?.held===id)req.user.character.held=null;saveData();res.json({message:'Produto desequipado.',user:req.user})});
app.get('/api/shop',(req,res)=>res.json(shopItems));
app.post('/api/shop/buy',(req,res)=>{const item=shopItems.find(x=>x.id===Number(req.body.id??req.body.itemId));const qty=Math.max(1,Number(req.body.quantity)||1);if(!item)return res.status(404).json({error:'Item não encontrado'});const total=item.price*qty;if(req.user.money<total)return res.status(400).json({error:'Dinheiro insuficiente'});req.user.money-=total;req.user.inventory[item.id]=(req.user.inventory[item.id]||0)+qty;saveData();res.json({message:`${item.name} comprado!`,user:req.user})});
app.post('/api/shop/use',(req,res)=>{const item=shopItems.find(x=>x.id===Number(req.body.id??req.body.itemId));if(!item)return res.status(404).json({error:'Item não encontrado'});if((req.user.inventory[item.id]||0)<1)return res.status(400).json({error:'Você não possui este item'});req.user.inventory[item.id]--;if(item.hunger)req.user.hunger=Math.min(100,req.user.hunger+item.hunger);if(item.hydration)req.user.hydration=Math.min(100,req.user.hydration+item.hydration);if(item.energy)req.user.energy=Math.min(100,req.user.energy+item.energy);saveData();res.json({message:`${item.name} usado!`,user:req.user})});
const hospitalResponse=(res,user,message)=>{
  const visit=hospitalVisitFor(user);
  res.json({message,visit:hospitalPublicVisit(visit),triage:summarizeHospitalStatus(user),player:hospitalPlayerStatus(user),history:Array.isArray(user.hospitalHistory)?user.hospitalHistory.slice(0,8):[]});
};
const hospitalPharmacyState=user=>{
  if(!user.hospitalPharmacyInventory||typeof user.hospitalPharmacyInventory!=='object')user.hospitalPharmacyInventory={};
  return {name:'Farmácia Hospitalar Sorokiba',attendant:'Marina, farmacêutica',items:hospitalPharmacyItems.map(({id,name,category,price,description,note})=>({id,name,category,price,description,note})),inventory:user.hospitalPharmacyInventory,prescription:hospitalPublicVisit(hospitalVisitFor(user))?.pharmacyPrescription||null};
};
const requireHospitalVisit=(req,res,stages)=>{
  const visit=hospitalVisitFor(req.user);
  if(!visit)return res.status(409).json({error:'Inicie sua chegada à recepção antes de continuar.'});
  advanceHospitalVisit(req.user);
  if(!stages.includes(visit.stage))return res.status(409).json({error:'Esta etapa ainda não está disponível. Atualize o Hospital e continue o atendimento.'});
  return visit;
};
const hospitalSymptomOptions=new Set(['sede','tontura','fraqueza','cansaço','fome','febre','mal-estar','dor','palpitacao','falta_ar','tosse','nausea','vomito','dor_abdominal','dor_persistente','perda_peso']);
app.get('/api/hospital',(req,res)=>{
  advanceHospitalVisit(req.user);
  const visit=hospitalVisitFor(req.user);
  res.json({services:hospitalServices,triage:summarizeHospitalStatus(req.user),visit:hospitalPublicVisit(visit),player:hospitalPlayerStatus(req.user),history:Array.isArray(req.user.hospitalHistory)?req.user.hospitalHistory.slice(0,8):[],pharmacy:hospitalPharmacyState(req.user)});
});
app.get('/api/hospital/pharmacy',(req,res)=>res.json(hospitalPharmacyState(req.user)));
app.post('/api/hospital/pharmacy/buy',(req,res)=>{
  const item=hospitalPharmacyItems.find(product=>product.id===String(req.body?.itemId||''));
  if(!item)return res.status(404).json({error:'Medicamento não encontrado na farmácia.'});
  const quantity=Number(req.body?.quantity??1),channel=req.body?.channel;
  if(!Number.isInteger(quantity)||quantity<1||quantity>10)return res.status(400).json({error:'Escolha uma quantidade entre 1 e 10.'});
  if(!['attendant','self-service'].includes(channel))return res.status(400).json({error:'Escolha o balcão ou o autoatendimento.'});
  const visit=hospitalVisitFor(req.user),prescription=visit?.pharmacyPrescription;
  if(channel==='attendant'){
    if(!prescription||prescription.visitId!==visit?.id||!visit.diagnosis)return res.status(409).json({error:'A balconista precisa de uma receita emitida pela médica neste atendimento.'});
    const prescribed=prescription.items?.find(entry=>entry.id===item.id);
    if(!prescribed)return res.status(403).json({error:'A receita não inclui este produto. Você pode comprá-lo no autoatendimento.'});
    const remaining=Number(prescribed.quantity||0)-Number(prescription.purchased?.[item.id]||0);
    if(quantity>remaining)return res.status(409).json({error:remaining>0?`A receita permite retirar mais ${remaining} unidade(s).`:'Este item da receita já foi entregue.'});
  }
  const total=Math.round(item.price*100)*quantity/100;
  if(Number(req.user.money||0)<total)return res.status(400).json({error:`Saldo insuficiente. A compra custa ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total)}.`});
  req.user.money=Number((Number(req.user.money||0)-total).toFixed(2));
  req.user.hospitalPharmacyInventory=req.user.hospitalPharmacyInventory||{};
  req.user.hospitalPharmacyInventory[item.id]=(Number(req.user.hospitalPharmacyInventory[item.id])||0)+quantity;
  const now=new Date().toISOString();
  const prescribed=prescription?.items?.find(entry=>entry.id===item.id);
  if(prescribed){
    prescription.purchased=prescription.purchased||{};
    prescription.purchased[item.id]=Math.min(Number(prescribed.quantity||0),(Number(prescription.purchased[item.id])||0)+quantity);
    if(channel==='attendant'){
      prescription.fulfilled=prescription.fulfilled||{};
      prescription.fulfilled[item.id]=(Number(prescription.fulfilled[item.id])||0)+quantity;
    }
  }
  if(visit)visit.updates.unshift({at:now,text:`${quantity} unidade(s) de ${item.name} comprada(s) na ${channel==='attendant'?'receita retirada no balcão':'compra de autoatendimento'}.`});
  saveData();
  res.json({message:`${item.name} adicionado(s) ao inventário por ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total)}.`,player:hospitalPlayerStatus(req.user),pharmacy:hospitalPharmacyState(req.user)});
});
app.post('/api/hospital/pharmacy/use',(req,res)=>{
  const item=hospitalPharmacyItems.find(product=>product.id===String(req.body?.itemId||''));
  if(!item)return res.status(404).json({error:'Produto não encontrado.'});
  const visit=hospitalVisitFor(req.user),prescription=visit?.pharmacyPrescription,prescribed=prescription?.items?.find(entry=>entry.id===item.id);
  if(!visit||!['treatment','followup'].includes(visit.stage)||(visit.stage==='treatment'&&visit.treatment?.status!=='processing')||!visit.diagnosis||!prescription||prescription.visitId!==visit.id||!prescribed)return res.status(409).json({error:'Use medicamentos durante o tratamento ou acompanhamento indicado pela médica.'});
  const used=Number(prescription.used?.[item.id]||0);
  if(used>=Number(prescribed.quantity||0))return res.status(409).json({error:'A quantidade indicada pela médica para este atendimento já foi utilizada.'});
  req.user.hospitalPharmacyInventory=req.user.hospitalPharmacyInventory||{};
  if(Number(req.user.hospitalPharmacyInventory[item.id]||0)<1)return res.status(400).json({error:'Você ainda não possui este produto. Retire a receita no balcão ou compre no autoatendimento.'});
  req.user.hospitalPharmacyInventory[item.id]--;
  Object.entries(item.gameEffect).forEach(([key,value])=>{if(['life','hunger','hydration','energy'].includes(key))req.user[key]=hospitalClamp(Number(req.user[key]||0)+value,0,100)});
  prescription.used=prescription.used||{};
  prescription.used[item.id]=used+1;
  const now=new Date().toISOString();
  visit.updates.unshift({at:now,text:`${item.name} foi usado conforme a orientação da médica. Os indicadores do personagem foram atualizados.`});
  saveData();
  hospitalResponse(res,req.user,`${item.name} usado. Os efeitos são fictícios e exclusivos dos indicadores do jogo.`);
});
app.post('/api/hospital/arrive',(req,res)=>{
  const current=hospitalVisitFor(req.user);
  if(current&&!['discharged'].includes(current.stage))return res.status(409).json({error:'Você já tem um atendimento em andamento. Continue pela etapa atual.'});
  if(current){
    req.user.hospitalHistory=Array.isArray(req.user.hospitalHistory)?req.user.hospitalHistory:[];
    req.user.hospitalHistory.unshift({visitId:current.id,arrivedAt:current.arrivedAt,dischargedAt:current.dischargedAt,diagnosis:current.diagnosis?.name||'Avaliação concluída',life:Number(req.user.life||0)});
    req.user.hospitalHistory=req.user.hospitalHistory.slice(0,8);
  }
  const now=new Date().toISOString();
  req.user.hospitalVisit={id:`visit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,stage:'reception',arrivedAt:now,triage:null,symptoms:null,differential:[],recommendedServiceIds:[],exam:null,diagnosis:null,treatment:null,pharmacyPrescription:null,updates:[{at:now,text:'A recepção registrou sua chegada e avisou a equipe de enfermagem.'}],admissionRequired:false};
  saveData();
  hospitalResponse(res,req.user,'Chegada registrada. A recepcionista vai encaminhar você à triagem.');
});
app.post('/api/hospital/triage',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['reception']);
  if(!visit||res.headersSent)return;
  visit.triage={...summarizeHospitalStatus(req.user).vitals,measuredAt:new Date().toISOString()};
  visit.stage='triage';
  visit.updates.unshift({at:visit.triage.measuredAt,text:'A enfermagem mediu os sinais vitais e encaminhou os dados ao médico.'});
  saveData();
  hospitalResponse(res,req.user,'Triagem concluída. Seus sinais vitais já estão disponíveis para o médico.');
});
app.post('/api/hospital/consultation/start',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['triage']);
  if(!visit||res.headersSent)return;
  visit.stage='consultation';
  const now=new Date().toISOString();
  visit.updates.unshift({at:now,text:'O médico recebeu a ficha de triagem e iniciou a consulta.'});
  saveData();
  hospitalResponse(res,req.user,'A consulta médica começou.');
});
app.post('/api/hospital/consult',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['consultation']);
  if(!visit||res.headersSent)return;
  const requested=Array.isArray(req.body?.symptoms)?req.body.symptoms:[];
  if(requested.length>16||requested.some(item=>!hospitalSymptomOptions.has(item)))return res.status(400).json({error:'Revise os sintomas selecionados e tente novamente.'});
  const notes=String(req.body?.notes||'').trim().slice(0,400);
  const duration=['recentemente','hoje','alguns_dias'].includes(req.body?.duration)?req.body.duration:'recentemente';
  const symptoms=[...new Set(requested)];
  const differential=hospitalDifferential(req.user,symptoms,duration);
  const recommended=hospitalRecommendedExams(req.user,symptoms,duration);
  visit.symptoms={selected:symptoms,notes,duration};
  visit.differential=differential;
  visit.recommendedServiceIds=recommended.map(service=>service.id);
  visit.stage='assessment';
  const now=new Date().toISOString();
  visit.updates.unshift({at:now,text:'O médico analisou a conversa, a triagem e os indicadores do personagem; exames foram selecionados para investigação.'});
  saveData();
  hospitalResponse(res,req.user,'A avaliação foi registrada. O médico recomendou exames compatíveis com seus sinais.');
});
const startHospitalExam=(req,res)=>{
  const visit=requireHospitalVisit(req,res,['assessment']);
  if(!visit||res.headersSent)return;
  const id=Number(req.body?.serviceId??req.body?.id);
  const service=hospitalServices.find(item=>item.id===id);
  if(!service)return res.status(404).json({error:'Exame não encontrado.'});
  if(!visit.recommendedServiceIds.includes(service.id))return res.status(403).json({error:'Este exame não foi recomendado para sua avaliação atual.'});
  if(Number(req.user.money||0)<service.price)return res.status(400).json({error:'Dinheiro insuficiente para pagar este exame.'});
  req.user.money=Number(req.user.money||0)-service.price;
  const now=Date.now(),durationSeconds=hospitalRandomBetween(service.durationSeconds);
  visit.exam={serviceId:service.id,serviceName:service.name,price:service.price,status:'processing',startedAt:new Date(now).toISOString(),endsAt:new Date(now+durationSeconds*1000).toISOString(),durationSeconds,estimatedTime:service.estimatedTime,finding:null,completedAt:null};
  visit.stage='exam';
  visit.updates.unshift({at:visit.exam.startedAt,text:`Pagamento confirmado. ${service.name} começou na sala de ${service.category.toLowerCase()}.`});
  saveData();
  hospitalResponse(res,req.user,`${service.name} iniciado. Você pode acompanhar o processamento nesta tela.`);
};
app.post('/api/hospital/exams/start',startHospitalExam);
app.post('/api/hospital/treat',startHospitalExam);
app.post('/api/hospital/results/review',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['results']);
  if(!visit||res.headersSent)return;
  if(!visit.exam||visit.exam.status!=='complete')return res.status(409).json({error:'O resultado ainda está sendo processado.'});
  const finding=visit.differential.find(item=>item.exams.includes(visit.exam.serviceId));
  const condition=hospitalConditions.find(item=>item.id===finding?.id)||hospitalConditions.find(item=>item.id==='sem-alteracoes');
  const severity=finding?.severity||'Leve';
  const admissionRequired=Number(req.user.life||0)<=25||severity==='Grave'||Number(req.user.life||0)<=condition.admissionThreshold||Number(req.user.hydration||0)<=15;
  visit.followupRequired=!!condition.followupRequired&&!visit.followupCompletedAt;
  visit.diagnosis={conditionId:condition.id,name:condition.name,severity,probability:finding?.probability||condition.baseProbability*100,explanation:`Os resultados foram interpretados junto com seus sintomas e indicadores. ${condition.treatment}`,treatment:condition.treatment,medications:condition.medications,recovery:condition.recoverySeconds,lifeLoss:condition.lifeLoss,needAdmission:admissionRequired,followupRequired:visit.followupRequired,reviewedAt:new Date().toISOString()};
  const prescribedItems=(condition.pharmacyMedicationIds||[]).filter(id=>hospitalPharmacyItems.some(item=>item.id===id));
  visit.pharmacyPrescription={id:`rx_${Date.now().toString(36)}`,visitId:visit.id,diagnosisName:condition.name,issuedAt:visit.diagnosis.reviewedAt,instructions:prescribedItems.length?'A médica recomenda os itens listados como apoio aos indicadores do jogo. Produtos fictícios; siga as orientações da equipe.':'A médica não indicou produtos de balcão para este quadro. Siga o plano de cuidado e não substitua a avaliação hospitalar por automedicação.',items:prescribedItems.map(id=>({id,quantity:1})),fulfilled:{},purchased:{},used:{}};
  visit.lastDeteriorationAt=visit.diagnosis.reviewedAt;
  visit.admissionRequired=admissionRequired;
  const noTreatment=condition.id==='sem-alteracoes'&&!admissionRequired;
  if(noTreatment)visit.treatment={status:'complete',type:'Alta sem tratamento específico',completedAt:visit.diagnosis.reviewedAt,progress:100};
  visit.stage=noTreatment?'followup':'treatment';
  visit.updates.unshift({at:visit.diagnosis.reviewedAt,text:`O médico explicou o diagnóstico (${condition.name}) e conversou sobre o tratamento${admissionRequired?' com internação e monitoramento':''}.`});
  saveData();
  hospitalResponse(res,req.user,admissionRequired?'O médico recomendou internação e acompanhamento contínuo.':'O resultado foi explicado e o plano de tratamento está pronto.');
});
app.post('/api/hospital/followup/return',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['followup']);
  if(!visit||res.headersSent)return;
  if(!visit.followupRequired)return res.status(409).json({error:'Este atendimento não tem retorno investigativo pendente.'});
  const dueAt=Date.parse(visit.followupAt||'');
  if(!Number.isFinite(dueAt))return res.status(409).json({error:'O horário do retorno não está disponível. Peça à recepção para atualizar o agendamento.'});
  if(Number.isFinite(dueAt)&&Date.now()<dueAt)return res.status(409).json({error:'O retorno foi agendado para o próximo dia do jogo. Volte quando a contagem terminar.',followupAt:visit.followupAt});
  const symptoms=visit.symptoms?.selected||[];
  const duration=visit.symptoms?.duration||'alguns_dias';
  visit.followupCompletedAt=new Date().toISOString();
  visit.followupRequired=false;
  visit.followupAt=null;
  visit.differential=hospitalDifferential(req.user,symptoms,duration);
  const recommended=hospitalRecommendedExams(req.user,symptoms,duration);
  visit.recommendedServiceIds=recommended.map(service=>service.id);
  visit.exam=null;
  visit.diagnosis=null;
  visit.treatment=null;
  visit.pharmacyPrescription=null;
  visit.stage='assessment';
  visit.updates.unshift({at:visit.followupCompletedAt,text:'O paciente voltou no dia seguinte. O médico iniciou uma nova etapa de exames para aprofundar a investigação.'});
  saveData();
  hospitalResponse(res,req.user,'Retorno registrado. O médico atualizou a avaliação e solicitou exames complementares.');
});
app.post('/api/hospital/treatment',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['treatment','followup']);
  if(!visit||res.headersSent)return;
  if(visit.treatment?.status==='processing')return res.status(409).json({error:'O tratamento já está em andamento.'});
  const condition=hospitalConditions.find(item=>item.id===visit.diagnosis?.conditionId);
  if(!condition)return res.status(409).json({error:'O médico precisa revisar os resultados antes de iniciar o tratamento.'});
  if(!visit.admissionRequired&&(Number(req.user.life||0)<=25||Number(req.user.hydration||0)<=15)){
    visit.admissionRequired=true;
    visit.diagnosis.severity=Number(req.user.life||0)<=25?'Grave':'Moderada';
    saveData();
    return res.status(409).json({error:'Seus sinais mudaram. O médico recomenda internação, que custa R$ 300; revise o plano antes de pagar.'});
  }
  const price=visit.admissionRequired?300:90;
  if(Number(req.user.money||0)<price)return res.status(400).json({error:`O tratamento custa R$ ${price}; saldo insuficiente.`});
  req.user.money=Number(req.user.money||0)-price;
  const now=Date.now(),durationSeconds=hospitalRandomBetween(condition.recoverySeconds);
  visit.treatment={status:'processing',price,startedAt:new Date(now).toISOString(),lastTickAt:new Date(now).toISOString(),endsAt:new Date(now+durationSeconds*1000).toISOString(),durationSeconds,progress:0,type:visit.admissionRequired?'Internação e monitoramento':'Tratamento ambulatorial',medications:condition.medications||[]};
  visit.lastDeteriorationAt=visit.treatment.startedAt;
  visit.stage='treatment';
  visit.updates.unshift({at:visit.treatment.startedAt,text:`${visit.treatment.type} iniciado. A equipe vai monitorar seus indicadores durante a recuperação.`});
  saveData();
  hospitalResponse(res,req.user,`${visit.treatment.type} iniciado; a recuperação será acompanhada nesta tela.`);
});
app.post('/api/hospital/release',(req,res)=>{
  const visit=requireHospitalVisit(req,res,['followup']);
  if(!visit||res.headersSent)return;
  if(visit.followupRequired)return res.status(409).json({error:'O médico agendou um retorno para aprofundar a investigação antes da alta.'});
  if(visit.treatment?.status!=='complete')return res.status(409).json({error:'A equipe ainda está acompanhando sua recuperação.'});
  if(visit.admissionRequired&&(Number(req.user.life||0)<50||Number(req.user.hydration||0)<35))return res.status(409).json({error:'O médico recomenda continuar internado até seus indicadores melhorarem.'});
  visit.stage='discharged';visit.dischargedAt=new Date().toISOString();
  visit.updates.unshift({at:visit.dischargedAt,text:'O médico liberou o paciente com orientações de retorno e autocuidado.'});
  saveData();
  hospitalResponse(res,req.user,'Alta concedida. Cuide dos indicadores e volte se os sintomas reaparecerem.');
});
app.get('/api/inventory',(req,res)=>{
  const items=[...shopItems];
  const meta=req.user.rewardItemMeta||{};
  Object.values(meta).forEach(p=>items.push({
    id:p.id,name:p.name,icon:p.emoji||'🎁',description:p.description||'Recompensa recebida por código.',
    hunger:0,hydration:0,energy:0,rewardItem:true
  }));
  res.json({inventory:req.user.inventory||{},items});
});
app.post('/api/inventory/use',(req,res)=>{const item=shopItems.find(x=>x.id===Number(req.body.itemId??req.body.id));if(!item)return res.status(404).json({error:'Item não encontrado'});if((req.user.inventory[item.id]||0)<1)return res.status(400).json({error:'Você não possui este item'});req.user.inventory[item.id]--;if(item.hunger)req.user.hunger=Math.min(100,req.user.hunger+item.hunger);if(item.hydration)req.user.hydration=Math.min(100,req.user.hydration+item.hydration);if(item.energy)req.user.energy=Math.min(100,req.user.energy+item.energy);saveData();res.json({message:`${item.name} usado!`,user:req.user})});

// === Kiba Finance + Civic Tools ===
const kibaTransferDrafts=new Map();
const KIBA_TRANSFER_DRAFT_TTL_MS=5*60*1000;
const pruneKibaTransferDrafts=()=>{
  const now=Date.now();
  for(const [id,draft] of kibaTransferDrafts){
    if(draft.expiresAt<=now)kibaTransferDrafts.delete(id);
  }
};
const kibaMoney=amount=>Math.round(Number(amount)*100)/100;
const kibaNormalizeRecipientText=value=>String(value||'').trim().replace(/^@/,'').replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const kibaPublicRecipient=username=>{
  const raw=String(username||'').trim().replace(/^@/,'');
  if(!raw)return null;
  const exact=users[raw];
  if(exact)return {username:exact.username,name:exact.name};
  const normalized=kibaNormalizeRecipientText(raw);
  const byName=Object.values(users).filter(u=>kibaNormalizeRecipientText(u?.name)===normalized);
  if(byName.length===1)return {username:byName[0].username,name:byName[0].name};
  return null;
};
const kibaCategorizeTransaction=item=>{
  const raw=String(item?.type||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(raw.includes('transferencia enviada'))return 'Transferências enviadas';
  if(raw.includes('transferencia recebida'))return 'Transferências recebidas';
  if(raw.includes('deposit'))return 'Depósitos';
  if(raw.includes('saque'))return 'Saques';
  if(raw.includes('multa'))return 'Multas';
  return 'Outros';
};
app.get('/api/kiba/plugins/bank',(req,res)=>{
  const transactions=Array.isArray(req.user.transactions)?req.user.transactions:[];
  const allMovements=transactions.map(item=>{
    const timestamp=Date.parse(item?.date),amount=Math.abs(Number(item?.amount));
    if(!Number.isFinite(timestamp)||!Number.isFinite(amount)||amount<=0)return null;
    return {id:String(item?.id||('tx_'+timestamp)),date:new Date(timestamp).toISOString(),type:String(item?.type||'Movimentação'),category:kibaCategorizeTransaction(item),person:String(item?.personName||item?.person||'').slice(0,80),amount,direction:Number(item?.amount||0)<0?'out':'in',reason:String(item?.reason||'').slice(0,180)};
  }).filter(Boolean).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  const total=list=>list.reduce((sum,item)=>sum+item.amount,0);
  const byCategory={};
  allMovements.forEach(item=>{byCategory[item.category]=(byCategory[item.category]||0)+item.amount});
  const outgoing=allMovements.filter(x=>x.direction==='out'),incoming=allMovements.filter(x=>x.direction==='in');
  const recipients={};
  outgoing.filter(x=>x.category==='Transferências enviadas').forEach(x=>{const key=x.person||'Destino não informado';recipients[key]=(recipients[key]||0)+x.amount});
  res.json({
    cash:Number(req.user.money||0),bankBalance:Number(req.user.bankBalance||0),
    totalAssets:Number(req.user.money||0)+Number(req.user.bankBalance||0),
    summary:{
      incoming:total(incoming),outgoing:total(outgoing),
      deposits:total(allMovements.filter(x=>x.category==='Depósitos')),
      withdrawals:total(allMovements.filter(x=>x.category==='Saques')),
      transfersSent:total(allMovements.filter(x=>x.category==='Transferências enviadas')),
      transfersReceived:total(allMovements.filter(x=>x.category==='Transferências recebidas'))
    },
    categories:Object.entries(byCategory).map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount),
    topRecipients:Object.entries(recipients).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([person,amount])=>({person,amount})),
    movements:allMovements.slice(0,60),movementsLimited:allMovements.length>60
  });
});
app.post('/api/kiba/plugins/bank/transfer-draft',(req,res)=>{
  pruneKibaTransferDrafts();
  const username=String(req.body?.username||'').trim(),amount=kibaMoney(req.body?.amount),note=String(req.body?.note||'').replace(/\s+/g,' ').trim().slice(0,180);
  if(!username||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Informe destinatário e um valor válido.'});
  if(username===req.username)return res.status(400).json({error:'Você não pode transferir para si mesmo.'});
  const target=kibaPublicRecipient(username);
  if(!target)return res.status(404).json({error:'Cidadão destinatário não encontrado.'});
  if(Number(req.user.bankBalance||0)<amount)return res.status(400).json({error:'Saldo bancário insuficiente para essa transferência.'});
  const draftId=crypto.randomBytes(18).toString('hex');
  kibaTransferDrafts.set(draftId,{username:req.username,targetUsername:username,targetName:target.name,amount,note,createdAt:Date.now(),expiresAt:Date.now()+KIBA_TRANSFER_DRAFT_TTL_MS});
  res.json({draftId,target,amount,note,currentBankBalance:Number(req.user.bankBalance||0),remainingBankBalance:Math.max(0,Number(req.user.bankBalance||0)-amount),expiresInSeconds:KIBA_TRANSFER_DRAFT_TTL_MS/1000});
});
app.post('/api/kiba/plugins/bank/transfer-draft/:id/submit',(req,res)=>{
  pruneKibaTransferDrafts();
  const draft=kibaTransferDrafts.get(req.params.id);
  if(!draft||draft.username!==req.username)return res.status(404).json({error:'Autorização não encontrada ou expirada.'});
  const amount=kibaMoney(draft.amount),target=users[draft.targetUsername];
  if(!target)return res.status(404).json({error:'Destinatário indisponível.'});
  if(Number(req.user.bankBalance||0)<amount)return res.status(400).json({error:'O saldo bancário mudou e não é suficiente.'});
  req.user.bankBalance-=amount;
  target.bankBalance=Number(target.bankBalance||0)+amount;
  const txDate=new Date().toISOString(),txId='tx_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
  req.user.transactions=Array.isArray(req.user.transactions)?req.user.transactions:[];target.transactions=Array.isArray(target.transactions)?target.transactions:[];
  req.user.transactions.push({id:txId,date:txDate,type:'Transferência enviada',person:target.username,personName:target.name,amount:-amount,reason:draft.note||'Transferência autorizada pelo Kiba'});
  target.transactions.push({id:txId+'_r',date:txDate,type:'Transferência recebida',person:req.username,personName:req.user.name,amount,reason:draft.note||'Transferência recebida via Kiba'});
  kibaTransferDrafts.delete(req.params.id);saveData();
  res.json({message:'Transferência realizada após sua confirmação.',transaction:{id:txId,targetName:target.name,amount,note:draft.note||''},bankBalance:req.user.bankBalance});
});
app.delete('/api/kiba/plugins/bank/transfer-draft/:id',(req,res)=>{
  pruneKibaTransferDrafts();
  const draft=kibaTransferDrafts.get(req.params.id);
  if(!draft||draft.username!==req.username)return res.status(404).json({error:'Transferência não encontrada.'});
  kibaTransferDrafts.delete(req.params.id);res.json({message:'Transferência cancelada. Nenhum valor foi movimentado.'});
});
app.post('/api/kiba/plugins/bank/plan',(req,res)=>{
  const months=Math.max(1,Math.min(12,Number(req.body?.months)||1)),transactions=Array.isArray(req.user.transactions)?req.user.transactions:[];
  const outgoing=transactions.map(item=>{
    const amount=Math.abs(Number(item?.amount)),date=Date.parse(item?.date);
    if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(date))return null;
    return {date:new Date(date).toISOString(),type:String(item?.type||'Movimentação'),person:String(item?.personName||item?.person||''),amount,category:kibaCategorizeTransaction(item)};
  }).filter(Boolean).filter(x=>['Transferências enviadas','Multas','Saques'].includes(x.category));
  const totalOutgoing=outgoing.reduce((s,x)=>s+x.amount,0),avgMonthly=totalOutgoing/months;
  const bank=Number(req.user.bankBalance||0),cash=Number(req.user.money||0),assets=bank+cash,safeReserve=Math.round(assets*.20*100)/100;
  res.json({
    periodMonths:months,assets:{cash,bank,total:assets},outgoingTotal:totalOutgoing,averagePerPeriod:avgMonthly,
    suggestedReserve:safeReserve,availableAfterReserve:Math.max(0,bank-safeReserve),
    priority:outgoing.slice(0,10),
    categories:[
      {name:'Transferências',value:outgoing.filter(x=>x.category==='Transferências enviadas').reduce((s,x)=>s+x.amount,0)},
      {name:'Multas',value:outgoing.filter(x=>x.category==='Multas').reduce((s,x)=>s+x.amount,0)},
      {name:'Saques',value:outgoing.filter(x=>x.category==='Saques').reduce((s,x)=>s+x.amount,0)}
    ]
  });
});
app.get('/api/bank',(req,res)=>res.json({bankBalance:Number(req.user.bankBalance||0),transfers:req.user.transactions||[]}));
app.post('/api/bank/deposit',(req,res)=>{const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Valor inválido'});if(req.user.money<amount)return res.status(400).json({error:'Dinheiro insuficiente'});req.user.money-=amount;req.user.bankBalance=Number(req.user.bankBalance||0)+amount;(req.user.transactions||(req.user.transactions=[])).push({date:new Date(),type:'Depósito',person:req.user.name,amount});saveData();res.json({message:'Depósito realizado!',money:req.user.money,bankBalance:req.user.bankBalance,user:req.user})});
app.post('/api/bank/withdraw',(req,res)=>{const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Valor inválido'});if(Number(req.user.bankBalance||0)<amount)return res.status(400).json({error:'Saldo bancário insuficiente'});req.user.bankBalance-=amount;req.user.money=(req.user.money||0)+amount;(req.user.transactions||(req.user.transactions=[])).push({date:new Date(),type:'Saque',person:req.user.name,amount});saveData();res.json({message:'Saque realizado!',money:req.user.money,bankBalance:req.user.bankBalance,user:req.user})});
app.post('/api/bank/transfer',(req,res)=>{const amount=Number(req.body.amount),dest=String(req.body.username||'').trim();if(!dest||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Preencha os dados da transferência'});if(dest===req.username)return res.status(400).json({error:'Você não pode transferir para si mesmo'});if(Number(req.user.bankBalance||0)<amount)return res.status(400).json({error:'Saldo bancário insuficiente'});const target=users[dest];if(!target)return res.status(404).json({error:'Usuário destinatário não encontrado'});req.user.bankBalance-=amount;target.bankBalance=Number(target.bankBalance||0)+amount;(req.user.transactions||(req.user.transactions=[])).push({date:new Date(),type:'Transferência enviada',person:dest,amount});(target.transactions||(target.transactions=[])).push({date:new Date(),type:'Transferência recebida',person:req.username,amount});saveData();res.json({message:'Transferência realizada!',money:req.user.money,bankBalance:req.user.bankBalance,user:req.user})});
app.get('/api/mayor/rewards',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});res.json(city.missionRewards||{})});
app.post('/api/mayor/rewards',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const{jobId,moneyPerMission,xpPerMission,questionsPerMission}=req.body||{};if(!city.missionRewards)city.missionRewards={};if(!jobs.some(j=>j.id===jobId))return res.status(404).json({error:'Profissão não encontrada'});city.missionRewards[jobId]={moneyPerMission:Math.max(0,Number(moneyPerMission)||0),xpPerMission:Math.max(0,Number(xpPerMission)||0),questionsPerMission:Math.max(1,Math.min(5,Number(questionsPerMission)||2))};saveData();res.json({message:'Recompensa atualizada!'})});
app.get('/api/mayor/fines',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const list=Array.isArray(req.user.finesIssued)?req.user.finesIssued:[];res.json({fines:list})});
app.post('/api/mayor/fines', (req,res)=>{
 if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode aplicar multas'});
 const username=String(req.body?.username||'').trim(),reason=String(req.body?.reason||'').trim().slice(0,300),amount=Math.round(Number(req.body?.amount)*100)/100;
 if(!username||!reason||!Number.isFinite(amount)||amount<=0||amount>100000)return res.status(400).json({error:'Informe cidadão, motivo e um valor válido.'});
 if(username===req.username)return res.status(400).json({error:'O prefeito não pode aplicar multa a si mesmo.'});
 const target=users[username];if(!target)return res.status(404).json({error:'Cidadão não encontrado.'});
 if(Number(target.money||0)<amount)return res.status(400).json({error:'O cidadão não possui dinheiro suficiente para pagar esta multa.'});
 target.money=Number(target.money||0)-amount;
 req.user.money=Number(req.user.money||0)+amount;
 const fine={id:'fine_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),date:new Date().toISOString(),username,targetName:target.name,reason,amount,mayorUsername:req.username,mayorName:req.user.name};
 target.fines=Array.isArray(target.fines)?target.fines:[];target.fines.push(fine);
 req.user.finesIssued=Array.isArray(req.user.finesIssued)?req.user.finesIssued:[];req.user.finesIssued.push(fine);
 target.transactions=Array.isArray(target.transactions)?target.transactions:[];target.transactions.push({date:fine.date,type:'Multa da Prefeitura',person:req.user.name,amount:-amount,reason});
 req.user.transactions=Array.isArray(req.user.transactions)?req.user.transactions:[];req.user.transactions.push({date:fine.date,type:'Recebimento de multa',person:target.name,amount,reason});
 saveData();
 res.json({message:'Multa aplicada com sucesso.',fine,targetMoney:target.money,mayorMoney:req.user.money});
});
app.get('/api/me/fines',(req,res)=>res.json({fines:Array.isArray(req.user.fines)?req.user.fines:[]}));
app.get('/api/mayor/users',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode gerenciar contas'});const list=Object.values(users).filter(u=>u.username!==req.user.username).map(u=>({name:u.name,username:u.username,jobName:u.jobName,level:u.level,xp:u.xp,money:u.money}));res.json({users:list})});
app.delete('/api/mayor/users/:username',async(req,res)=>{try{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode excluir contas'});const username=String(req.params.username||'').trim();if(!username)return res.status(400).json({error:'Usuário inválido'});if(username===req.user.username)return res.status(400).json({error:'O prefeito não pode excluir a própria conta'});const target=users[username];if(!target)return res.status(404).json({error:'Conta não encontrada'});delete users[username];city.population=Math.max(0,Number(city.population||0)-1);await db.set('users',users);await db.set('city',city);res.json({message:'Conta excluída permanentemente.',username})}catch(e){console.error('Falha ao excluir conta:',e);res.status(500).json({error:'Não foi possível excluir a conta permanentemente.'})}});
app.get('/api/players',(req,res)=>res.json(Object.values(users).map(u=>({name:u.name,username:u.username,jobName:u.jobName,level:u.level,xp:u.xp,money:u.money,profilePhoto:u.profilePhoto||null,character:normalizeCharacter(u.character)}))));
app.get('/api/players/:username',(req,res)=>{const u=users[req.params.username];if(!u)return res.status(404).json({error:'Jogador não encontrado'});res.json({name:u.name,username:u.username,jobName:u.jobName,level:u.level,xp:u.xp,money:u.money,profilePhoto:u.profilePhoto||null,character:normalizeCharacter(u.character)})});
const defaultAchievements=[{id:'first_mission',name:'Primeira missão',description:'Complete sua primeira missão.',icon:'🎯'},{id:'first_purchase',name:'Primeira compra',description:'Compre seu primeiro item.',icon:'🛒'},{id:'citizen',name:'Cidadão',description:'Faça parte de Sorokiba.',icon:'🏙️'}];
app.get('/api/achievements',(req,res)=>res.json(defaultAchievements.filter(a=>(req.user.achievements||[]).includes(a.id))));
app.get('/api/missions',(req,res)=>{const job=jobs.find(j=>j.id===req.user.jobId);const userMissions=req.user.missions||[];const active=userMissions.filter(m=>m.status==='active');const state=getMissionState(req.user);if(state.cooldownUntil){const cooldownMs=new Date(state.cooldownUntil).getTime();if(!Number.isFinite(cooldownMs)||cooldownMs<=Date.now()){req.user.missionCooldownUntil=null;req.user.missionBatchCount=0;saveData()}}const finalState=getMissionState(req.user);res.json({job:{name:job.name,task:job.task},active,history:userMissions.filter(m=>m.status==='completed').slice(-10),missionsRemaining:active.length?0:finalState.remaining,missionsUsed:finalState.batchCount,cooldownUntil:finalState.cooldownUntil})});
app.post('/api/missions/start',(req,res)=>{if(!req.user.missions)req.user.missions=[];const state=getMissionState(req.user);if(state.cooldownUntil){const msLeft=new Date(state.cooldownUntil).getTime()-Date.now();if(msLeft>0){const minLeft=Math.floor(msLeft/60000),secLeft=Math.floor(msLeft%60000/1000);return res.status(400).json({error:`Você já fez 2 missões. Aguarde ${minLeft}:${String(secLeft).padStart(2,'0')} para receber mais 2 missões.`,cooldownUntil:state.cooldownUntil})}req.user.missionCooldownUntil=null;req.user.missionBatchCount=0}if(Number(req.user.missionBatchCount)>=2){startCooldownIfNeeded(req.user);saveData();return res.status(400).json({error:'Você já fez 2 missões. Aguarde 30 minutos para receber mais 2 missões.',cooldownUntil:req.user.missionCooldownUntil})}const activeMissions=req.user.missions.filter(m=>m.status==='active');if(activeMissions.length>0)return res.status(400).json({error:'Você já tem uma missão ativa'});const mission=createMission(req.user.jobId,req.username);if(!mission)return res.status(400).json({error:'Sem perguntas disponíveis para sua profissão. Volte mais tarde.'});req.user.missions.push(mission);saveData();res.json({message:`Missão iniciada! (${Number(req.user.missionBatchCount)+1}/2)`,mission:{id:mission.id,jobId:mission.jobId,started_at:mission.started_at,duration_seconds:mission.duration_seconds,questions:mission.questions,rewardXp:mission.rewardXp,rewardMoney:mission.rewardMoney}})});
const registerMissionUse=user=>{user.missionBatchCount=Number(user.missionBatchCount||0)+1;if(user.missionBatchCount>=2)startCooldownIfNeeded(user)};
app.post('/api/missions/:id/answer',(req,res)=>{const m=(req.user.missions||[]).find(x=>x.id===req.params.id&&x.status==='active');if(!m)return res.status(404).json({error:'Missão não encontrada'});const qIndex=Number(req.body.questionIndex),answer=Number(req.body.answer),qid=m.questionRefs[qIndex],q=findQuestionById(qid);if(!q)return res.status(400).json({error:'Pergunta não encontrada'});m.answers=m.answers||[];if(m.answers[qIndex]!==undefined)return res.status(400).json({error:'Essa pergunta já foi respondida'});m.answers[qIndex]=answer;req.user.answeredQuestions=req.user.answeredQuestions||[];if(!req.user.answeredQuestions.includes(q.id))req.user.answeredQuestions.push(q.id);if(answer===q.correct)req.user.xp=(req.user.xp||0)+Math.max(1,Math.floor((m.rewardXp||20)/m.questions.length));m.correctCount=(m.correctCount||0)+(answer===q.correct?1:0);const final=m.answers.filter(v=>v!==undefined).length>=m.questions.length;if(final){m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);req.user.money=(req.user.money||0)+(m.rewardMoney||0);refreshCityPass(req.user);saveData()}res.json({correct:answer===q.correct,correctIndex:q.correct,correctOptionText:q.options[q.correct],final,message:final?'Missão concluída!':(answer===q.correct?'Resposta correta!':'Resposta incorreta!'),xpGiven:final?m.rewardXp||0:0,moneyGiven:final?m.rewardMoney||0:0,user:{...req.user}})});
app.post('/api/missions/:id/complete',(req,res)=>{const m=(req.user.missions||[]).find(x=>x.id===req.params.id&&x.status==='active');if(!m)return res.status(404).json({error:'Missão não encontrada'});m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);saveData();res.json({message:'Missão encerrada.',user:{...req.user}})});
app.get('/api/news',(req,res)=>res.json(city.news));app.get('/api/events',(req,res)=>res.json(city.events));
app.get('/api/proposals',(req,res)=>{if(req.user.isMayor)return res.json(city.proposals.filter(p=>p.status==='pending'));return res.json(city.proposals.filter(p=>p.authorUsername===req.username||(!p.authorUsername&&p.author===req.user.name)))});
const createCityProposal=(user,title,description)=>{
  const proposal={id:`prop_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,author:user.name,authorUsername:user.username,title,description,status:'pending',createdAt:new Date()};
  city.proposals.push(proposal);
  saveData();
  return proposal;
};
app.post('/api/kiba/plugins/proposals/draft',(req,res)=>{
  const rawIdea=String(req.body?.idea||'').replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');
  const idea=rawIdea.replace(/^(?:por favor,?\s*)?(?:(?:me ajude(?: a)?|ajude-me(?: a)?|me ajuda|ajuda-me|quero|gostaria de|pode|poderia|crie|criar|escreva|escrever|redija|redigir|elabore|elaborar|monte|montar|fa[cç]a|fazer|formalize|formalizar)\s+)+/i,'').replace(/^(?:uma\s+)?proposta(?:\s+(?:para|sobre|de))?\s*/i,'').trim().replace(/[.!?]+$/,'');
  if(rawIdea.length<12||idea.length<6)return res.status(400).json({error:'Conte em uma frase qual melhoria você quer propor à Prefeitura.'});
  if(idea.length>240)return res.status(400).json({error:'Resuma a ideia em até 240 caracteres para eu preparar uma minuta clara.'});
  const lower=idea.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let category='Desenvolvimento urbano',priority='moderada';
  if(/hospital|saude|medic|exame/.test(lower))category='Saúde';
  else if(/escola|educa|professor|estud/.test(lower))category='Educação';
  else if(/emprego|trabalho|profiss/.test(lower))category='Emprego e renda';
  else if(/empresa|loja|comercio|negocio/.test(lower))category='Economia local';
  else if(/segur|policia|crime/.test(lower))category='Segurança';
  if(/urgente|urgencia|emergencia|imediat/.test(lower))priority='alta';
  else if(/longo prazo|futuro|estrategic/.test(lower))priority='baixa';
  const title='Proposta — '+idea;
  const description=[
    'À Prefeitura de Sorokiba,','',
    'Assunto: Proposta de melhoria pública',
    'Área: '+category,
    'Prioridade sugerida: '+priority,'',
    'Venho, respeitosamente, solicitar a análise da seguinte iniciativa: '+idea+'.','',
    'Objetivo',
    'A proposta tem como objetivo contribuir para a melhoria de '+category.toLowerCase()+', considerando as necessidades da população e o funcionamento atual da cidade.','',
    'Justificativa',
    'A iniciativa poderá ser avaliada quanto à viabilidade técnica, aos recursos necessários, ao impacto no orçamento e aos benefícios esperados para os cidadãos.','',
    'Solicitação',
    'Solicito que a Prefeitura analise a proposta, registre sua manifestação e, caso seja considerada viável, avalie sua implementação.','',
    'Atenciosamente,',
    String(req.user.name||'Cidadão').slice(0,60)
  ].join('\n');
  pruneKibaProposalDrafts();
  const draftId=crypto.randomBytes(18).toString('hex');
  kibaProposalDrafts.set(draftId,{username:req.username,title,description,category,priority,idea,expiresAt:Date.now()+KIBA_PROPOSAL_DRAFT_TTL_MS});
  res.json({draftId,title,description,category,priority,idea,expiresInSeconds:KIBA_PROPOSAL_DRAFT_TTL_MS/1000});
});
app.delete('/api/kiba/plugins/proposals/draft/:id',(req,res)=>{
  pruneKibaProposalDrafts();
  const draft=kibaProposalDrafts.get(req.params.id);
  if(!draft||draft.username!==req.username)return res.status(404).json({error:'Minuta não encontrada ou já expirada.'});
  kibaProposalDrafts.delete(req.params.id);
  res.json({message:'Minuta cancelada; nenhuma proposta foi enviada.'});
});
app.post('/api/kiba/plugins/proposals/draft/:id/submit',(req,res)=>{
  pruneKibaProposalDrafts();
  const draft=kibaProposalDrafts.get(req.params.id);
  if(!draft||draft.username!==req.username||draft.expiresAt<=Date.now()){
    kibaProposalDrafts.delete(req.params.id);
    return res.status(404).json({error:'Minuta não encontrada ou expirada. Peça ao Kiba para preparar uma nova.'});
  }
  kibaProposalDrafts.delete(req.params.id);
  const proposal=createCityProposal(req.user,draft.title,draft.description);
  res.json({message:'Proposta enviada à Prefeitura após sua confirmação.',proposal:{id:proposal.id,title:proposal.title}});
});
app.post('/api/proposals',(req,res)=>{const{title,description}=req.body;if(!title||!description)return res.status(400).json({error:'Preencha todos os campos'});createCityProposal(req.user,String(title),String(description));res.json({message:'Proposta enviada com sucesso!'})});
app.post('/api/mayor/proposals/:id/decide',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode decidir'});const{status,response}=req.body;if(!['approved','rejected'].includes(status))return res.status(400).json({error:'Resultado inválido'});const proposal=city.proposals.find(p=>p.id===req.params.id);if(!proposal)return res.status(404).json({error:'Proposta não encontrada'});if(proposal.status!=='pending')return res.status(400).json({error:'Esta proposta já foi avaliada'});proposal.status=status;proposal.response=String(response||'').trim();proposal.decidedAt=new Date();saveData();res.json({message:status==='approved'?'Proposta aprovada e resultado enviado ao cidadão!':'Proposta rejeitada e resultado enviado ao cidadão!'})});

app.get('/api/mayor',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});res.json({population:city.population,treasury:city.treasury,economy:city.economy,infrastructure:city.infrastructure,quality:city.quality,taxRate:city.taxRate,news:city.news,events:city.events,proposals:city.proposals.filter(p=>p.status==='pending')})});

app.post('/api/mayor/news',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const{title,text}=req.body;if(!title||!text)return res.status(400).json({error:'Preencha título e texto'});city.news.unshift({id:`news_${Date.now()}`,title,text,date:new Date()});saveData();res.json({message:'Notícia publicada!'})});
app.post('/api/mayor/events',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const{title,description}=req.body;if(!title||!description)return res.status(400).json({error:'Preencha título e descrição'});city.events.unshift({id:`event_${Date.now()}`,title,description,date:new Date()});saveData();res.json({message:'Evento criado!'})});


// === Prefeitura: criação e gerenciamento de códigos de resgate ===
app.get('/api/mayor/redeem-codes',(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  ensureRedeemCodes();
  const now=Date.now();
  res.json(city.redeemCodes.map(c=>({...c,expired:!Number.isFinite(Date.parse(c.expiresAt))||Date.parse(c.expiresAt)<=now,redeemedCount:Object.keys(c.redeemedBy||{}).length})));
});
app.post('/api/mayor/redeem-codes',(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  ensureRedeemCodes();
  const code=String(req.body?.code||'').trim().toUpperCase();
  const expiresAt=String(req.body?.expiresAt||'').trim();
  const reward=req.body?.reward&&typeof req.body.reward==='object'?req.body.reward:{};
  if(!/^[A-Z0-9_-]{4,40}$/.test(code))return res.status(400).json({error:'Código inválido. Use de 4 a 40 caracteres, sem espaços.'});
  if(city.redeemCodes.some(c=>String(c.code).toUpperCase()===code))return res.status(409).json({error:'Este código já existe.'});
  const expires=Date.parse(expiresAt);
  if(!Number.isFinite(expires)||expires<=Date.now())return res.status(400).json({error:'Informe uma data e horário de vencimento no futuro.'});
  const allowed=['money','food','accessory','xp','life','hunger','hydration','energy','item'];
  if(!allowed.includes(String(reward.type)))return res.status(400).json({error:'Escolha um tipo de recompensa válido.'});
  const clean={type:String(reward.type)};
  if(['money','xp','life','hunger','hydration','energy'].includes(clean.type)){const n=Number(reward.amount);if(!Number.isFinite(n)||n<=0)return res.status(400).json({error:'Informe um valor de recompensa válido.'});clean.amount=Math.round(n*100)/100}
  if(clean.type==='food'){const item=shopItems.find(x=>x.id===Number(reward.itemId));if(!item)return res.status(400).json({error:'Comida não encontrada.'});clean.itemId=item.id;clean.quantity=Math.max(1,Math.min(999,Number(reward.quantity)||1))}
  if(clean.type==='accessory'){const name=String(reward.name||'').trim().slice(0,80);if(!name)return res.status(400).json({error:'Informe o nome do acessório.'});clean.itemId='reward_acc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);clean.name=name;clean.description=String(reward.description||'').trim().slice(0,300);clean.emoji=String(reward.emoji||'🎁').slice(0,8);clean.position=String(reward.position||'side').slice(0,30);clean.quantity=Math.max(1,Math.min(999,Number(reward.quantity)||1))}
  if(clean.type==='item'){const name=String(reward.name||'').trim().slice(0,80);if(!name)return res.status(400).json({error:'Informe o nome do item.'});clean.itemId='reward_item_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);clean.name=name;clean.quantity=Math.max(1,Math.min(999,Number(reward.quantity)||1))}
  const entry={id:'redeem_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),code,expiresAt:new Date(expires).toISOString(),reward:clean,createdAt:new Date().toISOString(),createdBy:req.username,redeemedBy:{}};
  city.redeemCodes.unshift(entry);saveData();res.json({message:'Código de resgate criado!',code:entry});
});
app.delete('/api/mayor/redeem-codes/:id',(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  ensureRedeemCodes();
  const idx=city.redeemCodes.findIndex(c=>String(c.id)===String(req.params.id));
  if(idx<0)return res.status(404).json({error:'Código não encontrado.'});
  const [removed]=city.redeemCodes.splice(idx,1);
  saveData();
  res.json({message:'Código de resgate removido.',code:removed.code});
});
const allQuestions=()=>Object.entries(questionBank).flatMap(([jobId,arr])=>arr.map(q=>({...q,jobId})));
app.get('/api/mayor/questions',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});res.json(allQuestions())});
app.post('/api/mayor/questions',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const{jobId,text,options,correct,difficulty}=req.body;if(!jobId||!text||!Array.isArray(options)||options.length<2)return res.status(400).json({error:'Preencha todos os campos'});if(!questionBank[jobId])questionBank[jobId]=[];const q={id:`q_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,text,options,correct:Number(correct)||0,difficulty:Number(difficulty)||1};questionBank[jobId].push(q);saveData();res.json({message:'Pergunta adicionada!',question:{...q,jobId}})});
app.put('/api/mayor/questions/:id',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const q=findQuestionById(req.params.id);if(!q)return res.status(404).json({error:'Pergunta não encontrada'});if(req.body.text)q.text=req.body.text;if(Array.isArray(req.body.options)&&req.body.options.length>=2)q.options=req.body.options;if(req.body.correct!==undefined)q.correct=Number(req.body.correct);if(req.body.difficulty!==undefined)q.difficulty=Number(req.body.difficulty);saveData();res.json({message:'Pergunta atualizada!'})});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

app.listen(process.env.PORT||3000,()=>console.log(`🏙️ Sorokiba ouvindo na porta ${process.env.PORT||3000}`));