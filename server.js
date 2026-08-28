// ============================================================
// SOROKIBA - SERVER.JS
// Node.js + Express + PostgreSQL
// Compatível com Express atual / Node 20+
// ============================================================

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();

// ------------------------------------------------------------
// CONFIGURAÇÃO
// ------------------------------------------------------------

const PORT = process.env.PORT || 10000;

if (!process.env.DATABASE_URL) {
    console.error("ERRO: DATABASE_URL não foi configurada.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Arquivos públicos
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// FUNÇÕES AUXILIARES
// ------------------------------------------------------------

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .createHash("sha256")
        .update(salt + password)
        .digest("hex");

    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || !stored.includes(":")) return false;

    const [salt, originalHash] = stored.split(":");

    const hash = crypto
        .createHash("sha256")
        .update(salt + password)
        .digest("hex");

    return hash === originalHash;
}

function createToken() {
    return crypto.randomBytes(32).toString("hex");
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
        job: user.job,
        hp: Number(user.hp || 100),
        max_hp: Number(user.max_hp || 100),
        inventory: user.inventory || [],
        achievements: user.achievements || {},
        created_at: user.created_at
    };
}

async function getUserFromToken(req) {
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
        return null;
    }

    const token = auth.substring(7);

    const result = await pool.query(
        `
        SELECT u.*
        FROM users u
        INNER JOIN sessions s ON s.user_id = u.id
        WHERE s.token = $1
          AND s.expires_at > NOW()
        LIMIT 1
        `,
        [token]
    );

    return result.rows[0] || null;
}

async function requireAuth(req, res, next) {
    try {
        const user = await getUserFromToken(req);

        if (!user) {
            return res.status(401).json({
                ok: false,
                error: "Não autenticado."
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("AUTH ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro de autenticação."
        });
    }
}

function requireMayor(req, res, next) {
    if (!req.user || req.user.role !== "mayor") {
        return res.status(403).json({
            ok: false,
            error: "Somente o prefeito pode realizar esta ação."
        });
    }

    next();
}

async function addXP(userId, amount) {
    const result = await pool.query(
        `
        SELECT xp, level
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    if (!result.rows.length) return;

    let xp = Number(result.rows[0].xp || 0);
    let level = Number(result.rows[0].level || 1);

    xp += Number(amount || 0);

    while (xp >= level * 100) {
        xp -= level * 100;
        level++;
    }

    await pool.query(
        `
        UPDATE users
        SET xp = $1,
            level = $2
        WHERE id = $3
        `,
        [xp, level, userId]
    );
}

// ------------------------------------------------------------
// BANCO DE DADOS
// ------------------------------------------------------------

async function initDatabase() {
    console.log("Inicializando banco de dados...");

    // USERS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'citizen',
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            money INTEGER NOT NULL DEFAULT 500,
            bank INTEGER NOT NULL DEFAULT 50,
            job TEXT DEFAULT 'Entregador',
            hp INTEGER NOT NULL DEFAULT 100,
            max_hp INTEGER NOT NULL DEFAULT 100,
            inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
            achievements JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // SESSIONS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL
        )
    `);

    // NEWS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS news (
            id BIGSERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // JOBS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS jobs (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            required_level INTEGER NOT NULL DEFAULT 1,
            reward INTEGER NOT NULL DEFAULT 50,
            xp_reward INTEGER NOT NULL DEFAULT 20,
            created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // PROPOSALS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS proposals (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            response TEXT DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // BANK TRANSACTIONS
    await pool.query(`
        CREATE TABLE IF NOT EXISTS bank_transactions (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            description TEXT DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // CITY
    await pool.query(`
        CREATE TABLE IF NOT EXISTS city (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            pib BIGINT NOT NULL DEFAULT 100000,
            population INTEGER NOT NULL DEFAULT 0,
            territory INTEGER NOT NULL DEFAULT 100,
            treasury BIGINT NOT NULL DEFAULT 10000
        )
    `);

    // --------------------------------------------------------
    // CIDADE INICIAL
    // --------------------------------------------------------

    await pool.query(`
        INSERT INTO city
            (id, name, pib, population, territory, treasury)
        VALUES
            (1, 'Sorokiba', 100000, 0, 100, 10000)
        ON CONFLICT (id) DO NOTHING
    `);

    // --------------------------------------------------------
    // EMPREGOS INICIAIS
    // --------------------------------------------------------

    const jobs = [
        [
            "Entregador",
            "Faça entregas pela cidade.",
            1,
            50,
            20
        ],
        [
            "Comerciante",
            "Trabalhe nas lojas da cidade.",
            2,
            80,
            30
        ],
        [
            "Guarda",
            "Ajude a proteger Sorokiba.",
            3,
            100,
            40
        ],
        [
            "Engenheiro",
            "Trabalhe no desenvolvimento da cidade.",
            5,
            150,
            60
        ],
        [
            "Administrador",
            "Ajude na administração de Sorokiba.",
            8,
            250,
            100
        ]
    ];

    for (const job of jobs) {
        await pool.query(
            `
            INSERT INTO jobs
                (name, description, required_level, reward, xp_reward)
            VALUES
                ($1, $2, $3, $4, $5)
            ON CONFLICT (name) DO NOTHING
            `,
            job
        );
    }

    // --------------------------------------------------------
    // CORREÇÃO DE CONTAS ANTIGAS
    // --------------------------------------------------------

    await pool.query(`
        UPDATE users
        SET
            xp = COALESCE(xp, 0),
            level = COALESCE(level, 1),
            money = COALESCE(money, 500),
            bank = COALESCE(bank, 50),
            hp = COALESCE(hp, 100),
            max_hp = COALESCE(max_hp, 100),
            inventory = COALESCE(inventory, '[]'::jsonb),
            achievements = COALESCE(achievements, '{}'::jsonb)
    `);

    // --------------------------------------------------------
    // PRIMEIRO USUÁRIO = PREFEITO
    // --------------------------------------------------------

    const countResult = await pool.query(
        `SELECT COUNT(*)::integer AS total FROM users`
    );

    const totalUsers = Number(countResult.rows[0].total || 0);

    if (totalUsers === 0) {
        console.log("Nenhum usuário cadastrado. A primeira conta será prefeito.");
    } else {
        const mayorResult = await pool.query(
            `SELECT id FROM users WHERE role = 'mayor' LIMIT 1`
        );

        if (!mayorResult.rows.length) {
            const firstUser = await pool.query(
                `
                SELECT id
                FROM users
                ORDER BY id ASC
                LIMIT 1
                `
            );

            if (firstUser.rows.length) {
                await pool.query(
                    `
                    UPDATE users
                    SET role = 'mayor'
                    WHERE id = $1
                    `,
                    [firstUser.rows[0].id]
                );
            }
        }
    }

    // --------------------------------------------------------
    // POPULAÇÃO
    // --------------------------------------------------------

    await pool.query(`
        UPDATE city
        SET population = (
            SELECT COUNT(*)
            FROM users
        )
        WHERE id = 1
    `);

    console.log("Banco de dados inicializado com sucesso.");
}

// ------------------------------------------------------------
// HEALTH
// ------------------------------------------------------------

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            ok: true,
            server: "Sorokiba",
            database: true
        });
    } catch (error) {
        console.error("HEALTH ERROR:", error);

        res.status(500).json({
            ok: false,
            database: false
        });
    }
});

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

app.post("/api/register", async (req, res) => {
    try {
        const {
            username,
            name,
            password
        } = req.body;

        if (!username || !name || !password) {
            return res.status(400).json({
                ok: false,
                error: "Preencha todos os campos."
            });
        }

        const cleanUsername = String(username)
            .trim()
            .toLowerCase();

        const cleanName = String(name).trim();

        const cleanPassword = String(password);

        if (cleanUsername.length < 3) {
            return res.status(400).json({
                ok: false,
                error: "O usuário precisa ter pelo menos 3 caracteres."
            });
        }

        if (cleanPassword.length < 4) {
            return res.status(400).json({
                ok: false,
                error: "A senha precisa ter pelo menos 4 caracteres."
            });
        }

        const existing = await pool.query(
            `
            SELECT id
            FROM users
            WHERE username = $1
            LIMIT 1
            `,
            [cleanUsername]
        );

        if (existing.rows.length) {
            return res.status(409).json({
                ok: false,
                error: "Esse usuário já existe."
            });
        }

        const totalResult = await pool.query(
            `SELECT COUNT(*)::integer AS total FROM users`
        );

        const total = Number(totalResult.rows[0].total || 0);

        const role = total === 0 ? "mayor" : "citizen";

        const passwordHash = hashPassword(cleanPassword);

        // IMPORTANTE:
        // Não colocamos "id" no INSERT.
        // O PostgreSQL gera automaticamente através do BIGSERIAL.
        const result = await pool.query(
            `
            INSERT INTO users (
                username,
                name,
                password,
                role,
                xp,
                level,
                money,
                bank,
                job,
                hp,
                max_hp,
                inventory,
                achievements
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                0,
                1,
                500,
                50,
                'Entregador',
                100,
                100,
                '[]'::jsonb,
                '{}'::jsonb
            )
            RETURNING *
            `,
            [
                cleanUsername,
                cleanName,
                passwordHash,
                role
            ]
        );

        const user = result.rows[0];

        // Atualiza população
        await pool.query(`
            UPDATE city
            SET population = (
                SELECT COUNT(*) FROM users
            )
            WHERE id = 1
        `);

        // Cria sessão
        const token = createToken();

        await pool.query(
            `
            INSERT INTO sessions (
                user_id,
                token,
                expires_at
            )
            VALUES (
                $1,
                $2,
                NOW() + INTERVAL '30 days'
            )
            `,
            [user.id, token]
        );

        res.status(201).json({
            ok: true,
            message: role === "mayor"
                ? "Conta criada. Você é o prefeito de Sorokiba!"
                : "Conta criada com sucesso!",
            token,
            user: cleanUser(user)
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                ok: false,
                error: "Esse usuário já existe."
            });
        }

        res.status(500).json({
            ok: false,
            error: "Erro ao criar conta.",
            details: process.env.NODE_ENV === "development"
                ? error.message
                : undefined
        });
    }
});

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

app.post("/api/login", async (req, res) => {
    try {
        const {
            username,
            password
        } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                ok: false,
                error: "Digite usuário e senha."
            });
        }

        const result = await pool.query(
            `
            SELECT *
            FROM users
            WHERE username = $1
            LIMIT 1
            `,
            [
                String(username)
                    .trim()
                    .toLowerCase()
            ]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                ok: false,
                error: "Usuário ou senha incorretos."
            });
        }

        const user = result.rows[0];

        if (!verifyPassword(String(password), user.password)) {
            return res.status(401).json({
                ok: false,
                error: "Usuário ou senha incorretos."
            });
        }

        const token = createToken();

        await pool.query(
            `
            INSERT INTO sessions (
                user_id,
                token,
                expires_at
            )
            VALUES (
                $1,
                $2,
                NOW() + INTERVAL '30 days'
            )
            `,
            [user.id, token]
        );

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
            error: "Erro ao entrar na conta."
        });
    }
});

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

app.post("/api/logout", requireAuth, async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        const token = auth.substring(7);

        await pool.query(
            `DELETE FROM sessions WHERE token = $1`,
            [token]
        );

        res.json({
            ok: true,
            message: "Logout realizado."
        });

    } catch (error) {
        console.error("LOGOUT ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao sair."
        });
    }
});

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------

app.get("/api/state", requireAuth, async (req, res) => {
    try {
        const userResult = await pool.query(
            `
            SELECT *
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );

        const cityResult = await pool.query(
            `
            SELECT *
            FROM city
            WHERE id = 1
            `
        );

        const jobsResult = await pool.query(
            `
            SELECT
                id,
                name,
                description,
                required_level,
                reward,
                xp_reward,
                active
            FROM jobs
            WHERE active = TRUE
            ORDER BY required_level ASC
            `
        );

        const newsResult = await pool.query(
            `
            SELECT
                n.id,
                n.title,
                n.content,
                n.created_at,
                u.name AS author
            FROM news n
            LEFT JOIN users u ON u.id = n.author_id
            ORDER BY n.created_at DESC
            LIMIT 30
            `
        );

        const proposalsResult = await pool.query(
            `
            SELECT
                p.id,
                p.title,
                p.description,
                p.status,
                p.response,
                p.created_at,
                p.updated_at,
                u.name AS author
            FROM proposals p
            LEFT JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC
            LIMIT 50
            `
        );

        res.json({
            ok: true,
            user: cleanUser(userResult.rows[0]),
            city: cityResult.rows[0] || null,
            jobs: jobsResult.rows,
            news: newsResult.rows,
            proposals: proposalsResult.rows
        });

    } catch (error) {
        console.error("STATE ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Não foi possível carregar o estado do jogo."
        });
    }
});

// ------------------------------------------------------------
// PERFIL
// ------------------------------------------------------------

app.get("/api/me", requireAuth, async (req, res) => {
    res.json({
        ok: true,
        user: cleanUser(req.user)
    });
});

// ------------------------------------------------------------
// EMPREGOS
// ------------------------------------------------------------

app.get("/api/jobs", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT *
            FROM jobs
            WHERE active = TRUE
            ORDER BY required_level ASC
            `
        );

        res.json({
            ok: true,
            jobs: result.rows
        });

    } catch (error) {
        console.error("JOBS ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao carregar empregos."
        });
    }
});

// Escolher emprego
app.post("/api/jobs/select", requireAuth, async (req, res) => {
    try {
        const { jobId } = req.body;

        const jobResult = await pool.query(
            `
            SELECT *
            FROM jobs
            WHERE id = $1
              AND active = TRUE
            `,
            [jobId]
        );

        if (!jobResult.rows.length) {
            return res.status(404).json({
                ok: false,
                error: "Emprego não encontrado."
            });
        }

        const job = jobResult.rows[0];

        if (req.user.level < job.required_level) {
            return res.status(403).json({
                ok: false,
                error: `Você precisa estar no nível ${job.required_level}.`
            });
        }

        await pool.query(
            `
            UPDATE users
            SET job = $1
            WHERE id = $2
            `,
            [job.name, req.user.id]
        );

        res.json({
            ok: true,
            message: `Você agora trabalha como ${job.name}.`,
            job: job.name
        });

    } catch (error) {
        console.error("SELECT JOB ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao escolher emprego."
        });
    }
});

// Concluir tarefa
app.post("/api/jobs/task", requireAuth, async (req, res) => {
    try {
        const jobResult = await pool.query(
            `
            SELECT *
            FROM jobs
            WHERE name = $1
              AND active = TRUE
            LIMIT 1
            `,
            [req.user.job]
        );

        if (!jobResult.rows.length) {
            return res.status(400).json({
                ok: false,
                error: "Você não possui um emprego válido."
            });
        }

        const job = jobResult.rows[0];

        await pool.query(
            `
            UPDATE users
            SET money = money + $1
            WHERE id = $2
            `,
            [job.reward, req.user.id]
        );

        await addXP(req.user.id, job.xp_reward);

        res.json({
            ok: true,
            message: "Tarefa concluída!",
            reward: job.reward,
            xp: job.xp_reward
        });

    } catch (error) {
        console.error("TASK ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao concluir tarefa."
        });
    }
});

// ------------------------------------------------------------
// DINHEIRO
// ------------------------------------------------------------

app.get("/api/bank", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT *
            FROM bank_transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
            `,
            [req.user.id]
        );

        res.json({
            ok: true,
            money: Number(req.user.money || 0),
            bank: Number(req.user.bank || 0),
            transactions: result.rows
        });

    } catch (error) {
        console.error("BANK ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao carregar banco."
        });
    }
});

// Depositar
app.post("/api/bank/deposit", requireAuth, async (req, res) => {
    const client = await pool.connect();

    try {
        const amount = Math.floor(Number(req.body.amount));

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                ok: false,
                error: "Valor inválido."
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            `
            SELECT money, bank
            FROM users
            WHERE id = $1
            FOR UPDATE
            `,
            [req.user.id]
        );

        const user = result.rows[0];

        if (user.money < amount) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                ok: false,
                error: "Dinheiro insuficiente."
            });
        }

        await client.query(
            `
            UPDATE users
            SET money = money - $1,
                bank = bank + $1
            WHERE id = $2
            `,
            [amount, req.user.id]
        );

        await client.query(
            `
            INSERT INTO bank_transactions
                (user_id, type, amount, description)
            VALUES
                ($1, 'deposit', $2, 'Depósito')
            `,
            [req.user.id, amount]
        );

        await client.query("COMMIT");

        res.json({
            ok: true,
            message: "Depósito realizado.",
            amount
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("DEPOSIT ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao realizar depósito."
        });
    } finally {
        client.release();
    }
});

// Sacar
app.post("/api/bank/withdraw", requireAuth, async (req, res) => {
    const client = await pool.connect();

    try {
        const amount = Math.floor(Number(req.body.amount));

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                ok: false,
                error: "Valor inválido."
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            `
            SELECT money, bank
            FROM users
            WHERE id = $1
            FOR UPDATE
            `,
            [req.user.id]
        );

        const user = result.rows[0];

        if (user.bank < amount) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                ok: false,
                error: "Saldo bancário insuficiente."
            });
        }

        await client.query(
            `
            UPDATE users
            SET money = money + $1,
                bank = bank - $1
            WHERE id = $2
            `,
            [amount, req.user.id]
        );

        await client.query(
            `
            INSERT INTO bank_transactions
                (user_id, type, amount, description)
            VALUES
                ($1, 'withdraw', $2, 'Saque')
            `,
            [req.user.id, amount]
        );

        await client.query("COMMIT");

        res.json({
            ok: true,
            message: "Saque realizado.",
            amount
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("WITHDRAW ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao realizar saque."
        });
    } finally {
        client.release();
    }
});

// ------------------------------------------------------------
// NOTÍCIAS
// ------------------------------------------------------------

app.get("/api/news", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                n.id,
                n.title,
                n.content,
                n.created_at,
                u.name AS author
            FROM news n
            LEFT JOIN users u ON u.id = n.author_id
            ORDER BY n.created_at DESC
            LIMIT 50
            `
        );

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

// Criar notícia - prefeito
app.post(
    "/api/news",
    requireAuth,
    requireMayor,
    async (req, res) => {
        try {
            const {
                title,
                content
            } = req.body;

            if (!title || !content) {
                return res.status(400).json({
                    ok: false,
                    error: "Título e conteúdo são obrigatórios."
                });
            }

            const result = await pool.query(
                `
                INSERT INTO news (
                    title,
                    content,
                    author_id
                )
                VALUES (
                    $1,
                    $2,
                    $3
                )
                RETURNING *
                `,
                [
                    String(title).trim(),
                    String(content).trim(),
                    req.user.id
                ]
            );

            res.status(201).json({
                ok: true,
                news: result.rows[0]
            });

        } catch (error) {
            console.error("CREATE NEWS ERROR:", error);

            res.status(500).json({
                ok: false,
                error: "Erro ao publicar notícia."
            });
        }
    }
);

// ------------------------------------------------------------
// PROPOSTAS
// ------------------------------------------------------------

app.get("/api/proposals", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                p.*,
                u.name AS author
            FROM proposals p
            LEFT JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC
            `
        );

        res.json({
            ok: true,
            proposals: result.rows
        });

    } catch (error) {
        console.error("PROPOSALS ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao carregar propostas."
        });
    }
});

// Criar proposta
app.post("/api/proposals", requireAuth, async (req, res) => {
    try {
        const {
            title,
            description
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                ok: false,
                error: "Título e descrição são obrigatórios."
            });
        }

        const result = await pool.query(
            `
            INSERT INTO proposals (
                user_id,
                title,
                description
            )
            VALUES (
                $1,
                $2,
                $3
            )
            RETURNING *
            `,
            [
                req.user.id,
                String(title).trim(),
                String(description).trim()
            ]
        );

        res.status(201).json({
            ok: true,
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

// Aprovar/rejeitar proposta
app.patch(
    "/api/proposals/:id",
    requireAuth,
    requireMayor,
    async (req, res) => {
        try {
            const {
                status,
                response
            } = req.body;

            if (!["approved", "rejected", "pending"].includes(status)) {
                return res.status(400).json({
                    ok: false,
                    error: "Status inválido."
                });
            }

            const result = await pool.query(
                `
                UPDATE proposals
                SET
                    status = $1,
                    response = $2,
                    updated_at = NOW()
                WHERE id = $3
                RETURNING *
                `,
                [
                    status,
                    response || "",
                    req.params.id
                ]
            );

            if (!result.rows.length) {
                return res.status(404).json({
                    ok: false,
                    error: "Proposta não encontrada."
                });
            }

            res.json({
                ok: true,
                proposal: result.rows[0]
            });

        } catch (error) {
            console.error("UPDATE PROPOSAL ERROR:", error);

            res.status(500).json({
                ok: false,
                error: "Erro ao atualizar proposta."
            });
        }
    }
);

// ------------------------------------------------------------
// PREFEITO / CIDADE
// ------------------------------------------------------------

app.get("/api/city", async (req, res) => {
    try {
        const city = await pool.query(
            `SELECT * FROM city WHERE id = 1`
        );

        const mayor = await pool.query(
            `
            SELECT id, name, username, level
            FROM users
            WHERE role = 'mayor'
            LIMIT 1
            `
        );

        res.json({
            ok: true,
            city: city.rows[0] || null,
            mayor: mayor.rows[0] || null
        });

    } catch (error) {
        console.error("CITY ERROR:", error);

        res.status(500).json({
            ok: false,
            error: "Erro ao carregar cidade."
        });
    }
});

// ------------------------------------------------------------
// ADMINISTRAÇÃO DE EMPREGOS
// ------------------------------------------------------------

app.post(
    "/api/jobs",
    requireAuth,
    requireMayor,
    async (req, res) => {
        try {
            const {
                name,
                description,
                requiredLevel,
                reward,
                xpReward
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    ok: false,
                    error: "Nome do emprego é obrigatório."
                });
            }

            const result = await pool.query(
                `
                INSERT INTO jobs (
                    name,
                    description,
                    required_level,
                    reward,
                    xp_reward,
                    created_by
                )
                VALUES (
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
                    String(name).trim(),
                    description || "",
                    Number(requiredLevel) || 1,
                    Number(reward) || 50,
                    Number(xpReward) || 20,
                    req.user.id
                ]
            );

            res.status(201).json({
                ok: true,
                job: result.rows[0]
            });

        } catch (error) {
            console.error("CREATE JOB ERROR:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    ok: false,
                    error: "Esse emprego já existe."
                });
            }

            res.status(500).json({
                ok: false,
                error: "Erro ao criar emprego."
            });
        }
    }
);

// ------------------------------------------------------------
// PREFEITO: ESTATÍSTICAS
// ------------------------------------------------------------

app.get(
    "/api/mayor/dashboard",
    requireAuth,
    requireMayor,
    async (req, res) => {
        try {
            const cityResult = await pool.query(
                `SELECT * FROM city WHERE id = 1`
            );

            const usersResult = await pool.query(
                `
                SELECT
                    COUNT(*)::integer AS population,
                    COALESCE(SUM(money), 0)::bigint AS money,
                    COALESCE(SUM(bank), 0)::bigint AS bank
                FROM users
                `
            );

            const jobsResult = await pool.query(
                `
                SELECT COUNT(*)::integer AS total
                FROM jobs
                WHERE active = TRUE
                `
            );

            const proposalsResult = await pool.query(
                `
                SELECT
                    COUNT(*)::integer AS total,
                    COUNT(*) FILTER (
                        WHERE status = 'pending'
                    )::integer AS pending
                FROM proposals
                `
            );

            res.json({
                ok: true,
                city: cityResult.rows[0],
                statistics: usersResult.rows[0],
                jobs: jobsResult.rows[0],
                proposals: proposalsResult.rows[0]
            });

        } catch (error) {
            console.error("MAYOR DASHBOARD ERROR:", error);

            res.status(500).json({
                ok: false,
                error: "Erro ao carregar painel do prefeito."
            });
        }
    }
);

// ------------------------------------------------------------
// 404 PARA API
// ------------------------------------------------------------

app.use("/api", (req, res) => {
    res.status(404).json({
        ok: false,
        error: "API não encontrada."
    });
});

// ------------------------------------------------------------
// FRONTEND
// ------------------------------------------------------------
//
// NÃO usamos:
// app.get("*")
//
// Isso evita o erro:
// Missing parameter name at index 1: *
// ------------------------------------------------------------

app.use((req, res) => {
    res.sendFile(
        path.join(__dirname, "index.html")
    );
});

// ------------------------------------------------------------
// ERROS GERAIS
// ------------------------------------------------------------

app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR:", err);

    res.status(500).json({
        ok: false,
        error: "Erro interno do servidor."
    });
});

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------

async function start() {
    try {
        await initDatabase();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `Sorokiba online na porta ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "ERRO AO INICIAR SOROKIBA:"
        );

        console.error(error);

        process.exit(1);
    }
}

start();
