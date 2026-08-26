
```javascript
const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5
});

const sessions = new Map();

const JOBS = {
  "Estudante": {
    requiredXP: 0,
    task: "Estudar e ajudar no desenvolvimento da cidade",
    xp: 25,
    money: 15
  },
  "Entregador": {
    requiredXP: 100,
    task: "Realizar uma entrega",
    xp: 40,
    money: 50
  },
  "Comerciante": {
    requiredXP: 300,
    task: "Atender clientes",
    xp: 60,
    money: 80
  },
  "Policial": {
    requiredXP: 600,
    task: "Patrulhar a cidade",
    xp: 80,
    money: 120
  },
  "Médico": {
    requiredXP: 1000,
    task: "Atender um paciente",
    xp: 100,
    money: 180
  },
  "Engenheiro": {
    requiredXP: 1500,
    task: "Trabalhar em uma obra",
    xp: 130,
    money: 250
  }
};

const FOODS = {
  "Pão": { price: 10, hunger: 15 },
  "Hambúrguer": { price: 25, hunger: 35 },
  "Pizza": { price: 40, hunger: 55 },
  "Banquete": { price: 80, hunger: 100 }
};

const DAILY_MISSIONS = [
  {
    title: "Ajude Sorokiba hoje",
    description: "Faça algo positivo pelo desenvolvimento da cidade.",
    xp: 50,
    money: 50
  },
  {
    title: "Cidadão ativo",
    description: "Participe das atividades de Sorokiba.",
    xp: 75,
    money: 75
  },
  {
    title: "Construa o futuro",
    description: "Complete uma atividade da cidade.",
    xp: 100,
    money: 100
  }
];

async function db(sql, params = []) {
  return pool.query(sql, params);
}

async function initDatabase() {
  await db(`
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
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS city (
      id INTEGER PRIMARY KEY,
      population INTEGER NOT NULL DEFAULT 0,
      gdp INTEGER NOT NULL DEFAULT 100000,
      territory INTEGER NOT NULL DEFAULT 10,
      treasury INTEGER NOT NULL DEFAULT 1000,
      infrastructure INTEGER NOT NULL DEFAULT 50,
      quality INTEGER NOT NULL DEFAULT 70,
      tax INTEGER NOT NULL DEFAULT 5
    )
  `);

  await db(`
    INSERT INTO city
    (id, population, gdp, territory, treasury, infrastructure, quality, tax)
    VALUES (1, 0, 100000, 10, 1000, 50, 70, 5)
    ON CONFLICT (id) DO NOTHING
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      image TEXT DEFAULT '',
      category TEXT DEFAULT 'Comunicado',
      author TEXT DEFAULT 'Prefeitura',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
    Sem FOREIGN KEY de propósito.
    Isso evita o erro:
    "foreign key constraint ... cannot be implemented"
  */
  await db(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      mayor_comment TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      mission_date DATE NOT NULL,
      title TEXT NOT NULL,
      xp INTEGER NOT NULL,
      money INTEGER NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, mission_date)
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      task_date DATE NOT NULL,
      job TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, task_date)
    )
  `);

  /*
    Compatibilidade com bancos antigos.
  */
  await db(`
    ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS mayor_comment TEXT DEFAULT ''
  `);

  console.log("Banco Sorokiba inicializado.");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, original] = stored.split(":");

    if (!salt || !original) return false;

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(original, "hex")
    );
  } catch {
    return false;
  }
}

function createToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, userId);
  return token;
}

function getToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) return null;

  return header.slice(7);
}

async function getUser(userId) {
  const result = await db(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (!result.rows.length) return null;

  return result.rows[0];
}

async function updateNeeds(user) {
  const last = new Date(user.updated_at).getTime();
  const now = Date.now();

  const hours = Math.floor(
    Math.max(0, now - last) / 3600000
  );

  if (hours <= 0) return user;

  const hunger = Math.max(
    0,
    user.hunger - hours * 3
  );

  let health = user.health;

  if (hunger <= 20) {
    health = Math.max(
      0,
      health - hours * 2
    );
  }

  await db(
    `
      UPDATE users
      SET hunger = $1,
          health = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [hunger, health, user.id]
  );

  return getUser(user.id);
}

async function currentUser(req) {
  const token = getToken(req);

  if (!token) return null;

  const userId = sessions.get(token);

  if (!userId) return null;

  const user = await getUser(userId);

  if (!user) {
    sessions.delete(token);
    return null;
  }

  return updateNeeds(user);
}

async function auth(req, res, next) {
  try {
    const user = await currentUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Você precisa estar logado."
      });
    }

    req.user = user;
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

function levelFromXP(xp) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

function missionForToday() {
  const day = Math.floor(
    Date.now() / 86400000
  );

  return DAILY_MISSIONS[
    day % DAILY_MISSIONS.length
  ];
}

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/healthcheck", async (req, res) => {
  try {
    await db("SELECT 1");

    res.json({
      ok: true,
      game: "Sorokiba",
      database: "connected"
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Banco indisponível."
    });
  }
});

/* =========================
   REGISTER
========================= */

app.post("/api/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const username = String(
      req.body.username || ""
    ).trim().toLowerCase();

    const password = String(
      req.body.password || ""
    );

    if (name.length < 2) {
      return res.status(400).json({
        error: "Digite um nome válido."
      });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        error: "Usuário: 3 a 20 caracteres."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const exists = await db(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        error: "Esse usuário já existe."
      });
    }

    const count = await db(
      `SELECT COUNT(*)::int AS total FROM users`
    );

    const role =
      count.rows[0].total === 0
        ? "mayor"
        : "citizen";

    const passwordHash = hashPassword(password);

    const result = await db(
      `
        INSERT INTO users
        (name, username, password_hash, role)
        VALUES ($1, $2, $3, $4)
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

    await db(`
      UPDATE city
      SET population = population + 1
      WHERE id = 1
    `);

    const token = createToken(userId);

    res.json({
      ok: true,
      token,
      role
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao criar conta."
    });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {
  try {
    const username = String(
      req.body.username || ""
    ).trim().toLowerCase();

    const password = String(
      req.body.password || ""
    );

    const result = await db(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const user = result.rows[0];

    if (!verifyPassword(
      password,
      user.password_hash
    )) {
      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const token = createToken(user.id);

    res.json({
      ok: true,
      token,
      role: user.role
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
  const token = getToken(req);

  if (token) {
    sessions.delete(token);
  }

  res.json({ ok: true });
});

/* =========================
   STATE
========================= */

app.get("/api/state", auth, async (req, res) => {
  try {
    const user = await currentUser(req);

    const city = await db(
      `SELECT * FROM city WHERE id = 1`
    );

    const news = await db(`
      SELECT
        id,
        title,
        text,
        image,
        category,
        author,
        TO_CHAR(
          created_at,
          'DD/MM/YYYY HH24:MI'
        ) AS date
      FROM news
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const events = await db(`
      SELECT
        id,
        title,
        text,
        TO_CHAR(
          created_at,
          'DD/MM/YYYY HH24:MI'
        ) AS date
      FROM events
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const proposals = await db(`
      SELECT
        id,
        author,
        text,
        status,
        mayor_comment,
        TO_CHAR(
          created_at,
          'DD/MM/YYYY HH24:MI'
        ) AS date
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
        level: levelFromXP(user.xp),
        reputation: user.reputation,
        hunger: user.hunger,
        health: user.health,
        job: user.job
      },
      city: city.rows[0],
      news: news.rows,
      events: events.rows,
      proposals: proposals.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao carregar Sorokiba."
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

    if (req.user.xp < JOBS[job].requiredXP) {
      return res.status(400).json({
        error:
          `Você precisa de ${JOBS[job].requiredXP} XP.`
      });
    }

    await db(
      `
        UPDATE users
        SET job = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [job, req.user.id]
    );

    res.json({ ok: true });
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
    const user = await currentUser(req);
    const job = JOBS[user.job];

    const result = await db(
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
      xp: job.xp,
      money: job.money,
      done: result.rows[0]?.done || false
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
    const user = await currentUser(req);
    const job = JOBS[user.job];

    const existing = await db(
      `
        SELECT done
        FROM job_tasks
        WHERE user_id = $1
        AND task_date = CURRENT_DATE
      `,
      [user.id]
    );

    if (existing.rows[0]?.done) {
      return res.status(400).json({
        error: "Você já completou essa tarefa hoje."
      });
    }

    await db(
      `
        INSERT INTO job_tasks
        (user_id, task_date, job, done)
        VALUES ($1, CURRENT_DATE, $2, TRUE)
        ON CONFLICT (user_id, task_date)
        DO UPDATE SET done = TRUE
      `,
      [user.id, user.job]
    );

    await db(
      `
        UPDATE users
        SET
          xp = xp + $1,
          money = money + $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        job.xp,
        job.money,
        user.id
      ]
    );

    await db(
      `
        UPDATE city
        SET
          gdp = gdp + $1,
          treasury = treasury + $2
        WHERE id = 1
      `,
      [
        job.money,
        Math.floor(job.money * 0.1)
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao completar tarefa."
    });
  }
});

/* =========================
   MISSIONS
========================= */

app.get("/api/mission", auth, async (req, res) => {
  try {
    const mission = missionForToday();

    const result = await db(
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
      done: result.rows[0]?.done || false
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
    const mission = missionForToday();

    const existing = await db(
      `
        SELECT done
        FROM missions
        WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      `,
      [req.user.id]
    );

    if (existing.rows[0]?.done) {
      return res.status(400).json({
        error: "Você já completou a missão hoje."
      });
    }

    await db(
      `
        INSERT INTO missions
        (user_id, mission_date, title, xp, money, done)
        VALUES
        ($1, CURRENT_DATE, $2, $3, $4, TRUE)
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

    await db(
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

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao completar missão."
    });
  }
});

/* =========================
   MARKET
========================= */

app.get("/api/market", auth, (req, res) => {
  res.json(FOODS);
});

app.post("/api/buy-food", auth, async (req, res) => {
  try {
    const name = String(req.body.food || "");
    const food = FOODS[name];

    if (!food) {
      return res.status(400).json({
        error: "Comida não encontrada."
      });
    }

    const user = await currentUser(req);

    if (user.money < food.price) {
      return res.status(400).json({
        error: "Dinheiro insuficiente."
      });
    }

    const hunger = Math.min(
      100,
      user.hunger + food.hunger
    );

    await db(
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
        hunger,
        user.id
      ]
    );

    await db(
      `
        UPDATE city
        SET treasury = treasury + $1
        WHERE id = 1
      `,
      [Math.floor(food.price * 0.05)]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao comprar comida."
    });
  }
});

/* =========================
   HEALTH
========================= */

app.post("/api/health", auth, async (req, res) => {
  try {
    const user = await currentUser(req);

    if (user.money < 50) {
      return res.status(400).json({
        error: "Você precisa de $50."
      });
    }

    const health = Math.min(
      100,
      user.health + 30
    );

    await db(
      `
        UPDATE users
        SET
          money = money - 50,
          health = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [health, user.id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao cuidar da saúde."
    });
  }
});

/* =========================
   PROPOSALS
========================= */

app.post("/api/proposals", auth, async (req, res) => {
  try {
    const text = String(
      req.body.text || ""
    ).trim();

    if (!text) {
      return res.status(400).json({
        error: "Escreva sua proposta."
      });
    }

    await db(
      `
        INSERT INTO proposals
        (user_id, author, text, status, mayor_comment)
        VALUES ($1, $2, $3, 'Pendente', '')
      `,
      [
        req.user.id,
        req.user.name,
        text
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao enviar proposta."
    });
  }
});

/*
  Prefeito pode aprovar/recusar
  e escrever um comentário.
*/
app.post(
  "/api/proposals/:id",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const approve =
        req.body.approve === true;

      const comment = String(
        req.body.comment || ""
      ).trim();

      const status =
        approve
          ? "Aprovada"
          : "Recusada";

      const result = await db(
        `
          UPDATE proposals
          SET
            status = $1,
            mayor_comment = $2
          WHERE id = $3
          RETURNING *
        `,
        [
          status,
          comment,
          req.params.id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Proposta não encontrada."
        });
      }

      if (approve) {
        await db(`
          UPDATE city
          SET
            quality = LEAST(100, quality + 2),
            infrastructure =
              LEAST(100, infrastructure + 1)
          WHERE id = 1
        `);
      }

      res.json({
        ok: true,
        proposal: result.rows[0]
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao analisar proposta."
      });
    }
  }
);

/* =========================
   NEWS
========================= */

app.post(
  "/api/news",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const title = String(
        req.body.title || ""
      ).trim();

      const text = String(
        req.body.text || ""
      ).trim();

      const category = String(
        req.body.category || "Comunicado"
      ).trim();

      const image = String(
        req.body.image || ""
      ).trim();

      if (!title || !text) {
        return res.status(400).json({
          error: "Preencha título e texto."
        });
      }

      await db(
        `
          INSERT INTO news
          (title, text, image, category, author)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          title,
          text,
          image,
          category,
          req.user.name
        ]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao publicar notícia."
      });
    }
  }
);

/* =========================
   EVENTS
========================= */

app.post(
  "/api/event",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const title = String(
        req.body.title || ""
      ).trim();

      const text = String(
        req.body.text || ""
      ).trim();

      if (!title || !text) {
        return res.status(400).json({
          error: "Preencha título e descrição."
        });
      }

      await db(
        `
          INSERT INTO events
          (title, text)
          VALUES ($1, $2)
        `,
        [title, text]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao criar evento."
      });
    }
  }
);

/* =========================
   TAX
========================= */

app.post(
  "/api/tax",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const tax = Number(req.body.tax);

      if (
        !Number.isFinite(tax) ||
        tax < 0 ||
        tax > 30
      ) {
        return res.status(400).json({
          error: "Imposto deve estar entre 0 e 30."
        });
      }

      await db(
        `UPDATE city SET tax = $1 WHERE id = 1`,
        [tax]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao alterar imposto."
      });
    }
  }
);

/* =========================
   FRONTEND
========================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.use(express.static(__dirname));

app.use((req, res) => {
  res.status(404).send("Not Found");
});

/* =========================
   START
========================= */

async function start() {
  try {
    await initDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Sorokiba online na porta ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "ERRO AO INICIAR SOROKIBA:"
    );

    console.error(error);

    process.exit(1);
  }
}

start();
```
