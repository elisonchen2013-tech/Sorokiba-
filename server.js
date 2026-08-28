const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const PORT = Number(process.env.PORT || 10000);

app.disable("x-powered-by");

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   POSTGRESQL
========================================================= */

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não configurada.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", (error) => {
  console.error("POSTGRES POOL ERROR:", error);
});

/* =========================================================
   SESSÕES
========================================================= */

const sessions = new Map();

const SESSION_DURATION =
  7 * 24 * 60 * 60 * 1000;

function createId() {
  return crypto.randomUUID();
}

function createToken() {
  return crypto.randomBytes(48).toString("hex");
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function clean(value, max = 500) {
  return String(value ?? "")
    .trim()
    .replace(/\0/g, "")
    .slice(0, max);
}

function normalizeUsername(value) {
  return clean(value, 40)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");
}

function getLevel(xp) {
  return Math.floor(Number(xp || 0) / 100) + 1;
}

function getToken(req) {
  const auth = req.headers.authorization;

  if (
    auth &&
    typeof auth === "string" &&
    auth.startsWith("Bearer ")
  ) {
    return auth.substring(7).trim();
  }

  const headerToken =
    req.headers["x-auth-token"];

  if (headerToken) {
    return String(headerToken);
  }

  return null;
}

/* =========================================================
   SENHAS
========================================================= */

function hashPassword(password) {
  const salt =
    crypto.randomBytes(16).toString("hex");

  const hash =
    crypto.pbkdf2Sync(
      password,
      salt,
      120000,
      64,
      "sha512"
    ).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const parts =
      String(stored).split(":");

    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const originalHash = parts[1];

    const hash =
      crypto.pbkdf2Sync(
        password,
        salt,
        120000,
        64,
        "sha512"
      ).toString("hex");

    const a = Buffer.from(
      hash,
      "hex"
    );

    const b = Buffer.from(
      originalHash,
      "hex"
    );

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);

  } catch {
    return false;
  }
}

/* =========================================================
   QUERY
========================================================= */

async function db(text, params = []) {
  return pool.query(text, params);
}

/* =========================================================
   TABELAS
========================================================= */

async function initDatabase() {

  console.log("Inicializando banco de dados...");

  /*
   USERS
   ID é TEXT + UUID.
   Isso evita o problema de:
   null value in column "id"
  */

  await db(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,

      role TEXT NOT NULL DEFAULT 'citizen',

      money NUMERIC NOT NULL DEFAULT 100,
      xp INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 50,

      hunger INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100,

      job TEXT NOT NULL DEFAULT 'Estudante',

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * CITY
  */

  await db(`
    CREATE TABLE IF NOT EXISTS city (
      id INTEGER PRIMARY KEY,

      name TEXT NOT NULL DEFAULT 'Sorokiba',

      population INTEGER NOT NULL DEFAULT 0,

      gdp NUMERIC NOT NULL DEFAULT 100000,

      territory NUMERIC NOT NULL DEFAULT 100,

      treasury NUMERIC NOT NULL DEFAULT 5000,

      infrastructure INTEGER NOT NULL DEFAULT 50,

      quality INTEGER NOT NULL DEFAULT 50,

      tax NUMERIC NOT NULL DEFAULT 5,

      updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db(`
    INSERT INTO city
    (
      id,
      name
    )
    VALUES
    (
      1,
      'Sorokiba'
    )
    ON CONFLICT (id)
    DO NOTHING
  `);

  /*
   * PROPOSALS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,

      user_id TEXT,

      author TEXT NOT NULL,

      text TEXT NOT NULL,

      status TEXT NOT NULL
        DEFAULT 'Pendente',

      mayor_comment TEXT NOT NULL
        DEFAULT '',

      decided_by TEXT NOT NULL
        DEFAULT '',

      decided_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * NEWS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,

      title TEXT NOT NULL,

      text TEXT NOT NULL,

      image TEXT NOT NULL
        DEFAULT '',

      category TEXT NOT NULL
        DEFAULT 'Comunicado',

      author TEXT NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * EVENTS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,

      title TEXT NOT NULL,

      text TEXT NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * TRANSACTIONS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,

      user_id TEXT NOT NULL,

      type TEXT NOT NULL,

      amount NUMERIC NOT NULL DEFAULT 0,

      description TEXT NOT NULL DEFAULT '',

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * MISSIONS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,

      user_id TEXT NOT NULL,

      mission_date DATE NOT NULL,

      title TEXT NOT NULL,

      description TEXT NOT NULL,

      xp INTEGER NOT NULL DEFAULT 0,

      money NUMERIC NOT NULL DEFAULT 0,

      done BOOLEAN NOT NULL DEFAULT FALSE,

      UNIQUE(user_id, mission_date)
    )
  `);

  /*
   * JOB TASKS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS job_tasks (
      id SERIAL PRIMARY KEY,

      user_id TEXT NOT NULL,

      task_date DATE NOT NULL,

      job TEXT NOT NULL,

      done BOOLEAN NOT NULL DEFAULT FALSE,

      UNIQUE(user_id, task_date)
    )
  `);

  /*
   * CUSTOM JOBS
  */

  await db(`
    CREATE TABLE IF NOT EXISTS custom_jobs (
      id SERIAL PRIMARY KEY,

      name TEXT NOT NULL UNIQUE,

      description TEXT NOT NULL DEFAULT '',

      required_xp INTEGER NOT NULL DEFAULT 0,

      task_xp INTEGER NOT NULL DEFAULT 10,

      task_money NUMERIC NOT NULL DEFAULT 10,

      created_by TEXT,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * CORREÇÃO DE BANCOS ANTIGOS
  */

  try {

    const columns =
      await db(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
      `);

    const names =
      columns.rows.map(
        row => row.column_name
      );

    /*
     * Se uma instalação antiga não tinha id,
     * cria a coluna.
    */

    if (!names.includes("id")) {

      await db(`
        ALTER TABLE users
        ADD COLUMN id TEXT
      `);

    }

    /*
     * Descobre usuários sem ID.
    */

    const withoutId =
      await db(`
        SELECT ctid
        FROM users
        WHERE id IS NULL
      `);

    for (const row of withoutId.rows) {

      await db(
        `
        UPDATE users
        SET id = $1
        WHERE ctid = $2
        `,
        [
          createId(),
          row.ctid
        ]
      );

    }

    /*
     * Converte ID para TEXT se necessário.
    */

    try {

      await db(`
        ALTER TABLE users
        ALTER COLUMN id TYPE TEXT
        USING id::TEXT
      `);

    } catch (error) {

      console.log(
        "Aviso ao ajustar tipo do ID:",
        error.message
      );

    }

    /*
     * Corrige dados antigos.
     *
     * IMPORTANTE:
     * Não usamos COALESCE(texto, número).
     * Isso causava o erro 42804.
    */

    await db(`
      UPDATE users
      SET
        name =
          CASE
            WHEN name IS NULL OR name = ''
            THEN 'Cidadão'
            ELSE name
          END,

        password_hash =
          CASE
            WHEN password_hash IS NULL
            THEN ''
            ELSE password_hash
          END,

        role =
          CASE
            WHEN role IS NULL OR role = ''
            THEN 'citizen'
            ELSE role
          END,

        money =
          CASE
            WHEN money IS NULL
            THEN 100
            ELSE money
          END,

        xp =
          CASE
            WHEN xp IS NULL
            THEN 0
            ELSE xp
          END,

        reputation =
          CASE
            WHEN reputation IS NULL
            THEN 50
            ELSE reputation
          END,

        hunger =
          CASE
            WHEN hunger IS NULL
            THEN 100
            ELSE hunger
          END,

        health =
          CASE
            WHEN health IS NULL
            THEN 100
            ELSE health
          END,

        job =
          CASE
            WHEN job IS NULL OR job = ''
            THEN 'Estudante'
            ELSE job
          END,

        updated_at =
          CURRENT_TIMESTAMP
    `);

  } catch (error) {

    console.log(
      "Aviso durante adaptação do banco:",
      error.message
    );

  }

  /*
   * Atualiza população.
  */

  await db(`
    UPDATE city
    SET
      population = (
        SELECT COUNT(*)
        FROM users
      ),

      updated_at =
        CURRENT_TIMESTAMP

    WHERE id = 1
  `);

  console.log(
    "Banco de dados inicializado com sucesso."
  );
}

/* =========================================================
   EMPREGOS
========================================================= */

const JOBS = {

  "Estudante": {
    requiredXP: 0,
    taskXP: 10,
    taskMoney: 5
  },

  "Entregador": {
    requiredXP: 50,
    taskXP: 20,
    taskMoney: 20
  },

  "Comerciante": {
    requiredXP: 150,
    taskXP: 30,
    taskMoney: 35
  },

  "Professor": {
    requiredXP: 300,
    taskXP: 40,
    taskMoney: 50
  },

  "Engenheiro": {
    requiredXP: 500,
    taskXP: 60,
    taskMoney: 80
  },

  "Médico": {
    requiredXP: 750,
    taskXP: 80,
    taskMoney: 100
  }

};

/* =========================================================
   COMIDAS
========================================================= */

const FOODS = {

  "Pão": {
    price: 10,
    hunger: 20
  },

  "Hambúrguer": {
    price: 25,
    hunger: 40
  },

  "Pizza": {
    price: 40,
    hunger: 60
  },

  "Banquete": {
    price: 70,
    hunger: 100
  }

};

/* =========================================================
   MISSÃO DIÁRIA
========================================================= */

function getDailyMission() {

  return {
    title: "Cidadão Ativo",

    description:
      "Participe da vida de Sorokiba e complete uma atividade.",

    xp: 25,

    money: 25
  };

}

/* =========================================================
   USUÁRIO PÚBLICO
========================================================= */

function publicUser(user) {

  if (!user) {
    return null;
  }

  return {

    id: user.id,

    name: user.name,

    username: user.username,

    role: user.role,

    money: Number(user.money || 0),

    xp: Number(user.xp || 0),

    level: getLevel(user.xp),

    reputation:
      Number(user.reputation || 0),

    hunger:
      Number(user.hunger || 0),

    health:
      Number(user.health || 0),

    job:
      user.job || "Estudante",

    createdAt:
      user.created_at

  };

}

/* =========================================================
   SESSÃO
========================================================= */

function createSession(userId) {

  const token =
    createToken();

  sessions.set(
    token,
    {
      userId: String(userId),

      createdAt:
        Date.now()
    }
  );

  return token;
}

async function getCurrentUser(req) {

  const token =
    getToken(req);

  if (!token) {
    return null;
  }

  const session =
    sessions.get(token);

  if (!session) {
    return null;
  }

  if (
    Date.now() -
      session.createdAt >
    SESSION_DURATION
  ) {

    sessions.delete(token);

    return null;
  }

  const result =
    await db(
      `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [
        String(session.userId)
      ]
    );

  return result.rows[0] || null;
}

/* =========================================================
   AUTH
========================================================= */

async function requireAuth(
  req,
  res,
  next
) {

  try {

    const user =
      await getCurrentUser(req);

    if (!user) {

      return res.status(401).json({

        ok: false,

        error:
          "Você precisa estar logado."

      });

    }

    req.user = user;

    next();

  } catch (error) {

    console.error(
      "AUTH ERROR:",
      error
    );

    res.status(500).json({

      ok: false,

      error:
        "Erro de autenticação."

    });

  }

}

/* =========================================================
   PREFEITO
========================================================= */

function requireMayor(
  req,
  res,
  next
) {

  if (
    !req.user ||
    req.user.role !== "mayor"
  ) {

    return res.status(403).json({

      ok: false,

      error:
        "Apenas o prefeito pode realizar esta ação."

    });

  }

  next();

}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/health",
  async (req, res) => {

    try {

      await db(
        "SELECT NOW()"
      );

      res.json({

        ok: true,

        service:
          "Sorokiba",

        database:
          "online",

        time:
          new Date().toISOString()

      });

    } catch (error) {

      console.error(
        "HEALTH ERROR:",
        error
      );

      res.status(503).json({

        ok: false,

        service:
          "Sorokiba",

        database:
          "offline"

      });

    }

  }
);

/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/register",
  async (req, res) => {

    try {

      const name =
        clean(req.body.name, 80);

      const user =
        normalizeUsername(
          req.body.username
        );

      const password =
        String(
          req.body.password || ""
        );

      if (!name) {

        return res.status(400).json({

          ok: false,

          error:
            "Digite seu nome."

        });

      }

      if (user.length < 3) {

        return res.status(400).json({

          ok: false,

          error:
            "O usuário precisa ter pelo menos 3 caracteres."

        });

      }

      if (password.length < 4) {

        return res.status(400).json({

          ok: false,

          error:
            "A senha precisa ter pelo menos 4 caracteres."

        });

      }

      const exists =
        await db(
          `
          SELECT id
          FROM users
          WHERE LOWER(username) = LOWER($1)
          LIMIT 1
          `,
          [user]
        );

      if (exists.rows.length > 0) {

        return res.status(409).json({

          ok: false,

          error:
            "Este nome de usuário já está cadastrado."

        });

      }

      const count =
        await db(`
          SELECT COUNT(*) AS total
          FROM users
        `);

      const total =
        Number(
          count.rows[0].total
        );

      const firstUser =
        total === 0;

      const role =
        firstUser
          ? "mayor"
          : "citizen";

      /*
       * ID sempre gerado aqui.
      */

      const id =
        createId();

      const passwordHash =
        hashPassword(password);

      const startingMoney =
        firstUser
          ? 500
          : 100;

      const result =
        await db(
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
            job
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            0,
            50,
            100,
            100,
            'Estudante'
          )
          RETURNING *
          `,
          [
            id,
            name,
            user,
            passwordHash,
            role,
            startingMoney
          ]
        );

      const newUser =
        result.rows[0];

      await db(`
        UPDATE city
        SET
          population = (
            SELECT COUNT(*)
            FROM users
          ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = 1
      `);

      /*
       * Cria missão inicial.
      */

      const mission =
        getDailyMission();

      await db(
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
        ON CONFLICT
        (
          user_id,
          mission_date
        )
        DO NOTHING
        `,
        [
          newUser.id,
          mission.title,
          mission.description,
          mission.xp,
          mission.money
        ]
      );

      const token =
        createSession(
          newUser.id
        );

      console.log(
        "CONTA CRIADA:",
        newUser.username,
        "| role:",
        newUser.role
      );

      return res.status(201).json({

        ok: true,

        message:
          firstUser
            ? "Conta criada! Você é o prefeito de Sorokiba."
            : "Conta criada com sucesso.",

        token,

        user:
          publicUser(newUser),

        firstUser

      });

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({

          ok: false,

          error:
            "Este nome de usuário já existe."

        });

      }

      return res.status(500).json({

        ok: false,

        error:
          "Não foi possível criar a conta."

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

      const user =
        normalizeUsername(
          req.body.username
        );

      const password =
        String(
          req.body.password || ""
        );

      if (
        !user ||
        !password
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Digite usuário e senha."

        });

      }

      const result =
        await db(
          `
          SELECT *
          FROM users
          WHERE LOWER(username) = LOWER($1)
          LIMIT 1
          `,
          [user]
        );

      if (!result.rows[0]) {

        return res.status(401).json({

          ok: false,

          error:
            "Usuário ou senha incorretos."

        });

      }

      const account =
        result.rows[0];

      if (
        !verifyPassword(
          password,
          account.password_hash
        )
      ) {

        return res.status(401).json({

          ok: false,

          error:
            "Usuário ou senha incorretos."

        });

      }

      const token =
        createSession(
          account.id
        );

      console.log(
        "LOGIN:",
        account.username
      );

      res.json({

        ok: true,

        message:
          "Login realizado com sucesso.",

        token,

        user:
          publicUser(account)

      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível entrar na conta."

      });

    }

  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  requireAuth,
  async (req, res) => {

    const token =
      getToken(req);

    if (token) {
      sessions.delete(token);
    }

    res.json({

      ok: true,

      message:
        "Logout realizado."

    });

  }
);

/* =========================================================
   ME
========================================================= */

app.get(
  "/api/me",
  requireAuth,
  async (req, res) => {

    res.json({

      ok: true,

      user:
        publicUser(req.user)

    });

  }
);

/* =========================================================
   STATE
========================================================= */

app.get(
  "/api/state",
  requireAuth,
  async (req, res) => {

    try {

      const city =
        await db(`
          SELECT *
          FROM city
          WHERE id = 1
        `);

      const news =
        await db(`
          SELECT *
          FROM news
          ORDER BY created_at DESC
          LIMIT 50
        `);

      const proposals =
        await db(`
          SELECT *
          FROM proposals
          ORDER BY created_at DESC
          LIMIT 100
        `);

      const events =
        await db(`
          SELECT *
          FROM events
          ORDER BY created_at DESC
          LIMIT 50
        `);

      const mission =
        await db(
          `
          SELECT *
          FROM missions
          WHERE user_id = $1
          AND mission_date = CURRENT_DATE
          LIMIT 1
          `,
          [
            req.user.id
          ]
        );

      const customJobs =
        await db(`
          SELECT *
          FROM custom_jobs
          ORDER BY created_at DESC
        `);

      res.json({

        ok: true,

        user:
          publicUser(req.user),

        city:
          city.rows[0] || null,

        news:
          news.rows,

        proposals:
          proposals.rows,

        events:
          events.rows,

        mission:
          mission.rows[0] || null,

        jobs:
          JOBS,

        customJobs:
          customJobs.rows,

        foods:
          FOODS,

        isMayor:
          req.user.role === "mayor"

      });

    } catch (error) {

      console.error(
        "STATE ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar o estado."

      });

    }

  }
);

/* =========================================================
   CITY
========================================================= */

app.get(
  "/api/city",
  async (req, res) => {

    try {

      const result =
        await db(`
          SELECT *
          FROM city
          WHERE id = 1
        `);

      res.json({

        ok: true,

        city:
          result.rows[0] || null

      });

    } catch (error) {

      console.error(
        "CITY ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar Sorokiba."

      });

    }

  }
);

/* =========================================================
   PROPOSTAS
========================================================= */

app.get(
  "/api/proposals",
  requireAuth,
  async (req, res) => {

    try {

      const result =
        await db(`
          SELECT *
          FROM proposals
          ORDER BY created_at DESC
          LIMIT 100
        `);

      res.json({

        ok: true,

        proposals:
          result.rows

      });

    } catch (error) {

      console.error(
        "PROPOSALS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar propostas."

      });

    }

  }
);

app.post(
  "/api/proposals",
  requireAuth,
  async (req, res) => {

    try {

      const text =
        clean(
          req.body.text,
          3000
        );

      if (!text) {

        return res.status(400).json({

          ok: false,

          error:
            "Digite uma proposta."

        });

      }

      const result =
        await db(
          `
          INSERT INTO proposals
          (
            user_id,
            author,
            text,
            status
          )
          VALUES
          (
            $1,
            $2,
            $3,
            'Pendente'
          )
          RETURNING *
          `,
          [
            req.user.id,
            req.user.name,
            text
          ]
        );

      res.status(201).json({

        ok: true,

        proposal:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "CREATE PROPOSAL ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível enviar a proposta."

      });

    }

  }
);

/* =========================================================
   PREFEITO - DECIDIR PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id/decide",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        clean(
          req.body.status,
          40
        );

      const allowed = [
        "Aprovada",
        "Recusada",
        "Em análise",
        "Pendente"
      ];

      if (!Number.isInteger(id)) {

        return res.status(400).json({

          ok: false,

          error:
            "ID inválido."

        });

      }

      if (
        !allowed.includes(status)
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Status inválido."

        });

      }

      const result =
        await db(
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
            id
          ]
        );

      if (!result.rows[0]) {

        return res.status(404).json({

          ok: false,

          error:
            "Proposta não encontrada."

        });

      }

      res.json({

        ok: true,

        proposal:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "DECIDE PROPOSAL ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível decidir a proposta."

      });

    }

  }
);

/* =========================================================
   PREFEITO - COMENTAR PROPOSTA
========================================================= */

app.post(
  "/api/proposals/:id/comment",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const comment =
        clean(
          req.body.comment,
          3000
        );

      if (!Number.isInteger(id)) {

        return res.status(400).json({

          ok: false,

          error:
            "ID inválido."

        });

      }

      if (!comment) {

        return res.status(400).json({

          ok: false,

          error:
            "Digite um comentário."

        });

      }

      const result =
        await db(
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
            id
          ]
        );

      if (!result.rows[0]) {

        return res.status(404).json({

          ok: false,

          error:
            "Proposta não encontrada."

        });

      }

      res.json({

        ok: true,

        message:
          "Comentário publicado.",

        proposal:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "COMMENT PROPOSAL ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível publicar o comentário."

      });

    }

  }
);

/* =========================================================
   NOTÍCIAS
========================================================= */

app.get(
  "/api/news",
  async (req, res) => {

    try {

      const result =
        await db(`
          SELECT *
          FROM news
          ORDER BY created_at DESC
          LIMIT 50
        `);

      res.json({

        ok: true,

        news:
          result.rows

      });

    } catch (error) {

      console.error(
        "NEWS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar notícias."

      });

    }

  }
);

app.post(
  "/api/news",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const title =
        clean(
          req.body.title,
          200
        );

      const text =
        clean(
          req.body.text,
          10000
        );

      const image =
        clean(
          req.body.image,
          1000
        );

      const category =
        clean(
          req.body.category ||
          "Comunicado",
          100
        );

      if (!title || !text) {

        return res.status(400).json({

          ok: false,

          error:
            "Título e texto são obrigatórios."

        });

      }

      const result =
        await db(
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

      res.status(201).json({

        ok: true,

        news:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "CREATE NEWS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível publicar a notícia."

      });

    }

  }
);

/* =========================================================
   EVENTOS
========================================================= */

app.get(
  "/api/events",
  async (req, res) => {

    try {

      const result =
        await db(`
          SELECT *
          FROM events
          ORDER BY created_at DESC
          LIMIT 50
        `);

      res.json({

        ok: true,

        events:
          result.rows

      });

    } catch (error) {

      console.error(
        "EVENTS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar eventos."

      });

    }

  }
);

app.post(
  "/api/events",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const title =
        clean(
          req.body.title,
          200
        );

      const text =
        clean(
          req.body.text,
          5000
        );

      if (!title || !text) {

        return res.status(400).json({

          ok: false,

          error:
            "Título e descrição são obrigatórios."

        });

      }

      const result =
        await db(
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

      res.status(201).json({

        ok: true,

        event:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "CREATE EVENT ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível criar o evento."

      });

    }

  }
);

/* =========================================================
   MISSÕES
========================================================= */

app.get(
  "/api/missions",
  requireAuth,
  async (req, res) => {

    try {

      const daily =
        getDailyMission();

      await db(
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
        ON CONFLICT
        (
          user_id,
          mission_date
        )
        DO NOTHING
        `,
        [
          req.user.id,
          daily.title,
          daily.description,
          daily.xp,
          daily.money
        ]
      );

      const result =
        await db(
          `
          SELECT *
          FROM missions
          WHERE user_id = $1
          AND mission_date = CURRENT_DATE
          LIMIT 1
          `,
          [
            req.user.id
          ]
        );

      res.json({

        ok: true,

        mission:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "MISSION ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar missão."

      });

    }

  }
);

app.post(
  "/api/missions/complete",
  requireAuth,
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const missionResult =
        await client.query(
          `
          SELECT *
          FROM missions
          WHERE user_id = $1
          AND mission_date = CURRENT_DATE
          FOR UPDATE
          `,
          [
            req.user.id
          ]
        );

      let mission =
        missionResult.rows[0];

      if (!mission) {

        const daily =
          getDailyMission();

        const created =
          await client.query(
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

        mission =
          created.rows[0];

      }

      if (mission.done) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({

          ok: false,

          error:
            "Missão já concluída hoje."

        });

      }

      await client.query(
        `
        UPDATE missions
        SET done = TRUE
        WHERE id = $1
        `,
        [
          mission.id
        ]
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
          Number(mission.xp),
          Number(mission.money),
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
          Number(mission.money),
          mission.title
        ]
      );

      await client.query(
        "COMMIT"
      );

      const updated =
        await db(
          `
          SELECT *
          FROM users
          WHERE id = $1
          `,
          [
            req.user.id
          ]
        );

      res.json({

        ok: true,

        reward: {

          xp:
            Number(mission.xp),

          money:
            Number(mission.money)

        },

        user:
          publicUser(
            updated.rows[0]
          )

      });

    } catch (error) {

      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {}

      console.error(
        "COMPLETE MISSION ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível concluir a missão."

      });

    } finally {

      client.release();

    }

  }
);

/* =========================================================
   EMPREGOS
========================================================= */

app.get(
  "/api/jobs",
  requireAuth,
  async (req, res) => {

    const jobs =
      Object.entries(JOBS)
        .map(
          ([name, data]) => ({

            name,

            requiredXP:
              data.requiredXP,

            taskXP:
              data.taskXP,

            taskMoney:
              data.taskMoney,

            unlocked:
              Number(req.user.xp) >=
              Number(data.requiredXP)

          })
        );

    res.json({

      ok: true,

      jobs

    });

  }
);

app.get(
  "/api/custom-jobs",
  requireAuth,
  async (req, res) => {

    try {

      const result =
        await db(`
          SELECT *
          FROM custom_jobs
          ORDER BY created_at DESC
        `);

      res.json({

        ok: true,

        jobs:
          result.rows

      });

    } catch (error) {

      console.error(
        "CUSTOM JOBS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar empregos."

      });

    }

  }
);

app.post(
  "/api/jobs/select",
  requireAuth,
  async (req, res) => {

    try {

      const job =
        clean(
          req.body.job,
          100
        );

      const data =
        JOBS[job];

      if (!data) {

        return res.status(400).json({

          ok: false,

          error:
            "Emprego não encontrado."

        });

      }

      if (
        Number(req.user.xp) <
        Number(data.requiredXP)
      ) {

        return res.status(403).json({

          ok: false,

          error:
            "Você ainda não possui XP suficiente."

        });

      }

      await db(
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

      const result =
        await db(
          `
          SELECT *
          FROM users
          WHERE id = $1
          `,
          [
            req.user.id
          ]
        );

      res.json({

        ok: true,

        message:
          "Emprego selecionado.",

        user:
          publicUser(
            result.rows[0]
          )

      });

    } catch (error) {

      console.error(
        "SELECT JOB ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível selecionar o emprego."

      });

    }

  }
);

app.post(
  "/api/jobs/task",
  requireAuth,
  async (req, res) => {

    try {

      const job =
        req.user.job ||
        "Estudante";

      const data =
        JOBS[job];

      if (!data) {

        return res.status(400).json({

          ok: false,

          error:
            "Emprego inválido."

        });

      }

      const existing =
        await db(
          `
          SELECT *
          FROM job_tasks
          WHERE user_id = $1
          AND task_date = CURRENT_DATE
          LIMIT 1
          `,
          [
            req.user.id
          ]
        );

      if (
        existing.rows[0] &&
        existing.rows[0].done
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Você já realizou a tarefa de hoje."

        });

      }

      await db(
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
          req.user.id,
          job
        ]
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
          data.taskXP,
          data.taskMoney,
          req.user.id
        ]
      );

      await db(
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
          req.user.id,
          data.taskMoney,
          `Tarefa: ${job}`
        ]
      );

      const updated =
        await db(
          `
          SELECT *
          FROM users
          WHERE id = $1
          `,
          [
            req.user.id
          ]
        );

      res.json({

        ok: true,

        reward: {

          xp:
            data.taskXP,

          money:
            data.taskMoney

        },

        user:
          publicUser(
            updated.rows[0]
          )

      });

    } catch (error) {

      console.error(
        "JOB TASK ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível concluir a tarefa."

      });

    }

  }
);

/* =========================================================
   COMIDA
========================================================= */

app.get(
  "/api/food",
  requireAuth,
  async (req, res) => {

    res.json({

      ok: true,

      foods:
        FOODS

    });

  }
);

app.post(
  "/api/food/buy",
  requireAuth,
  async (req, res) => {

    const foodName =
      clean(
        req.body.food,
        100
      );

    const food =
      FOODS[foodName];

    if (!food) {

      return res.status(400).json({

        ok: false,

        error:
          "Comida não encontrada."

      });

    }

    const client =
      await pool.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const result =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE id = $1
          FOR UPDATE
          `,
          [
            req.user.id
          ]
        );

      const user =
        result.rows[0];

      if (!user) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({

          ok: false,

          error:
            "Usuário não encontrado."

        });

      }

      if (
        Number(user.money) <
        Number(food.price)
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({

          ok: false,

          error:
            "Dinheiro insuficiente."

        });

      }

      const newHunger =
        Math.min(
          100,
          Number(user.hunger) +
            Number(food.hunger)
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
          food.price,
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
          -Number(food.price),
          `Compra: ${foodName}`
        ]
      );

      await client.query(
        "COMMIT"
      );

      const updated =
        await db(
          `
          SELECT *
          FROM users
          WHERE id = $1
          `,
          [
            user.id
          ]
        );

      res.json({

        ok: true,

        user:
          publicUser(
            updated.rows[0]
          )

      });

    } catch (error) {

      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {}

      console.error(
        "FOOD ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível comprar a comida."

      });

    } finally {

      client.release();

    }

  }
);

/* =========================================================
   RANKING
========================================================= */

app.get(
  "/api/ranking",
  requireAuth,
  async (req, res) => {

    try {

      const result =
        await db(`
          SELECT
            id,
            name,
            username,
            role,
            xp,
            money,
            reputation,
            job
          FROM users
          ORDER BY
            xp DESC,
            reputation DESC
          LIMIT 100
        `);

      const ranking =
        result.rows.map(
          (user, index) => ({

            position:
              index + 1,

            ...publicUser(user)

          })
        );

      res.json({

        ok: true,

        ranking

      });

    } catch (error) {

      console.error(
        "RANKING ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível carregar o ranking."

      });

    }

  }
);

/* =========================================================
   TRANSAÇÕES
========================================================= */

app.get(
  "/api/transactions",
  requireAuth,
  async (req, res) => {

    try {

      const result =
        await db(
          `
          SELECT *
          FROM transactions
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 100
          `,
          [
            req.user.id
          ]
        );

      res.json({

        ok: true,

        transactions:
          result.rows

      });

    } catch (error) {

      console.error(
        "TRANSACTIONS ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Erro ao carregar transações."

      });

    }

  }
);

/* =========================================================
   PREFEITO - DASHBOARD
========================================================= */

app.get(
  "/api/mayor/dashboard",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const city =
        await db(`
          SELECT *
          FROM city
          WHERE id = 1
        `);

      const users =
        await db(`
          SELECT
            id,
            name,
            username,
            role,
            money,
            xp,
            reputation,
            job,
            created_at
          FROM users
          ORDER BY xp DESC
        `);

      const proposals =
        await db(`
          SELECT *
          FROM proposals
          ORDER BY created_at DESC
        `);

      const transactions =
        await db(`
          SELECT *
          FROM transactions
          ORDER BY created_at DESC
          LIMIT 100
        `);

      const jobs =
        await db(`
          SELECT *
          FROM custom_jobs
          ORDER BY created_at DESC
        `);

      res.json({

        ok: true,

        city:
          city.rows[0] || null,

        users:
          users.rows,

        proposals:
          proposals.rows,

        transactions:
          transactions.rows,

        jobs:
          jobs.rows

      });

    } catch (error) {

      console.error(
        "MAYOR DASHBOARD ERROR:",
        error
      );

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível carregar o painel do prefeito."

      });

    }

  }
);

/* =========================================================
   PREFEITO - IMPOSTO
========================================================= */

app.patch(
  "/api/mayor/tax",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const tax =
        Number(req.body.tax);

      if (
        !Number.isFinite(tax) ||
        tax < 0 ||
        tax > 100
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "O imposto deve estar entre 0 e 100."

        });

      }

      await db(
        `
        UPDATE city
        SET
          tax = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        `,
        [
          tax
        ]
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

        ok: false,

        error:
          "Não foi possível alterar o imposto."

      });

    }

  }
);

/* =========================================================
   PREFEITO - CRIAR EMPREGO
========================================================= */

app.post(
  "/api/mayor/jobs",
  requireAuth,
  requireMayor,
  async (req, res) => {

    try {

      const name =
        clean(
          req.body.name,
          100
        );

      const description =
        clean(
          req.body.description,
          1000
        );

      const requiredXP =
        Number(
          req.body.requiredXP || 0
        );

      const taskXP =
        Number(
          req.body.taskXP || 10
        );

      const taskMoney =
        Number(
          req.body.taskMoney || 10
        );

      if (!name) {

        return res.status(400).json({

          ok: false,

          error:
            "Digite o nome do emprego."

        });

      }

      if (
        !Number.isFinite(requiredXP) ||
        requiredXP < 0
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "XP necessário inválido."

        });

      }

      if (
        !Number.isFinite(taskXP) ||
        taskXP < 0
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "XP da tarefa inválido."

        });

      }

      if (
        !Number.isFinite(taskMoney) ||
        taskMoney < 0
      ) {

        return res.status(400).json({

          ok: false,

          error:
            "Pagamento inválido."

        });

      }

      const result =
        await db(
          `
          INSERT INTO custom_jobs
          (
            name,
            description,
            required_xp,
            task_xp,
            task_money,
            created_by
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING *
          `,
          [
            name,
            description,
            requiredXP,
            taskXP,
            taskMoney,
            req.user.id
          ]
        );

      res.status(201).json({

        ok: true,

        job:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "CREATE CUSTOM JOB ERROR:",
        error
      );

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({

          ok: false,

          error:
            "Já existe um emprego com esse nome."

        });

      }

      res.status(500).json({

        ok: false,

        error:
          "Não foi possível criar o emprego."

      });

    }

  }
);

/* =========================================================
   ROTA API DESCONHECIDA
========================================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({

      ok: false,

      error:
        "Rota da API não encontrada."

    });

  }
);

/* =========================================================
   INDEX.HTML
========================================================= */

const indexPath =
  path.join(
    __dirname,
    "index.html"
  );

app.get(
  "*",
  (req, res) => {

    if (
      req.path.startsWith("/api") ||
      req.path === "/health"
    ) {
      return res.status(404).send(
        "Not found"
      );
    }

    res.sendFile(
      indexPath,
      (error) => {

        if (error) {

          console.error(
            "INDEX ERROR:",
            error
          );

          if (!res.headersSent) {

            res.status(500).send(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Sorokiba</title>
              </head>
              <body>
                <h1>Sorokiba</h1>
                <p>O servidor está funcionando.</p>
                <p>
                  O arquivo index.html não foi encontrado.
                </p>
              </body>
              </html>
            `);

          }

        }

      }
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

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({

      ok: false,

      error:
        "Erro interno do servidor."

    });

  }
);

/* =========================================================
   ERROS DO NODE
========================================================= */

process.on(
  "uncaughtException",
  (error) => {

    console.error(
      "UNCAUGHT EXCEPTION:"
    );

    console.error(error);

  }
);

process.on(
  "unhandledRejection",
  (error) => {

    console.error(
      "UNHANDLED REJECTION:"
    );

    console.error(error);

  }
);

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function start() {

  console.log(
    "======================================"
  );

  console.log(
    "INICIANDO SOROKIBA..."
  );

  console.log(
    "Node:",
    process.version
  );

  console.log(
    "Porta:",
    PORT
  );

  console.log(
    "DATABASE_URL:",
    process.env.DATABASE_URL
      ? "CONFIGURADA"
      : "NAO CONFIGURADA"
  );

  console.log(
    "======================================"
  );

  try {

    if (
      !process.env.DATABASE_URL
    ) {

      throw new Error(
        "DATABASE_URL não foi configurada no Render."
      );

    }

    console.log(
      "Testando conexão com PostgreSQL..."
    );

    await db(
      "SELECT NOW()"
    );

    console.log(
      "PostgreSQL conectado com sucesso."
    );

    await initDatabase();

    console.log(
      "Banco pronto."
    );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          "======================================"
        );

        console.log(
          "SOROKIBA ONLINE"
        );

        console.log(
          `PORTA: ${PORT}`
        );

        console.log(
          "======================================"
        );

      }
    );

  } catch (error) {

    console.error(
      "======================================"
    );

    console.error(
      "ERRO AO INICIAR SOROKIBA"
    );

    console.error(
      "Mensagem:",
      error.message
    );

    console.error(
      "Código:",
      error.code || "SEM_CODIGO"
    );

    console.error(
      "Stack:",
      error.stack
    );

    console.error(
      "======================================"
    );

    /*
     * Não usamos process.exit().
     *
     * Assim o Render mostra o erro
     * completo no log.
    */

  }

}

start();
