const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

/* =====================================================
   BANCO
===================================================== */

const DEFAULT_DB = {
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

function createDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(DEFAULT_DB, null, 2)
    );
  }
}

function readDB() {
  createDB();

  try {
    const data = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

    return {
      ...DEFAULT_DB,
      ...data,
      users: Array.isArray(data.users)
        ? data.users
        : [],
      news: Array.isArray(data.news)
        ? data.news
        : [],
      proposals: Array.isArray(data.proposals)
        ? data.proposals
        : [],
      events: Array.isArray(data.events)
        ? data.events
        : [],
      transactions: Array.isArray(data.transactions)
        ? data.transactions
        : [],
      city: {
        ...DEFAULT_DB.city,
        ...(data.city || {})
      }
    };
  } catch (error) {
    console.error("Erro no data.json:", error);

    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(DEFAULT_DB, null, 2)
    );

    return JSON.parse(
      JSON.stringify(DEFAULT_DB)
    );
  }
}

function saveDB(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2)
  );
}

createDB();

/* =====================================================
   SESSÕES
===================================================== */

const sessions = new Map();

function createSession(username) {
  const id = crypto.randomBytes(32).toString("hex");
  sessions.set(id, username);
  return id;
}

/* =====================================================
   SENHAS
===================================================== */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return {
    salt,
    hash
  };
}

function verifyPassword(password, user) {
  try {
    const hash = crypto.scryptSync(
      password,
      user.salt,
      64
    );

    const stored = Buffer.from(
      user.hash,
      "hex"
    );

    return (
      hash.length === stored.length &&
      crypto.timingSafeEqual(hash, stored)
    );
  } catch {
    return false;
  }
}

function safeUser(user) {
  if (!user) return null;

  const copy = { ...user };

  delete copy.password;
  delete copy.salt;
  delete copy.hash;

  return copy;
}

/* =====================================================
   AUTENTICAÇÃO
===================================================== */

function requireLogin(req, res, next) {
  const sessionId = req.cookies.sid;

  if (!sessionId) {
    return res.status(401).json({
      error: "Faça login primeiro."
    });
  }

  const username = sessions.get(sessionId);

  if (!username) {
    return res.status(401).json({
      error: "Sessão expirada."
    });
  }

  const db = readDB();

  const user = db.users.find(
    u => u.username === username
  );

  if (!user) {
    sessions.delete(sessionId);

    return res.status(401).json({
      error: "Usuário não encontrado."
    });
  }

  updateNeeds(user);

  req.user = user;
  req.db = db;

  next();
}

function requireMayor(req, res, next) {
  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Somente o prefeito pode fazer isso."
    });
  }

  next();
}

/* =====================================================
   UTILIDADES
===================================================== */

function id() {
  return (
    Date.now().toString(36) +
    crypto.randomBytes(5).toString("hex")
  );
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function loginUser(user, res) {
  const sid = createSession(user.username);

  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    ok: true,
    user: safeUser(user)
  });
}

/* =====================================================
   FOME E SAÚDE
===================================================== */

function updateNeeds(user) {
  if (typeof user.hunger !== "number") {
    user.hunger = 100;
  }

  if (typeof user.health !== "number") {
    user.health = 100;
  }

  if (!user.lastNeedUpdate) {
    user.lastNeedUpdate = Date.now();
    return;
  }

  const elapsed =
    Date.now() - user.lastNeedUpdate;

  const periods = Math.floor(
    elapsed / (30 * 60 * 1000)
  );

  if (periods <= 0) return;

  user.hunger = Math.max(
    0,
    user.hunger - periods
  );

  if (user.hunger === 0) {
    user.health = Math.max(
      10,
      user.health - periods
    );
  }

  user.lastNeedUpdate = Date.now();
}

/* =====================================================
   TRABALHOS
===================================================== */

const JOBS = {
  Entregador: {
    requiredXP: 0,
    reward: 40
  },

  Jornalista: {
    requiredXP: 100,
    reward: 55
  },

  Comerciante: {
    requiredXP: 250,
    reward: 65
  },

  Investigador: {
    requiredXP: 500,
    reward: 80
  },

  Engenheiro: {
    requiredXP: 1000,
    reward: 100
  },

  Empresário: {
    requiredXP: 2000,
    reward: 130
  }
};

/* =====================================================
   MISSÕES
===================================================== */

const MISSION_DATA = {
  Entregador: [
    {
      id: "entrega_1",
      title: "Fazer uma entrega",
      description:
        "Faça uma entrega para um morador."
    },
    {
      id: "entrega_2",
      title: "Entrega urgente",
      description:
        "Faça uma entrega urgente."
    }
  ],

  Jornalista: [
    {
      id: "jornalista_1",
      title: "Criar reportagem",
      description:
        "Investigue um acontecimento."
    },
    {
      id: "jornalista_2",
      title: "Entrevistar cidadão",
      description:
        "Faça uma entrevista."
    }
  ],

  Comerciante: [
    {
      id: "comercio_1",
      title: "Realizar vendas",
      description:
        "Realize vendas para moradores."
    },
    {
      id: "comercio_2",
      title: "Organizar loja",
      description:
        "Organize seu comércio."
    }
  ],

  Investigador: [
    {
      id: "investigacao_1",
      title: "Investigar caso",
      description:
        "Investigue um caso da cidade."
    },
    {
      id: "investigacao_2",
      title: "Analisar evidências",
      description:
        "Analise as evidências encontradas."
    }
  ],

  Engenheiro: [
    {
      id: "engenharia_1",
      title: "Planejar melhoria",
      description:
        "Planeje uma melhoria para a cidade."
    },
    {
      id: "engenharia_2",
      title: "Inspecionar construção",
      description:
        "Faça uma inspeção."
    }
  ],

  Empresário: [
    {
      id: "empresa_1",
      title: "Criar plano econômico",
      description:
        "Crie um plano econômico."
    },
    {
      id: "empresa_2",
      title: "Planejar negócio",
      description:
        "Planeje um novo negócio."
    }
  ]
};

function getMissions(user) {
  const job = user.job || "Entregador";

  const missions =
    MISSION_DATA[job] ||
    MISSION_DATA.Entregador;

  const day = today();

  if (!user.missions) {
    user.missions = {};
  }

  if (!Array.isArray(user.missions[day])) {
    user.missions[day] = [];
  }

  return missions.map((mission, index) => ({
    ...mission,
    number: index + 1,
    completed:
      user.missions[day].includes(
        mission.id
      ),
    xp: 50,
    money:
      JOBS[job]?.reward || 40
  }));
}

/* =====================================================
   REGISTRO
===================================================== */

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
      error: "Usuário muito curto."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "A senha precisa ter pelo menos 6 caracteres."
    });
  }

  if (
    db.users.some(
      u => u.username === username
    )
  ) {
    return res.status(409).json({
      error: "Esse usuário já existe."
    });
  }

  const passwordData =
    hashPassword(password);

  /*
    PRIMEIRA CONTA:
    PREFEITO
  */

  const isFirstUser =
    db.users.length === 0;

  const user = {
    id: id(),
    name,
    username,

    salt: passwordData.salt,
    hash: passwordData.hash,

    role: isFirstUser
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

    lastNeedUpdate: Date.now(),

    createdAt:
      new Date().toISOString()
  };

  db.users.push(user);
  db.city.population++;

  saveDB(db);

  loginUser(user, res);
});

/* =====================================================
   LOGIN
===================================================== */

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
    u => u.username === username
  );

  if (
    !user ||
    !verifyPassword(password, user)
  ) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  updateNeeds(user);

  saveDB(db);

  loginUser(user, res);
});

/* =====================================================
   LOGOUT
===================================================== */

app.post(
  "/api/logout",
  requireLogin,
  (req, res) => {
    sessions.delete(req.cookies.sid);

    res.clearCookie("sid");

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   ESTADO
===================================================== */

app.get(
  "/api/state",
  requireLogin,
  (req, res) => {
    updateNeeds(req.user);

    saveDB(req.db);

    res.json({
      user: safeUser(req.user),
      city: req.db.city,
      news: req.db.news,
      proposals: req.db.proposals,
      events: req.db.events
    });
  }
);

/* =====================================================
   TRABALHOS
===================================================== */

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
        error: "Trabalho inexistente."
      });
    }

    if (req.user.xp < job.requiredXP) {
      return res.status(400).json({
        error:
          `Você precisa de ${job.requiredXP} XP.`
      });
    }

    req.user.job = jobName;

    saveDB(req.db);

    res.json({
      ok: true,
      user: safeUser(req.user)
    });
  }
);

/* =====================================================
   MISSÕES
===================================================== */

app.get(
  "/api/missions",
  requireLogin,
  (req, res) => {
    res.json({
      missions: getMissions(req.user)
    });
  }
);

app.post(
  "/api/missions/complete",
  requireLogin,
  (req, res) => {
    const missionId =
      String(
        req.body.missionId || ""
      );

    const missions =
      getMissions(req.user);

    const mission =
      missions.find(
        m =>
          m.id === missionId &&
          !m.completed
      );

    if (!mission) {
      return res.status(400).json({
        error:
          "Missão inválida ou já concluída."
      });
    }

    const day = today();

    if (!req.user.missions[day]) {
      req.user.missions[day] = [];
    }

    /*
      MÁXIMO DE 2 MISSÕES POR DIA
    */

    if (
      req.user.missions[day].length >= 2
    ) {
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
      Math.floor(
        req.user.xp / 500
      ) + 1;

    req.user.reputation =
      Math.min(
        100,
        req.user.reputation + 1
      );

    req.db.city.gdp +=
      mission.money * 10;

    req.db.city.treasury +=
      Math.floor(
        mission.money * 0.1
      );

    req.db.transactions.push({
      id: id(),
      username:
        req.user.username,
      type: "mission",
      value: mission.money,
      date:
        new Date().toISOString()
    });

    saveDB(req.db);

    res.json({
      ok: true,
      mission,
      user: safeUser(req.user)
    });
  }
);

/* =====================================================
   MERCADO
===================================================== */

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
    const food =
      FOODS[
        String(req.body.food || "")
      ];

    if (!food) {
      return res.status(400).json({
        error: "Comida não encontrada."
      });
    }

    updateNeeds(req.user);

    if (req.user.money < food.price) {
      return res.status(400).json({
        error: "Dinheiro insuficiente."
      });
    }

    req.user.money -= food.price;

    req.user.hunger =
      Math.min(
        100,
        req.user.hunger +
          food.hunger
      );

    req.user.health =
      Math.min(
        100,
        req.user.health +
          food.health
      );

    if (!Array.isArray(req.user.inventory)) {
      req.user.inventory = [];
    }

    req.user.inventory.push({
      id: id(),
      type: "food",
      name: food.name,
      boughtAt:
        new Date().toISOString()
    });

    req.db.city.treasury +=
      Math.floor(
        food.price * 0.05
      );

    req.db.city.gdp += food.price;

    saveDB(req.db);

    res.json({
      ok: true,
      food,
      user: safeUser(req.user)
    });
  }
);

/* =====================================================
   PROPOSTAS
===================================================== */

app.post(
  "/api/proposals",
  requireLogin,
  (req, res) => {
    const text = String(
      req.body.text || ""
    ).trim();

    if (!text) {
      return res.status(400).json({
        error: "Digite uma proposta."
      });
    }

    req.db.proposals.unshift({
      id: id(),
      author:
        req.user.username,
      text,
      status: "Pendente",
      date:
        new Date().toLocaleDateString(
          "pt-BR"
        )
    });

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

app.post(
  "/api/proposals/:id",
  requireLogin,
  requireMayor,
  (req, res) => {
    const proposal =
      req.db.proposals.find(
        p =>
          String(p.id) ===
          String(req.params.id)
      );

    if (!proposal) {
      return res.status(404).json({
        error:
          "Proposta não encontrada."
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

/* =====================================================
   NOTÍCIAS
===================================================== */

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

    req.db.news.unshift({
      id: id(),
      title,
      text,
      category,
      image,
      author:
        req.user.name,
      date:
        new Date().toLocaleDateString(
          "pt-BR"
        )
    });

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   EVENTOS
===================================================== */

app.post(
  "/api/events",
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
        error:
          "Preencha título e descrição."
      });
    }

    req.db.events.unshift({
      id: id(),
      title,
      text,
      date:
        new Date().toLocaleDateString(
          "pt-BR"
        )
    });

    saveDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   IMPOSTO
===================================================== */

app.post(
  "/api/tax",
  requireLogin,
  requireMayor,
  (req, res) => {
    const tax =
      Number(req.body.tax);

    if (
      !Number.isFinite(tax) ||
      tax < 0 ||
      tax > 30
    ) {
      return res.status(400).json({
        error:
          "O imposto deve ficar entre 0% e 30%."
      });
    }

    req.db.city.tax = tax;

    saveDB(req.db);

    res.json({
      ok: true,
      city: req.db.city
    });
  }
);

/* =====================================================
   CIDADE
===================================================== */

app.get(
  "/api/city",
  requireLogin,
  (req, res) => {
    res.json({
      city: req.db.city
    });
  }
);

/* =====================================================
   ARQUIVOS DO SITE
===================================================== */

app.use(
  express.static(PUBLIC_DIR)
);

/*
  Express 5:
  NÃO usar app.get("*").
*/

app.use((req, res, next) => {
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

/* =====================================================
   ERROS
===================================================== */

app.use(
  (error, req, res, next) => {
    console.error(
      "ERRO DO SERVIDOR:",
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

/* =====================================================
   INICIAR SERVIDOR
===================================================== */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sorokiba funcionando na porta ${PORT}`
    );
  }
);
