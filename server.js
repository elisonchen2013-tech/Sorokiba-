const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DB = path.join(__dirname, "data.json");

const initialData = {
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
    tax: 5
  }
};

if (!fs.existsSync(DB)) {
  fs.writeFileSync(DB, JSON.stringify(initialData, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

const sessions = new Map();

app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

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

function checkPassword(password, user) {
  const hash = crypto.scryptSync(password, user.salt, 64);

  return crypto.timingSafeEqual(
    hash,
    Buffer.from(user.hash, "hex")
  );
}

function publicUser(user) {
  const {
    salt,
    hash,
    ...safeUser
  } = user;

  return safeUser;
}

function requireLogin(req, res, next) {
  const data = readData();

  const username = sessions.get(req.cookies.sid);

  const user = data.users.find(
    u => u.username === username
  );

  if (!user) {
    return res.status(401).json({
      error: "Você precisa fazer login."
    });
  }

  req.user = user;

  next();
}

function requireMayor(req, res, next) {
  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Área exclusiva do prefeito."
    });
  }

  next();
}

function createLogin(user, res) {
  const sessionId = crypto
    .randomBytes(32)
    .toString("hex");

  sessions.set(sessionId, user.username);

  res.cookie("sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    user: publicUser(user)
  });
}


/* =========================
   CADASTRO
========================= */

app.post("/api/register", (req, res) => {
  const data = readData();

  const name = String(req.body.name || "").trim();

  const username = String(
    req.body.username || ""
  ).trim().toLowerCase();

  const password = String(
    req.body.password || ""
  );

  if (
    name.length < 2 ||
    username.length < 3 ||
    password.length < 6
  ) {
    return res.status(400).json({
      error: "Nome, usuário e senha são obrigatórios. A senha precisa ter pelo menos 6 caracteres."
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

  const passwordData = hashPassword(password);

  const user = {
    id: Date.now(),
    name,
    username,
    ...passwordData,

    role:
      data.users.length === 0
        ? "mayor"
        : "citizen",

    xp: 0,
    level: 1,
    money: 500,
    reputation: 50,
    job: "Entregador",
    lastMission: ""
  };

  data.users.push(user);

  data.city.population++;

  writeData(data);

  createLogin(user, res);
});


/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {
  const data = readData();

  const username = String(
    req.body.username || ""
  ).trim().toLowerCase();

  const password = String(
    req.body.password || ""
  );

  const user = data.users.find(
    u => u.username === username
  );

  if (!user || !checkPassword(password, user)) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  createLogin(user, res);
});


/* =========================
   LOGOUT
========================= */

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


/* =========================
   ESTADO DO JOGO
========================= */

app.get(
  "/api/state",
  requireLogin,
  (req, res) => {

    const data = readData();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    res.json({
      user: publicUser(user),
      city: data.city,
      news: data.news,
      proposals: data.proposals,
      events: data.events
    });
  }
);


/* =========================
   EMPREGOS
========================= */

const jobs = {
  Entregador: {
    xpRequired: 0,
    reward: 40,
    mission: "Entregar 3 encomendas"
  },

  Jornalista: {
    xpRequired: 100,
    reward: 55,
    mission: "Publicar a reportagem do dia"
  },

  Comerciante: {
    xpRequired: 250,
    reward: 65,
    mission: "Realizar 5 vendas"
  },

  Investigador: {
    xpRequired: 500,
    reward: 80,
    mission: "Resolver o caso diário"
  },

  Engenheiro: {
    xpRequired: 1000,
    reward: 100,
    mission: "Planejar uma melhoria urbana"
  },

  Empresário: {
    xpRequired: 2000,
    reward: 130,
    mission: "Criar um plano econômico"
  }
};

app.get(
  "/api/jobs",
  requireLogin,
  (req, res) => {
    res.json(jobs);
  }
);


app.post(
  "/api/job",
  requireLogin,
  (req, res) => {

    const data = readData();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    const job = req.body.job;

    if (!jobs[job]) {
      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    if (
      user.xp < jobs[job].xpRequired
    ) {
      return res.status(400).json({
        error: "Você ainda não desbloqueou esse emprego."
      });
    }

    user.job = job;

    writeData(data);

    res.json({
      ok: true
    });
  }
);


/* =========================
   MISSÃO DIÁRIA
========================= */

app.get(
  "/api/mission",
  requireLogin,
  (req, res) => {

    const data = readData();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    const job = jobs[user.job];

    const day = new Date()
      .toISOString()
      .slice(0, 10);

    res.json({
      title: job.mission,
      xp: 50 + user.level * 5,
      money: job.reward,
      done: user.lastMission === day
    });
  }
);


app.post(
  "/api/mission",
  requireLogin,
  (req, res) => {

    const data = readData();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    const job = jobs[user.job];

    const day = new Date()
      .toISOString()
      .slice(0, 10);

    if (user.lastMission === day) {
      return res.status(400).json({
        error: "Você já completou sua missão hoje."
      });
    }

    const xp = 50 + user.level * 5;

    user.lastMission = day;

    user.xp += xp;

    user.money += job.reward;

    user.level =
      1 + Math.floor(user.xp / 500);

    user.reputation =
      Math.min(100, user.reputation + 1);

    data.city.gdp += job.reward * 10;

    data.city.treasury += Math.round(
      job.reward * 0.1
    );

    data.transactions.push({
      date: day,
      user: user.username,
      type: "Missão",
      value: job.reward
    });

    writeData(data);

    res.json({
      ok: true,
      xp,
      money: job.reward
    });
  }
);


/* =========================
   PROPOSTAS
========================= */

app.post(
  "/api/proposals",
  requireLogin,
  (req, res) => {

    const data = readData();

    const text = String(
      req.body.text || ""
    ).trim();

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
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    writeData(data);

    res.json({
      ok: true
    });
  }
);


/* =========================
   APROVAR PROPOSTA
========================= */

app.post(
  "/api/proposals/:id",
  requireLogin,
  requireMayor,
  (req, res) => {

    const data = readData();

    const proposal =
      data.proposals.find(
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

    writeData(data);

    res.json({
      ok: true
    });
  }
);


/* =========================
   NOTÍCIAS
========================= */

app.post(
  "/api/news",
  requireLogin,
  requireMayor,
  (req, res) => {

    const data = readData();

    const title = String(
      req.body.title || ""
    ).trim();

    const text = String(
      req.body.text || ""
    ).trim();

    if (!title || !text) {
      return res.status(400).json({
        error: "Título e texto são obrigatórios."
      });
    }

    data.news.unshift({
      id: Date.now(),
      title,
      text,
      category:
        req.body.category ||
        "Comunicado",
      author: req.user.name,
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    writeData(data);

    res.json({
      ok: true
    });
  }
);


/* =========================
   EVENTOS
========================= */

app.post(
  "/api/event",
  requireLogin,
  requireMayor,
  (req, res) => {

    const data = readData();

    const title = String(
      req.body.title || ""
    ).trim();

    const text = String(
      req.body.text || ""
    ).trim();

    if (!title || !text) {
      return res.status(400).json({
        error: "Preencha os campos."
      });
    }

    data.events.unshift({
      id: Date.now(),
      title,
      text,
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    writeData(data);

    res.json({
      ok: true
    });
  }
);


/* =========================
   IMPOSTOS
========================= */

app.post(
  "/api/tax",
  requireLogin,
  requireMayor,
  (req, res) => {

    const data = readData();

    const tax = Number(
      req.body.tax
    );

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

    data.city.quality =
      Math.max(
        0,
        Math.min(
          100,
          70 + Math.round((10 - tax) * 2)
        )
      );

    writeData(data);

    res.json({
      ok: true
    });
  }
);


/* =========================
   RANKING
========================= */

app.get(
  "/api/ranking",
  requireLogin,
  (req, res) => {

    const data = readData();

    const ranking =
      data.users
        .map(publicUser)
        .sort(
          (a, b) => b.xp - a.xp
        )
        .slice(0, 20);

    res.json(ranking);
  }
);


/* =========================
   PÁGINA DO JOGO
========================= */

app.use((req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));


/* =========================
   INICIAR SERVIDOR
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "Sorokiba rodando na porta " + PORT
    );
  }
);
