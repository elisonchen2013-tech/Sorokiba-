(function(){'use strict';if(window.__kibaLoaded)return;window.__kibaLoaded=true;
var S=document.createElement('style');S.textContent=`#kibaBtn{position:fixed;right:22px;bottom:22px;width:72px;height:72px;z-index:99990;border:2px solid #d7a74b;border-radius:50%;background:#0b1420;box-shadow:0 8px 28px #000b,0 0 0 5px #d7a74b18;cursor:pointer;padding:3px;animation:kibaFloat 2s ease-in-out infinite}.kibaSvg{width:100%;height:100%;overflow:visible}#kibaChat{position:fixed;right:22px;bottom:108px;width:410px;height:590px;z-index:99989;background:linear-gradient(180deg,#09121d,#07101a);border:1px solid #d7a74b66;border-radius:24px;display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(18px) scale(.97);transition:.28s cubic-bezier(.2,.8,.2,1);box-shadow:0 24px 70px #000c,0 0 35px #d7a74b12}#kibaChat.open{opacity:1;pointer-events:auto;transform:none}.kh{display:flex;align-items:center;padding:12px 14px;border-bottom:1px solid #ffffff12;background:linear-gradient(180deg,#0f1c2b,#0b1622);color:#fff}.ka{width:46px;height:46px;margin-right:10px}.kh small{display:block;color:#8d9aaa;font-size:10px;margin-top:3px}.kh .kstatus{margin-left:10px;padding:4px 7px;border-radius:99px;background:#44d19a16;color:#64dbac;font-size:8px;font-weight:800;letter-spacing:.08em}.kc{margin-left:auto;background:none;border:0;color:#7d8b9b;font-size:28px;cursor:pointer}.km{flex:1;overflow:auto;padding:16px 15px 9px;scroll-behavior:smooth}.msg{padding:11px 13px;margin:8px 0;border-radius:15px;max-width:86%;font:14px Inter,Arial,sans-serif;line-height:1.5;animation:kibaMsgIn .2s ease}.bot{background:linear-gradient(145deg,#172637,#132131);color:#edf3f8;border:1px solid #ffffff09}.usr{background:linear-gradient(145deg,#d7a74b,#c28d2d);color:#10151d;margin-left:auto}.typing{width:92%;max-width:340px;background:#101d2a;color:#aebaca;border:1px solid #ffffff0b}.kibaThinking{display:flex;align-items:center;gap:10px}.kibaThinkingDot{width:8px;height:8px;border-radius:50%;background:#d7a74b;box-shadow:0 0 12px #d7a74b88;animation:kibaThinkDot 1.05s infinite ease-in-out}.kibaThinkingDot:nth-child(2){animation-delay:.15s}.kibaThinkingDot:nth-child(3){animation-delay:.3s}.kibaThinkText{font-size:12px}.kibaThinkSub{margin-top:3px;font-size:9px;color:#748399}.kibaResearch{margin-top:9px;padding:9px 10px;border-radius:12px;background:#0a1520;border:1px solid #ffffff0b}.kibaResearchHead{display:flex;justify-content:space-between;gap:8px;color:#8e9caf;font-size:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:800}.kibaResearchList{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.kibaChip{padding:5px 7px;border-radius:99px;background:#d7a74b0e;border:1px solid #d7a74b25;color:#d6bf8a;font-size:9px}.kibaResearchPlan{margin-top:7px;color:#718096;font-size:9px;line-height:1.45}.msgMeta{font-size:9px;color:#718197;margin-top:7px;padding-top:6px;border-top:1px solid #ffffff09}.kq{display:flex;gap:6px;flex-wrap:wrap;padding:2px 12px 10px}.kq button{border:1px solid #d7a74b45;background:#d7a74b09;color:#ddc58c;border-radius:20px;padding:7px 10px;font-size:10px;cursor:pointer;transition:.2s}.kq button:hover{background:#d7a74b17;transform:translateY(-1px)}.kf{display:flex;padding:11px;border-top:1px solid #ffffff12;background:#0a1520}.kf input{flex:1;background:#101c29;color:#fff;border:1px solid #ffffff14;border-radius:12px;padding:12px;font-size:14px;outline:none}.kf input:focus{border-color:#d7a74b66;box-shadow:0 0 0 3px #d7a74b0b}.kf button{margin-left:7px;width:46px;background:linear-gradient(145deg,#d7a74b,#c38d2f);border:0;border-radius:12px;font-size:20px;cursor:pointer}.kf button:disabled{opacity:.45;cursor:default}@keyframes kibaMsgIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}@keyframes kibaThinkDot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-5px);opacity:1}}@media(max-width:700px){#kibaChat{right:12px;bottom:98px;width:calc(100vw - 24px);height:68vh;max-height:650px}.kh{padding:10px}.km{padding:13px 11px 7px}}
#kibaArrival{position:fixed;inset:0;z-index:99980;pointer-events:none;overflow:hidden}.kibaWalker{position:absolute;left:-130px;bottom:14%;width:112px;height:156px;animation:kibaCrawl 5.5s cubic-bezier(.18,.7,.22,1) forwards;filter:drop-shadow(0 8px 8px #0008)}.kibaWalker .crawlL{transform-origin:45px 125px;animation:crawlL .38s ease-in-out infinite}.kibaWalker .crawlR{transform-origin:73px 125px;animation:crawlR .38s ease-in-out infinite}.kibaWalker .pawL{transform-origin:37px 94px;animation:pawL .38s ease-in-out infinite}.kibaWalker .pawR{transform-origin:79px 94px;animation:pawR .38s ease-in-out infinite}.kibaWalker .tail{transform-origin:88px 105px;animation:tailWiggle .75s ease-in-out infinite}.kibaWalker .eyes{animation:blink 4s ease-in-out infinite}.kibaWalker .headTurn{animation:turnHead .8s ease 4.9s forwards;transform-origin:57px 48px}.kibaWalker .bodyLift{animation:standUp .9s ease 4.9s forwards;transform-origin:56px 105px}.kibaTalk{position:absolute;left:50%;top:18%;transform:translate(-50%,10px) scale(.96);width:min(520px,calc(100vw - 38px));padding:16px 20px;background:#101b2aee;border:1px solid #d7a74b99;border-radius:18px;box-shadow:0 15px 45px #0009;color:#eef2f7;opacity:0;animation:kibaTalkIn .6s ease 5.7s forwards}.kibaTalk strong{display:block;color:#d7a74b;font-size:16px;margin-bottom:6px}.kibaTalk p{margin:5px 0;line-height:1.45;font-size:14px}.kibaTalk button{pointer-events:auto;margin-top:9px;background:#d7a74b;border:0;border-radius:10px;padding:8px 15px;font-weight:800;cursor:pointer}.kibaShadow{position:absolute;bottom:13.5%;left:50%;width:95px;height:15px;transform:translateX(-50%);background:#0007;filter:blur(6px);border-radius:50%;opacity:0;animation:shadowIn .5s ease 4.4s forwards}.kibaDust{position:absolute;left:calc(50% - 48px);bottom:16%;width:100px;height:35px;opacity:0;animation:dustIn .8s ease 4.4s forwards}.kibaDust:before,.kibaDust:after{content:'';position:absolute;border-radius:50%;background:#c9b38a55;filter:blur(3px)}.kibaDust:before{width:20px;height:9px;left:5px;bottom:2px}.kibaDust:after{width:14px;height:7px;right:9px;bottom:8px}@keyframes kibaCrawl{0%{left:-130px;transform:translateY(0) scale(.82)}18%{transform:translateY(5px) scale(.84)}36%{transform:translateY(0) scale(.86)}54%{transform:translateY(5px) scale(.88)}72%{transform:translateY(0) scale(.9)}100%{left:calc(50% - 56px);transform:translateY(0) scale(.92)}}@keyframes crawlL{0%,100%{transform:rotate(17deg) translateY(0)}50%{transform:rotate(-18deg) translateY(2px)}}@keyframes crawlR{0%,100%{transform:rotate(-18deg) translateY(2px)}50%{transform:rotate(17deg) translateY(0)}}@keyframes pawL{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(25deg)}}@keyframes pawR{0%,100%{transform:rotate(25deg)}50%{transform:rotate(-20deg)}}@keyframes tailWiggle{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(10deg)}}@keyframes blink{0%,45%,100%{opacity:1}48%{opacity:.05}}@keyframes turnHead{0%{transform:rotate(0)}100%{transform:rotate(-4deg)}}@keyframes standUp{0%{transform:rotate(0) translateY(0)}45%{transform:rotate(-7deg) translateY(-7px)}100%{transform:rotate(0) translateY(-11px)}}@keyframes kibaTalkIn{to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes shadowIn{to{opacity:1}}@keyframes dustIn{0%{opacity:0;transform:scale(.4)}50%{opacity:.8;transform:scale(1.2)}100%{opacity:0;transform:scale(1.5)}}@keyframes kibaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)} }@media(max-width:700px){#kibaChat{right:12px;bottom:98px;width:calc(100vw - 24px);height:65vh}.kibaWalker{bottom:16%;width:96px;height:134px}.kibaTalk{top:9%;padding:14px;font-size:13px}}
`;document.head.appendChild(S);
function svg(){return '<svg class="kibaSvg" viewBox="0 0 112 156" aria-label="Kiba, ornitorrinco mascote de Sorokiba"><g class="tail"><path d="M79 101c18 1 29 7 29 17-1 12-18 18-31 10-7-4-10-10-8-17 3-7 5-9 10-10z" fill="#5a372a" stroke="#211611" stroke-width="3.5"/><path d="M83 106c13 3 19 8 18 13-1 5-8 7-14 5" fill="none" stroke="#85513a" stroke-width="3" stroke-linecap="round"/></g><g class="crawlL"><path d="M39 119c-5 10-8 20-5 27 3 6 10 7 16 3l-3-8 0-22z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M32 145c7 3 13 3 20 0-2 7-14 9-21 4z" fill="#d99a3d" stroke="#241712" stroke-width="2"/></g><g class="crawlR"><path d="M68 119c4 10 8 20 5 27-3 6-10 7-16 3l3-8 0-22z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M54 148c7 3 14 2 20-2-2 7-14 9-21 4z" fill="#d99a3d" stroke="#241712" stroke-width="2"/></g><g class="bodyLift"><path d="M31 68c-7 12-9 33-5 48 5 20 21 29 39 27 20-2 30-16 28-36-2-18-9-32-21-39-14-8-32-8-41 0z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M43 77c-4 16-2 35 5 49 9 7 18 7 27-2 5-14 3-31-4-44-8-5-20-7-28-3z" fill="#e5c49e" stroke="#241712" stroke-width="2"/><path d="M36 75c10 7 27 9 38 1l-3 13c-11 6-24 5-35-1z" fill="#151a20"/><path d="M47 79h11l6 7-12 7-11-7z" fill="#d7a74b"/></g><g class="pawL"><path d="M33 78c-12 5-20 13-23 23 8 2 17-1 24-8l7-10z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M11 100c-4 2-7 4-9 7 6 2 12 1 16-2" fill="none" stroke="#d99a3d" stroke-width="3" stroke-linecap="round"/></g><g class="pawR"><path d="M75 78c12 5 19 13 22 23-8 2-17-1-24-8l-6-10z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M94 100c4 2 7 4 9 7-6 2-12 1-16-2" fill="none" stroke="#d99a3d" stroke-width="3" stroke-linecap="round"/></g><g class="headTurn"><path d="M31 60c-8-12-7-27 1-37C40 12 56 7 70 12c14 5 23 18 21 32-2 14-12 23-27 27-14 3-27-1-33-11z" fill="#805039" stroke="#241712" stroke-width="3.5"/><path d="M37 43c3-12 12-21 23-25 9-3 19-2 26 2-11 3-18 9-21 18-4 10 0 19 7 25-16 2-29-6-35-20z" fill="#9c6447" opacity=".55"/><g class="eyes"><ellipse cx="49" cy="36" rx="6" ry="8" fill="#151318"/><ellipse cx="74" cy="36" rx="6" ry="8" fill="#151318"/><circle cx="51" cy="34" r="2.4" fill="#fff"/><circle cx="76" cy="34" r="2.4" fill="#fff"/></g><path d="M42 50c10-5 28-5 38 0 2 7-3 12-10 14-9 2-19 0-27-5-3-2-4-6-1-9z" fill="#c98534" stroke="#241712" stroke-width="3"/><path d="M46 53c9-3 21-3 30 0" fill="none" stroke="#8a4e22" stroke-width="2"/><circle cx="51" cy="59" r="1.5" fill="#f7c76d"/><circle cx="70" cy="59" r="1.5" fill="#f7c76d"/></g></svg>'}
function add(t,c){var m=document.getElementById('kibaMsgs');if(!m)return;var e=document.createElement('div');e.className='msg '+(c||'bot');e.textContent=t;m.appendChild(e);m.scrollTop=m.scrollHeight}
var USER=null;
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9? ]/g,' ').replace(/\s+/g,' ').trim()}
var KIBA_RECENT=[];
function fresh(list){
  var options=list.filter(function(x){return KIBA_RECENT.indexOf(x)<0});
  var pool=options.length?options:list;
  var out=pool[Math.floor(Math.random()*pool.length)];
  KIBA_RECENT.push(out);
  if(KIBA_RECENT.length>8)KIBA_RECENT.shift();
  return out;
}
function answer(t){
  var q=norm(t);
  if(!q)return fresh(['Pode perguntar. Estou ouvindo.','Pode mandar sua dúvida.','Estou aqui. O que você quer saber?']);

  if(/^(oi|ola|e ai|hey|hello|bom dia|boa tarde|boa noite)\b/.test(q))
    return fresh(['Oi! Sou o Kiba. O que você quer descobrir em Sorokiba?','Olá! Estou pronto para ajudar. Pode perguntar sobre a cidade, seu progresso ou os sistemas do jogo.','Oi! Pode mandar sua pergunta. Vou tentar entender o contexto.']);

  if(q.indexOf('quem e voce')>=0||q.indexOf('quem e kiba')>=0||q.indexOf('o que e kiba')>=0||q.indexOf('ornitorrinco')>=0)
    return fresh(['Eu sou o Kiba, o ornitorrinco e mascote de Sorokiba. Meu trabalho é ajudar você a entender a cidade.','Sou o Kiba! Fico dentro de Sorokiba para explicar sistemas, informações da cidade e seu progresso.']);

  if(q.indexOf('xp')>=0||q.indexOf('experiencia')>=0){
    var xp=USER&&Number(USER.xp);
    if(Number.isFinite(xp))return fresh(['Você está com '+xp+' XP agora.','Seu XP atual é '+xp+'. Ele participa da sua progressão em Sorokiba.','Conferi seu perfil: você tem '+xp+' XP.']);
    return fresh(['XP é usado na progressão de Sorokiba.','Você ganha XP por atividades do jogo, como missões e progressão profissional.']);
  }

  if(q.indexOf('missao')>=0||q.indexOf('missoes')>=0)
    return fresh(['Missões são atividades que podem dar XP e dinheiro. Abra a página Missoes para ver as disponíveis.','Para começar uma missão, entre em Missoes, escolha uma disponível e siga as instruções.','As missões fazem parte da progressão da cidade e podem dar recompensas.']);

  if(q.indexOf('emprego')>=0||q.indexOf('trabalho')>=0||q.indexOf('profissao')>=0||q.indexOf('carreira')>=0)
    return fresh(['Na área de Emprego você acompanha sua carreira e as oportunidades disponíveis.','Os empregos têm progressão própria. Diga o nome da profissão se quiser uma explicação mais específica.']);

  if(q.indexOf('banco')>=0||q.indexOf('saldo')>=0||q.indexOf('dinheiro')>=0||q.indexOf('moeda')>=0){
    var money=USER&&Number(USER.money);
    if(Number.isFinite(money))return fresh(['Seu saldo registrado agora é '+money+'.','Conferi seu perfil: seu saldo atual é '+money+'.','Você tem '+money+' de saldo registrado.']);
    return fresh(['No Banco você acompanha seu saldo e suas movimentações.','O Banco é o lugar para consultar e movimentar seu dinheiro em Sorokiba.']);
  }

  if(q.indexOf('cidade')>=0||q.indexOf('sorokiba')>=0)
    return fresh(['Sorokiba é uma cidade virtual com missões, empregos, banco, notícias e sistemas de progressão.','A cidade reúne vários sistemas de jogo. Posso explicar qualquer um deles.']);

  if(q.indexOf('ajuda')>=0||q.indexOf('bug')>=0||q.indexOf('problema')>=0||q.indexOf('erro')>=0)
    return fresh(['Claro. Me conte o que aconteceu e em qual página você estava.','Posso ajudar a investigar. Diga o que você tentou fazer e o que aconteceu.']);

  if(q.indexOf('como')>=0&&q.indexOf('miss')>=0)
    return fresh(['Abra Missoes, escolha uma missão disponível e siga as instruções.','Para começar, entre na página Missoes e escolha uma atividade disponível.']);

  return fresh([
    'Ainda não encontrei essa informação na memória de Sorokiba. Se você explicar um pouco mais, posso tentar relacionar sua pergunta a outro sistema.',
    'Essa pergunta não bateu com uma informação que conheço ainda. Tente explicar com outras palavras.',
    'Não quero inventar uma resposta. Essa informação ainda não está registrada na minha memória.'
  ]);
}

function mount(){
  if(document.getElementById('kibaBtn'))return;
  var b=document.createElement('button');b.id='kibaBtn';b.title='Falar com Kiba';b.innerHTML=svg();document.body.appendChild(b);
  var c=document.createElement('section');c.id='kibaChat';
  c.innerHTML='<header class="kh"><div class="ka">'+svg()+'</div><div><b>Kiba</b><small>IA própria • Assistente de Sorokiba</small></div><span class="kstatus">ONLINE</span><button type="button" class="khead-action" id="kibaNewChat" title="Nova conversa">＋</button><button class="kc" title="Fechar">×</button></header><div class="km" id="kibaMsgs"></div><div class="kibaComposerHint">Kiba usa os dados internos de Sorokiba para responder.</div><div class="kq"><button>Quanto XP eu tenho?</button><button>Como funcionam as missões?</button><button>Quem é Kiba?</button><button>Como funciona o banco?</button></div><form class="kf"><input maxlength="300" placeholder="Pergunte sobre Sorokiba..."><button>→</button></form>';
  document.body.appendChild(c);
  b.onclick=function(){c.classList.add('open');if(!document.getElementById('kibaMsgs').children.length){var w=document.createElement('div');w.className='kibaWelcome';w.innerHTML='<h3>Olá! 👋</h3><p>Sou o Kiba. Posso consultar os sistemas de Sorokiba, cruzar informações e responder com os dados atuais do jogo.</p>';document.getElementById('kibaMsgs').appendChild(w);add(fresh(['O que você quer descobrir em Sorokiba?','Pode perguntar sobre a cidade, seu cidadão ou qualquer sistema do jogo.']));}};
  c.querySelector('.kc').onclick=function(){c.classList.remove('open')};var nc=c.querySelector('#kibaNewChat');if(nc)nc.onclick=function(){document.getElementById('kibaMsgs').innerHTML='';var w=document.createElement('div');w.className='kibaWelcome';w.innerHTML='<h3>Nova conversa</h3><p>O histórico visual foi limpo. A memória persistente continua disponível quando for relevante.</p>';document.getElementById('kibaMsgs').appendChild(w);};
    function esc(value){
  return String(value==null?'':value).replace(/[&<>"]/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];
  });
}
function getVisibleConversation(){
  var rows=[],nodes=document.querySelectorAll('#kibaMsgs .msg');
  Array.prototype.slice.call(nodes,-12).forEach(function(node){
    var role=node.classList.contains('usr')?'user':'assistant';
    var text=node.textContent||'';
    if(text)rows.push({role:role,content:text.slice(0,500)});
  });
  return rows;
}
function startThought(){
  var el=document.createElement('div');
  el.className='kibaThinkRow';
  el.innerHTML='<div class="kibaThinkOrb">'+svg()+'</div><div class="kibaThinkBody"><div class="kibaThinkTitle">Kiba está pensando</div><div class="kibaThinkLine"><span class="kibaThinkDots"><i></i><i></i><i></i></span><span id="kibaThinkState">Entendendo a pergunta</span><span>·</span><span class="kibaThinkTimer">0,0 s</span></div></div>';
  var msgs=document.getElementById('kibaMsgs');msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;
  var started=performance.now();
  var states=['Entendendo a pergunta','Selecionando informações','Consultando Sorokiba','Comparando dados','Verificando resultados'];
  var index=0;
  var timer=setInterval(function(){
    index=Math.min(states.length-1,index+1);
    var state=el.querySelector('#kibaThinkState');var clock=el.querySelector('.kibaThinkTimer');
    if(state)state.textContent=states[index];
    if(clock)clock.textContent=((performance.now()-started)/1000).toFixed(1).replace('.',',')+' s';
    msgs.scrollTop=msgs.scrollHeight;
  },520);
  return {el:el,timer:timer,started:started};
}
function finishThought(thought,data){
  clearInterval(thought.timer);
  var elapsed=Number(data.elapsedMs)||Math.round(performance.now()-thought.started);
  if(thought.el&&thought.el.parentNode)thought.el.remove();
  var row=document.createElement('div');
  row.className='kibaThoughtDone';
  var sources=Array.isArray(data.searched)?data.searched:[];
  row.innerHTML='<span>✓ Pensou por '+((elapsed/1000).toFixed(2))+' s</span><span>·</span><button type="button">Ver pesquisa</button>';
  var next=row.nextElementSibling;
  var body=document.createElement('div');
  body.style.display='none';
  body.className='kibaResearch';
  var chips=sources.map(function(s){
    return '<button type="button" class="kibaSource" title="'+esc(String(s.detail||''))+'">✓ '+esc(String(s.name||'Dados internos'))+'</button>';
  }).join('');
  var agents=Array.isArray(data.agents)?data.agents:[];
  var agentText=agents.slice(0,6).map(function(a){return '<div style="margin-top:5px;font-size:9px;color:#8995a5">✓ <b>'+esc(String(a.agent||'Agente'))+'</b> — '+esc(String(a.reason||''))+'</div>';}).join('');
  var plan=Array.isArray(data.researchPlan)?data.researchPlan:[];
  body.innerHTML='<div class="kibaResearchBody"><div class="kibaResearchTitle">Fontes consultadas</div><div class="kibaResearchList">'+(chips||'<span class="kibaChip">Dados internos de Sorokiba</span>')+'</div>'+(agentText?'<div class="kibaResearchTitle" style="margin-top:10px">Pesquisa</div>'+agentText:'')+(plan.length?'<div class="kibaResearchTitle" style="margin-top:10px">Resumo</div><div class="kibaResearchPlan">'+esc(plan.join(' → '))+'</div>':'')+'</div>';
  row.querySelector('button').onclick=function(){
    var open=body.style.display!=='none';body.style.display=open?'none':'block';this.textContent=open?'Ver pesquisa':'Ocultar pesquisa';
    var msgs=document.getElementById('kibaMsgs');msgs.scrollTop=msgs.scrollHeight;
  };
  var msgs=document.getElementById('kibaMsgs');
  msgs.appendChild(row);msgs.appendChild(body);msgs.scrollTop=msgs.scrollHeight;
}
async function send(t){
  if(!t)return;
  var input=c.querySelector('.kf input'),submit=c.querySelector('.kf button');
  var msgs=document.getElementById('kibaMsgs');
  if(input)input.disabled=true;if(submit)submit.disabled=true;
  add(t,'usr');
  var thought=startThought();
  var started=performance.now();
  try{
    var token=localStorage.getItem('sorokiba_token')||'';
    var response=await fetch('/api/kiba/ask',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({
        question:t,
        currentPage:window.currentPage||window.sorokibaCurrentPage||'city',
        conversation:getVisibleConversation()
      })
    });
    var data=await response.json().catch(function(){return{}});
    if(!response.ok)throw new Error(data.error||'Não consegui consultar a cidade.');
    finishThought(thought,data);
    add(data.answer||'Não encontrei uma resposta.');
    var last=msgs.lastElementChild;
    if(last){
      last.classList.add('kibaAnswer');
      var memoryCount=Number(data.memoryCount)||0;
      var footer=document.createElement('div');footer.className='kibaMsgFooter';
      footer.innerHTML='<span>🧠 Kiba próprio · '+(((Number(data.elapsedMs)||Math.round(performance.now()-started))/1000).toFixed(2))+' s</span>'+(memoryCount?'<span>· memória '+memoryCount+'</span>':'');
      var copy=document.createElement('button');copy.className='kibaCopy';copy.textContent='Copiar';
      copy.onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(data.answer||'').then(function(){copy.textContent='Copiado'}).catch(function(){});};
      footer.appendChild(copy);last.appendChild(footer);msgs.scrollTop=msgs.scrollHeight;
    }
  }catch(err){
    finishThought(thought,{elapsedMs:Math.round(performance.now()-started),searched:[],agents:[{agent:'Consulta interna',reason:'A consulta terminou com erro.'}]});
    add('Não consegui consultar os dados de Sorokiba agora: '+String(err.message||err));
  }finally{
    if(input)input.disabled=false;if(submit)submit.disabled=false;if(input)input.focus();
  }
}
c.querySelectorAll('.kq button').forEach(function(x){x.onclick=function(){send(x.textContent)}});
  c.querySelector('form').onsubmit=function(e){e.preventDefault();var i=c.querySelector('input'),t=i.value.trim();i.value='';send(t)};
}
function arrival(){
  var account=String((USER&&USER.username)||'citizen');
  var key='sorokiba_kiba_intro_20260930_'+account;
  if(localStorage.getItem(key))return;
  localStorage.setItem(key,'1');
  if(document.getElementById('kibaArrival'))return;
  var wrap=document.createElement('div');wrap.id='kibaArrival';
  wrap.innerHTML='<div class="kibaShadow"></div><div class="kibaDust"></div><div class="kibaWalker">'+svg()+'</div><div class="kibaTalk"><strong>🐾 Kiba chegou!</strong><p>Olá! Eu sou o Kiba, o mascote de Sorokiba. Estou aqui para ajudar você a entender a cidade e seus sistemas.</p><button type="button">Continuar</button></div>';
  document.body.appendChild(wrap);
  var btn=wrap.querySelector('button');if(btn)btn.onclick=function(){wrap.remove()};
  setTimeout(function(){if(wrap.parentNode)wrap.remove()},9000);
}
function start(){
  var g=document.getElementById('gameView');
  if(!g||g.classList.contains('hidden'))return;
  mount();
  if(localStorage.getItem('sorokiba_token'))arrival();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('sorokiba:game-ready',start);
window.sorokibaKiba={open:function(){var c=document.getElementById('kibaChat');if(c)c.classList.add('open')},setUser:function(user){USER=user||null},start:start};
})();