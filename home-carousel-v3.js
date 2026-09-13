(() => {
  "use strict";

  /*
   * ============================================================
   * SOROKIBA — HOME CAROUSEL V3
   * ============================================================
   *
   * V3 mantém o sistema do carrossel, mas cada mensagem possui
   * uma decoração própria.
   *
   * V2 NÃO é apagado.
   *
   * ============================================================
   */

  const ID = "soro-carousel-v3";
  const WAIT = 7000;

  /*
   * Evita que o arquivo seja executado duas vezes.
   * Isso é importante porque o bootstrap pode carregar o V3
   * mais de uma vez.
   */

  if (window.__SOROKIBA_CAROUSEL_V3__) {
    return;
  }

  window.__SOROKIBA_CAROUSEL_V3__ = true;

  /* ============================================================
     UTILITÁRIOS
     ============================================================ */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function safeText(value) {
    return String(value ?? "").trim();
  }

  /* ============================================================
     USUÁRIO
     ============================================================ */

  function getUserName() {

    const candidates = [
      window.me?.name,
      window.me?.username,
      window.me?.user?.name,
      window.me?.user?.username,

      window.currentUser?.name,
      window.currentUser?.username,

      window.user?.name,
      window.user?.username,

      document.body?.dataset?.username,

      $("#sideName")?.textContent,
      $("#username")?.textContent,
      $(".username")?.textContent
    ];

    for (const value of candidates) {

      const name = safeText(value);

      if (!name) continue;

      if (
        name.toLowerCase() === "cidadão" ||
        name.toLowerCase() === "cidadao" ||
        name.toLowerCase() === "usuário" ||
        name.toLowerCase() === "usuario" ||
        name.toLowerCase() === "undefined" ||
        name.toLowerCase() === "null"
      ) {
        continue;
      }

      /*
       * Se vier "Chen Santos", usamos somente Chen.
       */

      return name.split(/\s+/)[0];
    }

    return "Cidadão";
  }

  /* ============================================================
     PROFISSÃO
     ============================================================ */

  function getCurrentJob() {

    const candidates = [

      window.me?.jobName,
      window.me?.job,
      window.me?.profession,
      window.me?.career,

      window.currentUser?.jobName,
      window.currentUser?.job,
      window.currentUser?.profession,

      window.user?.jobName,
      window.user?.job,
      window.user?.profession,

      $("#sideJob")?.textContent,
      $("#jobName")?.textContent,
      $(".job-name")?.textContent
    ];

    for (const value of candidates) {

      const job = safeText(value);

      if (
        job &&
        job.toLowerCase() !== "undefined" &&
        job.toLowerCase() !== "null"
      ) {
        return job;
      }
    }

    return "Estudante";
  }

  /* ============================================================
     HORÁRIO
     ============================================================ */

  function getHour() {

    try {

      return Number(
        new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          hour12: false
        }).format(new Date())
      );

    } catch {

      return new Date().getHours();
    }
  }

  function getPeriod() {

    const hour = getHour();

    if (hour >= 5 && hour < 12) {
      return "morning";
    }

    if (hour >= 12 && hour < 18) {
      return "afternoon";
    }

    return "night";
  }

  /* ============================================================
     ESTAÇÃO
     ============================================================ */

  function getSeason() {

    const now = new Date();

    const month = now.getMonth() + 1;
    const day = now.getDate();

    const value = month * 100 + day;

    if (value >= 1221 || value <= 320) {
      return "Verão";
    }

    if (value <= 620) {
      return "Outono";
    }

    if (value <= 922) {
      return "Inverno";
    }

    return "Primavera";
  }

  /* ============================================================
     ESTILOS
     ============================================================ */

  function installStyles() {

    if ($("#soro-carousel-v3-css")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "soro-carousel-v3-css";

    style.textContent = `

      /* ========================================================
         BASE
      ======================================================== */

      #${ID} {

        position: relative;

        width: 100%;
        min-height: 380px;
        height: 380px;

        overflow: hidden;

        isolation: isolate;

        border-radius: 28px;

        color: #ffffff;

        font-family: inherit;

        background:
          linear-gradient(
            135deg,
            #07111c,
            #0a1b29 50%,
            #02070d
          );

        border:
          1px solid rgba(255,255,255,.14);

        box-shadow:
          0 24px 70px rgba(0,0,0,.35),
          inset 0 1px rgba(255,255,255,.10);

        transition:
          background 900ms ease,
          box-shadow 900ms ease;
      }

      #${ID} * {
        box-sizing: border-box;
      }

      /* ========================================================
         FUNDO
      ======================================================== */

      .s3-background {

        position: absolute;

        inset: 0;

        z-index: 0;

        overflow: hidden;

        pointer-events: none;
      }

      .s3-city {

        position: absolute;

        left: 30%;

        bottom: 0;

        width: 75%;

        height: 145px;

        opacity: .30;

        background:
          linear-gradient(
            90deg,
            transparent 0 4%,
            rgba(110,190,225,.20) 4% 9%,
            transparent 9% 14%,
            rgba(110,190,225,.15) 14% 21%,
            transparent 21% 26%,
            rgba(110,190,225,.22) 26% 34%,
            transparent 34% 39%,
            rgba(110,190,225,.16) 39% 48%,
            transparent 48% 53%,
            rgba(110,190,225,.21) 53% 61%,
            transparent 61% 67%,
            rgba(110,190,225,.15) 67% 76%,
            transparent 76% 82%,
            rgba(110,190,225,.20) 82% 90%,
            transparent 90%
          );

        clip-path:
          polygon(
            0 100%,
            0 60%,
            5% 60%,
            5% 30%,
            11% 30%,
            11% 65%,
            16% 65%,
            16% 20%,
            23% 20%,
            23% 58%,
            28% 58%,
            28% 37%,
            35% 37%,
            35% 68%,
            40% 68%,
            40% 12%,
            48% 12%,
            48% 60%,
            54% 60%,
            54% 28%,
            62% 28%,
            62% 67%,
            68% 67%,
            68% 17%,
            77% 17%,
            77% 59%,
            83% 59%,
            83% 27%,
            91% 27%,
            91% 62%,
            100% 62%,
            100% 100%
          );
      }

      .s3-grid {

        position: absolute;

        left: -20%;
        right: -20%;

        bottom: -105px;

        height: 230px;

        opacity: .15;

        background:
          linear-gradient(
            rgba(120,210,255,.25) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(120,210,255,.18) 1px,
            transparent 1px
          );

        background-size: 32px 32px;

        transform:
          perspective(180px)
          rotateX(58deg);
      }

      /* ========================================================
         CONTEÚDO
      ======================================================== */

      .s3-content {

        position: absolute;

        z-index: 20;

        top: 50%;

        left: 42px;

        right: 38%;

        transform: translateY(-50%);

        animation:
          s3ContentIn .65s ease both;
      }

      .s3-tag {

        display: inline-flex;

        align-items: center;

        gap: 8px;

        padding: 8px 13px;

        border-radius: 999px;

        border:
          1px solid rgba(255,255,255,.18);

        background:
          rgba(255,255,255,.055);

        backdrop-filter: blur(14px);

        color: rgba(255,255,255,.80);

        font-size: 9px;

        font-weight: 900;

        letter-spacing: 1.8px;

        text-transform: uppercase;
      }

      .s3-dot {

        width: 7px;
        height: 7px;

        border-radius: 50%;

        background: #7de5c1;

        box-shadow:
          0 0 14px rgba(125,229,193,.9);

        animation:
          s3Pulse 1.6s ease-in-out infinite;
      }

      .s3-title {

        margin:
          16px 0 10px;

        font-size:
          clamp(34px, 4.3vw, 60px);

        line-height: .98;

        letter-spacing: -2.5px;

        font-weight: 950;

        text-shadow:
          0 10px 35px rgba(0,0,0,.45);
      }

      .s3-text {

        margin: 0;

        max-width: 650px;

        color:
          rgba(220,235,248,.78);

        font-size: 14px;

        line-height: 1.65;
      }

      .s3-meta {

        margin-top: 17px;

        color:
          rgba(150,190,215,.62);

        font-size: 8px;

        font-weight: 900;

        letter-spacing: 1.8px;

        text-transform: uppercase;
      }

      /* ========================================================
         INDICADORES
      ======================================================== */

      .s3-indicator {

        position: absolute;

        z-index: 80;

        left: 50%;

        bottom: 15px;

        transform: translateX(-50%);

        display: flex;

        align-items: center;

        gap: 8px;

        padding: 8px 11px;

        border-radius: 999px;

        background:
          rgba(2,8,15,.72);

        border:
          1px solid rgba(255,255,255,.15);

        backdrop-filter: blur(15px);

        box-shadow:
          0 12px 35px rgba(0,0,0,.32);
      }

      .s3-indicator button {

        appearance: none;

        border: 0;

        padding: 0;

        width: 7px;
        height: 7px;

        border-radius: 50%;

        background:
          rgba(225,240,255,.28);

        cursor: pointer;

        transition:
          width .35s ease,
          transform .35s ease,
          background .35s ease,
          box-shadow .35s ease;
      }

      .s3-indicator button:hover {

        transform: scale(1.5);

        background:
          rgba(255,255,255,.85);
      }

      .s3-indicator button.active {

        width: 29px;

        border-radius: 8px;

        background: #ffffff;

        box-shadow:
          0 0 17px rgba(115,210,255,.95);
      }

      /* ========================================================
         SOL — BOM DIA
      ======================================================== */

      .s3-sunrise {

        position: absolute;

        right: 10%;

        bottom: 54px;

        width: 210px;
        height: 210px;

        border-radius: 50%;

        background:
          radial-gradient(
            circle,
            rgba(255,252,205,1) 0 8%,
            rgba(255,218,126,.96) 22%,
            rgba(255,180,70,.38) 47%,
            rgba(255,153,45,.12) 60%,
            transparent 72%
          );

        filter:
          blur(.2px);

        box-shadow:
          0 0 65px rgba(255,194,87,.58);

        animation:
          s3Sunrise 5s ease-in-out infinite;
      }

      .s3-horizon {

        position: absolute;

        right: -5%;

        bottom: 0;

        width: 75%;

        height: 75px;

        border-radius:
          50% 50% 0 0;

        background:
          linear-gradient(
            180deg,
            rgba(255,180,75,.20),
            rgba(255,180,75,.02)
          );

        filter:
          blur(2px);
      }

      .s3-ray {

        position: absolute;

        right: 7%;

        bottom: 42px;

        width: 280px;
        height: 280px;

        border-radius: 50%;

        background:
          repeating-conic-gradient(
            from 0deg,
            rgba(255,220,135,.22) 0deg 3deg,
            transparent 3deg 18deg
          );

        mask-image:
          radial-gradient(
            circle,
            transparent 0 30%,
            #000 31% 43%,
            transparent 44% 100%
          );

        animation:
          s3RaySpin 22s linear infinite;
      }

      /* ========================================================
         SOL — BOA TARDE
      ======================================================== */

      .s3-afternoon-sun {

        position: absolute;

        right: 12%;

        top: 11%;

        width: 125px;
        height: 125px;

        border-radius: 50%;

        background:
          radial-gradient(
            circle,
            #fffde2 0 10%,
            #ffe18c 30%,
            rgba(255,180,50,.45) 57%,
            transparent 75%
          );

        box-shadow:
          0 0 50px rgba(255,209,102,.9),
          0 0 120px rgba(255,166,50,.30);

        animation:
          s3Float 4s ease-in-out infinite;
      }

      .s3-light {

        position: absolute;

        inset: 0;

        background:
          radial-gradient(
            circle at 82% 23%,
            rgba(255,210,110,.25),
            transparent 33%
          );

        mix-blend-mode:
          screen;
      }

      /* ========================================================
         NOITE
      ======================================================== */

      .s3-night {

        position: absolute;

        inset: 0;

        background:
          radial-gradient(
            circle at 82% 24%,
            rgba(90,145,255,.17),
            transparent 30%
          );
      }

      .s3-moon {

        position: absolute;

        right: 11%;

        top: 12%;

        width: 115px;
        height: 115px;

        border-radius: 50%;

        background:
          radial-gradient(
            circle at 35% 32%,
            #ffffff,
            #e7f5ff 60%,
            #c8e5fa
          );

        box-shadow:
          0 0 35px rgba(220,245,255,.95),
          0 0 100px rgba(80,155,255,.30);
      }

      .s3-moon::after {

        content: "";

        position: absolute;

        width: 118px;
        height: 118px;

        left: 40px;
        top: -12px;

        border-radius: 50%;

        background:
          #07111c;
      }

      .s3-star {

        position: absolute;

        width: 4px;
        height: 4px;

        border-radius: 50%;

        background: #ffffff;

        box-shadow:
          0 0 12px #a8dfff;

        animation:
          s3Twinkle 2.3s ease-in-out infinite;
      }

      .s3-star.big {

        width: 6px;
        height: 6px;
      }

      .s3-meteor {

        position: absolute;

        width: 105px;
        height: 2px;

        border-radius: 999px;

        background:
          linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.9),
            #8ed8ff
          );

        transform:
          rotate(-28deg);

        opacity: 0;

        animation:
          s3Meteor 8s linear infinite;
      }

      /* ========================================================
         INVERNO
      ======================================================== */

      .s3-winter {

        position: absolute;

        inset: 0;

        background:
          radial-gradient(
            circle at 80% 15%,
            rgba(170,225,255,.17),
            transparent 30%
          ),
          linear-gradient(
            145deg,
            rgba(90,165,205,.12),
            transparent 60%
          );
      }

      .s3-snowflake {

        position: absolute;

        color:
          rgba(235,249,255,.92);

        font-size:
          var(--size, 18px);

        text-shadow:
          0 0 14px rgba(130,220,255,.85);

        animation:
          s3SnowFall var(--duration, 5s)
          linear infinite;

        animation-delay:
          var(--delay, 0s);
      }

      .s3-snow-ground {

        position: absolute;

        left: -5%;

        right: -5%;

        bottom: -25px;

        height: 85px;

        border-radius:
          50% 50% 0 0;

        background:
          linear-gradient(
            180deg,
            rgba(235,249,255,.38),
            rgba(175,220,242,.09)
          );

        filter:
          blur(1px);
      }

      /* ========================================================
         CARREIRA
      ======================================================== */

      .s3-work-card {

        position: absolute;

        right: 7%;

        top: 9%;

        width: 300px;

        height: 255px;

        padding: 23px;

        border-radius: 25px;

        border:
          1px solid rgba(105,239,201,.48);

        background:
          linear-gradient(
            145deg,
            rgba(39,210,165,.13),
            rgba(3,20,24,.92)
          );

        box-shadow:
          0 25px 80px rgba(25,215,170,.17),
          inset 0 1px rgba(190,255,235,.10);

        backdrop-filter:
          blur(12px);

        animation:
          s3Float 4s ease-in-out infinite;
      }

      .s3-work-label {

        color:
          rgba(180,255,233,.65);

        font-size: 8px;

        font-weight: 900;

        letter-spacing: 2px;
      }

      .s3-work-job {

        margin-top: 9px;

        color: #d9fff3;

        font-size: 21px;

        font-weight: 900;
      }

      .s3-chart {

        position: absolute;

        right: 20px;

        top: 29px;

        width: 145px;

        height: 92px;

        border-left:
          1px solid rgba(190,255,235,.25);

        border-bottom:
          1px solid rgba(190,255,235,.25);

        background:
          repeating-linear-gradient(
            to top,
            transparent 0 21px,
            rgba(190,255,235,.07) 22px 23px
          );
      }

      .s3-chart-line {

        position: absolute;

        inset: 13px 8px 8px 9px;

        overflow: visible;
      }

      .s3-chart-line::before {

        content: "";

        position: absolute;

        left: 0;

        top: 67px;

        width: 100%;

        height: 3px;

        border-radius: 5px;

        background:
          linear-gradient(
            135deg,
            transparent 0 12%,
            #75ffe0 13% 18%,
            transparent 19% 31%,
            #68dfff 32% 39%,
            transparent 40% 53%,
            #75ffe0 54% 62%,
            transparent 63% 76%,
            #68dfff 77% 84%,
            transparent 85%
          );

        transform:
          rotate(-11deg);
      }

      .s3-briefcase {

        position: absolute;

        left: 22px;

        bottom: 18px;

        font-size: 53px;

        filter:
          drop-shadow(
            0 0 17px rgba(80,240,190,.50)
          );
      }

      .s3-job-status {

        position: absolute;

        left: 85px;

        bottom: 34px;

        color:
          rgba(200,245,233,.58);

        font-size: 8px;

        font-weight: 900;

        letter-spacing: 1.2px;
      }

      /* ========================================================
         NOTÍCIAS
      ======================================================== */

      .s3-news-card {

        position: absolute;

        right: 7%;

        top: 9%;

        width: 300px;

        height: 255px;

        overflow: hidden;

        border-radius: 25px;

        border:
          1px solid rgba(100,200,255,.50);

        background:
          linear-gradient(
            145deg,
            #071927,
            #02070d
          );

        box-shadow:
          0 25px 80px rgba(40,160,255,.18),
          inset 0 1px rgba(190,235,255,.12);

        animation:
          s3Float 4s ease-in-out infinite;
      }

      .s3-news-head {

        position: absolute;

        left: 22px;
        right: 22px;

        top: 20px;

        display: flex;

        justify-content: space-between;

        align-items: center;
      }

      .s3-news-brand {

        font-size: 12px;

        font-weight: 950;

        letter-spacing: 1.7px;
      }

      .s3-live {

        display: flex;

        align-items: center;

        gap: 6px;

        color: #83e8ca;

        font-size: 7px;

        font-weight: 900;

        letter-spacing: 1px;
      }

      .s3-live::before {

        content: "";

        width: 7px;
        height: 7px;

        border-radius: 50%;

        background: #83e8ca;

        box-shadow:
          0 0 13px #83e8ca;

        animation:
          s3Pulse 1.3s infinite;
      }

      .s3-news-main {

        position: absolute;

        left: 22px;
        right: 22px;

        top: 68px;
      }

      .s3-news-main h4 {

        margin: 0 0 10px;

        font-size: 15px;

        line-height: 1.25;
      }

      .s3-news-line {

        height: 7px;

        margin-top: 9px;

        border-radius: 5px;

        background:
          rgba(185,225,255,.14);
      }

      .s3-news-line.short {
        width: 58%;
      }

      .s3-news-line.medium {
        width: 78%;
      }

      .s3-news-line.long {
        width: 92%;
      }

      .s3-news-footer {

        position: absolute;

        left: 0;
        right: 0;

        bottom: 0;

        padding: 13px 19px;

        border-top:
          1px solid rgba(180,225,255,.12);

        background:
          rgba(10,30,45,.55);

        color:
          rgba(140,215,255,.75);

        font-size: 7px;

        font-weight: 900;

        letter-spacing: 1.4px;
      }

      /* ========================================================
         FUTURISTA
      ======================================================== */

      .s3-future {

        position: absolute;

        right: 6%;

        top: 8%;

        width: 285px;
        height: 285px;

        border-radius: 50%;

        border:
          1px solid rgba(198,145,255,.65);

        box-shadow:
          0 0 70px rgba(160,80,255,.25),
          inset 0 0 60px rgba(75,175,255,.08);

        animation:
          s3FutureSpin 13s linear infinite;
      }

      .s3-future::before {

        content: "";

        position: absolute;

        inset: 38px;

        border:
          1px dashed rgba(220,190,255,.45);

        border-radius: 50%;
      }

      .s3-future::after {

        content: "S";

        position: absolute;

        inset: 0;

        display: grid;

        place-items: center;

        color:
          #eee1ff;

        font-size: 82px;

        font-weight: 950;

        text-shadow:
          0 0 25px #b36cff,
          0 0 60px rgba(130,80,255,.65);

        animation:
          s3FutureCounter 13s linear infinite;
      }

      .s3-future-ring {

        position: absolute;

        inset: 76px;

        border:
          1px solid rgba(110,215,255,.70);

        border-radius: 50%;

        box-shadow:
          0 0 25px rgba(90,190,255,.35);
      }

      .s3-future-node {

        position: absolute;

        width: 9px;
        height: 9px;

        border-radius: 50%;

        background:
          #d2b0ff;

        box-shadow:
          0 0 18px #c18bff;

        animation:
          s3Pulse 1.5s infinite;
      }

      .s3-node-a {

        right: 20%;
        top: 29%;
      }

      .s3-node-b {

        right: 35%;
        top: 50%;

        animation-delay: .5s;
      }

      .s3-node-c {

        right: 14%;
        top: 67%;

        animation-delay: .9s;
      }

      /* ========================================================
         ANIMAÇÕES
      ======================================================== */

      @keyframes s3ContentIn {

        from {

          opacity: 0;

          transform:
            translate(-18px, -50%);
        }

        to {

          opacity: 1;

          transform:
            translate(0, -50%);
        }
      }

      @keyframes s3Pulse {

        50% {

          opacity: .35;

          transform:
            scale(.65);
        }
      }

      @keyframes s3Float {

        50% {

          transform:
            translateY(-8px);
        }
      }

      @keyframes s3Sunrise {

        0%,
        100% {

          transform:
            translateY(8px)
            scale(.96);
        }

        50% {

          transform:
            translateY(-3px)
            scale(1.02);
        }
      }

      @keyframes s3RaySpin {

        to {

          transform:
            rotate(360deg);
        }
      }

      @keyframes s3Twinkle {

        0%,
        100% {

          opacity: .35;

          transform:
            scale(.65);
        }

        50% {

          opacity: 1;

          transform:
            scale(1.25);
        }
      }

      @keyframes s3Meteor {

        0%,
        55% {

          opacity: 0;

          transform:
            translate(0,0)
            rotate(-28deg);
        }

        59% {

          opacity: 1;
        }

        70% {

          opacity: 0;

          transform:
            translate(-210px,120px)
            rotate(-28deg);
        }

        100% {

          opacity: 0;
        }
      }

      @keyframes s3SnowFall {

        0% {

          opacity: 0;

          transform:
            translate3d(0,-40px,0)
            rotate(0deg);
        }

        12% {

          opacity: .9;
        }

        100% {

          opacity: 0;

          transform:
            translate3d(-55px,410px,0)
            rotate(180deg);
        }
      }

      @keyframes s3FutureSpin {

        to {

          transform:
            rotate(360deg);
        }
      }

      @keyframes s3FutureCounter {

        to {

          transform:
            rotate(-360deg);
        }
      }

      /* ========================================================
         RESPONSIVO
      ======================================================== */

      @media (max-width: 760px) {

        #${ID} {

          min-height: 400px;

          height: 400px;
        }

        .s3-content {

          left: 22px;

          right: 22px;

          top: 43%;

          max-width: 90%;
        }

        .s3-title {

          font-size: 34px;

          letter-spacing: -1.5px;
        }

        .s3-text {

          font-size: 12px;

          max-width: 90%;
        }

        .s3-work-card,
        .s3-news-card {

          right: -25px;

          top: 8%;

          transform:
            scale(.70);
        }

        .s3-future {

          right: -30px;

          top: 5%;

          transform:
            scale(.72);
        }

        .s3-sunrise {

          right: -35px;

          bottom: 40px;

          transform:
            scale(.72);
        }

        .s3-afternoon-sun,
        .s3-moon {

          right: 8%;

          transform:
            scale(.75);
        }
      }

    `;

    document.head.appendChild(style);
  }

  /* ============================================================
     ELEMENTOS DECORATIVOS
     ============================================================ */

  function starsHTML() {

    return `

      <i class="s3-star" style="right:34%;top:11%"></i>

      <i class="s3-star" style="right:23%;top:30%;animation-delay:.4s"></i>

      <i class="s3-star big" style="right:42%;top:21%;animation-delay:.8s"></i>

      <i class="s3-star" style="right:16%;top:55%;animation-delay:1.2s"></i>

      <i class="s3-star" style="right:38%;top:67%;animation-delay:.2s"></i>

      <i class="s3-star" style="right:8%;top:74%;animation-delay:1.7s"></i>

      <i class="s3-star big" style="right:48%;top:45%;animation-delay:1s"></i>

      <i class="s3-meteor" style="right:7%;top:16%"></i>

      <i
        class="s3-meteor"
        style="
          right:31%;
          top:7%;
          animation-delay:3.8s;
        "
      ></i>

    `;
  }

  function snowHTML() {

    return `

      <span
        class="s3-snowflake"
        style="
          left:12%;
          --size:18px;
          --duration:5.8s;
          --delay:0s;
        "
      >❄</span>

      <span
        class="s3-snowflake"
        style="
          left:27%;
          --size:12px;
          --duration:6.7s;
          --delay:1.1s;
        "
      >✦</span>

      <span
        class="s3-snowflake"
        style="
          left:42%;
          --size:21px;
          --duration:5.2s;
          --delay:2s;
        "
      >❄</span>

      <span
        class="s3-snowflake"
        style="
          left:57%;
          --size:14px;
          --duration:7s;
          --delay:.7s;
        "
      >❄</span>

      <span
        class="s3-snowflake"
        style="
          left:72%;
          --size:19px;
          --duration:6s;
          --delay:2.7s;
        "
      >✦</span>

      <span
        class="s3-snowflake"
        style="
          left:87%;
          --size:13px;
          --duration:5.5s;
          --delay:1.5s;
        "
      >❄</span>

      <span
        class="s3-snowflake"
        style="
          left:20%;
          --size:11px;
          --duration:8s;
          --delay:3s;
        "
      >✦</span>

      <span
        class="s3-snowflake"
        style="
          left:65%;
          --size:16px;
          --duration:6.5s;
          --delay:3.5s;
        "
      >❄</span>

      <div class="s3-snow-ground"></div>

    `;
  }

  /* ============================================================
     MENSAGENS
     ============================================================ */

  function buildMessage(index) {

    const username = getUserName();
    const job = getCurrentJob();
    const period = getPeriod();
    const season = getSeason();

    /* ========================================================
       1 — BOM DIA / BOA TARDE / BOA NOITE
       ======================================================== */

    if (index === 0) {

      if (period === "morning") {

        return {

          theme: "morning",

          tag: "SOROKIBA • BOM DIA",

          title:
            `Bom dia, ${username}!`,

          text:
            "O sol está nascendo sobre Sorokiba. Um novo dia começa e a cidade está esperando por você.",

          meta:
            `USUÁRIO CONECTADO • ${username}`,

          art: `

            <div class="s3-background">

              <div class="s3-sunrise"></div>

              <div class="s3-ray"></div>

              <div class="s3-horizon"></div>

              <div class="s3-city"></div>

            </div>

          `
        };
      }

      if (period === "afternoon") {

        return {

          theme: "afternoon",

          tag: "SOROKIBA • BOA TARDE",

          title:
            `Boa tarde, ${username}!`,

          text:
            "O sol está brilhando sobre Sorokiba. A cidade está movimentada e novas oportunidades podem surgir a qualquer momento.",

          meta:
            `USUÁRIO CONECTADO • ${username}`,

          art: `

            <div class="s3-background">

              <div class="s3-afternoon-sun"></div>

              <div class="s3-light"></div>

              <div class="s3-city"></div>

            </div>

          `
        };
      }

      return {

        theme: "night",

        tag: "SOROKIBA • BOA NOITE",

        title:
          `Boa noite, ${username}!`,

        text:
          "A noite chegou. As estrelas iluminam Sorokiba enquanto a cidade continua viva. E quem sabe um meteoro não cruza o céu?",

        meta:
          `USUÁRIO CONECTADO • ${username}`,

        art: `

          <div class="s3-background">

            <div class="s3-night"></div>

            <div class="s3-moon"></div>

            ${starsHTML()}

            <div class="s3-city"></div>

          </div>

        `
      };
    }

    /* ========================================================
       2 — ESTAÇÃO
       ======================================================== */

    if (index === 1) {

      if (season === "Inverno") {

        return {

          theme: "winter",

          tag: "CLIMA DE SOROKIBA",

          title:
            "❄️ Inverno",

          text:
            "A neve chegou a Sorokiba. Flocos atravessam o céu enquanto a cidade entra em seu período mais gelado.",

          meta:
            "ESTAÇÃO ATUAL • INVERNO",

          art: `

            <div class="s3-background">

              <div class="s3-winter"></div>

              ${snowHTML()}

              <div class="s3-city"></div>

            </div>

          `
        };
      }

      return {

        theme: "season",

        tag: "CLIMA DE SOROKIBA",

        title:
          season,

        text:
          "A atmosfera de Sorokiba acompanha a estação atual e transforma a aparência da cidade.",

        meta:
          `ESTAÇÃO ATUAL • ${season}`,

        art: `

          <div class="s3-background">

            <div class="s3-city"></div>

            <div class="s3-grid"></div>

          </div>

        `
      };
    }

    /* ========================================================
       3 — TRABALHO
       ======================================================== */

    if (index === 2) {

      return {

        theme: "work",

        tag: "SUA CARREIRA",

        title:
          job,

        text:
          `${username}, este é o seu trabalho atual em Sorokiba. Desenvolva sua carreira, adquira experiência e continue evoluindo.`,

        meta:
          `PROFISSÃO ATUAL • ${job}`,

        art: `

          <div class="s3-background">

            <div class="s3-work-card">

              <div class="s3-work-label">
                SEU TRABALHO
              </div>

              <div class="s3-work-job">
                ${job}
              </div>

              <div class="s3-chart">

                <div class="s3-chart-line"></div>

              </div>

              <div class="s3-briefcase">
                💼
              </div>

              <div class="s3-job-status">
                CARREIRA ATIVA
              </div>

            </div>

          </div>

        `
      };
    }

    /* ========================================================
       4 — NOTÍCIAS
       ======================================================== */

    if (index === 3) {

      return {

        theme: "news",

        tag: "CENTRAL DE NOTÍCIAS",

        title:
          "Notícias de Sorokiba",

        text:
          `${username}, acompanhe os acontecimentos, novidades e atualizações que movimentam a cidade.`,

        meta:
          "● CENTRAL DE INFORMAÇÃO • ATUALIZAÇÕES",

        art: `

          <div class="s3-background">

            <div class="s3-news-card">

              <div class="s3-news-head">

                <span class="s3-news-brand">
                  SOROKIBA NEWS
                </span>

                <span class="s3-live">
                  AO VIVO
                </span>

              </div>

              <div class="s3-news-main">

                <h4>
                  Principais acontecimentos
                </h4>

                <div class="s3-news-line long"></div>

                <div class="s3-news-line medium"></div>

                <div class="s3-news-line short"></div>

                <div class="s3-news-line long"></div>

                <div class="s3-news-line medium"></div>

              </div>

              <div class="s3-news-footer">
                CIDADE • NOTÍCIAS • NOVIDADES • SOROKIBA
              </div>

            </div>

          </div>

        `
      };
    }

    /* ========================================================
       5 — FUTURO
       ======================================================== */

    return {

      theme: "future",

      tag: "SOROKIBA • FUTURO",

      title:
        "A cidade evolui com você",

      text:
        `${username}, conecte-se à cidade, descubra novos lugares e participe da próxima geração de Sorokiba.`,

      meta:
        "CIDADE VIRTUAL • NOVA GERAÇÃO",

      art: `

        <div class="s3-background">

          <div class="s3-future">

            <div class="s3-future-ring"></div>

          </div>

          <i class="s3-future-node s3-node-a"></i>

          <i class="s3-future-node s3-node-b"></i>

          <i class="s3-future-node s3-node-c"></i>

        </div>

      `
    };
  }

  /* ============================================================
     CRIAR CARROSSEL
     ============================================================ */

  function create(host) {

    if (!host) {
      return;
    }

    installStyles();

    /*
     * Remove somente instâncias antigas do V3.
     *
     * NÃO remove o arquivo V2.
     */

    host
      .querySelectorAll(`#${ID}`)
      .forEach(node => node.remove());

    const root =
      document.createElement("section");

    root.id = ID;

    root.setAttribute(
      "aria-label",
      "Painel de boas-vindas de Sorokiba"
    );

    root.innerHTML = `

      <div class="s3-content">

        <span class="s3-tag">

          <i class="s3-dot"></i>

          <b class="s3-tag-text"></b>

        </span>

        <h2 class="s3-title"></h2>

        <p class="s3-text"></p>

        <div class="s3-meta"></div>

      </div>

      <div class="s3-art"></div>

      <div class="s3-indicator">

        <button
          type="button"
          data-index="0"
          class="active"
          aria-label="Mensagem 1">
        </button>

        <button
          type="button"
          data-index="1"
          aria-label="Mensagem 2">
        </button>

        <button
          type="button"
          data-index="2"
          aria-label="Mensagem 3">
        </button>

        <button
          type="button"
          data-index="3"
          aria-label="Mensagem 4">
        </button>

        <button
          type="button"
          data-index="4"
          aria-label="Mensagem 5">
        </button>

      </div>

    `;

    /*
     * O V3 entra no mesmo host utilizado pelo sistema.
     */

    host.prepend(root);

    const tag =
      $(".s3-tag-text", root);

    const title =
      $(".s3-title", root);

    const text =
      $(".s3-text", root);

    const meta =
      $(".s3-meta", root);

    const art =
      $(".s3-art", root);

    const buttons =
      $$(".s3-indicator button", root);

    let current = 0;

    let timer = null;

    /* ========================================================
       DESENHAR
       ======================================================== */

    function draw() {

      const data =
        buildMessage(current);

      tag.textContent =
        data.tag;

      title.textContent =
        data.title;

      text.textContent =
        data.text;

      meta.textContent =
        data.meta;

      art.innerHTML =
        data.art;

      root.dataset.theme =
        data.theme;

      buttons.forEach(
        (button, index) => {

          const active =
            index === current;

          button.classList.toggle(
            "active",
            active
          );

          button.setAttribute(
            "aria-current",
            active
              ? "true"
              : "false"
          );
        }
      );

      /*
       * Reinicia a animação de entrada do texto.
       */

      const content =
        $(".s3-content", root);

      if (content) {

        content.style.animation =
          "none";

        void content.offsetWidth;

        content.style.animation =
          "s3ContentIn .65s ease both";
      }
    }

    /* ========================================================
       TIMER
       ======================================================== */

    function restart() {

      if (timer) {
        clearInterval(timer);
      }

      timer =
        setInterval(() => {

          current =
            (current + 1) % 5;

          draw();

        }, WAIT);
    }

    /* ========================================================
       INDICADORES
       ======================================================== */

    buttons.forEach(button => {

      button.addEventListener(
        "click",
        () => {

          current =
            Number(
              button.dataset.index
            );

          draw();

          restart();
        }
      );

    });

    /* ========================================================
       PAUSAR AO PASSAR O MOUSE
       ======================================================== */

    root.addEventListener(
      "mouseenter",
      () => {

        if (timer) {
          clearInterval(timer);
        }

      }
    );

    root.addEventListener(
      "mouseleave",
      () => {

        restart();

      }
    );

    draw();

    restart();
  }

  /* ============================================================
     ENCONTRAR HOST
     ============================================================ */

  function findHost() {

    /*
     * Se o V2 ainda estiver presente, usamos o mesmo container
     * dele. Isso mantém compatibilidade com o bootstrap antigo.
     */

    const old =
      $("#soro-carousel-v16");

    if (
      old &&
      old.parentElement
    ) {
      return old.parentElement;
    }

    return (
      $(".soro-home-carousel-host") ||
      $(".soro-home-carousel") ||
      $(".hero") ||
      $("#content > .hero") ||
      $("#content")
    );
  }

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */

  function start() {

    const host =
      findHost();

    if (!host) {
      return false;
    }

    create(host);

    return true;
  }

  /* ============================================================
     OBSERVER
     ============================================================ */

  function watch() {

    /*
     * Tenta imediatamente.
     */

    start();

    /*
     * O V2 pode ser criado alguns milissegundos depois.
     * O observer permite que o V3 encontre o mesmo container.
     */

    let queued = false;

    const observer =
      new MutationObserver(() => {

        if (queued) {
          return;
        }

        queued = true;

        queueMicrotask(() => {

          queued = false;

          const root =
            $(`#${ID}`);

          /*
           * Se o V3 já existe, não precisamos recriá-lo
           * em cada alteração do DOM.
           */

          if (root) {
            return;
          }

          start();

        });

      });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    /*
     * Segurança: não mantém observer eternamente.
     */

    setTimeout(
      () => observer.disconnect(),
      45000
    );
  }

  /* ============================================================
     START
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      watch,
      {
        once: true
      }
    );

  } else {

    watch();

  }

})();
