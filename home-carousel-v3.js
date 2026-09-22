(() => {
  'use strict';

  const ID = 'soro-carousel-v3';
  const $ = (selector, root = document) => root.querySelector(selector);

  const escapeHTML = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  async function getUser() {
    try {
      const token = localStorage.getItem('sorokiba_token');
      if (!token) return null;

      const response = await fetch('/api/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  async function getNews() {
    try {
      const token = localStorage.getItem('sorokiba_token');
      const response = await fetch('/api/news', {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function installStyles() {
    if (document.getElementById('soro-carousel-v3-styles')) return;

    const style = document.createElement('style');
    style.id = 'soro-carousel-v3-styles';
    style.textContent = `
      #soro-carousel-v3 {
        width: 100%;
        margin: 0 0 24px;
        position: relative;
        z-index: 2;
      }

      #soro-carousel-v3 .soro-v3-frame {
        position: relative;
        min-height: 315px;
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 18px 55px rgba(0,0,0,.20);
        isolation: isolate;
      }

      #soro-carousel-v3 .soro-v3-background,
      #soro-carousel-v3 .soro-v3-background > * {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      #soro-carousel-v3 .soro-v3-content {
        position: relative;
        z-index: 3;
        min-height: 315px;
        padding: 38px 42px 66px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 18px rgba(0,0,0,.28);
      }

      #soro-carousel-v3 .soro-v3-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        margin-bottom: 12px;
      }

      #soro-carousel-v3 .soro-v3-category {
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
        opacity: .78;
      }

      #soro-carousel-v3 .soro-v3-time {
        font-size: 12px;
        font-weight: 800;
        opacity: .65;
      }

      #soro-carousel-v3 .soro-v3-title {
        margin: 0;
        max-width: 760px;
        font-size: clamp(27px, 4vw, 45px);
        line-height: 1.02;
        letter-spacing: -.035em;
      }

      #soro-carousel-v3 .soro-v3-message {
        max-width: 690px;
        margin-top: 14px;
        font-size: clamp(14px, 1.8vw, 17px);
        line-height: 1.6;
        opacity: .88;
      }

      #soro-carousel-v3 .soro-v3-highlight {
        font-weight: 900;
        color: #fff;
      }

      #soro-carousel-v3 .soro-v3-indicator {
        position: absolute;
        z-index: 6;
        left: 42px;
        bottom: 24px;
        display: flex;
        gap: 8px;
      }

      #soro-carousel-v3 .soro-v3-dot {
        width: 9px;
        height: 9px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(255,255,255,.32);
        cursor: pointer;
        transition: .25s ease;
      }

      #soro-carousel-v3 .soro-v3-dot.active {
        width: 27px;
        border-radius: 99px;
        background: #fff;
      }

      #soro-carousel-v3 .soro-v3-frame::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        background: linear-gradient(90deg, rgba(0,0,0,.18), transparent 70%);
      }

      /* Bom dia */
      #soro-carousel-v3 .soro-theme-morning {
        background: linear-gradient(135deg, #5d7199 0%, #d59a75 48%, #f3d59b 100%);
      }

      #soro-carousel-v3 .soro-theme-morning .soro-sunrise {
        width: 145px;
        height: 145px;
        left: auto;
        right: 12%;
        top: 42px;
        border-radius: 50%;
        background: #ffe8a1;
        box-shadow: 0 0 75px rgba(255,225,142,.85);
        animation: soroSun 4s ease-in-out infinite alternate;
      }

      #soro-carousel-v3 .soro-theme-morning .soro-sun-rays {
        inset: auto -10% -65px auto;
        width: 70%;
        height: 170%;
        background: repeating-conic-gradient(from 230deg, rgba(255,239,176,.16) 0 5deg, transparent 5deg 13deg);
        transform: rotate(-10deg);
        animation: soroRays 12s linear infinite;
      }

      /* Boa tarde */
      #soro-carousel-v3 .soro-theme-afternoon {
        background: linear-gradient(135deg, #3579b5, #4db3d2 50%, #f0c56d);
      }

      #soro-carousel-v3 .soro-theme-afternoon .soro-bright-sun {
        inset: auto 9% 35px auto;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: #ffe68a;
        box-shadow: 0 0 50px rgba(255,225,108,.9), 0 0 120px rgba(255,183,59,.42);
        animation: soroSun 3.5s ease-in-out infinite alternate;
      }

      /* Boa noite */
      #soro-carousel-v3 .soro-theme-night {
        background: linear-gradient(135deg, #060b1d, #121a3c 58%, #252d5a);
      }

      #soro-carousel-v3 .soro-stars {
        background-image:
          radial-gradient(circle, rgba(255,255,255,.95) 1px, transparent 1.5px),
          radial-gradient(circle, rgba(255,255,255,.65) 1px, transparent 1.5px);
        background-size: 71px 67px, 113px 91px;
        animation: soroStars 10s linear infinite;
        opacity: .9;
      }

      #soro-carousel-v3 .soro-moon {
        inset: 34px 10% auto auto;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: #f7f1c9;
        box-shadow: 0 0 40px rgba(245,240,195,.62);
      }

      #soro-carousel-v3 .soro-meteor {
        inset: 55px auto auto 18%;
        width: 95px;
        height: 2px;
        border-radius: 99px;
        background: linear-gradient(90deg, transparent, #fff);
        transform: rotate(-28deg);
        opacity: 0;
        animation: soroMeteor 6s linear infinite;
      }

      #soro-carousel-v3 .soro-meteor.two {
        inset: 112px auto auto 49%;
        animation-delay: 3.2s;
      }

      /* Inverno */
      #soro-carousel-v3 .soro-theme-winter {
        background: linear-gradient(135deg, #17354b, #4b7f99 52%, #d9edf2);
      }

      #soro-carousel-v3 .soro-snow {
        background-image:
          radial-gradient(circle, rgba(255,255,255,.95) 1px, transparent 2px),
          radial-gradient(circle, rgba(255,255,255,.8) 2px, transparent 3px),
          radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 2px);
        background-size: 35px 35px, 65px 65px, 95px 95px;
        animation: soroSnow 9s linear infinite;
        opacity: .82;
      }

      #soro-carousel-v3 .soro-ice-line {
        inset: auto 0 0;
        height: 58px;
        background: linear-gradient(180deg, transparent, rgba(225,249,255,.42));
        border-top: 1px solid rgba(255,255,255,.35);
      }

      /* Trabalho */
      #soro-carousel-v3 .soro-theme-job {
        background: linear-gradient(135deg, #181b2c, #2a3150 55%, #3b476b);
      }

      #soro-carousel-v3 .soro-briefcase {
        inset: auto 8% 25px auto;
        width: 120px;
        height: 80px;
        border-radius: 12px;
        border: 3px solid rgba(255,255,255,.32);
        background: rgba(255,255,255,.07);
        transform: rotate(-5deg);
        box-shadow: 0 20px 50px rgba(0,0,0,.25);
      }

      #soro-carousel-v3 .soro-briefcase::before {
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

      #soro-carousel-v3 .soro-career-line {
        inset: 25px 3% auto auto;
        width: 210px;
        height: 150px;
        border-top: 1px solid rgba(255,255,255,.12);
        border-right: 1px solid rgba(255,255,255,.12);
        transform: skewY(-18deg);
      }

      /* Notícias */
      #soro-carousel-v3 .soro-theme-news {
        background: linear-gradient(135deg, #151922, #252e3e 55%, #10151e);
      }

      #soro-carousel-v3 .soro-news-lines {
        background: repeating-linear-gradient(0deg, transparent 0 30px, rgba(255,255,255,.025) 31px);
      }

      #soro-carousel-v3 .soro-news-orbit {
        inset: -75px -50px auto auto;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 0 0 35px rgba(255,255,255,.025), 0 0 0 70px rgba(255,255,255,.018);
      }

      /* Futurista */
      #soro-carousel-v3 .soro-theme-future {
        background: radial-gradient(circle at 75% 35%, rgba(93,102,255,.24), transparent 25%), linear-gradient(135deg, #080a16, #12172d 50%, #070a15);
        border-color: rgba(140,150,255,.3);
      }

      #soro-carousel-v3 .soro-future-grid {
        inset: -50%;
        background:
          linear-gradient(rgba(125,140,255,.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(125,140,255,.07) 1px, transparent 1px);
        background-size: 45px 45px;
        transform: perspective(500px) rotateX(58deg);
        animation: soroGrid 7s linear infinite;
      }

      #soro-carousel-v3 .soro-future-ring {
        inset: 30px 9% auto auto;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border: 1px solid rgba(148,160,255,.55);
        box-shadow: 0 0 30px rgba(99,112,255,.2), inset 0 0 25px rgba(99,112,255,.12);
        animation: soroRing 7s linear infinite;
      }

      #soro-carousel-v3 .soro-future-ring::before,
      #soro-carousel-v3 .soro-future-ring::after {
        content: "";
        position: absolute;
        inset: 16px;
        border-radius: 50%;
        border: 1px dashed rgba(180,190,255,.3);
      }

      #soro-carousel-v3 .soro-future-ring::after {
        inset: 37px;
        border-style: solid;
      }

      #soro-carousel-v3 .soro-future-code {
        inset: auto 6% 20px auto;
        font-family: monospace;
        font-size: 10px;
        letter-spacing: .15em;
        opacity: .28;
      }

      #soro-carousel-v3 .soro-v3-slide {
        animation: soroSlide .45s cubic-bezier(.2,.8,.2,1);
      }

      @keyframes soroSun { from { transform: scale(.96); } to { transform: scale(1.05); } }
      @keyframes soroRays { to { transform: rotate(10deg); } }
      @keyframes soroStars { to { transform: translateY(12px); } }
      @keyframes soroMeteor {
        0%, 100% { opacity: 0; transform: translate(0,0) rotate(-28deg); }
        8% { opacity: 1; }
        25% { opacity: 0; transform: translate(170px,85px) rotate(-28deg); }
      }
      @keyframes soroSnow { from { transform: translateY(-35px); } to { transform: translateY(120px); } }
      @keyframes soroGrid { to { transform: perspective(500px) rotateX(58deg) translateY(45px); } }
      @keyframes soroRing { to { transform: rotate(360deg); } }
      @keyframes soroSlide { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }

      @media (max-width: 700px) {
        #soro-carousel-v3 .soro-v3-frame,
        #soro-carousel-v3 .soro-v3-content { min-height: 285px; }
        #soro-carousel-v3 .soro-v3-content { padding: 28px 22px 62px; }
        #soro-carousel-v3 .soro-v3-indicator { left: 22px; }
        #soro-carousel-v3 .soro-v3-time { display: none; }
        #soro-carousel-v3 .soro-briefcase,
        #soro-carousel-v3 .soro-future-ring { opacity: .35; }
      }
    `;
    document.head.appendChild(style);
  }

  function getBackground(type) {
    const map = {
      morning: '<div class="soro-sun-rays"></div><div class="soro-sunrise"></div>',
      afternoon: '<div class="soro-bright-sun"></div>',
      night: '<div class="soro-stars"></div><div class="soro-moon"></div><div class="soro-meteor"></div><div class="soro-meteor two"></div>',
      winter: '<div class="soro-snow"></div><div class="soro-ice-line"></div>',
      job: '<div class="soro-career-line"></div><div class="soro-briefcase"></div>',
      news: '<div class="soro-news-lines"></div><div class="soro-news-orbit"></div>',
      future: '<div class="soro-future-grid"></div><div class="soro-future-ring"></div><div class="soro-future-code">SOROKIBA // SYSTEM ONLINE</div>'
    };
    return map[type] || '';
  }

  function buildMessages(user, news) {
    const firstName = escapeHTML((user?.name || 'Cidadão').trim().split(/\s+/)[0]);
    const job = escapeHTML(user?.jobName || 'Cidadão');
    const latestNews = news[0];

    return [
      {
        type: 'morning',
        category: 'SOROKIBA • BOM DIA',
        title: 'Bom dia, ' + firstName + '!',
        message: 'O sol nasceu. A cidade está acordando e um novo dia começa para você em Sorokiba.'
      },
      {
        type: 'afternoon',
        category: 'SOROKIBA • BOA TARDE',
        title: 'Boa tarde, ' + firstName + '!',
        message: 'Sorokiba está em movimento. Aproveite a tarde para trabalhar, explorar e cuidar do seu cidadão.'
      },
      {
        type: 'night',
        category: 'SOROKIBA • BOA NOITE',
        title: 'Boa noite, ' + firstName + '!',
        message: 'A cidade desacelera sob o céu estrelado. Talvez uma nova oportunidade apareça quando você menos esperar.'
      },
      {
        type: 'winter',
        category: 'SOROKIBA • INVERNO',
        title: 'O inverno chegou.',
        message: 'O frio muda a atmosfera da cidade. A neve cai sobre Sorokiba enquanto você continua sua jornada.'
      },
      {
        type: 'job',
        category: 'SOROKIBA • TRABALHO',
        title: 'Sua carreira continua.',
        message: 'Sua profissão atual é <span class="soro-v3-highlight">' + job + '</span>. Continue avançando e construa sua carreira em Sorokiba.'
      },
      {
        type: 'news',
        category: 'SOROKIBA • NOTÍCIAS',
        title: latestNews?.title ? escapeHTML(latestNews.title) : 'Notícias da cidade.',
        message: latestNews?.body
          ? escapeHTML(latestNews.body).slice(0, 230) + (String(latestNews.body).length > 230 ? '…' : '')
          : 'Acompanhe os acontecimentos e fique por dentro do que está acontecendo em Sorokiba.'
      },
      {
        type: 'future',
        category: 'SOROKIBA • ÚLTIMA MENSAGEM',
        title: 'O futuro de Sorokiba começa agora.',
        message: 'Novidades, eventos e novas oportunidades podem aparecer a qualquer momento. Fique atento.'
      }
    ];
  }

  function create(host, user, news) {
    if (!host) return false;

    installStyles();

    host.querySelectorAll('.hero, .soro-home-carousel, #soro-carousel-v3').forEach(node => node.remove());

    const messages = buildMessages(user, news);
    let current = 0;
    let timer = null;

    const root = document.createElement('section');
    root.id = ID;
    root.setAttribute('aria-label', 'Carrossel de mensagens de Sorokiba');

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
        <div class="soro-v3-indicator" aria-label="Navegação das mensagens"></div>
      </div>
    `;

    host.prepend(root);

    const frame = $('.soro-v3-frame', root);
    const background = $('.soro-v3-background', root);
    const category = $('.soro-v3-category', root);
    const time = $('.soro-v3-time', root);
    const title = $('.soro-v3-title', root);
    const message = $('.soro-v3-message', root);
    const indicator = $('.soro-v3-indicator', root);

    function draw() {
      const item = messages[current];

      frame.className = 'soro-v3-frame soro-theme-' + item.type;
      background.innerHTML = getBackground(item.type);
      category.innerHTML = item.category;

      const now = new Date();
      time.textContent = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      title.innerHTML = item.title;
      message.innerHTML = item.message;

      title.classList.remove('soro-v3-slide');
      message.classList.remove('soro-v3-slide');
      void title.offsetWidth;
      title.classList.add('soro-v3-slide');
      message.classList.add('soro-v3-slide');

      indicator.innerHTML = messages.map((_, index) => `
        <button
          type="button"
          class="soro-v3-dot ${index === current ? 'active' : ''}"
          data-index="${index}"
          aria-label="Mensagem ${index + 1}"
          aria-current="${index === current ? 'true' : 'false'}"
        ></button>
      `).join('');

      indicator.querySelectorAll('.soro-v3-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          current = Number(dot.dataset.index);
          draw();
          restart();
        });
      });
    }

    function next() {
      current = (current + 1) % messages.length;
      draw();
    }

    function restart() {
      clearInterval(timer);
      timer = setInterval(next, 6500);
    }

    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', restart);

    draw();
    restart();

    root.dataset.version = 'v3';
    root.dataset.design = 'planned-neon';
    return true;
  }

  async function start() {
    const host = document.querySelector('#content');
    if (!host) return false;
    if (document.getElementById(ID)) return true;

    const user = await getUser();
    const news = await getNews();
    return create(host, user, news);
  }

  function watch() {
    installStyles();

    const observer = new MutationObserver(() => {
      if (!document.getElementById(ID)) start();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    start();

    window.SorokibaCarouselV3 = {
      refresh: start
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch, { once: true });
  } else {
    watch();
  }
})();
