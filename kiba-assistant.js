/* Kiba — mascote oficial de Sorokiba. Primeira versão do personagem/assistente. */
(function(){
  'use strict';
  if(window.__sorokibaKibaLoaded)return;
  window.__sorokibaKibaLoaded=true;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function kibaSvg(cls=''){
    return `<svg class="kiba-svg ${cls}" viewBox="0 0 180 180" aria-hidden="true">
      <defs><linearGradient id="kibaFur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b6045"/><stop offset="1" stop-color="#5d3428"/></linearGradient><linearGradient id="kibaCream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d2b5"/><stop offset="1" stop-color="#c99e7e"/></linearGradient></defs>
      <ellipse cx="91" cy="157" rx="54" ry="11" fill="rgba(0,0,0,.2)"/>
      <path d="M48 128 C25 142 15 147 7 142 C18 129 30 113 48 103Z" fill="#57352c" stroke="#3a2420" stroke-width="4"/>
      <path d="M58 58 C47 43 53 22 70 14 C88 5 116 14 126 32 C136 49 129 70 115 82 C103 92 72 88 58 58Z" fill="url(#kibaFur)" stroke="#3a2420" stroke-width="4"/>
      <path d="M72 59 C72 48 81 43 93 45 C103 47 111 53 112 61 C109 72 96 79 84 76 C77 73 73 67 72 59Z" fill="#282326"/>
      <ellipse cx="84" cy="39" rx="7" ry="9" fill="#171416"/><ellipse cx="110" cy="40" rx="7" ry="9" fill="#171416"/><circle cx="82" cy="36" r="2.5" fill="#fff"/><circle cx="108" cy="37" r="2.5" fill="#fff"/>
      <path d="M81 61 C91 57 103 57 113 62 C106 71 94 74 84 70Z" fill="#e8d5c2" opacity=".85"/>
      <path d="M57 79 C48 91 43 112 49 133 C56 151 77 160 99 158 C120 156 133 142 132 121 C132 101 124 86 113 77 C99 67 70 68 57 79Z" fill="url(#kibaFur)" stroke="#3a2420" stroke-width="4"/>
      <path d="M68 84 C65 104 68 128 78 151 C91 157 105 154 114 145 C119 128 116 104 108 84 C98 79 79 79 68 84Z" fill="url(#kibaCream)"/>
      <path d="M54 103 C40 111 37 127 47 136 C54 142 63 136 66 126 C66 116 62 108 54 103Z" fill="#704334" stroke="#3a2420" stroke-width="3"/><path d="M119 102 C133 111 137 126 128 136 C121 142 112 136 109 126 C109 116 112 108 119 102Z" fill="#704334" stroke="#3a2420" stroke-width="3"/>
      <path d="M64 89 C78 98 101 99 118 88 L113 106 C98 114 78 113 67 105Z" fill="#151b23" stroke="#090d12" stroke-width="3"/><path d="M84 93 L96 93 L102 102 L90 109 L78 102Z" fill="#d7a74b"/>
      <rect x="84" y="150" width="12" height="9" rx="4" fill="#4a2b24"/><rect x="105" y="149" width="12" height="9" rx="4" fill="#4a2b24"/>
      <path d="M50 113 C31 119 22 128 18 139 C31 139 46 133 57 123Z" fill="#674034" stroke="#3a2420" stroke-width="3"/>
    </svg>`;
  }

  function styles(){
    if(document.getElementById('kiba-assistant-style'))return;
    const s=document.createElement('style');s.id='kiba-assistant-style';s.textContent=`
      #kibaIntro{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 42%,rgba(214,167,75,.13),transparent 34%),rgba(6,10,17,.9);backdrop-filter:blur(14px);animation:kibaFade .45s ease}.kiba-intro-card{width:min(900px,96vw);min-height:470px;display:grid;grid-template-columns:320px 1fr;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:linear-gradient(135deg,#121a27,#0b111c);box-shadow:0 35px 100px rgba(0,0,0,.5)}.kiba-intro-art{position:relative;display:flex;align-items:flex-end;justify-content:center;padding:25px;background:radial-gradient(circle at 50% 35%,rgba(214,167,75,.22),transparent 48%),linear-gradient(180deg,#192334,#0d131e)}.kiba-intro-art:before{content:'';position:absolute;width:210px;height:210px;border:1px solid rgba(215,167,75,.25);border-radius:50%;top:70px;animation:kibaRing 12s linear infinite}.kiba-intro-art .kiba-svg{width:285px;height:285px;position:relative;z-index:2;filter:drop-shadow(0 25px 25px rgba(0,0,0,.4));animation:kibaFloat 4s ease-in-out infinite}.kiba-intro-copy{padding:54px 54px 45px;display:flex;flex-direction:column;justify-content:center}.kiba-eyebrow{font-size:10px;font-weight:900;letter-spacing:2.4px;color:#d7a74b}.kiba-intro-copy h1{font:700 clamp(38px,5vw,62px)/1 "Space Grotesk",sans-serif;letter-spacing:-2px;margin:12px 0}.kiba-intro-copy h1 span{color:#d7a74b}.kiba-intro-copy p{color:#aeb8c8;line-height:1.7;max-width:520px;margin:0 0 18px}.kiba-fact{display:flex;gap:12px;align-items:center;padding:14px 16px;margin:8px 0 22px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035);color:#dce1ea}.kiba-fact b{color:#d7a74b}.kiba-intro-btn{align-self:flex-start;border:0;border-radius:12px;padding:13px 22px;background:#d7a74b;color:#14100a;font-weight:900;cursor:pointer;transition:.2s}.kiba-intro-btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
      #kibaLauncher{position:fixed;right:25px;bottom:25px;width:68px;height:68px;z-index:9990;border:1px solid rgba(215,167,75,.55);border-radius:50%;padding:0;background:linear-gradient(145deg,#252d3a,#101620);box-shadow:0 12px 35px rgba(0,0,0,.38),0 0 0 5px rgba(215,167,75,.06);cursor:pointer;transition:transform .22s,box-shadow .22s}.kiba-launcher-svg{width:100%;height:100%;padding:8px}.kiba-launcher-label{position:absolute;right:76px;bottom:12px;white-space:nowrap;padding:8px 11px;border-radius:9px;background:#111722;border:1px solid rgba(255,255,255,.08);color:#dce1ea;font-size:11px;font-weight:800;opacity:0;transform:translateX(6px);pointer-events:none;transition:.2s}.kiba-launcher-wrap:hover .kiba-launcher-label{opacity:1;transform:none}.kiba-launcher-wrap:hover #kibaLauncher{transform:translateY(-3px);box-shadow:0 15px 40px rgba(0,0,0,.45),0 0 0 6px rgba(215,167,75,.09)}
      #kibaChat{position:fixed;right:25px;bottom:105px;width:min(390px,calc(100vw - 30px));height:540px;z-index:9989;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(215,167,75,.28);border-radius:22px;background:#0c121c;box-shadow:0 30px 80px rgba(0,0,0,.48);opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;transition:.22s}.kiba-chat-open{opacity:1!important;transform:none!important;pointer-events:auto!important}.kiba-chat-head{display:flex;align-items:center;gap:11px;padding:13px 15px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(215,167,75,.1),transparent)}.kiba-chat-avatar{width:43px;height:43px;display:grid;place-items:center;border-radius:13px;background:#1b2431;border:1px solid rgba(215,167,75,.3);overflow:hidden}.kiba-chat-avatar .kiba-svg{width:55px;height:55px}.kiba-chat-head strong{display:block;font-size:14px}.kiba-chat-head small{display:block;color:#7f8da1;font-size:10px;margin-top:2px}.kiba-close{margin-left:auto;border:0;background:none;color:#aab4c2;font-size:24px;cursor:pointer}.kiba-messages{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}.kiba-msg{max-width:82%;padding:11px 13px;border-radius:15px;font-size:13px;line-height:1.5}.kiba-msg.kiba{align-self:flex-start;background:#172131;border:1px solid rgba(255,255,255,.06);color:#dce3ec;border-bottom-left-radius:5px}.kiba-msg.user{align-self:flex-end;background:#d7a74b;color:#17120b;border-bottom-right-radius:5px}.kiba-quick{display:flex;gap:7px;flex-wrap:wrap;padding:0 14px 12px}.kiba-quick button{border:1px solid rgba(215,167,75,.25);background:rgba(215,167,75,.07);color:#dbc58f;border-radius:999px;padding:7px 10px;font-size:10px;cursor:pointer}.kiba-chat-form{display:flex;gap:7px;padding:12px;border-top:1px solid rgba(255,255,255,.08)}.kiba-chat-form input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#111a26;color:#e9edf3;padding:11px 12px;outline:none}.kiba-chat-form input:focus{border-color:rgba(215,167,75,.5)}.kiba-chat-form button{width:42px;border:0;border-radius:11px;background:#d7a74b;color:#17120b;font-weight:900;cursor:pointer}
      @keyframes kibaFade{from{opacity:0}}@keyframes kibaFloat{50%{transform:translateY(-8px)}}@keyframes kibaRing{to{transform:rotate(360deg)}}
      @media(max-width:700px){.kiba-intro-card{grid-template-columns:1fr;min-height:auto}.kiba-intro-art{height:220px}.kiba-intro-art .kiba-svg{width:180px;height:180px}.kiba-intro-copy{padding:28px}.kiba-intro-copy h1{font-size:40px}#kibaLauncher{right:16px;bottom:16px}.kiba-launcher-label{display:none}#kibaChat{right:15px;bottom:95px;height:min(540px,calc(100vh - 115px))}}
    `;document.head.appendChild(s);
  }

  function reply(text){
    const t=String(text||'').toLowerCase();
    if(/miss(ão|oes)|tarefa|fazer/.test(t))return 'As missões são uma das formas de ganhar XP e dinheiro. Se quiser, eu posso te explicar como começar.';
    if(/xp|experi/.test(t))return 'XP ajuda você a evoluir e desbloquear oportunidades. Seu progresso aparece no topo da cidade.';
    if(/emprego|profiss|trabalh/.test(t))return 'Sua carreira muda conforme você evolui. Dá uma olhada em Emprego para ver o que já está disponível.';
    if(/banco|dinheiro|saldo|econom/.test(t))return 'O Banco cuida da sua vida financeira. E eu recomendo não gastar tudo de uma vez. Só uma recomendação.';
    if(/cidade|sorokiba|acontecendo|not[ií]cia/.test(t))return 'Sorokiba está sempre mudando. Algumas coisas você encontra nas Notícias; outras... é melhor descobrir andando pela cidade.';
    if(/quem (é|e) voc|kiba|mascote/.test(t))return 'Eu sou Kiba, o mascote de Sorokiba. Posso ajudar você a entender a cidade e, de vez em quando, contar alguma coisa que descobri por aí.';
    if(/piko|ornitorrinco/.test(t))return 'Piko? Esse assunto é complicado. Digamos apenas que ele está por perto.';
    if(/obrigad|valeu/.test(t))return 'De nada. É para isso que eu estou aqui.';
    if(/ol[aá]|oi|eai|bom dia|boa tarde|boa noite/.test(t))return 'Oi. Eu estava observando a cidade. O que você quer descobrir?';
    return 'Hmm... não tenho uma resposta para isso ainda. Mas posso conversar sobre a cidade, missões, XP, empregos, banco e o que está acontecendo em Sorokiba.';
  }

  function addMessage(text,who='kiba'){
    const box=document.getElementById('kibaMessages');if(!box)return;
    const el=document.createElement('div');el.className='kiba-msg '+who;el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight;
  }

  function mountChat(){
    if(document.getElementById('kibaLauncher'))return;
    const wrap=document.createElement('div');wrap.className='kiba-launcher-wrap';wrap.innerHTML=`<button id="kibaLauncher" aria-label="Conversar com Kiba"><span class="kiba-launcher-svg">${kibaSvg()}</span><span class="kiba-launcher-label">Conversar com Kiba</span></button>`;document.body.appendChild(wrap);
    const chat=document.createElement('section');chat.id='kibaChat';chat.innerHTML=`<header class="kiba-chat-head"><div class="kiba-chat-avatar">${kibaSvg()}</div><div><strong>Kiba</strong><small>Mascote de Sorokiba • online</small></div><button class="kiba-close" aria-label="Fechar">×</button></header><div class="kiba-messages" id="kibaMessages"></div><div class="kiba-quick"><button data-kiba="O que é Sorokiba?">Sobre a cidade</button><button data-kiba="Como ganho XP?">XP</button><button data-kiba="Quais são as missões?">Missões</button><button data-kiba="Quem é você?">Quem é Kiba?</button></div><form class="kiba-chat-form"><input id="kibaInput" maxlength="240" autocomplete="off" placeholder="Converse com Kiba..."><button aria-label="Enviar">→</button></form></section>`;document.body.appendChild(chat);
    const open=()=>{chat.classList.add('kiba-chat-open');document.getElementById('kibaInput')?.focus();if(!document.getElementById('kibaMessages').children.length)addMessage('Oi. Eu sou o Kiba. Bem-vindo a Sorokiba.');};
    document.getElementById('kibaLauncher').onclick=open;chat.querySelector('.kiba-close').onclick=()=>chat.classList.remove('kiba-chat-open');
    chat.querySelectorAll('[data-kiba]').forEach(b=>b.onclick=()=>{addMessage(b.dataset.kiba,'user');setTimeout(()=>addMessage(reply(b.dataset.kiba)),180)});
    chat.querySelector('form').onsubmit=e=>{e.preventDefault();const input=document.getElementById('kibaInput');const text=input.value.trim();if(!text)return;input.value='';addMessage(text,'user');setTimeout(()=>addMessage(reply(text)),220)};
  }

  function showIntro(){
    if(!window.me||!window.me.username)return;
    const key='sorokiba_kiba_intro_v1_'+window.me.username;
    if(localStorage.getItem(key))return;
    if(document.getElementById('kibaIntro'))return;
    const intro=document.createElement('div');intro.id='kibaIntro';intro.innerHTML=`<div class="kiba-intro-card"><div class="kiba-intro-art">${kibaSvg()}</div><div class="kiba-intro-copy"><span class="kiba-eyebrow">UMA NOVA PRESENÇA NA CIDADE</span><h1>Conheça o <span>Kiba.</span></h1><p>Kiba é o mascote oficial de Sorokiba. Ele conhece a cidade, gosta de observar o que acontece por aqui e agora pode conversar com você.</p><div class="kiba-fact"><span>◆</span><span><b>Curioso.</b> Inteligente. Brincalhão. E sempre parece saber um pouco mais do que conta.</span></div><p>Durante esta atualização, Kiba será seu companheiro dentro da cidade. No futuro, ele terá um papel ainda maior no mundo de Sorokiba.</p><button class="kiba-intro-btn">Conhecer Kiba</button></div></div>`;document.body.appendChild(intro);
    intro.querySelector('button').onclick=()=>{localStorage.setItem(key,'1');intro.style.opacity='0';setTimeout(()=>intro.remove(),350);};
  }

  function ready(){styles();mountChat();if(window.me)showIntro();}
  const wait=setInterval(()=>{if(window.me&&document.getElementById('gameView')&&!document.getElementById('gameView').classList.contains('hidden')){clearInterval(wait);ready();}},250);
  window.sorokibaKiba={open:()=>document.getElementById('kibaLauncher')?.click(),showIntro};
})();