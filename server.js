const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;

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

const sessions = new Map();

/* =========================================================
   CONFIGURAÇÕES DO JOGO
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
    description: "Ajude a manter Sorokiba segura.",
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
    description: "Construa e melhore Sorokiba.",
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
  },

  {
    title: "Contribua para a cidade",
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

/* =========================================================
   INICIALIZAÇÃO / MIGRAÇÃO
========================================================= */

async function initDatabase() {

  console.log("Inicializando banco de dados...");

  /*
    IMPORTANTE:

    Não usamos FOREIGN KEY.

    Isso evita os erros:

    missions_user_id_fkey
    proposals_user_id_fkey
    job_tasks_user_id_fkey
  */

  /* -------------------------------------------------------
     USERS
  ------------------------------------------------------- */

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
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

  /*
    CORREÇÃO DO ERRO:

    users.id estava sem DEFAULT.

    Criamos uma sequence própria e colocamos
    nextval como default.
  */

  await query(`
    CREATE SEQUENCE IF NOT EXISTS users_id_sequence;
  `);

  await query(`
    SELECT setval(
      'users_id_sequence',
      GREATEST(
        COALESCE((SELECT MAX(id) FROM users), 0),
        1
      ),
      true
    );
  `);

  await query(`
    ALTER TABLE users
    ALTER COLUMN id
    SET DEFAULT nextval('users_id_sequence');
  `);

  /* -------------------------------------------------------
     GARANTIR COLUNAS
  ------------------------------------------------------- */

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS money INTEGER NOT NULL DEFAULT 100;
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reputation INTEGER NOT NULL DEFAULT 50;
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS hunger INTEGER NOT NULL DEFAULT 100;
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS health INTEGER NOT NULL DEFAULT 100;
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS job TEXT NOT NULL DEFAULT 'Estudante';
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen';
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  /* -------------------------------------------------------
     CITY
  ------------------------------------------------------- */

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
    );
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
    (1, 0, 100000, 10, 1000, 50, 70, 5)
    ON CONFLICT (id) DO NOTHING;
  `);

  /* -------------------------------------------------------
     NEWS
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     EVENTS
  ------------------------------------------------------- */

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /* -------------------------------------------------------
     PROPOSALS
  ------------------------------------------------------- */

  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      mayor_comment TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS mayor_comment TEXT DEFAULT '';
  `);

  /* -------------------------------------------------------
     MISSIONS
  ------------------------------------------------------- */

  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      mission_date DATE NOT NULL,
      title TEXT NOT NULL,
      xp INTEGER NOT NULL,
      money INTEGER NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, mission_date)
    );
  `);

  /* -------------------------------------------------------
     JOB TASKS
  ------------------------------------------------------- */

  await query(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      task_date DATE NOT NULL,
      job TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, task_date)
    );
  `);

  /*
    Remove constraints antigas caso elas existam.

    Isso corrige bancos que foram criados com
    FOREIGN KEY anteriormente.
  */

  await query(`
    DO $$
    DECLARE
      constraint_record RECORD;
    BEGIN

      FOR constraint_record IN
        SELECT
          tc.table_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (
          'missions',
          'proposals',
          'job_tasks'
        )
      LOOP

        EXECUTE
          'ALTER TABLE '
          || quote_ident(constraint_record.table_name)
          || ' DROP CONSTRAINT IF EXISTS '
          || quote_ident(constraint_record.constraint_name);

      END LOOP;

    END $$;
  `);

  /* -------------------------------------------------------
     SINCRONIZAR POPULAÇÃO
  ------------------------------------------------------- */

  await query(`
    UPDATE city
    SET population = (
      SELECT COUNT(*)
      FROM users
    )
    WHERE id = 1;
  `);

  console.log("Banco de dados inicializado com sucesso.");
}

/* =========================================================
   SENHAS
========================================================= */

function hashPassword(password) {

  const salt = crypto
    .randomBytes(16)
    .toString("hex");

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

    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(originalHash, "hex")
    );

  } catch {

    return false;
  }
}

/* =========================================================
   SESSÕES
========================================================= */

function createSession(userId) {

  const token = crypto
    .randomBytes(32)
    .toString("hex");

  sessions.set(token, userId);

  return token;
}

function getToken(req) {

  const header =
    req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.substring(7);
  }

  return null;
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

    res.status(500).json({
      error: "Erro de autenticação."
    });
  }
}

function mayorOnly(req, res, next) {

  if (req.user.role !== "mayor") {

    return res.status(403).json({
      error: "Apenas o prefeito pode realizar esta ação."
    });
  }

  next();
}

/* =========================================================
   LEVEL
========================================================= */

function calculateLevel(xp) {

  return Math.max(
    1,
    Math.floor(Number(xp || 0) / 500) + 1
  );
}

/* =========================================================
   NECESSIDADES
========================================================= */

async function updateNeeds(user) {

  if (!user.updated_at) {
    return;
  }

  const now = Date.now();

  const updated =
    new Date(user.updated_at).getTime();

  if (!Number.isFinite(updated)) {
    return;
  }

  const hours = Math.floor(
    Math.max(0, now - updated) / 3600000
  );

  if (hours <= 0) {
    return;
  }

  const hungerLoss = hours * 3;

  const newHunger = Math.max(
    0,
    Number(user.hunger || 0) - hungerLoss
  );

  let newHealth =
    Number(user.health || 0);

  if (newHunger <= 20) {

    newHealth = Math.max(
      0,
      newHealth - hours * 2
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
      newHealth,
      user.id
    ]
  );
}

async function getUser(userId) {

  let result = await query(
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

  result = await query(
    `
      SELECT *
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

/* =========================================================
   REGISTER
========================================================= */

app.post("/api/register", async (req, res) => {

  try {

    const name =
      String(req.body.name || "").trim();

    const username =
      String(req.body.username || "")
        .trim()
        .toLowerCase();

    const password =
      String(req.body.password || "");

    if (name.length < 2) {

      return res.status(400).json({
        error: "Digite um nome válido."
      });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {

      return res.status(400).json({
        error:
          "O usuário deve ter de 3 a 20 caracteres e usar apenas letras, números ou _. "
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

    const countResult = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM users
      `
    );

    /*
      PRIMEIRA CONTA = PREFEITO
    */

    const role =
      Number(countResult.rows[0].count) === 0
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
          role,
          money,
          xp,
          reputation,
          hunger,
          health,
          job
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          100,
          0,
          50,
          100,
          100,
          'Estudante'
        )
        RETURNING id, role
      `,
      [
        name,
        username,
        passwordHash,
        role
      ]
    );

    const userId =
      result.rows[0].id;

    await query(`
      UPDATE city
      SET population = population + 1
      WHERE id = 1
    `);

    const token =
      createSession(userId);

    console.log(
      `Nova conta: ${username} | role=${role} | id=${userId}`
    );

    res.json({
      ok: true,
      token,
      role,
      userId
    });

  } catch (error) {

    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      error:
        "Não foi possível criar a conta.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/login", async (req, res) => {

  try {

    const username =
      String(req.body.username || "")
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
        error: "Usuário ou senha incorretos."
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
        error: "Usuário ou senha incorretos."
      });
    }

    const token =
      createSession(user.id);

    res.json({
      ok: true,
      token,
      role: user.role
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
   STATE
========================================================= */

app.get("/api/state", auth, async (req, res) => {

  try {

    const user =
      await getUser(req.user.id);

    if (!user) {

      return res.status(404).json({
        error: "Usuário não encontrado."
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

        level:
          calculateLevel(user.xp),

        reputation:
          user.reputation,

        hunger:
          user.hunger,

        health:
          user.health,

        job:
          user.job
      },

      city:
        cityResult.rows[0],

      news:
        newsResult.rows,

      events:
        eventResult.rows,

      proposals:
        proposalResult.rows
    });

  } catch (error) {

    console.error("STATE ERROR:", error);

    res.status(500).json({
      error: "Erro ao carregar o jogo."
    });
  }
});

/* =========================================================
   JOBS
========================================================= */

app.get("/api/jobs", auth, (req, res) => {

  res.json(JOBS);
});

app.post("/api/job", auth, async (req, res) => {

  try {

    const job =
      String(req.body.job || "");

    if (!JOBS[job]) {

      return res.status(400).json({
        error: "Emprego inválido."
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

    const user =
      await getUser(req.user.id);

    const job =
      JOBS[user.job];

    if (!job) {

      return res.status(400).json({
        error: "Emprego inválido."
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

      job:
        user.job,

      title:
        job.task,

      xp:
        job.taskXP,

      money:
        job.taskMoney,

      done:
        result.rows.length
          ? result.rows[0].done
          : false

    });

  } catch (error) {

    console.error("JOB TASK GET ERROR:", error);

    res.status(500).json({
      error:
        "Erro ao carregar tarefa."
    });
  }
});

app.post("/api/job-task", auth, async (req, res) => {

  try {

    const user =
      await getUser(req.user.id);

    const job =
      JOBS[user.job];

    if (!job) {

      return res.status(400).json({
        error: "Emprego inválido."
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
        DO UPDATE
        SET done = TRUE,
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
          job.taskMoney * 0.10
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
});

/* =========================================================
   MISSÕES
========================================================= */

function getTodayMission() {

  const day =
    new Date().getDate();

  return MISSIONS[
    day % MISSIONS.length
  ];
}

app.get("/api/mission", auth, async (req, res) => {

  try {

    const mission =
      getTodayMission();

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
});

app.post("/api/mission", auth, async (req, res) => {

  try {

    const mission =
      getTodayMission();

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
        DO UPDATE
        SET
          done = TRUE,
          title = EXCLUDED.title,
          xp = EXCLUDED.xp,
          money = EXCLUDED.money
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

    await query(`
      UPDATE city
      SET
        gdp = gdp + $1
      WHERE id = 1
    `, [
      mission.money
    ]);

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
});

/* =========================================================
   MERCADO
========================================================= */

app.get("/api/market", auth, (req, res) => {

  res.json(FOODS);
});

app.post("/api/buy-food", auth, async (req, res) => {

  try {

    const foodName =
      String(req.body.food || "");

    const food =
      FOODS[foodName];

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
          money = money - $1,
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
        SET
          treasury =
            treasury + $1,
          gdp =
            gdp + $2
        WHERE id = 1
      `,
      [
        Math.floor(
          food.price * 0.05
        ),
        food.price
      ]
    );

    res.json({
      ok: true,
      hunger: newHunger
    });

  } catch (error) {

    console.error(
      "FOOD ERROR:",
      error
    );

    res.status(500).json({
      error:
        "Erro ao comprar comida."
    });
  }
});

/* =========================================================
   CUIDAR DA SAÚDE
========================================================= */

app.post("/api/health", auth, async (req, res) => {

  try {

    const user =
      await getUser(req.user.id);

    const PRICE = 50;

    if (
      Number(user.money) <
      PRICE
    ) {

      return res.status(400).json({
        error:
          "Você precisa de $50 para cuidar da saúde."
      });
    }

    const newHealth =
      Math.min(
        100,
        Number(user.health) + 30
      );

    await query(
      `
        UPDATE users
        SET
          money = money - $1,
          health = $2,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        PRICE,
        newHealth,
        user.id
      ]
    );

    await query(`
      UPDATE city
      SET
        treasury =
          treasury + 50
      WHERE id = 1
    `);

    res.json({
      ok: true,
      health: newHealth
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
});

/* =========================================================
   NOTÍCIAS - PREFEITO
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
   EVENTOS - PREFEITO
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
          ($1, $2)
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
   PROPOSTAS
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
            text,
            status,
            mayor_comment
          )
          VALUES
          (
            $1,
            $2,
            $3,
            'Pendente',
            ''
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
   PREFEITO DECIDE PROPOSTA + COMENTÁRIO
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

      const mayorComment =
        String(
          req.body.mayorComment ||
          req.body.comment ||
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
            mayorComment,
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
              ),

            gdp =
              gdp + 1000
          WHERE id = 1
        `);
      }

      res.json({
        ok: true,
        status,
        mayorComment
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
   IMPOSTOS
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
   INFORMAÇÕES DO PREFEITO
========================================================= */

app.get(
  "/api/mayor/dashboard",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const city =
        await query(`
          SELECT *
          FROM city
          WHERE id = 1
        `);

      const users =
        await query(`
          SELECT
            COUNT(*)::int AS population,
            COALESCE(
              SUM(money),
              0
            )::int AS citizens_money,
            COALESCE(
              SUM(xp),
              0
            )::int AS total_xp
          FROM users
        `);

      const proposals =
        await query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status = 'Pendente'
            )::int AS pending,
            COUNT(*) FILTER (
              WHERE status = 'Aprovada'
            )::int AS approved,
            COUNT(*) FILTER (
              WHERE status = 'Recusada'
            )::int AS rejected
          FROM proposals
        `);

      res.json({
        city: city.rows[0],
        users: users.rows[0],
        proposals: proposals.rows[0]
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
   LISTA DE CIDADÃOS - PREFEITO
========================================================= */

app.get(
  "/api/citizens",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const result =
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
          ORDER BY xp DESC
        `);

      res.json({
        users:
          result.rows
      });

    } catch (error) {

      console.error(
        "CITIZENS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar cidadãos."
      });
    }
  }
);

/* =========================================================
   ALTERAR DINHEIRO - PREFEITO
========================================================= */

app.post(
  "/api/mayor/money",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const userId =
        Number(req.body.userId);

      const amount =
        Number(req.body.amount);

      if (
        !Number.isInteger(userId) ||
        !Number.isFinite(amount)
      ) {

        return res.status(400).json({
          error:
            "Dados inválidos."
        });
      }

      const result =
        await query(
          `
            UPDATE users
            SET
              money =
                GREATEST(
                  0,
                  money + $1
                ),
              updated_at =
                CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING
              id,
              money
          `,
          [
            amount,
            userId
          ]
        );

      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "Cidadão não encontrado."
        });
      }

      res.json({
        ok: true,
        user: result.rows[0]
      });

    } catch (error) {

      console.error(
        "MAYOR MONEY ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao alterar dinheiro."
      });
    }
  }
);

/* =========================================================
   ALTERAR XP - PREFEITO
========================================================= */

app.post(
  "/api/mayor/xp",
  auth,
  mayorOnly,
  async (req, res) => {

    try {

      const userId =
        Number(req.body.userId);

      const amount =
        Number(req.body.amount);

      if (
        !Number.isInteger(userId) ||
        !Number.isFinite(amount)
      ) {

        return res.status(400).json({
          error:
            "Dados inválidos."
        });
      }

      const result =
        await query(
          `
            UPDATE users
            SET
              xp =
                GREATEST(
                  0,
                  xp + $1
                ),
              updated_at =
                CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING
              id,
              xp
          `,
          [
            amount,
            userId
          ]
        );

      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "Cidadão não encontrado."
        });
      }

      res.json({
        ok: true,
        user: result.rows[0]
      });

    } catch (error) {

      console.error(
        "MAYOR XP ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao alterar XP."
      });
    }
  }
);

/* =========================================================
   ROTA DE TESTE DO BANCO
========================================================= */

app.get(
  "/api/healthcheck",
  async (req, res) => {

    try {

      await query("SELECT 1");

      res.json({
        ok: true,
        game: "Sorokiba",
        database: "connected"
      });

    } catch (error) {

      console.error(
        "HEALTHCHECK ERROR:",
        error
      );

      res.status(500).json({
        ok: false,
        game: "Sorokiba",
        database: "error"
      });
    }
  }
);

/* =========================================================
   FRONT-END
========================================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

app.use(
  express.static(__dirname)
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {

    if (
      req.path.startsWith("/api/")
    ) {

      return res.status(404).json({
        error:
          "API não encontrada."
      });
    }

    res.status(404).send(
      "Página não encontrada."
    );
  }
);

/* =========================================================
   ERRO GLOBAL
========================================================= */

app.use(
  (error, req, res, next) => {

    console.error(
      "GLOBAL ERROR:",
      error
    );

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
      "ERRO AO INICIAR SOROKIBA:"
    );

    console.error(error);

    process.exit(1);
  }
}

start();
