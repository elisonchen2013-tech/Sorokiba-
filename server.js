const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

/* =========================================================
   DATABASE
========================================================= */

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function query(sql, params = []) {
  return pool.query(sql, params);
}

/* =========================================================
   SESSIONS
========================================================= */

const sessions = new Map();

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
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

/* =========================================================
   PASSWORDS
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
    const parts = String(stored).split(":");

    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const originalHash = parts[1];

    const hash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(originalHash, "hex");

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* =========================================================
   GAME DATA
========================================================= */

const JOBS = {
  Estudante: {
    xp: 0,
    money: 20,
    description: "Estude e ajude no desenvolvimento de Sorokiba.",
    task: "Estudar por 30 minutos",
    taskXP: 25,
    taskMoney: 15
  },

  Entregador: {
    xp: 100,
    money: 50,
    description: "Faça entregas pela cidade.",
    task: "Realizar uma entrega",
    taskXP: 40,
    taskMoney: 50
  },

  Comerciante: {
    xp: 300,
    money: 80,
    description: "Trabalhe em um comércio.",
    task: "Atender clientes",
    taskXP: 60,
    taskMoney: 80
  },

  Policial: {
    xp: 600,
    money: 120,
    description: "Ajude a manter a cidade segura.",
    task: "Patrulhar a cidade",
    taskXP: 80,
    taskMoney: 120
  },

  Médico: {
    xp: 1000,
    money: 180,
    description: "Cuide da saúde dos cidadãos.",
    task: "Atender um paciente",
    taskXP: 100,
    taskMoney: 180
  },

  Engenheiro: {
    xp: 1500,
    money: 250,
    description: "Ajude a construir e melhorar Sorokiba.",
    task: "Trabalhar em uma obra",
    taskXP: 130,
    taskMoney: 250
  }
};

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

const MISSIONS = [
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

/* =========================================================
   DATABASE HELPERS
========================================================= */

async function columnExists(table, column) {
  const result = await query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    ) AS exists
    `,
    [table, column]
  );

  return result.rows[0].exists;
}

async function constraintExists(table, constraint) {
  const result = await query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = $1
      AND constraint_name = $2
    ) AS exists
    `,
    [table, constraint]
  );

  return result.rows[0].exists;
}

/* =========================================================
   DATABASE INIT
========================================================= */

async function initDatabase() {
  console.log("Inicializando banco de dados...");

  /*
  =========================================================
  USERS
  =========================================================

  IMPORTANTÍSSIMO:

  O banco antigo do Render possui users.id como TEXT.

  Portanto NÃO tentamos transformar para INTEGER.

  O ID é gerado pelo Node com crypto.randomUUID().
  */

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
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

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
  =========================================================
  USERS - COMPATIBILIDADE COM BANCO ANTIGO
  =========================================================
  */

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name TEXT
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'citizen'
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS money INTEGER DEFAULT 100
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 50
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS hunger INTEGER DEFAULT 100
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS health INTEGER DEFAULT 100
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS job TEXT DEFAULT 'Estudante'
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  /*
  =========================================================
  CORRIGIR NULLS
  =========================================================
  */

  await query(`
    UPDATE users
    SET
      role = COALESCE(role, 'citizen'),
      money = COALESCE(money, 100),
      xp = COALESCE(xp, 0),
      reputation = COALESCE(reputation, 50),
      hunger = COALESCE(hunger, 100),
      health = COALESCE(health, 100),
      job = COALESCE(job, 'Estudante'),
      created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
      updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
  `);

  /*
  =========================================================
  CITY
  =========================================================
  */

  await query(`
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

  await query(`
    INSERT INTO city
    (
      id,
      population,
      gdp,
      territory,
      treasury,
      infrastructure,
      quality,
      tax
    )
    VALUES
    (
      1,
      0,
      100000,
      10,
      1000,
      50,
      70,
      5
    )
    ON CONFLICT (id) DO NOTHING
  `);

  /*
  =========================================================
  NEWS
  =========================================================
  */

  await query(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

      title TEXT NOT NULL,
      text TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Comunicado',
      author TEXT NOT NULL DEFAULT 'Prefeitura',

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    ALTER TABLE news
    ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT ''
  `);

  await query(`
    ALTER TABLE news
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Comunicado'
  `);

  await query(`
    ALTER TABLE news
    ADD COLUMN IF NOT EXISTS author TEXT NOT NULL DEFAULT 'Prefeitura'
  `);

  /*
  =========================================================
  EVENTS
  =========================================================
  */

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

      title TEXT NOT NULL,
      text TEXT NOT NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
  =========================================================
  PROPOSALS
  =========================================================
  */

  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

      user_id TEXT,

      author TEXT NOT NULL,
      text TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'Pendente',

      mayor_comment TEXT NOT NULL DEFAULT '',

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS user_id TEXT
  `);

  await query(`
    ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS mayor_comment TEXT NOT NULL DEFAULT ''
  `);

  /*
  =========================================================
  PROPOSALS FOREIGN KEY
  =========================================================
  */

  if (
    !(await constraintExists(
      "proposals",
      "proposals_user_id_fkey"
    ))
  ) {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'proposals_user_id_fkey'
        ) THEN

          ALTER TABLE proposals
          ADD CONSTRAINT proposals_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE;

        END IF;
      END
      $$
    `);
  }

  /*
  =========================================================
  MISSIONS
  =========================================================
  */

  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

      user_id TEXT NOT NULL,

      mission_date DATE NOT NULL,

      title TEXT NOT NULL,

      xp INTEGER NOT NULL DEFAULT 0,

      money INTEGER NOT NULL DEFAULT 0,

      done BOOLEAN NOT NULL DEFAULT FALSE,

      UNIQUE(user_id, mission_date)
    )
  `);

  /*
  =========================================================
  JOB TASKS
  =========================================================
  */

  await query(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

      user_id TEXT NOT NULL,

      task_date DATE NOT NULL,

      job TEXT NOT NULL,

      done BOOLEAN NOT NULL DEFAULT FALSE,

      UNIQUE(user_id, task_date)
    )
  `);

  /*
  =========================================================
  ÍNDICES
  =========================================================
  */

  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_news_created
    ON news(created_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_events_created
    ON events(created_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_proposals_created
    ON proposals(created_at DESC)
  `);

  console.log("Banco de dados inicializado com sucesso.");
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

    const userId = sessions.get(token);

    const result = await query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      `,
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
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
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

/* =========================================================
   USER HELPERS
========================================================= */

function calculateLevel(xp) {
  return Math.max(
    1,
    Math.floor(Number(xp) / 500) + 1
  );
}

async function updateNeeds(user) {
  if (!user.updated_at) {
    return;
  }

  const updatedAt =
    new Date(user.updated_at).getTime();

  if (!Number.isFinite(updatedAt)) {
    return;
  }

  const now = Date.now();

  const hours = Math.floor(
    Math.max(
      0,
      now - updatedAt
    ) / 3600000
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

async function getUser(userId) {
  const result = await query(
    `
    SELECT *
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (!result.rows.length) {
    return null;
  }

  await updateNeeds(result.rows[0]);

  const refreshed = await query(
    `
    SELECT *
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return refreshed.rows[0];
}

/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const name =
        String(req.body.name || "").trim();

      const username =
        String(
          req.body.username || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(req.body.password || "");

      if (name.length < 2) {
        return res.status(400).json({
          error: "Digite um nome válido."
        });
      }

      if (
        !/^[a-zA-Z0-9_]{3,20}$/.test(username)
      ) {
        return res.status(400).json({
          error:
            "Usuário deve ter de 3 a 20 caracteres."
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

      /*
      Primeira conta = prefeito.
      */

      const countResult = await query(`
        SELECT COUNT(*)::INTEGER AS total
        FROM users
      `);

      const totalUsers =
        Number(countResult.rows[0].total);

      const role =
        totalUsers === 0
          ? "mayor"
          : "citizen";

      const passwordHash =
        hashPassword(password);

      /*
      ID TEXT criado manualmente.
      */

      const userId =
        crypto.randomUUID();

      const result = await query(
        `
        INSERT INTO users
        (
          id,
          name,
          username,
          password_hash,
          role
        )

        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5
        )

        RETURNING
          id,
          name,
          username,
          role
        `,
        [
          userId,
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

      return res.json({
        ok: true,
        token,
        role: user.role,

        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Não foi possível criar a conta.",
        details: error.message
      });
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const username =
        String(
          req.body.username || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(req.body.password || "");

      const result = await query(
        `
        SELECT *
        FROM users
        WHERE username = $1
        `,
        [username]
      );

      if (!result.rows.length) {
        return res.status(401).json({
          error:
            "Usuário ou senha incorretos."
        });
      }

      const user =
        result.rows[0];

      if (
        !checkPassword(
          password,
          user.password_hash
        )
      ) {
        return res.status(401).json({
          error:
            "Usuário ou senha incorretos."
        });
      }

      const token =
        createSession(user.id);

      return res.json({
        ok: true,
        token,
        role: user.role,

        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        error: "Erro ao entrar."
      });
    }
  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  auth,
  (req, res) => {
    sessions.delete(req.token);

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   STATE
========================================================= */

app.get(
  "/api/state",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(req.user.id);

      if (!user) {
        return res.status(404).json({
          error:
            "Usuário não encontrado."
        });
      }

      const cityResult =
        await query(`
          SELECT *
          FROM city
          WHERE id = 1
        `);

      const newsResult =
        await query(`
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

      const eventResult =
        await query(`
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

      const proposalResult =
        await query(`
          SELECT
            id,
            user_id,
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

          money: Number(user.money),
          xp: Number(user.xp),

          level:
            calculateLevel(
              Number(user.xp)
            ),

          reputation:
            Number(user.reputation),

          hunger:
            Number(user.hunger),

          health:
            Number(user.health),

          job: user.job
        },

        city:
          cityResult.rows[0] || null,

        news:
          newsResult.rows,

        events:
          eventResult.rows,

        proposals:
          proposalResult.rows
      });
    } catch (error) {
      console.error(
        "STATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar o jogo."
      });
    }
  }
);

/* =========================================================
   JOBS
========================================================= */

app.get(
  "/api/jobs",
  auth,
  (req, res) => {
    res.json(JOBS);
  }
);

app.post(
  "/api/job",
  auth,
  async (req, res) => {
    try {
      const job =
        String(req.body.job || "");

      if (!JOBS[job]) {
        return res.status(400).json({
          error:
            "Emprego inválido."
        });
      }

      const requiredXP =
        JOBS[job].xp;

      if (
        Number(req.user.xp) <
        requiredXP
      ) {
        return res.status(400).json({
          error:
            `Você precisa de ${requiredXP} XP.`
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
      console.error(
        "JOB ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao escolher emprego."
      });
    }
  }
);

/* =========================================================
   JOB TASK GET
========================================================= */

app.get(
  "/api/job-task",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.id
        );

      const job =
        JOBS[user.job];

      if (!job) {
        return res.status(400).json({
          error:
            "Emprego inválido."
        });
      }

      const result =
        await query(
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

        done:
          result.rows.length
            ? result.rows[0].done
            : false
      });
    } catch (error) {
      console.error(
        "JOB TASK GET ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar tarefa."
      });
    }
  }
);

/* =========================================================
   JOB TASK POST
========================================================= */

app.post(
  "/api/job-task",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.id
        );

      const job =
        JOBS[user.job];

      if (!job) {
        return res.status(400).json({
          error:
            "Emprego inválido."
        });
      }

      const existing =
        await query(
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
          error:
            "Você já completou sua tarefa hoje."
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

        ON CONFLICT
        (
          user_id,
          task_date
        )

        DO UPDATE SET
          done = TRUE,
          job = EXCLUDED.job
        `,
        [
          user.id,
          user.job
        ]
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

      await query(
        `
        UPDATE city

        SET
          gdp = gdp + $1,
          treasury =
            treasury + $2

        WHERE id = 1
        `,
        [
          job.taskMoney,
          Math.floor(
            job.taskMoney * 0.1
          )
        ]
      );

      res.json({
        ok: true,
        xp: job.taskXP,
        money: job.taskMoney
      });
    } catch (error) {
      console.error(
        "JOB TASK POST ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao completar tarefa."
      });
    }
  }
);

/* =========================================================
   MISSIONS GET
========================================================= */

app.get(
  "/api/mission",
  auth,
  async (req, res) => {
    try {
      const index =
        new Date().getDate() %
        MISSIONS.length;

      const mission =
        MISSIONS[index];

      const result =
        await query(
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

        done:
          result.rows.length
            ? result.rows[0].done
            : false
      });
    } catch (error) {
      console.error(
        "MISSION GET ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar missão."
      });
    }
  }
);

/* =========================================================
   MISSIONS POST
========================================================= */

app.post(
  "/api/mission",
  auth,
  async (req, res) => {
    try {
      const index =
        new Date().getDate() %
        MISSIONS.length;

      const mission =
        MISSIONS[index];

      const existing =
        await query(
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
          error:
            "Você já completou a missão hoje."
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

        ON CONFLICT
        (
          user_id,
          mission_date
        )

        DO UPDATE SET
          done = TRUE
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

          reputation =
            LEAST(
              100,
              reputation + 2
            ),

          updated_at =
            CURRENT_TIMESTAMP

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
        xp: mission.xp,
        money: mission.money
      });
    } catch (error) {
      console.error(
        "MISSION POST ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao completar missão."
      });
    }
  }
);

/* =========================================================
   MARKET
========================================================= */

app.get(
  "/api/market",
  auth,
  (req, res) => {
    res.json(FOODS);
  }
);

/* =========================================================
   BUY FOOD
========================================================= */

app.post(
  "/api/buy-food",
  auth,
  async (req, res) => {
    try {
      const foodName =
        String(
          req.body.food || ""
        );

      const food =
        FOODS[foodName];

      if (!food) {
        return res.status(400).json({
          error:
            "Comida não encontrada."
        });
      }

      const user =
        await getUser(
          req.user.id
        );

      if (
        Number(user.money) <
        food.price
      ) {
        return res.status(400).json({
          error:
            "Você não tem dinheiro suficiente."
        });
      }

      const newHunger =
        Math.min(
          100,
          Number(user.hunger) +
            food.hunger
        );

      await query(
        `
        UPDATE users

        SET
          money =
            money - $1,

          hunger = $2,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $3
        `,
        [
          food.price,
          newHunger,
          user.id
        ]
      );

      await query(
        `
        UPDATE city

        SET treasury =
          treasury + $1

        WHERE id = 1
        `,
        [
          Math.floor(
            food.price * 0.05
          )
        ]
      );

      res.json({
        ok: true,
        hunger: newHunger
      });
    } catch (error) {
      console.error(
        "BUY FOOD ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao comprar comida."
      });
    }
  }
);

/* =========================================================
   NEWS
========================================================= */

app.post(
  "/api/news",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const title =
        String(
          req.body.title || ""
        ).trim();

      const text =
        String(
          req.body.text || ""
        ).trim();

      const image =
        String(
          req.body.image || ""
        ).trim();

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
        INSERT INTO news
        (
          title,
          text,
          image,
          category,
          author
        )

        VALUES
        (
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
      console.error(
        "NEWS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao publicar notícia."
      });
    }
  }
);

/* =========================================================
   DELETE NEWS - MAYOR
========================================================= */

app.delete(
  "/api/news/:id",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          DELETE FROM news
          WHERE id = $1
          RETURNING id
          `,
          [req.params.id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          error:
            "Notícia não encontrada."
        });
      }

      res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "DELETE NEWS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao apagar notícia."
      });
    }
  }
);

/* =========================================================
   EVENTS
========================================================= */

app.post(
  "/api/event",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
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

      await query(
        `
        INSERT INTO events
        (
          title,
          text
        )

        VALUES
        (
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
      console.error(
        "EVENT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao criar evento."
      });
    }
  }
);

/* =========================================================
   DELETE EVENT - MAYOR
========================================================= */

app.delete(
  "/api/event/:id",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          DELETE FROM events

          WHERE id = $1

          RETURNING id
          `,
          [req.params.id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          error:
            "Evento não encontrado."
        });
      }

      res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "DELETE EVENT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao apagar evento."
      });
    }
  }
);

/* =========================================================
   PROPOSALS
========================================================= */

app.post(
  "/api/proposals",
  auth,
  async (req, res) => {
    try {
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

      await query(
        `
        INSERT INTO proposals
        (
          user_id,
          author,
          text
        )

        VALUES
        (
          $1,
          $2,
          $3
        )
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
      console.error(
        "PROPOSAL ERROR:",
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
   MAYOR DECIDES PROPOSAL
========================================================= */

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

      const comment =
        String(
          req.body.comment ||
            req.body.mayorComment ||
            ""
        ).trim();

      const result =
        await query(
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
          error:
            "Proposta não encontrada."
        });
      }

      if (approve) {
        await query(`
          UPDATE city

          SET
            quality =
              LEAST(
                100,
                quality + 2
              ),

            infrastructure =
              LEAST(
                100,
                infrastructure + 1
              )

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
   TAX
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
            "Imposto deve estar entre 0 e 30."
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
      console.error(
        "TAX ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao atualizar imposto."
      });
    }
  }
);

/* =========================================================
   HEALTH
========================================================= */

app.post(
  "/api/health",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.id
        );

      if (
        Number(user.money) < 50
      ) {
        return res.status(400).json({
          error:
            "Você precisa de $50 para cuidar da saúde."
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

          updated_at =
            CURRENT_TIMESTAMP

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
      console.error(
        "HEALTH ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao cuidar da saúde."
      });
    }
  }
);

/* =========================================================
   MAYOR DASHBOARD
========================================================= */

app.get(
  "/api/mayor",
  auth,
  mayorOnly,
  async (req, res) => {
    try {
      const users =
        await query(`
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

          ORDER BY created_at ASC
        `);

      const city =
        await query(`
          SELECT *
          FROM city
          WHERE id = 1
        `);

      const proposals =
        await query(`
          SELECT
            id,
            user_id,
            author,
            text,
            status,
            mayor_comment,
            created_at

          FROM proposals

          ORDER BY created_at DESC
        `);

      const news =
        await query(`
          SELECT
            id,
            title,
            text,
            image,
            category,
            author,
            created_at

          FROM news

          ORDER BY created_at DESC

          LIMIT 100
        `);

      const events =
        await query(`
          SELECT
            id,
            title,
            text,
            created_at

          FROM events

          ORDER BY created_at DESC

          LIMIT 100
        `);

      res.json({
        city:
          city.rows[0] || null,

        users:
          users.rows,

        proposals:
          proposals.rows,

        news:
          news.rows,

        events:
          events.rows
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
   HEALTHCHECK
========================================================= */

app.get(
  "/api/healthcheck",
  (req, res) => {
    res.json({
      ok: true,
      game: "Sorokiba",
      status: "online"
    });
  }
);

/* =========================================================
   API ROOT
========================================================= */

app.get(
  "/api",
  (req, res) => {
    res.json({
      ok: true,
      game: "Sorokiba",
      version: "1.0.0",
      status: "online"
    });
  }
);

/* =========================================================
   FRONTEND
========================================================= */

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

app.use(
  express.static(__dirname)
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {
    res.status(404).json({
      error:
        "Rota não encontrada."
    });
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
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
   START
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
      "ERRO NA INICIALIZAÇÃO DO BANCO:"
    );

    console.error(error);

    console.error(
      "ERRO AO INICIAR SOROKIBA:"
    );

    process.exit(1);
  }
}

start();
