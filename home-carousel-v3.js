(() => {
  'use strict';

  const ID = 'soro-carousel-v3';

  /* =========================================================
     UTILIDADES
  ========================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const escapeHTML = value => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  function safeJSON(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /* =========================================================
     USUÁRIO CONECTADO
  ========================================================= */

  function getCurrentUser() {

    const possibleKeys = [
      'sorokiba_user',
      'sorokibaUser',
      'currentUser',
      'loggedUser',
      'usuario',
      'usuarioLogado',
      'user',
      'userData',
      'account',
      'conta',
      'SOROKIBA_USER',
      'SOROKIBA_LOGGED_USER'
    ];

    for (const key of possibleKeys) {

      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = safeJSON(raw);

      if (parsed && typeof parsed === 'object') {

        const name =
          parsed.name ||
          parsed.nome ||
          parsed.username ||
          parsed.user ||
          parsed.usuario ||
          parsed.nick;

        if (name) {
          return String(name);
        }
      }

      if (
        typeof raw === 'string' &&
        raw.length > 0 &&
        raw.length < 80 &&
        !raw.includes('{')
      ) {
        return raw;
      }
    }

    /* Tenta encontrar dados em sessionStorage */

    for (const key of possibleKeys) {

      const raw = sessionStorage.getItem(key);

      if (!raw) continue;

      const parsed = safeJSON(raw);

      if (parsed && typeof parsed === 'object') {

        const name =
          parsed.name ||
          parsed.nome ||
          parsed.username ||
          parsed.user ||
          parsed.usuario;

        if (name) {
          return String(name);
        }
      }

      if (
        typeof raw === 'string' &&
        raw.length > 0 &&
        raw.length < 80 &&
        !raw.includes('{')
      ) {
        return raw;
      }
    }

    /* Tenta elementos existentes na página */

    const selectors = [
      '[data-username]',
      '[data-user]',
      '.username',
      '.user-name',
      '.usuario-nome',
      '#username',
      '#userName',
      '#usuarioLogado',
      '#nomeUsuario'
    ];

    for (const selector of selectors) {

      const element = $(selector);

      if (!element) continue;

      const value =
        element.dataset.username ||
        element.dataset.user ||
        element.textContent.trim();

      if (value) {
        return value;
      }
    }

    return 'Visitante';
  }

  /* =========================================================
     TRABALHO ATUAL
  ========================================================= */

  function getCurrentJob() {

    const keys = [
      'sorokiba_job',
      'sorokibaJob',
      'currentJob',
      'job',
      'trabalho',
      'trabalhoAtual',
      'jobName',
      'cargo'
    ];

    for (const key of keys) {

      const local = localStorage.getItem(key);

      if (local && local.length < 100) {
        return local;
      }

      const session = sessionStorage.getItem(key);

      if (session && session.length < 100) {
        return session;
      }
    }

    const userKeys = [
      'sorokiba_user',
      'currentUser',
      'user',
      'usuario',
      'usuarioLogado',
      'account'
    ];

    for (const key of userKeys) {

      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = safeJSON(raw);

      if (!parsed || typeof parsed !== 'object') {
        continue;
      }

      const job =
        parsed.job ||
        parsed.jobName ||
        parsed.trabalho ||
        parsed.trabalhoAtual ||
        parsed.profissao ||
        parsed.profession;

      if (job) {
        return String(job);
      }
    }

    return 'Sem trabalho definido';
  }

  /* =========================================================
     HORÁRIO
  ========================================================= */

  function getPeriod() {

    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return 'morning';
    }

    if (hour >= 12 && hour < 18) {
      return 'afternoon';
    }

    return 'night';
  }

  /* =========================================================
     ESTILOS
  ========================================================= */

  function installStyles() {

    if ($('#soro-carousel-v3-styles')) {
      return;
    }

    const style = document.createElement('style');

    style.id = 'soro-carousel-v3-styles';

    style.textContent = `
      #${ID} {
        width: 100%;
        max-width: 1180px;
        margin: 25px auto;
        position: relative;
        isolation: isolate;
        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        color: #fff;
      }

      #${ID} * {
        box-sizing: border-box;
      }

      .soro-v3-frame {
        position: relative;
        min-height: 245px;
        overflow: hidden;
        border-radius: 26px;
        border: 1px solid rgba(255,255,255,.14);
        background:
          linear-gradient(
            135deg,
            rgba(15,20,32,.98),
            rgba(24,29,45,.96)
          );
        box-shadow:
          0 25px 70px rgba(0,0,0,.35),
          inset 0 1px rgba(255,255,255,.08);
      }

      .soro-v3-background {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .soro-v3-content {
        position: relative;
        z-index: 5;
        min-height: 245px;
        padding: 34px 38px 58px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .soro-v3-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 13px;
      }

      .soro-v3-category {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,.09);
        border: 1px solid rgba(255,255,255,.12);
        backdrop-filter: blur(10px);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .soro-v3-time {
        opacity: .7;
        font-size: 12px;
        font-weight: 700;
      }

      .soro-v3-title {
        margin: 0;
        font-size: clamp(25px, 4vw, 42px);
        line-height: 1.05;
        letter-spacing: -.035em;
        font-weight: 900;
        text-shadow: 0 4px 25px rgba(0,0,0,.25);
      }

      .soro-v3-message {
        max-width: 800px;
        margin: 12px 0 0;
        font-size: 16px;
        line-height: 1.65;
        color: rgba(255,255,255,.82);
      }

      .soro-v3-highlight {
        color: #fff;
        font-weight: 850;
      }

      .soro-v3-indicator {
        position: absolute;
        z-index: 20;
        left: 50%;
        bottom: 17px;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(0,0,0,.25);
        border: 1px solid rgba(255,255,255,.1);
        backdrop-filter: blur(12px);
      }

      .soro-v3-dot {
        width: 7px;
        height: 7px;
        border: 0;
        border-radius: 50%;
        padding: 0;
        background: rgba(255,255,255,.28);
        cursor: pointer;
        transition:
          width .25s ease,
          background .25s ease,
          transform .25s ease;
      }

      .soro-v3-dot.active {
        width: 24px;
        border-radius: 99px;
        background: #fff;
        transform: scaleY(1.15);
      }

      /* =====================================================
         MANHÃ
      ===================================================== */

      .soro-theme-morning .soro-v3-frame {
        background:
          linear-gradient(
            135deg,
            #1e3852,
            #9b673b 55%,
            #f1bd68
          );
      }

      .soro-sunrise {
        position: absolute;
        width: 125px;
        height: 125px;
        border-radius: 50%;
        right: 10%;
        bottom: -58px;
        background:
          radial-gradient(
            circle,
            rgba(255,245,174,1) 0%,
            rgba(255,203,91,.9) 35%,
            rgba(255,165,57,.25) 65%,
            transparent 72%
          );
        box-shadow:
          0 0 65px rgba(255,190,72,.7);
        animation: soroSunRise 4s ease-in-out infinite alternate;
      }

      .soro-sun-rays {
        position: absolute;
        right: 5%;
        bottom: -20px;
        width: 240px;
        height: 160px;
        border-radius: 50%;
        background:
          repeating-conic-gradient(
            from -30deg,
            rgba(255,228,133,.28) 0deg 4deg,
            transparent 4deg 14deg
          );
        filter: blur(2px);
        opacity: .7;
      }

      @keyframes soroSunRise {
        from {
          transform: translateY(9px);
        }
        to {
          transform: translateY(-5px);
        }
      }

      /* =====================================================
         TARDE
      ===================================================== */

      .soro-theme-afternoon .soro-v3-frame {
        background:
          linear-gradient(
            135deg,
            #28628a,
            #479ac2 50%,
            #e8a84d
          );
      }

      .soro-bright-sun {
        position: absolute;
        right: 9%;
        top: 27px;
        width: 105px;
        height: 105px;
        border-radius: 50%;
        background:
          radial-gradient(
            circle,
            #fff7b3 0%,
            #ffe071 32%,
            #ffbd43 55%,
            rgba(255,174,50,.1) 72%,
            transparent 75%
          );
        box-shadow:
          0 0 50px rgba(255,213,92,.85),
          0 0 120px rgba(255,183,59,.45);
        animation: soroBrightSun 3.5s ease-in-out infinite alternate;
      }

      @keyframes soroBrightSun {
        from {
          transform: scale(.97);
        }
        to {
          transform: scale(1.04);
        }
      }

      /* =====================================================
         NOITE
      ===================================================== */

      .soro-theme-night .soro-v3-frame {
        background:
          radial-gradient(
            circle at 80% 15%,
            rgba(86,101,181,.35),
            transparent 28%
          ),
          linear-gradient(
            135deg,
            #070c20,
            #101735 60%,
            #171d3e
          );
      }

      .soro-stars {
        position: absolute;
        inset: 0;
        opacity: .9;
        background-image:
          radial-gradient(circle, rgba(255,255,255,.9) 1px, transparent 1.5px),
          radial-gradient(circle, rgba(255,255,255,.65) 1px, transparent 1.5px);
        background-size:
          71px 67px,
          113px 91px;
        background-position:
          10px 8px,
          42px 27px;
        animation: soroStars 10s linear infinite;
      }

      @keyframes soroStars {
        from {
          transform: translateY(0);
        }
        to {
          transform: translateY(12px);
        }
      }

      .soro-moon {
        position: absolute;
        right: 10%;
        top: 28px;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: #f7f1c9;
        box-shadow:
          0 0 40px rgba(245,240,195,.6);
      }

      .soro-meteor {
        position: absolute;
        width: 90px;
        height: 2px;
        border-radius: 99px;
        background:
          linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.95)
          );
        transform: rotate(-28deg);
        opacity: 0;
        animation: soroMeteor 6s linear infinite;
      }

      .soro-meteor.one {
        top: 45px;
        left: 15%;
      }

      .soro-meteor.two {
        top: 105px;
        left: 48%;
        animation-delay: 3.4s;
      }

      @keyframes soroMeteor {
        0% {
          opacity: 0;
          transform:
            translate(0,0)
            rotate(-28deg);
        }

        8% {
          opacity: 1;
        }

        25% {
          opacity: 0;
          transform:
            translate(170px,85px)
            rotate(-28deg);
        }

        100% {
          opacity: 0;
        }
      }

      /* =====================================================
         INVERNO
      ===================================================== */

      .soro-theme-winter .soro-v3-frame {
        background:
          linear-gradient(
            135deg,
            #17354b,
            #48778f 50%,
            #d9edf2
          );
      }

      .soro-snow {
        position: absolute;
        inset: -20px 0 0;
        background-image:
          radial-gradient(circle, rgba(255,255,255,.95) 1px, transparent 2px),
          radial-gradient(circle, rgba(255,255,255,.85) 2px, transparent 3px),
          radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 2px);
        background-size:
          35px 35px,
          65px 65px,
          95px 95px;
        animation: soroSnow 9s linear infinite;
        opacity: .85;
      }

      @keyframes soroSnow {
        from {
          transform: translateY(-35px);
        }

        to {
          transform: translateY(120px);
        }
      }

      .soro-ice-line {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 55px;
        background:
          linear-gradient(
            180deg,
            transparent,
            rgba(225,249,255,.45)
          );
        border-top: 1px solid rgba(255,255,255,.35);
      }

      /* =====================================================
         TRABALHO
      ===================================================== */

      .soro-theme-job .soro-v3-frame {
        background:
          linear-gradient(
            135deg,
            #1b1c2c,
            #252c48 50%,
            #313b5c
          );
      }

      .soro-briefcase {
        position: absolute;
        right: 8%;
        bottom: 22px;
        width: 120px;
        height: 80px;
        border-radius: 12px;
        border: 3px solid rgba(255,255,255,.32);
        background: rgba(255,255,255,.07);
        transform: rotate(-5deg);
        box-shadow:
          0 20px 50px rgba(0,0,0,.25);
      }

      .soro-briefcase::before {
        content: "";
        position: absolute;
        width: 44px;
        height: 18px;
        left: 35px;
        top: -19px;
        border: 3px solid rgba(255,255,255,.32);
        border-bottom: 0;
        border-radius: 9px 9px 0 0;
      }

      .soro-career-line {
        position: absolute;
        right: 3%;
        top: 25px;
        width: 210px;
        height: 150px;
        border-top: 1px solid rgba(255,255,255,.12);
        border-right: 1px solid rgba(255,255,255,.12);
        transform: skewY(-18deg);
      }

      /* =====================================================
         NOTÍCIA
      ===================================================== */

      .soro-theme-news .soro-v3-frame {
        background:
          linear-gradient(
            135deg,
            #151922,
            #222a38 55%,
            #11151e
          );
      }

      .soro-news-lines {
        position: absolute;
        inset: 0;
        background:
          repeating-linear-gradient(
            0deg,
            transparent 0 30px,
            rgba(255,255,255,.025) 31px
          );
      }

      .soro-news-orbit {
        position: absolute;
        right: -50px;
        top: -75px;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.12);
        box-shadow:
          0 0 0 35px rgba(255,255,255,.025),
          0 0 0 70px rgba(255,255,255,.018);
      }

      .soro-news-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-top: 14px;
        font-size: 12px;
        font-weight: 800;
        opacity: .72;
      }

      .soro-news-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 12px currentColor;
      }

      /* =====================================================
         FUTURISTA
      ===================================================== */

      .soro-theme-future .soro-v3-frame {
        background:
          radial-gradient(
            circle at 75% 35%,
            rgba(93,102,255,.22),
            transparent 25%
          ),
          linear-gradient(
            135deg,
            #090b17,
            #11152a 50%,
            #080b18
          );
        border-color: rgba(140,150,255,.3);
      }

      .soro-future-grid {
        position: absolute;
        inset: -50%;
        background:
          linear-gradient(
            rgba(125,140,255,.07) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(125,140,255,.07) 1px,
            transparent 1px
          );
        background-size: 45px 45px;
        transform: perspective(500px) rotateX(58deg);
        transform-origin: center bottom;
        animation: soroGridMove 7s linear infinite;
      }

      @keyframes soroGridMove {
        from {
          transform:
            perspective(500px)
            rotateX(58deg)
            translateY(0);
        }

        to {
          transform:
            perspective(500px)
            rotateX(58deg)
            translateY(45px);
        }
      }

      .soro-future-ring {
        position: absolute;
        right: 9%;
        top: 30px;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border:
          1px solid rgba(148,160,255,.55);
        box-shadow:
          0 0 30px rgba(99,112,255,.2),
          inset 0 0 25px rgba(99,112,255,.12);
        animation: soroFutureRing 7s linear infinite;
      }

      .soro-future-ring::before,
      .soro-future-ring::after {
        content: "";
        position: absolute;
        inset: 16px;
        border-radius: 50%;
        border: 1px dashed rgba(180,190,255,.3);
      }

      .soro-future-ring::after {
        inset: 37px;
        border-style: solid;
      }

      @keyframes soroFutureRing {
        to {
          transform: rotate(360deg);
        }
      }

      .soro-future-code {
        position: absolute;
        right: 6%;
        bottom: 18px;
        font-family: monospace;
        font-size: 10px;
        letter-spacing: .15em;
        opacity: .25;
      }

      /* =====================================================
         TRANSIÇÃO
      ===================================================== */

      .soro-v3-slide {
        animation: soroSlideIn .45s cubic-bezier(.2,.8,.2,1);
      }

      @keyframes soroSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(.985);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 700px) {

        .soro-v3-content {
          padding: 25px 22px 58px;
        }

        .soro-v3-frame {
          min-height: 275px;
        }

        .soro-v3-content {
          min-height: 275px;
        }

        .soro-v3-message {
          font-size: 14px;
        }

        .soro-briefcase,
        .soro-future-ring {
          opacity: .35;
        }

        .soro-v3-time {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     TEMAS
  ========================================================= */

  function createBackground(type) {

    if (type === 'morning') {

      return `
        <div class="soro-sun-rays"></div>
        <div class="soro-sunrise"></div>
      `;
    }

    if (type === 'afternoon') {

      return `
        <div class="soro-bright-sun"></div>
      `;
    }

    if (type === 'night') {

      return `
        <div class="soro-stars"></div>
        <div class="soro-moon"></div>
        <div class="soro-meteor one"></div>
        <div class="soro-meteor two"></div>
      `;
    }

    if (type === 'winter') {

      return `
        <div class="soro-snow"></div>
        <div class="soro-ice-line"></div>
      `;
    }

    if (type === 'job') {

      return `
        <div class="soro-career-line"></div>
        <div class="soro-briefcase"></div>
      `;
    }

    if (type === 'news') {

      return `
        <div class="soro-news-lines"></div>
        <div class="soro-news-orbit"></div>
      `;
    }

    if (type === 'future') {

      return `
        <div class="soro-future-grid"></div>
        <div class="soro-future-ring"></div>
        <div class="soro-future-code">
          SOROKIBA // SYSTEM ONLINE
        </div>
      `;
    }

    return '';
  }

  /* =========================================================
     MENSAGENS
  ========================================================= */

  function createMessages() {

    const username = escapeHTML(getCurrentUser());
    const job = escapeHTML(getCurrentJob());
    const period = getPeriod();

    const messages = [];

    /* 1 — BOM DIA */

    if (period === 'morning') {

      messages.push({
        type: 'morning',
        icon: '☀️',
        category: 'Bom dia',
        title: `Bom dia, ${username}!`,
        message:
          `O sol está nascendo em Sorokiba. Que seu dia comece bem e que novas oportunidades apareçam pelo caminho.`
      });

    } else if (period === 'afternoon') {

      /* 2 — BOA TARDE */

      messages.push({
        type: 'afternoon',
        icon: '🌇',
        category: 'Boa tarde',
        title: `Boa tarde, ${username}!`,
        message:
          `O dia continua em Sorokiba. Aproveite a tarde, explore a cidade e confira o que há de novo por aqui.`
      });

    } else {

      /* 3 — BOA NOITE */

      messages.push({
        type: 'night',
        icon: '🌙',
        category: 'Boa noite',
        title: `Boa noite, ${username}!`,
        message:
          `A cidade está mais tranquila. Olhe para o céu... talvez você tenha sorte e veja um meteoro atravessando as estrelas.`
      });
    }

    /* 4 — INVERNO */

    messages.push({
      type: 'winter',
      icon: '❄️',
      category: 'Clima de Sorokiba',
      title: 'O inverno chegou',
      message:
        `A temperatura caiu e a neve começa a tomar conta das ruas. Vista-se bem antes de sair para explorar a cidade.`
    });

    /* 5 — TRABALHO */

    messages.push({
      type: 'job',
      icon: '💼',
      category: 'Sua carreira',
      title: 'Seu trabalho atual',
      message:
        `Você está trabalhando como <span class="soro-v3-highlight">${job}</span>. Continue avançando para desbloquear novas oportunidades em Sorokiba.`
    });

    /* 6 — NOTÍCIA */

    messages.push({
      type: 'news',
      icon: '📰',
      category: 'Notícias de Sorokiba',
      title: 'Boletim da cidade',
      message:
        `Novidades estão movimentando Sorokiba. Fique atento às mudanças, aos novos acontecimentos e às oportunidades que podem surgir.`
    });

    /* 7 — FUTURISTA */

    messages.push({
      type: 'future',
      icon: '◈',
      category: 'Sorokiba // Future',
      title: 'O futuro está chegando',
      message:
        `O sistema de Sorokiba continua evoluindo. Novas funções, novas experiências e novas possibilidades estão sendo preparadas.`,
    });

    return messages;
  }

  /* =========================================================
     HOST
  ========================================================= */

  function findHost() {

    const existing = document.getElementById(ID);

    if (existing) {
      return existing.parentElement;
    }

    return (
      document.querySelector('.soro-home-carousel-host') ||
      document.querySelector('.soro-home-carousel') ||
      document.querySelector('.hero') ||
      document.querySelector('#content > .hero') ||
      document.querySelector('#content') ||
      document.body
    );
  }

  /* =========================================================
     CRIAR CARROSSEL
  ========================================================= */

  function create(host) {

    if (!host) {
      return false;
    }

    installStyles();

    /* Remove somente o V3 anterior */

    host.querySelectorAll(`#${ID}`).forEach(node => {
      node.remove();
    });

    const messages = createMessages();

    let current = 0;
    let timer = null;

    const root = document.createElement('section');

    root.id = ID;

    root.setAttribute(
      'aria-label',
      'Carrossel de mensagens de Sorokiba'
    );

    root.innerHTML = `
      <div class="soro-v3-frame">

        <div class="soro-v3-background"></div>

        <div class="soro-v3-content">

          <div class="soro-v3-top">

            <div class="soro-v3-category"></div>

            <div class="soro-v3-time"></div>

          </div>

          <h2 class="soro-v3-title"></h2>

          <div class="soro-v3-message"></div>

        </div>

        <div
          class="soro-v3-indicator"
          aria-label="Navegação das mensagens"
        ></div>

      </div>
    `;

    host.appendChild(root);

    const frame = $('.soro-v3-frame', root);
    const background = $('.soro-v3-background', root);
    const category = $('.soro-v3-category', root);
    const time = $('.soro-v3-time', root);
    const title = $('.soro-v3-title', root);
    const message = $('.soro-v3-message', root);
    const indicator = $('.soro-v3-indicator', root);

    function draw() {

      const item = messages[current];

      frame.className =
        'soro-v3-frame soro-theme-' +
        item.type;

      background.innerHTML =
        createBackground(item.type);

      category.innerHTML =
        `${item.icon} ${item.category}`;

      const now = new Date();

      time.textContent =
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });

      title.innerHTML =
        item.title;

      message.innerHTML =
        item.message;

      title.classList.remove('soro-v3-slide');
      message.classList.remove('soro-v3-slide');

      void title.offsetWidth;

      title.classList.add('soro-v3-slide');
      message.classList.add('soro-v3-slide');

      indicator.innerHTML =
        messages
          .map((_, index) => `
            <button
              type="button"
              class="soro-v3-dot ${index === current ? 'active' : ''}"
              data-index="${index}"
              aria-label="Mensagem ${index + 1}"
              aria-current="${index === current ? 'true' : 'false'}"
            ></button>
          `)
          .join('');

      indicator
        .querySelectorAll('.soro-v3-dot')
        .forEach(dot => {

          dot.addEventListener('click', () => {

            current =
              Number(dot.dataset.index);

            draw();
            restart();

          });

        });
    }

    function next() {

      current =
        (current + 1) % messages.length;

      draw();
    }

    function restart() {

      clearInterval(timer);

      timer =
        setInterval(next, 7000);
    }

    root.addEventListener(
      'mouseenter',
      () => clearInterval(timer)
    );

    root.addEventListener(
      'mouseleave',
      restart
    );

    draw();
    restart();

    root.dataset.version = 'v3';

    return true;
  }

  /* =========================================================
     INICIALIZAÇÃO
  ========================================================= */

  function start() {

    const host = findHost();

    if (!host) {
      return false;
    }

    return create(host);
  }

  function watch() {

    installStyles();

    if (start()) {
      return;
    }

    const observer =
      new MutationObserver(() => {

        if (start()) {
          observer.disconnect();
        }

      });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
    }, 45000);
  }

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      watch,
      { once: true }
    );

  } else {

    watch();

  }

})();
