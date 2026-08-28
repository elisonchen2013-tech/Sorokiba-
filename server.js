 const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = Number(process.env.PORT) || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERRO: configure DATABASE_URL nas Environment Variables do Render.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

/* =========================
   SESSÕES
========================= */

const sessions = new Map();
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    userId: String(userId),
    createdAt: Date.now()
  });

  return token;
}

function getToken(req) {
  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }

  return null;
}

function deleteExpiredSessions() {
  const now = Date.now();

  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_MAX_AGE) {
      sessions.delete(token);
    }
  }
}

setInterval(deleteExpiredSessions, 60 * 60 * 1000).unref();

/* =========================
   SENHAS
========================= */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(String(password), salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  try {
    const parts = String(stored).split(":");

    if (parts.length !== 2) return false;

    const salt = parts[0];
    const originalHash = Buffer.from(parts[1], "hex");
    const hash = crypto.scryptSync(String(password), salt, 64);

    if (hash.length !== originalHash.length) return false;

    return crypto.timingSafeEqual(hash, originalHash);
  } catch {
    return false;
  }
}

/* =========================
   UTILITÁRIOS
========================= */

function sanitizeText(value, maxLength = 5000) {
  return String(value ?? "")
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

function normalizeUsername(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 30);
}

function makeId() {
  return crypto.randomUUID();
}

function calculateLevel(xp) {
  return Math.max(1, Math.floor(Number(xp || 0) / 500) + 1);
}

function xpForNextLevel(xp) {
  return calculateLevel(xp) * 500;
}

/* =========================
   EMPREGOS
========================= */

const JOBS = {
  Estudante: {
    requiredXP: 0,
    salary: 20,
    description: "Estude e ajude no desenvolvimento da cidade.",
    task: "Estudar por 30 minutos",
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
    task: "Patrulhar a cidade",
    taskXP: 80,
    taskMoney: 120
  },

  Médico: {
    requiredXP: 1000,
    salary: 180,
    description: "Cuide da saúde dos cidadãos.",
    task: "Atender um paciente",
    taskXP: 100,
    taskMoney: 180
  },

  Engenheiro: {
    requiredXP: 1500,
    salary: 250,
    description: "Ajude a construir e melhorar Sorokiba.",
    task: "Trabalhar em uma obra",
    taskXP: 130,
    taskMoney: 250
  },

  Professor: {
    requiredXP: 2200,
    salary: 300,
    description: "Ensine e ajude outros cidadãos.",
    task: "Dar uma aula",
    taskXP: 160,
    taskMoney: 300
  },

  Cientista: {
    requiredXP: 3000,
    salary: 400,
    description: "Pesquise novas soluções para Sorokiba.",
    task: "Realizar uma pesquisa",
    taskXP: 200,
    taskMoney: 400
  }
};

/* =========================
   COMIDAS
========================= */

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

/* =========================
   MISSÕES
========================= */

const DAILY_MISSIONS = [
  {
    title: "Ajude Sorokiba hoje",
    description: "Faça algo positivo pelo desenvolvimento da cidade.",
    xp: 50,
    money: 50
  },

  {
    title: "Cidadão ativo",
    description: "Participe da vida de Sorokiba.",
    xp: 75,
    money: 75
  },

  {
    title: "Construa o futuro",
    description: "Contribua para o crescimento da cidade.",
    xp: 100,
    money: 100
  }
];

function getDailyMission() {
  const dayNumber = Math.floor(Date.now() / 86400000);

  return DAILY_MISSIONS[
    dayNumber % DAILY_MISSIONS.length
  ];
}

/* =========================
   BANCO DE DADOS
========================= */

async function initDatabase() {

  console.log("Inicializando banco de dados...");

  /*
   * USERS
   *
   * O ID é TEXT.
   * O servidor gera UUID automaticamente.
   *
   * Isso elimina o erro:
   *
   * null value in column "id"
   *
   * e evita conflito com sequências antigas.
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
   * Se o banco já existia com id numérico,
   * não tentamos destruir a tabela.
   *
   * A aplicação trabalha com o ID existente.
   */

  await query(`
    CREATE TABLE IF NOT EXISTS city (
      id INTEGER PRIMARY KEY DEFAULT 1,
      population INTEGER NOT NULL DEFAULT 0,
      gdp BIGINT NOT NULL DEFAULT 100000,
      territory INTEGER NOT NULL DEFAULT 10,
      treasury BIGINT NOT NULL DEFAULT 1000,
      infrastructure INTEGER NOT NULL DEFAULT 50,
      quality INTEGER NOT NULL DEFAULT 70,
      tax INTEGER NOT NULL DEFAULT 5,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  await query(`
    CREATE TABLE IF NOT EXISTS news (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Comunicado',
      author TEXT NOT NULL DEFAULT 'Prefeitura',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      mayor_comment TEXT NOT NULL DEFAULT '',
      decided_by TEXT NOT NULL DEFAULT '',
      decided_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      mission_date DATE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      xp INTEGER NOT NULL,
      money INTEGER NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, mission_date)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_date DATE NOT NULL,
      job TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, task_date)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Banco de dados inicializado com sucesso.");
}
/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function findUserById(id) {
  const result = await query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [String(id)]
  );

  return result.rows[0] || null;
}

async function findUserByUsername(username) {
  const result = await query(
    `SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username]
  );

  return result.rows[0] || null;
}

async function getUserFromRequest(req) {
  const token = getToken(req);

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
    sessions.delete(token);
    return null;
  }

  return findUserById(session.userId);
}

function requireAuth(req, res, next) {
  getUserFromRequest(req)
    .then(user => {
      if (!user) {
        return res.status(401).json({
          ok: false,
          error: "Não autenticado."
        });
      }

      req.user = user;
      req.token = getToken(req);
      next();
    })
    .catch(error => {
      console.error("AUTH ERROR:", error);

      res.status(500).json({
        ok: false,
        error: "Erro ao verificar autenticação."
      });
    });
}

function requireMayor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: "Não autenticado."
    });
  }

  if (req.user.role !== "mayor") {
    return res.status(403).json({
      ok: false,
      error: "Apenas o prefeito pode realizar esta ação."
    });
  }

  next();
}

/* =========================================================
   FORMATAR USUÁRIO
========================================================= */

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    money: Number(user.money || 0),
    xp: Number(user.xp || 0),
    level: calculateLevel(user.xp),
    reputation: Number(user.reputation || 0),
    hunger: Number(user.hunger || 0),
    health: Number(user.health || 0),
    job: user.job || "Estudante",
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/* =========================================================
   CADASTRO
========================================================= */

app.post("/api/register", async (req, res) => {

  try {

    const name = sanitizeText(req.body.name, 80);
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Digite seu nome."
      });
    }

    if (!username) {
      return res.status(400).json({
        ok: false,
        error: "Digite um nome de usuário válido."
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        ok: false,
        error: "O usuário precisa ter pelo menos 3 caracteres."
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        ok: false,
        error: "A senha precisa ter pelo menos 4 caracteres."
      });
    }

    const existing = await findUserByUsername(username);

    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "Este nome de usuário já está cadastrado."
      });
    }

    /*
     * PRIMEIRA CONTA
     *
     * Se não existir nenhum usuário,
     * esta conta será automaticamente o prefeito.
     */

    const countResult = await query(
      `SELECT COUNT(*)::integer AS total FROM users`
    );

    const totalUsers = Number(countResult.rows[0]?.total || 0);

    const role = totalUsers === 0 ? "mayor" : "citizen";

    /*
     * ID GERADO PELO SERVIDOR
     *
     * Não usamos:
     *
     * MAX(id) + 1
     *
     * nem sequence.
     *
     * Assim evitamos o problema:
     *
     * null value in column "id"
     */

    const id = makeId();

    const passwordHash = hashPassword(password);

    const result = await query(
      `
      INSERT INTO users
      (
        id,
        name,
        username,
        password_hash,
        role,
        money,
        xp,
        reputation,
        hunger,
        health,
        job,
        created_at,
        updated_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        id,
        name,
        username,
        passwordHash,
        role,
        role === "mayor" ? 500 : 100,
        0,
        50,
        100,
        100,
        "Estudante"
      ]
    );

    const user = result.rows[0];

    /*
     * Atualiza população da cidade.
     */

    await query(`
      UPDATE city
      SET
        population = (
          SELECT COUNT(*)
          FROM users
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);

    /*
     * Cria a missão diária do novo jogador.
     */

    const mission = getDailyMission();

    await query(
      `
      INSERT INTO missions
      (
        user_id,
        mission_date,
        title,
        description,
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
        $5,
        FALSE
      )
      ON CONFLICT (user_id, mission_date) DO NOTHING
      `,
      [
        user.id,
        mission.title,
        mission.description,
        mission.xp,
        mission.money
      ]
    );

    const token = createSession(user.id);

    console.log(
      `Nova conta criada: ${user.username} | cargo: ${user.role}`
    );

    return res.status(201).json({
      ok: true,
      message:
        role === "mayor"
          ? "Conta criada! Você é o primeiro prefeito de Sorokiba."
          : "Conta criada com sucesso.",
      token,
      user: publicUser(user),
      firstUser: role === "mayor"
    });

  } catch (error) {

    console.error("REGISTER ERROR:", error);

    /*
     * Erros comuns do PostgreSQL
     */

    if (error.code === "23505") {
      return res.status(409).json({
        ok: false,
        error: "Este usuário já existe."
      });
    }

    if (error.code === "23502") {
      return res.status(500).json({
        ok: false,
        error:
          "O banco ainda possui uma estrutura antiga na tabela users. Faça o deploy novamente com este server.js."
      });
    }

    return res.status(500).json({
      ok: false,
      error: "Não foi possível criar a conta.",
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

    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        error: "Digite usuário e senha."
      });
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "Usuário ou senha incorretos."
      });
    }

    const valid = checkPassword(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: "Usuário ou senha incorretos."
      });
    }

    const token = createSession(user.id);

    await query(
      `
      UPDATE users
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [user.id]
    );

    console.log(`Login realizado: ${user.username}`);

    return res.json({
      ok: true,
      message: "Login realizado com sucesso.",
      token,
      user: publicUser(user)
    });

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível entrar na conta."
    });
  }
});

/* =========================================================
   LOGOUT
========================================================= */

app.post("/api/logout", requireAuth, async (req, res) => {

  try {

    if (req.token) {
      sessions.delete(req.token);
    }

    return res.json({
      ok: true,
      message: "Você saiu da conta."
    });

  } catch (error) {

    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Erro ao sair da conta."
    });
  }
});

/* =========================================================
   USUÁRIO ATUAL
========================================================= */

app.get("/api/me", requireAuth, async (req, res) => {

  try {

    const user = await findUserById(req.user.id);

    return res.json({
      ok: true,
      user: publicUser(user)
    });

  } catch (error) {

    console.error("ME ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar sua conta."
    });
  }
});

/* =========================================================
   ESTADO COMPLETO DO JOGO
========================================================= */

app.get("/api/state", requireAuth, async (req, res) => {

  try {

    const userResult = await query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "Usuário não encontrado."
      });
    }

    const cityResult = await query(
      `SELECT * FROM city WHERE id = 1 LIMIT 1`
    );

    const newsResult = await query(`
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
      LIMIT 30
    `);

    const eventsResult = await query(`
      SELECT
        id,
        title,
        text,
        created_at
      FROM events
      ORDER BY created_at DESC
      LIMIT 30
    `);

    const proposalsResult = await query(`
      SELECT
        id,
        author,
        text,
        status,
        mayor_comment,
        decided_by,
        decided_at,
        created_at
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const missionResult = await query(
      `
      SELECT *
      FROM missions
      WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      LIMIT 1
      `,
      [user.id]
    );

    const jobTaskResult = await query(
      `
      SELECT *
      FROM job_tasks
      WHERE user_id = $1
        AND task_date = CURRENT_DATE
      LIMIT 1
      `,
      [user.id]
    );

    return res.json({
      ok: true,

      user: publicUser(user),

      city: cityResult.rows[0]
        ? {
            population: Number(cityResult.rows[0].population || 0),
            gdp: Number(cityResult.rows[0].gdp || 0),
            territory: Number(cityResult.rows[0].territory || 0),
            treasury: Number(cityResult.rows[0].treasury || 0),
            infrastructure: Number(
              cityResult.rows[0].infrastructure || 0
            ),
            quality: Number(
              cityResult.rows[0].quality || 0
            ),
            tax: Number(cityResult.rows[0].tax || 0)
          }
        : null,

      jobs: JOBS,

      foods: FOODS,

      news: newsResult.rows,

      events: eventsResult.rows,

      proposals: proposalsResult.rows,

      mission: missionResult.rows[0] || null,

      jobTask: jobTaskResult.rows[0] || null,

      isMayor: user.role === "mayor"
    });

  } catch (error) {

    console.error("STATE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar os dados de Sorokiba."
    });
  }
});

/* =========================================================
   LISTA DE EMPREGOS
========================================================= */

app.get("/api/jobs", requireAuth, async (req, res) => {

  try {

    const jobs = Object.entries(JOBS).map(
      ([name, data]) => ({
        name,
        ...data,
        unlocked:
          Number(req.user.xp || 0) >=
          Number(data.requiredXP || 0)
      })
    );

    return res.json({
      ok: true,
      jobs
    });

  } catch (error) {

    console.error("JOBS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar os empregos."
    });
  }
});

/* =========================================================
   ESCOLHER EMPREGO
========================================================= */

app.post("/api/jobs/select", requireAuth, async (req, res) => {

  try {

    const job = sanitizeText(req.body.job, 100);

    if (!JOBS[job]) {
      return res.status(400).json({
        ok: false,
        error: "Esse emprego não existe."
      });
    }

    const requiredXP = Number(
      JOBS[job].requiredXP || 0
    );

    const userXP = Number(req.user.xp || 0);

    if (userXP < requiredXP) {
      return res.status(403).json({
        ok: false,
        error:
          `Você precisa de ${requiredXP} XP para desbloquear este emprego.`
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
      [job, req.user.id]
    );

    const updated = await findUserById(req.user.id);

    return res.json({
      ok: true,
      message: `Você agora trabalha como ${job}.`,
      user: publicUser(updated)
    });

  } catch (error) {

    console.error("SELECT JOB ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível escolher o emprego."
    });
  }
});

/* =========================================================
   REALIZAR TAREFA DO EMPREGO
========================================================= */

app.post("/api/jobs/task", requireAuth, async (req, res) => {

  try {

    const user = await findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "Usuário não encontrado."
      });
    }

    const job = user.job || "Estudante";
    const jobData = JOBS[job];

    if (!jobData) {
      return res.status(400).json({
        ok: false,
        error: "Emprego inválido."
      });
    }

    const existing = await query(
      `
      SELECT *
      FROM job_tasks
      WHERE user_id = $1
        AND task_date = CURRENT_DATE
      LIMIT 1
      `,
      [user.id]
    );

    if (existing.rows[0]?.done) {
      return res.status(400).json({
        ok: false,
        error: "Você já completou a tarefa de hoje."
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
      DO UPDATE SET
        done = TRUE,
        job = EXCLUDED.job
      `,
      [user.id, job]
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
        Number(jobData.taskXP || 0),
        Number(jobData.taskMoney || 0),
        user.id
      ]
    );

    await query(
      `
      INSERT INTO transactions
      (
        user_id,
        type,
        amount,
        description
      )
      VALUES
      (
        $1,
        'job',
        $2,
        $3
      )
      `,
      [
        user.id,
        Number(jobData.taskMoney || 0),
        `Tarefa de emprego: ${job}`
      ]
    );

    const updated = await findUserById(user.id);

    return res.json({
      ok: true,
      message: "Tarefa concluída!",
      reward: {
        xp: Number(jobData.taskXP || 0),
        money: Number(jobData.taskMoney || 0)
      },
      user: publicUser(updated)
    });

  } catch (error) {

    console.error("JOB TASK ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível concluir a tarefa."
    });
  }
});
/* =========================================================
   MISSÃO DIÁRIA
========================================================= */

app.get("/api/missions", requireAuth, async (req, res) => {
  try {
    const mission = getDailyMission();

    await query(
      `
      INSERT INTO missions
      (
        user_id,
        mission_date,
        title,
        description,
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
        $5,
        FALSE
      )
      ON CONFLICT (user_id, mission_date) DO NOTHING
      `,
      [
        req.user.id,
        mission.title,
        mission.description,
        mission.xp,
        mission.money
      ]
    );

    const result = await query(
      `
      SELECT *
      FROM missions
      WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      LIMIT 1
      `,
      [req.user.id]
    );

    return res.json({
      ok: true,
      mission: result.rows[0] || null
    });

  } catch (error) {
    console.error("MISSIONS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar a missão."
    });
  }
});


/* =========================================================
   CONCLUIR MISSÃO
========================================================= */

app.post("/api/missions/complete", requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const missionResult = await client.query(
      `
      SELECT *
      FROM missions
      WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      FOR UPDATE
      `,
      [req.user.id]
    );

    let mission = missionResult.rows[0];

    if (!mission) {
      const daily = getDailyMission();

      const created = await client.query(
        `
        INSERT INTO missions
        (
          user_id,
          mission_date,
          title,
          description,
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
          $5,
          FALSE
        )
        RETURNING *
        `,
        [
          req.user.id,
          daily.title,
          daily.description,
          daily.xp,
          daily.money
        ]
      );

      mission = created.rows[0];
    }

    if (mission.done) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        error: "Você já completou a missão de hoje."
      });
    }

    const xpReward = Number(mission.xp || 0);
    const moneyReward = Number(mission.money || 0);

    await client.query(
      `
      UPDATE missions
      SET done = TRUE
      WHERE id = $1
      `,
      [mission.id]
    );

    await client.query(
      `
      UPDATE users
      SET
        xp = xp + $1,
        money = money + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        xpReward,
        moneyReward,
        req.user.id
      ]
    );

    await client.query(
      `
      INSERT INTO transactions
      (
        user_id,
        type,
        amount,
        description
      )
      VALUES
      (
        $1,
        'mission',
        $2,
        $3
      )
      `,
      [
        req.user.id,
        moneyReward,
        `Missão diária: ${mission.title}`
      ]
    );

    await client.query("COMMIT");

    const updated = await findUserById(req.user.id);

    return res.json({
      ok: true,
      message: "Missão concluída!",
      reward: {
        xp: xpReward,
        money: moneyReward
      },
      user: publicUser(updated)
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error("MISSION COMPLETE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível concluir a missão."
    });

  } finally {
    client.release();
  }
});


/* =========================================================
   COMIDA
========================================================= */

app.get("/api/food", requireAuth, async (req, res) => {

  try {

    const foods = Object.entries(FOODS).map(
      ([name, data]) => ({
        name,
        price: Number(data.price),
        hunger: Number(data.hunger)
      })
    );

    return res.json({
      ok: true,
      foods
    });

  } catch (error) {

    console.error("FOOD LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar a comida."
    });
  }
});


/* =========================================================
   COMPRAR COMIDA
========================================================= */

app.post("/api/food/buy", requireAuth, async (req, res) => {

  const client = await pool.connect();

  try {

    const foodName = sanitizeText(
      req.body.food,
      100
    );

    const food = FOODS[foodName];

    if (!food) {
      return res.status(400).json({
        ok: false,
        error: "Comida não encontrada."
      });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        error: "Usuário não encontrado."
      });
    }

    const price = Number(food.price);
    const hunger = Number(food.hunger);

    if (Number(user.money) < price) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        error: "Você não tem dinheiro suficiente."
      });
    }

    const newHunger = Math.min(
      100,
      Number(user.hunger || 0) + hunger
    );

    await client.query(
      `
      UPDATE users
      SET
        money = money - $1,
        hunger = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        price,
        newHunger,
        user.id
      ]
    );

    await client.query(
      `
      INSERT INTO transactions
      (
        user_id,
        type,
        amount,
        description
      )
      VALUES
      (
        $1,
        'food',
        $2,
        $3
      )
      `,
      [
        user.id,
        -price,
        `Compra de ${foodName}`
      ]
    );

    await client.query("COMMIT");

    const updated = await findUserById(user.id);

    return res.json({
      ok: true,
      message: `${foodName} comprado!`,
      user: publicUser(updated)
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error("FOOD BUY ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível comprar a comida."
    });

  } finally {
    client.release();
  }
});


/* =========================================================
   PROPOSTAS
========================================================= */

app.get("/api/proposals", requireAuth, async (req, res) => {

  try {

    const result = await query(`
      SELECT
        id,
        author,
        text,
        status,
        mayor_comment,
        decided_by,
        decided_at,
        created_at
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return res.json({
      ok: true,
      proposals: result.rows
    });

  } catch (error) {

    console.error("PROPOSALS LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar as propostas."
    });
  }
});


/* =========================================================
   CRIAR PROPOSTA
========================================================= */

app.post("/api/proposals", requireAuth, async (req, res) => {

  try {

    const text = sanitizeText(
      req.body.text,
      3000
    );

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "Escreva sua ideia antes de enviar."
      });
    }

    const result = await query(
      `
      INSERT INTO proposals
      (
        user_id,
        author,
        text,
        status,
        mayor_comment,
        decided_by
      )
      VALUES
      (
        $1,
        $2,
        $3,
        'Pendente',
        '',
        ''
      )
      RETURNING *
      `,
      [
        req.user.id,
        req.user.name,
        text
      ]
    );

    return res.status(201).json({
      ok: true,
      message: "Proposta enviada ao prefeito.",
      proposal: result.rows[0]
    });

  } catch (error) {

    console.error("PROPOSAL CREATE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível enviar a proposta."
    });
  }
});


/* =========================================================
   PREFEITO — DECIDIR PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id/decide",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const proposalId = Number(req.params.id);

      if (!Number.isInteger(proposalId)) {
        return res.status(400).json({
          ok: false,
          error: "ID da proposta inválido."
        });
      }

      const status = sanitizeText(
        req.body.status,
        30
      );

      const allowedStatuses = [
        "Aprovada",
        "Recusada",
        "Em análise",
        "Pendente"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          ok: false,
          error: "Status inválido."
        });
      }

      const result = await query(
        `
        UPDATE proposals
        SET
          status = $1,
          decided_by = $2,
          decided_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        `,
        [
          status,
          req.user.name,
          proposalId
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          ok: false,
          error: "Proposta não encontrada."
        });
      }

      return res.json({
        ok: true,
        message: "Decisão registrada.",
        proposal: result.rows[0]
      });

    } catch (error) {

      console.error("PROPOSAL DECIDE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível decidir a proposta."
      });
    }
  }
);


/* =========================================================
   PREFEITO — COMENTAR PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id/comment",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const proposalId = Number(req.params.id);

      if (!Number.isInteger(proposalId)) {
        return res.status(400).json({
          ok: false,
          error: "ID da proposta inválido."
        });
      }

      const comment = sanitizeText(
        req.body.comment,
        3000
      );

      if (!comment) {
        return res.status(400).json({
          ok: false,
          error: "Digite um comentário."
        });
      }

      const result = await query(
        `
        UPDATE proposals
        SET
          mayor_comment = $1,
          decided_by = $2
        WHERE id = $3
        RETURNING *
        `,
        [
          comment,
          req.user.name,
          proposalId
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          ok: false,
          error: "Proposta não encontrada."
        });
      }

      return res.json({
        ok: true,
        message: "Comentário do prefeito publicado.",
        proposal: result.rows[0]
      });

    } catch (error) {

      console.error("PROPOSAL COMMENT ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível publicar o comentário."
      });
    }
  }
);


/* =========================================================
   NOTÍCIAS
========================================================= */

app.get("/api/news", async (req, res) => {

  try {

    const result = await query(`
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
      LIMIT 50
    `);

    return res.json({
      ok: true,
      news: result.rows
    });

  } catch (error) {

    console.error("NEWS LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar as notícias."
    });
  }
});


/* =========================================================
   PREFEITO — CRIAR NOTÍCIA
========================================================= */

app.post(
  "/api/news",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const title = sanitizeText(
        req.body.title,
        200
      );

      const text = sanitizeText(
        req.body.text,
        10000
      );

      const image = sanitizeText(
        req.body.image,
        1000
      );

      const category = sanitizeText(
        req.body.category || "Comunicado",
        100
      );

      if (!title || !text) {
        return res.status(400).json({
          ok: false,
          error: "Título e texto são obrigatórios."
        });
      }

      const result = await query(
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
        RETURNING *
        `,
        [
          title,
          text,
          image,
          category,
          req.user.name
        ]
      );

      return res.status(201).json({
        ok: true,
        message: "Notícia publicada.",
        news: result.rows[0]
      });

    } catch (error) {

      console.error("NEWS CREATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível publicar a notícia."
      });
    }
  }
);


/* =========================================================
   PREFEITO — EXCLUIR NOTÍCIA
========================================================= */

app.delete(
  "/api/news/:id",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          error: "ID inválido."
        });
      }

      const result = await query(
        `
        DELETE FROM news
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          ok: false,
          error: "Notícia não encontrada."
        });
      }

      return res.json({
        ok: true,
        message: "Notícia excluída."
      });

    } catch (error) {

      console.error("NEWS DELETE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível excluir a notícia."
      });
    }
  }
);


/* =========================================================
   EVENTOS
========================================================= */

app.get("/api/events", async (req, res) => {

  try {

    const result = await query(`
      SELECT
        id,
        title,
        text,
        created_at
      FROM events
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return res.json({
      ok: true,
      events: result.rows
    });

  } catch (error) {

    console.error("EVENTS LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar os eventos."
    });
  }
});


/* =========================================================
   PREFEITO — CRIAR EVENTO
========================================================= */

app.post(
  "/api/events",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const title = sanitizeText(
        req.body.title,
        200
      );

      const text = sanitizeText(
        req.body.text,
        5000
      );

      if (!title || !text) {
        return res.status(400).json({
          ok: false,
          error: "Título e descrição são obrigatórios."
        });
      }

      const result = await query(
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
        RETURNING *
        `,
        [
          title,
          text
        ]
      );

      return res.status(201).json({
        ok: true,
        message: "Evento criado.",
        event: result.rows[0]
      });

    } catch (error) {

      console.error("EVENT CREATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível criar o evento."
      });
    }
  }
);


/* =========================================================
   TRANSAÇÕES DO USUÁRIO
========================================================= */

app.get(
  "/api/transactions",
  requireAuth,
  async (req, res) => {

    try {

      const result = await query(
        `
        SELECT
          id,
          type,
          amount,
          description,
          created_at
        FROM transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
        `,
        [req.user.id]
      );

      return res.json({
        ok: true,
        transactions: result.rows
      });

    } catch (error) {

      console.error("TRANSACTIONS ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível carregar suas transações."
      });
    }
  }
);


/* =========================================================
   PERFIL
========================================================= */

app.get(
  "/api/profile",
  requireAuth,
  async (req, res) => {

    try {

      const user = await findUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: "Usuário não encontrado."
        });
      }

      return res.json({
        ok: true,
        profile: publicUser(user)
      });

    } catch (error) {

      console.error("PROFILE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível carregar o perfil."
      });
    }
  }
);


/* =========================================================
   ALTERAR NOME
========================================================= */

app.patch(
  "/api/profile/name",
  requireAuth,
  async (req, res) => {

    try {

      const name = sanitizeText(
        req.body.name,
        80
      );

      if (!name) {
        return res.status(400).json({
          ok: false,
          error: "Nome inválido."
        });
      }

      await query(
        `
        UPDATE users
        SET
          name = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          name,
          req.user.id
        ]
      );

      const user = await findUserById(req.user.id);

      return res.json({
        ok: true,
        message: "Nome atualizado.",
        user: publicUser(user)
      });

    } catch (error) {

      console.error("NAME UPDATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível alterar o nome."
      });
    }
  }
);


/* =========================================================
   ALTERAR SENHA
========================================================= */

app.patch(
  "/api/profile/password",
  requireAuth,
  async (req, res) => {

    try {

      const currentPassword = String(
        req.body.currentPassword || ""
      );

      const newPassword = String(
        req.body.newPassword || ""
      );

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          ok: false,
          error: "Preencha as duas senhas."
        });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({
          ok: false,
          error:
            "A nova senha precisa ter pelo menos 4 caracteres."
        });
      }

      const user = await findUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: "Usuário não encontrado."
        });
      }

      if (
        !checkPassword(
          currentPassword,
          user.password_hash
        )
      ) {
        return res.status(401).json({
          ok: false,
          error: "Senha atual incorreta."
        });
      }

      const newHash = hashPassword(newPassword);

      await query(
        `
        UPDATE users
        SET
          password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          newHash,
          user.id
        ]
      );

      /*
       * Derruba as sessões antigas por segurança.
       */

      for (const [
        token,
        session
      ] of sessions.entries()) {

        if (
          String(session.userId) ===
          String(user.id)
        ) {
          sessions.delete(token);
        }
      }

      const newToken = createSession(user.id);

      return res.json({
        ok: true,
        message: "Senha alterada.",
        token: newToken
      });

    } catch (error) {

      console.error("PASSWORD UPDATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível alterar a senha."
      });
    }
  }
);
/* =========================================================
   MISSÃO DIÁRIA
========================================================= */

app.get("/api/missions", requireAuth, async (req, res) => {
  try {
    const mission = getDailyMission();

    await query(
      `
      INSERT INTO missions
      (
        user_id,
        mission_date,
        title,
        description,
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
        $5,
        FALSE
      )
      ON CONFLICT (user_id, mission_date) DO NOTHING
      `,
      [
        req.user.id,
        mission.title,
        mission.description,
        mission.xp,
        mission.money
      ]
    );

    const result = await query(
      `
      SELECT *
      FROM missions
      WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      LIMIT 1
      `,
      [req.user.id]
    );

    return res.json({
      ok: true,
      mission: result.rows[0] || null
    });

  } catch (error) {
    console.error("MISSIONS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar a missão."
    });
  }
});


/* =========================================================
   CONCLUIR MISSÃO
========================================================= */

app.post("/api/missions/complete", requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const missionResult = await client.query(
      `
      SELECT *
      FROM missions
      WHERE user_id = $1
        AND mission_date = CURRENT_DATE
      FOR UPDATE
      `,
      [req.user.id]
    );

    let mission = missionResult.rows[0];

    if (!mission) {
      const daily = getDailyMission();

      const created = await client.query(
        `
        INSERT INTO missions
        (
          user_id,
          mission_date,
          title,
          description,
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
          $5,
          FALSE
        )
        RETURNING *
        `,
        [
          req.user.id,
          daily.title,
          daily.description,
          daily.xp,
          daily.money
        ]
      );

      mission = created.rows[0];
    }

    if (mission.done) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        error: "Você já completou a missão de hoje."
      });
    }

    const xpReward = Number(mission.xp || 0);
    const moneyReward = Number(mission.money || 0);

    await client.query(
      `
      UPDATE missions
      SET done = TRUE
      WHERE id = $1
      `,
      [mission.id]
    );

    await client.query(
      `
      UPDATE users
      SET
        xp = xp + $1,
        money = money + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        xpReward,
        moneyReward,
        req.user.id
      ]
    );

    await client.query(
      `
      INSERT INTO transactions
      (
        user_id,
        type,
        amount,
        description
      )
      VALUES
      (
        $1,
        'mission',
        $2,
        $3
      )
      `,
      [
        req.user.id,
        moneyReward,
        `Missão diária: ${mission.title}`
      ]
    );

    await client.query("COMMIT");

    const updated = await findUserById(req.user.id);

    return res.json({
      ok: true,
      message: "Missão concluída!",
      reward: {
        xp: xpReward,
        money: moneyReward
      },
      user: publicUser(updated)
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error("MISSION COMPLETE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível concluir a missão."
    });

  } finally {
    client.release();
  }
});


/* =========================================================
   COMIDA
========================================================= */

app.get("/api/food", requireAuth, async (req, res) => {

  try {

    const foods = Object.entries(FOODS).map(
      ([name, data]) => ({
        name,
        price: Number(data.price),
        hunger: Number(data.hunger)
      })
    );

    return res.json({
      ok: true,
      foods
    });

  } catch (error) {

    console.error("FOOD LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar a comida."
    });
  }
});


/* =========================================================
   COMPRAR COMIDA
========================================================= */

app.post("/api/food/buy", requireAuth, async (req, res) => {

  const client = await pool.connect();

  try {

    const foodName = sanitizeText(
      req.body.food,
      100
    );

    const food = FOODS[foodName];

    if (!food) {
      return res.status(400).json({
        ok: false,
        error: "Comida não encontrada."
      });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [req.user.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        error: "Usuário não encontrado."
      });
    }

    const price = Number(food.price);
    const hunger = Number(food.hunger);

    if (Number(user.money) < price) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        error: "Você não tem dinheiro suficiente."
      });
    }

    const newHunger = Math.min(
      100,
      Number(user.hunger || 0) + hunger
    );

    await client.query(
      `
      UPDATE users
      SET
        money = money - $1,
        hunger = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        price,
        newHunger,
        user.id
      ]
    );

    await client.query(
      `
      INSERT INTO transactions
      (
        user_id,
        type,
        amount,
        description
      )
      VALUES
      (
        $1,
        'food',
        $2,
        $3
      )
      `,
      [
        user.id,
        -price,
        `Compra de ${foodName}`
      ]
    );

    await client.query("COMMIT");

    const updated = await findUserById(user.id);

    return res.json({
      ok: true,
      message: `${foodName} comprado!`,
      user: publicUser(updated)
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error("FOOD BUY ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível comprar a comida."
    });

  } finally {
    client.release();
  }
});


/* =========================================================
   PROPOSTAS
========================================================= */

app.get("/api/proposals", requireAuth, async (req, res) => {

  try {

    const result = await query(`
      SELECT
        id,
        author,
        text,
        status,
        mayor_comment,
        decided_by,
        decided_at,
        created_at
      FROM proposals
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return res.json({
      ok: true,
      proposals: result.rows
    });

  } catch (error) {

    console.error("PROPOSALS LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar as propostas."
    });
  }
});


/* =========================================================
   CRIAR PROPOSTA
========================================================= */

app.post("/api/proposals", requireAuth, async (req, res) => {

  try {

    const text = sanitizeText(
      req.body.text,
      3000
    );

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "Escreva sua ideia antes de enviar."
      });
    }

    const result = await query(
      `
      INSERT INTO proposals
      (
        user_id,
        author,
        text,
        status,
        mayor_comment,
        decided_by
      )
      VALUES
      (
        $1,
        $2,
        $3,
        'Pendente',
        '',
        ''
      )
      RETURNING *
      `,
      [
        req.user.id,
        req.user.name,
        text
      ]
    );

    return res.status(201).json({
      ok: true,
      message: "Proposta enviada ao prefeito.",
      proposal: result.rows[0]
    });

  } catch (error) {

    console.error("PROPOSAL CREATE ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível enviar a proposta."
    });
  }
});


/* =========================================================
   PREFEITO — DECIDIR PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id/decide",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const proposalId = Number(req.params.id);

      if (!Number.isInteger(proposalId)) {
        return res.status(400).json({
          ok: false,
          error: "ID da proposta inválido."
        });
      }

      const status = sanitizeText(
        req.body.status,
        30
      );

      const allowedStatuses = [
        "Aprovada",
        "Recusada",
        "Em análise",
        "Pendente"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          ok: false,
          error: "Status inválido."
        });
      }

      const result = await query(
        `
        UPDATE proposals
        SET
          status = $1,
          decided_by = $2,
          decided_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
        `,
        [
          status,
          req.user.name,
          proposalId
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          ok: false,
          error: "Proposta não encontrada."
        });
      }

      return res.json({
        ok: true,
        message: "Decisão registrada.",
        proposal: result.rows[0]
      });

    } catch (error) {

      console.error("PROPOSAL DECIDE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível decidir a proposta."
      });
    }
  }
);


/* =========================================================
   PREFEITO — COMENTAR PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id/comment",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const proposalId = Number(req.params.id);

      if (!Number.isInteger(proposalId)) {
        return res.status(400).json({
          ok: false,
          error: "ID da proposta inválido."
        });
      }

      const comment = sanitizeText(
        req.body.comment,
        3000
      );

      if (!comment) {
        return res.status(400).json({
          ok: false,
          error: "Digite um comentário."
        });
      }

      const result = await query(
        `
        UPDATE proposals
        SET
          mayor_comment = $1,
          decided_by = $2
        WHERE id = $3
        RETURNING *
        `,
        [
          comment,
          req.user.name,
          proposalId
        ]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          ok: false,
          error: "Proposta não encontrada."
        });
      }

      return res.json({
        ok: true,
        message: "Comentário do prefeito publicado.",
        proposal: result.rows[0]
      });

    } catch (error) {

      console.error("PROPOSAL COMMENT ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível publicar o comentário."
      });
    }
  }
);


/* =========================================================
   NOTÍCIAS
========================================================= */

app.get("/api/news", async (req, res) => {

  try {

    const result = await query(`
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
      LIMIT 50
    `);

    return res.json({
      ok: true,
      news: result.rows
    });

  } catch (error) {

    console.error("NEWS LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar as notícias."
    });
  }
});


/* =========================================================
   PREFEITO — CRIAR NOTÍCIA
========================================================= */

app.post(
  "/api/news",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const title = sanitizeText(
        req.body.title,
        200
      );

      const text = sanitizeText(
        req.body.text,
        10000
      );

      const image = sanitizeText(
        req.body.image,
        1000
      );

      const category = sanitizeText(
        req.body.category || "Comunicado",
        100
      );

      if (!title || !text) {
        return res.status(400).json({
          ok: false,
          error: "Título e texto são obrigatórios."
        });
      }

      const result = await query(
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
        RETURNING *
        `,
        [
          title,
          text,
          image,
          category,
          req.user.name
        ]
      );

      return res.status(201).json({
        ok: true,
        message: "Notícia publicada.",
        news: result.rows[0]
      });

    } catch (error) {

      console.error("NEWS CREATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível publicar a notícia."
      });
    }
  }
);


/* =========================================================
   PREFEITO — EXCLUIR NOTÍCIA
========================================================= */

app.delete(
  "/api/news/:id",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          error: "ID inválido."
        });
      }

      const result = await query(
        `
        DELETE FROM news
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({
          ok: false,
          error: "Notícia não encontrada."
        });
      }

      return res.json({
        ok: true,
        message: "Notícia excluída."
      });

    } catch (error) {

      console.error("NEWS DELETE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível excluir a notícia."
      });
    }
  }
);


/* =========================================================
   EVENTOS
========================================================= */

app.get("/api/events", async (req, res) => {

  try {

    const result = await query(`
      SELECT
        id,
        title,
        text,
        created_at
      FROM events
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return res.json({
      ok: true,
      events: result.rows
    });

  } catch (error) {

    console.error("EVENTS LIST ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível carregar os eventos."
    });
  }
});


/* =========================================================
   PREFEITO — CRIAR EVENTO
========================================================= */

app.post(
  "/api/events",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const title = sanitizeText(
        req.body.title,
        200
      );

      const text = sanitizeText(
        req.body.text,
        5000
      );

      if (!title || !text) {
        return res.status(400).json({
          ok: false,
          error: "Título e descrição são obrigatórios."
        });
      }

      const result = await query(
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
        RETURNING *
        `,
        [
          title,
          text
        ]
      );

      return res.status(201).json({
        ok: true,
        message: "Evento criado.",
        event: result.rows[0]
      });

    } catch (error) {

      console.error("EVENT CREATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível criar o evento."
      });
    }
  }
);


/* =========================================================
   TRANSAÇÕES DO USUÁRIO
========================================================= */

app.get(
  "/api/transactions",
  requireAuth,
  async (req, res) => {

    try {

      const result = await query(
        `
        SELECT
          id,
          type,
          amount,
          description,
          created_at
        FROM transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
        `,
        [req.user.id]
      );

      return res.json({
        ok: true,
        transactions: result.rows
      });

    } catch (error) {

      console.error("TRANSACTIONS ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível carregar suas transações."
      });
    }
  }
);


/* =========================================================
   PERFIL
========================================================= */

app.get(
  "/api/profile",
  requireAuth,
  async (req, res) => {

    try {

      const user = await findUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: "Usuário não encontrado."
        });
      }

      return res.json({
        ok: true,
        profile: publicUser(user)
      });

    } catch (error) {

      console.error("PROFILE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível carregar o perfil."
      });
    }
  }
);


/* =========================================================
   ALTERAR NOME
========================================================= */

app.patch(
  "/api/profile/name",
  requireAuth,
  async (req, res) => {

    try {

      const name = sanitizeText(
        req.body.name,
        80
      );

      if (!name) {
        return res.status(400).json({
          ok: false,
          error: "Nome inválido."
        });
      }

      await query(
        `
        UPDATE users
        SET
          name = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          name,
          req.user.id
        ]
      );

      const user = await findUserById(req.user.id);

      return res.json({
        ok: true,
        message: "Nome atualizado.",
        user: publicUser(user)
      });

    } catch (error) {

      console.error("NAME UPDATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível alterar o nome."
      });
    }
  }
);


/* =========================================================
   ALTERAR SENHA
========================================================= */

app.patch(
  "/api/profile/password",
  requireAuth,
  async (req, res) => {

    try {

      const currentPassword = String(
        req.body.currentPassword || ""
      );

      const newPassword = String(
        req.body.newPassword || ""
      );

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          ok: false,
          error: "Preencha as duas senhas."
        });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({
          ok: false,
          error:
            "A nova senha precisa ter pelo menos 4 caracteres."
        });
      }

      const user = await findUserById(req.user.id);

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: "Usuário não encontrado."
        });
      }

      if (
        !checkPassword(
          currentPassword,
          user.password_hash
        )
      ) {
        return res.status(401).json({
          ok: false,
          error: "Senha atual incorreta."
        });
      }

      const newHash = hashPassword(newPassword);

      await query(
        `
        UPDATE users
        SET
          password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          newHash,
          user.id
        ]
      );

      /*
       * Derruba as sessões antigas por segurança.
       */

      for (const [
        token,
        session
      ] of sessions.entries()) {

        if (
          String(session.userId) ===
          String(user.id)
        ) {
          sessions.delete(token);
        }
      }

      const newToken = createSession(user.id);

      return res.json({
        ok: true,
        message: "Senha alterada.",
        token: newToken
      });

    } catch (error) {

      console.error("PASSWORD UPDATE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: "Não foi possível alterar a senha."
      });
    }
  }
);
