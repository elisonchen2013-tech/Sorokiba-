const express = require("express");
const cookie = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data.json");

// ======================================================
// BANCO DE DADOS
// ======================================================

if (!fs.existsSync(DB)) {
  fs.writeFileSync(
    DB,
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    return {
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
  }
}

function write(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ======================================================
// CONFIGURAÇÃO
// ======================================================

const sessions = new Map();

app.use(express.json());
app.use(cookie());
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// SEGURANÇA / SENHAS
// ======================================================

function makeHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  return {
    salt,
    hash: crypto
      .scryptSync(password, salt, 64)
      .toString("hex")
  };
}

function valid(password, user) {
  try {
    const hash = crypto.scryptSync(password, user.salt, 64);

    return crypto.timingSafeEqual(
      hash,
      Buffer.from(user.hash, "hex")
    );
  } catch {
    return false;
  }
}

function safe(user) {
  const { salt, hash, ...data } = user;
  return data;
}

// ======================================================
// AUTENTICAÇÃO
// ======================================================

function auth(req, res, next) {
  const data = read();

  const username = sessions.get(req.cookies.sid);

  const user = data.users.find(
    u => u.username === username
  );

  if (!user) {
    return res.status(401).json({
      error: "Faça login para continuar."
    });
  }

  req.user = user;
  next();
}

function mayor(req, res, next) {
  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Área exclusiva do prefeito."
    });
  }

  next();
}

function login(user, res) {
  const sid = crypto.randomBytes(32).toString("hex");

  sessions.set(sid, user.username);

  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 604800000
  });

  res.json({
    user: safe(user)
  });
}

// ======================================================
// TRABALHOS
// ======================================================

const jobs = {
  Entregador: {
    xpRequired: 0,
    reward: 40,
    title: "Entregador",
    mission: "Entregar 3 encomendas",
    target: 3,
    type: "deliver"
  },

  Jornalista: {
    xpRequired: 100,
    reward: 55,
    title: "Jornalista",
    mission: "Publicar uma reportagem",
    target: 1,
    type: "report"
  },

  Comerciante: {
    xpRequired: 250,
    reward: 65,
    title: "Comerciante",
    mission: "Realizar 5 vendas",
    target: 5,
    type: "sale"
  },

  Investigador: {
    xpRequired: 500,
    reward: 80,
    title: "Investigador",
    mission: "Resolver o caso diário",
    target: 1,
    type: "case"
  },

  Engenheiro: {
    xpRequired: 1000,
    reward: 100,
    title: "Engenheiro",
    mission: "Planejar uma melhoria urbana",
    target: 1,
    type: "project"
  },

  Empresário: {
    xpRequired: 2000,
    reward: 130,
    title: "Empresário",
    mission: "Criar um plano econômico",
    target: 1,
    type: "business"
  }
};

// ======================================================
// GARANTE QUE A MISSÃO DO DIA EXISTE
// ======================================================

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createDailyMission(user) {
  const day = today();

  if (!user.mission || user.mission.date !== day) {
    const job = jobs[user.job] || jobs.Entregador;

    user.mission = {
      date: day,
      type: job.type,
      progress: 0,
      target: job.target,
      completed: false
    };
  }
}

// ======================================================
// LEVEL
// ======================================================

function updateLevel(user) {
  user.level = 1 + Math.floor(user.xp / 500);
}

// ======================================================
// REGISTRO
// ======================================================

app.post("/api/register", (req, res) => {
  const data = read();

  const name = (req.body.name || "").trim();
  const username = (req.body.username || "")
    .trim()
    .toLowerCase();

  const password = req.body.password || "";

  if (
    name.length < 2 ||
    username.length < 3 ||
    password.length < 6
  ) {
    return res.status(400).json({
      error:
        "Preencha nome, usuário e senha. A senha precisa ter pelo menos 6 caracteres."
    });
  }

  if (
    data.users.some(
      user => user.username === username
    )
  ) {
    return res.status(409).json({
      error: "Esse usuário já existe."
    });
  }

  const h = makeHash(password);

  // Chen sempre será prefeito
  const role =
    username === "chen"
      ? "mayor"
      : "citizen";

  // Se não existir prefeito, a primeira conta também será prefeito
  const hasMayor = data.users.some(
    user => user.role === "mayor"
  );

  const user = {
    id: Date.now(),
    name,
    username,
    ...h,

    role: hasMayor
      ? role
      : "mayor",

    xp: 0,
    level: 1,

    money: 500,
    reputation: 50,

    job: "Entregador",

    mission: {
      date: today(),
      type: "deliver",
      progress: 0,
      target: 3,
      completed: false
    }
  };

  // Se for Chen, garante que nenhum outro usuário continue prefeito
  if (username === "chen") {
    data.users.forEach(u => {
      u.role = "citizen";
    });

    user.role = "mayor";
  }

  data.users.push(user);
  data.city.population++;

  write(data);

  login(user, res);
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", (req, res) => {
  const data = read();

  const username = (req.body.username || "")
    .trim()
    .toLowerCase();

  const password = req.body.password || "";

  const user = data.users.find(
    u => u.username === username
  );

  if (!user || !valid(password, user)) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  // Chen sempre é prefeito
  if (user.username === "chen") {
    user.role = "mayor";
    write(data);
  }

  createDailyMission(user);
  write(data);

  login(user, res);
});

// ======================================================
// LOGOUT
// ======================================================

app.post("/api/logout", auth, (req, res) => {
  sessions.delete(req.cookies.sid);

  res.clearCookie("sid");

  res.json({
    ok: true
  });
});

// ======================================================
// ESTADO DO JOGO
// ======================================================

app.get("/api/state", auth, (req, res) => {
  const data = read();

  const user = data.users.find(
    u => u.id === req.user.id
  );

  createDailyMission(user);

  write(data);

  res.json({
    user: safe(user),
    city: data.city,
    news: data.news,
    proposals: data.proposals,
    events: data.events
  });
});

// ======================================================
// LISTAR TRABALHOS
// ======================================================

app.get("/api/jobs", auth, (req, res) => {
  const result = {};

  for (const [name, job] of Object.entries(jobs)) {
    result[name] = {
      ...job,
      unlocked:
        req.user.xp >= job.xpRequired,
      current:
        req.user.job === name
    };
  }

  res.json(result);
});

// ======================================================
// ESCOLHER TRABALHO
// ======================================================

app.post("/api/job", auth, (req, res) => {
  const data = read();

  const user = data.users.find(
    u => u.id === req.user.id
  );

  const jobName = req.body.job;
  const job = jobs[jobName];

  if (!job) {
    return res.status(400).json({
      error: "Esse trabalho não existe."
    });
  }

  if (user.xp < job.xpRequired) {
    return res.status(400).json({
      error:
        "Você ainda não possui XP suficiente para esse trabalho."
    });
  }

  user.job = jobName;

  // Ao trocar de trabalho, cria uma nova missão
  user.mission = {
    date: today(),
    type: job.type,
    progress: 0,
    target: job.target,
    completed: false
  };

  write(data);

  res.json({
    ok: true,
    user: safe(user)
  });
});

// ======================================================
// VER MISSÃO
// ======================================================

app.get("/api/mission", auth, (req, res) => {
  const data = read();

  const user = data.users.find(
    u => u.id === req.user.id
  );

  createDailyMission(user);
  write(data);

  const job = jobs[user.job] || jobs.Entregador;

  res.json({
    title: job.mission,
    job: user.job,
    progress: user.mission.progress,
    target: user.mission.target,
    xp: 50 + user.level * 5,
    money: job.reward,
    done: user.mission.completed
  });
});

// ======================================================
// REALIZAR AÇÃO DO TRABALHO
// ======================================================

app.post("/api/mission/action", auth, (req, res) => {
  const data = read();

  const user = data.users.find(
    u => u.id === req.user.id
  );

  createDailyMission(user);

  const job = jobs[user.job] || jobs.Entregador;

  if (user.mission.completed) {
    return res.status(400).json({
      error: "A missão de hoje já foi concluída."
    });
  }

  // Aumenta o progresso
  user.mission.progress++;

  // Limita ao objetivo
  if (
    user.mission.progress >
    user.mission.target
  ) {
    user.mission.progress =
      user.mission.target;
  }

  // Ainda não terminou
  if (
    user.mission.progress <
    user.mission.target
  ) {
    write(data);

    return res.json({
      ok: true,
      completed: false,
      progress: user.mission.progress,
      target: user.mission.target,
      message:
        `Progresso: ${user.mission.progress}/${user.mission.target}`
    });
  }

  // ====================================================
  // MISSÃO CONCLUÍDA
  // ====================================================

  user.mission.completed = true;

  const xpReward = 50 + user.level * 5;
  const moneyReward = job.reward;

  user.xp += xpReward;
  user.money += moneyReward;

  user.reputation = Math.min(
    100,
    user.reputation + 1
  );

  updateLevel(user);

  data.city.gdp +=
    moneyReward * 10;

  data.city.treasury +=
    Math.round(moneyReward * 0.1);

  data.transactions.push({
    date: today(),
    user: user.username,
    type: `Missão - ${user.job}`,
    value: moneyReward
  });

  write(data);

  res.json({
    ok: true,
    completed: true,
    progress: user.mission.progress,
    target: user.mission.target,
    xp: xpReward,
    money: moneyReward,
    level: user.level,
    message:
      "🎉 Missão concluída! Você recebeu XP e dinheiro."
  });
});

// ======================================================
// PROPOSTAS
// ======================================================

app.post("/api/proposals", auth, (req, res) => {
  const data = read();

  const text = (req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({
      error: "Escreva uma proposta."
    });
  }

  data.proposals.unshift({
    id: Date.now(),
    author: req.user.username,
    text,
    status: "Pendente",
    date: new Date().toLocaleDateString("pt-BR")
  });

  write(data);

  res.json({
    ok: true
  });
});

// ======================================================
// PREFEITO APROVA/RECUSA PROPOSTA
// ======================================================

app.post(
  "/api/proposals/:id",
  auth,
  mayor,
  (req, res) => {
    const data = read();

    const proposal = data.proposals.find(
      p => p.id == req.params.id
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

    write(data);

    res.json({
      ok: true
    });
  }
);

// ======================================================
// NOTÍCIAS
// ======================================================

app.post("/api/news", auth, mayor, (req, res) => {
  const data = read();

  const title =
    (req.body.title || "").trim();

  const text =
    (req.body.text || "").trim();

  if (!title || !text) {
    return res.status(400).json({
      error:
        "Título e texto são obrigatórios."
    });
  }

  data.news.unshift({
    id: Date.now(),
    title,
    text,
    category:
      req.body.category ||
      "Comunicado",
    image:
      req.body.image || "",
    author: req.user.name,
    date:
      new Date().toLocaleDateString(
        "pt-BR"
      )
  });

  write(data);

  res.json({
    ok: true
  });
});

// ======================================================
// EVENTOS
// ======================================================

app.post("/api/event", auth, mayor, (req, res) => {
  const data = read();

  const title =
    (req.body.title || "").trim();

  const text =
    (req.body.text || "").trim();

  if (!title || !text) {
    return res.status(400).json({
      error: "Preencha os campos."
    });
  }

  data.events.unshift({
    id: Date.now(),
    title,
    text,
    date:
      new Date().toLocaleDateString(
        "pt-BR"
      )
  });

  write(data);

  res.json({
    ok: true
  });
});

// ======================================================
// IMPOSTOS
// ======================================================

app.post("/api/tax", auth, mayor, (req, res) => {
  const data = read();

  const tax = Number(req.body.tax);

  if (
    !Number.isFinite(tax) ||
    tax < 0 ||
    tax > 30
  ) {
    return res.status(400).json({
      error: "Use um imposto entre 0% e 30%."
    });
  }

  data.city.tax = tax;

  data.city.treasury += Math.round(
    data.city.population *
      tax *
      2
  );

  data.city.quality = Math.max(
    0,
    Math.min(
      100,
      70 + Math.round((10 - tax) * 2)
    )
  );

  write(data);

  res.json({
    ok: true,
    city: data.city
  });
});

// ======================================================
// ROTA PRINCIPAL
// ======================================================

// IMPORTANTE:
// Não usamos app.get("*") porque versões novas
// do Express podem gerar:
// PathError: Missing parameter name at index 1: *

app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    req.path.startsWith("/api/")
  ) {
    return res.status(404).json({
      error: "API não encontrada."
    });
  }

  const indexPath = path.join(
    __dirname,
    "public",
    "index.html"
  );

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.status(404).send(
    "Sorokiba: public/index.html não encontrado."
  );
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(PORT, () => {
  console.log(
    `Sorokiba rodando na porta ${PORT}`
  );
});
