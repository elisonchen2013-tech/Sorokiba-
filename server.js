const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não foi configurada.");
  process.exit(1);
}

/* =========================================================
   POSTGRESQL
========================================================= */

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
  console.error("Erro inesperado no PostgreSQL:", error);
});

/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

/* =========================================================
   BANCO DE DADOS
========================================================= */

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS city (
      id INTEGER PRIMARY KEY,
      population INTEGER NOT NULL DEFAULT 0,
      gdp BIGINT NOT NULL DEFAULT 100000,
      territory INTEGER NOT NULL DEFAULT 10,
      treasury BIGINT NOT NULL DEFAULT 1000,
      infrastructure INTEGER NOT NULL DEFAULT 50,
      quality INTEGER NOT NULL DEFAULT 70,
      tax NUMERIC(5,2) NOT NULL DEFAULT 5
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      money BIGINT NOT NULL DEFAULT 500,
      reputation INTEGER NOT NULL DEFAULT 50,
      job TEXT NOT NULL DEFAULT 'Entregador',
      hunger INTEGER NOT NULL DEFAULT 100,
      health INTEGER NOT NULL DEFAULT 100,
      inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
      missions JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_hunger_update BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Comunicado',
      image TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente',
      date TEXT NOT NULL,
      reviewed_by TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      type TEXT NOT NULL,
      item TEXT,
      mission TEXT,
      value BIGINT NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const city = await query(
    `SELECT id FROM city WHERE id = 1`
  );

  if (city.rowCount === 0) {
    await query(`
      INSERT INTO city
      (id, population, gdp, territory, treasury, infrastructure, quality, tax)
      VALUES
      (1, 0, 100000, 10, 1000, 50, 70, 5)
    `);
  }

  /*
    Corrige população caso o banco já tenha usuários.
  */
  await query(`
    UPDATE city
    SET population = (
      SELECT COUNT(*)
      FROM users
    )
    WHERE id = 1
  `);

  console.log("PostgreSQL inicializado com sucesso.");
}

/* =========================================================
   SESSÕES
========================================================= */

const sessions = new Map();

function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString("hex");

  sessions.set(sessionId, {
    username,
    createdAt: Date.now()
  });

  return sessionId;
}

/* =========================================================
   SENHAS
========================================================= */

function createPasswordHash(password) {
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
  try {
    const calculated = crypto.scryptSync(
      password,
      user.salt,
      64
    );

    const stored = Buffer.from(
      user.password_hash,
      "hex"
    );

    return (
      calculated.length === stored.length &&
      crypto.timingSafeEqual(calculated, stored)
    );
  } catch {
    return false;
  }
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function newId() {
  return (
    Date.now().toString(36) +
    crypto.randomBytes(8).toString("hex")
  );
}

function currentDay() {
  return new Date().toISOString().slice(0, 10);
}

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    xp: Number(user.xp),
    level: Number(user.level),
    money: Number(user.money),
    reputation: Number(user.reputation),
    job: user.job,
    hunger: Number(user.hunger),
    health: Number(user.health),
    inventory:
      Array.isArray(user.inventory)
        ? user.inventory
        : [],
    missions:
      user.missions &&
      typeof user.missions === "object"
        ? user.missions
        : {},
    createdAt: user.created_at
  };
}

async function getUser(username) {
  const result = await query(
    `SELECT * FROM users WHERE username = $1`,
    [username]
  );

  return result.rows[0] || null;
}

async function getCity() {
  const result = await query(
    `SELECT * FROM city WHERE id = 1`
  );

  return result.rows[0];
}

function cityPublic(city) {
  return {
    population: Number(city.population),
    gdp: Number(city.gdp),
    territory: Number(city.territory),
    treasury: Number(city.treasury),
    infrastructure: Number(city.infrastructure),
    quality: Number(city.quality),
    tax: Number(city.tax)
  };
}

/* =========================================================
   FOME / SAÚDE
========================================================= */

async function updateHunger(user) {
  let hunger = Number(user.hunger);
  let health = Number(user.health);
  let lastUpdate = Number(user.last_hunger_update);

  if (!Number.isFinite(hunger)) hunger = 100;
  if (!Number.isFinite(health)) health = 100;
  if (!Number.isFinite(lastUpdate)) {
    lastUpdate = Date.now();
  }

  const elapsed =
    Date.now() - lastUpdate;

  const halfHours = Math.floor(
    elapsed / (30 * 60 * 1000)
  );

  if (halfHours <= 0) {
    return user;
  }

  hunger = Math.max(
    0,
    hunger - halfHours
  );

  if (hunger === 0) {
    health = Math.max(
      10,
      health - halfHours
    );
  }

  lastUpdate =
    lastUpdate +
    halfHours * 30 * 60 * 1000;

  await query(
    `
    UPDATE users
    SET hunger = $1,
        health = $2,
        last_hunger_update = $3
    WHERE username = $4
    `,
    [
      hunger,
      health,
      lastUpdate,
      user.username
    ]
  );

  user.hunger = hunger;
  user.health = health;
  user.last_hunger_update = lastUpdate;

  return user;
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function requireLogin(req, res, next) {
  try {
    const sessionId = req.cookies.sid;

    if (!sessionId) {
      return res.status(401).json({
        error: "Faça login."
      });
    }

    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(401).json({
        error: "Sessão expirada. Faça login novamente."
      });
    }

    const user = await getUser(
      session.username
    );

    if (!user) {
      sessions.delete(sessionId);

      return res.status(401).json({
        error: "Usuário não encontrado."
      });
    }

    await updateHunger(user);

    req.user = user;

    next();

  } catch (error) {
    console.error("Erro na autenticação:", error);

    return res.status(500).json({
      error: "Erro ao verificar a conta."
    });
  }
}

function requireMayor(req, res, next) {
  if (
    !req.user ||
    req.user.role !== "mayor"
  ) {
    return res.status(403).json({
      error: "Área exclusiva do prefeito."
    });
  }

  next();
}

function sendLogin(user, res) {
  const sessionId =
    createSession(user.username);

  res.cookie("sid", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production",
    maxAge:
      7 * 24 * 60 * 60 * 1000
  });

  res.json({
    ok: true,
    user: publicUser(user)
  });
}

/* =========================================================
   EMPREGOS
========================================================= */

const JOBS = {
  Entregador: {
    xp: 0,
    money: 40,
    description:
      "Entregue encomendas pela cidade."
  },

  Jornalista: {
    xp: 100,
    money: 55,
    description:
      "Produza notícias para Sorokiba."
  },

  Comerciante: {
    xp: 250,
    money: 65,
    description:
      "Movimente o comércio da cidade."
  },

  Investigador: {
    xp: 500,
    money: 80,
    description:
      "Investigue acontecimentos."
  },

  Engenheiro: {
    xp: 1000,
    money: 100,
    description:
      "Planeje melhorias urbanas."
  },

  Empresário: {
    xp: 2000,
    money: 130,
    description:
      "Ajude no desenvolvimento econômico."
  }
};

/* =========================================================
   MISSÕES
========================================================= */

const MISSIONS = {
  Entregador: [
    {
      id: "entregador_1",
      title: "Entregar 3 encomendas",
      description:
        "Faça três entregas para moradores."
    },

    {
      id: "entregador_2",
      title: "Entrega urgente",
      description:
        "Complete uma entrega urgente."
    }
  ],

  Jornalista: [
    {
      id: "jornalista_1",
      title: "Criar uma reportagem",
      description:
        "Investigue um acontecimento da cidade."
    },

    {
      id: "jornalista_2",
      title: "Entrevistar um cidadão",
      description:
        "Faça uma entrevista."
    }
  ],

  Comerciante: [
    {
      id: "comerciante_1",
      title: "Realizar 5 vendas",
      description:
        "Venda produtos para moradores."
    },

    {
      id: "comerciante_2",
      title: "Organizar o comércio",
      description:
        "Prepare sua loja para o dia."
    }
  ],

  Investigador: [
    {
      id: "investigador_1",
      title: "Investigar um caso",
      description:
        "Investigue um caso da cidade."
    },

    {
      id: "investigador_2",
      title: "Analisar evidências",
      description:
        "Analise as evidências encontradas."
    }
  ],

  Engenheiro: [
    {
      id: "engenheiro_1",
      title: "Planejar uma melhoria",
      description:
        "Planeje uma melhoria urbana."
    },

    {
      id: "engenheiro_2",
      title: "Inspecionar construção",
      description:
        "Faça uma inspeção."
    }
  ],

  Empresário: [
    {
      id: "empresario_1",
      title: "Criar plano econômico",
      description:
        "Crie um plano para a economia."
    },

    {
      id: "empresario_2",
      title: "Planejar novo negócio",
      description:
        "Planeje um novo empreendimento."
    }
  ]
};

function getUserMissionData(user) {
  const job =
    JOBS[user.job]
      ? user.job
      : "Entregador";

  const list =
    MISSIONS[job] ||
    MISSIONS.Entregador;

  let missions =
    user.missions || {};

  if (
    typeof missions !== "object" ||
    Array.isArray(missions)
  ) {
    missions = {};
  }

  const day = currentDay();

  if (!Array.isArray(missions[day])) {
    missions[day] = [];
  }

  const completedIds =
    missions[day];

  return list.map((mission, index) => {
    const completed =
      completedIds.includes(
        mission.id
      );

    return {
      id: mission.id,
      number: index + 1,
      title: mission.title,
      description: mission.description,
      xp:
        50 +
        Number(user.level || 1) * 5,
      money:
        JOBS[job].money,
      completed
    };
  });
}

/* =========================================================
   MERCADO
========================================================= */

const FOODS = {
  agua: {
    id: "agua",
    name: "Água",
    icon: "💧",
    price: 5,
    hunger: 5,
    health: 1
  },

  lanche: {
    id: "lanche",
    name: "Lanche",
    icon: "🥪",
    price: 15,
    hunger: 15,
    health: 2
  },

  pizza: {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    price: 35,
    hunger: 30,
    health: 3
  },

  hamburguer: {
    id: "hamburguer",
    name: "Hambúrguer",
    icon: "🍔",
    price: 50,
    hunger: 45,
    health: 4
  },

  refeicao: {
    id: "refeicao",
    name: "Refeição completa",
    icon: "🍱",
    price: 75,
    hunger: 65,
    health: 6
  },

  banquete: {
    id: "banquete",
    name: "Banquete",
    icon: "🍗",
    price: 120,
    hunger: 100,
    health: 10
  }
};

/* =========================================================
   REGISTRO
========================================================= */

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const name =
        String(req.body.name || "")
          .trim();

      const username =
        String(req.body.username || "")
          .trim()
          .toLowerCase();

      const password =
        String(req.body.password || "");

      if (name.length < 2) {
        return res.status(400).json({
          error: "Digite seu nome."
        });
      }

      if (username.length < 3) {
        return res.status(400).json({
          error:
            "O usuário precisa ter pelo menos 3 caracteres."
        });
      }

      if (
        !/^[a-zA-Z0-9_.-]+$/.test(username)
      ) {
        return res.status(400).json({
          error:
            "O usuário pode conter apenas letras, números, _ , . ou -."
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error:
            "A senha precisa ter pelo menos 6 caracteres."
        });
      }

      const existing =
        await getUser(username);

      if (existing) {
        return res.status(409).json({
          error:
            "Esse usuário já existe."
        });
      }

      const countResult =
        await query(
          `SELECT COUNT(*)::int AS total FROM users`
        );

      const firstUser =
        countResult.rows[0].total === 0;

      const passwordData =
        createPasswordHash(password);

      const id = newId();

      await query(
        `
        INSERT INTO users
        (
          id,
          name,
          username,
          salt,
          password_hash,
          role,
          xp,
          level,
          money,
          reputation,
          job,
          hunger,
          health,
          inventory,
          missions,
          last_hunger_update
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,
          0,1,500,50,'Entregador',
          100,100,'[]'::jsonb,'{}'::jsonb,$7
        )
        `,
        [
          id,
          name,
          username,
          passwordData.salt,
          passwordData.hash,
          firstUser
            ? "mayor"
            : "citizen",
          Date.now()
        ]
      );

      await query(`
        UPDATE city
        SET population = (
          SELECT COUNT(*) FROM users
        )
        WHERE id = 1
      `);

      const user =
        await getUser(username);

      sendLogin(user, res);

    } catch (error) {
      console.error(
        "Erro no cadastro:",
        error
      );

      if (
        error.code === "23505"
      ) {
        return res.status(409).json({
          error:
            "Esse usuário já existe."
        });
      }

      res.status(500).json({
        error:
          "Erro ao criar a conta."
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
        String(
          req.body.password || ""
        );

      const user =
        await getUser(username);

      if (!user) {
        return res.status(401).json({
          error:
            "Usuário ou senha incorretos."
        });
      }

      if (
        !checkPassword(
          password,
          user
        )
      ) {
        return res.status(401).json({
          error:
            "Usuário ou senha incorretos."
        });
      }

      await updateHunger(user);

      sendLogin(user, res);

    } catch (error) {
      console.error(
        "Erro no login:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao entrar na conta."
      });
    }
  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  requireLogin,
  (req, res) => {
    const sessionId =
      req.cookies.sid;

    sessions.delete(sessionId);

    res.clearCookie("sid");

    res.json({
      ok: true
    });
  }
);

/* =========================================================
   ESTADO COMPLETO
========================================================= */

app.get(
  "/api/state",
  requireLogin,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.username
        );

      await updateHunger(user);

      const city =
        await getCity();

      const newsResult =
        await query(`
          SELECT
            id,
            title,
            text,
            category,
            image,
            author,
            date
          FROM news
          ORDER BY created_at DESC
        `);

      const proposalsResult =
        await query(`
          SELECT
            id,
            author,
            text,
            status,
            date,
            reviewed_by
          FROM proposals
          ORDER BY created_at DESC
        `);

      const eventsResult =
        await query(`
          SELECT
            id,
            title,
            text,
            date
          FROM events
          ORDER BY created_at DESC
        `);

      res.json({
        user: publicUser(user),
        city: cityPublic(city),
        news: newsResult.rows,
        proposals: proposalsResult.rows,
        events: eventsResult.rows
      });

    } catch (error) {
      console.error(
        "Erro carregando estado:",
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
   EMPREGOS
========================================================= */

app.get(
  "/api/jobs",
  requireLogin,
  (req, res) => {
    /*
      O index.html antigo espera:
      job[0] = XP
      job[1] = dinheiro
      job[2] = descrição
    */

    const result = {};

    for (const name of Object.keys(JOBS)) {
      result[name] = [
        JOBS[name].xp,
        JOBS[name].money,
        JOBS[name].description
      ];
    }

    res.json(result);
  }
);

app.post(
  "/api/job",
  requireLogin,
  async (req, res) => {
    try {
      const jobName =
        String(req.body.job || "");

      const job =
        JOBS[jobName];

      if (!job) {
        return res.status(400).json({
          error:
            "Trabalho não encontrado."
        });
      }

      const user =
        await getUser(
          req.user.username
        );

      if (
        Number(user.xp) <
        job.xp
      ) {
        return res.status(400).json({
          error:
            `Você precisa de ${job.xp} XP para esse trabalho.`
        });
      }

      await query(
        `
        UPDATE users
        SET job = $1
        WHERE username = $2
        `,
        [
          jobName,
          user.username
        ]
      );

      const updated =
        await getUser(
          user.username
        );

      res.json({
        ok: true,
        user:
          publicUser(updated)
      });

    } catch (error) {
      console.error(
        "Erro mudando emprego:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao mudar de emprego."
      });
    }
  }
);

/* =========================================================
   MISSÕES - GET
========================================================= */

app.get(
  "/api/mission",
  requireLogin,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.username
        );

      const missions =
        getUserMissionData(user);

      /*
        O index antigo espera uma missão
        diretamente no objeto.

        Também enviamos as duas missões
        através de "missions".
      */

      const current =
        missions.find(
          mission =>
            !mission.completed
        ) || missions[0];

      res.json({
        id: current
          ? current.id
          : null,

        title: current
          ? current.title
          : "Missões concluídas",

        description: current
          ? current.description
          : "Você completou as missões de hoje.",

        xp: current
          ? current.xp
          : 0,

        money: current
          ? current.money
          : 0,

        done:
          missions.length > 0 &&
          missions.every(
            mission =>
              mission.completed
          ),

        missions
      });

    } catch (error) {
      console.error(
        "Erro carregando missões:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar missões."
      });
    }
  }
);

/* =========================================================
   CONCLUIR MISSÃO
========================================================= */

app.post(
  "/api/mission",
  requireLogin,
  async (req, res) => {
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
          WHERE username = $1
          FOR UPDATE
          `,
          [req.user.username]
        );

      const user =
        result.rows[0];

      let missions =
        user.missions || {};

      if (
        typeof missions !== "object" ||
        Array.isArray(missions)
      ) {
        missions = {};
      }

      const day =
        currentDay();

      if (
        !Array.isArray(
          missions[day]
        )
      ) {
        missions[day] = [];
      }

      const available =
        getUserMissionData(user);

      let mission;

      if (req.body.missionId) {
        mission =
          available.find(
            item =>
              item.id ===
                req.body.missionId &&
              !item.completed
          );
      }

      if (!mission) {
        mission =
          available.find(
            item =>
              !item.completed
          );
      }

      if (!mission) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "Você já completou as 2 missões de hoje."
        });
      }

      missions[day].push(
        mission.id
      );

      const newXP =
        Number(user.xp) +
        Number(mission.xp);

      const newMoney =
        Number(user.money) +
        Number(mission.money);

      const newLevel =
        1 +
        Math.floor(
          newXP / 500
        );

      const newReputation =
        Math.min(
          100,
          Number(user.reputation) + 1
        );

      await client.query(
        `
        UPDATE users
        SET
          xp = $1,
          level = $2,
          money = $3,
          reputation = $4,
          missions = $5
        WHERE username = $6
        `,
        [
          newXP,
          newLevel,
          newMoney,
          newReputation,
          JSON.stringify(missions),
          user.username
        ]
      );

      await client.query(
        `
        UPDATE city
        SET
          gdp = gdp + $1,
          treasury = treasury + $2
        WHERE id = 1
        `,
        [
          Number(mission.money) * 10,
          Math.round(
            Number(mission.money) * 0.1
          )
        ]
      );

      await client.query(
        `
        INSERT INTO transactions
        (
          id,
          username,
          type,
          mission,
          value,
          date
        )
        VALUES
        ($1,$2,'Missão',$3,$4,$5)
        `,
        [
          newId(),
          user.username,
          mission.title,
          mission.money,
          new Date().toISOString()
        ]
      );

      await client.query(
        "COMMIT"
      );

      const updated =
        await getUser(
          user.username
        );

      res.json({
        ok: true,
        mission,
        user:
          publicUser(updated)
      });

    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Erro concluindo missão:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao concluir missão."
      });

    } finally {
      client.release();
    }
  }
);

/* =========================================================
   MERCADO
========================================================= */

app.get(
  "/api/market",
  requireLogin,
  (req, res) => {
    res.json(FOODS);
  }
);

app.post(
  "/api/market/buy",
  requireLogin,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const foodId =
        String(
          req.body.food || ""
        );

      const food =
        FOODS[foodId];

      if (!food) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "Comida não encontrada."
        });
      }

      const result =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE username = $1
          FOR UPDATE
          `,
          [req.user.username]
        );

      const user =
        result.rows[0];

      const money =
        Number(user.money);

      if (money < food.price) {
        await client.query(
          "ROLLBACK"
        );

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

      const health =
        Math.min(
          100,
          Number(user.health) +
            food.health
        );

      let inventory =
        user.inventory || [];

      if (
        !Array.isArray(inventory)
      ) {
        inventory = [];
      }

      inventory.push({
        id: newId(),
        type: "food",
        name: food.name,
        date:
          new Date().toISOString()
      });

      await client.query(
        `
        UPDATE users
        SET
          money = $1,
          hunger = $2,
          health = $3,
          inventory = $4
        WHERE username = $5
        `,
        [
          money - food.price,
          hunger,
          health,
          JSON.stringify(inventory),
          user.username
        ]
      );

      await client.query(
        `
        UPDATE city
        SET
          treasury = treasury + $1,
          gdp = gdp + $2
        WHERE id = 1
        `,
        [
          Math.round(
            food.price * 0.05
          ),
          food.price
        ]
      );

      await client.query(
        `
        INSERT INTO transactions
        (
          id,
          username,
          type,
          item,
          value,
          date
        )
        VALUES
        ($1,$2,'Mercado',$3,$4,$5)
        `,
        [
          newId(),
          user.username,
          food.name,
          food.price,
          new Date().toISOString()
        ]
      );

      await client.query(
        "COMMIT"
      );

      const updated =
        await getUser(
          user.username
        );

      res.json({
        ok: true,
        food,
        user:
          publicUser(updated)
      });

    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Erro no mercado:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao comprar comida."
      });

    } finally {
      client.release();
    }
  }
);

/* =========================================================
   PROPOSTAS
========================================================= */

app.post(
  "/api/proposals",
  requireLogin,
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
          id,
          author,
          text,
          status,
          date
        )
        VALUES
        ($1,$2,$3,'Pendente',$4)
        `,
        [
          newId(),
          req.user.username,
          text,
          new Date().toLocaleDateString(
            "pt-BR"
          )
        ]
      );

      res.json({
        ok: true
      });

    } catch (error) {
      console.error(
        "Erro criando proposta:",
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
   PREFEITO - PROPOSTAS
========================================================= */

app.post(
  "/api/proposals/:id",
  requireLogin,
  requireMayor,
  async (req, res) => {
    try {
      const approve =
        Boolean(
          req.body.approve
        );

      const result =
        await query(
          `
          UPDATE proposals
          SET
            status = $1,
            reviewed_by = $2
          WHERE id = $3
          RETURNING *
          `,
          [
            approve
              ? "Aprovada"
              : "Recusada",

            req.user.username,

            req.params.id
          ]
        );

      if (result.rowCount === 0) {
        return res.status(404).json({
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
        "Erro analisando proposta:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao analisar proposta."
      });
    }
  }
);

/* =========================================================
   NOTÍCIAS
========================================================= */

app.post(
  "/api/news",
  requireLogin,
  requireMayor,
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

      const category =
        String(
          req.body.category ||
            "Comunicado"
        ).trim();

      const image =
        String(
          req.body.image || ""
        ).trim();

      if (!title || !text) {
        return res.status(400).json({
          error:
            "Título e texto são obrigatórios."
        });
      }

      if (image.length > 5000000) {
        return res.status(400).json({
          error:
            "A imagem é muito grande."
        });
      }

      await query(
        `
        INSERT INTO news
        (
          id,
          title,
          text,
          category,
          image,
          author,
          date
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          newId(),
          title,
          text,
          category,
          image,
          req.user.name,
          new Date().toLocaleDateString(
            "pt-BR"
          )
        ]
      );

      res.json({
        ok: true
      });

    } catch (error) {
      console.error(
        "Erro publicando notícia:",
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
   EVENTOS
========================================================= */

app.post(
  "/api/event",
  requireLogin,
  requireMayor,
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
            "Preencha todos os campos."
        });
      }

      await query(
        `
        INSERT INTO events
        (
          id,
          title,
          text,
          date
        )
        VALUES
        ($1,$2,$3,$4)
        `,
        [
          newId(),
          title,
          text,
          new Date().toLocaleDateString(
            "pt-BR"
          )
        ]
      );

      res.json({
        ok: true
      });

    } catch (error) {
      console.error(
        "Erro criando evento:",
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
   IMPOSTOS
========================================================= */

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
          error:
            "O imposto deve estar entre 0% e 30%."
        });
      }

      const city =
        await getCity();

      const oldTax =
        Number(city.tax);

      /*
        O tesouro recebe uma receita
        proporcional à mudança do imposto.
      */

      const difference =
        tax - oldTax;

      const population =
        Number(city.population);

      const revenue =
        Math.max(
          0,
          Math.round(
            population *
            difference *
            2
          )
        );

      const quality =
        Math.max(
          0,
          Math.min(
            100,
            70 +
              Math.round(
                (10 - tax) * 2
              )
          )
        );

      const result =
        await query(
          `
          UPDATE city
          SET
            tax = $1,
            treasury = treasury + $2,
            quality = $3
          WHERE id = 1
          RETURNING *
          `,
          [
            tax,
            revenue,
            quality
          ]
        );

      res.json({
        ok: true,
        city:
          cityPublic(
            result.rows[0]
          )
      });

    } catch (error) {
      console.error(
        "Erro atualizando imposto:",
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
   DADOS DA CIDADE
========================================================= */

app.get(
  "/api/city",
  requireLogin,
  async (req, res) => {
    try {
      const city =
        await getCity();

      res.json({
        city:
          cityPublic(city)
      });

    } catch (error) {
      console.error(
        "Erro carregando cidade:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar dados da cidade."
      });
    }
  }
);

/* =========================================================
   INVENTÁRIO
========================================================= */

app.get(
  "/api/inventory",
  requireLogin,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.username
        );

      res.json({
        inventory:
          Array.isArray(user.inventory)
            ? user.inventory
            : []
      });

    } catch (error) {
      console.error(
        "Erro carregando inventário:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar inventário."
      });
    }
  }
);

/* =========================================================
   PERFIL
========================================================= */

app.get(
  "/api/profile",
  requireLogin,
  async (req, res) => {
    try {
      const user =
        await getUser(
          req.user.username
        );

      await updateHunger(user);

      res.json({
        user:
          publicUser(user)
      });

    } catch (error) {
      console.error(
        "Erro carregando perfil:",
        error
      );

      res.status(500).json({
        error:
          "Erro ao carregar perfil."
      });
    }
  }
);

/* =========================================================
   ROTA DO SITE
========================================================= */

app.get(/.*/, (req, res) => {
  if (
    req.path.startsWith("/api/")
  ) {
    return res.status(404).json({
      error:
        "API não encontrada."
    });
  }

  const indexFile =
    path.join(
      PUBLIC_DIR,
      "index.html"
    );

  res.sendFile(indexFile, (error) => {
    if (error) {
      console.error(
        "Erro enviando index.html:",
        error
      );

      if (!res.headersSent) {
        res.status(500).send(
          "Erro: public/index.html não foi encontrado."
        );
      }
    }
  });
});

/* =========================================================
   ERROS
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "Erro do servidor:",
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
   INICIALIZAÇÃO
========================================================= */

async function startServer() {
  try {
    await initializeDatabase();

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
      "Não foi possível iniciar o Sorokiba:"
    );

    console.error(error);

    process.exit(1);
  }
}

startServer();
