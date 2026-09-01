const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// ============= BANCO DE DADOS EM MEMÓRIA =============
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
  proposals: []
};

let tokenCounter = 0;
const generateToken = () => `token_${++tokenCounter}_${Date.now()}`;

// ============= JOBS =============
const jobs = [
  { id: 'estudante', name: 'Estudante', salary: 100, xpRequired: 0, task: 'Estude para o futuro', icon: '🎓' },
  { id: 'entregador', name: 'Entregador de Food', salary: 200, xpRequired: 100, task: 'Faça entregas pela cidade', icon: '📦' },
  { id: 'mecanico', name: 'Mecânico', salary: 300, xpRequired: 200, task: 'Conserte veículos e máquinas', icon: '🔧' },
  { id: 'professor', name: 'Professor', salary: 400, xpRequired: 350, task: 'Ensine as próximas gerações', icon: '📚' },
  { id: 'policial', name: 'Policial', salary: 450, xpRequired: 400, task: 'Proteja a cidade', icon: '🛡️' },
  { id: 'investigador', name: 'Investigador', salary: 550, xpRequired: 500, task: 'Investigue crimes e mistérios', icon: '🕵️' },
  { id: 'advogado', name: 'Advogado', salary: 500, xpRequired: 600, task: 'Defenda clientes', icon: '⚖️' },
  { id: 'engenheiro', name: 'Engenheiro', salary: 650, xpRequired: 700, task: 'Construa infraestrutura', icon: '🏗️' },
  { id: 'medico', name: 'Médico', salary: 800, xpRequired: 800, task: 'Trate dos enfermos', icon: '⚕️' },
  { id: 'juiz', name: 'Juiz do Tribunal', salary: 900, xpRequired: 1200, task: 'Julgue casos importantes', icon: '🏛️' }
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
  money: isMayor ? 5000 : 1000,
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
  createdAt: new Date()
});

const findQuestionById = (qid) => {
  for (const k of Object.keys(questionBank)){
    const q = questionBank[k].find(x=>x.id===qid);
    if(q) return q;
  }
  return null;
};

const createMission = (jobId, username) => {
  const duration = 120; // 2 minutos para responder
  const jobQuestions = questionBank[jobId] || questionBank.generic;
  const answered = (users[username] && users[username].answeredQuestions) || [];
  const available = jobQuestions.filter(q=>!answered.includes(q.id));
  const question = available.length ? available[Math.floor(Math.random()*available.length)] : jobQuestions[Math.floor(Math.random()*jobQuestions.length)];
  const difficulty = question.difficulty || 1;
  const rewardXp = Math.max(50, Math.floor(100 * difficulty));
  const rewardMoney = Math.max(100, Math.floor(150 * difficulty));

  return {
    id: `mission_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    jobId,
    started_at: new Date(),
    duration_seconds: duration,
    questionRef: question.id,
    question: { id: question.id, text: question.text, options: question.options },
    rewardXp,
    rewardMoney,
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

  const activeMissions = req.user.missions.filter(m => m.status === 'active');
  if (activeMissions.length > 0) {
    return res.status(400).json({ error: 'Você já tem uma missão ativa' });
  }

  const mission = createMission(req.user.jobId, req.username);
  req.user.missions.push(mission);

  // return the mission (without exposing correct answer)
  res.json({ message: 'Missão iniciada!', mission: { id: mission.id, jobId: mission.jobId, started_at: mission.started_at, duration_seconds: mission.duration_seconds, question: mission.question, rewardXp: mission.rewardXp, rewardMoney: mission.rewardMoney } });
});

app.post('/api/missions/:id/answer', (req, res) => {
  const { answer } = req.body; // expects numeric index
  const mission = req.user.missions.find(m => m.id === req.params.id);

  if (!mission) return res.status(400).json({ error: 'Missão não encontrada' });
  if (mission.status !== 'active') return res.status(400).json({ error: 'Missão não está ativa' });

  const elapsed = (Date.now() - new Date(mission.started_at).getTime()) / 1000;
  if (elapsed > mission.duration_seconds) {
    mission.status = 'expired';
    mission.createdAt = new Date();
    return res.status(400).json({ error: 'Tempo esgotado para responder' });
  }

  const q = findQuestionById(mission.questionRef);
  const correctIndex = q ? q.correct : null;
  const correct = (answer === correctIndex);

  // Rewards: full on correct, partial XP (25%) if wrong, no money
  const rewardXp = Math.floor(mission.rewardXp);
  const rewardMoney = Math.floor(mission.rewardMoney);
  const xpGiven = correct ? rewardXp : Math.floor(rewardXp * 0.25);
  const moneyGiven = correct ? rewardMoney : 0;

  mission.status = 'completed';
  mission.createdAt = new Date();
  mission.answer = answer;
  mission.correct = correct;

  req.user.xp += xpGiven;
  req.user.money += moneyGiven;
  req.user.answeredQuestions = req.user.answeredQuestions || [];
  if (!req.user.answeredQuestions.includes(mission.questionRef)) req.user.answeredQuestions.push(mission.questionRef);

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

  const correctOptionText = q ? (q.options && q.options[q.correct]) : null;

  res.json({ message: correct ? 'Resposta correta!' : 'Resposta incorreta', correct, correctIndex, correctOptionText, xpGiven, moneyGiven, user: { name: req.user.name, username: req.user.username, money: req.user.money, level: req.user.level, xp: req.user.xp, jobName: req.user.jobName, life: req.user.life, hunger: req.user.hunger, hydration: req.user.hydration, energy: req.user.energy } });
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
    balance: req.user.money,
    transfers: req.user.transactions || []
  });
});

app.post('/api/bank/deposit', (req, res) => {
  const { amount } = req.body;
  if (amount <= 0) return res.status(400).json({ error: 'Valor inválido' });
  
  req.user.money += amount;
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'deposit', person: 'Depósito', amount, description: 'Depósito na conta' });

  res.json({ message: `Depósito de R$ ${amount.toLocaleString('pt-BR')} realizado!` });
});

app.post('/api/bank/withdraw', (req, res) => {
  const { amount } = req.body;
  if (amount <= 0 || req.user.money < amount) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }
  
  req.user.money -= amount;
  req.user.transactions = req.user.transactions || [];
  req.user.transactions.push({ date: new Date(), type: 'withdraw', person: 'Saque', amount, description: 'Saque na conta' });

  res.json({ message: `Saque de R$ ${amount.toLocaleString('pt-BR')} realizado!` });
});

app.post('/api/bank/transfer', (req, res) => {
  const { username, amount } = req.body;
  const recipient = users[username];

  if (!recipient) {
    return res.status(400).json({ error: 'Usuário não encontrado' });
  }

  if (req.user.money < amount) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  req.user.money -= amount;
  recipient.money += amount;

  req.user.transactions = req.user.transactions || [];
  recipient.transactions = recipient.transactions || [];

  req.user.transactions.push({ date: new Date(), type: 'transfer_out', person: username, amount, description: `Transferência para ${username}` });
  recipient.transactions.push({ date: new Date(), type: 'transfer_in', person: req.user.username, amount, description: `Transferência de ${req.user.username}` });

  res.json({
    message: `Transferência de R$ ${amount.toLocaleString('pt-BR')} para ${username} realizada!`
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
  res.json({ message: 'Evento criado!' });
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