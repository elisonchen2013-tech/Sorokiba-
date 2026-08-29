"use strict";

const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT) || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("ERRO: DATABASE_URL não configurada.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(express.static(__dirname));

/* ============================================================
   UTILIDADES
============================================================ */

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    try {
        const [salt, originalHash] = String(stored).split(":");

        if (!salt || !originalHash) {
            return false;
        }

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

function createToken() {
    return crypto.randomBytes(48).toString("hex");
}

function cleanUser(user) {
    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,

        xp: Number(user.xp || 0),
        level: Number(user.level || 1),

        money: Number(user.money || 0),
        bank: Number(user.bank || 0),

        job: user.job || "Estudante",
        job_xp: Number(user.job_xp || 0),

        hp: Number(user.hp ?? 100),
        max_hp: Number(user.max_hp ?? 100),

        hunger: Number(user.hunger ?? 100),
        hydration: Number(user.hydration ?? 100),
        energy: Number(user.energy ?? 100),

        inventory: user.inventory || [],
        achievements: user.achievements || {}
    };
}

function normalizeUsername(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function normalizeName(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ");
}

function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

/* ============================================================
   EMPREGOS
============================================================ */

const JOBS = {
    Estudante: {
        xp: 0,
        salary: 50,
        task: "Estudar",
        taskXP: 25,
        taskMoney: 50,
        duration: 60
    },

    Entregador: {
        xp: 100,
        salary: 100,
        task: "Fazer uma entrega",
        taskXP: 50,
        taskMoney: 100,
        duration: 90
    },

    Comerciante: {
        xp: 300,
        salary: 180,
        task: "Atender um cliente",
        taskXP: 75,
        taskMoney: 180,
        duration: 120
    },

    Motorista: {
        xp: 600,
        salary: 250,
        task: "Realizar uma viagem",
        taskXP: 100,
        taskMoney: 250,
        duration: 150
    },

    Policial: {
        xp: 1000,
        salary: 350,
        task: "Realizar uma patrulha",
        taskXP: 125,
        taskMoney: 350,
        duration: 180
    },

    Enfermeiro: {
        xp: 1500,
        salary: 450,
        taskXP: 150,
        taskMoney: 450,
        task: "Atender um paciente",
        duration: 210
    },

    Médico: {
        xp: 2000,
        salary: 600,
        taskXP: 200,
        taskMoney: 600,
        task: "Realizar um atendimento médico",
        duration: 240
    },

    Programador: {
        xp: 2700,
        salary: 800,
        taskXP: 275,
        taskMoney: 800,
        task: "Resolver uma tarefa de programação",
        duration: 270
    },

    Engenheiro: {
        xp: 3500,
        salary: 1000,
        taskXP: 350,
        taskMoney: 1000,
        task: "Trabalhar em um projeto",
        duration: 300
    },

    Administrador: {
        xp: 4500,
        salary: 1300,
        taskXP: 450,
        taskMoney: 1300,
        task: "Administrar uma atividade da cidade",
        duration: 330
    }
};

/* ============================================================
   COMIDA
============================================================ */

const FOODS = {
    "Pão": {
        price: 15,
        hunger: 15,
        hydration: 2,
        energy: 5
    },

    "Sanduíche": {
        price: 30,
        hunger: 30,
        hydration: 5,
        energy: 10
    },

    "Refeição": {
        price: 60,
        hunger: 50,
        hydration: 10,
        energy: 20
    },

    "Frutas": {
        price: 25,
        hunger: 20,
        hydration: 15,
        energy: 10
    },

    "Água": {
        price: 10,
        hunger: 0,
        hydration: 35,
        energy: 3
    },

    "Suco": {
        price: 20,
        hunger: 3,
        hydration: 25,
        energy: 8
    }
};

/* ============================================================
   HOSPITAL
============================================================ */

const HOSPITAL_SERVICES = {
    consulta: {
        name: "Consulta médica",
        price: 100,
        hp: 25
    },

    tratamento: {
        name: "Tratamento",
        price: 250,
        hp: 60
    },

    emergencia: {
        name: "Atendimento completo",
        price: 500,
        hp: 100
    }
};

/* ============================================================
   BANCO
============================================================ */

async function query(text, params = []) {
    return pool.query(text, params);
}

/* ============================================================
   INICIALIZAÇÃO DO BANCO
============================================================ */

async function initDatabase() {
    console.log("Inicializando banco de dados...");

    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

            username TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            password TEXT NOT NULL,

            role TEXT NOT NULL DEFAULT 'citizen',

            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,

            money NUMERIC(14,2) NOT NULL DEFAULT 500,
            bank NUMERIC(14,2) NOT NULL DEFAULT 50,

            job TEXT NOT NULL DEFAULT 'Estudante',
            job_xp INTEGER NOT NULL DEFAULT 0,

            hp INTEGER NOT NULL DEFAULT 100,
            max_hp INTEGER NOT NULL DEFAULT 100,

            hunger INTEGER NOT NULL DEFAULT 100,
            hydration INTEGER NOT NULL DEFAULT 100,
            energy INTEGER NOT NULL DEFAULT 100,

            inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
            achievements JSONB NOT NULL DEFAULT '{}'::jsonb,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS city (
            id INTEGER PRIMARY KEY,
            population INTEGER NOT NULL DEFAULT 0,
            treasury NUMERIC(14,2) NOT NULL DEFAULT 1000,
            gdp NUMERIC(14,2) NOT NULL DEFAULT 100000,
            territory NUMERIC(14,2) NOT NULL DEFAULT 10,
            infrastructure INTEGER NOT NULL DEFAULT 50,
            quality INTEGER NOT NULL DEFAULT 70,
            tax NUMERIC(5,2) NOT NULL DEFAULT 5
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS news (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS proposals (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            mayor_response TEXT,
            decided_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
            decided_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS events (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            image TEXT,
            author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            event_date TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            receiver_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            amount NUMERIC(14,2) NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS missions (
            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            job TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            reward_money NUMERIC(14,2) NOT NULL DEFAULT 0,
            reward_xp INTEGER NOT NULL DEFAULT 0,
            duration_seconds INTEGER NOT NULL DEFAULT 60,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            status TEXT NOT NULL DEFAULT 'available',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        INSERT INTO city
            (id, population, treasury, gdp, territory, infrastructure, quality, tax)
        VALUES
            (1, 0, 1000, 100000, 10, 50, 70, 5)
        ON CONFLICT (id) DO NOTHING
    `);

    await query(`
        DELETE FROM sessions
        WHERE expires_at < NOW()
    `);

    console.log("Banco de dados inicializado com sucesso.");
}

/* ============================================================
   AUTENTICAÇÃO
============================================================ */

async function auth(req, res, next) {
    try {
        const header = req.headers.authorization || "";

        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({
                ok: false,
                error: "Não autenticado."
            });
        }

        const token = header.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                ok: false,
                error: "Token inválido."
            });
        }

        const result = await query(`
            SELECT
                u.*,
                s.token
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = $1
              AND s.expires_at > NOW()
            LIMIT 1
        `, [token]);

        if (!result.rows.length) {
            return res.status(401).json({
                ok: false,
                error: "Sessão expirada."
            });
        }

        req.user = result.rows[0];
        req.token = token;

        next();

    } catch (error) {
        console.error("AUTH ERROR:", error);

        return res.status(500).json({
            ok: false,
            error: "Erro de autenticação."
        });
    }
}

function mayorOnly(req, res, next) {
    if (!req.user || req.user.role !== "mayor") {
        return res.status(403).json({
            ok: false,
            error: "Apenas o prefeito pode realizar esta ação."
        });
    }

    next();
}

/* ============================================================
   ROTA PRINCIPAL
============================================================ */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get("/api/health", async (req, res) => {
    try {
        await query("SELECT 1");

        res.json({
            ok: true,
            status: "online",
            database: "connected",
            time: new Date().toISOString()
        });

    } catch (error) {
        console.error("HEALTH ERROR:", error);

        res.status(500).json({
            ok: false,
            status: "offline",
            database: "error"
        });
    }
});

/* ============================================================
   REGISTER
============================================================ */

app.post("/api/register", async (req, res) => {
    const client = await pool.connect();

    try {
        const username = normalizeUsername(req.body.username);
        const name = normalizeName(req.body.name);
        const password = String(req.body.password || "");

        if (!username || !name || !password) {
            return res.status(400).json({
                ok: false,
                error: "Preencha usuário, nome e senha."
            });
        }

        if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
            return res.status(400).json({
                ok: false,
                error: "Usuário inválido."
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                ok: false,
                error: "A senha precisa ter pelo menos 4 caracteres."
            });
        }

        await client.query("BEGIN");

        const existing = await client.query(`
            SELECT id
            FROM users
            WHERE LOWER(username) = $1
            LIMIT 1
        `, [username]);

        if (existing.rows.length) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                ok: false,
                error: "Esse usuário já existe."
            });
        }

        const totalResult = await client.query(`
            SELECT COUNT(*)::integer AS total
            FROM users
        `);

        const total = Number(totalResult.rows[0]?.total || 0);

        const role = total === 0
            ? "mayor"
            : "citizen";

        const passwordHash = hashPassword(password);

        /*
         * IMPORTANTE:
         * Não enviamos o ID.
         * O PostgreSQL gera o ID automaticamente.
         */

        const result = await client.query(`
            INSERT INTO users
                (
                    username,
                    name,
                    password,
                    role,
                    xp,
                    level,
                    money,
                    bank,
                    job,
                    job_xp,
                    hp,
                    max_hp,
                    hunger,
                    hydration,
                    energy,
                    inventory,
                    achievements
                )
            VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    0,
                    1,
                    500,
                    50,
                    'Estudante',
                    0,
                    100,
                    100,
                    100,
                    100,
                    100,
                    '[]'::jsonb,
                    '{}'::jsonb
                )
            RETURNING *
        `, [
            username,
            name,
            passwordHash,
            role
        ]);

        const user = result.rows[0];

        await client.query(`
            UPDATE city
            SET population = (
                SELECT COUNT(*)
                FROM users
            )
            WHERE id = 1
        `);

        const token = createToken();

        await client.query(`
            INSERT INTO sessions
                (
                    user_id,
                    token,
                    expires_at
                )
            VALUES
                (
                    $1,
                    $2,
                    NOW() + INTERVAL '30 days'
                )
        `, [
            user.id,
            token
        ]);

        await client.query("COMMIT");

        return res.status(201).json({
            ok: true,

            message: role === "mayor"
                ? "Conta criada. Você é o prefeito de Sorokiba!"
                : "Conta criada com sucesso!",

            token,
            user: cleanUser(user)
        });

    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch {}

        console.error("REGISTER ERROR:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                ok: false,
                error: "Esse usuário já existe."
            });
        }

        return res.status(500).json({
            ok: false,
            error: "Erro ao criar conta.",
            details: process.env.NODE_ENV === "development"
                ? error.message
                : undefined
        });

    } finally {
        client.release();
    }
});

/* ============================================================
   LOGIN
============================================================ */

app.post("/api/login", async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const password = String(req.body.password || "");

        if (!username || !password) {
            return res.status(400).json({
                ok: false,
                error: "Informe usuário e senha."
            });
        }

        const result = await query(`
            SELECT *
            FROM users
            WHERE LOWER(username) = $1
            LIMIT 1
        `, [username]);

        if (!result.rows.length) {
            return res.status(401).json({
                ok: false,
                error: "Usuário ou senha incorretos."
            });
        }

        const user = result.rows[0];

        if (!verifyPassword(password, user.password)) {
            return res.status(401).json({
                ok: false,
                error: "Usuário ou senha incorretos."
            });
        }

        const token = createToken();

        await query(`
            INSERT INTO sessions
                (
                    user_id,
                    token,
                    expires_at
                )
            VALUES
                (
                    $1,
                    $2,
                    NOW() + INTERVAL '30 days'
                )
        `, [
            user.id,
            token
        ]);

        res.json({
            ok: true,
            message: "Login realizado com sucesso.",
            token,
            user: cleanUser(user)
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao fazer login."
        });
    }
});/* ============================================================
LOGOUT
============================================================ */

app.post("/api/logout", auth, async (req, res) => {
 try {
     await query(`
         DELETE FROM sessions
         WHERE token = $1
     `, [req.token]);

     res.json({
         ok: true,
         message: "Logout realizado."
     });

 } catch (error) {
     console.error("LOGOUT ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao sair da conta."
     });
 }
});


/* ============================================================
USUÁRIO ATUAL
============================================================ */

app.get("/api/me", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT *
         FROM users
         WHERE id = $1
         LIMIT 1
     `, [req.user.id]);

     if (!result.rows.length) {
         return res.status(404).json({
             ok: false,
             error: "Usuário não encontrado."
         });
     }

     res.json({
         ok: true,
         user: cleanUser(result.rows[0])
     });

 } catch (error) {
     console.error("ME ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar usuário."
     });
 }
});


/* ============================================================
ESTADO COMPLETO DO JOGO
============================================================ */

app.get("/api/state", auth, async (req, res) => {
 try {

     const userResult = await query(`
         SELECT *
         FROM users
         WHERE id = $1
         LIMIT 1
     `, [req.user.id]);

     if (!userResult.rows.length) {
         return res.status(404).json({
             ok: false,
             error: "Usuário não encontrado."
         });
     }

     const cityResult = await query(`
         SELECT *
         FROM city
         WHERE id = 1
         LIMIT 1
     `);

     const newsResult = await query(`
         SELECT
             n.id,
             n.title,
             n.content,
             n.image,
             n.created_at,
             u.name AS author
         FROM news n
         LEFT JOIN users u ON u.id = n.author_id
         ORDER BY n.created_at DESC
         LIMIT 30
     `);

     const proposalResult = await query(`
         SELECT
             p.id,
             p.title,
             p.content,
             p.status,
             p.mayor_response,
             p.created_at,
             p.decided_at,
             u.name AS author
         FROM proposals p
         LEFT JOIN users u ON u.id = p.author_id
         ORDER BY p.created_at DESC
         LIMIT 50
     `);

     const eventResult = await query(`
         SELECT
             e.id,
             e.title,
             e.description,
             e.image,
             e.event_date,
             e.created_at,
             u.name AS author
         FROM events e
         LEFT JOIN users u ON u.id = e.author_id
         ORDER BY e.created_at DESC
         LIMIT 30
     `);

     const playersResult = await query(`
         SELECT
             id,
             username,
             name,
             role,
             level,
             xp,
             money,
             job,
             hp,
             max_hp,
             hunger,
             hydration,
             energy
         FROM users
         ORDER BY level DESC, xp DESC, name ASC
         LIMIT 100
     `);

     const missionResult = await query(`
         SELECT *
         FROM missions
         WHERE user_id = $1
           AND status IN ('available', 'running')
         ORDER BY created_at DESC
         LIMIT 1
     `, [req.user.id]);

     const transactionResult = await query(`
         SELECT
             t.id,
             t.amount,
             t.type,
             t.description,
             t.created_at,
             s.name AS sender_name,
             r.name AS receiver_name
         FROM transactions t
         LEFT JOIN users s ON s.id = t.sender_id
         LEFT JOIN users r ON r.id = t.receiver_id
         WHERE t.sender_id = $1
            OR t.receiver_id = $1
         ORDER BY t.created_at DESC
         LIMIT 30
     `, [req.user.id]);

     res.json({
         ok: true,

         user: cleanUser(userResult.rows[0]),

         city: cityResult.rows[0] || {
             id: 1,
             population: 0,
             treasury: 1000,
             gdp: 100000,
             territory: 10,
             infrastructure: 50,
             quality: 70,
             tax: 5
         },

         jobs: JOBS,

         foods: FOODS,

         hospital: HOSPITAL_SERVICES,

         news: newsResult.rows,

         proposals: proposalResult.rows,

         events: eventResult.rows,

         players: playersResult.rows,

         mission: missionResult.rows[0] || null,

         transactions: transactionResult.rows
     });

 } catch (error) {
     console.error("STATE ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Não foi possível carregar o estado do jogo."
     });
 }
});


/* ============================================================
LISTA DE EMPREGOS
============================================================ */

app.get("/api/jobs", auth, async (req, res) => {
 try {

     const jobs = Object.entries(JOBS).map(([name, data]) => ({
         name,
         ...data,
         unlocked: Number(req.user.xp || 0) >= data.xp
     }));

     res.json({
         ok: true,
         jobs
     });

 } catch (error) {
     console.error("JOBS ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar empregos."
     });
 }
});


/* ============================================================
ESCOLHER EMPREGO
============================================================ */

app.post("/api/job", auth, async (req, res) => {
 try {

     const job = String(req.body.job || "").trim();

     if (!JOBS[job]) {
         return res.status(400).json({
             ok: false,
             error: "Esse emprego não existe."
         });
     }

     const requiredXP = JOBS[job].xp;
     const currentXP = Number(req.user.xp || 0);

     if (currentXP < requiredXP) {
         return res.status(403).json({
             ok: false,
             error: `Você precisa de ${requiredXP} XP para trabalhar como ${job}.`
         });
     }

     await query(`
         UPDATE users
         SET job = $1,
             job_xp = 0
         WHERE id = $2
     `, [
         job,
         req.user.id
     ]);

     const result = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: `Você agora trabalha como ${job}.`,
         user: cleanUser(result.rows[0])
     });

 } catch (error) {
     console.error("CHANGE JOB ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Não foi possível mudar de emprego."
     });
 }
});


/* ============================================================
CRIAR MISSÃO
============================================================ */

app.post("/api/job-task", auth, async (req, res) => {
 const client = await pool.connect();

 try {

     await client.query("BEGIN");

     const userResult = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     if (!userResult.rows.length) {
         await client.query("ROLLBACK");

         return res.status(404).json({
             ok: false,
             error: "Usuário não encontrado."
         });
     }

     const user = userResult.rows[0];
     const job = user.job || "Estudante";
     const jobData = JOBS[job];

     if (!jobData) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Emprego inválido."
         });
     }

     const activeMission = await client.query(`
         SELECT id
         FROM missions
         WHERE user_id = $1
           AND status = 'running'
         LIMIT 1
     `, [user.id]);

     if (activeMission.rows.length) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Você já possui uma missão em andamento."
         });
     }

     const mission = await client.query(`
         INSERT INTO missions
             (
                 user_id,
                 job,
                 title,
                 description,
                 reward_money,
                 reward_xp,
                 duration_seconds,
                 started_at,
                 status
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
                 NOW(),
                 'running'
             )
         RETURNING *
     `, [
         user.id,
         job,
         jobData.task,
         `Complete a missão de ${jobData.task.toLowerCase()}.`,
         jobData.taskMoney,
         jobData.taskXP,
         jobData.duration
     ]);

     await client.query("COMMIT");

     res.json({
         ok: true,
         message: "Missão iniciada!",
         mission: mission.rows[0]
     });

 } catch (error) {

     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("CREATE MISSION ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Não foi possível iniciar a missão."
     });

 } finally {
     client.release();
 }
});


/* ============================================================
CONCLUIR MISSÃO
============================================================ */

app.post("/api/mission/complete", auth, async (req, res) => {
 const client = await pool.connect();

 try {

     await client.query("BEGIN");

     const missionResult = await client.query(`
         SELECT *
         FROM missions
         WHERE id = $1
           AND user_id = $2
           AND status = 'running'
         FOR UPDATE
     `, [
         req.body.missionId,
         req.user.id
     ]);

     if (!missionResult.rows.length) {
         await client.query("ROLLBACK");

         return res.status(404).json({
             ok: false,
             error: "Missão não encontrada."
         });
     }

     const mission = missionResult.rows[0];

     const started = new Date(mission.started_at).getTime();
     const now = Date.now();

     const elapsedSeconds = Math.floor(
         (now - started) / 1000
     );

     if (elapsedSeconds < Number(mission.duration_seconds)) {
         const remaining =
             Number(mission.duration_seconds) - elapsedSeconds;

         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "A missão ainda não terminou.",
             remainingSeconds: remaining
         });
     }

     const userResult = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     const user = userResult.rows[0];

     const oldXP = Number(user.xp || 0);
     const oldJobXP = Number(user.job_xp || 0);

     const newXP =
         oldXP + Number(mission.reward_xp || 0);

     const newJobXP =
         oldJobXP + Number(mission.reward_xp || 0);

     const newLevel =
         Math.floor(newXP / 500) + 1;

     await client.query(`
         UPDATE users
         SET
             xp = $1,
             level = $2,
             job_xp = $3,
             money = money + $4,
             energy = GREATEST(0, energy - 10),
             hunger = GREATEST(0, hunger - 5),
             hydration = GREATEST(0, hydration - 5)
         WHERE id = $5
     `, [
         newXP,
         newLevel,
         newJobXP,
         Number(mission.reward_money || 0),
         req.user.id
     ]);

     await client.query(`
         UPDATE missions
         SET
             status = 'completed',
             completed_at = NOW()
         WHERE id = $1
     `, [mission.id]);

     await client.query(`
         INSERT INTO transactions
             (
                 sender_id,
                 receiver_id,
                 amount,
                 type,
                 description
             )
         VALUES
             (
                 NULL,
                 $1,
                 $2,
                 'mission_reward',
                 $3
             )
     `, [
         req.user.id,
         Number(mission.reward_money || 0),
         `Recompensa da missão: ${mission.title}`
     ]);

     await client.query("COMMIT");

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: "Missão concluída!",
         reward: {
             money: Number(mission.reward_money || 0),
             xp: Number(mission.reward_xp || 0)
         },
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {

     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("COMPLETE MISSION ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao concluir missão."
     });

 } finally {
     client.release();
 }
});


/* ============================================================
CANCELAR MISSÃO
============================================================ */

app.post("/api/mission/cancel", auth, async (req, res) => {
 try {

     await query(`
         UPDATE missions
         SET status = 'cancelled'
         WHERE id = $1
           AND user_id = $2
           AND status = 'running'
     `, [
         req.body.missionId,
         req.user.id
     ]);

     res.json({
         ok: true,
         message: "Missão cancelada."
     });

 } catch (error) {
     console.error("CANCEL MISSION ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao cancelar missão."
     });
 }
});


/* ============================================================
COMPRAR COMIDA
============================================================ */

app.post("/api/food/buy", auth, async (req, res) => {
 const client = await pool.connect();

 try {

     await client.query("BEGIN");

     const foodName = String(req.body.food || "").trim();
     const food = FOODS[foodName];

     if (!food) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Comida não encontrada."
         });
     }

     const userResult = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     const user = userResult.rows[0];

     if (Number(user.money) < food.price) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Dinheiro insuficiente."
         });
     }

     let inventory = Array.isArray(user.inventory)
         ? user.inventory
         : [];

     inventory.push({
         name: foodName,
         purchasedAt: new Date().toISOString()
     });

     await client.query(`
         UPDATE users
         SET
             money = money - $1,
             inventory = $2::jsonb
         WHERE id = $3
     `, [
         food.price,
         JSON.stringify(inventory),
         req.user.id
     ]);

     await client.query(`
         INSERT INTO transactions
             (
                 sender_id,
                 receiver_id,
                 amount,
                 type,
                 description
             )
         VALUES
             (
                 $1,
                 NULL,
                 $2,
                 'food_purchase',
                 $3
             )
     `, [
         req.user.id,
         food.price,
         `Compra de ${foodName}`
     ]);

     await client.query("COMMIT");

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: `${foodName} comprado.`,
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {

     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("FOOD BUY ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao comprar comida."
     });

 } finally {
     client.release();
 }
});


/* ============================================================
COMER / BEBER
============================================================ */

app.post("/api/food/use", auth, async (req, res) => {
 try {

     const foodName = String(req.body.food || "").trim();

     if (!FOODS[foodName]) {
         return res.status(400).json({
             ok: false,
             error: "Item inválido."
         });
     }

     const userResult = await query(`
         SELECT *
         FROM users
         WHERE id = $1
         LIMIT 1
     `, [req.user.id]);

     const user = userResult.rows[0];

     let inventory = Array.isArray(user.inventory)
         ? user.inventory
         : [];

     const index = inventory.findIndex(
         item => item && item.name === foodName
     );

     if (index === -1) {
         return res.status(400).json({
             ok: false,
             error: "Você não possui esse item."
         });
     }

     inventory.splice(index, 1);

     const food = FOODS[foodName];

     const hunger = Math.min(
         100,
         Number(user.hunger || 0) + food.hunger
     );

     const hydration = Math.min(
         100,
         Number(user.hydration || 0) + food.hydration
     );

     const energy = Math.min(
         100,
         Number(user.energy || 0) + food.energy
     );

     await query(`
         UPDATE users
         SET
             inventory = $1::jsonb,
             hunger = $2,
             hydration = $3,
             energy = $4
         WHERE id = $5
     `, [
         JSON.stringify(inventory),
         hunger,
         hydration,
         energy,
         req.user.id
     ]);

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: `${foodName} consumido.`,
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {
     console.error("FOOD USE ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao consumir item."
     });
 }
});


/* ============================================================
HOSPITAL
============================================================ */

app.post("/api/hospital", auth, async (req, res) => {
 const client = await pool.connect();

 try {

     await client.query("BEGIN");

     const serviceName =
         String(req.body.service || "").trim();

     const service =
         HOSPITAL_SERVICES[serviceName];

     if (!service) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Serviço hospitalar inválido."
         });
     }

     const userResult = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     const user = userResult.rows[0];

     if (Number(user.money) < service.price) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Você não possui dinheiro suficiente."
         });
     }

     const newHP = Math.min(
         Number(user.max_hp || 100),
         Number(user.hp || 0) + service.hp
     );

     await client.query(`
         UPDATE users
         SET
             money = money - $1,
             hp = $2,
             energy = GREATEST(0, energy - 5)
         WHERE id = $3
     `, [
         service.price,
         newHP,
         req.user.id
     ]);

     await client.query(`
         INSERT INTO transactions
             (
                 sender_id,
                 receiver_id,
                 amount,
                 type,
                 description
             )
         VALUES
             (
                 $1,
                 NULL,
                 $2,
                 'hospital',
                 $3
             )
     `, [
         req.user.id,
         service.price,
         service.name
     ]);

     await client.query("COMMIT");

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: `${service.name} realizado.`,
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {

     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("HOSPITAL ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro no hospital."
     });

 } finally {
     client.release();
 }
});


/* ============================================================
TRANSFERÊNCIA DE DINHEIRO
============================================================ */

app.post("/api/transfer", auth, async (req, res) => {
 const client = await pool.connect();

 try {

     await client.query("BEGIN");

     const receiverUsername =
         normalizeUsername(req.body.username);

     const amount =
         Number(req.body.amount);

     if (!receiverUsername) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Informe o usuário que receberá o dinheiro."
         });
     }

     if (!Number.isFinite(amount) || amount <= 0) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Valor inválido."
         });
     }

     if (amount > 1000000) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Valor muito alto."
         });
     }

     const senderResult = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     const sender = senderResult.rows[0];

     if (Number(sender.money) < amount) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Você não possui dinheiro suficiente."
         });
     }

     const receiverResult = await client.query(`
         SELECT *
         FROM users
         WHERE LOWER(username) = $1
         FOR UPDATE
     `, [receiverUsername]);

     if (!receiverResult.rows.length) {
         await client.query("ROLLBACK");

         return res.status(404).json({
             ok: false,
             error: "Jogador não encontrado."
         });
     }

     const receiver = receiverResult.rows[0];

     if (Number(receiver.id) === Number(sender.id)) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Você não pode transferir dinheiro para você mesmo."
         });
     }

     await client.query(`
         UPDATE users
         SET money = money - $1
         WHERE id = $2
     `, [
         amount,
         sender.id
     ]);

     await client.query(`
         UPDATE users
         SET money = money + $1
         WHERE id = $2
     `, [
         amount,
         receiver.id
     ]);

     await client.query(`
         INSERT INTO transactions
             (
                 sender_id,
                 receiver_id,
                 amount,
                 type,
                 description
             )
         VALUES
             (
                 $1,
                 $2,
                 $3,
                 'transfer',
                 $4
             )
     `, [
         sender.id,
         receiver.id,
         amount,
         `Transferência para ${receiver.name}`
     ]);

     await client.query("COMMIT");

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [sender.id]);

     res.json({
         ok: true,
         message: `R$ ${amount.toFixed(2)} transferidos para ${receiver.name}.`,
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {

     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("TRANSFER ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao transferir dinheiro."
     });

 } finally {
     client.release();
 }
});/* ============================================================
PARTE 3 — PREFEITURA, PROPOSTAS, NOTÍCIAS, EVENTOS,
BANCO, PERFIL E SISTEMA DA CIDADE
============================================================ */


/* ============================================================
CRIAR PROPOSTA
============================================================ */

app.post("/api/proposals", auth, async (req, res) => {
 try {
     const title = String(req.body.title || "").trim();
     const content = String(req.body.content || "").trim();

     if (!title || !content) {
         return res.status(400).json({
             ok: false,
             error: "Informe o título e o conteúdo da proposta."
         });
     }

     if (title.length > 100) {
         return res.status(400).json({
             ok: false,
             error: "O título é muito grande."
         });
     }

     if (content.length > 3000) {
         return res.status(400).json({
             ok: false,
             error: "A proposta é muito grande."
         });
     }

     const result = await query(`
         INSERT INTO proposals
             (
                 title,
                 content,
                 author_id,
                 status
             )
         VALUES
             (
                 $1,
                 $2,
                 $3,
                 'pending'
             )
         RETURNING *
     `, [
         title,
         content,
         req.user.id
     ]);

     res.status(201).json({
         ok: true,
         message: "Proposta enviada para a prefeitura.",
         proposal: result.rows[0]
     });

 } catch (error) {
     console.error("CREATE PROPOSAL ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao criar proposta."
     });
 }
});


/* ============================================================
PREFEITO — ACEITAR OU RECUSAR PROPOSTA
============================================================ */

app.post("/api/proposals/:id/decide", auth, mayorOnly, async (req, res) => {
 try {
     const proposalId = Number(req.params.id);

     const decision = String(
         req.body.decision || ""
     ).trim().toLowerCase();

     const response = String(
         req.body.response || ""
     ).trim();

     if (!Number.isInteger(proposalId)) {
         return res.status(400).json({
             ok: false,
             error: "Proposta inválida."
         });
     }

     if (!["accepted", "rejected"].includes(decision)) {
         return res.status(400).json({
             ok: false,
             error: "A decisão precisa ser accepted ou rejected."
         });
     }

     if (!response) {
         return res.status(400).json({
             ok: false,
             error: "O prefeito precisa escrever uma resposta."
         });
     }

     const result = await query(`
         UPDATE proposals
         SET
             status = $1,
             mayor_response = $2,
             decided_by = $3,
             decided_at = NOW()
         WHERE id = $4
           AND status = 'pending'
         RETURNING *
     `, [
         decision,
         response,
         req.user.id,
         proposalId
     ]);

     if (!result.rows.length) {
         return res.status(404).json({
             ok: false,
             error: "Proposta não encontrada ou já decidida."
         });
     }

     res.json({
         ok: true,
         message:
             decision === "accepted"
                 ? "Proposta aceita pelo prefeito."
                 : "Proposta recusada pelo prefeito.",
         proposal: result.rows[0]
     });

 } catch (error) {
     console.error("DECIDE PROPOSAL ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao decidir proposta."
     });
 }
});


/* ============================================================
LISTAR PROPOSTAS
============================================================ */

app.get("/api/proposals", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             p.id,
             p.title,
             p.content,
             p.status,
             p.mayor_response,
             p.created_at,
             p.decided_at,
             u.name AS author
         FROM proposals p
         LEFT JOIN users u
             ON u.id = p.author_id
         ORDER BY p.created_at DESC
         LIMIT 100
     `);

     res.json({
         ok: true,
         proposals: result.rows
     });

 } catch (error) {
     console.error("LIST PROPOSALS ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar propostas."
     });
 }
});


/* ============================================================
PREFEITO — CRIAR NOTÍCIA
============================================================ */

app.post("/api/news", auth, mayorOnly, async (req, res) => {
 try {
     const title = String(req.body.title || "").trim();
     const content = String(req.body.content || "").trim();
     const image = String(req.body.image || "").trim();

     if (!title || !content) {
         return res.status(400).json({
             ok: false,
             error: "Título e conteúdo são obrigatórios."
         });
     }

     if (title.length > 150) {
         return res.status(400).json({
             ok: false,
             error: "Título muito grande."
         });
     }

     if (content.length > 5000) {
         return res.status(400).json({
             ok: false,
             error: "Notícia muito grande."
         });
     }

     const result = await query(`
         INSERT INTO news
             (
                 title,
                 content,
                 image,
                 author_id
             )
         VALUES
             (
                 $1,
                 $2,
                 $3,
                 $4
             )
         RETURNING *
     `, [
         title,
         content,
         image || null,
         req.user.id
     ]);

     res.status(201).json({
         ok: true,
         message: "Notícia publicada.",
         news: result.rows[0]
     });

 } catch (error) {
     console.error("CREATE NEWS ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao publicar notícia."
     });
 }
});


/* ============================================================
LISTAR NOTÍCIAS
============================================================ */

app.get("/api/news", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             n.id,
             n.title,
             n.content,
             n.image,
             n.created_at,
             u.name AS author
         FROM news n
         LEFT JOIN users u
             ON u.id = n.author_id
         ORDER BY n.created_at DESC
         LIMIT 100
     `);

     res.json({
         ok: true,
         news: result.rows
     });

 } catch (error) {
     console.error("NEWS ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar notícias."
     });
 }
});


/* ============================================================
PREFEITO — CRIAR EVENTO
============================================================ */

app.post("/api/events", auth, mayorOnly, async (req, res) => {
 try {
     const title = String(req.body.title || "").trim();
     const description = String(
         req.body.description || ""
     ).trim();

     const image = String(
         req.body.image || ""
     ).trim();

     const eventDate = req.body.event_date
         ? new Date(req.body.event_date)
         : null;

     if (!title || !description) {
         return res.status(400).json({
             ok: false,
             error: "Título e descrição são obrigatórios."
         });
     }

     if (
         eventDate &&
         Number.isNaN(eventDate.getTime())
     ) {
         return res.status(400).json({
             ok: false,
             error: "Data do evento inválida."
         });
     }

     const result = await query(`
         INSERT INTO events
             (
                 title,
                 description,
                 image,
                 author_id,
                 event_date
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
     `, [
         title,
         description,
         image || null,
         req.user.id,
         eventDate
     ]);

     res.status(201).json({
         ok: true,
         message: "Evento criado.",
         event: result.rows[0]
     });

 } catch (error) {
     console.error("CREATE EVENT ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao criar evento."
     });
 }
});


/* ============================================================
LISTAR EVENTOS
============================================================ */

app.get("/api/events", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             e.id,
             e.title,
             e.description,
             e.image,
             e.event_date,
             e.created_at,
             u.name AS author
         FROM events e
         LEFT JOIN users u
             ON u.id = e.author_id
         ORDER BY
             COALESCE(e.event_date, e.created_at) DESC
         LIMIT 100
     `);

     res.json({
         ok: true,
         events: result.rows
     });

 } catch (error) {
     console.error("EVENTS ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar eventos."
     });
 }
});


/* ============================================================
PREFEITURA — VER DADOS DA CIDADE
============================================================ */

app.get("/api/mayor/city", auth, mayorOnly, async (req, res) => {
 try {
     const result = await query(`
         SELECT *
         FROM city
         WHERE id = 1
         LIMIT 1
     `);

     res.json({
         ok: true,
         city: result.rows[0] || null
     });

 } catch (error) {
     console.error("MAYOR CITY ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar dados da prefeitura."
     });
 }
});


/* ============================================================
PREFEITO — ALTERAR IMPOSTO
============================================================ */

app.post("/api/mayor/tax", auth, mayorOnly, async (req, res) => {
 try {
     const tax = Number(req.body.tax);

     if (!Number.isFinite(tax)) {
         return res.status(400).json({
             ok: false,
             error: "Valor de imposto inválido."
         });
     }

     if (tax < 0 || tax > 50) {
         return res.status(400).json({
             ok: false,
             error: "O imposto deve ficar entre 0% e 50%."
         });
     }

     const result = await query(`
         UPDATE city
         SET tax = $1
         WHERE id = 1
         RETURNING *
     `, [tax]);

     res.json({
         ok: true,
         message: `Imposto alterado para ${tax}%.`,
         city: result.rows[0]
     });

 } catch (error) {
     console.error("TAX ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao alterar imposto."
     });
 }
});


/* ============================================================
PREFEITO — ALTERAR INFRAESTRUTURA
============================================================ */

app.post(
 "/api/mayor/infrastructure",
 auth,
 mayorOnly,
 async (req, res) => {
     try {
         const value = Number(req.body.value);

         if (!Number.isFinite(value)) {
             return res.status(400).json({
                 ok: false,
                 error: "Valor inválido."
             });
         }

         if (value < 0 || value > 100) {
             return res.status(400).json({
                 ok: false,
                 error: "Infraestrutura deve ficar entre 0 e 100."
             });
         }

         const result = await query(`
             UPDATE city
             SET infrastructure = $1
             WHERE id = 1
             RETURNING *
         `, [Math.round(value)]);

         res.json({
             ok: true,
             message: "Infraestrutura atualizada.",
             city: result.rows[0]
         });

     } catch (error) {
         console.error(
             "INFRASTRUCTURE ERROR:",
             error
         );

         res.status(500).json({
             ok: false,
             error: "Erro ao atualizar infraestrutura."
         });
     }
 }
);


/* ============================================================
PREFEITO — ALTERAR QUALIDADE DE VIDA
============================================================ */

app.post(
 "/api/mayor/quality",
 auth,
 mayorOnly,
 async (req, res) => {
     try {
         const value = Number(req.body.value);

         if (!Number.isFinite(value)) {
             return res.status(400).json({
                 ok: false,
                 error: "Valor inválido."
             });
         }

         if (value < 0 || value > 100) {
             return res.status(400).json({
                 ok: false,
                 error: "Qualidade deve ficar entre 0 e 100."
             });
         }

         const result = await query(`
             UPDATE city
             SET quality = $1
             WHERE id = 1
             RETURNING *
         `, [Math.round(value)]);

         res.json({
             ok: true,
             message: "Qualidade de vida atualizada.",
             city: result.rows[0]
         });

     } catch (error) {
         console.error(
             "QUALITY ERROR:",
             error
         );

         res.status(500).json({
             ok: false,
             error: "Erro ao atualizar qualidade."
         });
     }
 }
);


/* ============================================================
PREFEITO — ALTERAR TESOURO
============================================================ */

app.post(
 "/api/mayor/treasury",
 auth,
 mayorOnly,
 async (req, res) => {
     try {
         const amount = Number(req.body.amount);

         if (!Number.isFinite(amount)) {
             return res.status(400).json({
                 ok: false,
                 error: "Valor inválido."
             });
         }

         if (amount < 0) {
             return res.status(400).json({
                 ok: false,
                 error: "O tesouro não pode ser negativo."
             });
         }

         const result = await query(`
             UPDATE city
             SET treasury = $1
             WHERE id = 1
             RETURNING *
         `, [amount]);

         res.json({
             ok: true,
             message: "Tesouro atualizado.",
             city: result.rows[0]
         });

     } catch (error) {
         console.error(
             "TREASURY ERROR:",
             error
         );

         res.status(500).json({
             ok: false,
             error: "Erro ao atualizar tesouro."
         });
     }
 }
);


/* ============================================================
BANCO — DEPOSITAR DINHEIRO
============================================================ */

app.post("/api/bank/deposit", auth, async (req, res) => {
 const client = await pool.connect();

 try {
     await client.query("BEGIN");

     const amount = Number(req.body.amount);

     if (!Number.isFinite(amount) || amount <= 0) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Valor inválido."
         });
     }

     const result = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     const user = result.rows[0];

     if (Number(user.money) < amount) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Dinheiro insuficiente."
         });
     }

     await client.query(`
         UPDATE users
         SET
             money = money - $1,
             bank = bank + $1
         WHERE id = $2
     `, [
         amount,
         req.user.id
     ]);

     await client.query(`
         INSERT INTO transactions
             (
                 sender_id,
                 receiver_id,
                 amount,
                 type,
                 description
             )
         VALUES
             (
                 $1,
                 NULL,
                 $2,
                 'bank_deposit',
                 'Depósito bancário'
             )
     `, [
         req.user.id,
         amount
     ]);

     await client.query("COMMIT");

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: "Depósito realizado.",
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {
     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("BANK DEPOSIT ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao realizar depósito."
     });

 } finally {
     client.release();
 }
});


/* ============================================================
BANCO — SACAR DINHEIRO
============================================================ */

app.post("/api/bank/withdraw", auth, async (req, res) => {
 const client = await pool.connect();

 try {
     await client.query("BEGIN");

     const amount = Number(req.body.amount);

     if (!Number.isFinite(amount) || amount <= 0) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Valor inválido."
         });
     }

     const result = await client.query(`
         SELECT *
         FROM users
         WHERE id = $1
         FOR UPDATE
     `, [req.user.id]);

     const user = result.rows[0];

     if (Number(user.bank) < amount) {
         await client.query("ROLLBACK");

         return res.status(400).json({
             ok: false,
             error: "Saldo bancário insuficiente."
         });
     }

     await client.query(`
         UPDATE users
         SET
             bank = bank - $1,
             money = money + $1
         WHERE id = $2
     `, [
         amount,
         req.user.id
     ]);

     await client.query(`
         INSERT INTO transactions
             (
                 sender_id,
                 receiver_id,
                 amount,
                 type,
                 description
             )
         VALUES
             (
                 NULL,
                 $1,
                 $2,
                 'bank_withdraw',
                 'Saque bancário'
             )
     `, [
         req.user.id,
         amount
     ]);

     await client.query("COMMIT");

     const updated = await query(`
         SELECT *
         FROM users
         WHERE id = $1
     `, [req.user.id]);

     res.json({
         ok: true,
         message: "Saque realizado.",
         user: cleanUser(updated.rows[0])
     });

 } catch (error) {
     try {
         await client.query("ROLLBACK");
     } catch {}

     console.error("BANK WITHDRAW ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao realizar saque."
     });

 } finally {
     client.release();
 }
});


/* ============================================================
LISTA DE JOGADORES
============================================================ */

app.get("/api/players", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             id,
             username,
             name,
             role,
             level,
             xp,
             money,
             job,
             hp,
             max_hp,
             hunger,
             hydration,
             energy
         FROM users
         ORDER BY
             level DESC,
             xp DESC,
             name ASC
         LIMIT 200
     `);

     res.json({
         ok: true,
         players: result.rows
     });

 } catch (error) {
     console.error("PLAYERS ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar jogadores."
     });
 }
});


/* ============================================================
RANKING
============================================================ */

app.get("/api/ranking", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             ROW_NUMBER() OVER (
                 ORDER BY xp DESC
             ) AS position,
             id,
             username,
             name,
             level,
             xp,
             job
         FROM users
         ORDER BY xp DESC
         LIMIT 100
     `);

     res.json({
         ok: true,
         ranking: result.rows
     });

 } catch (error) {
     console.error("RANKING ERROR:", error);

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar ranking."
     });
 }
});


/* ============================================================
TRANSAÇÕES DO USUÁRIO
============================================================ */

app.get("/api/transactions", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             t.id,
             t.amount,
             t.type,
             t.description,
             t.created_at,
             s.name AS sender_name,
             r.name AS receiver_name
         FROM transactions t
         LEFT JOIN users s
             ON s.id = t.sender_id
         LEFT JOIN users r
             ON r.id = t.receiver_id
         WHERE
             t.sender_id = $1
             OR t.receiver_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100
     `, [req.user.id]);

     res.json({
         ok: true,
         transactions: result.rows
     });

 } catch (error) {
     console.error(
         "TRANSACTIONS ERROR:",
         error
     );

     res.status(500).json({
         ok: false,
         error: "Erro ao carregar transações."
     });
 }
});


/* ============================================================
ATUALIZAR NECESSIDADES DO JOGADOR
============================================================ */

app.post("/api/player/needs", auth, async (req, res) => {
 try {
     const result = await query(`
         UPDATE users
         SET
             hunger = GREATEST(
                 0,
                 hunger - 2
             ),

             hydration = GREATEST(
                 0,
                 hydration - 2
             ),

             energy = GREATEST(
                 0,
                 energy - 1
             ),

             hp = CASE
                 WHEN hunger <= 15
                   OR hydration <= 15
                 THEN GREATEST(
                     0,
                     hp - 2
                 )
                 ELSE hp
             END

         WHERE id = $1

         RETURNING *
     `, [req.user.id]);

     res.json({
         ok: true,
         user: cleanUser(result.rows[0])
     });

 } catch (error) {
     console.error(
         "NEEDS ERROR:",
         error
     );

     res.status(500).json({
         ok: false,
         error: "Erro ao atualizar necessidades."
     });
 }
});


/* ============================================================
CURAR AUTOMATICAMENTE NO HOSPITAL
============================================================ */

app.get("/api/hospital/status", auth, async (req, res) => {
 try {
     const result = await query(`
         SELECT
             hp,
             max_hp,
             hunger,
             hydration,
             energy,
             money
         FROM users
         WHERE id = $1
         LIMIT 1
     `, [req.user.id]);

     const user = result.rows[0];

     res.json({
         ok: true,

         canGoHospital:
             Number(user.hp) < Number(user.max_hp),

         user
     });

 } catch (error) {
     console.error(
         "HOSPITAL STATUS ERROR:",
         error
     );

     res.status(500).json({
         ok: false,
         error: "Erro ao consultar hospital."
     });
 }
});


/* ============================================================
DELETAR SESSÕES EXPIRADAS
============================================================ */

async function cleanSessions() {
 try {
     await query(`
         DELETE FROM sessions
         WHERE expires_at < NOW()
     `);
 } catch (error) {
     console.error(
         "SESSION CLEAN ERROR:",
         error
     );
 }
}


/* ============================================================
ATUALIZAÇÃO AUTOMÁTICA DA POPULAÇÃO
============================================================ */

async function updateCityPopulation() {
 try {
     await query(`
         UPDATE city
         SET population = (
             SELECT COUNT(*)
             FROM users
         )
         WHERE id = 1
     `);
 } catch (error) {
     console.error(
         "POPULATION UPDATE ERROR:",
         error
     );
 }
}


/* ============================================================
404 DA API
============================================================ */

app.use("/api", (req, res) => {
 res.status(404).json({
     ok: false,
     error: "Rota da API não encontrada."
 });
});


/* ============================================================
TRATAMENTO GLOBAL DE ERROS
============================================================ */

app.use((error, req, res, next) => {
 console.error("GLOBAL ERROR:", error);

 if (res.headersSent) {
     return next(error);
 }

 res.status(500).json({
     ok: false,
     error: "Erro interno do servidor."
 });
});


/* ============================================================
INICIAR SERVIDOR
============================================================ */

async function start() {
 try {
     console.log("Conectando ao PostgreSQL...");

     await query("SELECT NOW()");

     console.log("PostgreSQL conectado.");

     await initDatabase();

     await updateCityPopulation();

     await cleanSessions();

     setInterval(
         cleanSessions,
         30 * 60 * 1000
     );

     setInterval(
         updateCityPopulation,
         5 * 60 * 1000
     );

     app.listen(
         PORT,
         "0.0.0.0",
         () => {
             console.log("");
             console.log("======================================");
             console.log("       SOROKIBA ONLINE");
             console.log("======================================");
             console.log(
                 `Servidor rodando na porta ${PORT}`
             );
             console.log(
                 `Node.js: ${process.version}`
             );
             console.log(
                 "Banco PostgreSQL: conectado"
             );
             console.log("======================================");
             console.log("");
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


/* ============================================================
ENCERRAMENTO SEGURO
============================================================ */

process.on("SIGTERM", async () => {
 console.log("SIGTERM recebido.");

 try {
     await pool.end();
 } catch {}

 process.exit(0);
});

process.on("SIGINT", async () => {
 console.log("SIGINT recebido.");

 try {
     await pool.end();
 } catch {}

 process.exit(0);
});


/* ============================================================
EXECUTAR
============================================================ */

start();
