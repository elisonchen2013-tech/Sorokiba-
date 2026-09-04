const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const fs = require('fs');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

let users = {};
let city = {
  population: 0,
  economy: 8500,
  infrastructure: 65,
  quality: 72,
  taxRate: 15,
  treasury: 50000,
  news: [],
  events: [],
  proposals: [],
  missionRewards: {}
};

const loadData = async () => {
  try {
    users = (await db.get('users')) || users;
    city = (await db.get('city')) || city;
    const qb = await db.get('questionBank');
    if (qb) Object.assign(questionBank, qb);
  } catch (e) { console.error('Falha ao carregar do Postgres', e); }
};

let saveTimer = null;
const saveData = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await db.set('users', users);
      await db.set('city', city);
      await db.set('questionBank', questionBank);
    } catch (e) { console.error('Falha ao salvar no Postgres', e); }
  }, 500);
};

let tokenCounter = 0;
const generateToken = () => `token_${++tokenCounter}_${Date.now()}`;

const jobs = [
  { id: 'estudante', name: 'Estudante', salary: 100, xpRequired: 0, task: 'Estude para o futuro', icon: '🎓' },
  { id: 'entregador', name: 'Entregador de Food', salary: 250, xpRequired: 200, task: 'Faça entregas pela cidade', icon: '📦' },
  { id: 'mecanico', name: 'Mecânico', salary: 400, xpRequired: 400, task: 'Conserte veículos e máquinas', icon: '🔧' },
  { id: 'professor', name: 'Professor', salary: 500, xpRequired: 600, task: 'Ensine as próximas gerações', icon: '📚' },
  { id: 'policial', name: 'Policial', salary: 600, xpRequired: 700, task: 'Proteja a cidade', icon: '🛡️' },
  { id: 'investigador', name: 'Investigador', salary: 700, xpRequired: 900, task: 'Investigue crimes e mistérios', icon: '🕵️' },
  { id: 'advogado', name: 'Advogado', salary: 750, xpRequired: 1000, task: 'Defenda clientes', icon: '⚖️' },
  { id: 'engenheiro', name: 'Engenheiro', salary: 850, xpRequired: 1100, task: 'Construa infraestrutura', icon: '🏗️' },
  { id: 'medico', name: 'Médico', salary: 950, xpRequired: 1300, task: 'Trate dos enfermos', icon: '⚕️' },
  { id: 'juiz', name: 'Juiz do Tribunal', salary: 1200, xpRequired: 1800, task: 'Julgue casos importantes', icon: '🏛️' }
];

const questionBank = {
  estudante: [
    { id: 'e1', text: 'Qual é a capital do Brasil?', options: ['São Paulo','Brasília','Rio de Janeiro','Salvador'], correct: 1, difficulty: 1 },
    { id: 'e2', text: '2+2 é?', options: ['3','4','5','22'], correct: 1, difficulty: 1 }
  ],
  medico: [
    { id: 'm1', text: 'Febre, dor de garganta e tosse: qual a causa mais provável?', options: ['Dengue','Gripe','Diabetes','Hipertensão'], correct: 1, difficulty: 1 },
    { id: 'm2', text: 'Qual exame é usado para verificar fraturas ósseas?', options: ['Ressonância','Ultrassom','Raio-X','ECG'], correct: 2, difficulty: 2 }
  ],
  policial: [
    { id: 'p1', text: 'Ao abordar um suspeito, o policial deve:', options: ['Ignorar','Insistir sem backup','Garantir segurança e chamar apoio','Filmar com celular'], correct: 2, difficulty: 1 }
  ],
  entregador: [
    { id: 'd1', text: 'Melhor prática para entregas seguras:', options: ['Dirigir rápido','Ignorar endereços','Conferir pedido antes de sair','Levar menos itens'], correct: 2, difficulty: 1 }
  ],
  generic: [
    { id: 'g1', text: 'Qual é a cor do céu em um dia claro?', options: ['Azul','Verde','Vermelho','Amarelo'], correct: 0, difficulty: 1 }
  ]
};

try {
  const qfile = path.join(DATA_DIR, 'questionBank.json');
  if (fs.existsSync(qfile)) {
    const persisted = JSON.parse(fs.readFileSync(qfile, 'utf8'));
    Object.assign(questionBank, persisted);
  }
} catch (e) { console.error('Failed loading questionBank.json', e); }

try {
  if (!city.missionRewards) city.missionRewards = {};
  jobs.forEach(j => {
    if (!city.missionRewards[j.id]) {
      const money = Math.max(50, Math.floor(j.salary * 0.15));
      const xp = Math.max(20, Math.floor(j.salary * 0.08));
      const questions = j.xpRequired >= 1000 ? 3 : 2;
      city.missionRewards[j.id] = { moneyPerMission: money, xpPerMission: xp, questionsPerMission: questions };
    }
  });
} catch (e) { console.error('Failed initializing missionRewards', e); }

// Preços dos alimentos ajustados para ficarem acessíveis e equilibrados com o dinheiro inicial.
const shopItems = [
  { id: 1, name: 'Pão Integral', price: 10, hunger: 30, icon: '🍞', description: 'Um pão delicioso' },
  { id: 2, name: 'Água', price: 5, hydration: 50, icon: '💧', description: 'Água fresca' },
  { id: 3, name: 'Maçã', price: 8, hunger: 20, energy: 10, icon: '🍎', description: 'Maçã vermelha' },
  { id: 4, name: 'Refrigerante', price: 7, hydration: 20, energy: 15, icon: '🥤', description: 'Refrigerante gelado' },
  { id: 5, name: 'Pizza', price: 20, hunger: 50, icon: '🍕', description: 'Pizza quentinha' },
  { id: 6, name: 'Café', price: 6, energy: 30, icon: '☕', description: 'Café coado' }
];

const hospitalServices = [
  { id: 1, name: 'Consulta Rápida', price: 100, life: 30 },
  { id: 2, name: 'Atendimento Completo', price: 300, life: 70 },
  { id: 3, name: 'Cirurgia', price: 800, life: 100 }
];

const createUser = (name, username, password, isMayor = false, recoveryCode = '') => ({
  name, username, password, recoveryCode,
  money: isMayor ? 5000 : 1000,
  bankBalance: 0, level: 1, xp: 0,
  jobId: 'estudante', jobName: 'Estudante',
  life: 100, hunger: 100, hydration: 100, energy: 100,
  inventory: {}, missions: [], achievements: [], isMayor,
  transactions: [], answeredQuestions: [], missionStarts: [], missionStartsByJobPerHour: {},
  missionBatchCount: 0, missionCooldownUntil: null, countedInPopulation: false,
  createdAt: new Date().toISOString()
});

const findQuestionById = (qid) => {
  for (const k of Object.keys(questionBank)){
    const q = questionBank[k].find(x=>x.id===qid);
    if(q) return q;
  }
  return null;
};

const getMissionState = (user) => {
  const now = Date.now();
  user.missionBatchCount = Number.isFinite(Number(user.missionBatchCount)) ? Number(user.missionBatchCount) : 0;
  user.missionCooldownUntil = user.missionCooldownUntil || null;
  if (user.missionCooldownUntil) {
    const cooldown = new Date(user.missionCooldownUntil).getTime();
    if (Number.isFinite(cooldown) && cooldown <= now) {
      user.missionCooldownUntil = null;
      user.missionBatchCount = 0;
    }
  }
  return { batchCount: user.missionBatchCount, remaining: Math.max(0, 2 - user.missionBatchCount), cooldownUntil: user.missionCooldownUntil };
};

const startCooldownIfNeeded = (user) => {
  if (Number(user.missionBatchCount) >= 2) user.missionCooldownUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
};

const createMission = (jobId, username) => {
  const cfg = (city.missionRewards && city.missionRewards[jobId]) || { questionsPerMission: 2, xpPerMission: 50, moneyPerMission: 50 };
  const duration = Math.max(60, cfg.questionsPerMission * 60);
  const jobQuestions = (questionBank[jobId] && questionBank[jobId].length ? questionBank[jobId] : questionBank.generic).slice();
  const answered = (users[username] && users[username].answeredQuestions) || [];
  let pool = jobQuestions.filter(q => !answered.includes(q.id));
  if (pool.length < (cfg.questionsPerMission || 2)) pool = jobQuestions.slice();
  if (!pool.length) return null;
  const n = Math.min(cfg.questionsPerMission || 2, pool.length);
  const chosen = [], poolCopy = pool.slice();
  for(let i=0;i<n;i++) chosen.push(poolCopy.splice(Math.floor(Math.random()*poolCopy.length),1)[0]);
  const avgDiff = chosen.reduce((s,q)=>s+(q.difficulty||1),0)/chosen.length;
  return { id:`mission_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, jobId, started_at:new Date().toISOString(), duration_seconds:duration, questionRefs:chosen.map(q=>q.id), questions:chosen.map(q=>({id:q.id,text:q.text,options:q.options})), rewardXp:Math.max(20,Math.floor((cfg.xpPerMission||50)*avgDiff)), rewardMoney:Math.max(50,Math.floor((cfg.moneyPerMission||50)*avgDiff)), answers:[], status:'active' };
};

app.post('/api/register', (req, res) => {
  const { name, username, password, recoveryCode } = req.body;
  if (!name || !username || !password || !recoveryCode) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (users[username]) return res.status(400).json({ error: 'Usuário já existe' });
  const isMayor = Object.keys(users).length === 0;
  users[username] = createUser(name, username, password, isMayor, recoveryCode);
  if (!users[username].countedInPopulation) {
    city.population = Number(city.population || 0) + 1;
    users[username].countedInPopulation = true;
  }
  users[username].token = generateToken();
  saveData();
  res.json({ message: isMayor ? 'Conta criada! Você é o prefeito.' : 'Conta criada com sucesso!', token: users[username].token, user: users[username] });
});

app.post('/api/login',(req,res)=>{
  const {username,password}=req.body;
  const user=users[username];
  if(!user||user.password!==password)return res.status(401).json({error:'Usuário ou senha incorretos'});
  user.token=generateToken();
  if(!user.countedInPopulation){city.population=Number(city.population||0)+1;user.countedInPopulation=true;}
  saveData();
  res.json({message:'Login realizado!',token:user.token,user});
});

app.post('/api/recover-password', async (req, res) => {
  try {
    const { username, name, recoveryCode, newPassword } = req.body || {};
    if (!username || !name || !recoveryCode || !newPassword) return res.status(400).json({ error: 'Preencha todos os campos' });
    if (String(newPassword).length < 6) return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    const user = users[username];
    if (!user || user.name !== name || user.recoveryCode !== recoveryCode) return res.status(401).json({ error: 'Dados de recuperação incorretos' });
    user.password = newPassword;
    user.token = null;
    saveData();
    res.json({ message: 'Senha alterada com sucesso! Você já pode entrar novamente.' });
  } catch (e) {
    console.error('Falha na recuperação de senha', e);
    res.status(500).json({ error: 'Não foi possível recuperar a senha agora.' });
  }
});

const auth=(req,res,next)=>{const token=req.headers.authorization?.replace('Bearer ','');const user=Object.values(users).find(u=>u.token===token);if(!user)return res.status(401).json({error:'Não autenticado'});req.user=user;req.username=user.username;next()};
app.use('/api', (req,res,next)=>{if(['/api/register','/api/login','/api/recover-password'].includes(req.path))return next();auth(req,res,next)});

const requireActiveSession = (req,res,next)=>{ req.user.lastActiveAt=Date.now(); next(); };
app.post('/api/me/activity', requireActiveSession, (req,res)=>{
  const activeSeconds=Math.max(0,Math.min(30,Number(req.body?.activeSeconds)||0));
  req.user.activeNeedSeconds=Math.max(0,Number(req.user.activeNeedSeconds)||0)+activeSeconds;
  const minutes=Math.floor(req.user.activeNeedSeconds/60);
  if(minutes>0){
    req.user.activeNeedSeconds-=minutes*60;
    req.user.hunger=Math.max(0,Number(req.user.hunger??100)-minutes);
    req.user.hydration=Math.max(0,Number(req.user.hydration??100)-minutes);
    req.user.energy=Math.max(0,Number(req.user.energy??100)-minutes);
    if(req.user.hunger<20)req.user.life=Math.max(0,Number(req.user.life??100)-(minutes*2));
  }
  saveData();
  res.json({hunger:req.user.hunger,hydration:req.user.hydration,energy:req.user.energy,life:req.user.life});
});
app.post('/api/me/offline',(req,res)=>{ req.user.lastActiveAt=0; saveData(); res.json({ok:true}); });

app.get('/api/me',(req,res)=>res.json({user:{name:req.user.name,username:req.user.username,money:req.user.money,level:req.user.level,xp:req.user.xp,jobName:req.user.jobName,life:req.user.life,hunger:req.user.hunger,hydration:req.user.hydration,energy:req.user.energy},isMayor:req.user.isMayor}));
app.get('/api/city',(req,res)=>res.json(city));
app.get('/api/jobs',(req,res)=>res.json({jobs,currentJob:req.user.jobId,xp:req.user.xp}));
app.post('/api/jobs/select',(req,res)=>{const j=jobs.find(x=>x.id===req.body.jobId);if(!j)return res.status(404).json({error:'Profissão não encontrada'});if(req.user.xp<j.xpRequired)return res.status(403).json({error:'XP insuficiente'});req.user.jobId=j.id;req.user.jobName=j.name;saveData();res.json({message:`Profissão escolhida: ${j.name}`,user:req.user})});

app.get('/api/shop',(req,res)=>res.json(shopItems));
app.post('/api/shop/buy',(req,res)=>{const item=shopItems.find(x=>x.id===Number(req.body.id));const qty=Math.max(1,Number(req.body.quantity)||1);if(!item)return res.status(404).json({error:'Item não encontrado'});const total=item.price*qty;if(req.user.money<total)return res.status(400).json({error:'Dinheiro insuficiente'});req.user.money-=total;req.user.inventory[item.id]=(req.user.inventory[item.id]||0)+qty;saveData();res.json({message:`${item.name} comprado!`,user:req.user})});
app.post('/api/shop/use',(req,res)=>{const item=shopItems.find(x=>x.id===Number(req.body.id));if(!item)return res.status(404).json({error:'Item não encontrado'});if((req.user.inventory[item.id]||0)<1)return res.status(400).json({error:'Você não possui este item'});req.user.inventory[item.id]--;if(item.hunger)req.user.hunger=Math.min(100,req.user.hunger+item.hunger);if(item.hydration)req.user.hydration=Math.min(100,req.user.hydration+item.hydration);if(item.energy)req.user.energy=Math.min(100,req.user.energy+item.energy);saveData();res.json({message:`${item.name} usado!`,user:req.user})});

app.get('/api/hospital',(req,res)=>res.json(hospitalServices));
app.post('/api/hospital/buy',(req,res)=>{const s=hospitalServices.find(x=>x.id===Number(req.body.id));if(!s)return res.status(404).json({error:'Serviço não encontrado'});if(req.user.money<s.price)return res.status(400).json({error:'Dinheiro insuficiente'});req.user.money-=s.price;req.user.life=Math.min(100,req.user.life+s.life);saveData();res.json({message:'Atendimento realizado!',user:req.user})});

app.get('/api/missions',(req,res)=>{const job=jobs.find(j=>j.id===req.user.jobId);const userMissions=req.user.missions||[];const active=userMissions.filter(m=>m.status==='active');const state=getMissionState(req.user);if(state.cooldownUntil){const cooldownMs=new Date(state.cooldownUntil).getTime();if(!Number.isFinite(cooldownMs)||cooldownMs<=Date.now()){req.user.missionCooldownUntil=null;req.user.missionBatchCount=0;saveData();}}const finalState=getMissionState(req.user);res.json({job:{name:job.name,task:job.task},active,history:userMissions.filter(m=>m.status==='completed').slice(-10),missionsRemaining:active.length?0:finalState.remaining,missionsUsed:finalState.batchCount,cooldownUntil:finalState.cooldownUntil})});
app.post('/api/missions/start',(req,res)=>{if(!req.user.missions)req.user.missions=[];const state=getMissionState(req.user);if(state.cooldownUntil){const msLeft=new Date(state.cooldownUntil).getTime()-Date.now();if(msLeft>0){const minLeft=Math.floor(msLeft/60000);const secLeft=Math.floor((msLeft%60000)/1000);return res.status(400).json({error:`Você já fez 2 missões. Aguarde ${minLeft}:${String(secLeft).padStart(2,'0')} para receber mais 2 missões.`,cooldownUntil:state.cooldownUntil})}req.user.missionCooldownUntil=null;req.user.missionBatchCount=0;}if(Number(req.user.missionBatchCount)>=2){startCooldownIfNeeded(req.user);saveData();return res.status(400).json({error:'Você já fez 2 missões. Aguarde 30 minutos para receber mais 2 missões.',cooldownUntil:req.user.missionCooldownUntil})}const activeMissions=req.user.missions.filter(m=>m.status==='active');if(activeMissions.length>0)return res.status(400).json({error:'Você já tem uma missão ativa'});const mission=createMission(req.user.jobId,req.username);if(!mission)return res.status(400).json({error:'Sem perguntas disponíveis para sua profissão. Volte mais tarde.'});req.user.missions.push(mission);saveData();res.json({message:`Missão iniciada! (${Number(req.user.missionBatchCount)+1}/2)`,mission:{id:mission.id,jobId:mission.jobId,started_at:mission.started_at,duration_seconds:mission.duration_seconds,questions:mission.questions,rewardXp:mission.rewardXp,rewardMoney:mission.rewardMoney}})});
const registerMissionUse=(user)=>{user.missionBatchCount=Number(user.missionBatchCount||0)+1;if(user.missionBatchCount>=2)startCooldownIfNeeded(user)};
app.post('/api/missions/:id/answer',(req,res)=>{const m=(req.user.missions||[]).find(x=>x.id===req.params.id&&x.status==='active');if(!m)return res.status(404).json({error:'Missão não encontrada'});const qIndex=Number(req.body.questionIndex);const answer=Number(req.body.answer);const qid=m.questionRefs[qIndex];const q=findQuestionById(qid);if(!q)return res.status(400).json({error:'Pergunta não encontrada'});m.answers=m.answers||[];if(m.answers[qIndex]!==undefined)return res.status(400).json({error:'Essa pergunta já foi respondida'});m.answers[qIndex]=answer;req.user.answeredQuestions=req.user.answeredQuestions||[];if(!req.user.answeredQuestions.includes(q.id))req.user.answeredQuestions.push(q.id);if(answer===q.correct)req.user.xp=(req.user.xp||0)+Math.max(1,Math.floor((m.rewardXp||20)/m.questions.length));m.correctCount=(m.correctCount||0)+(answer===q.correct?1:0);const final=m.answers.filter(v=>v!==undefined).length>=m.questions.length;if(final){m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);req.user.money=(req.user.money||0)+(m.rewardMoney||0);saveData()}res.json({correct:answer===q.correct,correctIndex:q.correct,correctOptionText:q.options[q.correct],final,message:final?'Missão concluída!':(answer===q.correct?'Resposta correta!':'Resposta incorreta!'),xpGiven:final?m.rewardXp||0:0,moneyGiven:final?m.rewardMoney||0:0,user:{...req.user}})});
app.post('/api/missions/:id/complete',(req,res)=>{const m=(req.user.missions||[]).find(x=>x.id===req.params.id&&x.status==='active');if(!m)return res.status(404).json({error:'Missão não encontrada'});m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);saveData();res.json({message:'Missão encerrada.',user:{...req.user}})});

app.get('/api/news',(req,res)=>res.json(city.news));app.get('/api/events',(req,res)=>res.json(city.events));

// Propostas: o prefeito recebe apenas pendentes; cada cidadão recebe somente as próprias.
app.get('/api/proposals',(req,res)=>{if(req.user.isMayor)return res.json(city.proposals.filter(p=>p.status==='pending'));return res.json(city.proposals.filter(p=>p.authorUsername===req.username||(!p.authorUsername&&p.author===req.user.name)))});
app.post('/api/proposals',(req,res)=>{const {title,description}=req.body;if(!title||!description)return res.status(400).json({error:'Preencha todos os campos'});city.proposals.push({id:`prop_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,author:req.user.name,authorUsername:req.username,title,description,status:'pending',createdAt:new Date()});saveData();res.json({message:'Proposta enviada com sucesso!'})});
app.post('/api/mayor/proposals/:id/decide',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode decidir'});const {status,response}=req.body;if(!['approved','rejected'].includes(status))return res.status(400).json({error:'Resultado inválido'});const proposal=city.proposals.find(p=>p.id===req.params.id);if(!proposal)return res.status(404).json({error:'Proposta não encontrada'});if(proposal.status!=='pending')return res.status(400).json({error:'Esta proposta já foi avaliada'});proposal.status=status;proposal.response=String(response||'').trim();proposal.decidedAt=new Date();saveData();res.json({message:status==='approved'?'Proposta aprovada e resultado enviado ao cidadão!':'Proposta rejeitada e resultado enviado ao cidadão!'})});

app.post('/api/mayor/rewards',(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode alterar recompensas'});const {jobId,moneyPerMission,xpPerMission,questionsPerMission}=req.body;const job=jobs.find(j=>j.id===jobId);if(!job)return res.status(404).json({error:'Profissão não encontrada'});city.missionRewards[jobId]={moneyPerMission:Number(moneyPerMission)||50,xpPerMission:Number(xpPerMission)||20,questionsPerMission:Number(questionsPerMission)||2};saveData();res.json({message:'Recompensa atualizada!',reward:city.missionRewards[jobId]})});

(async()=>{await db.init();await loadData();app.listen(process.env.PORT||10000,'0.0.0.0',()=>console.log(`🏙️ Sorokiba rodando na porta ${process.env.PORT||10000}`));})();
