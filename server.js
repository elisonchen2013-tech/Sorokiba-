const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

if (!DATABASE_URL) {
  console.warn(
    "DATABASE_URL não definida. Configure um PostgreSQL antes de iniciar o jogo."
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Arquivos do frontend
app.use(express.static(path.join(__dirname)));

// ======================================================
// PROFISSÕES
// ======================================================

const jobs = [
  {
    id: "estudante",
    name: "Estudante",
    xp: 0,
    pay: 35,
    desc: "Estude e participe das atividades da cidade.",
    task: "Estudar por um período e concluir uma atividade escolar.",
    taskXp: 20,
    taskMoney: 35,
    duration: 30,
  },
  {
    id: "entregador",
    name: "Entregador",
    xp: 100,
    pay: 80,
    desc: "Faça entregas pela cidade.",
    task: "Realizar uma entrega para um cidadão.",
    taskXp: 45,
    taskMoney: 80,
    duration: 45,
  },
  {
    id: "comerciante",
    name: "Comerciante",
    xp: 300,
    pay: 130,
    desc: "Administre vendas e movimentações comerciais.",
    task: "Atender clientes e registrar uma venda.",
    taskXp: 65,
    taskMoney: 130,
    duration: 60,
  },
  {
    id: "motorista",
    name: "Motorista",
    xp: 500,
    pay: 165,
    desc: "Transporte pessoas e mercadorias.",
    task: "Completar uma rota segura pela cidade.",
    taskXp: 80,
    taskMoney: 165,
    duration: 75,
  },
  {
    id: "policial",
    name: "Policial",
    xp: 800,
    pay: 220,
    desc: "Ajude a manter a cidade organizada.",
    task: "Fazer uma ronda e registrar um relatório.",
    taskXp: 100,
    taskMoney: 220,
    duration: 90,
  },
  {
    id: "enfermeiro",
    name: "Enfermeiro",
    xp: 1100,
    pay: 270,
    desc: "Ajude no atendimento de saúde.",
    task: "Apoiar o atendimento de um cidadão.",
    taskXp: 120,
    taskMoney: 270,
    duration: 105,
  },
  {
    id: "medico",
    name: "Médico",
    xp: 1500,
    pay: 340,
    desc: "Cuide da saúde dos moradores.",
    task: "Realizar uma avaliação médica.",
    taskXp: 150,
    taskMoney: 340,
    duration: 120,
  },
  {
    id: "programador",
    name: "Programador",
    xp: 2000,
    pay: 430,
    desc: "Construa e mantenha sistemas digitais.",
    task: "Resolver um chamado técnico.",
    taskXp: 180,
    taskMoney: 430,
    duration: 135,
  },
  {
    id: "engenheiro",
    name: "Engenheiro",
    xp: 2700,
    pay: 550,
    desc: "Trabalhe na infraestrutura de Sorokiba.",
    task: "Planejar uma melhoria de infraestrutura.",
    taskXp: 220,
    taskMoney: 550,
    duration: 150,
  },
  {
    id: "administrador",
    name: "Administrador",
    xp: 3500,
    pay: 700,
    desc: "Gerencie projetos e recursos da cidade.",
    task: "Concluir uma tarefa administrativa.",
    taskXp: 280,
    taskMoney: 700,
    duration: 180,
  },
];

// ======================================================
// ALIMENTOS
// ======================================================

const foods = [
  {
    id: "pao",
    name: "Pão",
    price: 15,
    hunger: 12,
    hydration: 0,
    energy: 5,
    icon: "🥖",
  },
  {
    id: "sanduiche",
    name: "Sanduíche",
    price: 35,
    hunger: 28,
    hydration: 4,
    energy: 12,
    icon: "🥪",
  },
  {
    id: "refeicao",
    name: "Refeição",
    price: 65,
    hunger: 45,
    hydration: 8,
    energy: 20,
    icon: "🍛",
  },
  {
    id: "frutas",
    name: "Frutas",
    price: 30,
    hunger: 22,
    hydration: 12,
    energy: 15,
    icon: "🍎",
  },
  {
    id: "agua",
    name: "Água",
    price: 10,
    hunger: 0,
    hydration: 35,
    energy: 2,
    icon: "💧",
  },
  {
    id: "suco",
    name: "Suco",
    price: 22,
    hunger: 5,
    hydration: 25,
    energy: 10,
    icon: "🧃",
  },
  {
    id: "energia",
    name: "Lanche energético",
    price: 45,
    hunger: 12,
    hydration: 5,
    energy: 30,
    icon: "⚡",
  },
];

// ======================================================
// HOSPITAL
// ======================================================

const hospitals = [
  {
    id: "consulta",
    name: "Consulta básica",
    price: 80,
    heal: 20,
    desc: "Recupera 20 de vida.",
  },
  {
    id: "tratamento",
    name: "Tratamento completo",
    price: 180,
    heal: 50,
    desc: "Recupera 50 de vida.",
  },
  {
    id: "emergencia",
    name: "Atendimento de emergência",
    price: 350,
    heal: 100,
    desc: "Recupera até 100 de vida.",
  },
];

// ======================================================
// CONQUISTAS
// ======================================================

const achievements = [
  [
    "first_login",
    "Primeiro acesso",
    "Entrou em Sorokiba pela primeira vez.",
    "🚪",
  ],
  ["level5", "Nível 5", "Alcançou o nível 5.", "⭐"],
  ["level10", "Nível 10", "Alcançou o nível 10.", "🌟"],
  ["mission1", "Primeiro trabalho", "Concluiu sua primeira missão.", "💼"],
  ["rich", "Cofre cheio", "Chegou a R$ 1.000 em dinheiro.", "💰"],
  ["bank", "Vida financeira", "Fez uma transferência bancária.", "🏦"],
  [
    "proposal",
    "Cidadão ativo",
    "Enviou uma proposta para a prefeitura.",
    "🏛️",
  ],
  [
    "job3",
    "Profissional versátil",
    "Desbloqueou 3 profissões.",
    "🧰",
  ],
  ["job5", "Especialista", "Desbloqueou 5 profissões.", "🎓"],
  ["healthy", "Vida equilibrada", "Recuperou sua vida no hospital.", "❤️"],
];

// ======================================================
// BANCO
// ======================================================

async function query(text, params = []) {
  const client = await pool.connect();

  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// ======================================================
// INICIALIZAÇÃO DO BANCO
// ======================================================

async function initDB() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL não definida.");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      username VARCHAR(30) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      level INT NOT NULL DEFAULT 1,
      xp INT NOT NULL DEFAULT 0,
      money NUMERIC(12,2) NOT NULL DEFAULT 250,
      bank_money NUMERIC(12,2) NOT NULL DEFAULT 500,
      job_id VARCHAR(30) NOT NULL DEFAULT 'estudante',
      professional_xp INT NOT NULL DEFAULT 0,
      life INT NOT NULL DEFAULT 100,
      hunger INT NOT NULL DEFAULT 100,
      hydration INT NOT NULL DEFAULT 100,
      energy INT NOT NULL DEFAULT 100,
      inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_needs_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INT NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS money NUMERIC(12,2) NOT NULL DEFAULT 250;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_money NUMERIC(12,2) NOT NULL DEFAULT 500;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS job_id VARCHAR(30) NOT NULL DEFAULT 'estudante';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_xp INT NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS life INT NOT NULL DEFAULT 100;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS hunger INT NOT NULL DEFAULT 100;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS hydration INT NOT NULL DEFAULT 100;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS energy INT NOT NULL DEFAULT 100;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS inventory JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_needs_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    UPDATE users SET level=1 WHERE level IS NULL;
    UPDATE users SET xp=0 WHERE xp IS NULL;
    UPDATE users SET money=250 WHERE money IS NULL;
    UPDATE users SET bank_money=500 WHERE bank_money IS NULL;
    UPDATE users SET job_id='estudante' WHERE job_id IS NULL OR job_id='';
    UPDATE users SET professional_xp=0 WHERE professional_xp IS NULL;
    UPDATE users SET life=100 WHERE life IS NULL;
    UPDATE users SET hunger=100 WHERE hunger IS NULL;
    UPDATE users SET hydration=100 WHERE hydration IS NULL;
    UPDATE users SET energy=100 WHERE energy IS NULL;
    UPDATE users SET inventory='{}'::jsonb WHERE inventory IS NULL;
    UPDATE users SET created_at=NOW() WHERE created_at IS NULL;
    UPDATE users SET last_needs_at=NOW() WHERE last_needs_at IS NULL;

    CREATE TABLE IF NOT EXISTS city (
      id INT PRIMARY KEY DEFAULT 1,
      treasury NUMERIC(14,2) NOT NULL DEFAULT 10000,
      economy NUMERIC(8,2) NOT NULL DEFAULT 100,
      infrastructure NUMERIC(8,2) NOT NULL DEFAULT 60,
      quality NUMERIC(8,2) NOT NULL DEFAULT 75,
      tax NUMERIC(5,2) NOT NULL DEFAULT 5,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO city(id)
    VALUES(1)
    ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id VARCHAR(30) NOT NULL,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      reward_money NUMERIC(12,2) NOT NULL,
      reward_xp INT NOT NULL,
      duration_seconds INT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'running'
    );

    CREATE TABLE IF NOT EXISTS inventory_log (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id VARCHAR(40) NOT NULL,
      quantity INT NOT NULL,
      action VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id SERIAL PRIMARY KEY,
      sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      image TEXT,
      author_id INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      image TEXT,
      event_date TIMESTAMPTZ NOT NULL,
      author_id INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      mayor_response TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id VARCHAR(50) NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS job_unlocks (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id VARCHAR(30) NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(user_id, job_id)
    );
  `);

  const count = await query("SELECT COUNT(*)::int AS n FROM users");

  if (count.rows[0].n === 0) {
    console.log(
      "Sorokiba pronto: o primeiro cadastro será automaticamente o prefeito."
    );
  }
}

// ======================================================
// AUTENTICAÇÃO
// ======================================================

function tokenFor(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function auth(req, res, next) {
  const raw = req.headers.authorization || "";

  const token = raw.startsWith("Bearer ")
    ? raw.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "Não autenticado.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.id;

    next();
  } catch {
    return res.status(401).json({
      error: "Sessão expirada.",
    });
  }
}

// ======================================================
// USUÁRIO
// ======================================================

async function getUser(id) {
  const result = await query(
    "SELECT * FROM users WHERE id=$1",
    [id]
  );

  return result.rows[0];
}

function levelFromXP(xp) {
  return Math.max(
    1,
    Math.floor(Number(xp) / 250) + 1
  );
}

function publicUser(user) {
  const job =
    jobs.find((j) => j.id === user.job_id) ||
    jobs[0];

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    level: Number(user.level),
    xp: Number(user.xp),
    money: Number(user.money),
    bankMoney: Number(user.bank_money),
    jobId: user.job_id,
    jobName: job.name,
    professionalXp: Number(user.professional_xp),
    life: Number(user.life),
    hunger: Number(user.hunger),
    hydration: Number(user.hydration),
    energy: Number(user.energy),
    inventory: user.inventory || {},
    createdAt: user.created_at,
  };
}

// ======================================================
// PREFEITO
// ======================================================

async function mayorId() {
  const result = await query(
    "SELECT id FROM users ORDER BY id ASC LIMIT 1"
  );

  return result.rows[0]?.id || null;
}

async function requireMayor(req, res, next) {
  try {
    const id = await mayorId();

    if (req.userId !== id) {
      return res.status(403).json({
        error: "Apenas o prefeito pode realizar esta ação.",
      });
    }

    next();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao verificar prefeito.",
    });
  }
}

// ======================================================
// NECESSIDADES
// ======================================================

async function updateNeeds(user) {
  const now = Date.now();

  const last = new Date(
    user.last_needs_at
  ).getTime();

  const minutes = Math.max(
    0,
    Math.floor((now - last) / 60000)
  );

  if (!minutes) {
    return user;
  }

  const hunger = Math.max(
    0,
    Number(user.hunger) - minutes
  );

  const hydration = Math.max(
    0,
    Number(user.hydration) - minutes
  );

  const energy = Math.max(
    0,
    Number(user.energy) - Math.floor(minutes / 2)
  );

  let life = Number(user.life);

  if (hunger === 0 || hydration === 0) {
    life = Math.max(
      1,
      life - Math.min(10, minutes)
    );
  }

  await query(
    `
    UPDATE users
    SET
      hunger=$1,
      hydration=$2,
      energy=$3,
      life=$4,
      last_needs_at=NOW()
    WHERE id=$5
    `,
    [
      hunger,
      hydration,
      energy,
      life,
      user.id,
    ]
  );

  return getUser(user.id);
}

// ======================================================
// CONQUISTAS
// ======================================================

async function grantAchievement(
  userId,
  achievementId
) {
  await query(
    `
    INSERT INTO achievements(user_id, achievement_id)
    VALUES($1,$2)
    ON CONFLICT DO NOTHING
    `,
    [userId, achievementId]
  );
}

async function progressChecks(user) {
  const u = await getUser(user.id);

  if (!u) return;

  if (Number(u.level) >= 5) {
    await grantAchievement(u.id, "level5");
  }

  if (Number(u.level) >= 10) {
    await grantAchievement(u.id, "level10");
  }

  if (Number(u.money) >= 1000) {
    await grantAchievement(u.id, "rich");
  }

  const jobsCount = await query(
    `
    SELECT COUNT(*)::int AS n
    FROM job_unlocks
    WHERE user_id=$1
    `,
    [u.id]
  );

  if (jobsCount.rows[0].n >= 3) {
    await grantAchievement(u.id, "job3");
  }

  if (jobsCount.rows[0].n >= 5) {
    await grantAchievement(u.id, "job5");
  }
}

// ======================================================
// CADASTRO
// ======================================================

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      username,
      password,
    } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        error:
          "Preencha nome, usuário e senha.",
      });
    }

    if (
      !/^[a-zA-Z0-9_]{3,30}$/.test(
        username
      )
    ) {
      return res.status(400).json({
        error:
          "Usuário: 3-30 caracteres, apenas letras, números e _.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error:
          "A senha precisa ter pelo menos 6 caracteres.",
      });
    }

    const exists = await query(
      `
      SELECT id
      FROM users
      WHERE LOWER(username)=LOWER($1)
      `,
      [username]
    );

    if (exists.rowCount > 0) {
      return res.status(409).json({
        error: "Esse usuário já existe.",
      });
    }

    const count = await query(
      "SELECT COUNT(*)::int AS n FROM users"
    );

    const first =
      count.rows[0].n === 0;

    const hash = await bcrypt.hash(
      password,
      12
    );

    const result = await query(
      `
      INSERT INTO users(
        name,
        username,
        password_hash,
        job_id
      )
      VALUES($1,$2,$3,'estudante')
      RETURNING *
      `,
      [
        String(name).trim(),
        username,
        hash,
      ]
    );

    const user = result.rows[0];

    await query(
      `
      INSERT INTO job_unlocks(user_id, job_id)
      VALUES($1,'estudante')
      ON CONFLICT DO NOTHING
      `,
      [user.id]
    );

    await grantAchievement(
      user.id,
      "first_login"
    );

    const token = tokenFor(user);

    res.json({
      token,
      user: publicUser(user),
      isMayor: first,
    });
  } catch (error) {
    console.error(
      "Erro no cadastro:",
      error
    );

    res.status(500).json({
      error: "Erro ao criar conta.",
    });
  }
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      username,
      password,
    } = req.body;

    const result = await query(
      `
      SELECT *
      FROM users
      WHERE LOWER(username)=LOWER($1)
      `,
      [username || ""]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(
        password || "",
        user.password_hash
      ))
    ) {
      return res.status(401).json({
        error:
          "Usuário ou senha incorretos.",
      });
    }

    await updateNeeds(user);

    const fresh = await getUser(
      user.id
    );

    await grantAchievement(
      user.id,
      "first_login"
    );

    res.json({
      token: tokenFor(fresh),
      user: publicUser(fresh),
      isMayor:
        fresh.id ===
        (await mayorId()),
    });
  } catch (error) {
    console.error(
      "Erro no login:",
      error
    );

    res.status(500).json({
      error: "Erro ao entrar.",
    });
  }
});

// ======================================================
// ME
// ======================================================

app.get("/api/me", auth, async (req, res) => {
  try {
    let user = await getUser(
      req.userId
    );

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    user = await updateNeeds(user);

    await progressChecks(user);

    res.json({
      user: publicUser(user),
      isMayor:
        user.id ===
        (await mayorId()),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Erro ao carregar conta.",
    });
  }
});

// ======================================================
// CIDADE
// ======================================================

app.get("/api/city", auth, async (req, res) => {
  try {
    const cityResult = await query(
      "SELECT * FROM city WHERE id=1"
    );

    const city = cityResult.rows[0];

    const population = (
      await query(
        "SELECT COUNT(*)::int AS n FROM users"
      )
    ).rows[0].n;

    res.json({
      population,
      treasury: Number(city.treasury),
      economy: Number(city.economy),
      infrastructure:
        Number(city.infrastructure),
      quality: Number(city.quality),
      tax: Number(city.tax),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Erro ao carregar cidade.",
    });
  }
});

// ======================================================
// EMPREGOS
// ======================================================

app.get("/api/jobs", auth, async (req, res) => {
  try {
    const user = await getUser(
      req.userId
    );

    const unlocked = (
      await query(
        `
        SELECT job_id
        FROM job_unlocks
        WHERE user_id=$1
        `,
        [user.id]
      )
    ).rows.map(
      (row) => row.job_id
    );

    res.json(
      jobs.map((job) => ({
        ...job,
        unlocked:
          unlocked.includes(job.id),
        current:
          job.id === user.job_id,
      }))
    );
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Erro ao carregar empregos.",
    });
  }
});

app.post(
  "/api/jobs/select",
  auth,
  async (req, res) => {
    try {
      const {
        jobId,
      } = req.body;

      const job = jobs.find(
        (j) => j.id === jobId
      );

      if (!job) {
        return res.status(404).json({
          error:
            "Profissão inválida.",
        });
      }

      const user = await getUser(
        req.userId
      );

      if (
        Number(user.xp) <
        job.xp
      ) {
        return res.status(400).json({
          error:
            `Você precisa de ${job.xp} XP para desbloquear ${job.name}.`,
        });
      }

      await query(
        `
        INSERT INTO job_unlocks(
          user_id,
          job_id
        )
        VALUES($1,$2)
        ON CONFLICT DO NOTHING
        `,
        [user.id, job.id]
      );

      await query(
        `
        UPDATE users
        SET job_id=$1
        WHERE id=$2
        `,
        [job.id, user.id]
      );

      const fresh =
        await getUser(user.id);

      await progressChecks(
        fresh
      );

      res.json({
        user: publicUser(
          fresh
        ),
        message:
          `Profissão alterada para ${job.name}.`,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao trocar profissão.",
      });
    }
  }
);

// ======================================================
// MISSÕES
// ======================================================

app.get(
  "/api/missions",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(req.userId);

      const active = (
        await query(
          `
          SELECT *
          FROM missions
          WHERE user_id=$1
          AND status='running'
          ORDER BY started_at DESC
          LIMIT 10
          `,
          [user.id]
        )
      ).rows;

      const now = Date.now();

      const normalized =
        active.map((mission) => {
          const elapsed =
            Math.floor(
              (
                now -
                new Date(
                  mission.started_at
                ).getTime()
              ) / 1000
            );

          const remainder =
            Math.max(
              0,
              mission.duration_seconds -
                elapsed
            );

          return {
            ...mission,
            remainderSeconds:
              remainder,
            ready:
              remainder === 0,
          };
        });

      const job =
        jobs.find(
          (j) =>
            j.id === user.job_id
        ) || jobs[0];

      const history = (
        await query(
          `
          SELECT *
          FROM missions
          WHERE user_id=$1
          AND status='completed'
          ORDER BY completed_at DESC
          LIMIT 10
          `,
          [user.id]
        )
      ).rows;

      res.json({
        active: normalized,
        job,
        history,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar missões.",
      });
    }
  }
);

app.post(
  "/api/missions/start",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(req.userId);

      const job =
        jobs.find(
          (j) =>
            j.id === user.job_id
        ) || jobs[0];

      const active = (
        await query(
          `
          SELECT id
          FROM missions
          WHERE user_id=$1
          AND status='running'
          `,
          [user.id]
        )
      ).rowCount;

      if (active >= 3) {
        return res.status(400).json({
          error:
            "Você já possui 3 missões em andamento.",
        });
      }

      await query(
        `
        INSERT INTO missions(
          user_id,
          job_id,
          title,
          description,
          reward_money,
          reward_xp,
          duration_seconds
        )
        VALUES($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          user.id,
          job.id,
          `${job.name} • ${job.task}`,
          job.task,
          job.taskMoney,
          job.taskXp,
          job.duration,
        ]
      );

      await query(
        `
        UPDATE users
        SET
          energy=GREATEST(0,energy-8),
          hunger=GREATEST(0,hunger-4),
          hydration=GREATEST(0,hydration-3)
        WHERE id=$1
        `,
        [user.id]
      );

      res.json({
        message:
          "Missão iniciada.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Não foi possível iniciar a missão.",
      });
    }
  }
);

app.post(
  "/api/missions/:id/complete",
  auth,
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
          WHERE id=$1
          AND user_id=$2
          FOR UPDATE
          `,
          [
            req.params.id,
            req.userId,
          ]
        );

      const mission =
        missionResult.rows[0];

      if (!mission) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Missão não encontrada.",
        });
      }

      if (
        mission.status !==
        "running"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "Missão já concluída.",
        });
      }

      const elapsed =
        Date.now() -
        new Date(
          mission.started_at
        ).getTime();

      if (
        elapsed <
        mission.duration_seconds *
          1000
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          error:
            "O cronômetro ainda não terminou.",
        });
      }

      const userResult =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE id=$1
          FOR UPDATE
          `,
          [req.userId]
        );

      const user =
        userResult.rows[0];

      const xp =
        Number(user.xp) +
        Number(
          mission.reward_xp
        );

      const level =
        levelFromXP(xp);

      await client.query(
        `
        UPDATE users
        SET
          xp=$1,
          level=$2,
          professional_xp=professional_xp+$3,
          money=money+$4
        WHERE id=$5
        `,
        [
          xp,
          level,
          Number(
            mission.reward_xp
          ),
          Number(
            mission.reward_money
          ),
          user.id,
        ]
      );

      await client.query(
        `
        UPDATE missions
        SET
          status='completed',
          completed_at=NOW()
        WHERE id=$1
        `,
        [mission.id]
      );

      await client.query(
        "COMMIT"
      );

      await grantAchievement(
        user.id,
        "mission1"
      );

      const fresh =
        await getUser(user.id);

      await progressChecks(
        fresh
      );

      res.json({
        message:
          "Missão concluída!",
        rewardMoney:
          Number(
            mission.reward_money
          ),
        rewardXp:
          Number(
            mission.reward_xp
          ),
        user:
          publicUser(fresh),
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {}

      console.error(error);

      res.status(500).json({
        error:
          "Erro ao concluir missão.",
      });
    } finally {
      client.release();
    }
  }
);

// ======================================================
// LOJA
// ======================================================

app.get(
  "/api/shop",
  auth,
  (req, res) => {
    res.json(foods);
  }
);

// ======================================================
// INVENTÁRIO — API CONTINUA EXISTINDO,
// MAS O BOTÃO PODE FICAR FORA DO MENU
// ======================================================

app.get(
  "/api/inventory",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(req.userId);

      res.json({
        inventory:
          user.inventory || {},
        items: foods,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar inventário.",
      });
    }
  }
);

app.post(
  "/api/shop/buy",
  auth,
  async (req, res) => {
    try {
      const item =
        foods.find(
          (x) =>
            x.id ===
            req.body.itemId
        );

      const quantity = Math.max(
        1,
        Math.min(
          99,
          Number(
            req.body.quantity
          ) || 1
        )
      );

      if (!item) {
        return res.status(404).json({
          error:
            "Item inválido.",
        });
      }

      const user =
        await getUser(req.userId);

      const total =
        item.price * quantity;

      if (
        Number(user.money) <
        total
      ) {
        return res.status(400).json({
          error:
            "Dinheiro insuficiente.",
        });
      }

      const inventory = {
        ...(user.inventory || {}),
      };

      inventory[item.id] =
        (inventory[item.id] || 0) +
        quantity;

      await query(
        `
        UPDATE users
        SET
          money=money-$1,
          inventory=$2
        WHERE id=$3
        `,
        [
          total,
          JSON.stringify(
            inventory
          ),
          user.id,
        ]
      );

      await query(
        `
        INSERT INTO inventory_log(
          user_id,
          item_id,
          quantity,
          action
        )
        VALUES($1,$2,$3,'buy')
        `,
        [
          user.id,
          item.id,
          quantity,
        ]
      );

      res.json({
        message:
          `${quantity}x ${item.name} comprado.`,
        user:
          publicUser(
            await getUser(
              user.id
            )
          ),
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro na compra.",
      });
    }
  }
);

app.post(
  "/api/inventory/use",
  auth,
  async (req, res) => {
    try {
      const item =
        foods.find(
          (x) =>
            x.id ===
            req.body.itemId
        );

      if (!item) {
        return res.status(404).json({
          error:
            "Item inválido.",
        });
      }

      const user =
        await getUser(req.userId);

      const inventory = {
        ...(user.inventory || {}),
      };

      if (
        !inventory[item.id]
      ) {
        return res.status(400).json({
          error:
            "Você não possui esse item.",
        });
      }

      inventory[item.id]--;

      if (
        inventory[item.id] <= 0
      ) {
        delete inventory[item.id];
      }

      await query(
        `
        UPDATE users
        SET
          inventory=$1,
          hunger=LEAST(100,hunger+$2),
          hydration=LEAST(100,hydration+$3),
          energy=LEAST(100,energy+$4)
        WHERE id=$5
        `,
        [
          JSON.stringify(
            inventory
          ),
          item.hunger,
          item.hydration,
          item.energy,
          user.id,
        ]
      );

      await query(
        `
        INSERT INTO inventory_log(
          user_id,
          item_id,
          quantity,
          action
        )
        VALUES($1,$2,1,'use')
        `,
        [
          user.id,
          item.id,
        ]
      );

      res.json({
        message:
          `${item.name} consumido.`,
        user:
          publicUser(
            await getUser(
              user.id
            )
          ),
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao consumir item.",
      });
    }
  }
);

// ======================================================
// HOSPITAL
// ======================================================

app.get(
  "/api/hospital",
  auth,
  (req, res) => {
    res.json(hospitals);
  }
);

app.post(
  "/api/hospital/treat",
  auth,
  async (req, res) => {
    try {
      const service =
        hospitals.find(
          (x) =>
            x.id ===
            req.body.serviceId
        );

      if (!service) {
        return res.status(404).json({
          error:
            "Serviço inválido.",
        });
      }

      const user =
        await getUser(req.userId);

      if (
        Number(user.money) <
        service.price
      ) {
        return res.status(400).json({
          error:
            "Dinheiro insuficiente.",
        });
      }

      await query(
        `
        UPDATE users
        SET
          money=money-$1,
          life=LEAST(100,life+$2)
        WHERE id=$3
        `,
        [
          service.price,
          service.heal,
          user.id,
        ]
      );

      await grantAchievement(
        user.id,
        "healthy"
      );

      res.json({
        message:
          "Atendimento realizado.",
        user:
          publicUser(
            await getUser(
              user.id
            )
          ),
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro no hospital.",
      });
    }
  }
);

// ======================================================
// BANCO
// ======================================================

app.get(
  "/api/bank",
  auth,
  async (req, res) => {
    try {
      const user =
        await getUser(req.userId);

      const transfers =
        await query(
          `
          SELECT
            t.*,
            s.username AS sender_username,
            r.username AS receiver_username
          FROM transfers t
          JOIN users s
            ON s.id=t.sender_id
          JOIN users r
            ON r.id=t.receiver_id
          WHERE
            t.sender_id=$1
            OR t.receiver_id=$1
          ORDER BY t.created_at DESC
          LIMIT 30
          `,
          [user.id]
        );

      res.json({
        money:
          Number(user.money),
        bankMoney:
          Number(
            user.bank_money
          ),
        transfers:
          transfers.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar banco.",
      });
    }
  }
);

app.post(
  "/api/bank/deposit",
  auth,
  async (req, res) => {
    try {
      const amount =
        Number(req.body.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Valor inválido.",
        });
      }

      const user =
        await getUser(req.userId);

      if (
        Number(user.money) <
        amount
      ) {
        return res.status(400).json({
          error:
            "Dinheiro em mãos insuficiente.",
        });
      }

      await query(
        `
        UPDATE users
        SET
          money=money-$1,
          bank_money=bank_money+$1
        WHERE id=$2
        `,
        [
          amount,
          user.id,
        ]
      );

      res.json({
        user:
          publicUser(
            await getUser(
              user.id
            )
          ),
        message:
          "Depósito realizado.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro no depósito.",
      });
    }
  }
);

app.post(
  "/api/bank/withdraw",
  auth,
  async (req, res) => {
    try {
      const amount =
        Number(req.body.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          error:
            "Valor inválido.",
        });
      }

      const user =
        await getUser(req.userId);

      if (
        Number(user.bank_money) <
        amount
      ) {
        return res.status(400).json({
          error:
            "Saldo bancário insuficiente.",
        });
      }

      await query(
        `
        UPDATE users
        SET
          money=money+$1,
          bank_money=bank_money-$1
        WHERE id=$2
        `,
        [
          amount,
          user.id,
        ]
      );

      res.json({
        user:
          publicUser(
            await getUser(
              user.id
            )
          ),
        message:
          "Saque realizado.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro no saque.",
      });
    }
  }
);

app.post(
  "/api/bank/transfer",
  auth,
  async (req, res) => {
    const amount =
      Number(req.body.amount);

    const username =
      String(
        req.body.username || ""
      ).trim();

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        error:
          "Valor inválido.",
      });
    }

    if (!username) {
      return res.status(400).json({
        error:
          "Informe o usuário destinatário.",
      });
    }

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const sender =
        (
          await client.query(
            `
            SELECT *
            FROM users
            WHERE id=$1
            FOR UPDATE
            `,
            [req.userId]
          )
        ).rows[0];

      const receiver =
        (
          await client.query(
            `
            SELECT *
            FROM users
            WHERE LOWER(username)=LOWER($1)
            FOR UPDATE
            `,
            [username]
          )
        ).rows[0];

      if (!receiver) {
        throw new Error(
          "DEST_NOT_FOUND"
        );
      }

      if (
        receiver.id ===
        sender.id
      ) {
        throw new Error(
          "SELF_TRANSFER"
        );
      }

      if (
        Number(sender.bank_money) <
        amount
      ) {
        throw new Error(
          "NO_FUNDS"
        );
      }

      await client.query(
        `
        UPDATE users
        SET bank_money=bank_money-$1
        WHERE id=$2
        `,
        [
          amount,
          sender.id,
        ]
      );

      await client.query(
        `
        UPDATE users
        SET bank_money=bank_money+$1
        WHERE id=$2
        `,
        [
          amount,
          receiver.id,
        ]
      );

      await client.query(
        `
        INSERT INTO transfers(
          sender_id,
          receiver_id,
          amount
        )
        VALUES($1,$2,$3)
        `,
        [
          sender.id,
          receiver.id,
          amount,
        ]
      );

      await client.query(
        "COMMIT"
      );

      await grantAchievement(
        sender.id,
        "bank"
      );

      res.json({
        message:
          `Transferência de R$ ${amount.toFixed(
            2
          )} enviada para ${receiver.username}.`,
        user:
          publicUser(
            await getUser(
              sender.id
            )
          ),
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {}

      const errors = {
        DEST_NOT_FOUND: [
          "Destinatário não encontrado.",
          404,
        ],
        SELF_TRANSFER: [
          "Você não pode transferir para si mesmo.",
          400,
        ],
        NO_FUNDS: [
          "Saldo bancário insuficiente.",
          400,
        ],
      };

      const result =
        errors[error.message] || [
          "Erro na transferência.",
          500,
        ];

      res.status(result[1]).json({
        error: result[0],
      });
    } finally {
      client.release();
    }
  }
);

// ======================================================
// NOTÍCIAS
// ======================================================

app.get(
  "/api/news",
  auth,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          SELECT
            n.*,
            u.name AS author_name
          FROM news n
          LEFT JOIN users u
            ON u.id=n.author_id
          ORDER BY n.created_at DESC
          `
        );

      res.json(result.rows);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar notícias.",
      });
    }
  }
);

// ======================================================
// EVENTOS
// ======================================================

app.get(
  "/api/events",
  auth,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          SELECT
            e.*,
            u.name AS author_name
          FROM events e
          LEFT JOIN users u
            ON u.id=e.author_id
          ORDER BY e.event_date ASC
          `
        );

      res.json(result.rows);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar eventos.",
      });
    }
  }
);

// ======================================================
// PREFEITURA — NOTÍCIAS
// ======================================================

app.post(
  "/api/mayor/news",
  auth,
  requireMayor,
  async (req, res) => {
    try {
      const {
        title,
        body,
        image,
      } = req.body;

      if (!title || !body) {
        return res.status(400).json({
          error:
            "Título e texto são obrigatórios.",
        });
      }

      await query(
        `
        INSERT INTO news(
          title,
          body,
          image,
          author_id
        )
        VALUES($1,$2,$3,$4)
        `,
        [
          title,
          body,
          image || null,
          req.userId,
        ]
      );

      res.json({
        message:
          "Notícia publicada.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao publicar notícia.",
      });
    }
  }
);

// ======================================================
// PREFEITURA — EVENTOS
// ======================================================

app.post(
  "/api/mayor/events",
  auth,
  requireMayor,
  async (req, res) => {
    try {
      const {
        title,
        description,
        image,
        eventDate,
      } = req.body;

      if (
        !title ||
        !description ||
        !eventDate
      ) {
        return res.status(400).json({
          error:
            "Preencha título, descrição e data.",
        });
      }

      await query(
        `
        INSERT INTO events(
          title,
          description,
          image,
          event_date,
          author_id
        )
        VALUES($1,$2,$3,$4,$5)
        `,
        [
          title,
          description,
          image || null,
          eventDate,
          req.userId,
        ]
      );

      res.json({
        message:
          "Evento criado.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao criar evento.",
      });
    }
  }
);

// ======================================================
// PROPOSTAS
// ======================================================

app.get(
  "/api/proposals",
  auth,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          SELECT
            p.*,
            u.name AS author_name,
            u.username AS author_username
          FROM proposals p
          JOIN users u
            ON u.id=p.author_id
          ORDER BY p.created_at DESC
          `
        );

      res.json(result.rows);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar propostas.",
      });
    }
  }
);

app.post(
  "/api/proposals",
  auth,
  async (req, res) => {
    try {
      const {
        title,
        description,
      } = req.body;

      if (
        !title ||
        !description
      ) {
        return res.status(400).json({
          error:
            "Preencha título e descrição.",
        });
      }

      await query(
        `
        INSERT INTO proposals(
          title,
          description,
          author_id
        )
        VALUES($1,$2,$3)
        `,
        [
          title,
          description,
          req.userId,
        ]
      );

      await grantAchievement(
        req.userId,
        "proposal"
      );

      res.json({
        message:
          "Proposta enviada à prefeitura.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao enviar proposta.",
      });
    }
  }
);

app.post(
  "/api/mayor/proposals/:id/decide",
  auth,
  requireMayor,
  async (req, res) => {
    try {
      const {
        status,
        response,
      } = req.body;

      if (
        !["accepted", "rejected"].includes(
          status
        )
      ) {
        return res.status(400).json({
          error:
            "Decisão inválida.",
        });
      }

      const result =
        await query(
          `
          UPDATE proposals
          SET
            status=$1,
            mayor_response=$2,
            decided_at=NOW()
          WHERE id=$3
          RETURNING *
          `,
          [
            status,
            response || "",
            req.params.id,
          ]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          error:
            "Proposta não encontrada.",
        });
      }

      res.json({
        message:
          "Decisão registrada.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao decidir proposta.",
      });
    }
  }
);

// ======================================================
// PREFEITURA
// ======================================================

app.get(
  "/api/mayor",
  auth,
  requireMayor,
  async (req, res) => {
    try {
      const city =
        (
          await query(
            "SELECT * FROM city WHERE id=1"
          )
        ).rows[0];

      const population =
        (
          await query(
            "SELECT COUNT(*)::int AS n FROM users"
          )
        ).rows[0].n;

      const missions =
        (
          await query(
            `
            SELECT COUNT(*)::int AS n
            FROM missions
            WHERE status='completed'
            `
          )
        ).rows[0].n;

      const pending =
        (
          await query(
            `
            SELECT COUNT(*)::int AS n
            FROM proposals
            WHERE status='pending'
            `
          )
        ).rows[0].n;

      res.json({
        population,
        treasury:
          Number(city.treasury),
        economy:
          Number(city.economy),
        infrastructure:
          Number(
            city.infrastructure
          ),
        quality:
          Number(city.quality),
        tax:
          Number(city.tax),
        missionsCompleted:
          missions,
        pendingProposals:
          pending,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar prefeitura.",
      });
    }
  }
);

// ======================================================
// CONFIGURAÇÕES DA CIDADE
// ======================================================

app.post(
  "/api/mayor/settings",
  auth,
  requireMayor,
  async (req, res) => {
    try {
      const tax =
        Number(req.body.tax);

      const economy =
        Number(req.body.economy);

      const infrastructure =
        Number(
          req.body.infrastructure
        );

      const quality =
        Number(req.body.quality);

      if (
        !Number.isFinite(tax) ||
        !Number.isFinite(economy) ||
        !Number.isFinite(
          infrastructure
        ) ||
        !Number.isFinite(quality)
      ) {
        return res.status(400).json({
          error:
            "Valores administrativos inválidos.",
        });
      }

      if (
        tax < 0 ||
        tax > 30 ||
        economy < 0 ||
        economy > 200 ||
        infrastructure < 0 ||
        infrastructure > 100 ||
        quality < 0 ||
        quality > 100
      ) {
        return res.status(400).json({
          error:
            "Use valores dentro dos limites permitidos.",
        });
      }

      await query(
        `
        UPDATE city
        SET
          tax=$1,
          economy=$2,
          infrastructure=$3,
          quality=$4,
          updated_at=NOW()
        WHERE id=1
        `,
        [
          tax,
          economy,
          infrastructure,
          quality,
        ]
      );

      res.json({
        message:
          "Configurações da cidade salvas.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao salvar configurações.",
      });
    }
  }
);

// ======================================================
// JOGADORES
// ======================================================

app.get(
  "/api/players",
  auth,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          SELECT
            id,
            name,
            username,
            level,
            xp,
            job_id,
            professional_xp
          FROM users
          ORDER BY level DESC, xp DESC
          `
        );

      res.json(
        result.rows.map(
          (user) => ({
            ...user,
            jobName:
              (
                jobs.find(
                  (j) =>
                    j.id ===
                    user.job_id
                ) ||
                jobs[0]
              ).name,
          })
        )
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar jogadores.",
      });
    }
  }
);

// ======================================================
// PERFIL
// ======================================================

app.get(
  "/api/players/:username",
  auth,
  async (req, res) => {
    try {
      const result =
        await query(
          `
          SELECT
            id,
            name,
            username,
            level,
            xp,
            job_id,
            professional_xp,
            created_at
          FROM users
          WHERE LOWER(username)=LOWER($1)
          `,
          [req.params.username]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          error:
            "Jogador não encontrado.",
        });
      }

      const user =
        result.rows[0];

      res.json({
        ...user,
        jobName:
          (
            jobs.find(
              (j) =>
                j.id ===
                user.job_id
            ) || jobs[0]
          ).name,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar perfil.",
      });
    }
  }
);

// ======================================================
// CONQUISTAS
// ======================================================

app.get(
  "/api/achievements",
  auth,
  async (req, res) => {
    try {
      const unlocked =
        (
          await query(
            `
            SELECT
              achievement_id,
              unlocked_at
            FROM achievements
            WHERE user_id=$1
            `,
            [req.userId]
          )
        ).rows;

      const map =
        new Map(
          unlocked.map(
            (item) => [
              item.achievement_id,
              item,
            ]
          )
        );

      res.json(
        achievements.map(
          (achievement) => ({
            id:
              achievement[0],
            name:
              achievement[1],
            description:
              achievement[2],
            icon:
              achievement[3],
            unlocked:
              map.has(
                achievement[0]
              ),
            unlockedAt:
              map.get(
                achievement[0]
              )?.unlocked_at ||
              null,
          })
        )
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Erro ao carregar conquistas.",
      });
    }
  }
);

// ======================================================
// ROTA NÃO ENCONTRADA
// Compatível com Express 5 / path-to-regexp
// NÃO usar app.get("*")
// ======================================================

app.use((req, res) => {
  if (
    req.path.startsWith("/api/")
  ) {
    return res.status(404).json({
      error:
        "Rota da API não encontrada.",
    });
  }

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

// ======================================================
// ERROS GERAIS
// ======================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Erro interno:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Erro interno do servidor.",
    });
  }
);

// ======================================================
// INICIAR SERVIDOR
// ======================================================

async function startServer() {
  try {
    await initDB();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Sorokiba rodando na porta ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Falha ao inicializar o Sorokiba:",
      error
    );

    process.exit(1);
  }
}

startServer();
