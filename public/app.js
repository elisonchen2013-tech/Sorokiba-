"use strict";

/* ============================================================
   SOROKIBA - APP.JS
============================================================ */

/* ============================================================
   ESTADO
============================================================ */

let token = localStorage.getItem("sorokiba_token") || null;
let gameState = null;

let missionTimerInterval = null;


/* ============================================================
   ELEMENTOS
============================================================ */

const $ = (id) => document.getElementById(id);


/* ============================================================
   API
============================================================ */

async function api(url, options = {}) {

    const config = {
        ...options,
        headers: {
            ...(options.body ? {
                "Content-Type": "application/json"
            } : {}),
            ...(options.headers || {})
        }
    };

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    try {

        const response = await fetch(url, config);

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {

            const error = new Error(
                data.error || `Erro HTTP ${response.status}`
            );

            error.status = response.status;
            error.data = data;

            throw error;
        }

        return data;

    } catch (error) {

        console.error("API ERROR:", error);

        if (error.status === 401) {
            logout(false);
        }

        throw error;
    }
}


/* ============================================================
   UTILIDADES
============================================================ */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function money(value) {

    return Number(value || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function formatDate(value) {

    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("pt-BR");
}


function showMessage(elementId, message, type = "") {

    const element = $(elementId);

    if (!element) return;

    element.textContent = message;

    element.className =
        `message ${type}`.trim();
}


function toast(message) {

    const element = $("toast");
    const text = $("toastText");

    if (!element || !text) return;

    text.textContent = message;

    element.classList.remove("hidden");

    clearTimeout(toast.timeout);

    toast.timeout = setTimeout(() => {

        element.classList.add("hidden");

    }, 3500);
}


/* ============================================================
   LOGIN / CADASTRO
============================================================ */

function showLogin() {

    $("loginScreen")?.classList.remove("hidden");
    $("registerScreen")?.classList.add("hidden");
    $("gameScreen")?.classList.add("hidden");
}


function showRegister() {

    $("loginScreen")?.classList.add("hidden");
    $("registerScreen")?.classList.remove("hidden");
    $("gameScreen")?.classList.add("hidden");
}


function showGame() {

    $("loginScreen")?.classList.add("hidden");
    $("registerScreen")?.classList.add("hidden");
    $("gameScreen")?.classList.remove("hidden");
}


async function login() {

    const username =
        $("loginUsername")?.value.trim();

    const password =
        $("loginPassword")?.value || "";

    if (!username || !password) {

        showMessage(
            "loginMessage",
            "Digite seu usuário e sua senha."
        );

        return;
    }

    try {

        showMessage(
            "loginMessage",
            "Entrando..."
        );

        const data = await api(
            "/api/login",
            {
                method: "POST",

                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        token = data.token;

        localStorage.setItem(
            "sorokiba_token",
            token
        );

        showGame();

        await loadState();

        toast("Login realizado com sucesso!");

    } catch (error) {

        showMessage(
            "loginMessage",
            error.message || "Erro ao entrar."
        );
    }
}


async function register() {

    const name =
        $("registerName")?.value.trim();

    const username =
        $("registerUsername")?.value.trim();

    const password =
        $("registerPassword")?.value || "";

    if (!name || !username || !password) {

        showMessage(
            "registerMessage",
            "Preencha todos os campos."
        );

        return;
    }

    try {

        showMessage(
            "registerMessage",
            "Criando sua conta..."
        );

        const data = await api(
            "/api/register",
            {
                method: "POST",

                body: JSON.stringify({
                    name,
                    username,
                    password
                })
            }
        );

        token = data.token;

        localStorage.setItem(
            "sorokiba_token",
            token
        );

        showGame();

        await loadState();

        toast(
            data.message ||
            "Conta criada com sucesso!"
        );

    } catch (error) {

        showMessage(
            "registerMessage",
            error.message || "Erro ao criar conta."
        );
    }
}


async function logout(showLoginScreen = true) {

    try {

        if (token) {

            await api(
                "/api/logout",
                {
                    method: "POST"
                }
            );
        }

    } catch (error) {

        console.warn(
            "Erro no logout:",
            error
        );

    } finally {

        token = null;

        localStorage.removeItem(
            "sorokiba_token"
        );

        gameState = null;

        if (missionTimerInterval) {
            clearInterval(missionTimerInterval);
            missionTimerInterval = null;
        }

        if (showLoginScreen) {
            showLogin();
        }
    }
}


/* ============================================================
   CARREGAR JOGO
============================================================ */

async function loadState() {

    if (!token) {
        showLogin();
        return;
    }

    try {

        const data =
            await api("/api/state");

        gameState = data;

        renderAll();

    } catch (error) {

        console.error(
            "LOAD STATE ERROR:",
            error
        );

        toast(
            error.message ||
            "Não foi possível carregar o jogo."
        );
    }
}


/* ============================================================
   RENDERIZAÇÃO GERAL
============================================================ */

function renderAll() {

    if (!gameState) return;

    renderUser();
    renderCity();
    renderJobs();
    renderMission();
    renderFood();
    renderHospital();
    renderNews();
    renderProposals();
    renderPlayers();
    renderTransactions();
    renderMayor();

    checkLowHealth();
}


/* ============================================================
   USUÁRIO
============================================================ */

function renderUser() {

    const user = gameState.user;

    if (!user) return;

    if ($("playerName")) {
        $("playerName").textContent =
            user.name;
    }

    if ($("playerJob")) {
        $("playerJob").textContent =
            user.job;
    }

    if ($("playerLevel")) {
        $("playerLevel").textContent =
            user.level;
    }

    if ($("xpText")) {
        $("xpText").textContent =
            Number(user.xp || 0);
    }

    if ($("moneyText")) {
        $("moneyText").textContent =
            money(user.money);
    }

    if ($("bankMoney")) {
        $("bankMoney").textContent =
            money(user.money);
    }

    updateBar(
        "hpBar",
        "hpText",
        user.hp,
        user.max_hp,
        `${user.hp} / ${user.max_hp}`
    );

    updateBar(
        "hungerBar",
        "hungerText",
        user.hunger,
        100,
        `${user.hunger}%`
    );

    updateBar(
        "hydrationBar",
        "hydrationText",
        user.hydration,
        100,
        `${user.hydration}%`
    );

    updateBar(
        "energyBar",
        "energyText",
        user.energy,
        100,
        `${user.energy}%`
    );

    if ($("homePlayerDescription")) {

        $("homePlayerDescription").innerHTML = `
            <strong>${escapeHTML(user.name)}</strong><br>
            Emprego: ${escapeHTML(user.job)}<br>
            Nível: ${Number(user.level || 1)}<br>
            XP: ${Number(user.xp || 0)}<br>
            Dinheiro: ${money(user.money)}
        `;
    }
}


function updateBar(
    barId,
    textId,
    value,
    max,
    text
) {

    const bar = $(barId);
    const label = $(textId);

    const safeMax =
        Math.max(1, Number(max || 1));

    const safeValue =
        Math.max(
            0,
            Math.min(
                safeMax,
                Number(value || 0)
            )
        );

    const percent =
        (safeValue / safeMax) * 100;

    if (bar) {
        bar.style.width =
            `${percent}%`;
    }

    if (label) {
        label.textContent =
            text;
    }
}


/* ============================================================
   CIDADE
============================================================ */

function renderCity() {

    const city = gameState.city;

    if (!city) return;

    const population =
        Number(city.population || 0);

    const treasury =
        Number(city.treasury || 0);

    const gdp =
        Number(city.gdp || 0);

    const infrastructure =
        Number(city.infrastructure || 0);

    const quality =
        Number(city.quality || 0);

    const tax =
        Number(city.tax || 0);

    if ($("cityPopulation")) {
        $("cityPopulation").textContent =
            population;
    }

    if ($("cityPopulation2")) {
        $("cityPopulation2").textContent =
            population;
    }

    if ($("cityTreasury")) {
        $("cityTreasury").textContent =
            money(treasury);
    }

    if ($("cityGDP")) {
        $("cityGDP").textContent =
            money(gdp);
    }

    if ($("cityInfrastructure")) {
        $("cityInfrastructure").textContent =
            infrastructure;
    }

    if ($("cityQuality")) {
        $("cityQuality").textContent =
            quality;
    }

    if ($("cityQuality2")) {
        $("cityQuality2").textContent =
            quality;
    }

    if ($("cityTax")) {
        $("cityTax").textContent =
            `${tax}%`;
    }
}


/* ============================================================
   EMPREGOS
============================================================ */

function renderJobs() {

    const container =
        $("jobsContainer");

    if (!container) return;

    const jobs =
        gameState.jobs || {};

    const currentXP =
        Number(gameState.user?.xp || 0);

    const currentJob =
        gameState.user?.job;

    container.innerHTML = "";

    Object.entries(jobs).forEach(
        ([name, job]) => {

            const unlocked =
                currentXP >= Number(job.xp || 0);

            const isCurrent =
                currentJob === name;

            const card =
                document.createElement("div");

            card.className =
                "card job-card";

            card.innerHTML = `

                <h3>
                    💼 ${escapeHTML(name)}
                </h3>

                <p>
                    Experiência necessária:
                    <strong>
                        ${Number(job.xp || 0)} XP
                    </strong>
                </p>

                <p>
                    Recompensa:
                    <strong>
                        ${money(job.salary)}
                    </strong>
                </p>

                <p>
                    Missão:
                    ${escapeHTML(job.task || "")}
                </p>

                <p>
                    XP da missão:
                    ${Number(job.taskXP || 0)}
                </p>

                <p>
                    Tempo:
                    ${formatDuration(
                        Number(job.duration || 60)
                    )}
                </p>

                ${
                    isCurrent
                    ? `
                        <button disabled>
                            EMPREGO ATUAL
                        </button>
                    `
                    : unlocked
                    ? `
                        <button
                            onclick="changeJob('${escapeAttribute(name)}')"
                        >
                            ESCOLHER EMPREGO
                        </button>
                    `
                    : `
                        <button disabled>
                            🔒 BLOQUEADO
                        </button>
                    `
                }

            `;

            container.appendChild(card);
        }
    );
}


function escapeAttribute(value) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


async function changeJob(job) {

    try {

        const data =
            await api(
                "/api/job",
                {
                    method: "POST",

                    body: JSON.stringify({
                        job
                    })
                }
            );

        if (data.user) {
            gameState.user =
                data.user;
        }

        await loadState();

        toast(
            data.message ||
            "Emprego alterado."
        );

    } catch (error) {

        toast(
            error.message ||
            "Não foi possível mudar de emprego."
        );
    }
}


/* ============================================================
   MISSÕES
============================================================ */

function renderMission() {

    const mission =
        gameState.mission;

    const user =
        gameState.user;

    if (!mission) {

        if ($("missionTitle")) {
            $("missionTitle").textContent =
                "Nenhuma missão ativa";
        }

        if ($("missionDescription")) {
            $("missionDescription").textContent =
                `Seu emprego atual é ${user?.job || "Estudante"}.`;
        }

        if ($("missionTimer")) {
            $("missionTimer").textContent =
                "--";
        }

        $("startMissionButton")
            ?.classList.remove("hidden");

        $("completeMissionButton")
            ?.classList.add("hidden");

        $("cancelMissionButton")
            ?.classList.add("hidden");

        if ($("homeMission")) {
            $("homeMission").textContent =
                "Nenhuma missão ativa.";
        }

        if (missionTimerInterval) {
            clearInterval(missionTimerInterval);
            missionTimerInterval = null;
        }

        return;
    }

    if ($("missionTitle")) {
        $("missionTitle").textContent =
            mission.title;
    }

    if ($("missionDescription")) {
        $("missionDescription").textContent =
            mission.description;
    }

    $("startMissionButton")
        ?.classList.add("hidden");

    $("completeMissionButton")
        ?.classList.remove("hidden");

    $("cancelMissionButton")
        ?.classList.remove("hidden");

    if ($("homeMission")) {
        $("homeMission").textContent =
            mission.title;
    }

    startMissionTimer(mission);
}


function startMissionTimer(mission) {

    if (missionTimerInterval) {
        clearInterval(missionTimerInterval);
    }

    function update() {

        const started =
            new Date(
                mission.started_at
            ).getTime();

        const duration =
            Number(mission.duration_seconds || 0);

        const elapsed =
            Math.floor(
                (Date.now() - started) / 1000
            );

        const remaining =
            Math.max(
                0,
                duration - elapsed
            );

        if ($("missionTimer")) {

            $("missionTimer").textContent =
                formatDuration(remaining);
        }

        if (
            remaining <= 0 &&
            $("completeMissionButton")
        ) {

            $("completeMissionButton")
                .disabled = false;

            $("completeMissionButton")
                .textContent =
                "CONCLUIR MISSÃO";
        } else if ($("completeMissionButton")) {

            $("completeMissionButton")
                .disabled = true;

            $("completeMissionButton")
                .textContent =
                `AGUARDE ${formatDuration(remaining)}`;
        }

        if (remaining <= 0) {

            clearInterval(
                missionTimerInterval
            );

            missionTimerInterval = null;
        }
    }

    update();

    missionTimerInterval =
        setInterval(update, 1000);
}


function formatDuration(seconds) {

    let value =
        Math.max(
            0,
            Math.floor(Number(seconds || 0))
        );

    const hours =
        Math.floor(value / 3600);

    value %= 3600;

    const minutes =
        Math.floor(value / 60);

    const secs =
        value % 60;

    if (hours > 0) {

        return `${String(hours).padStart(2, "0")}:` +
               `${String(minutes).padStart(2, "0")}:` +
               `${String(secs).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:` +
           `${String(secs).padStart(2, "0")}`;
}


async function startMission() {

    try {

        const data =
            await api(
                "/api/job-task",
                {
                    method: "POST"
                }
            );

        toast(
            data.message ||
            "Missão iniciada!"
        );

        await loadState();

        openPage("missionsPage");

    } catch (error) {

        toast(
            error.message ||
            "Não foi possível iniciar a missão."
        );
    }
}


async function completeMission() {

    const mission =
        gameState?.mission;

    if (!mission) {
        toast("Não existe missão ativa.");
        return;
    }

    const started =
        new Date(
            mission.started_at
        ).getTime();

    const elapsed =
        Math.floor(
            (Date.now() - started) / 1000
        );

    if (
        elapsed <
        Number(mission.duration_seconds)
    ) {

        toast(
            `Ainda faltam ${formatDuration(
                Number(mission.duration_seconds) -
                elapsed
            )}.`
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/mission/complete",
                {
                    method: "POST",

                    body: JSON.stringify({
                        missionId: mission.id
                    })
                }
            );

        toast(
            `${data.message || "Missão concluída!"} ` +
            `+${data.reward?.xp || 0} XP | ` +
            `${money(data.reward?.money || 0)}`
        );

        await loadState();

    } catch (error) {

        toast(
            error.message ||
            "Erro ao concluir missão."
        );
    }
}


async function cancelMission() {

    const mission =
        gameState?.mission;

    if (!mission) return;

    if (!confirm("Cancelar esta missão?")) {
        return;
    }

    try {

        const data =
            await api(
                "/api/mission/cancel",
                {
                    method: "POST",

                    body: JSON.stringify({
                        missionId: mission.id
                    })
                }
            );

        toast(
            data.message ||
            "Missão cancelada."
        );

        await loadState();

    } catch (error) {

        toast(
            error.message ||
            "Erro ao cancelar missão."
        );
    }
}


/* ============================================================
   COMIDA
============================================================ */

function renderFood() {

    const container =
        $("foodContainer");

    if (!container) return;

    const foods =
        gameState.foods || {};

    container.innerHTML = "";

    Object.entries(foods).forEach(
        ([name, food]) => {

            const card =
                document.createElement("div");

            card.className =
                "card food-card";

            card.innerHTML = `

                <h3>
                    🍽️ ${escapeHTML(name)}
                </h3>

                <p>
                    Preço:
                    <strong>
                        ${money(food.price)}
                    </strong>
                </p>

                <p>
                    🍗 Fome: +${food.hunger}
                </p>

                <p>
                    💧 Hidratação: +${food.hydration}
                </p>

                <p>
                    ⚡ Energia: +${food.energy}
                </p>

                <button
                    onclick="buyFood('${escapeAttribute(name)}')"
                >
                    COMPRAR
                </button>

            `;

            container.appendChild(card);
        }
    );

    renderInventory();
}


function renderInventory() {

    const container =
        $("inventoryContainer");

    if (!container) return;

    const inventory =
        Array.isArray(gameState.user?.inventory)
        ? gameState.user.inventory
        : [];

    container.innerHTML = "";

    if (!inventory.length) {

        container.innerHTML = `
            <div class="card">
                <p>
                    Seu inventário está vazio.
                </p>
            </div>
        `;

        return;
    }

    inventory.forEach(
        (item) => {

            const name =
                item?.name || "Item";

            const card =
                document.createElement("div");

            card.className =
                "card inventory-item";

            card.innerHTML = `

                <h3>
                    ${escapeHTML(name)}
                </h3>

                <button
                    onclick="useFood('${escapeAttribute(name)}')"
                >
                    CONSUMIR
                </button>

            `;

            container.appendChild(card);
        }
    );
}


async function buyFood(food) {

    try {

        const data =
            await api(
                "/api/food/buy",
                {
                    method: "POST",

                    body: JSON.stringify({
                        food
                    })
                }
            );

        if (data.user) {
            gameState.user =
                data.user;
        }

        await loadState();

        toast(
            data.message ||
            "Item comprado."
        );

    } catch (error) {

        toast(
            error.message ||
            "Não foi possível comprar."
        );
    }
}


async function useFood(food) {

    try {

        const data =
            await api(
                "/api/food/use",
                {
                    method: "POST",

                    body: JSON.stringify({
                        food
                    })
                }
            );

        if (data.user) {
            gameState.user =
                data.user;
        }

        await loadState();

        toast(
            data.message ||
            "Item consumido."
        );

    } catch (error) {

        toast(
            error.message ||
            "Não foi possível consumir."
        );
    }
}


/* ============================================================
   HOSPITAL
============================================================ */

function renderHospital() {

    const container =
        $("hospitalContainer");

    if (!container) return;

    const services =
        gameState.hospital || {};

    container.innerHTML = "";

    Object.entries(services).forEach(
        ([key, service]) => {

            const card =
                document.createElement("div");

            card.className =
                "card hospital-card";

            card.innerHTML = `

                <h3>
                    🏥 ${escapeHTML(service.name)}
                </h3>

                <p>
                    Preço:
                    <strong>
                        ${money(service.price)}
                    </strong>
                </p>

                <p>
                    Recuperação:
                    +${Number(service.hp || 0)} HP
                </p>

                <button
                    onclick="useHospital('${escapeAttribute(key)}')"
                >
                    USAR SERVIÇO
                </button>

            `;

            container.appendChild(card);
        }
    );
}


async function useHospital(service) {

    try {

        const data =
            await api(
                "/api/hospital",
                {
                    method: "POST",

                    body: JSON.stringify({
                        service
                    })
                }
            );

        await loadState();

        toast(
            data.message ||
            "Tratamento realizado."
        );

    } catch (error) {

        toast(
            error.message ||
            "Não foi possível usar o hospital."
        );
    }
}


function checkLowHealth() {

    const hp =
        Number(gameState?.user?.hp ?? 100);

    const warning =
        $("lowHealthWarning");

    if (!warning) return;

    if (hp <= 30) {
        warning.classList.remove("hidden");
    } else {
        warning.classList.add("hidden");
    }
}


/* ============================================================
   TRANSFERÊNCIA
============================================================ */

async function transferMoney() {

    const username =
        $("transferUsername")?.value.trim();

    const amount =
        Number(
            $("transferAmount")?.value
        );

    if (!username) {

        showMessage(
            "transferMessage",
            "Digite o usuário do jogador."
        );

        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {

        showMessage(
            "transferMessage",
            "Digite um valor válido."
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/transfer",
                {
                    method: "POST",

                    body: JSON.stringify({
                        username,
                        amount
                    })
                }
            );

        showMessage(
            "transferMessage",
            data.message ||
            "Transferência realizada.",
            "success"
        );

        if ($("transferAmount")) {
            $("transferAmount").value = "";
        }

        await loadState();

    } catch (error) {

        showMessage(
            "transferMessage",
            error.message ||
            "Erro na transferência."
        );
    }
}


/* ============================================================
   TRANSAÇÕES
============================================================ */

function renderTransactions() {

    const container =
        $("transactionsContainer");

    if (!container) return;

    const transactions =
        gameState.transactions || [];

    container.innerHTML = "";

    if (!transactions.length) {

        container.innerHTML = `
            <div class="card">
                <p>
                    Nenhuma transação registrada.
                </p>
            </div>
        `;

        return;
    }

    transactions.forEach(
        transaction => {

            const amount =
                Number(transaction.amount || 0);

            const card =
                document.createElement("div");

            card.className =
                "card transaction";

            card.innerHTML = `

                <strong>
                    ${escapeHTML(
                        transaction.description ||
                        transaction.type ||
                        "Transação"
                    )}
                </strong>

                <p>
                    Valor:
                    ${money(amount)}
                </p>

                <small>
                    ${formatDate(
                        transaction.created_at
                    )}
                </small>

            `;

            container.appendChild(card);
        }
    );
}


/* ============================================================
   NOTÍCIAS
============================================================ */

function renderNews() {

    const container =
        $("newsContainer");

    if (!container) return;

    const news =
        gameState.news || [];

    container.innerHTML = "";

    if (!news.length) {

        container.innerHTML = `
            <div class="card">
                <p>
                    Ainda não existem notícias.
                </p>
            </div>
        `;

        return;
    }

    news.forEach(
        article => {

            const card =
                document.createElement("article");

            card.className =
                "news-card";

            let imageHTML = "";

            if (article.image) {

                imageHTML = `
                    <img
                        src="${escapeAttribute(
                            article.image
                        )}"
                        alt="Imagem da notícia"
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >
                `;
            }

            card.innerHTML = `

                ${imageHTML}

                <div class="news-content">

                    <h2>
                        ${escapeHTML(article.title)}
                    </h2>

                    <p>
                        ${escapeHTML(article.content)}
                    </p>

                    <small>
                        Por ${escapeHTML(
                            article.author ||
                            "Sorokiba"
                        )}
                        —
                        ${formatDate(
                            article.created_at
                        )}
                    </small>

                </div>

            `;

            container.appendChild(card);
        }
    );
}


/* ============================================================
   PROPOSTAS
============================================================ */

function renderProposals() {

    const container =
        $("proposalsContainer");

    if (!container) return;

    const proposals =
        gameState.proposals || [];

    container.innerHTML = "";

    if (!proposals.length) {

        container.innerHTML = `
            <div class="card">
                <p>
                    Nenhuma proposta enviada.
                </p>
            </div>
        `;

        return;
    }

    proposals.forEach(
        proposal => {

            const card =
                createProposalCard(proposal);

            container.appendChild(card);
        }
    );
}


function createProposalCard(proposal) {

    const card =
        document.createElement("div");

    card.className =
        "card proposal-card";

    let statusText =
        "Pendente";

    if (proposal.status === "approved") {
        statusText = "✅ Aprovada";
    }

    if (proposal.status === "rejected") {
        statusText = "❌ Recusada";
    }

    card.innerHTML = `

        <h3>
            📜 ${escapeHTML(proposal.title)}
        </h3>

        <p>
            ${escapeHTML(proposal.content)}
        </p>

        <p>
            Autor:
            <strong>
                ${escapeHTML(
                    proposal.author ||
                    "Cidadão"
                )}
            </strong>
        </p>

        <p>
            Status:
            <strong>
                ${statusText}
            </strong>
        </p>

        ${
            proposal.mayor_response
            ? `
                <div class="mayor-response">

                    <strong>
                        👑 Resposta do prefeito:
                    </strong>

                    <p>
                        ${escapeHTML(
                            proposal.mayor_response
                        )}
                    </p>

                </div>
            `
            : ""
        }

        <small>
            ${formatDate(
                proposal.created_at
            )}
        </small>

    `;

    return card;
}


async function createProposal() {

    const title =
        $("proposalTitle")?.value.trim();

    const content =
        $("proposalContent")?.value.trim();

    if (!title || !content) {

        showMessage(
            "proposalMessage",
            "Preencha título e proposta."
        );

        return;
    }

    try {

        /*
         * Esta rota precisa existir no server.js:
         * POST /api/proposals
         */

        const data =
            await api(
                "/api/proposals",
                {
                    method: "POST",

                    body: JSON.stringify({
                        title,
                        content
                    })
                }
            );

        showMessage(
            "proposalMessage",
            data.message ||
            "Proposta enviada.",
            "success"
        );

        $("proposalTitle").value = "";
        $("proposalContent").value = "";

        await loadState();

    } catch (error) {

        showMessage(
            "proposalMessage",
            error.message ||
            "Não foi possível enviar."
        );
    }
}


/* ============================================================
   PREFEITO
============================================================ */

function renderMayor() {

    const user =
        gameState?.user;

    const isMayor =
        user?.role === "mayor";

    const button =
        $("mayorMenuButton");

    if (button) {

        if (isMayor) {
            button.classList.remove("hidden");
        } else {
            button.classList.add("hidden");
        }
    }

    const content =
        $("mayorContent");

    if (!content) return;

    if (!isMayor) {

        content.innerHTML = `
            <div class="card">

                <h2>
                    🔒 Área restrita
                </h2>

                <p>
                    Apenas o prefeito pode acessar
                    o painel da prefeitura.
                </p>

            </div>
        `;

        return;
    }

    renderMayorProposals();
}


function renderMayorProposals() {

    const container =
        $("mayorProposalsContainer");

    if (!container) return;

    const proposals =
        gameState.proposals || [];

    container.innerHTML = "";

    const pending =
        proposals.filter(
            proposal =>
                proposal.status === "pending"
        );

    if (!pending.length) {

        container.innerHTML = `
            <div class="card">
                <p>
                    Não existem propostas pendentes.
                </p>
            </div>
        `;

        return;
    }

    pending.forEach(
        proposal => {

            const card =
                document.createElement("div");

            card.className =
                "card mayor-proposal";

            card.innerHTML = `

                <h3>
                    ${escapeHTML(proposal.title)}
                </h3>

                <p>
                    ${escapeHTML(proposal.content)}
                </p>

                <p>
                    Enviada por:
                    ${escapeHTML(
                        proposal.author ||
                        "Cidadão"
                    )}
                </p>

                <textarea
                    id="response-${proposal.id}"
                    placeholder="Resposta do prefeito..."
                ></textarea>

                <div class="proposal-actions">

                    <button
                        onclick="decideProposal(
                            ${proposal.id},
                            'approved'
                        )"
                    >
                        ✅ ACEITAR
                    </button>

                    <button
                        class="danger"
                        onclick="decideProposal(
                            ${proposal.id},
                            'rejected'
                        )"
                    >
                        ❌ RECUSAR
                    </button>

                </div>

            `;

            container.appendChild(card);
        }
    );
}


async function decideProposal(
    proposalId,
    status
) {

    const responseElement =
        $(`response-${proposalId}`);

    const mayorResponse =
        responseElement?.value.trim() || "";

    if (!mayorResponse) {

        toast(
            "Escreva uma resposta para a proposta."
        );

        return;
    }

    try {

        const data =
            await api(
                `/api/proposals/${proposalId}/decide`,
                {
                    method: "POST",

                    body: JSON.stringify({
                        status,
                        mayor_response:
                            mayorResponse
                    })
                }
            );

        toast(
            data.message ||
            "Proposta analisada."
        );

        await loadState();

    } catch (error) {

        toast(
            error.message ||
            "Não foi possível analisar a proposta."
        );
    }
}


/* ============================================================
   PREFEITURA - TAXA
============================================================ */

async function changeTax() {

    const tax =
        Number(
            $("newTax")?.value
        );

    if (
        !Number.isFinite(tax) ||
        tax < 0 ||
        tax > 100
    ) {

        showMessage(
            "taxMessage",
            "Digite uma taxa entre 0 e 100."
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/city/tax",
                {
                    method: "POST",

                    body: JSON.stringify({
                        tax
                    })
                }
            );

        showMessage(
            "taxMessage",
            data.message ||
            "Taxa alterada.",
            "success"
        );

        await loadState();

    } catch (error) {

        showMessage(
            "taxMessage",
            error.message ||
            "Não foi possível alterar a taxa."
        );
    }
}


/* ============================================================
   NOTÍCIA DO PREFEITO
============================================================ */

async function createNews() {

    const title =
        $("newsTitle")?.value.trim();

    const content =
        $("newsContent")?.value.trim();

    const image =
        $("newsImage")?.value.trim();

    if (!title || !content) {

        showMessage(
            "newsMessage",
            "Informe título e conteúdo."
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/news",
                {
                    method: "POST",

                    body: JSON.stringify({
                        title,
                        content,
                        image
                    })
                }
            );

        showMessage(
            "newsMessage",
            data.message ||
            "Notícia publicada.",
            "success"
        );

        $("newsTitle").value = "";
        $("newsContent").value = "";
        $("newsImage").value = "";

        await loadState();

    } catch (error) {

        showMessage(
            "newsMessage",
            error.message ||
            "Erro ao publicar notícia."
        );
    }
}


/* ============================================================
   EVENTOS
============================================================ */

async function createEvent() {

    const title =
        $("eventTitle")?.value.trim();

    const description =
        $("eventDescription")?.value.trim();

    const image =
        $("eventImage")?.value.trim();

    if (!title || !description) {

        toast(
            "Preencha o nome e a descrição."
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/events",
                {
                    method: "POST",

                    body: JSON.stringify({
                        title,
                        description,
                        image
                    })
                }
            );

        toast(
            data.message ||
            "Evento criado."
        );

        $("eventTitle").value = "";
        $("eventDescription").value = "";
        $("eventImage").value = "";

        await loadState();

    } catch (error) {

        toast(
            error.message ||
            "Erro ao criar evento."
        );
    }
}


/* ============================================================
   JOGADORES
============================================================ */

function renderPlayers() {

    const container =
        $("playersContainer");

    if (!container) return;

    const players =
        gameState.players || [];

    container.innerHTML = "";

    if (!players.length) {

        container.innerHTML = `
            <div class="card">
                <p>
                    Nenhum jogador encontrado.
                </p>
            </div>
        `;

        return;
    }

    players.forEach(
        player => {

            const card =
                document.createElement("div");

            card.className =
                "card player-card";

            const isMayor =
                player.role === "mayor";

            card.innerHTML = `

                <h3>
                    👤 ${escapeHTML(player.name)}
                </h3>

                <p>
                    @${escapeHTML(
                        player.username
                    )}
                </p>

                <p>
                    ${isMayor ? "👑 Prefeito" : "Cidadão"}
                </p>

                <p>
                    💼 ${escapeHTML(
                        player.job || "Estudante"
                    )}
                </p>

                <p>
                    ⭐ Nível:
                    ${Number(player.level || 1)}
                </p>

                <p>
                    XP:
                    ${Number(player.xp || 0)}
                </p>

            `;

            container.appendChild(card);
        }
    );
}


/* ============================================================
   NAVEGAÇÃO
============================================================ */

function openPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.add("hidden");

        });

    const page =
        $(pageId);

    if (page) {

        page.classList.remove("hidden");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (
        pageId === "mayorPage" &&
        gameState
    ) {
        renderMayor();
    }
}


/* ============================================================
   TECLADO
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            $("loginScreen") &&
            !$("loginScreen").classList.contains("hidden")
        ) {

            const active =
                document.activeElement;

            if (
                active?.id === "loginUsername" ||
                active?.id === "loginPassword"
            ) {

                login();
            }
        }

    }
);


/* ============================================================
   AUTO LOGIN
============================================================ */

async function boot() {

    if (!token) {

        showLogin();

        return;
    }

    try {

        showGame();

        await loadState();

    } catch {

        token = null;

        localStorage.removeItem(
            "sorokiba_token"
        );

        showLogin();
    }
}


/* ============================================================
   ATUALIZAÇÃO AUTOMÁTICA
============================================================ */

setInterval(
    async () => {

        if (
            token &&
            gameState
        ) {

            try {

                await loadState();

            } catch (error) {

                console.warn(
                    "Atualização automática falhou:",
                    error
                );
            }
        }

    },
    30000
);


/* ============================================================
   INICIAR
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    boot
);
