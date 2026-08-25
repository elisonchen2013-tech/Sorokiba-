const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não foi configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===============================
// ARQUIVOS DO JOGO
// ===============================

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// BANCO DE DADOS
// ===============================

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      money INTEGER NOT NULL DEFAULT 100,
      xp INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 50,
      job TEXT NOT NULL DEFAULT 'Desempregado',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      category TEXT DEFAULT 'Comunicado',
      author TEXT DEFAULT 'Prefeitura',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      author TEXT DEFAULT 'Prefeitura',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
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
    VALUES (1, 0, 100000, 10, 1000, 50, 70, 5)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Cria o prefeito Chen se ainda não existir.
  const mayor = await pool.query(
    "SELECT id FROM users WHERE username = $1",
    ["Chen"]
  );

  if (mayor.rowCount === 0) {
    const password = hashPassword("123456");

    await pool.query(
      `
      INSERT INTO users
      (name, username, password, role, money, xp, reputation, job)
      VALUES ($1,$2,$3,'mayor',1000,1000,100,'Prefeito')
      `,
      ["Chen", "Chen", password]
    );

    console.log("Prefeito inicial criado: Chen");
  }

  console.log("Banco de dados inicializado.");
}

// ===============================
// SENHA
// ===============================

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

// ===============================
// SESSÃO
// ===============================

async function getUser(req) {
  const token = req.cookies.sorokiba_session;

  if (!token) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = $1
    `,
    [token]
  );

  return result.rows[0] || null;
}

async function requireLogin(req, res, next) {
  try {
    const user = await getUser(req);

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
      error: "Erro ao verificar login."
    });
  }
}

function requireMayor(req, res, next) {
  if (req.user.role !== "mayor") {
    return res.status(403).json({
      error: "Apenas o prefeito pode fazer isso."
    });
  }

  next();
}

// ===============================
// CADASTRO
// ===============================

app.post("/api/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!name || !username || !password) {
      return res.status(400).json({
        error: "Preencha todos os campos."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    if (username.toLowerCase() === "chen") {
      return res.status(400).json({
        error: "Esse usuário é reservado para o prefeito."
      });
    }

    const exists = await pool.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );

    if (exists.rowCount > 0) {
      return res.status(400).json({
        error: "Esse usuário já existe."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO users
      (name, username, password)
      VALUES ($1,$2,$3)
      RETURNING id
      `,
      [
        name,
        username,
        hashPassword(password)
      ]
    );

    const userId = result.rows[0].id;

    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `
      INSERT INTO sessions(token, user_id)
      VALUES($1,$2)
      `,
      [token, userId]
    );

    res.cookie("sorokiba_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30
    });

    res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Não foi possível criar a conta."
    });
  }
});

// ===============================
// LOGIN
// ===============================

app.post("/api/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(username) = LOWER($1)
      `,
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const user = result.rows[0];

    if (user.password !== hashPassword(password)) {
      return res.status(401).json({
        error: "Usuário ou senha incorretos."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `
      INSERT INTO sessions(token, user_id)
      VALUES($1,$2)
      `,
      [token, user.id]
    );

    res.cookie("sorokiba_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30
    });

    res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao fazer login."
    });
  }
});

// ===============================
// LOGOUT
// ===============================

app.post("/api/logout", async (req, res) => {
  try {
    const token = req.cookies.sorokiba_session;

    if (token) {
      await pool.query(
        "DELETE FROM sessions WHERE token = $1",
        [token]
      );
    }

    res.clearCookie("sorokiba_session");

    res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao sair."
    });
  }
});

// ===============================
// ESTADO DO JOGO
// ===============================

app.get("/api/state", requireLogin, async (req, res) => {
  try {
    const cityResult = await pool.query(
      "SELECT * FROM city WHERE id = 1"
    );

    const newsResult = await pool.query(`
      SELECT
        id,
        title,
        text,
        category,
        author,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS date
      FROM news
      ORDER BY id DESC
      LIMIT 50
    `);

    const proposalResult = await pool.query(`
      SELECT
        id,
        text,
        author,
        status,
        TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS date
      FROM proposals
      ORDER BY id DESC
      LIMIT 50
    `);

    const user = req.user;

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        money: user.money,
        xp: user.xp,
        level: Math.floor(user.xp / 500) + 1,
        reputation: user.reputation,
        job: user.job
      },

      city: cityResult.rows[0],

      news: newsResult.rows,

      proposals: proposalResult.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao carregar Sorokiba."
    });
  }
});

// ===============================
// EMPREGOS
// ===============================

const JOBS = {
  "Entregador": [
    0,
    50,
    "Faça entregas pela cidade."
  ],

  "Garçom": [
    100,
    80,
    "Trabalhe em restaurantes."
  ],

  "Policial": [
    300,
    120,
    "Ajude a manter a cidade segura."
  ],

  "Engenheiro": [
    600,
    180,
    "Ajude a desenvolver Sorokiba."
  ],

  "Empresário": [
    1000,
    300,
    "Administre negócios da cidade."
  ]
};

app.get("/api/jobs", requireLogin, (req, res) => {
  res.json(JOBS);
});

app.post("/api/job", requireLogin, async (req, res) => {
  try {
    const jobName = String(req.body.job || "");
    const job = JOBS[jobName];

    if (!job) {
      return res.status(400).json({
        error: "Emprego inválido."
      });
    }

    if (req.user.xp < job[0]) {
      return res.status(400).json({
        error: "Você ainda não possui XP suficiente."
      });
    }

    await pool.query(
      `
      UPDATE users
      SET job = $1
      WHERE id = $2
      `,
      [jobName, req.user.id]
    );

    res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao escolher emprego."
    });
  }
});

// ===============================
// MISSÃO
// ===============================

function todayKey() {
  const now = new Date();

  return (
    now.getUTCFullYear() +
    "-" +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getUTCDate()).padStart(2, "0")
  );
}

const missions = [
  {
    title: "Ajude um cidadão de Sorokiba",
    xp: 100,
    money: 75
  },
  {
    title: "Complete seu trabalho",
    xp: 120,
    money: 90
  },
  {
    title: "Explore a cidade",
    xp: 80,
    money: 60
  }
];

app.get("/api/mission", requireLogin, async (req, res) => {
  try {
    const key = todayKey();

    const missionIndex =
      req.user.id % missions.length;

    const mission = missions[missionIndex];

    const result = await pool.query(
      `
      SELECT 1
      FROM transactions
      WHERE user_id = $1
      AND type = 'daily_mission'
      AND description = $2
      LIMIT 1
      `,
      [req.user.id, key]
    );

    res.json({
      ...mission,
      done: result.rowCount > 0
    });
  } catch (error) {
    // Caso a tabela ainda não exista, cria abaixo.
    await createTransactionsTable();

    res.json({
      ...missions[req.user.id % missions.length],
      done: false
    });
  }
});

// ===============================
// TRANSAÇÕES
// ===============================

async function createTransactionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

app.post("/api/mission", requireLogin, async (req, res) => {
  try {
    await createTransactionsTable();

    const key = todayKey();

    const already = await pool.query(
      `
      SELECT id
      FROM transactions
      WHERE user_id = $1
      AND type = 'daily_mission'
      AND description = $2
      `,
      [req.user.id, key]
    );

    if (already.rowCount > 0) {
      return res.status(400).json({
        error: "Você já completou a missão de hoje."
      });
    }

    const mission =
      missions[req.user.id % missions.length];

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        UPDATE users
        SET
          xp = xp + $1,
          money = money + $2
        WHERE id = $3
        `,
        [
          mission.xp,
          mission.money,
          req.user.id
        ]
      );

      await client.query(
        `
        INSERT INTO transactions
        (user_id, amount, type, description)
        VALUES($1,$2,'daily_mission',$3)
        `,
        [
          req.user.id,
          mission.money,
          key
        ]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao completar missão."
    });
  }
});

// ===============================
// PROPOSTAS
// ===============================

app.post(
  "/api/proposals",
  requireLogin,
  async (req, res) => {
    try {
      const text =
        String(req.body.text || "").trim();

      if (!text) {
        return res.status(400).json({
          error: "Escreva uma proposta."
        });
      }

      await pool.query(
        `
        INSERT INTO proposals(text, author)
        VALUES($1,$2)
        `,
        [
          text,
          req.user.username
        ]
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao enviar proposta."
      });
    }
  }
);

// ===============================
// DECISÃO DO PREFEITO
// ===============================

app.post(
  "/api/proposals/:id",
  requireLogin,
  requireMayor,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const approve =
        Boolean(req.body.approve);

      const status =
        approve
          ? "Aprovada"
          : "Recusada";

      await pool.query(
        `
        UPDATE proposals
        SET status = $1
        WHERE id = $2
        `,
        [status, id]
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao analisar proposta."
      });
    }
  }
);

// ===============================
// NOTÍCIAS
// ===============================

app.post(
  "/api/news",
  requireLogin,
  requireMayor,
  async (req, res) => {
    try {
      const title =
        String(req.body.title || "").trim();

      const text =
        String(req.body.text || "").trim();

      const category =
        String(
          req.body.category || "Comunicado"
        ).trim();

      if (!title || !text) {
        return res.status(400).json({
          error: "Preencha título e texto."
        });
      }

      await pool.query(
        `
        INSERT INTO news
        (title,text,category,author)
        VALUES($1,$2,$3,$4)
        `,
        [
          title,
          text,
          category,
          req.user.username
        ]
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao publicar notícia."
      });
    }
  }
);

// ===============================
// EVENTOS
// ===============================

app.post(
  "/api/event",
  requireLogin,
  requireMayor,
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

      await pool.query(
        `
        INSERT INTO events
        (title,text,author)
        VALUES($1,$2,$3)
        `,
        [
          title,
          text,
          req.user.username
        ]
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao criar evento."
      });
    }
  }
);

// ===============================
// IMPOSTO
// ===============================

app.post(
  "/api/tax",
  requireLogin,
  requireMayor,
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
          error: "Imposto inválido."
        });
      }

      await pool.query(
        `
        UPDATE city
        SET tax = $1
        WHERE id = 1
        `,
        [tax]
      );

      res.json({
        success: true
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao atualizar imposto."
      });
    }
  }
);

// ===============================
// EVENTOS DA CIDADE
// ===============================

app.get(
  "/api/events",
  requireLogin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          title,
          text,
          author,
          TO_CHAR(
            created_at,
            'DD/MM/YYYY HH24:MI'
          ) AS date
        FROM events
        ORDER BY id DESC
        LIMIT 50
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Erro ao carregar eventos."
      });
    }
  }
);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      game: "Sorokiba"
    });
  } catch (error) {
    res.status(500).json({
      status: "error"
    });
  }
});

// ===============================
// ERROS
// ===============================

app.use((req, res) => {
  res.status(404).send("Sorokiba: página não encontrada.");
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Erro interno do servidor."
  });
});

// ===============================
// INICIAR
// ===============================

async function start() {
  try {
    await initDatabase();
    await createTransactionsTable();

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
      "Falha ao iniciar Sorokiba:"
    );

    console.error(error);

    process.exit(1);
  }
}

start();
