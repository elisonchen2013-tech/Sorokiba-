javascript
const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

/* =========================================================
   BANCO DE DADOS
========================================================= */

const INITIAL_DB = {
  users: [],
  news: [],
  proposals: [],
  events: [],
  transactions: [],
  city: {
    population: 0,
    gdp: 100000,
    territory: 10,
    treasury: 1000,
    infrastructure: 50,
    quality: 70,
    tax: 5
  }
};

function createDatabaseIfNeeded() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(INITIAL_DB, null, 2),
      "utf8"
    );
  }
}

function readDB() {
  createDatabaseIfNeeded();

  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(raw);

    return {
      ...INITIAL_DB,
      ...data,
      city: {
        ...INITIAL_DB.city,
        ...(data.city || {})
      }
    };
  } catch (error) {
    console.error("Erro lendo data.json:", error);

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(INITIAL_DB, null, 2),
      "utf8"
    );

    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function saveDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

createDatabaseIfNeeded();

/* =========================================================
   SESSÕES
========================================================= */

const sessions = new Map();

function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, username);
  return sessionId;
}

/* =========================================================
   SENHAS
========================================================= */

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return {
    salt,
    hash
  };
}

function checkPassword(password, user) {
  try {
    const calculated = crypto.scryptSync(
      password,
      user.salt,
      64
    );

    const stored = Buffer.from(user.hash, "hex");

    return (
      calculated.length === stored.length &&
      crypto.timingSafeEqual(calculated, stored)
    );
  } catch {
    return false;
  }
}

function publicUser(user) {
  if (!user) return null;

  const {
    salt,
    hash,
    ...safeUser
  } = user;

  return safeUser;
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function requireLogin(req, res, next) {
  const sessionId = req.cookies.sid;

  if (!sessionId) {
    return res.status(401).json({
      error: "Faça login."
    });
  }

  const username = sessions.get(sessionId);

  if (!username) {
    return res.status(401).json({
      error: "Sessão expirada. Faça login novamente."
    });
  }

  const db = readDB();

  const user = db.users.find(
    item => item.username === username
  );

  if (!user) {
    sessions.delete(sessionId);

    return res.status(401).json({
      error: "Usuário não encontrado."
    });
  }

  updateHunger(user);

  req.user = user;
  req.db = db;

  next();
}

function requireMayor(req, res, next) {
  if (!req.user || req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Área exclusiva do prefeito."
    });
  }

  next();
}

function sendLogin(user, res) {
  const sessionId = createSession(user.username);

  res.cookie("sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    ok: true,
    user: publicUser(user)
  });
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function newId() {
  return (
    Date.now().toString(36) +
    crypto.randomBytes(6).toString("hex")
  );
}

function currentDay() {
  return new Date().toISOString().slice(0, 10);
}

/* =========================================================
   TRABALHOS
========================================================= */

const JOBS = {
  Entregador: {
    xp: 0,
    money: 40,
    description: "Entregue encomendas pela cidade."
  },

  Jornalista: {
    xp: 100,
    money: 55,
    description: "Produza notícias para Sorokiba."
  },

  Comerciante: {
    xp: 250,
    money: 65,
    description: "Movimente o comércio da cidade."
  },

  Investigador: {
    xp: 500,
    money: 80,
    description: "Investigue acontecimentos."
  },

  Engenheiro: {
    xp: 1000,
    money: 100,
    description: "Planeje melhorias urbanas."
  },

  Empresário: {
    xp: 2000,
    money: 130,
    description: "Ajude no desenvolvimento econômico."
  }
};

/* =========================================================
   MISSÕES
========================================================= */

const MISSIONS = {
  Entregador: [
    {
      id: "entregador_1",
      title: "Entregar 3 encomendas",
      description: "Faça três entregas para moradores."
    },
    {
      id: "entregador_2",
      title: "Entrega urgente",
      description: "Complete uma entrega urgente."
    }
  ],

  Jornalista: [
    {
      id: "jornalista_1",
      title: "Criar uma reportagem",
      description: "Investigue um acontecimento da cidade."
    },
    {
      id: "jornalista_2",
      title: "Entrevistar um cidadão",
      description: "Faça uma entrevista."
    }
  ],

  Comerciante: [
    {
      id: "comerciante_1",
      title: "Realizar 5 vendas",
      description: "Venda produtos para moradores."
    },
    {
      id: "comerciante_2",
      title: "Organizar o comércio",
      description: "Prepare sua loja para o dia."
    }
  ],

  Investigador: [
    {
      id: "investigador_1",
      title: "Investigar um caso",
      description: "Investigue um caso da cidade."
    },
    {
      id: "investigador_2",
      title: "Analisar evidências",
      description: "Analise as evidências encontradas."
    }
  ],

  Engenheiro: [
    {
      id: "engenheiro_1",
      title: "Planejar uma melhoria",
      description: "Planeje uma melhoria urbana."
    },
    {
      id: "engenheiro_2",
      title: "Inspecionar construção",
      description: "Faça uma inspeção."
    }
  ],

  Empresário: [
    {
      id: "empresario_1",
      title: "Criar plano econômico",
      description: "Crie um plano para a economia."
    },
    {
      id: "empresario_2",
      title: "Planejar novo negócio",
      description: "Planeje um novo empreendimento."
    }
  ]
};

function getUserMissions(user) {
  const job = user.job || "Entregador";
  const list = MISSIONS[job] || MISSIONS.Entregador;
  const day = currentDay();

  if (!user.missions) {
    user.missions = {};
  }

  if (!Array.isArray(user.missions[day])) {
    user.missions[day] = [];
  }

  return list.map((mission, index) => {
    const completed = user.missions[day].includes(
      mission.id
    );

    const xpReward =
      50 + ((user.level || 1) * 5);

    const moneyReward =
      JOBS[job].money;

    return {
      id: mission.id,
      number: index + 1,
      title: mission.title,
      description: mission.description,
      xp: xpReward,
      money: moneyReward,
      completed
    };
  });
}

/* =========================================================
   FOME E SAÚDE
========================================================= */

function updateHunger(user) {
  if (typeof user.hunger !== "number") {
    user.hunger = 100;
  }

  if (typeof user.health !== "number") {
    user.health = 100;
  }

  if (!user.lastHungerUpdate) {
    user.lastHungerUpdate = Date.now();
    return;
  }

  const elapsed =
    Date.now() - user.lastHungerUpdate;

  const halfHours = Math.floor(
    elapsed / (30 * 60 * 1000)
  );

  if (halfHours <= 0) {
    return;
  }

  user.hunger = Math.max(
    0,
    user.hunger - halfHours
  );

  if (user.hunger === 0) {
    user.health = Math.max(
      10,
      user.health - halfHours
    );
  }

  user.lastHungerUpdate = Date.now();
}

/* =========================================================
   REGISTRO
========================================================= */

app.post("/api/register", (req, res) => {
  const db = readDB();

  const name = String(
    req.body.name || ""
  ).trim();

  const username = String(
    req.body.username || ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    req.body.password || ""
  );

  if (name.length < 2) {
    return res.status(400).json({
      error: "Digite seu nome."
    });
  }

  if (username.length < 3) {
    return res.status(400).json({
      error: "O usuário precisa ter pelo menos 3 caracteres."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "A senha precisa ter pelo menos 6 caracteres."
    });
  }

  const alreadyExists = db.users.some(
    user => user.username === username
  );

  if (alreadyExists) {
    return res.status(409).json({
      error: "Esse usuário já existe."
    });
  }

  const passwordData =
    createPasswordHash(password);

  /*
    A PRIMEIRA CONTA DO BANCO
    É AUTOMATICAMENTE O PREFEITO.
  */

  const firstUser =
    db.users.length === 0;

  const user = {
    id: newId(),

    name,

    username,

    ...passwordData,

    role: firstUser
      ? "mayor"
      : "citizen",

    xp: 0,

    level: 1,

    money: 500,

    reputation: 50,

    job: "Entregador",

    hunger: 100,

    health: 100,

    inventory: [],

    missions: {},

    lastHungerUpdate: Date.now(),

    createdAt:
      new Date().toISOString()
  };

  db.users.push(user);

  db.city.population += 1;

  saveDB(db);

  sendLogin(user, res);
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/login", (req, res) => {
  const db = readDB();

  const username = String(
    req.body.username || ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    req.body.password || ""
  );

  const user = db.users.find(
    item => item.username === username
  );

  if (!user) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  if (!checkPassword(password, user)) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  updateHunger(user);

  saveDB(db);

  sendLogin(user, res);
});

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  requireLogin,
  (req, res) => {
    const sessionId = req.cookies.sid;

    sessions.delete(sessionId);

    res.clearCookie("sid");

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   ESTADO DO JOGO
========================================================= */

app.get(
  "/api/state",
  requireLogin,
  (req, res) => {
    updateHunger(req.user);

    saveDB(req.db);

    res.json({
      user: publicUser(req.user),
      city: req.db.city,
      news: req.db.news,
      proposals: req.db.proposals,
      events: req.db.events
    });
  }
);

/* =========================================================
   TRABALHOS
========================================================= */

app.get(
  "/api/jobs",
  requireLogin,
  (req, res) => {
    res.json(JOBS);
  }
);

app.post(
  "/api/job",
  requireLogin,
  (req, res) => {
    const jobName = String(
      req.body.job || ""
    );

    const job = JOBS[jobName];

    if (!job) {
      return res.status(400).json({
        error: "Trabalho não encontrado."
      });
    }

    if (req.user.xp < job.xp) {
      return res.status(400).json({
        error:
          `Você precisa de ${job.xp} XP para esse trabalho.`
      });
    }

    req.user.job = jobName;

    saveDB(req.db);

    res.json({
      ok: true,
      user: publicUser(req.user)
    });
  }
);

/* =========================================================
   MISSÕES
========================================================= */

app.get(
  "/api/mission",
  requireLogin,
  (req, res) => {
    const missions =
      getUserMissions(req.user);

    saveDB(req.db);

    res.json({
      missions
    });
  }
);

/* =========================================================
   CONCLUIR MISSÃO
========================================================= */

app.post(
  "/api/mission",
  requireLogin,
  (req, res) => {
    const day = currentDay();

    if (!req.user.missions[day]) {
      req.user.missions[day] = [];
    }

    const missions =
      getUserMissions(req.user);

    let mission;

    if (req.body.missionId) {
      mission = missions.find(
        item =>
          item.id === req.body.missionId &&
          !item.completed
      );
    } else {
      mission = missions.find(
        item => !item.completed
      );
    }

    if (!mission) {
      return res.status(400).json({
        error:
          "Você já completou as 2 missões de hoje."
      });
    }

    req.user.missions[day].push(
      mission.id
    );

    req.user.xp += mission.xp;

    req.user.money += mission.money;

    req.user.level =
      1 +
      Math.floor(
        req.user.xp / 500
      );

    req.user.reputation =
      Math.min(
        100,
        req.user.reputation + 1
      );

    req.db.city.gdp +=
      mission.money * 10;

    req.db.city.treasury +=
      Math.round(
        mission.money * 0.1
      );

    req.db.transactions.push({
      id: newId(),
      user: req.user.username,
      type: "Missão",
      mission: mission.title,
      value: mission.money,
      date: new Date().toISOString()
    });

    saveDB(req.db);

    res.json({
      ok: true,
      mission,
      user: publicUser(req.user)
    });
  }
);

/* =========================================================
   MERCADO
========================================================= */

const FOODS = {
  agua: {
    id: "agua",
    name: "Água",
    icon: "💧",
    price: 5,
    hunger: 5,
    health: 1
  },

  lanche: {
    id: "lanche",
    name: "Lanche",
    icon: "🥪",
    price: 15,
    hunger: 15,
    health: 2
  },

  pizza: {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    price: 35,
    hunger: 30,
    health: 3
  },

  hamburguer: {
    id: "hamburguer",
    name: "Hambúrguer",
    icon: "🍔",
    price: 50,
    hunger: 45,
    health: 4
  },

  refeicao: {
    id: "refeicao",
    name: "Refeição completa",
    icon: "🍱",
    price: 75,
    hunger: 65,
    health: 6
  },

  banquete: {
    id: "banquete",
    name: "Banquete",
    icon: "🍗",
    price: 120,
    hunger: 100,
    health: 10
  }
};

app.get(
  "/api/market",
  requireLogin,
  (req, res) => {
    res.json(FOODS);
  }
);

app.post(
  "/api/market/buy",
  requireLogin,
  (req, res) => {
    const foodId = String(
      req.body.food || ""
    );

    const food = FOODS[foodId];

    if (!food) {
      return res.status(400).json({
        error: "Comida não encontrada."
      });
    }

    updateHunger(req.user);

    if (req.user.money < food.price) {
      return res.status(400).json({
        error: "Você não tem dinheiro suficiente."
      });
    }

    req.user.money -= food.price;

    req.user.hunger = Math.min(
      100,
      req.user.hunger + food.hunger
    );

    req.user.health = Math.min(
      100,
      req.user.health + food.health
    );

    if (!Array.isArray(req.user.inventory)) {
      req.user.inventory = [];
    }

    req.user.inventory.push({
      id: newId(),
      type: "food",
      name: food.name,
      date: new Date().toISOString()
    });

    req.db.city.treasury +=
      Math.round(food.price * 0.05);

    req.db.city.gdp += food.price;

    req.db.transactions.push({
      id: newId(),
      user: req.user.username,
      type: "Mercado",
      item: food.name,
      value: food.price,
      date: new Date().toISOString()
    });

    saveDB(req.db);

    res.json({
      ok: true,
      food,
      user: publicUser(req.user)
    });
  }
);

/* =========================================================
   PROPOSTAS
========================================================= */

app.post(
  "/api/proposals",
  requireLogin,
  (req, res) => {
    const text = String(
      req.body.text || ""
    ).trim();

    if (!text) {
      return res.status(400).json({
        error: "Escreva uma proposta."
      });
    }

    req.db.proposals.unshift({
      id: newId(),
      author: req.user.username,
      text,
      status: "Pendente",
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   PREFEITO APROVA PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id",
  requireLogin,
  requireMayor,
  (req, res) => {
    const proposal =
      req.db.proposals.find(
        item =>
          String(item.id) ===
          String(req.params.id)
      );

    if (!proposal) {
      return res.status(404).json({
        error: "Proposta não encontrada."
      });
    }

    proposal.status =
      req.body.approve
        ? "Aprovada"
        : "Recusada";

    proposal.reviewedBy =
      req.user.username;

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   NOTÍCIAS
========================================================= */

app.post(
  "/api/news",
  requireLogin,
  requireMayor,
  (req, res) => {
    const title = String(
      req.body.title || ""
    ).trim();

    const text = String(
      req.body.text || ""
    ).trim();

    const category = String(
      req.body.category ||
      "Comunicado"
    ).trim();

    const image = String(
      req.body.image || ""
    ).trim();

    if (!title || !text) {
      return res.status(400).json({
        error:
          "Título e texto são obrigatórios."
      });
    }

    if (image.length > 5000000) {
      return res.status(400).json({
        error:
          "A imagem é muito grande."
      });
    }

    req.db.news.unshift({
      id: newId(),
      title,
      text,
      category,
      image,
      author: req.user.name,
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   EVENTOS
========================================================= */

app.post(
  "/api/event",
  requireLogin,
  requireMayor,
  (req, res) => {
    const title = String(
      req.body.title || ""
    ).trim();

    const text = String(
      req.body.text || ""
    ).trim();

    if (!title || !text) {
      return res.status(400).json({
        error: "Preencha todos os campos."
      });
    }

    req.db.events.unshift({
      id: newId(),
      title,
      text,
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   IMPOSTOS
========================================================= */

app.post(
  "/api/tax",
  requireLogin,
  requireMayor,
  (req, res) => {
    const tax = Number(
      req.body.tax
    );

    if (
      !Number.isFinite(tax) ||
      tax < 0 ||
      tax > 30
    ) {
      return res.status(400).json({
        error:
          "O imposto deve estar entre 0% e 30%."
      });
    }

    req.db.city.tax = tax;

    const revenue =
      Math.round(
        req.db.city.population *
        tax *
        2
      );

    req.db.city.treasury +=
      revenue;

    req.db.city.quality =
      Math.max(
        0,
        Math.min(
          100,
          70 +
            Math.round(
              (10 - tax) * 2
            )
        )
      );

    saveDB(req.db);

    res.json({
      ok: true,
      city: req.db.city
    });
  }
);

/* =========================================================
   DADOS DA CIDADE
========================================================= */

app.get(
  "/api/city",
  requireLogin,
  (req, res) => {
    res.json({
      city: req.db.city
    });
  }
);

/* =========================================================
   ROTA DO SITE
========================================================= */

/*
  NÃO usar app.get("*") porque o Express 5
  pode gerar:
  PathError: Missing parameter name
*/

app.get(/.*/, (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: "API não encontrada."
    });
  }

  const indexFile =
    path.join(
      PUBLIC_DIR,
      "index.html"
    );

  if (!fs.existsSync(indexFile)) {
    return res.status(500).send(
      "Erro: public/index.html não foi encontrado."
    );
  }

  res.sendFile(indexFile);
});

/* =========================================================
   ERROS
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "Erro do servidor:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Erro interno do servidor."
    });
  }
);

/* =========================================================
   INICIAR
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sorokiba online na porta ${PORT}`
    );
  }
);

