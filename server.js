const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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
 population: 42,
 economy: 8500,
 infrastructure: 65,
 quality: 72,
 taxRate: 15,
 treasury: 50000,
 news: [],
 events: [],
 proposals: [],
 // customizable mission rewards per job (mayor can edit)
 missionRewards: {}
};

const loadData = () => {
 try {
   const ufile = path.join(DATA_DIR, 'users.json');
   if (fs.existsSync(ufile)) users = JSON.parse(fs.readFileSync(ufile, 'utf8'));
 } catch (e) { console.error('Failed loading users.json', e); }
 try {
   const cfile = path.join(DATA_DIR, 'city.json');
   if (fs.existsSync(cfile)) city = JSON.parse(fs.readFileSync(cfile, 'utf8'));
 } catch (e) { console.error('Failed loading city.json', e); }
};

const saveData = () => {
 try { fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2)); } catch (e) { console.error('Failed saving users.json', e); }
 try { fs.writeFileSync(path.join(DATA_DIR, 'city.json'), JSON.stringify(city, null, 2)); } catch (e) { console.error('Failed saving city.json', e); }
 try { fs.writeFileSync(path.join(DATA_DIR, 'questionBank.json'), JSON.stringify(questionBank, null, 2)); } catch (e) { /* questionBank may not exist yet */ }
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
  // generic fallback
  generic: [
    { id: 'g1', text: 'Qual é a cor do céu em um dia claro?', options: ['Azul','Verde','Vermelho','Amarelo'], correct: 0, difficulty: 1 }
  ]
};

// load persisted question bank if exists
try {
  const qfile = path.join(DATA_DIR, 'questionBank.json');
  if (fs.existsSync(qfile)) {
    const persisted = JSON.parse(fs.readFileSync(qfile, 'utf8'));
    Object.assign(questionBank, persisted);
  }
} catch (e) { console.error('Failed loading questionBank.json', e); }

// initialize default mission rewards per job if not present
try {
  if (!city.missionRewards) city.missionRewards = {};
  jobs.forEach(j => {
    if (!city.missionRewards[j.id]) {
      // conservative defaults to avoid excessive earnings
      const money = Math.max(50, Math.floor(j.salary * 0.15));
      const xp = Math.max(20, Math.floor(j.salary * 0.08));
      const questions = j.xpRequired >= 1000 ? 3 : 2;
      city.missionRewards[j.id] = { moneyPerMission: money, xpPerMission: xp, questionsPerMission: questions };
    }
  });
} catch (e) { console.error('Failed initializing missionRewards', e); }

// load persisted users and city data
loadData();

// ============= ITEMS DA LOJA =============
const shopItems = [
  { id: 1, name: 'Pão Integral', price: 50, hunger: 30, icon: '🍞', description: 'Um pão delicioso' },
  { id: 2, name: 'Água', price: 20, hydration: 50, icon: '💧', description: 'Água fresca' },
  { id: 3, name: 'Maçã', price: 80, hunger: 20, energy: 10, icon: '🍎', description: 'Maçã vermelha' },
  { id: 4, name: 'Refrigerante', price: 30, hydration: 20, energy: 15, icon: '🥤', description: 'Refrigerante gelado' },
  { id: 5, name: 'Pizza', price: 150, hunger: 50, icon: '🍕', description: 'Pizza quentinha' },
  { id: 6, name: 'Café', price: 40, energy: 30, icon: '☕', description: 'Café coado' }
];

// ============= SERVIÇOS HOSPITAL =============
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
  money: isMayor ? 5000 : 1000, // dinheiro em mãos
  bankBalance: 0, // saldo bancário separado
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
  missionStarts: [], // track mission starts per day
  missionStartsByJobPerHour: {}, // track per-job per-hour starts: { 'jobId:YYYY-MM-DDTHH': [timestamps] }
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

const createMission = (jobId, username) => {
  // mission config per job
  const cfg = (city.missionRewards && city.missionRewards[jobId]) || { questionsPerMission: 2, xpPerMission: 50, moneyPerMission: 50 };
  const duration = Math.max(60, cfg.questionsPerMission * 60); // e.g., 2 questions = 120s
  const jobQuestions = (questionBank[jobId] || []).slice();
  const answered = (users[username] && users[username].answeredQuestions) || [];
  // filter out already answered by user
  const pool = jobQuestions.filter(q => !answered.includes(q.id));
  if (!pool.length) return null; // sem perguntas novas

  // choose up to N unique questions from pool
  const n = Math.min(cfg.questionsPerMission || 2, pool.length);
  const chosen = [];
  const poolCopy = pool.slice();
  for (let i=0;i<n;i++){
    const idx = Math.floor(Math.random()*poolCopy.length);
    chosen.push(poolCopy.splice(idx,1)[0]);
  }

  // total rewards are based on config and average difficulty
  const avgDiff = chosen.reduce((s,q)=>s+(q.difficulty||1),0)/chosen.length;
  const rewardXp = Math.max(20, Math.floor((cfg.xpPerMission||50) * avgDiff));
  const rewardMoney = Math.max(50, Math.floor((cfg.moneyPerMission||50) * avgDiff));

  return {
    id: `mission_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    jobId,
    started_at: new Date().toISOString(),
    duration_seconds: duration,
    questionRefs: chosen.map(q=>q.id),
    questions: chosen.map(q=>({ id: q.id, text: q.text, options: q.options })), // do not include correct
    rewardXp,
    rewardMoney,
    answers: [], // will store { questionId, selectedIndex, correct }
    status: 'active'
  };
};

// ============= AUTENTICAÇÃO =============
app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }

  if (users[username]) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Usuário deve ter 3-30 caracteres' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }

  const isMayor = Object.keys(users).length === 0; // Primeiro usuário é prefeito
  const token = generateToken();
  const user = createUser(name, username, password, isMayor);
  users[username] = { ...user, token };

  // Atualiza população da cidade quando novo usuário é criado
  city.population = (city.population || 0) + 1;
  saveData();

  res.json({ token, message: isMayor ? 'Bem-vindo, Prefeito!' : 'Conta criada com sucesso!' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Preencha usuário e senha' });
  }

  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  const token = generateToken();
  users[username].token = token;

  // Increase population once per account when they first log in (or register)
  if (!users[username].countedInPopulation) {
    users[username].countedInPopulation = true;
    city.population = (city.population || 0) + 1;
    saveData();
  }

  res.json({ token, message: 'Login realizado com sucesso!' });
});

// ============= MIDDLEWARE AUTENTICAÇÃO =============
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const user = Object.values(users).find(u => u.token === token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

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
  res.json({
    population: city.population,
    economy: city.economy,
    infrastructure: city.infrastructure,
    quality: city.quality,
    taxRate: city.taxRate,
    treasury: city.treasury
  });
});

app.get('/api/jobs', (req, res) => {
  res.json({ jobs });
});

app.post('/api/jobs/select', (req, res) => {
  const { jobId } = req.body;
  const job = jobs.find(j => j.id === jobId);

  if (!job) {
    return res.status(400).json({ error: 'Profissão não encontrada' });
  }

  if ((req.user.xp || 0) < (job.xpRequired || 0)) {
    return res.status(400).json({ error: `Você precisa de ${job.xpRequired} XP para essa profissão` });
  }

  req.user.jobId = jobId;
  req.user.jobName = job.name;

  res.json({
    message: `Agora você é ${job.name}!`,
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
    }
  });
});

app.get('/api/missions', (req, res) => {
  const job = jobs.find(j => j.id === req.user.jobId);
  const userMissions = req.user.missions || [];

  res.json({
    job: {
      name: job.name,
      task: job.task
    },
    active: userMissions.filter(m => m.status === 'active'),
    history: userMissions.filter(m => m.status === 'completed').slice(-10)
  });
});

app.post('/api/missions/start', (req, res) => {
  if (!req.user.missions) req.user.missions = [];

  // Limite: máximo 2 missões por profissão por hora
  const now = new Date();
  const currentHour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const jobKey = `${req.user.jobId}:${currentHour}`;
  
  req.user.missionStartsByJobPerHour = req.user.missionStartsByJobPerHour || {};
  req.user.missionStartsByJobPerHour[jobKey] = req.user.missionStartsByJobPerHour[jobKey] || [];
  
  // remover starts que passaram de 1 hora
  const oneHourAgo = now.getTime() - 3600 * 1000;
  req.user.missionStartsByJobPerHour[jobKey] = req.user.missionStartsByJobPerHour[jobKey].filter(t => t > oneHourAgo);
  
  if (req.user.missionStartsByJobPerHour[jobKey].length >= 2) {
    const nextStart = Math.min(...req.user.missionStartsByJobPerHour[jobKey]) + 3600 * 1000;
    const msLeft = nextStart - now.getTime();
    const minLeft = Math.ceil(msLeft / 60000);
    return res.status(400).json({ error: `Limite de 2 missões por hora atingido. Próxima missão em ${minLeft}min` });
  }

  const activeMissions = req.user.missions.filter(m => m.status === 'active');
  if (activeMissions.length > 0) {
    return res.status(400).json({ error: 'Você já tem uma missão ativa' });
  }

  const mission = createMission(req.user.jobId, req.username);
  if (!mission) return res.status(400).json({ error: 'Sem perguntas novas disponíveis para sua profissão. Volte mais tarde.' });

  req.user.missions.push(mission);
  req.user.missionStartsByJobPerHour[jobKey].push(now.getTime());
  saveData();

  // return the mission (without exposing correct answer)
  res.json({ message: 'Missão iniciada!', mission: { id: mission.id, jobId: mission.jobId, started_at: mission.started_at, duration_seconds: mission.duration_seconds, questions: mission.questions, rewardXp: mission.rewardXp, rewardMoney: mission.rewardMoney } });
});

app.post('/api/missions/:id/answer', (req, res) => {
  const { answer, questionIndex } = req.body; // expects numeric index and questionIndex
  const mission = req.user.missions.find(m => m.id === req.params.id);

  if (!mission) return res.status(400).json({ error: 'Missão não encontrada' });
  if (mission.status !== 'active') return res.status(400).json({ error: 'Missão não está ativa' });

  const elapsed = (Date.now() - new Date(mission.started_at).getTime()) / 1000;
  if (elapsed > mission.duration_seconds) {
    mission.status = 'expired';
    mission.completedAt = new Date().toISOString();
    saveData();
    return res.status(400).json({ error: 'Tempo esgotado para responder' });
  }

  if (typeof questionIndex !== 'number' || questionIndex < 0 || questionIndex >= (mission.questions || []).length) {
    return res.status(400).json({ error: 'Índice de pergunta inválido' });
  }

  const qid = mission.questionRefs ? mission.questionRefs[questionIndex] : (mission.questions && mission.questions[questionIndex] && mission.questions[questionIndex].id);
  const q = findQuestionById(qid);
  const correctIndex = q ? q.correct : null;
  const correct = (answer === correctIndex);

  // record the answer (do not award money/xp yet)
  mission.answers = mission.answers || [];
  if (mission.answers[questionIndex]) return res.status(400).json({ error: 'Pergunta já respondida' });
  mission.answers[questionIndex] = { questionId: qid, selected: answer, correct };

  // add to user's answeredQuestions to avoid repetition in future missions
  req.user.answeredQuestions = req.user.answeredQuestions || [];
  if (!req.user.answeredQuestions.includes(qid)) req.user.answeredQuestions.push(qid);

  // If all questions answered, finalize mission and award
  const total = mission.questions.length;
  const answeredCount = mission.answers.filter(Boolean).length;
  let xpGiven = 0, moneyGiven = 0, final = false;

  if (answeredCount === total) {
    const correctCount = mission.answers.filter(a => a && a.correct).length;
    // XP scales with proportion correct; money only if all correct
    xpGiven = Math.floor((mission.rewardXp || 0) * (correctCount / total));
    moneyGiven = (correctCount === total) ? (mission.rewardMoney || 0) : 0;

    // apply rewards
    req.user.xp = (req.user.xp || 0) + xpGiven;
    req.user.money = (req.user.money || 0) + moneyGiven;

    // Level up a cada 500 XP
    while (req.user.xp >= 500) {
      req.user.level += 1;
      req.user.xp -= 500;
    }

    // record transaction for reward if any
    if (moneyGiven > 0) {
      req.user.transactions = req.user.transactions || [];
      req.user.transactions.push({ date: new Date(), type: 'mission', person: 'Sistema', amount: moneyGiven, description: `Recompensa por missão (${mission.jobId})` });
    }

    mission.status = 'completed';
    mission.completedAt = new Date().toISOString();
    final = true;
    saveData();
  } else {
    saveData();
  }

  const correctOptionText = q ? (q.options && q.options[q.correct]) : null;

  res.json({ message: correct ? 'Resposta correta!' : 'Resposta incorreta', correct, correctIndex, correctOptionText, xpGiven, moneyGiven, final, remaining: total - answeredCount, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
});

app.post('/api/missions/:id/complete', (req, res) => {
  const mission = req.user.missions.find(m => m.id === req.params.id);

  if (!mission) {
    return res.status(400).json({ error: 'Missão não encontrada' });
  }

  const elapsed = (Date.now() - new Date(mission.started_at).getTime()) / 1000;
  if (elapsed < mission.duration_seconds) {
    return res.status(400).json({ error: 'Missão ainda não está completa' });
  }

  // If mission wasn't answered in time, expire it
  if (mission.status === 'active') {
    mission.status = 'expired';
    mission.createdAt = new Date();
  }

  res.json({
    message: 'Missão finalizada',
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
    }
  });
});

app.get('/api/inventory', (req, res) => {
  res.json({
    inventory: req.user.inventory || {},
    items: shopItems
  });
});

app.post('/api/inventory/use', (req, res) => {
  const { itemId } = req.body;
  const item = shopItems.find(i => i.id === itemId);

  if (!item || !req.user.inventory[itemId]) {
    return res.status(400).json({ error: 'Item não encontrado no inventário' });
  }

  if (item.hunger) req.user.hunger = Math.min(100, req.user.hunger + item.hunger);
  if (item.hydration) req.user.hydration = Math.min(100, req.user.hydration + item.hydration);
  if (item.energy) req.user.energy = Math.min(100, req.user.energy + item.energy);

  req.user.inventory[itemId]--;
  if (req.user.inventory[itemId] === 0) delete req.user.inventory[itemId];

  res.json({
    message: `${item.name} usado com sucesso!`,
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
    }
  });
});

app.get('/api/shop', (req, res) => {
  res.json(shopItems);
});

app.post('/api/shop/buy', (req, res) => {
  const { itemId, quantity } = req.body;
  const item = shopItems.find(i => i.id === itemId);

  if (!item) {
    return res.status(400).json({ error: 'Item não encontrado' });
  }

  const totalCost = item.price * quantity;
  if (req.user.money < totalCost) {
    return res.status(400).json({ error: 'Dinheiro insuficiente' });
  }

  req.user.money -= totalCost;
  req.user.inventory[itemId] = (req.user.inventory[itemId] || 0) + quantity;

  // record transaction
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'purchase', person: 'Loja', amount: totalCost, description: `${quantity}x ${item.name}` });
  saveData();

  res.json({
    message: `${quantity}x ${item.name} comprado!`,
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
    }
  });
});

app.get('/api/hospital', (req, res) => {
  res.json({ services: hospitalServices });
});

app.post('/api/hospital/treat', (req, res) => {
  const { serviceId } = req.body;
  const service = hospitalServices.find(s => s.id === serviceId);

  if (!service) {
    return res.status(400).json({ error: 'Serviço não encontrado' });
  }

  if (req.user.money < service.price) {
    return res.status(400).json({ error: 'Dinheiro insuficiente' });
  }

  req.user.money -= service.price;
  req.user.life = Math.min(100, req.user.life + service.life);

  // record transaction
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'hospital', person: 'Hospital', amount: service.price, description: service.name });

  res.json({
    message: `${service.name} realizado! Vida restaurada.`,
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
    }
  });
});

app.get('/api/bank', (req, res) => {
  res.json({
    money: req.user.money || 0,
    bankBalance: req.user.bankBalance || 0,
    transfers: req.user.transactions || []
  });
});

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
  if ((req.user.bankBalance || 0) < amount) {
    return res.status(400).json({ error: 'Saldo bancário insuficiente' });
  }
  
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

  if (!recipient) {
    return res.status(400).json({ error: 'Usuário não encontrado' });
  }

  if (req.user.money < amount) {
    return res.status(400).json({ error: 'Dinheiro insuficiente' });
  }

  req.user.money -= amount;
  recipient.money = (recipient.money || 0) + amount;

  req.user.transactions = req.user.transactions || [];
  recipient.transactions = recipient.transactions || [];

  req.user.transactions.push({ date: new Date(), type: 'transfer_out', person: username, amount, description: `Transferência para ${username}` });
  recipient.transactions.push({ date: new Date(), type: 'transfer_in', person: req.user.username, amount, description: `Transferência de ${req.user.username}` });
  saveData();

  res.json({
    message: `Transferência de R$ ${amount.toLocaleString('pt-BR')} para ${username} realizada!`,
    money: req.user.money
  });
});

app.get('/api/players', (req, res) => {
  const players = Object.values(users).map(u => ({
    name: u.name,
    username: u.username,
    level: u.level,
    jobName: u.jobName,
    money: u.money
  }));

  res.json(players);
});

app.get('/api/players/:username', (req, res) => {
  const player = users[req.params.username];

  if (!player) {
    return res.status(404).json({ error: 'Jogador não encontrado' });
  }

  res.json({
    name: player.name,
    username: player.username,
    level: player.level,
    xp: player.xp,
    jobName: player.jobName,
    money: player.money,
    createdAt: player.createdAt
  });
});

app.get('/api/news', (req, res) => {
  res.json(city.news);
});

app.get('/api/events', (req, res) => {
  res.json(city.events);
});

app.get('/api/proposals', (req, res) => {
  res.json(city.proposals);
});

app.post('/api/proposals', (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }

  const proposal = {
    id: `prop_${Date.now()}`,
    author: req.user.name,
    title,
    description,
    status: 'pending',
    createdAt: new Date()
  };

  city.proposals.push(proposal);
  saveData();
  res.json({ message: 'Proposta enviada com sucesso!' });
});

app.post('/api/mayor/proposals/:id/decide', (req, res) => {
  if (!req.user.isMayor) {
    return res.status(403).json({ error: 'Apenas o prefeito pode decidir' });
  }

  const { status, response } = req.body;
  const proposal = city.proposals.find(p => p.id === req.params.id);

  if (!proposal) {
    return res.status(404).json({ error: 'Proposta não encontrada' });
  }

  proposal.status = status;
  proposal.response = response;
  proposal.decidedAt = new Date();
  saveData();
  res.json({ message: 'Decisão registrada!' });
});

app.get('/api/achievements', (req, res) => {
  res.json(req.user.achievements || []);
});

app.get('/api/mayor', (req, res) => {
  if (!req.user.isMayor) {
    return res.status(403).json({ error: 'Apenas o prefeito pode acessar' });
  }

  res.json({
    population: city.population,
    economy: city.economy,
    infrastructure: city.infrastructure,
    quality: city.quality,
    taxRate: city.taxRate,
    treasury: city.treasury
  });
});

app.post('/api/mayor/settings', (req, res) => {
  if (!req.user.isMayor) {
    return res.status(403).json({ error: 'Apenas o prefeito pode fazer isso' });
  }

  const { tax, economy, infrastructure, quality } = req.body;
  city.taxRate = tax || city.taxRate;
  city.economy = economy || city.economy;
  city.infrastructure = infrastructure || city.infrastructure;
  city.quality = quality || city.quality;

  saveData();
  res.json({ message: 'Configurações salvas!' });
});

app.post('/api/mayor/news', (req, res) => {
  if (!req.user.isMayor) {
    return res.status(403).json({ error: 'Apenas o prefeito pode publicar notícias' });
  }

  const { title, body, image } = req.body;
  const news = {
    id: `news_${Date.now()}`,
    title,
    body,
    image,
    author: req.user.name,
    createdAt: new Date()
  };

  city.news.unshift(news);
  saveData();
  res.json({ message: 'Notícia publicada!' });
});

app.post('/api/mayor/events', (req, res) => {
  if (!req.user.isMayor) {
    return res.status(403).json({ error: 'Apenas o prefeito pode criar eventos' });
  }

  const { title, description, eventDate, image } = req.body;
  const event = {
    id: `event_${Date.now()}`,
    title,
    description,
    eventDate,
    image,
    createdAt: new Date()
  };

  city.events.push(event);
  saveData();
  res.json({ message: 'Evento criado!' });
});

// Endpoint para o prefeito adicionar perguntas por profissão
app.post('/api/mayor/questions', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode adicionar perguntas' });

  const { jobId, text, options, correct, difficulty } = req.body;
  if (!jobId || !text || !options || typeof correct !== 'number') {
    return res.status(400).json({ error: 'Campos inválidos. Envie jobId, text, options e correct (índice numérico).' });
  }

  // ensure array exists
  questionBank[jobId] = questionBank[jobId] || [];
  const qid = `${jobId}_${Date.now()}`;
  const q = { id: qid, text, options, correct, difficulty: difficulty || 1 };
  questionBank[jobId].push(q);
  saveData();

  res.json({ message: 'Pergunta adicionada!', question: q });
});

// list all questions (mayor only)
app.get('/api/mayor/questions', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode listar perguntas' });
  const list = [];
  Object.keys(questionBank).forEach(jobId => {
    (questionBank[jobId]||[]).forEach(q => list.push({ ...q, jobId }));
  });
  res.json(list);
});

// edit question
app.put('/api/mayor/questions/:id', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode editar perguntas' });
  const qid = req.params.id;
  const { text, options, correct, difficulty } = req.body;
  for (const jobId of Object.keys(questionBank)){
    const idx = (questionBank[jobId]||[]).findIndex(x=>x.id===qid);
    if (idx>=0){
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

// delete question
app.delete('/api/mayor/questions/:id', (req, res) => {
  if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode remover perguntas' });
  const qid = req.params.id;
  for (const jobId of Object.keys(questionBank)){
    const idx = (questionBank[jobId]||[]).findIndex(x=>x.id===qid);
    if (idx>=0){
      questionBank[jobId].splice(idx,1);
      saveData();
      return res.json({ message: 'Pergunta removida' });
    }
  }
  res.status(404).json({ error: 'Pergunta não encontrada' });
});

// reward config endpoints
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
}, 30000); // A cada 30 segundos

// ============= PORTA =============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏙️ Sorokiba rodando na porta ${PORT}`);
});