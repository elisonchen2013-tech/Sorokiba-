const express = require("express");
const cookie = require("cookie-parser");
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

function read() {
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function write(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

const sessions = new Map();

app.use(express.json());
app.use(cookie());
app.use(express.static(path.join(__dirname, "public")));

function makeHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  return {
    salt,
    hash: crypto
      .scryptSync(password, salt, 64)
      .toString("hex")
  };
}

function validPassword(password, user) {
  const hash = crypto.scryptSync(password, user.salt, 64);

  return crypto.timingSafeEqual(
    hash,
    Buffer.from(user.hash, "hex")
  );
}

function safeUser(user) {
  const { salt, hash, ...safe } = user;
  return safe;
}

function authenticate(req, res, next) {
  const data = read();

  const username = sessions.get(req.cookies.sid);

  const user = data.users.find(
    u => u.username === username
  );

  if (!user) {
    return res.status(401).json({
      error: "Faça login."
    });
  }

  req.user = user;
  next();
}

function mayorOnly(req, res, next) {
  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Área exclusiva do prefeito."
    });
  }

  next();
}

function createLogin(user, res) {
  const sid = crypto.randomBytes(32).toString("hex");

  sessions.set(sid, user.username);

  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 604800000
  });

  res.json({
    user: safeUser(user)
  });
}

/* =========================
   CADASTRO
========================= */

app.post("/api/register", (req, res) => {
  const data = read();

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
      error:
        "Preencha nome, usuário e senha com pelo menos 6 caracteres."
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

  const passwordData = makeHash(password);

  const user = {
    id: Date.now(),
    name,
    username,

    ...passwordData,

    role:
      username === "chen"
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

  write(data);

  createLogin(user, res);
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {
  const data = read();

  const username = String(
    req.body.username || ""
  ).trim().toLowerCase();

  const password = String(
    req.body.password || ""
  );

  const user = data.users.find(
    u => u.username === username
  );

  if (
    !user ||
    !validPassword(password, user)
  ) {
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
  authenticate,
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
  authenticate,
  (req, res) => {
    const data = read();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    res.json({
      user: safeUser(user),
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
  Entregador: [
    0,
    40,
    "Entregar 3 encomendas"
  ],

  Jornalista: [
    100,
    55,
    "Publicar a reportagem do dia"
  ],

  Comerciante: [
    250,
    65,
    "Realizar 5 vendas"
  ],

  Investigador: [
    500,
    80,
    "Resolver o caso diário"
  ],

  Engenheiro: [
    1000,
    100,
    "Planejar uma melhoria urbana"
  ],

  Empresário: [
    2000,
    130,
    "Criar um plano econômico"
  ]
};

app.get(
  "/api/jobs",
  authenticate,
  (req, res) => {
    res.json(jobs);
  }
);

app.post(
  "/api/job",
  authenticate,
  (req, res) => {
    const data = read();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    const job = req.body.job;

    if (!jobs[job]) {
      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    if (user.xp < jobs[job][0]) {
      return res.status(400).json({
        error:
          "Você ainda não desbloqueou esse emprego."
      });
    }

    user.job = job;

    write(data);

    res.json({
      ok: true
    });
  }
);

/* =========================
   MISSÃO
========================= */

app.get(
  "/api/mission",
  authenticate,
  (req, res) => {
    const data = read();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    const job = jobs[user.job];

    const day = new Date()
      .toISOString()
      .slice(0, 10);

    res.json({
      title: job[2],
      xp: 50 + user.level * 5,
      money: job[1],
      done: user.lastMission === day
    });
  }
);

app.post(
  "/api/mission",
  authenticate,
  (req, res) => {
    const data = read();

    const user = data.users.find(
      u => u.id === req.user.id
    );

    const job = jobs[user.job];

    const day = new Date()
      .toISOString()
      .slice(0, 10);

    if (user.lastMission === day) {
      return res.status(400).json({
        error:
          "Missão de hoje já concluída."
      });
    }

    const xp = 50 + user.level * 5;

    user.lastMission = day;

    user.xp += xp;

    user.money += job[1];

    user.level =
      1 + Math.floor(user.xp / 500);

    user.reputation = Math.min(
      100,
      user.reputation + 1
    );

    data.city.gdp += job[1] * 10;

    data.city.treasury += Math.round(
      job[1] * 0.1
    );

    data.transactions.push({
      date: day,
      user: user.username,
      type: "Missão",
      value: job[1]
    });

    write(data);

    res.json({
      ok: true,
      xp,
      money: job[1]
    });
  }
);

/* =========================
   PROPOSTAS
========================= */

app.post(
  "/api/proposals",
  authenticate,
  (req, res) => {
    const data = read();

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

    write(data);

    res.json({
      ok: true
    });
  }
);

/* =========================
   PREFEITO - PROPOSTAS
========================= */

app.post(
  "/api/proposals/:id",
  authenticate,
  mayorOnly,
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

/* =========================
   PREFEITO - NOTÍCIAS
========================= */

app.post(
  "/api/news",
  authenticate,
  mayorOnly,
  (req, res) => {
    const data = read();

    const title = String(
      req.body.title || ""
    ).trim();

    const text = String(
      req.body.text || ""
    ).trim();

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
      date: new Date().toLocaleDateString(
        "pt-BR"
      )
    });

    write(data);

    res.json({
      ok: true
    });
  }
);

/* =========================
   PREFEITO - EVENTOS
========================= */

app.post(
  "/api/event",
  authenticate,
  mayorOnly,
  (req, res) => {
    const data = read();

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

    write(data);

    res.json({
      ok: true
    });
  }
);

/* =========================
   PREFEITO - IMPOSTOS
========================= */

app.post(
  "/api/tax",
  authenticate,
  mayorOnly,
  (req, res) => {
    const data = read();

    const tax = Number(req.body.tax);

    if (
      !Number.isFinite(tax) ||
      tax < 0 ||
      tax > 30
    ) {
      return res.status(400).json({
        error: "Use um valor de 0% a 30%."
      });
    }

    data.city.tax = tax;

    data.city.treasury += Math.round(
      data.city.population * tax * 2
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
      ok: true
    });
  }
);

/* =========================
   PÁGINA DO JOGO
========================= */

app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

/* =========================
   SERVIDOR
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Sorokiba rodando na porta ${PORT}`
  );
});
