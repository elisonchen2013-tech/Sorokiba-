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
  { id: 'estudante', name: 'Estudante', salary: 100, task: 'Estude para o futuro', icon: '🎓' },
  { id: 'entregador', name: 'Entregador', salary: 300, task: 'Faça entregas pela cidade', icon: '📦' },
  { id: 'comerciante', name: 'Comerciante', salary: 400, task: 'Venda produtos no mercado', icon: '🛍️' },
  { id: 'motorista', name: 'Motorista', salary: 350, task: 'Dirija passageiros', icon: '🚗' },
  { id: 'policial', name: 'Policial', salary: 450, task: 'Proteja a cidade', icon: '🛡️' },
  { id: 'enfermeiro', name: 'Enfermeiro', salary: 400, task: 'Cuide dos cidadãos', icon: '🩺' },
  { id: 'medico', name: 'Médico', salary: 600, task: 'Trate dos enfermos', icon: '⚕️' },
  { id: 'programador', name: 'Programador', salary: 700, task: 'Desenvolva sistemas', icon: '💻' },
  { id: 'engenheiro', name: 'Engenheiro', salary: 650, task: 'Construa infraestrutura', icon: '🏗️' }
];

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
  createdAt: new Date()
});

const createMission = (jobId) => {
  const duration = 120 + Math.random() * 240; // 2-6 minutos
  return {
    id: `mission_${Date.now()}`,
    jobId,
    started_at: new Date(),
    duration_seconds: Math.floor(duration),
    rewardXp: 50 + Math.random() * 100,
    rewardMoney: 200 + Math.random() * 400,
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

  const mission = createMission(req.user.jobId);
  req.user.missions.push(mission);

  res.json({ message: 'Missão iniciada!' });
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

  mission.status = 'completed';
  const rewardXp = Math.floor(mission.rewardXp);
  const rewardMoney = Math.floor(mission.rewardMoney);

  req.user.xp += rewardXp;
  req.user.money += rewardMoney;

  // Level up a cada 500 XP
  if (req.user.xp >= 500) {
    req.user.level += 1;
    req.user.xp -= 500;
  }

  res.json({
    message: 'Parabéns! Missão concluída',
    rewardXp,
    rewardMoney,
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
    transfers: []
  });
});

app.post('/api/bank/deposit', (req, res) => {
  const { amount } = req.body;
  if (amount <= 0) return res.status(400).json({ error: 'Valor inválido' });
  
  res.json({ message: `Depósito de R$ ${amount.toLocaleString('pt-BR')} realizado!` });
});

app.post('/api/bank/withdraw', (req, res) => {
  const { amount } = req.body;
  if (amount <= 0 || req.user.money < amount) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }
  
  req.user.money -= amount;
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