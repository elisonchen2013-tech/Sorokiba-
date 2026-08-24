```javascript
"use strict";

/* =========================================================
   SOROKIBA — APP.JS
   Interface do jogo
========================================================= */

let state = null;
let jobs = {};
let missionInterval = null;
let selectedNewsImage = "";

/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (id) => document.getElementById(id);

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

function money(value) {
  return "$" + Number(value || 0).toLocaleString("pt-BR");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function message(id, text, type = "") {
  const el = $(id);

  if (!el) return;

  el.textContent = text;
  el.className = "message " + type;
}

/* =========================================================
   API
========================================================= */

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Ocorreu um erro.");
  }

  return data;
}

/* =========================================================
   LOGIN / REGISTRO
========================================================= */

function setupAuth() {

  $("showRegisterButton")?.addEventListener("click", () => {
    hide("loginScreen");
    show("registerScreen");
  });

  $("showLoginButton")?.addEventListener("click", () => {
    hide("registerScreen");
    show("loginScreen");
  });

  $("loginButton")?.addEventListener("click", login);

  $("registerButton")?.addEventListener("click", register);

  $("loginPassword")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });

  $("registerPassword")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") register();
  });

}

async function login() {

  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;

  if (!username || !password) {
    message("loginMessage", "Digite usuário e senha.", "error");
    return;
  }

  try {

    message("loginMessage", "Entrando...");

    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password
      })
    });

    await startGame();

  } catch (error) {

    message(
      "loginMessage",
      error.message,
      "error"
    );

  }

}

async function register() {

  const name = $("registerName").value.trim();
  const username = $("registerUsername").value.trim();
  const password = $("registerPassword").value;

  if (!name || !username || !password) {
    message(
      "registerMessage",
      "Preencha todos os campos.",
      "error"
    );
    return;
  }

  try {

    message("registerMessage", "Criando conta...");

    const result = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        username,
        password
      })
    });

    /*
      A primeira conta criada no servidor recebe
      automaticamente o cargo "mayor".
    */

    await startGame();

  } catch (error) {

    message(
      "registerMessage",
      error.message,
      "error"
    );

  }

}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function startGame() {

  try {

    await loadState();
    await loadJobs();
    await loadMarket();

    hide("loginScreen");
    hide("registerScreen");
    show("gameScreen");

    updateUI();
    renderJobs();
    renderNews();
    renderProposals();

    setupNavigation();
    setupMayor();
    setupNewsImage();

    startMissionTimer();

  } catch (error) {

    console.error(error);

    hide("gameScreen");
    show("loginScreen");

    message(
      "loginMessage",
      "Não foi possível carregar o jogo.",
      "error"
    );

  }

}

async function checkSession() {

  try {

    await loadState();
    await loadJobs();
    await loadMarket();

    hide("loginScreen");
    hide("registerScreen");
    show("gameScreen");

    updateUI();
    renderJobs();
    renderNews();
    renderProposals();

    setupNavigation();
    setupMayor();
    setupNewsImage();

    startMissionTimer();

  } catch {
    hide("gameScreen");
    show("loginScreen");
  }

}

/* =========================================================
   ESTADO
========================================================= */

async function loadState() {

  state = await api("/api/state");

}

async function loadJobs() {

  jobs = await api("/api/jobs");

}

async function refresh() {

  await loadState();

  updateUI();
  renderNews();
  renderProposals();
  renderJobs();

}

/* =========================================================
   INTERFACE DO JOGADOR
========================================================= */

function updateUI() {

  if (!state) return;

  const user = state.user;
  const city = state.city;

  $("headerPlayerName").textContent =
    user.name;

  $("headerRole").textContent =
    user.role === "mayor"
      ? "👑 Prefeito"
      : "Cidadão";

  $("homeName").textContent =
    user.name;

  $("profileName").textContent =
    user.name;

  $("profileUsername").textContent =
    "@" + user.username;

  $("profileRole").textContent =
    user.role === "mayor"
      ? "👑 Prefeito"
      : "Cidadão";

  $("profileJob").textContent =
    user.job || "Nenhum";

  $("healthValue").textContent =
    user.health ?? 100;

  $("hungerValue").textContent =
    user.hunger ?? 100;

  $("moneyValue").textContent =
    money(user.money);

  $("xpValue").textContent =
    (user.xp || 0) + " XP";

  $("levelValue").textContent =
    user.level || 1;

  $("reputationValue").textContent =
    user.reputation ?? 50;

  /* CIDADE */

  $("cityPopulation").textContent =
    Number(city.population || 0).toLocaleString("pt-BR");

  $("cityTreasury").textContent =
    money(city.treasury);

  $("cityGDP").textContent =
    money(city.gdp);

  $("cityTerritory").textContent =
    (city.territory || 0) + " km²";

  $("cityInfrastructure").textContent =
    city.infrastructure ?? 0;

  $("cityQuality").textContent =
    city.quality ?? 0;

  $("cityTax").textContent =
    (city.tax ?? 0) + "%";

  $("marketMoney").textContent =
    money(user.money);

  /* PREFEITO */

  if (user.role === "mayor") {
    show("mayorMenuButton");
  } else {
    hide("mayorMenuButton");
  }

}

/* =========================================================
   NAVEGAÇÃO
========================================================= */

function setupNavigation() {

  document.querySelectorAll(".menu-button").forEach(button => {

    if (button.dataset.navigationReady) return;

    button.dataset.navigationReady = "true";

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      if (!page) return;

      document.querySelectorAll(".page").forEach(p => {
        p.classList.add("hidden");
      });

      $(page)?.classList.remove("hidden");

      document.querySelectorAll(".menu-button").forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

    });

  });

  document.querySelectorAll("[data-page]").forEach(button => {

    if (button.classList.contains("menu-button")) return;

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      document.querySelectorAll(".page").forEach(p => {
        p.classList.add("hidden");
      });

      $(page)?.classList.remove("hidden");

      document.querySelectorAll(".menu-button").forEach(btn => {
        btn.classList.remove("active");

        if (btn.dataset.page === page) {
          btn.classList.add("active");
        }
      });

    });

  });

}

/* =========================================================
   TRABALHOS
========================================================= */

function renderJobs() {

  if (!state || !jobs) return;

  const user = state.user;

  const current = jobs[user.job];

  if (current) {

    $("currentJob").innerHTML = `
      <div class="job-card current">

        <h3>💼 ${escapeHTML(user.job)}</h3>

        <div class="job-info">

          <span class="badge">
            Nível ${user.level}
          </span>

          <span class="badge">
            ${current[0]} XP para desbloquear
          </span>

          <span class="badge">
            ${money(current[1])} por missão
          </span>

        </div>

        <p>
          ${escapeHTML(current[2])}
        </p>

      </div>
    `;

  }

  const container = $("jobsList");

  if (!container) return;

  container.innerHTML = "";

  Object.entries(jobs).forEach(([name, data]) => {

    const requiredXP = data[0];
    const reward = data[1];
    const description = data[2];

    const unlocked =
      user.xp >= requiredXP;

    const selected =
      user.job === name;

    const div = document.createElement("div");

    div.className =
      "job-card " +
      (selected ? "current " : "") +
      (!unlocked ? "locked" : "");

    div.innerHTML = `

      <h3>
        ${selected ? "✅ " : "💼 "}
        ${escapeHTML(name)}
      </h3>

      <div class="job-info">

        <span class="badge">
          Requer ${requiredXP} XP
        </span>

        <span class="badge">
          ${money(reward)}
        </span>

      </div>

      <p>
        ${escapeHTML(description)}
      </p>

      ${
        selected
          ? `<button disabled>Trabalho atual</button>`
          : unlocked
            ? `<button data-job="${escapeHTML(name)}">
                 Escolher trabalho
               </button>`
            : `<button disabled>
                 🔒 Bloqueado
               </button>`
      }

    `;

    container.appendChild(div);

  });

  container.querySelectorAll("[data-job]").forEach(button => {

    button.addEventListener("click", async () => {

      try {

        await api("/api/job", {
          method: "POST",
          body: JSON.stringify({
            job: button.dataset.job
          })
        });

        await refresh();

      } catch (error) {

        alert(error.message);

      }

    });

  });

  renderMissions();

}

/* =========================================================
   MISSÕES
========================================================= */

async function renderMissions() {

  const container = $("missionList");

  if (!container) return;

  try {

    const mission = await api("/api/mission");

    const done = mission.done;

    container.innerHTML = `

      <div class="mission ${done ? "completed" : ""}">

        <h3>
          🎯 ${escapeHTML(mission.title)}
        </h3>

        <p class="mission-progress">

          Recompensa:
          <strong>${mission.xp} XP</strong>

          e

          <strong>${money(mission.money)}</strong>

        </p>

        <div class="progress-bar">

          <div
            class="progress-fill"
            style="width:${done ? 100 : 0}%"
          ></div>

        </div>

        ${
          done
            ? `
              <button disabled>
                ✅ Missão concluída
              </button>
            `
            : `
              <button id="completeMissionButton">
                Concluir missão
              </button>
            `
        }

      </div>

    `;

    if (!done) {

      $("completeMissionButton")?.addEventListener(
        "click",
        completeMission
      );

    }

    const home = $("homeMissionList");

    if (home) {

      home.innerHTML = `
        <div class="mission ${done ? "completed" : ""}">

          <h3>
            ${escapeHTML(mission.title)}
          </h3>

          <p>
            ${done
              ? "Missão concluída hoje."
              : "Sua missão está disponível."
            }
          </p>

        </div>
      `;

    }

  } catch (error) {

    container.innerHTML = `
      <p class="error">
        ${escapeHTML(error.message)}
      </p>
    `;

  }

}

async function completeMission() {

  const button = $("completeMissionButton");

  if (button) {
    button.disabled = true;
    button.textContent = "Concluindo...";
  }

  try {

    await api("/api/mission", {
      method: "POST",
      body: JSON.stringify({})
    });

    await refresh();

    alert(
      "🎉 Missão concluída! Você ganhou XP e dinheiro."
    );

  } catch (error) {

    alert(error.message);

    if (button) {
      button.disabled = false;
      button.textContent = "Concluir missão";
    }

  }

}

/* =========================================================
   CRONÔMETRO
========================================================= */

function startMissionTimer() {

  if (missionInterval) {
    clearInterval(missionInterval);
  }

  updateMissionTimer();

  missionInterval =
    setInterval(updateMissionTimer, 1000);

}

async function updateMissionTimer() {

  const timer = $("missionTimer");

  if (!timer) return;

  try {

    const mission = await api("/api/mission");

    if (!mission.done) {

      timer.textContent =
        "🟢 Disponível";

      return;

    }

    /*
      O servidor atual utiliza uma missão por dia.
      O contador mostra quanto falta até o próximo dia.
    */

    const now = new Date();

    const tomorrow = new Date(now);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    tomorrow.setHours(0, 0, 0, 0);

    const difference =
      tomorrow.getTime() - now.getTime();

    const hours =
      Math.floor(difference / 3600000);

    const minutes =
      Math.floor(
        (difference % 3600000) / 60000
      );

    const seconds =
      Math.floor(
        (difference % 60000) / 1000
      );

    timer.textContent =
      `⏱️ Próxima missão em ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  } catch {

    timer.textContent = "--";

  }

}

/* =========================================================
   MERCADO
========================================================= */

let foodItems = [
  {
    id: "agua",
    name: "Água",
    icon: "💧",
    price: 5,
    hunger: 5,
    description: "Uma garrafa de água."
  },
  {
    id: "lanche",
    name: "Lanche",
    icon: "🥪",
    price: 15,
    hunger: 15,
    description: "Um lanche simples."
  },
  {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    price: 35,
    hunger: 30,
    description: "Uma pizza deliciosa."
  },
  {
    id: "hamburguer",
    name: "Hambúrguer",
    icon: "🍔",
    price: 50,
    hunger: 45,
    description: "Um hambúrguer completo."
  },
  {
    id: "comida",
    name: "Refeição completa",
    icon: "🍱",
    price: 75,
    hunger: 65,
    description: "Uma refeição completa."
  },
  {
    id: "banquete",
    name: "Banquete",
    icon: "🍗",
    price: 120,
    hunger: 100,
    description: "Uma grande refeição."
  }
];

async function loadMarket() {

  renderMarket();

}

function renderMarket() {

  const container = $("foodList");

  if (!container) return;

  container.innerHTML = "";

  foodItems.forEach(food => {

    const card =
      document.createElement("div");

    card.className = "food-card";

    card.innerHTML = `

      <div class="food-icon">
        ${food.icon}
      </div>

      <h3>
        ${escapeHTML(food.name)}
      </h3>

      <p>
        ${escapeHTML(food.description)}
      </p>

      <div class="price">
        ${money(food.price)}
      </div>

      <div class="job-info">

        <span class="badge">
          +${food.hunger} fome
        </span>

      </div>

      <button data-food="${food.id}">
        Comprar
      </button>

    `;

    container.appendChild(card);

  });

  container.querySelectorAll("[data-food]").forEach(button => {

    button.addEventListener("click", () => {

      buyFood(button.dataset.food);

    });

  });

}

async function buyFood(id) {

  const food =
    foodItems.find(item => item.id === id);

  if (!food) return;

  /*
    O server atual ainda não possui uma rota de mercado.
    Por isso não enviamos a compra para o servidor ainda.
  */

  alert(
    `${food.name} selecionado.\n\nA compra será conectada ao servidor na próxima atualização do server.js.`
  );

}

/* =========================================================
   NOTÍCIAS
========================================================= */

function renderNews() {

  const container = $("newsList");

  if (!container || !state) return;

  const news = state.news || [];

  if (!news.length) {

    container.innerHTML = `
      <div class="panel">
        <p>
          Ainda não existem notícias.
        </p>
      </div>
    `;

    return;

  }

  container.innerHTML = "";

  news.forEach(item => {

    const card =
      document.createElement("article");

    card.className = "news-card";

    card.innerHTML = `

      ${
        item.image
          ? `
            <img
              class="news-image"
              src="${escapeHTML(item.image)}"
              alt="${escapeHTML(item.title)}"
            >
          `
          : ""
      }

      <div class="news-content">

        <span class="news-category">
          ${escapeHTML(item.category || "Comunicado")}
        </span>

        <h2>
          ${escapeHTML(item.title)}
        </h2>

        <p>
          ${escapeHTML(item.text)}
        </p>

        <div class="news-meta">

          Publicado por
          ${escapeHTML(item.author || "Prefeitura")}

          •

          ${escapeHTML(item.date || "")}

        </div>

      </div>

    `;

    container.appendChild(card);

  });

}

/* =========================================================
   IMAGEM DA NOTÍCIA
========================================================= */

function setupNewsImage() {

  const input = $("newsImage");
  const preview = $("imagePreview");

  if (!input || !preview) return;

  if (input.dataset.ready) return;

  input.dataset.ready = "true";

  input.addEventListener("change", () => {

    const file = input.files?.[0];

    if (!file) {

      selectedNewsImage = "";

      preview.style.display = "none";
      preview.innerHTML = "";

      return;

    }

    if (file.size > 2 * 1024 * 1024) {

      alert(
        "A imagem deve ter no máximo 2 MB."
      );

      input.value = "";
      return;

    }

    const reader =
      new FileReader();

    reader.onload = () => {

      selectedNewsImage =
        reader.result;

      preview.innerHTML = `
        <img
          src="${selectedNewsImage}"
          alt="Prévia da notícia"
        >
      `;

      preview.style.display =
        "block";

    };

    reader.readAsDataURL(file);

  });

}

/* =========================================================
   PREFEITURA
========================================================= */

function setupMayor() {

  if ($("taxButton")?.dataset.ready) {
    return;
  }

  $("taxButton")?.addEventListener(
    "click",
    changeTax
  );

  $("newsForm")?.addEventListener(
    "submit",
    publishNews
  );

  $("eventButton")?.addEventListener(
    "click",
    createEvent
  );

  if ($("taxButton")) {
    $("taxButton").dataset.ready =
      "true";
  }

}

async function changeTax() {

  const value =
    Number($("taxInput").value);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 30
  ) {

    message(
      "taxMessage",
      "Digite um valor entre 0% e 30%.",
      "error"
    );

    return;

  }

  try {

    await api("/api/tax", {
      method: "POST",
      body: JSON.stringify({
        tax: value
      })
    });

    await refresh();

    $("taxInput").value = "";

    message(
      "taxMessage",
      "Imposto alterado com sucesso!",
      "success"
    );

  } catch (error) {

    message(
      "taxMessage",
      error.message,
      "error"
    );

  }

}

async function publishNews(event) {

  event.preventDefault();

  if (!state || state.user.role !== "mayor") {

    message(
      "newsMessage",
      "Apenas o prefeito pode publicar notícias.",
      "error"
    );

    return;

  }

  const title =
    $("newsTitle").value.trim();

  const text =
    $("newsText").value.trim();

  const category =
    $("newsCategory").value;

  if (!title || !text) {

    message(
      "newsMessage",
      "Preencha título e texto.",
      "error"
    );

    return;

  }

  try {

    await api("/api/news", {
      method: "POST",
      body: JSON.stringify({
        title,
        text,
        category,
        image: selectedNewsImage
      })
    });

    $("newsForm").reset();

    selectedNewsImage = "";

    $("imagePreview").style.display =
      "none";

    $("imagePreview").innerHTML = "";

    await refresh();

    message(
      "newsMessage",
      "Notícia publicada!",
      "success"
    );

  } catch (error) {

    message(
      "newsMessage",
      error.message,
      "error"
    );

  }

}

async function createEvent() {

  const title =
    $("eventTitle").value.trim();

  const text =
    $("eventText").value.trim();

  if (!title || !text) {

    message(
      "eventMessage",
      "Preencha os campos.",
      "error"
    );

    return;

  }

  try {

    await api("/api/event", {
      method: "POST",
      body: JSON.stringify({
        title,
        text
      })
    });

    $("eventTitle").value = "";
    $("eventText").value = "";

    await refresh();

    message(
      "eventMessage",
      "Evento criado!",
      "success"
    );

  } catch (error) {

    message(
      "eventMessage",
      error.message,
      "error"
    );

  }

}

/* =========================================================
   PROPOSTAS
========================================================= */

function renderProposals() {

  const container =
    $("proposalList");

  if (!container || !state) return;

  const proposals =
    state.proposals || [];

  if (!proposals.length) {

    container.innerHTML = `
      <p>
        Nenhuma proposta enviada.
      </p>
    `;

    return;

  }

  container.innerHTML = "";

  proposals.forEach(proposal => {

    const div =
      document.createElement("div");

    div.className =
      "proposal-card";

    div.innerHTML = `

      <strong>
        ${escapeHTML(proposal.author)}
      </strong>

      <p>
        ${escapeHTML(proposal.text)}
      </p>

      <div class="job-info">

        <span class="badge">
          ${escapeHTML(proposal.status)}
        </span>

        <span class="badge">
          ${escapeHTML(proposal.date)}
        </span>

      </div>

      ${
        state.user.role === "mayor" &&
        proposal.status === "Pendente"

          ? `

            <div class="proposal-actions">

              <button
                class="approve-button"
                data-proposal="${proposal.id}"
                data-approve="true"
              >
                Aprovar
              </button>

              <button
                class="reject-button"
                data-proposal="${proposal.id}"
                data-approve="false"
              >
                Recusar
              </button>

            </div>

          `

          : ""
      }

    `;

    container.appendChild(div);

  });

  container
    .querySelectorAll("[data-proposal]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          try {

            await api(
              "/api/proposals/" +
              button.dataset.proposal,
              {
                method: "POST",
                body: JSON.stringify({
                  approve:
                    button.dataset.approve === "true"
                })
              }
            );

            await refresh();

          } catch (error) {

            alert(error.message);

          }

        }
      );

    });

}

/* =========================================================
   LOGOUT
========================================================= */

$("logoutButton")?.addEventListener(
  "click",
  async () => {

    try {

      await api("/api/logout", {
        method: "POST"
      });

    } catch {
      /* Mesmo se a sessão já tiver expirado,
         voltamos para a tela de login. */
    }

    if (missionInterval) {
      clearInterval(missionInterval);
    }

    state = null;

    hide("gameScreen");
    hide("registerScreen");
    show("loginScreen");

  }
);

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupAuth();

    checkSession();

  }
);
```
