const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 10000;

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não foi configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const sessions = new Map();

const JOBS = {
  "Estudante": {
    xp: 0,
    money: 20,
    description: "Estude e ajude no desenvolvimento da cidade.",
    task: "Estudar por 30 minutos",
    taskXP: 25,
    taskMoney: 15
  },

  "Entregador": {
    xp: 100,
    money: 50,
    description: "Faça entregas pela cidade.",
    task: "Realizar uma entrega",
    taskXP: 40,
    taskMoney: 50
  },

  "Comerciante": {
    xp: 300,
    money: 80,
    description: "Trabalhe em um comércio.",
    task: "Atender clientes",
    taskXP: 60,
    taskMoney: 80
  },

  "Policial": {
    xp: 600,
    money: 120,
    description: "Ajude a manter a cidade segura.",
    task: "Patrulhar a cidade",
    taskXP: 80,
    taskMoney: 120
  },

  "Médico": {
    xp: 1000,
    money: 180,
    description: "Cuide da saúde dos cidadãos.",
    task: "Atender um paciente",
    taskXP: 100,
    taskMoney: 180
  },

  "Engenheiro": {
    xp: 1500,
    money: 250,
    description: "Ajude a construir e melhorar Sorokiba.",
    task: "Trabalhar em uma obra",
    taskXP: 130,
    taskMoney: 250
  }
};

const FOODS = {
  "Pão": {
    price: 10,
    hunger: 15
  },

  "Hambúrguer": {
    price: 25,
    hunger: 35
  },

  "Pizza": {
    price: 40,
    hunger: 55
  },

  "Banquete": {
    price: 80,
    hunger: 100
  }
};

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDatabase() {

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',

      money INTEGER NOT NULL DEFAULT 100,
      xp INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 50,

      hunger INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100,

      job TEXT NOT NULL DEFAULT 'Estudante',

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS city (
      id INTEGER PRIMARY KEY DEFAULT 1,

      population INTEGER NOT NULL DEFAULT 0,
      gdp INTEGER NOT NULL DEFAULT 100000,
      territory INTEGER NOT NULL DEFAULT 10,
      treasury INTEGER NOT NULL DEFAULT 1000,
      infrastructure INTEGER NOT NULL DEFAULT 50,
      quality INTEGER NOT NULL DEFAULT 70,
      tax INTEGER NOT NULL DEFAULT 5
    );
  `);

  await query(`
    INSERT INTO city
      (id, population, gdp, territory, treasury, infrastructure, quality, tax)
    VALUES
      (1, 0, 100000, 10, 1000, 50, 70, 5)
    ON CONFLICT (id) DO NOTHING;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      image TEXT DEFAULT '',
      category TEXT DEFAULT 'Comunicado',
      author TEXT DEFAULT 'Prefeitura',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mission_date DATE NOT NULL,
      title TEXT NOT NULL,
      xp INTEGER NOT NULL,
      money INTEGER NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, mission_date)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      task_date DATE NOT NULL,
      job TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, task_date)
    );
  `);

  console.log("Banco de dados inicializado.");
}

function hashPassword(password) {

  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {

  try {

    const parts = stored.split(":");

    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const originalHash = parts[1];

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );

  } catch {
    return false;
  }
}

function createSession(userId) {

  const token = crypto
    .randomBytes(32)
    .toString("hex");

  sessions.set(token, userId);

  return token;
}

function getToken(req) {

  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.substring(7);
  }

  return null;
}

async function auth(req, res, next) {

  try {

    const token = getToken(req);

    if (!token || !sessions.has(token)) {
      return res.status(401).json({
        error: "Você precisa estar logado."
      });
    }

    const userId = sessions.get(token);

    const result = await query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (!result.rows.length) {

      sessions.delete(token);

      return res.status(401).json({
        error: "Usuário não encontrado."
      });
    }

    req.user = result.rows[0];
    req.token = token;

    next();

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro de autenticação."
    });
  }
}

function mayorOnly(req, res, next) {

  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Apenas o prefeito pode fazer isso."
    });
  }

  next();
}

async function calculateLevel(xp) {

  return Math.max(
    1,
    Math.floor(xp / 500) + 1
  );
}

async function updateNeeds(user) {

  const now = Date.now();
  const updated = new Date(user.updated_at).getTime();

  const hours = Math.floor(
    Math.max(0, now - updated) / 3600000
  );

  if (hours <= 0) {
    return;
  }

  const hungerLoss = hours * 3;

  const newHunger = Math.max(
    0,
    user.hunger - hungerLoss
  );

  let health = user.health;

  if (newHunger <= 20) {
    health = Math.max(
      0,
      health - hours * 2
    );
  }

  await query(
    `
      UPDATE users
      SET
        hunger = $1,
        health = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [
      newHunger,
      health,
      user.id
    ]
  );
}

async function getUser(userId) {

  const result = await query(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (!result.rows.length) {
    return null;
  }

  await updateNeeds(result.rows[0]);

  const refreshed = await query(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  return refreshed.rows[0];
}

/* =========================
   REGISTER
========================= */

app.post("/api/register", async (req, res) => {

  try {

    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (name.length < 2) {
      return res.status(400).json({
        error: "Digite um nome válido."
      });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        error: "O usuário deve ter de 3 a 20 caracteres."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const exists = await query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        error: "Esse usuário já existe."
      });
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS count FROM users`
    );

    const role =
      countResult.rows[0].count === 0
        ? "mayor"
        : "citizen";

    const passwordHash =
      hashPassword(password);

    const result = await query(
      `
        INSERT INTO users
        (
          name,
          username,
          password_hash,
          role
        )
        VALUES
        ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        name,
        username,
        passwordHash,
        role
      ]
    );

    const userId = result.rows[0].id;

    await query(`
      UPDATE city
      SET population = population + 1
      WHERE id = 1
    `);

    const token = createSession(userId);

    res.json({
      ok: true,
      token,
      role
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Não foi possível criar a conta."
    });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {

  try {

    const username = String(req.body.username || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    const result = await query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );

    if (!result.rows.length) {

      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const user = result.rows[0];

    if (!checkPassword(password, user.password_hash)) {

      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const token = createSession(user.id);

    res.json({
      ok: true,
      token
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao entrar."
    });
  }
});

/* =========================
   LOGOUT
========================= */

app.post("/api/logout", auth, (req, res) => {

  sessions.delete(req.token);

  res.json({
    ok: true
  });
});

/* =========================
   STATE
========================= */

app.get("/api/state", auth, async (req, res) => {

  try {

    const user = await getUser(req.user.id);

    const cityResult = await query(
      `SELECT * FROM city WHERE id = 1`
    );

    const newsResult = await query(`
      SELECT
        id,
        title,
        text,
        image,
        category,
        author,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS date
      FROM news
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const eventResult = await query(`
      SELECT
        id,
        title,
        text,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS date
      FROM events
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const proposalResult = await query(`
      SELECT
        id,
        author,
        text,
        status,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS date
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        money: user.money,
        xp: user.xp,
        level: await calculateLevel(user.xp),
        reputation: user.reputation,
        hunger: user.hunger,
        health: user.health,
        job: user.job
      },

      city: cityResult.rows[0],

      news: newsResult.rows,

      events: eventResult.rows,

      proposals: proposalResult.rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao carregar o jogo."
    });
  }
});

/* =========================
   JOBS
========================= */

app.get("/api/jobs", auth, (req, res) => {

  res.json(JOBS);
});

app.post("/api/job", auth, async (req, res) => {

  try {

    const job = String(req.body.job || "");

    if (!JOBS[job]) {

      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    const requiredXP = JOBS[job].xp;

    if (req.user.xp < requiredXP) {

      return res.status(400).json({
        error: `Você precisa de ${requiredXP} XP.`
      });
    }

    await query(
      `
        UPDATE users
        SET job = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [job, req.user.id]
    );

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao escolher emprego."
    });
  }
});

/* =========================
   JOB TASK
========================= */

app.get("/api/job-task", auth, async (req, res) => {

  try {

    const user = await getUser(req.user.id);
    const job = JOBS[user.job];

    if (!job) {
      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    const result = await query(
      `
        SELECT done
        FROM job_tasks
        WHERE user_id = $1
        AND task_date = CURRENT_DATE
      `,
      [user.id]
    );

    res.json({
      job: user.job,
      title: job.task,
      xp: job.taskXP,
      money: job.taskMoney,
      done: result.rows.length
        ? result.rows[0].done
        : false
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao carregar tarefa."
    });
  }
});

app.post("/api/job-task", auth, async (req, res) => {

  try {

    const user = await getUser(req.user.id);
    const job = JOBS[user.job];

    if (!job) {
      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    const existing = await query(
      `
        SELECT done
        FROM job_tasks
        WHERE user_id = $1
        AND task_date = CURRENT_DATE
      `,
      [user.id]
    );

    if (
      existing.rows.length &&
      existing.rows[0].done
    ) {

      return res.status(400).json({
        error: "Você já completou sua tarefa hoje."
      });
    }

    await query(
      `
        INSERT INTO job_tasks
        (
          user_id,
          task_date,
          job,
          done
        )
        VALUES
        (
          $1,
          CURRENT_DATE,
          $2,
          TRUE
        )
        ON CONFLICT (user_id, task_date)
        DO UPDATE SET done = TRUE
      `,
      [user.id, user.job]
    );

    await query(
      `
        UPDATE users
        SET
          xp = xp + $1,
          money = money + $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        job.taskXP,
        job.taskMoney,
        user.id
      ]
    );

    await query(`
      UPDATE city
      SET
        gdp = gdp + $1,
        treasury = treasury + $2
      WHERE id = 1
    `, [
      job.taskMoney,
      Math.floor(job.taskMoney * 0.1)
    ]);

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao completar tarefa."
    });
  }
});

/* =========================
   MISSÃO
========================= */

app.get("/api/mission", auth, async (req, res) => {

  try {

    const missions = [
      {
        title: "Ajude Sorokiba hoje",
        xp: 50,
        money: 50
      },
      {
        title: "Faça algo pelo desenvolvimento da cidade",
        xp: 75,
        money: 75
      }
    ];

    const index =
      new Date().getDate() %
      missions.length;

    const mission = missions[index];

    const result = await query(
      `
        SELECT done
        FROM missions
        WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      `,
      [req.user.id]
    );

    res.json({
      ...mission,
      done: result.rows.length
        ? result.rows[0].done
        : false
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao carregar missão."
    });
  }
});

app.post("/api/mission", auth, async (req, res) => {

  try {

    const missions = [
      {
        title: "Ajude Sorokiba hoje",
        xp: 50,
        money: 50
      },
      {
        title: "Faça algo pelo desenvolvimento da cidade",
        xp: 75,
        money: 75
      }
    ];

    const mission =
      missions[
        new Date().getDate() %
        missions.length
      ];

    const existing = await query(
      `
        SELECT done
        FROM missions
        WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      `,
      [req.user.id]
    );

    if (
      existing.rows.length &&
      existing.rows[0].done
    ) {

      return res.status(400).json({
        error: "Você já completou a missão hoje."
      });
    }

    await query(
      `
        INSERT INTO missions
        (
          user_id,
          mission_date,
          title,
          xp,
          money,
          done
        )
        VALUES
        (
          $1,
          CURRENT_DATE,
          $2,
          $3,
          $4,
          TRUE
        )
        ON CONFLICT (user_id, mission_date)
        DO UPDATE SET done = TRUE
      `,
      [
        req.user.id,
        mission.title,
        mission.xp,
        mission.money
      ]
    );

    await query(
      `
        UPDATE users
        SET
          xp = xp + $1,
          money = money + $2,
          reputation = LEAST(100, reputation + 2),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        mission.xp,
        mission.money,
        req.user.id
      ]
    );

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao completar missão."
    });
  }
});

/* =========================
   MERCADO
========================= */

app.get("/api/market", auth, (req, res) => {

  res.json(FOODS);
});

app.post("/api/buy-food", auth, async (req, res) => {

  try {

    const foodName =
      String(req.body.food || "");

    const food = FOODS[foodName];

    if (!food) {

      return res.status(400).json({
        error: "Comida não encontrada."
      });
    }

    const user = await getUser(req.user.id);

    if (user.money < food.price) {

      return res.status(400).json({
        error: "Você não tem dinheiro suficiente."
      });
    }

    const newHunger =
      Math.min(
        100,
        user.hunger + food.hunger
      );

    await query(
      `
        UPDATE users
        SET
          money = money - $1,
          hunger = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        food.price,
        newHunger,
        user.id
      ]
    );

    await query(`
      UPDATE city
      SET treasury = treasury + $1
      WHERE id = 1
    `, [
      Math.floor(food.price * 0.05)
    ]);

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao comprar comida."
    });
  }
});

/* =========================
   NOTÍCIAS
========================= */

app.post(
  "/api/news",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const title =
        String(req.body.title || "").trim();

      const text =
        String(req.body.text || "").trim();

      const image =
        String(req.body.image || "").trim();

      const category =
        String(req.body.category || "Comunicado");

      if (!title || !text) {

        return res.status(400).json({
          error: "Preencha título e texto."
        });
      }

      await query(
        `
          INSERT INTO news
          (
            title,
            text,
            image,
            category,
            author
          )
          VALUES
          ($1, $2, $3, $4, $5)
        `,
        [
          title,
          text,
          image,
          category,
          req.user.name
        ]
      );

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: "Erro ao publicar notícia."
      });
    }
  }
);

/* =========================
   EVENTOS
========================= */

app.post(
  "/api/event",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const title =
        String(req.body.title || "").trim();

      const text =
        String(req.body.text || "").trim();

      if (!title || !text) {

        return res.status(400).json({
          error: "Preencha título e descrição."
        });
      }

      await query(
        `
          INSERT INTO events
          (
            title,
            text
          )
          VALUES
          ($1, $2)
        `,
        [title, text]
      );

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: "Erro ao criar evento."
      });
    }
  }
);

/* =========================
   PROPOSTAS
========================= */

app.post("/api/proposals", auth, async (req, res) => {

  try {

    const text =
      String(req.body.text || "").trim();

    if (!text) {

      return res.status(400).json({
        error: "Escreva uma proposta."
      });
    }

    await query(
      `
        INSERT INTO proposals
        (
          user_id,
          author,
          text
        )
        VALUES
        ($1, $2, $3)
      `,
      [
        req.user.id,
        req.user.name,
        text
      ]
    );

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao enviar proposta."
    });
  }
});

app.post(
  "/api/proposals/:id",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const approve =
        req.body.approve === true;

      const status =
        approve
          ? "Aprovada"
          : "Recusada";

      const result = await query(
        `
          UPDATE proposals
          SET status = $1
          WHERE id = $2
          RETURNING *
        `,
        [
          status,
          req.params.id
        ]
      );

      if (!result.rows.length) {

        return res.status(404).json({
          error: "Proposta não encontrada."
        });
      }

      if (approve) {

        await query(`
          UPDATE city
          SET
            quality = LEAST(100, quality + 2),
            infrastructure = LEAST(100, infrastructure + 1)
          WHERE id = 1
        `);
      }

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: "Erro ao decidir proposta."
      });
    }
  }
);

/* =========================
   IMPOSTO
========================= */

app.post(
  "/api/tax",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const tax =
        Number(req.body.tax);

      if (
        !Number.isFinite(tax) ||
        tax < 0 ||
        tax > 30
      ) {

        return res.status(400).json({
          error: "Imposto deve estar entre 0 e 30."
        });
      }

      await query(
        `
          UPDATE city
          SET tax = $1
          WHERE id = 1
        `,
        [tax]
      );

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: "Erro ao atualizar imposto."
      });
    }
  }
);

/* =========================
   SAÚDE
========================= */

app.post("/api/health", auth, async (req, res) => {

  try {

    const user = await getUser(req.user.id);

    if (user.money < 50) {

      return res.status(400).json({
        error: "Você precisa de $50 para cuidar da saúde."
      });
    }

    const health =
      Math.min(100, user.health + 30);

    await query(
      `
        UPDATE users
        SET
          money = money - 50,
          health = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        health,
        user.id
      ]
    );

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao cuidar da saúde."
    });
  }
});

/* =========================
   ROTA PRINCIPAL
========================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

app.use(express.static(__dirname));

app.get("/api/healthcheck", (req, res) => {

  res.json({
    ok: true,
    game: "Sorokiba"
  });
});

/* =========================
   ERROS
========================= */

app.use((req, res) => {

  res.status(404).send("Not Found");
});

async function start() {

  try {

    await initDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `Sorokiba funcionando na porta ${PORT}`
        );
      }
    );

  } catch (error) {

    console.error(
      "Erro ao iniciar Sorokiba:"
    );

    console.error(error);

    process.exit(1);
  }
}

start();
