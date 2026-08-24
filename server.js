const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(PUBLIC, "uploads");
const DB = path.join(ROOT, "data.json");

if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

if (!fs.existsSync(DB)) {
  fs.writeFileSync(
    DB,
    JSON.stringify({
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
    }, null, 2)
  );
}

function readDB() {
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

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

const sessions = new Map();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(express.static(PUBLIC));

/* =====================================================
   UPLOAD DE IMAGENS DAS NOTÍCIAS
===================================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name =
      Date.now() +
      "-" +
      crypto.randomBytes(5).toString("hex") +
      ext;

    cb(null, name);
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Apenas imagens JPG, PNG, WEBP ou GIF."));
    }

    cb(null, true);
  }
});

/* =====================================================
   SENHAS
===================================================== */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return { salt, hash };
}

function checkPassword(password, user) {
  try {
    const hash = crypto.scryptSync(
      password,
      user.salt,
      64
    );

    return crypto.timingSafeEqual(
      hash,
      Buffer.from(user.hash, "hex")
    );
  } catch {
    return false;
  }
}

function safeUser(user) {
  const {
    salt,
    hash,
    ...safe
  } = user;

  return safe;
}

/* =====================================================
   DATA / TEMPO
===================================================== */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function now() {
  return Date.now();
}

/* =====================================================
   TRABALHOS
===================================================== */

const JOBS = {
  Entregador: {
    xpRequired: 0,
    reward: 40,
    title: "Entregador",
    mission: "Entregar 3 encomendas",
    target: 3,
    type: "delivery"
  },

  Jornalista: {
    xpRequired: 100,
    reward: 55,
    title: "Jornalista",
    mission: "Escrever 2 reportagens",
    target: 2,
    type: "report"
  },

  Comerciante: {
    xpRequired: 250,
    reward: 70,
    title: "Comerciante",
    mission: "Realizar 5 vendas",
    target: 5,
    type: "sale"
  },

  Investigador: {
    xpRequired: 500,
    reward: 85,
    title: "Investigador",
    mission: "Encontrar 3 pistas",
    target: 3,
    type: "investigation"
  },

  Engenheiro: {
    xpRequired: 1000,
    reward: 110,
    title: "Engenheiro",
    mission: "Planejar 2 melhorias",
    target: 2,
    type: "engineering"
  },

  Empresário: {
    xpRequired: 2000,
    reward: 140,
    title: "Empresário",
    mission: "Criar 3 propostas comerciais",
    target: 3,
    type: "business"
  }
};

/* =====================================================
   MERCADO
===================================================== */

const FOOD = {
  maca: {
    name: "Maçã",
    price: 5,
    hunger: 5,
    emoji: "🍎"
  },

  banana: {
    name: "Banana",
    price: 7,
    hunger: 8,
    emoji: "🍌"
  },

  sanduiche: {
    name: "Sanduíche",
    price: 15,
    hunger: 18,
    emoji: "🥪"
  },

  pizza: {
    name: "Pizza",
    price: 25,
    hunger: 30,
    emoji: "🍕"
  },

  hamburguer: {
    name: "Hambúrguer",
    price: 30,
    hunger: 40,
    emoji: "🍔"
  },

  frango: {
    name: "Frango",
    price: 40,
    hunger: 50,
    emoji: "🍗"
  },

  refeicao: {
    name: "Refeição completa",
    price: 60,
    hunger: 70,
    emoji: "🍲"
  }
};

/* =====================================================
   MISSÕES
===================================================== */

function createMissions(user) {
  const job = JOBS[user.job];

  if (!job) return;

  user.missions = {
    date: today(),

    cooldownUntil: 0,

    missions: [
      {
        id: crypto.randomUUID(),
        title: job.mission,
        progress: 0,
        target: job.target,
        completed: false,
        type: job.type
      },

      {
        id: crypto.randomUUID(),
        title: "Realizar uma atividade do seu trabalho",
        progress: 0,
        target: 1,
        completed: false,
        type: job.type
      }
    ]
  };
}

function checkMissions(user) {
  if (!user.missions) {
    createMissions(user);
    return;
  }

  if (user.missions.date !== today()) {
    if (
      user.missions.cooldownUntil === 0 ||
      Date.now() >= user.missions.cooldownUntil
    ) {
      createMissions(user);
    }
  }
}

function allMissionsCompleted(user) {
  return user.missions.missions.every(
    mission => mission.completed
  );
}

/* =====================================================
   EXPERIÊNCIA
===================================================== */

function updateLevel(user) {
  user.level =
    1 +
    Math.floor(user.xp / 500);
}

/* =====================================================
   FOME E SAÚDE
===================================================== */

function updateNeeds(user) {
  if (!user.lastNeedsUpdate) {
    user.lastNeedsUpdate = Date.now();
    return;
  }

  const elapsed =
    Date.now() -
    user.lastNeedsUpdate;

  const hours =
    elapsed / (1000 * 60 * 60);

  const hungerLoss =
    Math.floor(hours * 2);

  if (hungerLoss > 0) {
    user.hunger = Math.max(
      0,
      user.hunger - hungerLoss
    );

    if (user.hunger < 20) {
      user.health = Math.max(
        0,
        user.health - hungerLoss
      );
    }

    user.lastNeedsUpdate = Date.now();
  }
}

/* =====================================================
   AUTENTICAÇÃO
===================================================== */

function auth(req, res, next) {
  const db = readDB();

  const username =
    sessions.get(req.cookies.sid);

  const user = db.users.find(
    u => u.username === username
  );

  if (!user) {
    return res.status(401).json({
      error: "Faça login para continuar."
    });
  }

  updateNeeds(user);
  checkMissions(user);

  req.user = user;
  req.db = db;

  writeDB(db);

  next();
}

function mayor(req, res, next) {
  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Acesso exclusivo do prefeito."
    });
  }

  next();
}

function createSession(user, res) {
  const sid =
    crypto.randomBytes(32).toString("hex");

  sessions.set(
    sid,
    user.username
  );

  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    user: safeUser(user)
  });
}

/* =====================================================
   REGISTRO
===================================================== */

app.post("/api/register", (req, res) => {
  const db = readDB();

  const name =
    (req.body.name || "").trim();

  const username =
    (req.body.username || "")
      .trim()
      .toLowerCase();

  const password =
    req.body.password || "";

  if (
    name.length < 2 ||
    username.length < 3 ||
    password.length < 6
  ) {
    return res.status(400).json({
      error:
        "Nome, usuário e senha precisam ser preenchidos. A senha precisa ter pelo menos 6 caracteres."
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

  const firstAccount =
    db.users.length === 0;

  const passwordData =
    hashPassword(password);

  const user = {
    id: Date.now(),

    name,
    username,

    ...passwordData,

    // PRIMEIRA CONTA = PREFEITO
    role: firstAccount
      ? "mayor"
      : "citizen",

    // Prefeito não possui emprego
    job: firstAccount
      ? null
      : "Entregador",

    xp: 0,
    level: 1,

    money: 500,

    health: 100,
    hunger: 100,

    reputation: 50,

    inventory: {},

    missions: null,

    lastNeedsUpdate: Date.now()
  };

  if (!firstAccount) {
    createMissions(user);
  }

  db.users.push(user);

  db.city.population++;

  writeDB(db);

  createSession(user, res);
});

/* =====================================================
   LOGIN
===================================================== */

app.post("/api/login", (req, res) => {
  const db = readDB();

  const username =
    (req.body.username || "")
      .trim()
      .toLowerCase();

  const password =
    req.body.password || "";

  const user = db.users.find(
    u => u.username === username
  );

  if (
    !user ||
    !checkPassword(password, user)
  ) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  updateNeeds(user);

  if (
    user.role !== "mayor" &&
    !user.job
  ) {
    user.job = "Entregador";
  }

  if (
    user.role !== "mayor" &&
    !user.missions
  ) {
    createMissions(user);
  }

  updateLevel(user);

  writeDB(db);

  createSession(user, res);
});

/* =====================================================
   LOGOUT
===================================================== */

app.post(
  "/api/logout",
  auth,
  (req, res) => {
    sessions.delete(
      req.cookies.sid
    );

    res.clearCookie("sid");

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   ESTADO COMPLETO
===================================================== */

app.get(
  "/api/state",
  auth,
  (req, res) => {
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
  auth,
  (req, res) => {
    const result = {};

    for (
      const [name, job]
      of Object.entries(JOBS)
    ) {
      result[name] = {
        ...job,

        unlocked:
          req.user.xp >=
          job.xpRequired,

        current:
          req.user.job === name
      };
    }

    res.json(result);
  }
);

app.post(
  "/api/job",
  auth,
  (req, res) => {
    if (req.user.role === "mayor") {
      return res.status(400).json({
        error:
          "O prefeito não possui emprego."
      });
    }

    const jobName =
      req.body.job;

    const job =
      JOBS[jobName];

    if (!job) {
      return res.status(400).json({
        error: "Trabalho inválido."
      });
    }

    if (
      req.user.xp <
      job.xpRequired
    ) {
      return res.status(400).json({
        error:
          "Você ainda não possui XP suficiente."
      });
    }

    req.user.job = jobName;

    createMissions(req.user);

    writeDB(req.db);

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
  auth,
  (req, res) => {
    if (req.user.role === "mayor") {
      return res.json({
        missions: [],
        mayor: true
      });
    }

    checkMissions(req.user);

    writeDB(req.db);

    res.json({
      missions:
        req.user.missions.missions,

      cooldownUntil:
        req.user.missions.cooldownUntil,

      job: req.user.job
    });
  }
);

/*
   REALIZAR UMA AÇÃO DA MISSÃO
*/

app.post(
  "/api/missions/action",
  auth,
  (req, res) => {
    if (req.user.role === "mayor") {
      return res.status(400).json({
        error:
          "O prefeito não possui missões de trabalho."
      });
    }

    checkMissions(req.user);

    const mission =
      req.user.missions.missions.find(
        m => m.id === req.body.missionId
      );

    if (!mission) {
      return res.status(404).json({
        error: "Missão não encontrada."
      });
    }

    if (mission.completed) {
      return res.status(400).json({
        error:
          "Essa missão já foi concluída."
      });
    }

    mission.progress++;

    if (
      mission.progress >=
      mission.target
    ) {
      mission.progress =
        mission.target;

      mission.completed = true;

      req.user.xp += 50;

      req.user.money +=
        JOBS[req.user.job].reward;

      req.user.reputation =
        Math.min(
          100,
          req.user.reputation + 1
        );

      req.db.city.gdp += 500;

      req.db.city.treasury += 5;

      req.db.transactions.push({
        id: Date.now(),
        date: new Date().toLocaleDateString(
          "pt-BR"
        ),
        user: req.user.username,
        type: "Missão",
        value:
          JOBS[req.user.job].reward
      });

      updateLevel(req.user);
    }

    if (
      allMissionsCompleted(
        req.user
      )
    ) {
      req.user.missions.cooldownUntil =
        Date.now() +
        24 * 60 * 60 * 1000;
    }

    writeDB(req.db);

    res.json({
      ok: true,

      mission,

      user: safeUser(
        req.user
      ),

      allCompleted:
        allMissionsCompleted(
          req.user
        ),

      cooldownUntil:
        req.user.missions
          .cooldownUntil
    });
  }
);

/* =====================================================
   MERCADO
===================================================== */

app.get(
  "/api/market",
  auth,
  (req, res) => {
    res.json(FOOD);
  }
);

app.post(
  "/api/market/buy",
  auth,
  (req, res) => {
    const item =
      FOOD[req.body.item];

    if (!item) {
      return res.status(400).json({
        error: "Comida não encontrada."
      });
    }

    if (
      req.user.money <
      item.price
    ) {
      return res.status(400).json({
        error:
          "Você não possui dinheiro suficiente."
      });
    }

    req.user.money -=
      item.price;

    req.user.hunger =
      Math.min(
        100,
        req.user.hunger +
          item.hunger
      );

    if (!req.user.inventory) {
      req.user.inventory = {};
    }

    req.user.inventory[
      req.body.item
    ] =
      (req.user.inventory[
        req.body.item
      ] || 0) + 1;

    req.db.city.treasury +=
      Math.round(
        item.price * 0.05
      );

    writeDB(req.db);

    res.json({
      ok: true,

      message:
        `${item.name} comprado! +${item.hunger} de fome.`,

      user:
        safeUser(req.user)
    });
  }
);

/* =====================================================
   PROPOSTAS
===================================================== */

app.post(
  "/api/proposals",
  auth,
  (req, res) => {
    const text =
      (req.body.text || "")
        .trim();

    if (!text) {
      return res.status(400).json({
        error:
          "Escreva uma proposta."
      });
    }

    req.db.proposals.unshift({
      id: Date.now(),
      author:
        req.user.username,
      text,
      status: "Pendente",
      date:
        new Date().toLocaleDateString(
          "pt-BR"
        )
    });

    writeDB(req.db);

    res.json({
      ok: true
    });
  }
);

app.post(
  "/api/proposals/:id",
  auth,
  mayor,
  (req, res) => {
    const proposal =
      req.db.proposals.find(
        p =>
          p.id ==
          req.params.id
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

    writeDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   NOTÍCIAS COM IMAGEM
===================================================== */

app.post(
  "/api/news",
  auth,
  mayor,
  upload.single("image"),
  (req, res) => {
    const title =
      (req.body.title || "")
        .trim();

    const text =
      (req.body.text || "")
        .trim();

    if (!title || !text) {
      return res.status(400).json({
        error:
          "Título e texto são obrigatórios."
      });
    }

    let image = "";

    if (req.file) {
      image =
        "/uploads/" +
        req.file.filename;
    }

    req.db.news.unshift({
      id: Date.now(),

      title,

      text,

      category:
        req.body.category ||
        "Comunicado",

      image,

      author:
        req.user.name,

      date:
        new Date().toLocaleDateString(
          "pt-BR"
        )
    });

    writeDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   EVENTOS
===================================================== */

app.post(
  "/api/event",
  auth,
  mayor,
  (req, res) => {
    const title =
      (req.body.title || "")
        .trim();

    const text =
      (req.body.text || "")
        .trim();

    if (!title || !text) {
      return res.status(400).json({
        error:
          "Preencha título e texto."
      });
    }

    req.db.events.unshift({
      id: Date.now(),
      title,
      text,
      date:
        new Date().toLocaleDateString(
          "pt-BR"
        )
    });

    writeDB(req.db);

    res.json({
      ok: true
    });
  }
);

/* =====================================================
   IMPOSTOS
===================================================== */

app.post(
  "/api/tax",
  auth,
  mayor,
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

    req.db.city.treasury +=
      Math.round(
        req.db.city.population *
          tax *
          2
      );

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

    writeDB(req.db);

    res.json({
      ok: true,
      city: req.db.city
    });
  }
);

/* =====================================================
   PÁGINA PRINCIPAL
===================================================== */

app.use((req, res) => {
  if (
    req.method === "GET" &&
    req.path.startsWith("/api/")
  ) {
    return res.status(404).json({
      error:
        "Endpoint não encontrado."
    });
  }

  const index =
    path.join(
      PUBLIC,
      "index.html"
    );

  if (
    fs.existsSync(index)
  ) {
    return res.sendFile(index);
  }

  res.status(404).send(
    "Erro: public/index.html não encontrado."
  );
});

/* =====================================================
   ERROS DE UPLOAD
===================================================== */

app.use((err, req, res, next) => {
  if (
    err &&
    err.message
  ) {
    return res.status(400).json({
      error: err.message
    });
  }

  next(err);
});

/* =====================================================
   SERVIDOR
===================================================== */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sorokiba online na porta ${PORT}`
    );
  }
);
