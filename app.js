
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let token=localStorage.getItem("sorokiba_token"), me=null, isMayor=false, currentPage="city", timer=null;
let missionModalState = null; // { mission, currentIndex, endAt, timerId }
let missionCooldownUntil = null; // tracks when next mission batch is available

const api=async(path,opts={})=>{
  const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(opts.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Ocorreu um erro.");
  return data;
};
const post=(p,b)=>api(p,{method:"POST",body:JSON.stringify(b)});
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function toast(msg,type="ok"){const t=$("#toast");t.textContent=msg;t.className="toast show "+type;clearTimeout(t._x);t._x=setTimeout(()=>t.className="toast",3500)}
function openModal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
$("#closeModal").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};

function setAuth(which){
  $$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.auth===which));
  $("#loginForm").classList.toggle("hidden",which!=="login");$("#registerForm").classList.toggle("hidden",which!=="register");
}
$$(".tab").forEach(b=>b.onclick=()=>setAuth(b.dataset.auth));
$("#loginForm").onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target);const d=await post("/api/login",Object.fromEntries(f));token=d.token;localStorage.setItem("sorokiba_token",token);boot()}catch(e){toast(e.message,"error")}};
$("#registerForm").onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target);const d=await post("/api/register",Object.fromEntries(f));token=d.token;localStorage.setItem("sorokiba_token",token);boot()}catch(e){toast(e.message,"error")}};

async function boot(){
  try{const d=await api("/api/me");me=d.user;isMayor=d.isMayor;$("#authView").classList.add("hidden");$("#gameView").classList.remove("hidden");$("#mayorNav").classList.toggle("hidden",!isMayor);updateHUD();loadPage("city")}
  catch(e){localStorage.removeItem("sorokiba_token");token=null;$("#loader").classList.add("hidden");$("#authView").classList.remove("hidden")}
  finally{$("#loader").classList.add("hidden")}
}
function updateHUD(){
  if(!me)return;
  $("#sideName").textContent=me.name;$("#sideJob").textContent=me.jobName;$("#avatar").textContent=me.name[0].toUpperCase();$("#avatarTop").textContent=me.name[0].toUpperCase();
  $("#moneyTop").textContent=money(me.money);$("#levelVal").textContent=me.level;$("#xpVal").textContent=`${me.xp} XP`;
  [["life",me.life],["hunger",me.hunger],["hydration",me.hydration],["energy",me.energy]].forEach(([k,v])=>{$("#"+k+"Val").textContent=v;$("#"+k+"Bar").style.width=v+"%"});
  $("#lifeBar").parentElement.parentElement.classList.toggle("danger",me.life<=25);
}
function nav(page){currentPage=page;$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));loadPage(page);if(innerWidth<900)$("#gameView").classList.remove("menu-open")}
$$(".nav-btn").forEach(b=>b.onclick=()=>nav(b.dataset.page));
$("#mobileMenu").onclick=()=>$("#gameView").classList.toggle("menu-open");
$("#logoutBtn").onclick=()=>{localStorage.removeItem("sorokiba_token");location.reload()};

const titles={city:["VISÃO GERAL","Cidade"],job:["CARREIRA","Emprego"],missions:["OBJETIVOS","Missões"],inventory:["SEUS ITENS","Inventário"],shop:["MERCADO","Loja"],hospital:["SAÚDE","Hospital"],bank:["BANCO","Banco"],players:["COMUNIDADE","Jogadores"],news:["NOTÍCIAS","Notícias"],events:["EVENTOS","Eventos"],proposals:["PROPOSTAS","Propostas"],mayor:["PREFEITURA","Prefeitura"],account:["PERFIL","Conta"]};
async function loadPage(page){
  
  $("#pageEyebrow").textContent=titles[page][0];$("#pageTitle").textContent=titles[page][1];
  const box=$("#content");box.innerHTML='<div class="loading-card"><div class="spinner"></div>Carregando...</div>';
  try{
    if(page==="city")return cityPage(box);
    if(page==="job")return jobPage(box);
    if(page==="missions")return missionsPage(box);
    if(page==="inventory")return inventoryPage(box);
    if(page==="shop")return shopPage(box);
    if(page==="hospital")return hospitalPage(box);
    if(page==="bank")return bankPage(box);
    if(page==="players")return playersPage(box);
    if(page==="news")return newsPage(box);
    if(page==="events")return eventsPage(box);
    if(page==="proposals")return proposalsPage(box);
    if(page==="mayor")return mayorPage(box);
    if(page==="account")return accountPage(box);
  }catch(e){box.innerHTML=`<div class="empty"><div>⚠️</div><h3>Não foi possível carregar</h3><p>${esc(e.message)}</p></div>`}
}

async function cityPage(box){
 const c=await api("/api/city");
 const name=esc((me.name||"Chen").split(" ")[0]);
 const job=esc(me.jobName||"Cidadão");
 box.innerHTML=`
 <div class="section-head"><div><span class="eyebrow">STATUS DA CIDADE</span><h3>Sorokiba hoje</h3></div><span class="live"><i></i> AO VIVO</span></div>
 <div class="stats-grid"><div class="stat-card"><span>👥</span><small>População</small><b>${c.population}</b><em>cidadãos</em></div><div class="stat-card"><span>📈</span><small>Economia</small><b>R$ ${c.economy.toLocaleString('pt-BR')}</b></div><div class="stat-card"><span>🏗️</span><small>Infraestrutura</small><b>${c.infrastructure}%</b></div><div class="stat-card"><span>✨</span><small>Qualidade</small><b>${c.quality}%</b></div></div>
 <div class="two-col"><div class="panel"><div class="panel-title"><h3>Atalhos</h3></div><div class="quick-grid"><button onclick="nav('job')">💼<b>Minha carreira</b><small>Ver profissões</small></button><button onclick="nav('shop')">🛒<b>Compras</b><small>Compre itens</small></button><button onclick="nav('missions')">🎯<b>Missões</b><small>Ganhe XP</small></button></div></div>
 <div class="panel health-panel"><div class="panel-title"><h3>Seu cidadão</h3><span>Nível ${me.level}</span></div><p>Profissão atual: <b>${job}</b></p><div class="mini-bars"><div><span>❤️</span><i style="width:${me.life}%"></i></div><div><span>🍽️</span><i style="width:${me.hunger}%"></i></div></div></div></div>`;
 homeCarousel(box);
}



async function homeCarousel(box){
  if(!box)return;
  if(window.__sorokibaHomeCarouselCleanup)window.__sorokibaHomeCarouselCleanup();
  box.querySelectorAll('.hero,.soro-carousel,.soro-home-carousel,#soro-carousel-v3').forEach(el=>el.remove());

  if(!document.getElementById('sorokiba-city-carousel-styles')){
    const style=document.createElement('style');
    style.id='sorokiba-city-carousel-styles';
    style.textContent=`
      .soro-home-carousel{position:relative;width:100%;min-height:330px;height:330px;margin:0 0 24px;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#09111f;color:#fff;box-shadow:0 20px 55px rgba(0,0,0,.22);isolation:isolate}
      .soro-home-carousel .sc-scene{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .45s ease,transform .55s ease;transform:scale(.985)}
      .soro-home-carousel .sc-scene.active{opacity:1;transform:scale(1);pointer-events:auto}
      .soro-home-carousel .sc-content{position:relative;z-index:5;min-height:100%;box-sizing:border-box;padding:34px 42px 68px;display:flex;flex-direction:column;justify-content:center}
      .soro-home-carousel .sc-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;opacity:.72;margin-bottom:10px}
      .soro-home-carousel h2{margin:0;max-width:760px;font-size:clamp(28px,4vw,46px);line-height:1.02;letter-spacing:-.035em}
      .soro-home-carousel .sc-text{max-width:700px;margin:13px 0 0;font-size:clamp(14px,1.7vw,17px);line-height:1.6;opacity:.88}
      .soro-home-carousel .sc-panel{margin-top:17px;max-width:600px;padding:13px 15px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(4,10,20,.38);backdrop-filter:blur(10px)}
      .soro-home-carousel .sc-nav{position:absolute;z-index:10;left:22px;right:22px;bottom:17px;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .soro-home-carousel .sc-dots{display:flex;gap:8px;align-items:center;padding:7px 10px;border-radius:999px;background:rgba(2,8,16,.58);backdrop-filter:blur(10px)}
      .soro-home-carousel .sc-dot{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.32);cursor:pointer;transition:.25s ease}
      .soro-home-carousel .sc-dot.active{width:26px;border-radius:99px;background:#fff;box-shadow:0 0 16px rgba(255,255,255,.45)}
      .soro-home-carousel .sc-arrows{display:flex;gap:7px}
      .soro-home-carousel .sc-arrow{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(2,8,16,.58);color:#fff;font-size:25px;line-height:1;cursor:pointer;backdrop-filter:blur(9px)}
      .soro-home-carousel .sc-arrow:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.35)}
      .soro-home-carousel .sc-scene:after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.22),transparent 72%)}
      .soro-home-carousel .sc-sun{position:absolute;left:72%;bottom:74px;width:118px;height:118px;border-radius:50%;transform:translateX(-50%);background:radial-gradient(circle at 43% 40%,#fff8cf 0 15%,#ffd36f 44%,#e99a3b 69%,rgba(233,154,59,0) 73%);box-shadow:0 0 24px rgba(255,205,112,.7),0 0 52px rgba(239,154,59,.28);z-index:3}
.soro-home-carousel .sc-sun.sun-morning{left:72%;bottom:73px;width:94px;height:94px;background:radial-gradient(circle at 43% 40%,#ffe9b0 0 15%,#f6a653 45%,#e77935 70%,rgba(231,121,53,0) 74%);box-shadow:0 0 18px rgba(246,166,83,.58),0 0 38px rgba(231,121,53,.2)}
.soro-home-carousel .sc-sun.sun-afternoon{left:72%;bottom:92px;width:128px;height:128px;background:radial-gradient(circle at 43% 40%,#fffce0 0 16%,#ffe47f 43%,#f6b43e 68%,rgba(246,180,62,0) 74%);box-shadow:0 0 32px rgba(255,221,126,.9),0 0 65px rgba(246,180,62,.35)}
.soro-home-carousel .sc-sun.sun-morning{bottom:76px;width:112px;height:112px}
.soro-home-carousel .sc-sun.sun-afternoon{bottom:92px;width:145px;height:145px}
      .soro-home-carousel .sc-city{position:absolute;left:0;right:0;bottom:0;height:142px;z-index:4}
.soro-home-carousel .sc-city:before{content:'';position:absolute;left:3%;right:3%;bottom:0;height:100%;background:linear-gradient(90deg,transparent 0 5%,#17222d 5% 10%,transparent 10% 12%,#24313d 12% 18%,transparent 18% 21%,#1b2732 21% 29%,transparent 29% 31%,#293946 31% 39%,transparent 39% 42%,#16232d 42% 48%,transparent 48% 50%,#263640 50% 58%,transparent 58% 61%,#1b2834 61% 69%,transparent 69% 72%,#2b3a45 72% 79%,transparent 79% 82%,#182630 82% 90%,transparent 90% 93%,#26343f 93% 98%,transparent);clip-path:polygon(0 100%,0 58%,6% 58%,6% 31%,11% 31%,11% 52%,16% 52%,16% 22%,22% 22%,22% 44%,28% 44%,28% 12%,34% 12%,34% 49%,40% 49%,40% 28%,46% 28%,46% 54%,52% 54%,52% 18%,58% 18%,58% 43%,64% 43%,64% 8%,70% 8%,70% 48%,76% 48%,76% 25%,82% 25%,82% 55%,88% 55%,88% 16%,94% 16%,94% 42%,100% 42%,100% 100%);box-shadow:inset 0 -15px 25px rgba(0,0,0,.35)}
.soro-home-carousel .sc-city:after{content:'';position:absolute;left:4%;right:4%;bottom:20px;height:82px;background:repeating-linear-gradient(90deg,transparent 0 12px,rgba(255,220,128,.55) 13px 17px,transparent 18px 29px);mask-image:linear-gradient(to top,black 0 65%,transparent);opacity:.62}
.soro-home-carousel .sc-road{position:absolute;left:0;right:0;bottom:0;height:27px;background:linear-gradient(180deg,#202832,#080c11);z-index:6}
.soro-home-carousel .sc-road:after{content:'';position:absolute;left:10%;right:10%;top:12px;height:2px;background:repeating-linear-gradient(90deg,#d9c47b 0 28px,transparent 28px 58px);opacity:.42}
      .soro-home-carousel .sc-reflection{position:absolute;right:8%;bottom:0;width:240px;height:110px;background:linear-gradient(180deg,rgba(255,230,145,.28),transparent);filter:blur(8px);transform:skewX(-18deg)}
      .soro-home-carousel .sc-rays{position:absolute;right:-8%;bottom:-35%;width:68%;height:145%;background:repeating-conic-gradient(from 220deg,rgba(255,239,176,.13) 0 5deg,transparent 5deg 13deg);transform:rotate(-10deg);animation:scRays 12s linear infinite}
      .soro-home-carousel .sc-stars{position:absolute;inset:0;opacity:.9;background-image:radial-gradient(circle at 8% 18%,rgba(255,255,255,.9) 0 1px,transparent 2px),radial-gradient(circle at 18% 34%,rgba(255,255,255,.72) 0 1px,transparent 2px),radial-gradient(circle at 29% 12%,rgba(255,255,255,.8) 0 1px,transparent 2px),radial-gradient(circle at 41% 26%,rgba(255,255,255,.65) 0 1px,transparent 2px),radial-gradient(circle at 53% 10%,rgba(255,255,255,.9) 0 1px,transparent 2px),radial-gradient(circle at 66% 30%,rgba(255,255,255,.7) 0 1px,transparent 2px),radial-gradient(circle at 78% 15%,rgba(255,255,255,.85) 0 1px,transparent 2px),radial-gradient(circle at 91% 27%,rgba(255,255,255,.75) 0 1px,transparent 2px),radial-gradient(circle at 35% 45%,rgba(255,255,255,.55) 0 1px,transparent 2px),radial-gradient(circle at 84% 48%,rgba(255,255,255,.65) 0 1px,transparent 2px);z-index:1}
      .soro-home-carousel .sc-moon{position:absolute;right:13%;top:38px;width:82px;height:82px;border-radius:50%;background:radial-gradient(circle at 34% 32%,#fffdf0,#f7f0c5 58%,#d8d1aa);box-shadow:0 0 24px rgba(247,240,197,.85),0 0 70px rgba(247,240,197,.3);z-index:2}
      .soro-home-carousel .sc-meteor{position:absolute;width:95px;height:2px;border-radius:99px;background:linear-gradient(90deg,transparent,#fff);opacity:0;transform:rotate(-27deg);animation:scMeteor 6s linear infinite}
      .soro-home-carousel .sc-meteor.one{left:18%;top:65px}.soro-home-carousel .sc-meteor.two{left:48%;top:105px;animation-delay:3s}
      .soro-home-carousel .sc-snow{position:absolute;inset:-40px 0 0;background-image:radial-gradient(circle,rgba(255,255,255,.95) 1px,transparent 2px),radial-gradient(circle,rgba(255,255,255,.8) 2px,transparent 3px);background-size:34px 34px,67px 67px;animation:scSnow 8s linear infinite;opacity:.82}
      .soro-home-carousel .sc-briefcase{position:absolute;right:9%;bottom:42px;width:128px;height:82px;border:3px solid rgba(255,255,255,.32);border-radius:13px;background:rgba(255,255,255,.08);transform:rotate(-5deg);box-shadow:0 20px 50px rgba(0,0,0,.25)}
      .soro-home-carousel .sc-briefcase:before{content:'';position:absolute;left:39px;top:-20px;width:45px;height:19px;border:3px solid rgba(255,255,255,.32);border-bottom:0;border-radius:9px 9px 0 0}
      .soro-home-carousel .sc-chart{height:7px;margin-top:11px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}.soro-home-carousel .sc-chart i{display:block;height:100%;width:76%;border-radius:inherit;background:#8de8c9}
      .soro-home-carousel .sc-news-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(130px,.8fr);gap:10px}
      .soro-home-carousel .sc-news-card{padding:11px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055)}
      .soro-home-carousel .sc-news-card b{display:block;margin-bottom:5px}.soro-home-carousel .sc-news-card small{opacity:.62}
      .soro-home-carousel .sc-grid{position:absolute;inset:-50%;background:linear-gradient(rgba(120,145,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(120,145,255,.07) 1px,transparent 1px);background-size:44px 44px;transform:perspective(520px) rotateX(58deg);animation:scGrid 8s linear infinite}
      .soro-home-carousel .sc-ring{position:absolute;right:10%;top:42px;width:145px;height:145px;border:1px solid rgba(160,175,255,.55);border-radius:50%;box-shadow:0 0 30px rgba(100,115,255,.2),inset 0 0 25px rgba(100,115,255,.12);animation:scRing 7s linear infinite}
      .soro-home-carousel .sc-ring:before,.soro-home-carousel .sc-ring:after{content:'';position:absolute;inset:15px;border:1px dashed rgba(190,200,255,.32);border-radius:50%}.soro-home-carousel .sc-ring:after{inset:37px;border-style:solid}
      @keyframes scPulse{from{transform:scale(.96)}to{transform:scale(1.05)}}@keyframes scRays{to{transform:rotate(10deg)}}@keyframes scStars{to{transform:translateY(12px)}}@keyframes scMeteor{0%,100%{opacity:0;transform:translate(0,0) rotate(-27deg)}8%{opacity:1}25%{opacity:0;transform:translate(170px,85px) rotate(-27deg)}}@keyframes scSnow{from{transform:translateY(-35px)}to{transform:translateY(120px)}}@keyframes scGrid{to{transform:perspective(520px) rotateX(58deg) translateY(44px)}}@keyframes scRing{to{transform:rotate(360deg)}}
      @media(max-width:700px){.soro-home-carousel,.soro-home-carousel .sc-content{min-height:300px;height:300px}.soro-home-carousel .sc-content{padding:28px 22px 60px}.soro-home-carousel .sc-briefcase,.soro-home-carousel .sc-ring{opacity:.4}.soro-home-carousel .sc-news-grid{grid-template-columns:1fr}}
      @media(prefers-reduced-motion:reduce){.soro-home-carousel *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  const first=esc((me?.name||'Cidadão').trim().split(/\s+/)[0]);
  const job=esc(me?.jobName||'Cidadão');
  const SP='America/Sao_Paulo';
  const spDateParts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:SP,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const spMonth=Number(spDateParts.month),spDay=Number(spDateParts.day);
  const seasonInfo=((spMonth===3&&spDay>=20)||(spMonth>3&&spMonth<6)||(spMonth===6&&spDay<21))?{name:'Outono',icon:'🍂',desc:'Folhas, mudanças e novos caminhos tomam conta de Sorokiba.',bg:'linear-gradient(135deg,#493526,#9b6647 52%,#d6b27a)',art:'<div class="sc-city"></div>'}:((spMonth===6&&spDay>=21)||(spMonth>6&&spMonth<9)||(spMonth===9&&spDay<23))?{name:'Inverno',icon:'❄️',desc:'Neve cai sobre a cidade e uma atmosfera fria transforma Sorokiba.',bg:'linear-gradient(135deg,#17364b,#4c819a 52%,#d9edf2)',art:'<div class="sc-snow"></div><div class="sc-city"></div>'}:((spMonth===9&&spDay>=23)||(spMonth>9&&spMonth<12)||(spMonth===12&&spDay<21))?{name:'Primavera',icon:'🌸',desc:'A cidade ganha novas cores, flores e sinais de renovação.',bg:'linear-gradient(135deg,#244b45,#6f9b72 52%,#d6b889)',art:'<div class="sc-city"></div>'}:{name:'Verão',icon:'☀️',desc:'Dias quentes e muita movimentação tomam conta de Sorokiba.',bg:'linear-gradient(135deg,#1f5d78,#5db9bf 52%,#efc66f)',art:'<div class="sc-sun"></div><div class="sc-city"></div>'};
  let news=[];
  try{const newsData=await api('/api/news');news=Array.isArray(newsData)?newsData:[]}catch{}
  const renderNews=news=>{
    const latest=Array.isArray(news)&&news[0]?news[0]:null;
    const title=esc(latest?.title||'Destaque da cidade');
    const body=esc(latest?.body||'Novidades, acontecimentos e atualizações recentes de Sorokiba.');
    return '<div class="sc-panel sc-news-grid"><div class="sc-news-card"><small>DESTAQUE PRINCIPAL</small><b>'+title+'</b><small>'+body.slice(0,150)+(body.length>150?'…':'')+'</small></div><div class="sc-news-card"><small>AGORA</small><b>📰 Cidade ao vivo</b><small>Veja todas as notícias no menu Notícias.</small></div></div>';
  };

  const slides=[
    {k:'🌅 SOROKIBA • BOM DIA',t:'Bom dia, '+first+'!',m:'O nascer do sol aparece atrás das montanhas enquanto Sorokiba começa a despertar.',bg:'linear-gradient(180deg,#344b78 0%,#87687b 42%,#d98a65 67%,#f1c68e 100%)',art:'<div class="sc-mountains"></div><div class="sc-sun sun-morning"></div><div class="sc-city"></div><div class="sc-road"></div>'},
    {k:'☀️ SOROKIBA • BOA TARDE',t:'Boa tarde, '+first+'!',m:'O sol está forte no céu, iluminando o centro e refletindo naturalmente nos prédios de Sorokiba.',bg:'linear-gradient(180deg,#2584c2 0%,#65c2da 55%,#b8d8d0 78%,#e9cc8c 100%)',art:'<div class="sc-sun sun-afternoon"></div><div class="sc-city"></div><div class="sc-reflection"></div><div class="sc-road"></div>'},
    {k:'🌌 SOROKIBA • BOA NOITE',t:'Boa noite, '+first+'!',m:'A cidade continua viva sob um céu estrelado, com prédios iluminados e meteoros ocasionais.',bg:'linear-gradient(180deg,#020515 0%,#07132d 50%,#121d3c 75%,#090d15 100%)',art:'<div class="sc-stars"></div><div class="sc-moon"></div><div class="sc-meteor one"></div><div class="sc-meteor two"></div><div class="sc-city"></div><div class="sc-building-lights"></div><div class="sc-road"></div>'},
    {k:seasonInfo.icon+' SOROKIBA • '+seasonInfo.name.toUpperCase(),t:seasonInfo.name+' em Sorokiba.',m:seasonInfo.desc,bg:seasonInfo.bg,art:seasonInfo.art},
    {k:'💼 SOROKIBA • TRABALHO',t:'Sua carreira em Sorokiba.',m:'Sua profissão atual é <b>'+job+'</b>. Acompanhe seu progresso e continue avançando.',bg:'linear-gradient(135deg,#171b2c,#2b3452 55%,#3d4b70)',art:'<div class="sc-briefcase"></div>'},
    {k:'📰 SOROKIBA • NOTÍCIAS',t:'Painel de notícias da cidade.',m:'Confira o destaque principal e os acontecimentos recentes de Sorokiba.',bg:'linear-gradient(135deg,#141922,#273141 55%,#10151e)',art:''},
    {k:'🚀 SOROKIBA • ÚLTIMA MENSAGEM',t:'O futuro de Sorokiba começa agora.',m:'Novas atualizações, eventos e oportunidades podem surgir. A cidade continua evoluindo.',bg:'radial-gradient(circle at 75% 35%,rgba(95,105,255,.24),transparent 25%),linear-gradient(135deg,#080a16,#12172d 50%,#070a15)',art:'<div class="sc-grid"></div><div class="sc-ring"></div>'}
  ];

  const groups=[[0],[1],[2],[3],[4,5,6]];
  const root=document.createElement('section');
  root.className='soro-home-carousel';
  root.setAttribute('aria-label','Carrossel da Cidade de Sorokiba');
  root.innerHTML='<div class="sc-track"></div><div class="sc-nav"><div class="sc-dots">'+groups.map((g,i)=>'<button type="button" class="sc-dot '+(i===0?'active':'')+'" data-group="'+i+'" aria-label="Grupo '+(i+1)+'"></button>').join('')+'</div><div class="sc-arrows"><button type="button" class="sc-arrow" data-prev aria-label="Anterior">‹</button><button type="button" class="sc-arrow" data-next aria-label="Próxima">›</button></div></div>';
  box.prepend(root);

  const track=root.querySelector('.sc-track');
  slides.forEach((s,i)=>{
    const el=document.createElement('article');
    el.className='sc-scene '+(i===0?'active':'');
    el.dataset.index=i;
    el.style.background=s.bg;
    let extra='';
    if(i===4)extra='<div class="sc-panel"><div style="display:flex;justify-content:space-between;gap:10px"><b>STATUS PROFISSIONAL</b><span>Nível '+Number(me?.level||1)+'</span></div><div class="sc-chart"><i></i></div><small style="opacity:.68">XP atual: '+Number(me?.xp||0)+' • Profissão: '+job+'</small></div>';
    if(i===5)extra=renderNews(news);
    el.innerHTML='<div class="sc-content"><div class="sc-kicker">'+s.k+'</div><h2>'+s.t+'</h2><p class="sc-text">'+s.m+'</p>'+extra+'</div>'+s.art;
    track.appendChild(el);
  });

  // A primeira cena acompanha o horário oficial de Brasília.
  // 05:00–11:59 = Bom dia, 12:00–17:59 = Boa tarde, 18:00–04:59 = Boa noite.
  const brasiliaHour=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',hour12:false}).format(new Date()));
  let initialScene=brasiliaHour>=5&&brasiliaHour<12?0:(brasiliaHour>=12&&brasiliaHour<18?1:2);

  let current=initialScene,timer=null,paused=false;
  const scenes=[...root.querySelectorAll('.sc-scene')],dots=[...root.querySelectorAll('.sc-dot')];
  const groupFor=index=>groups.findIndex(g=>g.includes(index));
  function draw(){
    scenes.forEach((el,i)=>el.classList.toggle('active',i===current));
    const g=groupFor(current);
    dots.forEach((d,i)=>d.classList.toggle('active',i===g));
  }
  function restart(){
    clearInterval(timer);
    timer=setInterval(()=>{if(!paused){current=(current+1)%slides.length;draw()}},6500);
  }
  function go(n){current=(n+slides.length)%slides.length;draw();restart()}
  dots.forEach((d,i)=>d.onclick=()=>{current=groups[i][0];draw();restart()});
  root.querySelector('[data-prev]').onclick=()=>go(current-1);
  root.querySelector('[data-next]').onclick=()=>go(current+1);
  root.addEventListener('mouseenter',()=>{paused=true;clearInterval(timer)});
  root.addEventListener('mouseleave',()=>{paused=false;restart()});
  draw();
  restart();

  api('/api/news').then(news=>{
    if(!root.isConnected)return;
    const scene=scenes[5],panel=scene.querySelector('.sc-news-grid');
    if(panel)panel.outerHTML=renderNews(Array.isArray(news)?news:[]);
  }).catch(()=>{});

  root.dataset.version='app-home-carousel-7-scenes-realistic-v3';
  window.__sorokibaHomeCarouselCleanup=()=>{clearInterval(timer);if(root&&root.parentNode)root.remove();window.__sorokibaHomeCarouselCleanup=null;};
}

async function jobPage(box){
 const d=await api("/api/jobs");
 const jobs=d.jobs||[];
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">CARREIRA PROFISSIONAL</span><h1>Escolha seu caminho</h1><p>Cada profissão tem sua função na cidade. Ganhe XP e desbloqueie oportunidades.</p></div></div>
 <div class="jobs-grid">${jobs.map(j=>{const locked = (me.xp || 0) < (j.xpRequired || 0); return `<div class="job-card"><div class="job-icon">${jobIcon(j.id)}</div><h3>${j.name}</h3><p>${j.task}</p><small>Salário: R$ ${j.salary} • XP necessário: ${j.xpRequired || 0}</small><button class="primary" ${locked?"disabled":""} onclick="selectJob('${j.id}')">${locked?"Bloqueado":"Escolher"}</button></div>`}).join('')}</div>`;
}
function jobIcon(id){return {estudante:"🎓",entregador:"📦",comerciante:"🛍️",motorista:"🚗",policial:"🛡️",enfermeiro:"🩺",medico:"⚕️",programador:"💻",engenheiro:"🏗️"}[id]||"💼"}
async function selectJob(id){try{const d=await post("/api/jobs/select",{jobId:id});me=d.user;updateHUD();toast(d.message);loadPage("job")}catch(e){toast(e.message,"error")}}

async function missionsPage(box){
 const d=await api("/api/missions");clearInterval(timer);
 let startContent = '';
 if (d.missionsRemaining > 0) {
   startContent = `<button class="primary" onclick="startMission()">▶️ Começar nova missão</button>`;
 } else if (d.cooldownUntil) {
   startContent = `<div class="warning">🕐 Limite de 2 missões atingido. Cronômetro:</div><div id="cooldownTimer" style="font-size:24px;font-weight:700;text-align:center;color:#7c5cff;margin:10px 0">--:--</div>`;
 }
  
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">TRABALHO</span><h1>Missões de ${esc(d.job.name)}</h1><p>${esc(d.job.task)}</p></div>${startContent}</div>
 <div id="missionList" class="mission-list">${d.active.length?d.active.map(m=>missionCard(m)).join(""):'<div class="empty"><div>🎯</div><h3>Nenhuma missão ativa</h3><p>Comece uma nova missão para ganhar XP e dinheiro</p></div>'}
 </div><div class="section-head"><h3>Histórico recente</h3></div><div class="table-card"><table><thead><tr><th>Missão</th><th>Recompensa</th><th>Concluída</th></tr></thead><tbody>${d.history.length?d.history.map(h=>`<tr><td>Missão completa</td><td>+XP</td><td>${new Date(h.createdAt).toLocaleDateString('pt-BR')}</td></tr>`).join(''):'<tr><td colspan="3">Nenhuma missão concluída ainda</td></tr>'}</tbody></table></div>`;
  
 // Start cooldown timer if needed
 if (d.cooldownUntil) {
   missionCooldownUntil = d.cooldownUntil;
   timer = setInterval(updateCooldownTimer, 1000);
   updateCooldownTimer();
 } else {
   timer=setInterval(refreshMissionTimers,1000);
 }
}

function updateCooldownTimer(){
 const el = $("#cooldownTimer");
 if (!el) return;
 const now = Date.now();
 const msLeft = Math.max(0, missionCooldownUntil - now);
 const minLeft = Math.floor(msLeft / 60000);
 const secLeft = Math.floor((msLeft % 60000) / 1000);
 el.textContent = `${minLeft}:${String(secLeft).padStart(2,'0')}`;
  
 if (msLeft <= 0) {
   clearInterval(timer);
   loadPage("missions");
 }
}
function missionCard(m){
 const sec=Math.max(0,Math.floor(m.duration_seconds-(Date.now()-new Date(m.started_at).getTime())/1000));
 const min=Math.floor(sec/60);const s=sec%60;
 return `<article class="mission-card" data-start="${m.started_at}" data-duration="${m.duration_seconds}" data-id="${m.id}"><div class="mission-icon">🎯</div><div class="mission-content"><h3>Missão em andamento</h3><p class="mission-time">Tempo restante: <strong>${min}:${String(s).padStart(2,'0')}</strong></p></div><div class="mission-actions"><button class="primary" onclick="openMissionModal('${m.id}')">Responder pergunta</button></div></article>`
}

async function openMissionModal(id){
 try{
   const d = await api('/api/missions');
   const m = d.active.find(x=>x.id===id);
   if(!m){toast('Missão não encontrada','error');return}
   showMissionModal(m);
 }catch(e){toast(e.message,'error')}
}
function refreshMissionTimers(){
 $$(".mission-card").forEach(c=>{
   const sec=Math.max(0,Math.floor(Number(c.dataset.duration)-(Date.now()-new Date(c.dataset.start).getTime())/1000));
   const min=Math.floor(sec/60);const s=sec%60;
   const timeEl = c.querySelector('.mission-time strong');
   if(timeEl) timeEl.textContent = `${min}:${String(s).padStart(2,'0')}`;
   if(sec<=0){
     c.querySelectorAll('.option-btn').forEach(b=>{b.disabled=true});
   }
 })
}
async function startMission(){
  try{
    const d=await post("/api/missions/start",{});
    // d.mission contains the question and timers
    const m = d.mission;
    toast(d.message);
    // show question modal
    showMissionModal(m);
    updateHUD();
  }catch(e){toast(e.message,"error")}
}

function showMissionModal(mission){
  // ensure single modal timer
  if (missionModalState && missionModalState.timerId){
    clearInterval(missionModalState.timerId);
    missionModalState = null;
  }
  // mission.started_at is ISO string
  const endAt = new Date(mission.started_at).getTime() + (mission.duration_seconds*1000);
  missionModalState = { mission, currentIndex: 0, endAt, timerId: null };

  const render = () => {
    const idx = missionModalState.currentIndex;
    const q = (mission.questions && mission.questions[idx]) || { text: 'Pergunta indisponível', options: [] };
    const optsHtml = (q.options||[]).map((opt,i)=>`<button class="primary option-btn" id="opt-${i}" onclick="answerMission('${mission.id}',${i})">${esc(opt)}</button>`).join('');
    let html = `<div class="mission-modal"><h2>Pergunta da missão</h2><p class="mission-q">${esc(q.text)}</p><div class="mission-opts" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${optsHtml}</div><p>Tempo restante: <strong id="missionTimer">--:--</strong></p><p>Pergunta ${idx+1} de ${mission.questions.length}</p><button class="ghost" onclick="closeMissionModal()">Fechar</button></div>`;
    openModal(html);
  };

  render();

  // start countdown (single interval)
  const tick = () => {
    const sec = Math.max(0, Math.floor((missionModalState.endAt - Date.now())/1000));
    const min = Math.floor(sec/60); const s = sec%60;
    const el = document.getElementById('missionTimer');
    if(el) el.textContent = `${min}:${String(s).padStart(2,'0')}`;
    if(sec<=0){
      if (missionModalState && missionModalState.timerId){
        clearInterval(missionModalState.timerId);
        missionModalState.timerId = null;
      }
      // disable options
      $$('.option-btn').forEach(b=>b.disabled=true);
      // mark mission expired on server
      post(`/api/missions/${mission.id}/complete`,{}).then(()=>{toast('Tempo esgotado para responder');closeMissionModal();loadPage('missions')}).catch(()=>{});
    }
  };

  missionModalState.timerId = setInterval(tick, 250);
  tick();
}

function closeMissionModal(){
  if (missionModalState && missionModalState.timerId) clearInterval(missionModalState.timerId);
  missionModalState = null;
  closeModal();
}

async function answerMission(id, index){
 try{
   if (!missionModalState || missionModalState.mission.id !== id) {
     toast('Missão inválida','error'); return;
   }
   const qIdx = missionModalState.currentIndex;
   const d=await post(`/api/missions/${id}/answer`,{answer:index, questionIndex:qIdx});
   me=d.user;updateHUD();

   // show immediate feedback
   if (d.correct) {
     toast(d.message);
   } else {
     openModal(`<h2>${d.message}</h2><p>Resposta correta: <b>${esc(d.correctOptionText || d.correctIndex)}</b></p><button class="primary" onclick="closeModal()">Fechar</button>`);
   }

   if (d.final) {
     // mission finished
     closeMissionModal();
     openModal(`<h2>Missão finalizada</h2><p>${d.message}</p><p>XP ganho: <b>+${d.xpGiven}</b></p><p>Dinheiro: <b>${money(d.moneyGiven)}</b></p><button class="primary" onclick="closeModal();loadPage('missions')">Fechar</button>`);
     return;
   }

   // advance to next question
   missionModalState.currentIndex = (missionModalState.currentIndex || 0) + 1;
   // re-render current question content without losing timer
   const mission = missionModalState.mission;
   const idx = missionModalState.currentIndex;
   const q = (mission.questions && mission.questions[idx]) || { text: 'Pergunta indisponível', options: [] };
   // update modal body
   const body = `<div class="mission-modal"><h2>Pergunta da missão</h2><p class="mission-q">${esc(q.text)}</p><div class="mission-opts" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${(q.options||[]).map((opt,i)=>`<button class="primary option-btn" id="opt-${i}" onclick="answerMission('${mission.id}',${i})">${esc(opt)}</button>`).join('')}</div><p>Tempo restante: <strong id="missionTimer">--:--</strong></p><p>Pergunta ${idx+1} de ${mission.questions.length}</p><button class="ghost" onclick="closeMissionModal()">Fechar</button></div>`;
   openModal(body);
 }catch(e){toast(e.message,"error")}
}

async function inventoryPage(box){
 const d=await api("/api/inventory"), inv=d.inventory||{};
 const items=d.items.filter(i=>inv[i.id]).map(i=>`<article class="item-card"><div class="item-icon">${i.icon}</div><div><h3>${i.name}</h3><small>Quantidade: ${inv[i.id]}</small><p>+${i.hunger||0} fome, +${i.hydration||0} hidratação, +${i.energy||0} energia</p></div><button class="primary" onclick="useItem(${i.id})">Usar</button></article>`);
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">SEUS PERTENCES</span><h1>Inventário</h1><p>Use os itens comprados para cuidar das suas necessidades.</p></div><button class="ghost" onclick="nav('shop')">🛒 Comprar mais</button></div>
 <div class="items-grid">${items.length?items.join(''):'<div class="empty"><div>📭</div><h3>Inventário vazio</h3><p>Compre itens na loja</p></div>'}</div>`;
}
async function useItem(id){try{const d=await post("/api/inventory/use",{itemId:id});me=d.user;updateHUD();toast(d.message);loadPage("inventory")}catch(e){toast(e.message,"error")}}

async function shopPage(box){
 const items=await api("/api/shop");
 // render com grid responsivo e quebra de linha automática
 const itemsHtml = items.map(i=>`<div class="shop-item"><div class="item-icon">${i.icon}</div><h3>${i.name}</h3><p>${i.description}</p><small>R$ ${i.price}</small><button class="primary" onclick="openBuyModal(${i.id},'${i.name}',${i.price})">Comprar</button></div>`).join('');
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">MERCADO DE SOROKIBA</span><h1>Loja de alimentos</h1><p>Compre itens para manter seu cidadão pronto para o dia. Você tem ${money(me.money)}.</p></div></div><div class="shop-grid">${itemsHtml}</div>`;
}
function openBuyModal(itemId, itemName, itemPrice){
 openModal(`<h2>Comprar ${itemName}</h2><p>Preço: ${money(itemPrice)}</p><label>Quantidade:<input id="buyQty" type="number" min="1" value="1"></label><button class="primary" onclick="confirmBuy(${itemId})">Confirmar compra</button><button class="ghost" onclick="closeModal()">Cancelar</button>`);
 setTimeout(()=>$("#buyQty").focus(), 100);
}
async function confirmBuy(itemId){try{const qty=Number($("#buyQty").value);if(qty<1){toast("Quantidade inválida","error");return}const d=await post("/api/shop/buy",{itemId:itemId,quantity:qty});me=d.user;updateHUD();closeModal();toast(d.message);loadPage("shop")}catch(e){toast(e.message,"error")}}

async function hospitalPage(box){
 const hs=await api("/api/hospital");
 box.innerHTML=`<div class="medical-banner"><div><span class="tag">🏥 CENTRAL MÉDICA</span><h1>Cuide da sua saúde.</h1><p>Vida atual: <b>${me.life}/100</b>. O atendimento é pago com dinheiro.</p></div></div>
 <div class="services-grid">${hs.services.map(s=>`<div class="service-card"><h3>${s.name}</h3><p>Recupera ${s.life} de vida</p><small>Preço: ${money(s.price)}</small><button class="primary" onclick="treat(${s.id})">Agendar</button></div>`).join('')}</div>`;
}
async function treat(id){try{const d=await post("/api/hospital/treat",{serviceId:id});me=d.user;updateHUD();toast(d.message);loadPage("hospital")}catch(e){toast(e.message,"error")}}

async function bankPage(box){
 const d=await api("/api/bank");
 box.innerHTML=`<div class="bank-hero"><div><span class="eyebrow">BANCO SOROKIBA</span><h1>Sua vida financeira</h1><p>Gerencie seu dinheiro com segurança.</p></div><div class="bank-balance"><small>Saldo atual</small><b>${money(d.bankBalance||0)}</b></div></div>
 <div class="bank-actions"><button class="primary" onclick="bankModal('deposit')">＋ Depositar</button><button class="ghost" onclick="bankModal('withdraw')">↗ Sacar</button><button class="ghost" onclick="bankModal('transfer')">💸 Transferir</button></div>
 <div class="section-head"><h3>Histórico financeiro</h3></div><div class="table-card"><table><thead><tr><th>Data</th><th>Tipo</th><th>Pessoa</th><th>Valor</th></tr></thead><tbody>${d.transfers.length?d.transfers.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.type}</td><td>${t.person}</td><td>${money(t.amount)}</td></tr>`).join(''):'<tr><td colspan="4">Nenhuma transação</td></tr>'}</tbody></table></div>`;
}
function bankModal(type){
 const labels={deposit:["Depositar","Valor para depositar","deposit"],withdraw:["Sacar","Valor para sacar","withdraw"],transfer:["Transferir","Valor","transfer"]}[type];
 openModal(`<h2>${labels[0]}</h2><p>${type==="transfer"?"O valor será enviado para a conta bancária do usuário.":"Digite o valor da operação."}</p>${type==="transfer"?'<label>Usuário destinatário<input id="modalUser"></label>':''}<label>${labels[1]}<input id="modalAmount" type="number" min="1"></label><button class="primary" onclick="doBank('${type}')">Confirmar</button>`);
}
async function doBank(type){try{const amount=Number($("#modalAmount").value);if(amount<1){toast("Valor inválido","error");return}let d;if(type==="transfer")d=await post("/api/bank/transfer",{username:$("#modalUser").value,amount});else d=await post("/api/bank/"+type,{amount});closeModal();toast(d.message);me.money=d.money||me.money;updateHUD();loadPage("bank")}catch(e){toast(e.message,"error")}}

async function playersPage(box){
 const ps=await api("/api/players");
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">COMUNIDADE</span><h1>Cidadãos de Sorokiba</h1><p>Conheça quem está construindo a cidade com você.</p></div></div><div class="players-list">${ps.map(p=>`<div class="player-card"><div class="avatar">${p.name[0]}</div><div><h3>${esc(p.name)}</h3><small>@${esc(p.username)}</small><p>${p.jobName} • Nível ${p.level}</p></div><button class="ghost" onclick="playerProfile('${p.username}')">Ver perfil</button></div>`).join('')}</div>`;
}
async function playerProfile(u){try{const p=await api("/api/players/"+encodeURIComponent(u));openModal(`<div class="profile-big"><div class="avatar xl">${esc(p.name[0])}</div><span class="tag">CIDADÃO</span><h2>${esc(p.name)}</h2><p>@${esc(p.username)}</p><div class="stats"><div><small>Nível</small><b>${p.level}</b></div><div><small>XP</small><b>${p.xp}</b></div><div><small>Dinheiro</small><b>${money(p.money)}</b></div><div><small>Profissão</small><b>${p.jobName}</b></div></div>`)}catch(e){toast(e.message,"error")}}

async function newsPage(box){
 const ns=await api("/api/news");
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">CENTRAL DE NOTÍCIAS</span><h1>O que acontece na cidade</h1><p>Informações oficiais publicadas pela prefeitura.</p></div></div><div class="news-list">${ns.length?ns.map(n=>{const img = n.image ? `<img src="${esc(n.image)}" onerror="this.style.display='none'">` : ''; const body = (esc(n.body)||'').replace(/\n/g,'<br>'); return `<article class="news-card">${img}<h3>${esc(n.title)}</h3><p>${body}</p><small>Por ${esc(n.author)}</small></article>`}).join(''):'<div class="empty"><div>📭</div><h3>Sem notícias</h3></div>'}</div>`;
}
async function eventsPage(box){
 const es=await api("/api/events");
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">AGENDA DA CIDADE</span><h1>Eventos</h1><p>Veja os próximos acontecimentos de Sorokiba.</p></div></div><div class="events-list">${es.length?es.map(e=>`<div class="event-card"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><small>📅 ${new Date(e.eventDate).toLocaleDateString('pt-BR')}</small></div>`).join(''):'<div class="empty"><div>📅</div><h3>Sem eventos agendados</h3></div>'}</div>`;
}

async function proposalsPage(box){
 const ps=await api("/api/proposals");
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">PARTICIPAÇÃO CÍVICA</span><h1>Propostas</h1><p>Qualquer cidadão pode enviar uma ideia para a prefeitura.</p></div><button class="primary" onclick="proposalModal()">📝 Nova proposta</button></div><div class="proposals-list">${ps.map(p=>`<div class="proposal-card"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><small>Por ${esc(p.author)} • Status: ${p.status}</small>${isMayor?`<button class="primary" onclick="decideProposal('${p.id}','${p.status}')">Decidir</button>`:''}</div>`).join('')}</div>`;
}
function proposalModal(){openModal(`<h2>Nova proposta</h2><p>Explique uma ideia que poderia melhorar Sorokiba.</p><label>Título<input id="propTitle" maxlength="160"></label><label>Descrição<textarea id="propDesc" rows="6" maxlength="500"></textarea></label><button class="primary" onclick="sendProposal()">Enviar</button>`)}
async function sendProposal(){try{const d=await post("/api/proposals",{title:$("#propTitle").value,description:$("#propDesc").value});closeModal();toast(d.message);loadPage("proposals")}catch(e){toast(e.message,"error")}}
async function decideProposal(id,status){openModal(`<h2>Decisão da prefeitura</h2><p>Escolha o resultado e escreva uma resposta pública.</p><div class="decision-row"><button class="primary" onclick="finishDecision('${id}','approved')">✓ Aprovar</button><button class="ghost" onclick="finishDecision('${id}','rejected')">✗ Rejeitar</button></div><label>Resposta<textarea id="decisionText" rows="4"></textarea></label>`)}
async function finishDecision(id,status){try{const d=await post("/api/mayor/proposals/"+id+"/decide",{status,response:$("#decisionText").value});closeModal();toast(d.message);loadPage("proposals")}catch(e){toast(e.message,"error")}}

async function mayorPage(box){
 if(!isMayor){box.innerHTML='<div class="empty"><div>🔒</div><h3>Área restrita</h3><p>Apenas o prefeito pode acessar esta página.</p></div>';return}
 const d=await api("/api/mayor");
 box.innerHTML=`<div class="mayor-banner"><div><span class="tag">🏛️ GABINETE DO PREFEITO</span><h1>Administre Sorokiba.</h1><p>As alterações desta área são salvas diretamente no banco de dados.</p></div></div>
 <div class="stats-grid"><div class="stat-card"><span>👥</span><small>População</small><b>${d.population}</b></div><div class="stat-card"><span>💰</span><small>Tesouro</small><b>${money(d.treasury)}</b></div><div class="stat-card"><span>🏗️</span><small>Infraestrutura</small><b>${d.infrastructure}%</b></div><div class="stat-card"><span>✨</span><small>Qualidade</small><b>${d.quality}%</b></div></div>
 <div class="two-col"><div class="panel"><div class="panel-title"><h3>Indicadores administrativos</h3></div><div class="admin-form"><label>Impostos (%)<input id="tax" type="number" min="0" max="30" value="${d.taxRate}"></label><label>Economia<input id="economy" type="number" min="0" value="${d.economy}"></label><label>Infraestrutura<input id="infra" type="number" min="0" max="100" value="${d.infrastructure}"></label><label>Qualidade<input id="quality" type="number" min="0" max="100" value="${d.quality}"></label><button class="primary" onclick="saveMayor()">Salvar alterações</button></div></div>
 <div class="panel"><div class="panel-title"><h3>Comunicação oficial</h3></div><button class="quick-action" onclick="mayorContent('news')">📰 Publicar notícia</button><button class="quick-action" onclick="mayorContent('events')">📅 Criar evento</button><div style="margin-top:12px"><button class="ghost" onclick="manageQuestions()">✏️ Gerenciar perguntas</button><button class="ghost" onclick="manageRewards()">⚙️ Configurar recompensas</button></div></div></div>`;
}
async function saveMayor(){try{const d=await post("/api/mayor/settings",{tax:Number($("#tax").value),economy:Number($("#economy").value),infrastructure:Number($("#infra").value),quality:Number($("#quality").value)});toast(d.message)}catch(e){toast(e.message,"error")}}
function mayorContent(type){if(type==="news")openModal(`<h2>Publicar notícia</h2><label>Título<input id="nTitle"></label><label>Texto<textarea id="nBody" rows="6"></textarea></label><label>Imagem (URL)<input id="nImage"></label><button class="primary" onclick="publishNews()">Publicar</button>`);else openModal(`<h2>Criar evento</h2><label>Título<input id="eTitle"></label><label>Descrição<textarea id="eDesc" rows="4"></textarea></label><label>Data<input id="eDate" type="date"></label><label>Imagem (URL)<input id="eImage"></label><button class="primary" onclick="publishEvent()">Criar</button>`)}
async function publishNews(){try{const d=await post("/api/mayor/news",{title:$("#nTitle").value,body:$("#nBody").value,image:$("#nImage").value});closeModal();toast(d.message)}catch(e){toast(e.message,"error")}}
async function publishEvent(){try{const d=await post("/api/mayor/events",{title:$("#eTitle").value,description:$("#eDesc").value,eventDate:$("#eDate").value,image:$("#eImage").value});closeModal();toast(d.message)}catch(e){toast(e.message,"error")}}

async function accountPage(box){
 const ach=await api("/api/achievements");
 box.innerHTML=`<div class="profile-header"><div class="avatar xl">${esc(me.name[0])}</div><div><span class="tag">CIDADÃO</span><h1>${esc(me.name)}</h1><p>@${esc(me.username)} · ${esc(me.jobName)}</p></div></div>
 <div class="stats-grid"><div class="stat-card"><span>⭐</span><small>Nível</small><b>${me.level}</b></div><div class="stat-card"><span>✨</span><small>XP</small><b>${me.xp}</b></div><div class="stat-card"><span>💰</span><small>Dinheiro</small><b>${money(me.money)}</b></div></div>
 <div class="section-head"><h3>Conquistas</h3></div><div class="achievements-list">${ach.length?ach.map(a=>`<div class="achievement"><span>${a.icon}</span><div><h4>${a.name}</h4><p>${a.description}</p></div></div>`).join(''):'<p>Nenhuma conquista ainda</p>'}</div>`;
}

// ========== Admin helpers inserted ==========
async function manageQuestions(){
  try{
    const qs = await api('/api/mayor/questions');
    const jobsList = await api('/api/jobs');
    const jobOptions = jobsList.jobs.map(j=>`<option value="${j.id}">${esc(j.name)}</option>`).join('');
    const listHtml = qs.map(q=>`<div class="question-item"><h4>${esc(q.text)}</h4><small>Profissão: ${esc(q.jobId)} • Dif: ${q.difficulty}</small><p>${(q.options||[]).map((o,i)=>`<span class="opt">${i+1}. ${esc(o)}</span>`).join('')}</p><div class="row"><button class="ghost" onclick="editQuestion('${q.id}')">Editar</button><button class="ghost" onclick="deleteQuestion('${q.id}')">Excluir</button></div></div>`).join('')||'<p>Nenhuma pergunta cadastrada</p>';
    openModal(`<h2>Gerenciar perguntas</h2><div><label>Nova pergunta - Profissão<select id="newJob">${jobOptions}</select></label><label>Enunciado<input id="newText"></label><label>Opções (cada uma)<input id="newOpt0" placeholder="Opção 1"><input id="newOpt1" placeholder="Opção 2"><input id="newOpt2" placeholder="Opção 3"><input id="newOpt3" placeholder="Opção 4"></label><label>Índice correto<input id="newCorrect" type="number" min="0" value="0"></label><label>Dificuldade<input id="newDiff" type="number" min="1" max="5" value="1"></label><button class="primary" onclick="addQuestion()">Adicionar</button></div><hr><div class="questions-list">${listHtml}</div>`);
  }catch(e){toast(e.message,'error')}
}

async function addQuestion(){
  try{
    const jobId = $('#newJob').value;
    const text = $('#newText').value;
    const options = [$('#newOpt0').value,$('#newOpt1').value,$('#newOpt2').value,$('#newOpt3').value].filter(Boolean);
    const correct = Number($('#newCorrect').value);
    const difficulty = Number($('#newDiff').value) || 1;
    if(!jobId||!text||options.length<2) { toast('Preencha todos os campos','error'); return }
    const d = await post('/api/mayor/questions',{jobId,text,options,correct,difficulty});
    toast(d.message);
    closeModal();
    manageQuestions();
  }catch(e){toast(e.message,'error')}
}

async function editQuestion(id){
  try{
    const qs = await api('/api/mayor/questions');
    const q = qs.find(x=>x.id===id);
    if(!q) { toast('Pergunta não encontrada','error'); return }
    openModal(`<h2>Editar pergunta</h2><label>Profissão (não editável)<input disabled value="${esc(q.jobId)}"></label><label>Enunciado<input id="editText" value="${esc(q.text)}"></label><label>Opções (um por campo)<input id="editOpt0" value="${esc(q.options[0]||'')}"><input id="editOpt1" value="${esc(q.options[1]||'')}"><input id="editOpt2" value="${esc(q.options[2]||'')}"><input id="editOpt3" value="${esc(q.options[3]||'')}"></label><label>Índice correto<input id="editCorrect" type="number" min="0" value="${q.correct}"></label><label>Dificuldade<input id="editDiff" type="number" min="1" max="5" value="${q.difficulty||1}"></label><button class="primary" onclick="saveQuestion('${q.id}')">Salvar</button><button class="ghost" onclick="closeModal()">Cancelar</button>`);
  }catch(e){toast(e.message,'error')}
}

async function saveQuestion(id){
  try{
    const text = $('#editText').value;
    const options = [$('#editOpt0').value,$('#editOpt1').value,$('#editOpt2').value,$('#editOpt3').value].filter(Boolean);
    const correct = Number($('#editCorrect').value);
    const difficulty = Number($('#editDiff').value) || 1;
    const r = await fetch(`/api/mayor/questions/${id}`,{method:'PUT',headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({text,options,correct,difficulty})});
    const res = await r.json();
    if(!r.ok) throw new Error(res.error||'Erro ao salvar');
    toast('Pergunta atualizada');closeModal();manageQuestions();
  }catch(e){toast(e.message,'error')}
}

async function deleteQuestion(id){
  if(!confirm('Deseja realmente excluir esta pergunta?')) return;
  try{
    const r = await fetch(`/api/mayor/questions/${id}`,{method:'DELETE',headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})}});
    const res = await r.json();
    if(!r.ok) throw new Error(res.error||'Erro ao excluir');
    toast('Pergunta excluída');closeModal();manageQuestions();
  }catch(e){toast(e.message,'error')}
}

async function manageRewards(){
  try{
    const rewards = await api('/api/mayor/rewards');
    const jobsData = await api('/api/jobs');
    const rows = Object.keys(rewards).map(jid=>{const r=rewards[jid];const job = (jobsData.jobs||[]).find(x=>x.id===jid)||{name:jid};return `<div class="reward-row"><h4>${esc(job.name)}</h4><label>Dinheiro por missão<input id="rw_money_${jid}" type="number" value="${r.moneyPerMission||0}"></label><label>XP por missão<input id="rw_xp_${jid}" type="number" value="${r.xpPerMission||0}"></label><label>Perguntas por missão<input id="rw_q_${jid}" type="number" value="${r.questionsPerMission||2}" min="1" max="5"></label></div>`}).join('');
    openModal(`<h2>Configurar recompensas</h2><div>${rows}</div><button class="primary" onclick="saveRewards()">Salvar</button>`);
  }catch(e){toast(e.message,'error')}
}

async function saveRewards(){
  try{
    const rewards = await api('/api/mayor/rewards');
    for(const jid of Object.keys(rewards)){
      const money = Number($(`#rw_money_${jid}`).value);
      const xp = Number($(`#rw_xp_${jid}`).value);
      const q = Number($(`#rw_q_${jid}`).value);
      await post('/api/mayor/rewards',{jobId:jid,moneyPerMission:money,xpPerMission:xp,questionsPerMission:q});
    }
    toast('Recompensas atualizadas');closeModal();
  }catch(e){toast(e.message,'error')}
}


setInterval(async()=>{if(!token||!me)return;try{const d=await api("/api/me");me=d.user;isMayor=d.isMayor;updateHUD();$("#mayorNav").classList.toggle("hidden",!isMayor)}catch{}},60000);
boot();
