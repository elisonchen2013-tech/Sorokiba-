const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const DB_FILE = path.join(__dirname, "data.json");

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const CONFIG = {
  missionCooldownMs: 60 * 60 * 1000, // 1 hora
  maxMissionsPerDay: 2,

  startingMoney: 500,
  startingHealth: 100,
  startingHunger: 100,
  startingReputation: 50,
  startingLevel: 1
};

/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

/* =========================================================
   BANCO PADRÃO
========================================================= */

const DEFAULT_DB = {
  users: [],
  news: [],
  proposals: [],
  events: [],
  transactions: [],

  city: {
    name: "Sorokiba",
    population: 0,
    gdp: 100000,
    territory: 10,
    treasury: 1000,
    infrastructure: 50,
    quality: 70,
    tax: 5,
    createdAt: new Date().toISOString()
  },

  settings: {
    missionCooldownHours: 1,
    maxMissionsPerDay: 2,
    startingMoney: 500,
    startingHealth: 100,
    startingHunger: 100,
    startingReputation: 50,
    startingLevel: 1
  },

  statistics: {
    totalAccountsCreated: 0,
    totalMissionsCompleted: 0,
    totalMoneyEarned: 0,
    totalMoneySpent: 0,
    totalFoodPurchased: 0,
    totalNewsPublished: 0,
    totalProposalsCreated: 0,
    totalEventsCreated: 0
  }
};

/* =========================================================
   BANCO DE DADOS
========================================================= */

function cloneDefaultDB() {
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function ensureDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(DEFAULT_DB, null, 2),
      "utf8"
    );

    console.log("data.json criado.");
  }
}

function readDB() {
  ensureDatabase();

  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");

    if (!raw.trim()) {
      const fresh = cloneDefaultDB();
      saveDB(fresh);
      return fresh;
    }

    const data = JSON.parse(raw);

    const db = {
      ...cloneDefaultDB(),
      ...data,

      city: {
        ...DEFAULT_DB.city,
        ...(data.city || {})
      },

      settings: {
        ...DEFAULT_DB.settings,
        ...(data.settings || {})
      },

      statistics: {
        ...DEFAULT_DB.statistics,
        ...(data.statistics || {})
      },

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
        : []
    };

    migrateDatabase(db);

    return db;

  } catch (error) {

    console.error(
      "Erro ao ler data.json:",
      error
    );

    const backupName =
      `data-error-${Date.now()}.json`;

    try {
      fs.copyFileSync(
        DB_FILE,
        path.join(__dirname, backupName)
      );

      console.log(
        `Backup criado: ${backupName}`
      );

    } catch (backupError) {
      console.error(
        "Não foi possível criar backup:",
        backupError
      );
    }

    const fresh = cloneDefaultDB();

    saveDB(fresh);

    return fresh;
  }
}

function saveDB(db) {
  try {

    const tempFile =
      DB_FILE + ".tmp";

    fs.writeFileSync(
      tempFile,
      JSON.stringify(db, null, 2),
      "utf8"
    );

    fs.renameSync(
      tempFile,
      DB_FILE
    );

  } catch (error) {

    console.error(
      "Erro salvando data.json:",
      error
    );

    throw error;
  }
}

/* =========================================================
   MIGRAÇÃO
========================================================= */

function migrateDatabase(db) {

  let changed = false;

  for (const user of db.users) {

    if (!user.id) {
      user.id = newId();
      changed = true;
    }

    if (typeof user.xp !== "number") {
      user.xp = 0;
      changed = true;
    }

    if (typeof user.level !== "number") {
      user.level =
        1 +
        Math.floor(user.xp / 500);

      changed = true;
    }

    if (typeof user.money !== "number") {
      user.money =
        CONFIG.startingMoney;

      changed = true;
    }

    if (typeof user.reputation !== "number") {
      user.reputation =
        CONFIG.startingReputation;

      changed = true;
    }

    if (!user.job) {
      user.job = "Entregador";
      changed = true;
    }

    if (typeof user.hunger !== "number") {
      user.hunger =
        CONFIG.startingHunger;

      changed = true;
    }

    if (typeof user.health !== "number") {
      user.health =
        CONFIG.startingHealth;

      changed = true;
    }

    if (!Array.isArray(user.inventory)) {
      user.inventory = [];
      changed = true;
    }

    if (!user.missions ||
        typeof user.missions !== "object") {

      user.missions = {};
      changed = true;
    }

    if (!Array.isArray(user.missionHistory)) {
      user.missionHistory = [];
      changed = true;
    }

    if (typeof user.nextMissionAt !== "number") {
      user.nextMissionAt = 0;
      changed = true;
    }

    if (!user.lastHungerUpdate) {
      user.lastHungerUpdate =
        Date.now();

      changed = true;
    }
  }

  /*
    Se existir uma conta chamada chen
    e ninguém for prefeito, Chen vira prefeito.
  */

  const mayorExists =
    db.users.some(
      user => user.role === "mayor"
    );

  if (!mayorExists && db.users.length > 0) {

    const chen =
      db.users.find(
        user =>
          String(user.username)
            .toLowerCase() === "chen"
      );

    if (chen) {

      chen.role = "mayor";

      changed = true;

      console.log(
        "Conta chen definida como prefeito."
      );
    }
  }

  /*
    Se não existir prefeito e houver apenas
    uma conta, ela vira prefeito.
  */

  const stillNoMayor =
    !db.users.some(
      user => user.role === "mayor"
    );

  if (
    stillNoMayor &&
    db.users.length === 1
  ) {

    db.users[0].role = "mayor";

    changed = true;

    console.log(
      "Primeira conta definida como prefeito."
    );
  }

  /*
    Corrigir população.
  */

  if (
    db.city.population !==
    db.users.length
  ) {

    db.city.population =
      db.users.length;

    changed = true;
  }

  if (changed) {
    saveDB(db);
  }
}

/* =========================================================
   SESSÕES
========================================================= */

const sessions = new Map();

function createSession(username) {

  const sessionId =
    crypto.randomBytes(32).toString("hex");

  sessions.set(
    sessionId,
    {
      username,
      createdAt: Date.now()
    }
  );

  return sessionId;
}

function getSession(req) {

  const sid =
    req.cookies.sid;

  if (!sid) {
    return null;
  }

  return sessions.get(sid) || null;
}

/* =========================================================
   SENHAS
========================================================= */

function createPasswordHash(password) {

  const salt =
    crypto.randomBytes(16).toString("hex");

  const hash =
    crypto
      .scryptSync(
        password,
        salt,
        64
      )
      .toString("hex");

  return {
    salt,
    hash
  };
}

function checkPassword(password, user) {

  try {

    if (!user.salt || !user.hash) {
      return false;
    }

    const calculated =
      crypto.scryptSync(
        password,
        user.salt,
        64
      );

    const stored =
      Buffer.from(
        user.hash,
        "hex"
      );

    if (
      calculated.length !==
      stored.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      calculated,
      stored
    );

  } catch {

    return false;
  }
}

/* =========================================================
   USUÁRIO PÚBLICO
========================================================= */

function publicUser(user) {

  if (!user) {
    return null;
  }

  const safe = {
    ...user
  };

  delete safe.password;
  delete safe.hash;
  delete safe.salt;

  return safe;
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function requireLogin(req, res, next) {

  const session =
    getSession(req);

  if (!session) {

    return res.status(401).json({
      error:
        "Você precisa fazer login."
    });
  }

  const db =
    readDB();

  const user =
    db.users.find(
      item =>
        item.username ===
        session.username
    );

  if (!user) {

    sessions.delete(
      req.cookies.sid
    );

    return res.status(401).json({
      error:
        "Conta não encontrada."
    });
  }

  updateHunger(user);

  req.user = user;
  req.db = db;

  next();
}

function requireMayor(req, res, next) {

  if (
    !req.user ||
    req.user.role !== "mayor"
  ) {

    return res.status(403).json({
      error:
        "Somente o prefeito pode fazer isso."
    });
  }

  next();
}

/* =========================================================
   LOGIN
========================================================= */

function loginUser(user, res) {

  const sid =
    createSession(
      user.username
    );

  res.cookie(
    "sid",
    sid,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      maxAge:
        7 * 24 * 60 * 60 * 1000
    }
  );

  res.json({
    ok: true,
    user:
      publicUser(user)
  });
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function newId() {

  return (
    Date.now().toString(36) +
    "-" +
    crypto
      .randomBytes(8)
      .toString("hex")
  );
}

function todayKey() {

  const now =
    new Date();

  return [
    now.getFullYear(),
    String(
      now.getMonth() + 1
    ).padStart(2, "0"),
    String(
      now.getDate()
    ).padStart(2, "0")
  ].join("-");
}

function addTransaction(
  db,
  transaction
) {

  db.transactions.unshift({
    id: newId(),
    date:
      new Date().toISOString(),
    ...transaction
  });

  if (
    db.transactions.length >
    500
  ) {
    db.transactions =
      db.transactions.slice(0, 500);
  }
}

/* =========================================================
   FOME E SAÚDE
========================================================= */

function updateHunger(user) {

  if (
    typeof user.hunger !==
    "number"
  ) {
    user.hunger =
      CONFIG.startingHunger;
  }

  if (
    typeof user.health !==
    "number"
  ) {
    user.health =
      CONFIG.startingHealth;
  }

  if (
    typeof user.lastHungerUpdate !==
    "number"
  ) {
    user.lastHungerUpdate =
      Date.now();

    return;
  }

  const now =
    Date.now();

  const elapsed =
    now -
    user.lastHungerUpdate;

  /*
    A cada 30 minutos:
    -1 fome.
  */

  const periods =
    Math.floor(
      elapsed /
      (30 * 60 * 1000)
    );

  if (periods <= 0) {
    return;
  }

  user.hunger =
    Math.max(
      0,
      user.hunger - periods
    );

  /*
    Se a fome chegar a 0,
    a saúde começa a cair.
  */

  if (user.hunger === 0) {

    user.health =
      Math.max(
        10,
        user.health - periods
      );
  }

  user.lastHungerUpdate =
    now;
}

/* =========================================================
   TRABALHOS
========================================================= */

const JOBS = {

  Entregador: {
    xp: 0,
    money: 40,
    description:
      "Entregue encomendas pela cidade."
  },

  Jornalista: {
    xp: 100,
    money: 55,
    description:
      "Produza notícias e investigue acontecimentos."
  },

  Comerciante: {
    xp: 250,
    money: 65,
    description:
      "Trabalhe no comércio de Sorokiba."
  },

  Investigador: {
    xp: 500,
    money: 80,
    description:
      "Investigue casos e acontecimentos."
  },

  Engenheiro: {
    xp: 1000,
    money: 100,
    description:
      "Ajude a construir e melhorar a cidade."
  },

  Empresário: {
    xp: 2000,
    money: 130,
    description:
      "Ajude no crescimento econômico."
  }
};

/* =========================================================
   MISSÕES
========================================================= */

const MISSIONS = {

  Entregador: [
    {
      id: "entregador_1",
      title:
        "Entregar 3 encomendas",
      description:
        "Faça três entregas para moradores.",
      xp: 50,
      money: 40
    },

    {
      id: "entregador_2",
      title:
        "Entrega urgente",
      description:
        "Faça uma entrega urgente.",
      xp: 65,
      money: 55
    }
  ],

  Jornalista: [
    {
      id: "jornalista_1",
      title:
        "Criar uma reportagem",
      description:
        "Investigue um acontecimento.",
      xp: 70,
      money: 55
    },

    {
      id: "jornalista_2",
      title:
        "Entrevistar um cidadão",
      description:
        "Faça uma entrevista.",
      xp: 80,
      money: 65
    }
  ],

  Comerciante: [
    {
      id: "comerciante_1",
      title:
        "Realizar 5 vendas",
      description:
        "Realize cinco vendas.",
      xp: 80,
      money: 70
    },

    {
      id: "comerciante_2",
      title:
        "Organizar o comércio",
      description:
        "Prepare sua loja.",
      xp: 90,
      money: 75
    }
  ],

  Investigador: [
    {
      id: "investigador_1",
      title:
        "Investigar um caso",
      description:
        "Investigue um caso.",
      xp: 100,
      money: 85
    },

    {
      id: "investigador_2",
      title:
        "Analisar evidências",
      description:
        "Analise as evidências.",
      xp: 110,
      money: 90
    }
  ],

  Engenheiro: [
    {
      id: "engenheiro_1",
      title:
        "Planejar uma melhoria",
      description:
        "Planeje uma melhoria urbana.",
      xp: 120,
      money: 100
    },

    {
      id: "engenheiro_2",
      title:
        "Inspecionar construção",
      description:
        "Faça uma inspeção.",
      xp: 130,
      money: 110
    }
  ],

  Empresário: [
    {
      id: "empresario_1",
      title:
        "Criar plano econômico",
      description:
        "Crie um plano econômico.",
      xp: 150,
      money: 130
    },

    {
      id: "empresario_2",
      title:
        "Planejar novo negócio",
      description:
        "Planeje um novo empreendimento.",
      xp: 170,
      money: 150
    }
  ]
};

/* =========================================================
   MISSÕES DO USUÁRIO
========================================================= */

function getTodayMissions(user) {

  const today =
    todayKey();

  if (!user.missions) {
    user.missions = {};
  }

  if (
    !Array.isArray(
      user.missions[today]
    )
  ) {

    user.missions[today] = [];
  }

  const job =
    user.job || "Entregador";

  const list =
    MISSIONS[job] ||
    MISSIONS.Entregador;

  return list.map(
    (mission, index) => {

      const completed =
        user.missions[today]
          .includes(
            mission.id
          );

      return {
        id: mission.id,
        number: index + 1,
        title: mission.title,
        description:
          mission.description,
        xp: mission.xp,
        money: mission.money,
        completed
      };
    }
  );
}

function missionsCompletedToday(user) {

  const today =
    todayKey();

  if (
    !user.missions ||
    !Array.isArray(
      user.missions[today]
    )
  ) {
    return 0;
  }

  return user.missions[today].length;
}

/* =========================================================
   REGISTRO
========================================================= */

app.post(
  "/api/register",
  (req, res) => {

    const db =
      readDB();

    const name =
      String(
        req.body.name || ""
      ).trim();

    const username =
      String(
        req.body.username || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        req.body.password || ""
      );

    if (name.length < 2) {

      return res.status(400).json({
        error:
          "Digite seu nome."
      });
    }

    if (
      username.length < 3 ||
      username.length > 30
    ) {

      return res.status(400).json({
        error:
          "O usuário precisa ter entre 3 e 30 caracteres."
      });
    }

    if (!/^[a-z0-9_.-]+$/.test(username)) {

      return res.status(400).json({
        error:
          "O usuário só pode usar letras, números, ponto, hífen e underline."
      });
    }

    if (password.length < 6) {

      return res.status(400).json({
        error:
          "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const exists =
      db.users.some(
        user =>
          user.username ===
          username
      );

    if (exists) {

      return res.status(409).json({
        error:
          "Esse usuário já existe."
      });
    }

    const passwordData =
      createPasswordHash(
        password
      );

    /*
      PRIMEIRA CONTA:
      PREFEITO.

      Se o usuário se chamar CHEN
      e ainda não houver prefeito,
      também será prefeito.
    */

    const hasMayor =
      db.users.some(
        user =>
          user.role === "mayor"
      );

    const isChen =
      username === "chen";

    const role =
      !hasMayor &&
      (
        db.users.length === 0 ||
        isChen
      )
        ? "mayor"
        : "citizen";

    const user = {

      id: newId(),

      name,

      username,

      salt:
        passwordData.salt,

      hash:
        passwordData.hash,

      role,

      xp: 0,

      level:
        CONFIG.startingLevel,

      money:
        CONFIG.startingMoney,

      reputation:
        CONFIG.startingReputation,

      job: "Entregador",

      hunger:
        CONFIG.startingHunger,

      health:
        CONFIG.startingHealth,

      inventory: [],

      missions: {},

      missionHistory: [],

      nextMissionAt: 0,

      lastHungerUpdate:
        Date.now(),

      createdAt:
        new Date().toISOString()
    };

    db.users.push(user);

    db.city.population =
      db.users.length;

    db.statistics.totalAccountsCreated++;

    addTransaction(
      db,
      {
        user:
          username,

        type:
          "Conta criada",

        value:
          0
      }
    );

    saveDB(db);

    console.log(
      `Nova conta: ${username} | Cargo: ${role}`
    );

    loginUser(
      user,
      res
    );
  }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  (req, res) => {

    const db =
      readDB();

    const username =
      String(
        req.body.username || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        req.body.password || ""
      );

    const user =
      db.users.find(
        item =>
          item.username ===
          username
      );

    if (!user) {

      return res.status(401).json({
        error:
          "Usuário ou senha incorretos."
      });
    }

    if (
      !checkPassword(
        password,
        user
      )
    ) {

      return res.status(401).json({
        error:
          "Usuário ou senha incorretos."
      });
    }

    updateHunger(user);

    saveDB(db);

    loginUser(
      user,
      res
    );
  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  requireLogin,
  (req, res) => {

    const sid =
      req.cookies.sid;

    sessions.delete(sid);

    res.clearCookie("sid");

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   ESTADO COMPLETO
========================================================= */

app.get(
  "/api/state",
  requireLogin,
  (req, res) => {

    updateHunger(
      req.user
    );

    const missions =
      getTodayMissions(
        req.user
      );

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      user:
        publicUser(
          req.user
        ),

      city:
        req.db.city,

      news:
        req.db.news,

      proposals:
        req.db.proposals,

      events:
        req.db.events,

      missions,

      missionsCompleted:
        missionsCompletedToday(
          req.user
        ),

      nextMissionAt:
        req.user.nextMissionAt || 0
    });
  }
);

/* =========================================================
   EMPREGOS
========================================================= */

app.get(
  "/api/jobs",
  requireLogin,
  (req, res) => {

    const result = {};

    for (
      const name in JOBS
    ) {

      const job =
        JOBS[name];

      /*
        Os índices 0,1,2 existem
        para compatibilidade com
        seu index.html antigo.
      */

      result[name] = {
        0: job.xp,
        1: job.money,
        2: job.description,

        xp: job.xp,
        money: job.money,
        description:
          job.description,

        unlocked:
          req.user.xp >=
          job.xp,

        current:
          req.user.job ===
          name
      };
    }

    res.json(result);
  }
);

/* =========================================================
   ESCOLHER EMPREGO
========================================================= */

app.post(
  "/api/job",
  requireLogin,
  (req, res) => {

    const jobName =
      String(
        req.body.job || ""
      );

    const job =
      JOBS[jobName];

    if (!job) {

      return res.status(400).json({
        error:
          "Esse emprego não existe."
      });
    }

    if (
      req.user.xp <
      job.xp
    ) {

      return res.status(400).json({
        error:
          `Você precisa de ${job.xp} XP para desbloquear ${jobName}.`
      });
    }

    req.user.job =
      jobName;

    addTransaction(
      req.db,
      {
        user:
          req.user.username,

        type:
          "Emprego alterado",

        job:
          jobName,

        value:
          0
      }
    );

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      message:
        `Você agora trabalha como ${jobName}.`,

      user:
        publicUser(
          req.user
        )
    });
  }
);

/* =========================================================
   VER MISSÕES
========================================================= */

app.get(
  "/api/mission",
  requireLogin,
  (req, res) => {

    const missions =
      getTodayMissions(
        req.user
      );

    const completed =
      missionsCompletedToday(
        req.user
      );

    const now =
      Date.now();

    const nextMissionAt =
      req.user.nextMissionAt ||
      0;

    /*
      Compatibilidade com seu
      index.html antigo:
      ele espera title/xp/money/done.
    */

    const current =
      missions.find(
        mission =>
          !mission.completed
      );

    res.json({

      ok: true,

      missions,

      completed,

      max:
        CONFIG.maxMissionsPerDay,

      nextMissionAt,

      cooldownActive:
        now <
        nextMissionAt,

      title:
        current
          ? current.title
          : "Missões concluídas",

      description:
        current
          ? current.description
          : "Você já completou suas missões disponíveis.",

      xp:
        current
          ? current.xp
          : 0,

      money:
        current
          ? current.money
          : 0,

      done:
        !current ||
        now <
        nextMissionAt
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

    const now =
      Date.now();

    /*
      Verificar cronômetro.
    */

    if (
      req.user.nextMissionAt &&
      now <
      req.user.nextMissionAt
    ) {

      const remaining =
        req.user.nextMissionAt -
        now;

      return res.status(429).json({

        error:
          "Você precisa esperar antes de fazer outra missão.",

        nextMissionAt:
          req.user.nextMissionAt,

        remainingMs:
          remaining
      });
    }

    const completed =
      missionsCompletedToday(
        req.user
      );

    if (
      completed >=
      CONFIG.maxMissionsPerDay
    ) {

      return res.status(400).json({

        error:
          "Você já completou as 2 missões disponíveis neste período.",

        nextMissionAt:
          req.user.nextMissionAt || 0
      });
    }

    const missions =
      getTodayMissions(
        req.user
      );

    let mission = null;

    if (req.body.missionId) {

      mission =
        missions.find(
          item =>
            item.id ===
            req.body.missionId &&
            !item.completed
        );

    } else {

      mission =
        missions.find(
          item =>
            !item.completed
        );
    }

    if (!mission) {

      return res.status(400).json({
        error:
          "Nenhuma missão disponível."
      });
    }

    const today =
      todayKey();

    if (!req.user.missions[today]) {
      req.user.missions[today] = [];
    }

    req.user.missions[today].push(
      mission.id
    );

    req.user.missionHistory.push({

      id:
        mission.id,

      title:
        mission.title,

      xp:
        mission.xp,

      money:
        mission.money,

      completedAt:
        new Date().toISOString()
    });

    /*
      Recompensas
    */

    req.user.xp +=
      mission.xp;

    req.user.money +=
      mission.money;

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

    /*
      Cronômetro para próxima missão.
    */

    req.user.nextMissionAt =
      now +
      CONFIG.missionCooldownMs;

    /*
      Economia da cidade.
    */

    req.db.city.gdp +=
      mission.money * 10;

    req.db.city.treasury +=
      Math.round(
        mission.money * 0.1
      );

    /*
      Estatísticas.
    */

    req.db.statistics
      .totalMissionsCompleted++;

    req.db.statistics
      .totalMoneyEarned +=
      mission.money;

    addTransaction(
      req.db,
      {
        user:
          req.user.username,

        type:
          "Missão concluída",

        mission:
          mission.title,

        xp:
          mission.xp,

        value:
          mission.money
      }
    );

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      message:
        "Missão concluída!",

      mission,

      nextMissionAt:
        req.user.nextMissionAt,

      user:
        publicUser(
          req.user
        )
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

  pao: {
    id: "pao",
    name: "Pão",
    icon: "🍞",
    price: 10,
    hunger: 10,
    health: 1
  },

  lanche: {
    id: "lanche",
    name: "Lanche",
    icon: "🥪",
    price: 15,
    hunger: 18,
    health: 2
  },

  pizza: {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    price: 35,
    hunger: 35,
    health: 3
  },

  hamburguer: {
    id: "hamburguer",
    name: "Hambúrguer",
    icon: "🍔",
    price: 50,
    hunger: 50,
    health: 4
  },

  refeicao: {
    id: "refeicao",
    name: "Refeição completa",
    icon: "🍱",
    price: 75,
    hunger: 70,
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

/* =========================================================
   MERCADO - LISTAR
========================================================= */

app.get(
  "/api/market",
  requireLogin,
  (req, res) => {

    updateHunger(
      req.user
    );

    res.json({

      ok: true,

      foods:
        FOODS,

      money:
        req.user.money,

      hunger:
        req.user.hunger,

      health:
        req.user.health
    });
  }
);

/* =========================================================
   COMPRAR COMIDA
========================================================= */

app.post(
  "/api/market/buy",
  requireLogin,
  (req, res) => {

    const foodId =
      String(
        req.body.food || ""
      );

    const food =
      FOODS[foodId];

    if (!food) {

      return res.status(400).json({
        error:
          "Comida não encontrada."
      });
    }

    updateHunger(
      req.user
    );

    if (
      req.user.money <
      food.price
    ) {

      return res.status(400).json({
        error:
          "Você não tem dinheiro suficiente."
      });
    }

    req.user.money -=
      food.price;

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

    if (
      !Array.isArray(
        req.user.inventory
      )
    ) {
      req.user.inventory = [];
    }

    req.user.inventory.push({

      id:
        newId(),

      type:
        "food",

      foodId:
        food.id,

      name:
        food.name,

      hunger:
        food.hunger,

      purchasedAt:
        new Date().toISOString()
    });

    req.db.city.treasury +=
      Math.round(
        food.price * 0.05
      );

    req.db.city.gdp +=
      food.price;

    req.db.statistics
      .totalFoodPurchased++;

    req.db.statistics
      .totalMoneySpent +=
      food.price;

    addTransaction(
      req.db,
      {
        user:
          req.user.username,

        type:
          "Mercado",

        item:
          food.name,

        value:
          food.price
      }
    );

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      message:
        `${food.name} comprado!`,

      food,

      user:
        publicUser(
          req.user
        )
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

    const text =
      String(
        req.body.text || ""
      ).trim();

    if (!text) {

      return res.status(400).json({
        error:
          "Escreva uma proposta."
      });
    }

    if (text.length > 2000) {

      return res.status(400).json({
        error:
          "A proposta é muito grande."
      });
    }

    const proposal = {

      id:
        newId(),

      author:
        req.user.username,

      authorName:
        req.user.name,

      text,

      status:
        "Pendente",

      date:
        new Date().toLocaleDateString(
          "pt-BR"
        ),

      createdAt:
        new Date().toISOString()
    };

    req.db.proposals.unshift(
      proposal
    );

    req.db.statistics
      .totalProposalsCreated++;

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      proposal
    });
  }
);

/* =========================================================
   DECIDIR PROPOSTA
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
        error:
          "Proposta não encontrada."
      });
    }

    if (
      proposal.status !==
      "Pendente"
    ) {

      return res.status(400).json({
        error:
          "Essa proposta já foi analisada."
      });
    }

    const approve =
      Boolean(
        req.body.approve
      );

    proposal.status =
      approve
        ? "Aprovada"
        : "Recusada";

    proposal.reviewedBy =
      req.user.username;

    proposal.reviewedAt =
      new Date().toISOString();

    if (approve) {

      req.user.reputation =
        Math.min(
          100,
          req.user.reputation + 1
        );

      req.db.city.quality =
        Math.min(
          100,
          req.db.city.quality + 1
        );
    }

    saveDB(
      req.db
    );

    res.json({
      ok: true,
      proposal
    });
  }
);

/* =========================================================
   NOTÍCIAS
========================================================= */

app.get(
  "/api/news",
  requireLogin,
  (req, res) => {

    res.json({
      ok: true,
      news:
        req.db.news
    });
  }
);

/* =========================================================
   PUBLICAR NOTÍCIA
========================================================= */

app.post(
  "/api/news",
  requireLogin,
  requireMayor,
  (req, res) => {

    const title =
      String(
        req.body.title || ""
      ).trim();

    const text =
      String(
        req.body.text || ""
      ).trim();

    const category =
      String(
        req.body.category ||
        "Comunicado"
      ).trim();

    const image =
      String(
        req.body.image || ""
      ).trim();

    if (!title || !text) {

      return res.status(400).json({
        error:
          "Título e texto são obrigatórios."
      });
    }

    if (
      title.length > 200
    ) {

      return res.status(400).json({
        error:
          "O título é muito grande."
      });
    }

    if (
      text.length > 10000
    ) {

      return res.status(400).json({
        error:
          "O texto é muito grande."
      });
    }

    /*
      A imagem pode ser:
      - URL
      - data:image/...
    */

    if (
      image.length >
      8_000_000
    ) {

      return res.status(400).json({
        error:
          "A imagem é muito grande."
      });
    }

    const news = {

      id:
        newId(),

      title,

      text,

      category,

      image,

      author:
        req.user.name,

      authorUsername:
        req.user.username,

      date:
        new Date().toLocaleDateString(
          "pt-BR"
        ),

      createdAt:
        new Date().toISOString()
    };

    req.db.news.unshift(
      news
    );

    req.db.statistics
      .totalNewsPublished++;

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      news
    });
  }
);

/* =========================================================
   EVENTOS
========================================================= */

app.get(
  "/api/events",
  requireLogin,
  (req, res) => {

    res.json({

      ok: true,

      events:
        req.db.events
    });
  }
);

app.post(
  "/api/event",
  requireLogin,
  requireMayor,
  (req, res) => {

    const title =
      String(
        req.body.title || ""
      ).trim();

    const text =
      String(
        req.body.text || ""
      ).trim();

    if (!title || !text) {

      return res.status(400).json({
        error:
          "Preencha título e descrição."
      });
    }

    const event = {

      id:
        newId(),

      title,

      text,

      author:
        req.user.name,

      date:
        new Date().toLocaleDateString(
          "pt-BR"
        ),

      createdAt:
        new Date().toISOString()
    };

    req.db.events.unshift(
      event
    );

    req.db.statistics
      .totalEventsCreated++;

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      event
    });
  }
);

/* =========================================================
   IMPOSTO
========================================================= */

app.get(
  "/api/tax",
  requireLogin,
  (req, res) => {

    res.json({
      ok: true,
      tax:
        req.db.city.tax
    });
  }
);

app.post(
  "/api/tax",
  requireLogin,
  requireMayor,
  (req, res) => {

    const tax =
      Number(
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

    req.db.city.tax =
      tax;

    /*
      A qualidade da cidade
      varia de acordo com o imposto.
    */

    const quality =
      70 +
      Math.round(
        (10 - tax) * 2
      );

    req.db.city.quality =
      Math.max(
        0,
        Math.min(
          100,
          quality
        )
      );

    /*
      Pequena arrecadação.
    */

    const revenue =
      Math.round(
        req.db.city.population *
        tax *
        2
      );

    req.db.city.treasury +=
      revenue;

    addTransaction(
      req.db,
      {
        user:
          req.user.username,

        type:
          "Imposto alterado",

        tax,

        value:
          revenue
      }
    );

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      message:
        "Imposto atualizado.",

      city:
        req.db.city
    });
  }
);

/* =========================================================
   CIDADE
========================================================= */

app.get(
  "/api/city",
  requireLogin,
  (req, res) => {

    res.json({

      ok: true,

      city:
        req.db.city,

      statistics:
        req.db.statistics
    });
  }
);

/* =========================================================
   INVENTÁRIO
========================================================= */

app.get(
  "/api/inventory",
  requireLogin,
  (req, res) => {

    res.json({

      ok: true,

      inventory:
        req.user.inventory || []
    });
  }
);

/* =========================================================
   PERFIL
========================================================= */

app.get(
  "/api/profile",
  requireLogin,
  (req, res) => {

    updateHunger(
      req.user
    );

    saveDB(
      req.db
    );

    res.json({

      ok: true,

      user:
        publicUser(
          req.user
        )
    });
  }
);

/* =========================================================
   ESTATÍSTICAS DA CIDADE
========================================================= */

app.get(
  "/api/statistics",
  requireLogin,
  (req, res) => {

    res.json({

      ok: true,

      statistics:
        req.db.statistics
    });
  }
);

/* =========================================================
   ROTA PRINCIPAL
========================================================= */

app.get(
  "/",
  (req, res) => {

    const indexFile =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      !fs.existsSync(indexFile)
    ) {

      return res.status(500).send(
        "Erro: public/index.html não foi encontrado."
      );
    }

    res.sendFile(
      indexFile
    );
  }
);

/* =========================================================
   ROTAS DESCONHECIDAS DA API
========================================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      error:
        "API não encontrada."
    });
  }
);

/* =========================================================
   OUTRAS PÁGINAS
========================================================= */

app.get(
  /.*/,
  (req, res) => {

    const indexFile =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      !fs.existsSync(indexFile)
    ) {

      return res.status(500).send(
        "Erro: public/index.html não foi encontrado."
      );
    }

    res.sendFile(
      indexFile
    );
  }
);

/* =========================================================
   ERROS
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "Erro interno:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Erro interno do servidor."
    });
  }
);

/* =========================================================
   INICIAR SERVIDOR
========================================================= */

ensureDatabase();

const dbAtStart =
  readDB();

console.log(
  "================================="
);

console.log(
  "🏙️ SOROKIBA"
);

console.log(
  `👥 Usuários: ${dbAtStart.users.length}`
);

console.log(
  `💰 Tesouro: ${dbAtStart.city.treasury}`
);

console.log(
  `📊 PIB: ${dbAtStart.city.gdp}`
);

console.log(
  "================================="
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Sorokiba online na porta ${PORT}`
    );
  }
);
