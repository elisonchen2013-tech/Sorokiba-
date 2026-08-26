const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = Number(process.env.PORT) || 10000;

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não está configurada no Render.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

/* =========================================================
   SESSÕES
========================================================= */

const sessions = new Map();

/* =========================================================
   EMPREGOS
========================================================= */

const JOBS = {
  Estudante: {
    requiredXP: 0,
    salary: 20,
    description: "Estude e ajude no desenvolvimento de Sorokiba.",
    task: "Estudar e completar uma atividade",
    taskXP: 25,
    taskMoney: 15
  },

  Entregador: {
    requiredXP: 100,
    salary: 50,
    description: "Faça entregas pela cidade.",
    task: "Realizar uma entrega",
    taskXP: 40,
    taskMoney: 50
  },

  Comerciante: {
    requiredXP: 300,
    salary: 80,
    description: "Trabalhe em um comércio.",
    task: "Atender clientes",
    taskXP: 60,
    taskMoney: 80
  },

  Policial: {
    requiredXP: 600,
    salary: 120,
    description: "Ajude a manter a cidade segura.",
    task: "Fazer uma patrulha",
    taskXP: 80,
    taskMoney: 120
  },

  Médico: {
    requiredXP: 1000,
    salary: 180,
    description: "Cuide dos cidadãos.",
    task: "Atender um paciente",
    taskXP: 100,
    taskMoney: 180
  },

  Engenheiro: {
    requiredXP: 1500,
    salary: 250,
    description: "Ajude a construir e melhorar Sorokiba.",
    task: "Trabalhar em uma construção",
    taskXP: 130,
    taskMoney: 250
  }
};

/* =========================================================
   COMIDAS
========================================================= */

const FOODS = {
  Pão: {
    price: 10,
    hunger: 15
  },

  Hambúrguer: {
    price: 25,
    hunger: 35
  },

  Pizza: {
    price: 40,
    hunger: 55
  },

  Banquete: {
    price: 80,
    hunger: 100
  }
};

/* =========================================================
   MISSÕES
========================================================= */

const MISSIONS = [
  {
    title: "Ajude Sorokiba hoje",
    xp: 50,
    money: 50
  },

  {
    title: "Contribua para o desenvolvimento da cidade",
    xp: 75,
    money: 75
  },

  {
    title: "Faça algo positivo por Sorokiba",
    xp: 100,
    money: 100
  }
];

/* =========================================================
   BANCO
========================================================= */

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDatabase() {
  console.log("Inicializando banco de dados...");

  /*
    IMPORTANTE:

    NÃO usamos FOREIGN KEY.

    Isso evita o erro:

    foreign key constraint "..._fkey"
    cannot be implemented
  */

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
      id INTEGER PRIMARY KEY,
      population INTEGER NOT NULL DEFAULT 0,
      gdp BIGINT NOT NULL DEFAULT 100000,
      territory INTEGER NOT NULL DEFAULT 10,
      treasury BIGINT NOT NULL DEFAULT 1000,
      infrastructure INTEGER NOT NULL DEFAULT 50,
      quality INTEGER NOT NULL DEFAULT 70,
      tax INTEGER NOT NULL DEFAULT 5
    );
  `);

  await query(`
    INSERT INTO city (
      id,
      population,
      gdp,
      territory,
      treasury,
      infrastructure,
      quality,
      tax
    )
    VALUES (
      1,
      0,
      100000,
      10,
      1000,
      50,
      70,
      5
    )
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

  /*
    SEM FOREIGN KEY
  */
  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      mayor_comment TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pendente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /*
    Se a tabela já existir da versão antiga,
    garantimos que a coluna exista.
  */
  await query(`
    ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS mayor_comment TEXT DEFAULT '';
  `);

  /*
    SEM FOREIGN KEY
  */
  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      mission_date DATE NOT NULL,
      title TEXT NOT NULL,
      xp INTEGER NOT NULL,
      money INTEGER NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    missions_user_date_unique
    ON missions(user_id, mission_date);
  `);

  /*
    SEM FOREIGN KEY
  */
  await query(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      task_date DATE NOT NULL,
      job TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    job_tasks_user_date_unique
    ON job_tasks(user_id, task_date);
  `);

  console.log("Banco de dados inicializado com sucesso.");
}

/* =========================================================
   SENHA
========================================================= */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  try {
    if (!stored || !stored.includes(":")) {
      return false;
    }

    const [salt, originalHash] = stored.split(":");

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(originalHash, "hex");

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);

  } catch (error) {
    return false;
  }
}

/* =========================================================
   SESSÃO
========================================================= */

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    userId,
    createdAt: Date.now()
  });

  return token;
}

function getToken(req) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.substring(7);
}

/* =========================================================
   USUÁRIO
========================================================= */

async function getUser(userId) {
  const result = await query(
    `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (!result.rows.length) {
    return null;
  }

  return result.rows[0];
}

/* =========================================================
   NECESSIDADES
========================================================= */

async function updateNeeds(user) {
  if (!user || !user.updated_at) {
    return;
  }

  const previous = new Date(user.updated_at).getTime();
  const now = Date.now();

  if (!Number.isFinite(previous)) {
    return;
  }

  const hours = Math.floor(
    Math.max(0, now - previous) / 3600000
  );

  if (hours <= 0) {
    return;
  }

  const hungerLoss = hours * 3;

  const hunger = Math.max(
    0,
    Number(user.hunger) - hungerLoss
  );

  let health = Number(user.health);

  if (hunger <= 20) {
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
      hunger,
      health,
      user.id
    ]
  );
}

/* =========================================================
   NÍVEL
========================================================= */

function calculateLevel(xp) {
  return Math.max(
    1,
    Math.floor(Number(xp) / 500) + 1
  );
}

/* =========================================================
   AUTH
========================================================= */

async function auth(req, res, next) {
  try {
    const token = getToken(req);

    if (!token || !sessions.has(token)) {
      return res.status(401).json({
        error: "Você precisa estar logado."
      });
    }

    const session = sessions.get(token);

    const user = await getUser(session.userId);

    if (!user) {
      sessions.delete(token);

      return res.status(401).json({
        error: "Usuário não encontrado."
      });
    }

    await updateNeeds(user);

    req.user = await getUser(session.userId);
    req.token = token;

    next();

  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      error: "Erro de autenticação."
    });
  }
}

/* =========================================================
   PREFEITO
========================================================= */

function mayorOnly(req, res, next) {
  if (!req.user || req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Apenas o prefeito pode realizar essa ação."
    });
  }

  next();
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.use(express.static(__dirname));

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/healthcheck", (req, res) => {
  res.json({
    ok: true,
    game: "Sorokiba",
    status: "online"
  });
});

/* =========================================================
   REGISTER
========================================================= */

app.post("/api/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

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
        error: "Digite um nome válido."
      });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        error:
          "O usuário precisa ter entre 3 e 20 caracteres."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error:
          "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const exists = await query(
      `
        SELECT id
        FROM users
        WHERE username = $1
      `,
      [username]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        error: "Esse usuário já existe."
      });
    }

    const count = await query(
      `
        SELECT COUNT(*)::integer AS total
        FROM users
      `
    );

    /*
      O primeiro usuário vira prefeito.
    */

    const role =
      Number(count.rows[0].total) === 0
        ? "mayor"
        : "citizen";

    const passwordHash =
      hashPassword(password);

    const result = await query(
      `
        INSERT INTO users (
          name,
          username,
          password_hash,
          role
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
        RETURNING id, name, username, role
      `,
      [
        name,
        username,
        passwordHash,
        role
      ]
    );

    const user = result.rows[0];

    await query(`
      UPDATE city
      SET population = population + 1
      WHERE id = 1
    `);

    const token =
      createSession(user.id);

    res.json({
      ok: true,
      token,
      user
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      error: "Não foi possível criar a conta."
    });
  }
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/login", async (req, res) => {
  try {
    const username = String(
      req.body.username || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

    const result = await query(
      `
        SELECT *
        FROM users
        WHERE username = $1
        LIMIT 1
      `,
      [username]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const user = result.rows[0];

    if (
      !checkPassword(
        password,
        user.password_hash
      )
    ) {
      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const token =
      createSession(user.id);

    res.json({
      ok: true,
      token
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      error: "Erro ao entrar."
    });
  }
});

/* =========================================================
   LOGOUT
========================================================= */

app.post("/api/logout", auth, (req, res) => {
  sessions.delete(req.token);

  res.json({
    ok: true
  });
});

/* =========================================================
   ESTADO COMPLETO DO JOGO
========================================================= */

app.get("/api/state", auth, async (req, res) => {
  try {
    const user = await getUser(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado."
      });
    }

    const cityResult = await query(`
      SELECT *
      FROM city
      WHERE id = 1
    `);

    const newsResult = await query(`
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

    const eventsResult = await query(`
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

    const proposalsResult = await query(`
      SELECT
        id,
        user_id,
        author,
        text,
        mayor_comment,
        status,
        TO_CHAR(
          created_at,
          'DD/MM/YYYY HH24:MI'
        ) AS date
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      ok: true,

      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,

        money: Number(user.money),
        xp: Number(user.xp),

        level:
          calculateLevel(user.xp),

        reputation:
          Number(user.reputation),

        hunger:
          Number(user.hunger),

        health:
          Number(user.health),

        job:
          user.job
      },

      city:
        cityResult.rows[0] || null,

      jobs:
        JOBS,

      foods:
        FOODS,

      news:
        newsResult.rows,

      events:
        eventsResult.rows,

      proposals:
        proposalsResult.rows
    });

  } catch (error) {
    console.error("STATE ERROR:", error);

    res.status(500).json({
      error: "Erro ao carregar o jogo."
    });
  }
});

/* =========================================================
   EMPREGOS
========================================================= */

app.get("/api/jobs", auth, (req, res) => {
  res.json({
    ok: true,
    jobs: JOBS
  });
});

app.post("/api/job", auth, async (req, res) => {
  try {
    const job = String(
      req.body.job || ""
    ).trim();

    if (!JOBS[job]) {
      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    const required =
      JOBS[job].requiredXP;

    if (Number(req.user.xp) < required) {
      return res.status(400).json({
        error:
          `Você precisa de ${required} XP para esse emprego.`
      });
    }

    await query(
      `
        UPDATE users
        SET
          job = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        job,
        req.user.id
      ]
    );

    res.json({
      ok: true,
      job
    });

  } catch (error) {
    console.error("JOB ERROR:", error);

    res.status(500).json({
      error: "Erro ao escolher emprego."
    });
  }
});

/* =========================================================
   TAREFA DO EMPREGO
========================================================= */

app.get("/api/job-task", auth, async (req, res) => {
  try {
    const user = await getUser(req.user.id);
    const job = JOBS[user.job];

    const result = await query(
      `
        SELECT done
        FROM job_tasks
        WHERE user_id = $1
        AND task_date = CURRENT_DATE
        LIMIT 1
      `,
      [user.id]
    );

    res.json({
      ok: true,
      job: user.job,
      title: job.task,
      xp: job.taskXP,
      money: job.taskMoney,
      done:
        result.rows.length
          ? result.rows[0].done
          : false
    });

  } catch (error) {
    console.error("JOB TASK GET ERROR:", error);

    res.status(500).json({
      error: "Erro ao carregar tarefa."
    });
  }
});

app.post("/api/job-task", auth, async (req, res) => {
  try {
    const user = await getUser(req.user.id);
    const job = JOBS[user.job];

    const existing = await query(
      `
        SELECT id, done
        FROM job_tasks
        WHERE user_id = $1
        AND task_date = CURRENT_DATE
        LIMIT 1
      `,
      [user.id]
    );

    if (
      existing.rows.length &&
      existing.rows[0].done
    ) {
      return res.status(400).json({
        error:
          "Você já completou sua tarefa hoje."
      });
    }

    if (existing.rows.length) {
      await query(
        `
          UPDATE job_tasks
          SET
            done = TRUE,
            job = $1
          WHERE id = $2
        `,
        [
          user.job,
          existing.rows[0].id
        ]
      );
    } else {
      await query(
        `
          INSERT INTO job_tasks (
            user_id,
            task_date,
            job,
            done
          )
          VALUES (
            $1,
            CURRENT_DATE,
            $2,
            TRUE
          )
        `,
        [
          user.id,
          user.job
        ]
      );
    }

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

    await query(
      `
        UPDATE city
        SET
          gdp = gdp + $1,
          treasury = treasury + $2
        WHERE id = 1
      `,
      [
        job.taskMoney,
        Math.floor(job.taskMoney * 0.10)
      ]
    );

    res.json({
      ok: true,
      message:
        "Tarefa completada!"
    });

  } catch (error) {
    console.error("JOB TASK POST ERROR:", error);

    res.status(500).json({
      error:
        "Erro ao completar tarefa."
    });
  }
});

/* =========================================================
   MISSÃO DIÁRIA
========================================================= */

app.get("/api/mission", auth, async (req, res) => {
  try {
    const mission =
      MISSIONS[
        new Date().getDate() %
        MISSIONS.length
      ];

    const result = await query(
      `
        SELECT done
        FROM missions
        WHERE user_id = $1
        AND mission_date = CURRENT_DATE
        LIMIT 1
      `,
      [req.user.id]
    );

    res.json({
      ok: true,
      ...mission,
      done:
        result.rows.length
          ? result.rows[0].done
          : false
    });

  } catch (error) {
    console.error("MISSION GET ERROR:", error);

    res.status(500).json({
      error:
        "Erro ao carregar missão."
    });
  }
});

app.post("/api/mission", auth, async (req, res) => {
  try {
    const mission =
      MISSIONS[
        new Date().getDate() %
        MISSIONS.length
      ];

    const existing = await query(
      `
        SELECT id, done
        FROM missions
        WHERE user_id = $1
        AND mission_date = CURRENT_DATE
        LIMIT 1
      `,
      [req.user.id]
    );

    if (
      existing.rows.length &&
      existing.rows[0].done
    ) {
      return res.status(400).json({
        error:
          "Você já completou a missão hoje."
      });
    }

    if (existing.rows.length) {
      await query(
        `
          UPDATE missions
          SET
            done = TRUE,
            title = $1,
            xp = $2,
            money = $3
          WHERE id = $4
        `,
        [
          mission.title,
          mission.xp,
          mission.money,
          existing.rows[0].id
        ]
      );
    } else {
      await query(
        `
          INSERT INTO missions (
            user_id,
            mission_date,
            title,
            xp,
            money,
            done
          )
          VALUES (
            $1,
            CURRENT_DATE,
            $2,
            $3,
            $4,
            TRUE
          )
        `,
        [
          req.user.id,
          mission.title,
          mission.xp,
          mission.money
        ]
      );
    }

    await query(
      `
        UPDATE users
        SET
          xp = xp + $1,
          money = money + $2,
          reputation =
            LEAST(100, reputation + 2),
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
      ok: true,
      message:
        "Missão completada!"
    });

  } catch (error) {
    console.error("MISSION POST ERROR:", error);

    res.status(500).json({
      error:
        "Erro ao completar missão."
    });
  }
});

/* =========================================================
   MERCADO
========================================================= */

app.get("/api/market", auth, (req, res) => {
  res.json({
    ok: true,
    foods: FOODS
  });
});

app.post("/api/buy-food", auth, async (req, res) => {
  try {
    const foodName =
      String(req.body.food || "");

    const food = FOODS[foodName];

    if (!food) {
      return res.status(400).json({
        error:
          "Comida não encontrada."
      });
    }

    const user =
      await getUser(req.user.id);

    if (
      Number(user.money) <
      food.price
    ) {
      return res.status(400).json({
        error:
          "Você não tem dinheiro suficiente."
      });
    }

    const hunger =
      Math.min(
        100,
        Number(user.hunger) +
          food.hunger
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
        hunger,
        user.id
      ]
    );

    await query(
      `
        UPDATE city
        SET
          treasury = treasury + $1
        WHERE id = 1
      `,
      [
        Math.floor(food.price * 0.05)
      ]
    );

    res.json({
      ok: true,
      food: foodName
    });

  } catch (error) {
    console.error("FOOD ERROR:", error);

    res.status(500).json({
      error:
        "Erro ao comprar comida."
    });
  }
});

/* =========================================================
   SAÚDE
========================================================= */

app.post("/api/health", auth, async (req, res) => {
  try {
    const user =
      await getUser(req.user.id);

    if (Number(user.money) < 50) {
      return res.status(400).json({
        error:
          "Você precisa de $50."
      });
    }

    const health =
      Math.min(
        100,
        Number(user.health) + 30
      );

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
      ok: true,
      health
    });

  } catch (error) {
    console.error("HEALTH ERROR:", error);

    res.status(500).json({
      error:
        "Erro ao recuperar saúde."
    });
  }
});

/* =========================================================
   NOTÍCIAS — PREFEITO
========================================================= */

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
        String(
          req.body.category ||
          "Comunicado"
        ).trim();

      if (!title || !text) {
        return res.status(400).json({
          error:
            "Preencha título e texto."
        });
      }

      await query(
        `
          INSERT INTO news (
            title,
            text,
            image,
            category,
            author
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
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
      console.error("NEWS ERROR:", error);

      res.status(500).json({
        error:
          "Erro ao publicar notícia."
      });
    }
  }
);

/* =========================================================
   EVENTOS — PREFEITO
========================================================= */

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
          error:
            "Preencha título e descrição."
        });
      }

      await query(
        `
          INSERT INTO events (
            title,
            text
          )
          VALUES (
            $1,
            $2
          )
        `,
        [
          title,
          text
        ]
      );

      res.json({
        ok: true
      });

    } catch (error) {
      console.error("EVENT ERROR:", error);

      res.status(500).json({
        error:
          "Erro ao criar evento."
      });
    }
  }
);

/* =========================================================
   PROPOSTAS
========================================================= */

app.post(
  "/api/proposals",
  auth,
  async (req, res) => {
    try {
      const text =
        String(req.body.text || "").trim();

      if (!text) {
        return res.status(400).json({
          error:
            "Escreva uma proposta."
        });
      }

      await query(
        `
          INSERT INTO proposals (
            user_id,
            author,
            text,
            mayor_comment,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            '',
            'Pendente'
          )
        `,
        [
          req.user.id,
          req.user.name,
          text
        ]
      );

      res.json({
        ok: true,
        message:
          "Proposta enviada ao prefeito."
      });

    } catch (error) {
      console.error(
        "PROPOSAL CREATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao enviar proposta."
      });
    }
  }
);

/* =========================================================
   DECISÃO DA PROPOSTA + COMENTÁRIO DO PREFEITO
========================================================= */

app.post(
  "/api/proposals/:id",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const approve =
        req.body.approve === true;

      const comment =
        String(
          req.body.comment ||
          req.body.mayor_comment ||
          ""
        ).trim();

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          error:
            "ID de proposta inválido."
        });
      }

      const status =
        approve
          ? "Aprovada"
          : "Recusada";

      const result = await query(
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
          id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error:
            "Proposta não encontrada."
        });
      }

      /*
        Se aprovada, melhora a cidade.
      */

      if (approve) {
        await query(`
          UPDATE city
          SET
            quality =
              LEAST(100, quality + 2),

            infrastructure =
              LEAST(100, infrastructure + 1),

            gdp =
              gdp + 500
          WHERE id = 1
        `);
      }

      res.json({
        ok: true,
        status,
        comment
      });

    } catch (error) {
      console.error(
        "PROPOSAL DECISION ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao decidir proposta."
      });
    }
  }
);

/* =========================================================
   IMPOSTO
========================================================= */

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
          error:
            "O imposto deve estar entre 0 e 30."
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
        ok: true,
        tax
      });

    } catch (error) {
      console.error("TAX ERROR:", error);

      res.status(500).json({
        error:
          "Erro ao atualizar imposto."
      });
    }
  }
);

/* =========================================================
   PREFEITO — DADOS ADMINISTRATIVOS
========================================================= */

app.get(
  "/api/mayor/dashboard",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const users = await query(`
        SELECT
          id,
          name,
          username,
          role,
          money,
          xp,
          reputation,
          hunger,
          health,
          job,
          created_at
        FROM users
        ORDER BY id ASC
      `);

      const city = await query(`
        SELECT *
        FROM city
        WHERE id = 1
      `);

      const proposals = await query(`
        SELECT *
        FROM proposals
        ORDER BY created_at DESC
      `);

      res.json({
        ok: true,
        city: city.rows[0],
        users: users.rows,
        proposals: proposals.rows
      });

    } catch (error) {
      console.error(
        "MAYOR DASHBOARD ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar painel do prefeito."
      });
    }
  }
);

/* =========================================================
   404 API
========================================================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    error:
      "Rota da API não encontrada.",
    path: req.path
  });
});

/* =========================================================
   404 NORMAL
========================================================= */

app.use((req, res) => {
  res.status(404).send("Not Found");
});

/* =========================================================
   ERRO GLOBAL
========================================================= */

app.use((error, req, res, next) => {
  console.error(
    "GLOBAL ERROR:",
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error:
      "Erro interno do servidor."
  });
});

/* =========================================================
   INICIAR
========================================================= */

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
      "ERRO FATAL AO INICIAR SOROKIBA:"
    );

    console.error(error);

    process.exit(1);
  }
}

start();

/* =========================================================
   ENCERRAMENTO
========================================================= */

process.on("SIGTERM", async () => {
  console.log(
    "Encerrando servidor..."
  );

  await pool.end();

  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log(
    "Encerrando servidor..."
  );

  await pool.end();

  process.exit(0);
});
