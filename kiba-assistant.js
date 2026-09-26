(function(){'use strict';if(window.__kibaLoaded)return;window.__kibaLoaded=true;
var S=document.createElement('style');S.textContent=`#kibaBtn{position:fixed;right:22px;bottom:22px;width:72px;height:72px;z-index:99990;border:2px solid #d7a74b;border-radius:50%;background:#0b1420;box-shadow:0 8px 28px #000b,0 0 0 5px #d7a74b18;cursor:pointer;padding:3px;animation:kibaFloat 2s ease-in-out infinite}.kibaSvg{width:100%;height:100%;overflow:visible}#kibaChat{position:fixed;right:22px;bottom:108px;width:390px;height:520px;z-index:99989;background:#09121d;border:1px solid #d7a74b88;border-radius:22px;display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(18px) scale(.97);transition:.25s}#kibaChat.open{opacity:1;pointer-events:auto;transform:none}.kh{display:flex;align-items:center;padding:12px;border-bottom:1px solid #fff2;background:#0d1724;color:#fff}.ka{width:48px;height:48px;margin-right:9px}.kh small{display:block;color:#8d9aaa;font-size:11px;margin-top:2px}.kc{margin-left:auto;background:none;border:0;color:#aaa;font-size:28px;cursor:pointer}.km{flex:1;overflow:auto;padding:15px}.msg{padding:11px 13px;margin:8px 0;border-radius:14px;max-width:84%;font:14px Arial;line-height:1.5}.bot{background:#172435;color:#eee}.usr{background:#d7a74b;color:#10151d;margin-left:auto}.typing{opacity:.65;font-style:italic}.kq{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 9px}.kq button{border:1px solid #d7a74b66;background:#d7a74b10;color:#e2c98f;border-radius:20px;padding:7px 10px;font-size:11px;cursor:pointer}.kf{display:flex;padding:11px;border-top:1px solid #fff2}.kf input{flex:1;background:#111b29;color:#fff;border:1px solid #ffffff22;border-radius:10px;padding:12px;font-size:14px}.kf button{margin-left:7px;width:46px;background:#d7a74b;border:0;border-radius:10px;font-size:20px;cursor:pointer}
#kibaArrival{position:fixed;inset:0;z-index:99980;pointer-events:none;overflow:hidden}.kibaWalker{position:absolute;left:-130px;bottom:14%;width:112px;height:156px;animation:kibaCrawl 5.5s cubic-bezier(.18,.7,.22,1) forwards;filter:drop-shadow(0 8px 8px #0008)}.kibaWalker .crawlL{transform-origin:45px 125px;animation:crawlL .38s ease-in-out infinite}.kibaWalker .crawlR{transform-origin:73px 125px;animation:crawlR .38s ease-in-out infinite}.kibaWalker .pawL{transform-origin:37px 94px;animation:pawL .38s ease-in-out infinite}.kibaWalker .pawR{transform-origin:79px 94px;animation:pawR .38s ease-in-out infinite}.kibaWalker .tail{transform-origin:88px 105px;animation:tailWiggle .75s ease-in-out infinite}.kibaWalker .eyes{animation:blink 4s ease-in-out infinite}.kibaWalker .headTurn{animation:turnHead .8s ease 4.9s forwards;transform-origin:57px 48px}.kibaWalker .bodyLift{animation:standUp .9s ease 4.9s forwards;transform-origin:56px 105px}.kibaTalk{position:absolute;left:50%;top:18%;transform:translate(-50%,10px) scale(.96);width:min(520px,calc(100vw - 38px));padding:16px 20px;background:#101b2aee;border:1px solid #d7a74b99;border-radius:18px;box-shadow:0 15px 45px #0009;color:#eef2f7;opacity:0;animation:kibaTalkIn .6s ease 5.7s forwards}.kibaTalk strong{display:block;color:#d7a74b;font-size:16px;margin-bottom:6px}.kibaTalk p{margin:5px 0;line-height:1.45;font-size:14px}.kibaTalk button{pointer-events:auto;margin-top:9px;background:#d7a74b;border:0;border-radius:10px;padding:8px 15px;font-weight:800;cursor:pointer}.kibaShadow{position:absolute;bottom:13.5%;left:50%;width:95px;height:15px;transform:translateX(-50%);background:#0007;filter:blur(6px);border-radius:50%;opacity:0;animation:shadowIn .5s ease 4.4s forwards}.kibaDust{position:absolute;left:calc(50% - 48px);bottom:16%;width:100px;height:35px;opacity:0;animation:dustIn .8s ease 4.4s forwards}.kibaDust:before,.kibaDust:after{content:'';position:absolute;border-radius:50%;background:#c9b38a55;filter:blur(3px)}.kibaDust:before{width:20px;height:9px;left:5px;bottom:2px}.kibaDust:after{width:14px;height:7px;right:9px;bottom:8px}@keyframes kibaCrawl{0%{left:-130px;transform:translateY(0) scale(.82)}18%{transform:translateY(5px) scale(.84)}36%{transform:translateY(0) scale(.86)}54%{transform:translateY(5px) scale(.88)}72%{transform:translateY(0) scale(.9)}100%{left:calc(50% - 56px);transform:translateY(0) scale(.92)}}@keyframes crawlL{0%,100%{transform:rotate(17deg) translateY(0)}50%{transform:rotate(-18deg) translateY(2px)}}@keyframes crawlR{0%,100%{transform:rotate(-18deg) translateY(2px)}50%{transform:rotate(17deg) translateY(0)}}@keyframes pawL{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(25deg)}}@keyframes pawR{0%,100%{transform:rotate(25deg)}50%{transform:rotate(-20deg)}}@keyframes tailWiggle{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(10deg)}}@keyframes blink{0%,45%,100%{opacity:1}48%{opacity:.05}}@keyframes turnHead{0%{transform:rotate(0)}100%{transform:rotate(-4deg)}}@keyframes standUp{0%{transform:rotate(0) translateY(0)}45%{transform:rotate(-7deg) translateY(-7px)}100%{transform:rotate(0) translateY(-11px)}}@keyframes kibaTalkIn{to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes shadowIn{to{opacity:1}}@keyframes dustIn{0%{opacity:0;transform:scale(.4)}50%{opacity:.8;transform:scale(1.2)}100%{opacity:0;transform:scale(1.5)}}@keyframes kibaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)} }@media(max-width:700px){#kibaChat{right:12px;bottom:98px;width:calc(100vw - 24px);height:65vh}.kibaWalker{bottom:16%;width:96px;height:134px}.kibaTalk{top:9%;padding:14px;font-size:13px}}
`;document.head.appendChild(S);
function svg(){return '<svg class="kibaSvg" viewBox="0 0 112 156" aria-label="Kiba, ornitorrinco mascote de Sorokiba"><g class="tail"><path d="M79 101c18 1 29 7 29 17-1 12-18 18-31 10-7-4-10-10-8-17 3-7 5-9 10-10z" fill="#5a372a" stroke="#211611" stroke-width="3.5"/><path d="M83 106c13 3 19 8 18 13-1 5-8 7-14 5" fill="none" stroke="#85513a" stroke-width="3" stroke-linecap="round"/></g><g class="crawlL"><path d="M39 119c-5 10-8 20-5 27 3 6 10 7 16 3l-3-8 0-22z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M32 145c7 3 13 3 20 0-2 7-14 9-21 4z" fill="#d99a3d" stroke="#241712" stroke-width="2"/></g><g class="crawlR"><path d="M68 119c4 10 8 20 5 27-3 6-10 7-16 3l3-8 0-22z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M54 148c7 3 14 2 20-2-2 7-14 9-21 4z" fill="#d99a3d" stroke="#241712" stroke-width="2"/></g><g class="bodyLift"><path d="M31 68c-7 12-9 33-5 48 5 20 21 29 39 27 20-2 30-16 28-36-2-18-9-32-21-39-14-8-32-8-41 0z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M43 77c-4 16-2 35 5 49 9 7 18 7 27-2 5-14 3-31-4-44-8-5-20-7-28-3z" fill="#e5c49e" stroke="#241712" stroke-width="2"/><path d="M36 75c10 7 27 9 38 1l-3 13c-11 6-24 5-35-1z" fill="#151a20"/><path d="M47 79h11l6 7-12 7-11-7z" fill="#d7a74b"/></g><g class="pawL"><path d="M33 78c-12 5-20 13-23 23 8 2 17-1 24-8l7-10z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M11 100c-4 2-7 4-9 7 6 2 12 1 16-2" fill="none" stroke="#d99a3d" stroke-width="3" stroke-linecap="round"/></g><g class="pawR"><path d="M75 78c12 5 19 13 22 23-8 2-17-1-24-8l-6-10z" fill="#75452f" stroke="#241712" stroke-width="3.5"/><path d="M94 100c4 2 7 4 9 7-6 2-12 1-16-2" fill="none" stroke="#d99a3d" stroke-width="3" stroke-linecap="round"/></g><g class="headTurn"><path d="M31 60c-8-12-7-27 1-37C40 12 56 7 70 12c14 5 23 18 21 32-2 14-12 23-27 27-14 3-27-1-33-11z" fill="#805039" stroke="#241712" stroke-width="3.5"/><path d="M37 43c3-12 12-21 23-25 9-3 19-2 26 2-11 3-18 9-21 18-4 10 0 19 7 25-16 2-29-6-35-20z" fill="#9c6447" opacity=".55"/><g class="eyes"><ellipse cx="49" cy="36" rx="6" ry="8" fill="#151318"/><ellipse cx="74" cy="36" rx="6" ry="8" fill="#151318"/><circle cx="51" cy="34" r="2.4" fill="#fff"/><circle cx="76" cy="34" r="2.4" fill="#fff"/></g><path d="M42 50c10-5 28-5 38 0 2 7-3 12-10 14-9 2-19 0-27-5-3-2-4-6-1-9z" fill="#c98534" stroke="#241712" stroke-width="3"/><path d="M46 53c9-3 21-3 30 0" fill="none" stroke="#8a4e22" stroke-width="2"/><circle cx="51" cy="59" r="1.5" fill="#f7c76d"/><circle cx="70" cy="59" r="1.5" fill="#f7c76d"/></g></svg>'}
function add(t,c){var m=document.getElementById('kibaMsgs');if(!m)return;var e=document.createElement('div');e.className='msg '+(c||'bot');e.textContent=t;m.appendChild(e);m.scrollTop=m.scrollHeight}
var USER=null;
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9? ]/g,' ').replace(/\s+/g,' ').trim()}
var KIBA_MEMORY=[];
var KIBA_RECENT=[];
function fresh(list){
  var options=list.filter(function(x){return KIBA_RECENT.indexOf(x)<0});
  var pool=options.length?options:list;
  var out=pool[Math.floor(Math.random()*pool.length)];
  KIBA_RECENT.push(out);
  if(KIBA_RECENT.length>8)KIBA_RECENT.shift();
  return out;
}
function memoryAnswer(q){
  if(!KIBA_MEMORY.length)return null;
  var best=null,bestScore=0;
  KIBA_MEMORY.forEach(function(item){
    var hay=norm((item.title||'')+' '+(item.category||'')+' '+(item.content||''));
    var words=q.split(' ').filter(function(w){return w.length>2});
    var score=0;
    words.forEach(function(w){if(hay.indexOf(w)>=0)score++});
    if(norm(item.title||'')===q)score+=5;
    if(score>bestScore){best=item;bestScore=score}
  });
  if(!best||bestScore<2)return null;
  return fresh([
    String(best.content),
    String(best.title)+': '+String(best.content),
    'Encontrei isto na memória de Sorokiba: '+String(best.content)
  ]);
}
async function loadKibaMemory(){
  try{
    var r=await fetch('/api/kiba/knowledge');
    if(!r.ok)return;
    var d=await r.json();
    KIBA_MEMORY=Array.isArray(d.knowledge)?d.knowledge:[];
  }catch(e){}
}
function answer(t){
  var q=norm(t);
  if(!q)return fresh(['Pode perguntar. Estou ouvindo.','Pode mandar sua dúvida.','Estou aqui. O que você quer saber?']);
  var learned=memoryAnswer(q);
  if(learned)return learned;

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
  c.innerHTML='<header class="kh"><div class="ka">'+svg()+'</div><div><b>Kiba</b><small>Ornitorrinco • Mascote de Sorokiba • memória ativa</small></div><button class="kc">×</button></header><div class="km" id="kibaMsgs"></div><div class="kq"><button>Quanto XP eu tenho?</button><button>Como funcionam as missões?</button><button>Quem é Kiba?</button><button>Como funciona o banco?</button></div><form class="kf"><input maxlength="300" placeholder="Pergunte qualquer coisa sobre Sorokiba..."><button>→</button></form>';
  document.body.appendChild(c);
  b.onclick=function(){c.classList.add('open');if(!document.getElementById('kibaMsgs').children.length)add(fresh(['Oi! Eu sou o Kiba. Pode fazer sua pergunta.','Olá! Sou o Kiba. O que vamos descobrir hoje?']))};
  c.querySelector('.kc').onclick=function(){c.classList.remove('open')};
  function send(t){
    if(!t)return;
    add(t,'usr');
    var ty=document.createElement('div');ty.className='msg bot typing';ty.textContent='Kiba está pensando...';document.getElementById('kibaMsgs').appendChild(ty);
    setTimeout(function(){ty.remove();add(answer(t))},420);
  }
  c.querySelectorAll('.kq button').forEach(function(x){x.onclick=function(){send(x.textContent)}});
  c.querySelector('form').onsubmit=function(e){e.preventDefault();var i=c.querySelector('input'),t=i.value.trim();i.value='';send(t)};
  loadKibaMemory();
}
async function getUser(){try{var t=localStorage.getItem('sorokiba_token');if(!t)return null;var r=await fetch('/api/me',{headers:{Authorization:'Bearer '+t}});if(!r.ok)return null;var d=await r.json();return d.user||null}catch(e){return null}}
function arrival(){return null}
async function start(){var n=0,t=setInterval(async function(){n++;var g=document.getElementById('gameView');var u=await getUser();if(g&&!g.classList.contains('hidden')&&u){clearInterval(t);USER=u;mount()}if(n>240)clearInterval(t)},500)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();window.sorokibaKiba={open:function(){var c=document.getElementById('kibaChat');if(c)c.classList.add('open')}}})();