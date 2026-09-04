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

// ============= BANCO DE DADOS EM MEMÓRIA (persistido em disco) =============
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

// ============= JOBS =============
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

// ============= QUESTION BANK =============
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

// ============= ITEMS DA LOJA =============
const shopItems = [
  { id: 1, name: 'Pão Integral', price: 50, hunger: 30, icon: '🍞', description: 'Um pão delicioso' },
  { id: 2, name: 'Água', price: 20, hydration: 50, icon: '💧', description: 'Água fresca' },
  { id: 3, name: 'Maçã', price: 80, hunger: 20, energy: 10, icon: '🍎', description: 'Maçã vermelha' },
  { id: 4, name: 'Refrigerante', price: 30, hydration: 20, energy: 15, icon: '🥤', description: 'Refrigerante gelado' },
  { id: 5, name: 'Pizza', price: 150, hunger: 50, icon: '🍕', description: 'Pizza quentinha' },
  { id: 6, name: 'Café', price: 40, energy: 30, icon: '☕', description: 'Café coado' }
];

const hospitalServices = [
  { id: 1, name: 'Consulta Rápida', price: 100, life: 30 },
  { id: 2, name: 'Atendimento Completo', price: 300, life: 70 },
  { id: 3, name: 'Cirurgia', price: 800, life: 100 }
];

// ============= FUNÇÕES AUXILIARES =============
const createUser = (name, username, password, isMayor = false) => ({
  name,
  username,
  password,
  money: isMayor ? 5000 : 1000,
  bankBalance: 0,
  level: 1,
  xp: 0,
  jobId: 'estudante',
  jobName: 'Estudante',
  life: 100,
  hunger: 100,
  hydration: 100,
  energy: 100,
  inventory: {},
  missions: [],
  achievements: [],
  isMayor,
  transactions: [],
  answeredQuestions: [],
  missionStarts: [],
  missionStartsByJobPerHour: {},
  // novo sistema: duas missões por ciclo e depois 1 hora de espera
  missionBatchCount: 0,
  missionCooldownUntil: null,
  countedInPopulation: false,
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

  // compatibilidade com contas antigas: se o ciclo antigo já existia, não deixa
  // a conta ganhar um ciclo extra; o novo sistema passa a controlar daqui para frente.
  if (user.missionCooldownUntil) {
    const cooldown = new Date(user.missionCooldownUntil).getTime();
    if (Number.isFinite(cooldown) && cooldown <= now) {
      user.missionCooldownUntil = null;
      user.missionBatchCount = 0;
    }
  }

  return {
    batchCount: user.missionBatchCount,
    remaining: Math.max(0, 2 - user.missionBatchCount),
    cooldownUntil: user.missionCooldownUntil
  };
};

const startCooldownIfNeeded = (user) => {
  if (Number(user.missionBatchCount) >= 2) {
    user.missionCooldownUntil = new Date(Date.now() + 3600 * 1000).toISOString();
  }
};

const createMission = (jobId, username) => {
  const cfg = (city.missionRewards && city.missionRewards[jobId]) || { questionsPerMission: 2, xpPerMission: 50, moneyPerMission: 50 };
  const duration = Math.max(60, cfg.questionsPerMission * 60);
  const jobQuestions = (questionBank[jobId] || []).slice();
  const answered = (users[username] && users[username].answeredQuestions) || [];
  const pool = jobQuestions.filter(q => !answered.includes(q.id));
  if (!pool.length) return null;

  const n = Math.min(cfg.questionsPerMission || 2, pool.length);
  const chosen = [];
  const poolCopy = pool.slice();
  for (let i=0;i<n;i++){
    const idx = Math.floor(Math.random()*poolCopy.length);
    chosen.push(poolCopy.splice(idx,1)[0]);
  }

  const avgDiff = chosen.reduce((s,q)=>s+(q.difficulty||1),0)/chosen.length;
  const rewardXp = Math.max(20, Math.floor((cfg.xpPerMission||50) * avgDiff));
  const rewardMoney = Math.max(50, Math.floor((cfg.moneyPerMission||50) * avgDiff));

  return {
    id: `mission_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    jobId,
    started_at: new Date().toISOString(),
    duration_seconds: duration,
    questionRefs: chosen.map(q=>q.id),
    questions: chosen.map(q=>({ id: q.id, text: q.text, options: q.options })),
    rewardXp,
    rewardMoney,
    answers: [],
    status: 'active'
  };
};

// ============= AUTENTICAÇÃO =============
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (users[username]) return res.status(400).json({ error: 'Usuário já existe' });
  if (username.length < 3 || username.length > 30) return res.status(400).json({ error: 'Usuário deve ter 3-30 caracteres' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

  const isMayor = Object.keys(users).length === 0;
  const token = generateToken();
  const user = createUser(name, username, password, isMayor);
  users[username] = { ...user, token };
  city.population = (city.population || 0) + 1;
  saveData();
  res.json({ token, message: isMayor ? 'Bem-vindo, Prefeito!' : 'Conta criada com sucesso!' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha' });
  const user = users[username];
  if (!user || user.password !== password) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  const token = generateToken();
  users[username].token = token;
  res.json({ token, message: 'Login realizado com sucesso!' });
});

// ============= MIDDLEWARE AUTENTICAÇÃO =============
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  const user = Object.values(users).find(u => u.token === token);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  req.user = user;
  req.username = Object.keys(users).find(k => users[k].token === token);
  next();
};

app.use('/api/me', authenticate);
app.use('/api/city', authenticate);
app.use('/api/jobs', authenticate);
app.use('/api/missions', authenticate);
app.use('/api/inventory', authenticate);
app.use('/api/shop', authenticate);
app.use('/api/hospital', authenticate);
app.use('/api/bank', authenticate);
app.use('/api/players', authenticate);
app.use('/api/news', authenticate);
app.use('/api/events', authenticate);
app.use('/api/proposals', authenticate);
app.use('/api/achievements', authenticate);
app.use('/api/mayor', authenticate);

// ============= ENDPOINTS =============
app.get('/api/me', (req, res) => {
  res.json({
    user: {
      name: req.user.name,
      username: req.user.username,
      money: req.user.money,
      level: req.user.level,
      xp: req.user.xp,
      jobName: req.user.jobName,
      life: req.user.life,
      hunger: req.user.hunger,
      hydration: req.user.hydration,
      energy: req.user.energy
    },
    isMayor: req.user.isMayor
  });
});

app.get('/api/city', (req, res) => {
  res.json({ population: city.population, economy: city.economy, infrastructure: city.infrastructure, quality: city.quality, taxRate: city.taxRate, treasury: city.treasury });
});

app.get('/api/jobs', (req, res) => res.json({ jobs }));

app.post('/api/jobs/select', (req, res) => {
  const { jobId } = req.body;
  const job = jobs.find(j => j.id === jobId);
  if (!job) return res.status(400).json({ error: 'Profissão não encontrada' });
  if ((req.user.xp || 0) < (job.xpRequired || 0)) return res.status(400).json({ error: `Você precisa de ${job.xpRequired} XP para essa profissão` });
  req.user.jobId = jobId;
  req.user.jobName = job.name;
  saveData();
  res.json({ message: `Agora você é ${job.name}!`, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

// ============= MISSÕES: 2 POR CICLO + 1 HORA DE COOLDOWN =============
app.get('/api/missions', (req, res) => {
  const job = jobs.find(j => j.id === req.user.jobId);
  const userMissions = req.user.missions || [];
  const state = getMissionState(req.user);
  const active = userMissions.filter(m => m.status === 'active');

  // Se o ciclo acabou, a espera é baseada no horário salvo no banco.
  if (state.cooldownUntil) {
    const cooldownMs = new Date(state.cooldownUntil).getTime();
    if (!Number.isFinite(cooldownMs) || cooldownMs <= Date.now()) {
      req.user.missionCooldownUntil = null;
      req.user.missionBatchCount = 0;
      saveData();
    }
  }

  const finalState = getMissionState(req.user);
  res.json({
    job: { name: job.name, task: job.task },
    active,
    history: userMissions.filter(m => m.status === 'completed').slice(-10),
    missionsRemaining: active.length ? 0 : finalState.remaining,
    missionsUsed: finalState.batchCount,
    cooldownUntil: finalState.cooldownUntil
  });
});

app.post('/api/missions/start', (req, res) => {
  if (!req.user.missions) req.user.missions = [];
  const state = getMissionState(req.user);

  if (state.cooldownUntil) {
    const msLeft = new Date(state.cooldownUntil).getTime() - Date.now();
    if (msLeft > 0) {
      const minLeft = Math.floor(msLeft / 60000);
      const secLeft = Math.floor((msLeft % 60000) / 1000);
      return res.status(400).json({ error: `Você já fez 2 missões. Aguarde ${minLeft}:${String(secLeft).padStart(2,'0')} para receber mais 2 missões.`, cooldownUntil: state.cooldownUntil });
    }
    req.user.missionCooldownUntil = null;
    req.user.missionBatchCount = 0;
  }

  if (Number(req.user.missionBatchCount) >= 2) {
    startCooldownIfNeeded(req.user);
    saveData();
    return res.status(400).json({ error: 'Você já fez 2 missões. Aguarde 1 hora para receber mais 2 missões.', cooldownUntil: req.user.missionCooldownUntil });
  }

  const activeMissions = req.user.missions.filter(m => m.status === 'active');
  if (activeMissions.length > 0) return res.status(400).json({ error: 'Você já tem uma missão ativa' });

  const mission = createMission(req.user.jobId, req.username);
  if (!mission) return res.status(400).json({ error: 'Sem perguntas novas disponíveis para sua profissão. Volte mais tarde.' });

  req.user.missions.push(mission);
  saveData();

  res.json({ message: `Missão iniciada! (${Number(req.user.missionBatchCount) + 1}/2)`, mission: { id: mission.id, jobId: mission.jobId, started_at: mission.started_at, duration_seconds: mission.duration_seconds, questions: mission.questions, rewardXp: mission.rewardXp, rewardMoney: mission.rewardMoney } });
});

const registerMissionUse = (user) => {
  user.missionBatchCount = Number(user.missionBatchCount || 0) + 1;
  if (user.missionBatchCount >= 2) startCooldownIfNeeded(user);
};

app.post('/api/missions/:id/answer', (req, res) => {
  const { answer, questionIndex } = req.body;
  const mission = req.user.missions.find(m => m.id === req.params.id);
  if (!mission) return res.status(400).json({ error: 'Missão não encontrada' });
  if (mission.status !== 'active') return res.status(400).json({ error: 'Missão não está ativa' });

  const elapsed = (Date.now() - new Date(mission.started_at).getTime()) / 1000;
  if (elapsed > mission.duration_seconds) {
    mission.status = 'expired';
    mission.completedAt = new Date().toISOString();
    registerMissionUse(req.user);
    saveData();
    return res.status(400).json({ error: 'Tempo esgotado para responder' });
  }

  if (typeof questionIndex !== 'number' || questionIndex < 0 || questionIndex >= (mission.questions || []).length) return res.status(400).json({ error: 'Índice de pergunta inválido' });

  const qid = mission.questionRefs ? mission.questionRefs[questionIndex] : (mission.questions && mission.questions[questionIndex] && mission.questions[questionIndex].id);
  const q = findQuestionById(qid);
  const correctIndex = q ? q.correct : null;
  const correct = (answer === correctIndex);

  mission.answers = mission.answers || [];
  if (mission.answers[questionIndex]) return res.status(400).json({ error: 'Pergunta já respondida' });
  mission.answers[questionIndex] = { questionId: qid, selected: answer, correct };

  req.user.answeredQuestions = req.user.answeredQuestions || [];
  if (!req.user.answeredQuestions.includes(qid)) req.user.answeredQuestions.push(qid);

  const total = mission.questions.length;
  const answeredCount = mission.answers.filter(Boolean).length;
  let xpGiven = 0, moneyGiven = 0, final = false;

  if (answeredCount === total) {
    const correctCount = mission.answers.filter(a => a && a.correct).length;
    xpGiven = Math.floor((mission.rewardXp || 0) * (correctCount / total));
    moneyGiven = (correctCount === total) ? (mission.rewardMoney || 0) : 0;
    req.user.xp = (req.user.xp || 0) + xpGiven;
    req.user.money = (req.user.money || 0) + moneyGiven;

    while (req.user.xp >= 500) {
      req.user.level += 1;
      req.user.xp -= 500;
    }

    if (moneyGiven > 0) {
      req.user.transactions = req.user.transactions || [];
      req.user.transactions.push({ date: new Date(), type: 'mission', person: 'Sistema', amount: moneyGiven, description: `Recompensa por missão (${mission.jobId})` });
    }

    mission.status = 'completed';
    mission.completedAt = new Date().toISOString();
    registerMissionUse(req.user);
    final = true;
    saveData();
  } else {
    saveData();
  }

  const correctOptionText = q ? (q.options && q.options[q.correct]) : null;
  const state = getMissionState(req.user);
  res.json({ message: correct ? 'Resposta correta!' : 'Resposta incorreta', correct, correctIndex, correctOptionText, xpGiven, moneyGiven, final, remaining: total - answeredCount, missionsRemaining: state.remaining, missionsUsed: state.batchCount, cooldownUntil: state.cooldownUntil, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

app.post('/api/missions/:id/complete', (req, res) => {
  const mission = req.user.missions.find(m => m.id === req.params.id);
  if (!mission) return res.status(400).json({ error: 'Missão não encontrada' });

  const elapsed = (Date.now() - new Date(mission.started_at).getTime()) / 1000;
  if (elapsed < mission.duration_seconds) return res.status(400).json({ error: 'Missão ainda não está completa' });

  if (mission.status === 'active') {
    mission.status = 'expired';
    mission.completedAt = new Date().toISOString();
    registerMissionUse(req.user);
    saveData();
  }

  const state = getMissionState(req.user);
  res.json({ message: 'Missão finalizada', missionsRemaining: state.remaining, cooldownUntil: state.cooldownUntil, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

app.get('/api/inventory', (req, res) => res.json({ inventory: req.user.inventory || {}, items: shopItems }));

app.post('/api/inventory/use', (req, res) => {
  const { itemId } = req.body;
  const item = shopItems.find(i => i.id === itemId);
  if (!item || !req.user.inventory[itemId]) return res.status(400).json({ error: 'Item não encontrado no inventário' });
  if (item.hunger) req.user.hunger = Math.min(100, req.user.hunger + item.hunger);
  if (item.hydration) req.user.hydration = Math.min(100, req.user.hydration + item.hydration);
  if (item.energy) req.user.energy = Math.min(100, req.user.energy + item.energy);
  req.user.inventory[itemId]--;
  if (req.user.inventory[itemId] === 0) delete req.user.inventory[itemId];
  saveData();
  res.json({ message: `${item.name} usado com sucesso!`, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

app.get('/api/shop', (req, res) => res.json(shopItems));

app.post('/api/shop/buy', (req, res) => {
  const { itemId, quantity } = req.body;
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return res.status(400).json({ error: 'Item não encontrado' });
  const totalCost = item.price * quantity;
  if (req.user.money < totalCost) return res.status(400).json({ error: 'Dinheiro insuficiente' });
  req.user.money -= totalCost;
  req.user.inventory[itemId] = (req.user.inventory[itemId] || 0) + quantity;
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'purchase', person: 'Loja', amount: totalCost, description: `${quantity}x ${item.name}` });
  saveData();
  res.json({ message: `${quantity}x ${item.name} comprado!`, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

app.get('/api/hospital', (req, res) => res.json({ services: hospitalServices }));

app.post('/api/hospital/treat', (req, res) => {
  const { serviceId } = req.body;
  const service = hospitalServices.find(s => s.id === serviceId);
  if (!service) return res.status(400).json({ error: 'Serviço não encontrado' });
  if (req.user.money < service.price) return res.status(400).json({ error: 'Dinheiro insuficiente' });
  req.user.money -= service.price;
  req.user.life = Math.min(100, req.user.life + service.life);
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'hospital', person: 'Hospital', amount: service.price, description: service.name });
  saveData();
  res.json({ message: `${service.name} realizado! Vida restaurada.`, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

app.get('/api/bank', (req, res) => res.json({ money: req.user.money || 0, bankBalance: req.user.bankBalance || 0, transfers: req.user.transactions || [] }));

app.post('/api/bank/deposit', (req, res) => {
  const { amount } = req.body;
  if (amount <= 0) return res.status(400).json({ error: 'Valor inválido' });
  if (req.user.money < amount) return res.status(400).json({ error: 'Dinheiro insuficiente' });
  req.user.money -= amount;
  req.user.bankBalance = (req.user.bankBalance || 0) + amount;
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'deposit', person: 'Banco', amount, description: 'Depósito' });
  saveData();
  res.json({ message: `Depósito de R$ ${amount.toLocaleString('pt-BR')} realizado!`, money: req.user.money, bankBalance: req.user.bankBalance });
});

app.post('/api/bank/withdraw', (req, res) => {
  const { amount } = req.body;
  if (amount <= 0) return res.status(400).json({ error: 'Valor inválido' });
  if ((req.user.bankBalance || 0) < amount) return res.status(400).json({ error: 'Saldo bancário insuficiente' });
  req.user.bankBalance -= amount;
  req.user.money = (req.user.money || 0) + amount;
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'withdraw', person: 'Banco', amount, description: 'Saque' });
  saveData();
  res.json({ message: `Saque de R$ ${amount.toLocaleString('pt-BR')} realizado!`, money: req.user.money, bankBalance: req.user.bankBalance });
});

app.post('/api/bank/transfer', (req, res) => {
  const { username, amount } = req.body;
  const recipient = users[username];
  if (!recipient) return res.status(400).json({ error: 'Usuário não encontrado' });
  if (req.user.money < amount) return res.status(400).json({ error: 'Dinheiro insuficiente' });
  req.user.money -= amount;
  recipient.money = (recipient.money || 0) + amount;
  req.user.transactions = req.user.transactions || [];
  recipient.transactions = recipient.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'transfer_out', person: username, amount, description: `Transferência para ${username}` });
  recipient.transactions.push({ date: new Date(), type: 'transfer_in', person: req.user.username, amount, description: `Transferência de ${req.user.username}` });
  saveData();
  res.json({ message: `Transferência de R$ ${amount.toLocaleString('pt-BR')} para ${username} realizada!`, money: req.user.money });
});

app.get('/api/players', (req, res) => res.json(Object.values(users).map(u => ({ name: u.name, username: u.username, level: u.level, jobName: u.jobName, money: u.money }))));

app.get('/api/players/:username', (req, res) => {
  const player = users[req.params.username];
  if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });
  res.json({ name: player.name, username: player.username, level: player.level, xp: player.xp, jobName: player.jobName, money: player.money, createdAt: player.createdAt });
});

app.get('/api/news', (req, res) => res.json(city.news));
app.get('/api/events', (req, res) => res.json(city.events));
app.get('/api/proposals', (req, res) => res.json(city.proposals));

app.post('/api/proposals', (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Preencha todos os campos' });
  city.proposals.push({ id: `prop_${Date.now()}`, author: req.user.name, title, description, status: 'pending', createdAt: new Date() });
  saveData();
  res.json({ message: 'Proposta enviada com sucesso!' });
});

app.post('/api/mayor/proposals/:id/decide', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode decidir' });
  const { status, response } = req.body;
  const proposal = city.proposals.find(p => p.id === req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  proposal.status = status;
  proposal.response = response;
  proposal.decidedAt = new Date();
  saveData();
  res.json({ message: 'Decisão registrada!' });
});

app.get('/api/achievements', (req, res) => res.json(req.user.achievements || []));

app.get('/api/mayor', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode acessar' });
  res.json({ population: city.population, economy: city.economy, infrastructure: city.infrastructure, quality: city.quality, taxRate: city.taxRate, treasury: city.treasury });
});

app.post('/api/mayor/settings', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode fazer isso' });
  const { tax, economy, infrastructure, quality } = req.body;
  city.taxRate = tax || city.taxRate;
  city.economy = economy || city.economy;
  city.infrastructure = infrastructure || city.infrastructure;
  city.quality = quality || city.quality;
  saveData();
  res.json({ message: 'Configurações salvas!' });
});

app.post('/api/mayor/news', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode publicar notícias' });
  const { title, body, image } = req.body;
  city.news.unshift({ id: `news_${Date.now()}`, title, body, image, author: req.user.name, createdAt: new Date() });
  saveData();
  res.json({ message: 'Notícia publicada!' });
});

app.post('/api/mayor/events', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode criar eventos' });
  const { title, description, eventDate, image } = req.body;
  city.events.push({ id: `event_${Date.now()}`, title, description, eventDate, image, createdAt: new Date() });
  saveData();
  res.json({ message: 'Evento criado!' });
});

app.post('/api/mayor/questions', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode adicionar perguntas' });
  const { jobId, text, options, correct, difficulty } = req.body;
  if (!jobId || !text || !options || typeof correct !== 'number') return res.status(400).json({ error: 'Campos inválidos. Envie jobId, text, options e correct (índice numérico).' });
  questionBank[jobId] = questionBank[jobId] || [];
  const q = { id: `${jobId}_${Date.now()}`, text, options, correct, difficulty: difficulty || 1 };
  questionBank[jobId].push(q);
  saveData();
  res.json({ message: 'Pergunta adicionada!', question: q });
});

app.get('/api/mayor/questions', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode listar perguntas' });
  const list = [];
  Object.keys(questionBank).forEach(jobId => (questionBank[jobId] || []).forEach(q => list.push({ ...q, jobId })));
  res.json(list);
});

app.put('/api/mayor/questions/:id', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode editar perguntas' });
  const qid = req.params.id;
  const { text, options, correct, difficulty } = req.body;
  for (const jobId of Object.keys(questionBank)) {
    const idx = (questionBank[jobId] || []).findIndex(x => x.id === qid);
    if (idx >= 0) {
      if (text) questionBank[jobId][idx].text = text;
      if (options) questionBank[jobId][idx].options = options;
      if (typeof correct === 'number') questionBank[jobId][idx].correct = correct;
      if (typeof difficulty === 'number') questionBank[jobId][idx].difficulty = difficulty;
      saveData();
      return res.json({ message: 'Pergunta atualizada!', question: questionBank[jobId][idx] });
    }
  }
  res.status(404).json({ error: 'Pergunta não encontrada' });
});

app.delete('/api/mayor/questions/:id', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode remover perguntas' });
  const qid = req.params.id;
  for (const jobId of Object.keys(questionBank)) {
    const idx = (questionBank[jobId] || []).findIndex(x => x.id === qid);
    if (idx >= 0) {
      questionBank[jobId].splice(idx, 1);
      saveData();
      return res.json({ message: 'Pergunta removida' });
    }
  }
  res.status(404).json({ error: 'Pergunta não encontrada' });
});

app.get('/api/mayor/rewards', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode acessar recompensas' });
  res.json(city.missionRewards || {});
});

app.post('/api/mayor/rewards', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode atualizar recompensas' });
  const { jobId, moneyPerMission, xpPerMission, questionsPerMission } = req.body;
  if (!jobId || !city.missionRewards[jobId]) return res.status(400).json({ error: 'jobId inválido' });
  if (typeof moneyPerMission === 'number') city.missionRewards[jobId].moneyPerMission = Math.max(10, Math.floor(moneyPerMission));
  if (typeof xpPerMission === 'number') city.missionRewards[jobId].xpPerMission = Math.max(5, Math.floor(xpPerMission));
  if (typeof questionsPerMission === 'number') city.missionRewards[jobId].questionsPerMission = Math.max(1, Math.min(5, Math.floor(questionsPerMission)));
  saveData();
  res.json({ message: 'Recompensas atualizadas', reward: city.missionRewards[jobId] });
});

// ============= DECAY DE NECESSIDADES =============
setInterval(() => {
  Object.values(users).forEach(user => {
    if (user.hunger > 0) user.hunger -= 1;
    if (user.hydration > 0) user.hydration -= 1;
    if (user.energy > 0) user.energy -= 1;
    if (user.life > 0 && user.hunger < 20) user.life -= 2;
  });
  saveData();
}, 30000);

// ============= PORTA =============
const PORT = process.env.PORT || 3000;

(async () => {
  await db.init();
  await loadData();

  if (!city.missionRewards) city.missionRewards = {};
  jobs.forEach(j => {
    if (!city.missionRewards[j.id]) {
      city.missionRewards[j.id] = {
        moneyPerMission: Math.max(50, Math.floor(j.salary * 0.15)),
        xpPerMission: Math.max(20, Math.floor(j.salary * 0.08)),
        questionsPerMission: j.xpRequired >= 1000 ? 3 : 2
      };
    }
  });
  saveData();

  app.listen(PORT, () => console.log(`🏙️ Sorokiba rodando na porta ${PORT}`));
})();
