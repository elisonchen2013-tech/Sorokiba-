
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let token=localStorage.getItem("sorokiba_token"), me=null, isMayor=false, currentPage="city", timer=null, hospitalPollTimer=null, hospitalServicesCache=[];
let missionModalState = null; // { mission, currentIndex, endAt, timerId }
let missionCooldownUntil = null; // tracks when next mission batch is available

const handleAuthExpired=()=>{
  localStorage.removeItem("sorokiba_token");
  token=null;
  me=null;
  isMayor=false;
  const game=$("#gameView"),auth=$("#authView"),loader=$("#loader");
  if(game)game.classList.add("hidden");
  if(auth)auth.classList.remove("hidden");
  if(loader)loader.classList.add("hidden");
};

const api=async(path,opts={})=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  let r;
  try{
    r=await fetch(path,{...opts,signal:controller.signal,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(opts.headers||{})}});
  }catch(err){
    if(err&&err.name==="AbortError")throw new Error("A cidade demorou para responder. O Render pode estar retomando o serviço; tente novamente.");
    throw new Error("Não foi possível conectar ao servidor.");
  }finally{clearTimeout(timeout)}
  const data=await r.json().catch(()=>({}));
  if(r.status===401 && token){
    handleAuthExpired();
    throw new Error(data.error||"Sua sessão expirou. Entre novamente.");
  }
  if(!r.ok) throw new Error(data.error||"Ocorreu um erro.");
  return data;
};
const post=(p,b)=>api(p,{method:"POST",body:JSON.stringify(b)});const put=(p,b)=>api(p,{method:"PUT",body:JSON.stringify(b)});
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

let bootAttempts=0;
async function boot(){
  bootAttempts++;
  const loader=$("#loader"),auth=$("#authView"),game=$("#gameView");
  try{
    if(loader)loader.classList.remove("hidden");
    const d=await api("/api/me");
    if(!d||!d.user)throw new Error("Não foi possível recuperar o cidadão.");
    me=d.user;isMayor=!!d.isMayor;
    if(auth)auth.classList.add("hidden");
    if(game)game.classList.remove("hidden");
    // A autenticação terminou: o loader não pode continuar cobrindo a página.
    if(loader){
      loader.classList.add("hidden");
      loader.setAttribute("aria-hidden","true");
    }
    $("#mayorNav").classList.toggle("hidden",!isMayor);
    updateHUD();
    if(window.sorokibaKiba&&typeof window.sorokibaKiba.setUser==="function")window.sorokibaKiba.setUser(me);
    window.dispatchEvent(new CustomEvent("sorokiba:game-ready"));
    if(window.sorokibaKiba&&typeof window.sorokibaKiba.start==="function")window.sorokibaKiba.start();
    loadPage("city");
  }catch(e){
    const message=String(e&&e.message||"");
    if(bootAttempts<4 && token){
      if(auth)auth.classList.add("hidden");
      if(game)game.classList.add("hidden");
      if(loader){
        loader.classList.remove("hidden");
        const text=loader.querySelector("span");
        if(text)text.textContent="Reconectando à cidade...";
      }
      setTimeout(boot,1200);
      return;
    }
    if(loader)loader.classList.add("hidden");
    if(game)game.classList.add("hidden");
    if(auth)auth.classList.remove("hidden");
    bootAttempts=0;
    if(message&&!message.includes("sessão expirou"))toast(message,"error");
  }finally{
    if(!token&&loader)loader.classList.add("hidden");
  }
}
function updateHUD(){
  if(!me)return;
  $("#sideName").textContent=me.name;$("#sideJob").textContent=me.jobName;const photo=me.profilePhoto?`<img src="${esc(me.profilePhoto)}" alt="Foto de perfil">`:esc(me.name[0].toUpperCase());$("#avatar").innerHTML=photo;$("#avatarTop").innerHTML=photo;
  $("#moneyTop").textContent=money(me.money);$("#levelVal").textContent=me.level;$("#xpVal").textContent=`${me.xp} XP`;
  [["life",me.life],["hunger",me.hunger],["hydration",me.hydration],["energy",me.energy]].forEach(([k,v])=>{$("#"+k+"Val").textContent=v;$("#"+k+"Bar").style.width=v+"%"});
  $("#lifeBar").parentElement.parentElement.classList.toggle("danger",me.life<=25);
}
function nav(page){
  if(!titles[page])return;
  if(page!=="hospital"&&hospitalPollTimer){clearInterval(hospitalPollTimer);hospitalPollTimer=null}
  currentPage=page;
  $(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  loadPage(page);
  if(innerWidth<900)$("#gameView").classList.remove("menu-open");
}
// Navegação em fase de captura: nenhuma outra camada da interface pode bloquear o clique dos menus.
document.addEventListener("click",function(event){
  const button=event.target.closest&&event.target.closest(".nav-btn");
  if(!button||button.disabled)return;
  event.preventDefault();
  event.stopPropagation();
  nav(button.dataset.page);
},true);
$("#mobileMenu").onclick=()=>$("#gameView").classList.toggle("menu-open");
$("#logoutBtn").onclick=()=>{localStorage.removeItem("sorokiba_token");location.reload()};

const titles={city:["VISÃO GERAL","Cidade"],job:["CARREIRA","Emprego"],missions:["OBJETIVOS","Missões"],inventory:["SEUS ITENS","Inventário"],shop:["MERCADO","Lojas"],pharmacy:["FARMÁCIA","Farmácia Sorokiba"],companies:["NEGÓCIOS","Empresas"],hospital:["SAÚDE","Hospital"],bank:["BANCO","Banco"],players:["COMUNIDADE","Jogadores"],news:["NOTÍCIAS","Notícias"],events:["EVENTOS","Eventos"],proposals:["PROPOSTAS","Propostas"],mayor:["PREFEITURA","Prefeitura"],account:["PERFIL","Conta"]};
let pageLoadToken=0;
async function loadPage(page){
  const myToken=++pageLoadToken;
  if(page!=="hospital"&&hospitalPollTimer){clearInterval(hospitalPollTimer);hospitalPollTimer=null}
  $("#pageEyebrow").textContent=titles[page][0];$("#pageTitle").textContent=titles[page][1];
  const content=$("#content");
  const box=document.createElement("div");
  box.className="page-content";
  content.replaceChildren(box);
  box.innerHTML='<div class="loading-card"><div class="spinner"></div>Carregando...</div>';
  const loadingHintTimer=setTimeout(()=>{
    if(myToken===pageLoadToken&&box.isConnected){
      const loading=box.querySelector(".loading-card");
      if(loading)loading.innerHTML='<div class="spinner"></div><p>Conectando...</p><small>Se demorar, a página mostrará uma opção para tentar novamente.</small>';
    }
  },4000);
  try{
    const renderPromise=(async()=>{
      if(page==="city")await cityPage(box);
      else if(page==="job")await jobPage(box);
      else if(page==="missions")await missionsPage(box);
      else if(page==="inventory")await inventoryPage(box);
      else if(page==="shop")await shopPage(box);
      else if(page==="pharmacy")await pharmacyStorePage(box);
      else if(page==="companies")await companiesPage(box);
      else if(page==="hospital")await hospitalPage(box);
      else if(page==="bank")await bankPage(box);
      else if(page==="players")await playersPage(box);
      else if(page==="news")await newsPage(box);
      else if(page==="events")await eventsPage(box);
      else if(page==="proposals")await proposalsPage(box);
      else if(page==="mayor")await mayorPage(box);
      else if(page==="account")await accountPage(box);
    })();
    await Promise.race([
      renderPromise,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("Esta página demorou demais para responder. Tente novamente em alguns segundos.")),12000))
    ]);
    clearTimeout(loadingHintTimer);
    if(myToken!==pageLoadToken)return;
  }catch(e){
    clearTimeout(loadingHintTimer);
    if(myToken!==pageLoadToken||!box.isConnected)return;
    box.innerHTML=`<div class="empty"><div>⚠️</div><h3>Não foi possível carregar</h3><p>${esc(e.message)}</p><button class="primary" type="button" onclick="loadPage('${esc(page)}')">Tentar novamente</button></div>`;
  }
}

function renderSafeHomeCarousel(box){
  if(!box||!box.isConnected||box.querySelector(".soro-home-carousel"))return;
  if(!document.getElementById("sorokiba-safe-carousel-style")){
    const st=document.createElement("style");
    st.id="sorokiba-safe-carousel-style";
    st.textContent=`
      .soro-home-carousel.safe-fallback{height:360px;min-height:360px;position:relative;overflow:hidden;margin:0 0 24px;border-radius:24px;border:1px solid var(--line);background:linear-gradient(135deg,#16223b,#314d69);color:#fff;box-shadow:0 20px 55px rgba(0,0,0,.22)}
      .soro-home-carousel.safe-fallback .sf-slide{position:absolute;inset:0;padding:38px 44px 78px;display:none;align-items:center;background:var(--sf-bg)}
      .soro-home-carousel.safe-fallback .sf-slide.active{display:flex}
      .soro-home-carousel.safe-fallback .sf-content{max-width:700px;position:relative;z-index:2}
      .soro-home-carousel.safe-fallback .sf-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;opacity:.78}
      .soro-home-carousel.safe-fallback h2{margin:10px 0 8px;font-size:clamp(30px,4vw,46px);line-height:1.05}
      .soro-home-carousel.safe-fallback p{max-width:620px;margin:0;color:rgba(255,255,255,.82);line-height:1.5}
      .soro-home-carousel.safe-fallback .sf-sky{position:absolute;inset:0;background:radial-gradient(circle at 78% 30%,rgba(255,225,145,.42),transparent 18%),linear-gradient(180deg,rgba(73,153,212,.35),transparent 55%);pointer-events:none}
      .soro-home-carousel.safe-fallback .sf-city{position:absolute;left:45%;right:3%;bottom:43px;height:155px;display:flex;align-items:flex-end;gap:7px;z-index:1}
      .soro-home-carousel.safe-fallback .sf-city i{display:block;width:clamp(25px,5vw,58px);background:linear-gradient(90deg,#1b2934,#52636f 50%,#1c2730);border-radius:2px 2px 0 0}
      .soro-home-carousel.safe-fallback .sf-city i:nth-child(1){height:56px}.soro-home-carousel.safe-fallback .sf-city i:nth-child(2){height:100px}.soro-home-carousel.safe-fallback .sf-city i:nth-child(3){height:73px}.soro-home-carousel.safe-fallback .sf-city i:nth-child(4){height:137px}.soro-home-carousel.safe-fallback .sf-city i:nth-child(5){height:88px}.soro-home-carousel.safe-fallback .sf-city i:nth-child(6){height:116px}
      .soro-home-carousel.safe-fallback .sf-road{position:absolute;left:0;right:0;bottom:0;height:43px;background:#151b22;z-index:3}
      .soro-home-carousel.safe-fallback .sf-road:after{content:"";position:absolute;left:7%;right:7%;top:19px;height:2px;background:repeating-linear-gradient(90deg,#e5d28a 0 32px,transparent 32px 68px);opacity:.45}
      .soro-home-carousel.safe-fallback .sf-nav{position:absolute;left:20px;right:20px;bottom:12px;z-index:10;display:flex;justify-content:space-between;align-items:center}
      .soro-home-carousel.safe-fallback button{border:1px solid rgba(255,255,255,.2);background:rgba(2,8,16,.65);color:#fff;border-radius:999px;cursor:pointer}
      .soro-home-carousel.safe-fallback .sf-arrow{width:38px;height:38px;font-size:24px}
      .soro-home-carousel.safe-fallback .sf-dots{display:flex;gap:8px;padding:7px 10px}
      .soro-home-carousel.safe-fallback .sf-dot{width:9px;height:9px;padding:0}.soro-home-carousel.safe-fallback .sf-dot.active{width:25px}
    `;
    document.head.appendChild(st);
  }
  const root=document.createElement("section");
  root.className="soro-home-carousel safe-fallback";
  root.setAttribute("aria-label","Carrossel da Cidade de Sorokiba");
  const slides=[
    ["🌙 SOROKIBA • BOA NOITE","Boa noite, cidadão!","A cidade continua viva sob a Lua, com prédios iluminados e ruas movimentadas.","linear-gradient(180deg,#050914,#10243e)"],
    ["🏙️ SOROKIBA • CIDADE","Sorokiba hoje.","Explore a cidade, acompanhe sua carreira, suas missões e tudo o que está acontecendo por aqui.","linear-gradient(180deg,#276f9d,#87c4d0 58%,#8b927d)"],
    ["🚀 SOROKIBA • FUTURO","O futuro de Sorokiba começa agora.","Tecnologia, trabalho e novos sistemas continuam transformando a cidade.","linear-gradient(135deg,#0a1220,#284362)"]
  ];
  root.innerHTML=slides.map((s,i)=>'<article class="sf-slide '+(i===0?'active':'')+'" style="--sf-bg:'+s[3]+'"><div class="sf-sky"></div><div class="sf-content"><div class="sf-kicker">'+s[0]+'</div><h2>'+s[1]+'</h2><p>'+s[2]+'</p></div><div class="sf-city"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="sf-road"></div></article>').join("")+
    '<div class="sf-nav"><div class="sf-dots">'+slides.map((_,i)=>'<button class="sf-dot '+(i===0?'active':'')+'" data-i="'+i+'" type="button" aria-label="Slide '+(i+1)+'"></button>').join("")+'</div><div><button class="sf-arrow" data-prev type="button" aria-label="Anterior">‹</button><button class="sf-arrow" data-next type="button" aria-label="Próximo">›</button></div></div>';
  box.prepend(root);
  const scenes=[...root.querySelectorAll(".sf-slide")],dots=[...root.querySelectorAll(".sf-dot")];
  let current=0,timer=null;
  const draw=()=>{scenes.forEach((s,i)=>s.classList.toggle("active",i===current));dots.forEach((d,i)=>d.classList.toggle("active",i===current))};
  const restart=()=>{clearInterval(timer);timer=setInterval(()=>{current=(current+1)%scenes.length;draw()},6500)};
  root.querySelector("[data-prev]").onclick=()=>{current=(current+scenes.length-1)%scenes.length;draw();restart()};
  root.querySelector("[data-next]").onclick=()=>{current=(current+1)%scenes.length;draw();restart()};
  dots.forEach(d=>d.onclick=()=>{current=Number(d.dataset.i)||0;draw();restart()});
  root.addEventListener("mouseenter",()=>clearInterval(timer));
  root.addEventListener("mouseleave",restart);
  window.__sorokibaSafeCarouselCleanup=()=>{clearInterval(timer);if(root.parentNode)root.remove()};
  restart();
}

async function cityPage(box){
  // Renderiza o carrossel imediatamente. Assim, uma demora do backend não deixa a Cidade em branco.
  const first=esc((me.name||"Chen").split(" ")[0]);
  const job=esc(me.jobName||"Cidadão");
  box.innerHTML=`
 <div class="section-head"><div><span class="eyebrow">STATUS DA CIDADE</span><h3>Sorokiba hoje</h3></div><span class="live"><i></i> AO VIVO</span></div>
 <div class="stats-grid"><div class="stat-card"><span>👥</span><small>População</small><b id="cityPopulation">—</b><em>cidadãos</em></div><div class="stat-card"><span>📈</span><small>Economia</small><b id="cityEconomy">—</b></div><div class="stat-card"><span>🏗️</span><small>Infraestrutura</small><b id="cityInfrastructure">—</b></div><div class="stat-card"><span>✨</span><small>Qualidade</small><b id="cityQuality">—</b></div></div>
 <div class="two-col"><div class="panel"><div class="panel-title"><h3>Atalhos</h3></div><div class="quick-grid"><button onclick="nav('job')">💼<b>Minha carreira</b><small>Ver profissões</small></button><button onclick="nav('shop')">🛒<b>Lojas</b><small>Compre produtos</small></button><button onclick="nav('companies')">🏢<b>Empresas</b><small>Gerencie seus negócios</small></button><button onclick="nav('missions')">🎯<b>Missões</b><small>Ganhe XP</small></button></div></div>
 <div class="panel health-panel"><div class="panel-title"><h3>Seu cidadão</h3><span>Nível ${me.level}</span></div><p>Profissão atual: <b>${job}</b></p><div class="mini-bars"><div><span>❤️</span><i style="width:${me.life}%"></i></div><div><span>🍽️</span><i style="width:${me.hunger}%"></i></div></div></div></div>`;
  // Primeiro mostramos uma versão segura imediatamente; o carrossel completo substitui esta versão quando estiver pronto.
  renderSafeHomeCarousel(box);
  const carouselPromise=homeCarousel(box);
  Promise.resolve(carouselPromise).catch(()=>{if(box.isConnected&&!box.querySelector(".soro-home-carousel"))renderSafeHomeCarousel(box)});
  setTimeout(()=>{
    if(box.isConnected&&!box.querySelector(".soro-home-carousel"))renderSafeHomeCarousel(box);
  },1800);
  try{
    const c=await api("/api/city");
    const p=box.querySelector("#cityPopulation"),e=box.querySelector("#cityEconomy"),inf=box.querySelector("#cityInfrastructure"),q=box.querySelector("#cityQuality");
    if(p)p.textContent=Number(c.population||0).toLocaleString("pt-BR");
    if(e)e.textContent=money(c.economy);
    if(inf)inf.textContent=(c.infrastructure??0)+"%";
    if(q)q.textContent=(c.quality??0)+"%";
  }catch(err){
    const stats=box.querySelector(".stats-grid");
    if(stats)stats.insertAdjacentHTML("afterend",'<div class="empty" style="margin-bottom:18px;padding:18px">⚠️ O servidor da cidade está demorando para responder. Os atalhos e o carrossel continuam disponíveis.</div>');
  }
}


async function homeCarousel(box){
  if(!box)return;
  if(window.__sorokibaHomeCarouselCleanup)window.__sorokibaHomeCarouselCleanup();
  // Mantém o carrossel seguro na tela até o carrossel completo terminar de montar.
  box.querySelectorAll('.hero,.soro-carousel,.soro-home-carousel:not(.safe-fallback),#soro-carousel-v3').forEach(el=>el.remove());

  if(!document.getElementById('sorokiba-city-carousel-styles')){
    const style=document.createElement('style');
    style.id='sorokiba-city-carousel-styles';
    style.textContent=[
      '.soro-home-carousel{position:relative;width:100%;min-height:360px;height:360px;margin:0 0 24px;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#0a111b;color:#fff;box-shadow:0 20px 55px rgba(0,0,0,.22);isolation:isolate}',
      '.soro-home-carousel .sc-track,.soro-home-carousel .sc-scene{position:absolute;inset:0}',
      '.soro-home-carousel .sc-scene{opacity:0;pointer-events:none;transition:opacity .5s ease,transform .65s ease;transform:scale(.99);overflow:hidden}',
      '.soro-home-carousel .sc-scene.active{opacity:1;transform:scale(1);pointer-events:auto}',
      '.soro-home-carousel .sc-content{position:relative;z-index:20;min-height:100%;box-sizing:border-box;padding:34px 42px 74px;display:flex;flex-direction:column;justify-content:center;max-width:72%}',
      '.soro-home-carousel h2{margin:0;max-width:760px;font-size:clamp(28px,4vw,46px);line-height:1.02;letter-spacing:-.035em;text-shadow:0 2px 18px rgba(0,0,0,.24)}',
      '.soro-home-carousel .sc-kicker{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;opacity:.78;margin-bottom:10px}',
      '.soro-home-carousel .sc-text{max-width:650px;margin:13px 0 0;font-size:clamp(14px,1.7vw,17px);line-height:1.55;opacity:.9}',
      '.soro-home-carousel .sc-panel{margin-top:16px;max-width:610px;padding:13px 15px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(4,10,20,.45);backdrop-filter:blur(10px)}',
      '.soro-home-carousel .sc-nav{position:absolute;z-index:50;left:22px;right:22px;bottom:17px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.soro-home-carousel .sc-dots{display:flex;gap:8px;align-items:center;padding:7px 10px;border-radius:999px;background:rgba(2,8,16,.62);backdrop-filter:blur(10px)}',
      '.soro-home-carousel .sc-dot{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer;transition:.25s ease}',
      '.soro-home-carousel .sc-dot.active{width:26px;border-radius:99px;background:#fff;box-shadow:0 0 16px rgba(255,255,255,.42)}',
      '.soro-home-carousel .sc-arrows{display:flex;gap:7px}',
      '.soro-home-carousel .sc-arrow{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(2,8,16,.62);color:#fff;font-size:25px;line-height:1;cursor:pointer;backdrop-filter:blur(9px)}',
      '.soro-home-carousel .sc-arrow:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.35)}',
      '.soro-home-carousel .sc-ground{position:absolute;left:0;right:0;bottom:0;height:105px;z-index:8}',
      '.soro-home-carousel .sc-road{position:absolute;left:-4%;right:-4%;bottom:0;height:43px;background:linear-gradient(180deg,#3a4247,#11161b 65%);z-index:14;box-shadow:0 -5px 16px rgba(0,0,0,.25)}',
      '.soro-home-carousel .sc-road:after{content:"";position:absolute;left:7%;right:7%;top:19px;height:2px;background:repeating-linear-gradient(90deg,#e5d28a 0 32px,transparent 32px 68px);opacity:.38}',
      '.soro-home-carousel .sc-sidewalk{position:absolute;left:-4%;right:-4%;bottom:43px;height:24px;background:linear-gradient(#b5aa95,#756f65);z-index:13;box-shadow:0 -2px 7px rgba(0,0,0,.18)}',
      '.soro-home-carousel .sc-sun{position:absolute;left:73%;bottom:126px;width:76px;height:76px;border-radius:50%;z-index:5;transform:translateX(-50%)}',
      '.soro-home-carousel .sc-sun.morning{background:radial-gradient(circle,#fff1b0 0 22%,#f6a45d 55%,#df7139 72%,transparent 74%);box-shadow:0 0 26px rgba(246,164,93,.55)}',
      '.soro-home-carousel .sc-sun.afternoon{width:106px;height:106px;background:radial-gradient(circle,#fffde0 0 20%,#ffe681 47%,#f3ad3c 68%,transparent 72%);box-shadow:0 0 34px rgba(255,218,110,.72),0 0 70px rgba(247,173,52,.24)}',
      '.soro-home-carousel .sc-sky-haze{position:absolute;inset:0;background:radial-gradient(ellipse at 72% 58%,rgba(255,190,90,.16),transparent 36%);z-index:4;pointer-events:none}',
      '.soro-home-carousel .sc-mountain{position:absolute;bottom:75px;height:150px;clip-path:polygon(0 100%,0 68%,12% 42%,23% 63%,35% 20%,48% 58%,61% 31%,75% 65%,88% 38%,100% 66%,100% 100%);z-index:2}',
      '.soro-home-carousel .sc-mountain.far{left:-5%;right:-5%;height:126px;background:#7e8b9a;opacity:.6;filter:blur(.3px)}',
      '.soro-home-carousel .sc-mountain.mid{left:-4%;right:8%;height:151px;background:#4f6170;opacity:.8}',
      '.soro-home-carousel .sc-mountain.near{left:12%;right:-8%;height:174px;background:#344650;z-index:3}',
      '.soro-home-carousel .sc-mountain.near:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,196,123,.2),transparent 38%,rgba(0,0,0,.18));}',
      '.soro-home-carousel .sc-mist{position:absolute;left:0;right:0;bottom:78px;height:85px;background:radial-gradient(ellipse at 25% 55%,rgba(235,244,239,.28),transparent 33%),radial-gradient(ellipse at 68% 42%,rgba(242,247,243,.24),transparent 31%);filter:blur(10px);z-index:4}',
      '.soro-home-carousel .sc-path{position:absolute;left:27%;bottom:43px;width:230px;height:105px;background:linear-gradient(175deg,transparent 0 30%,#b9a77f 31% 72%,#87765d 73%);clip-path:polygon(43% 0,57% 0,78% 100%,22% 100%);z-index:9;opacity:.9}',
      '.soro-home-carousel .sc-pine{position:absolute;bottom:61px;width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:92px solid #21382f;z-index:10;filter:drop-shadow(0 5px 4px rgba(0,0,0,.18))}',
      '.soro-home-carousel .sc-pine:after{content:"";position:absolute;left:-13px;top:30px;border-left:13px solid transparent;border-right:13px solid transparent;border-bottom:58px solid #29493c}',
      '.soro-home-carousel .sc-pine.a{left:5%}.soro-home-carousel .sc-pine.b{left:17%;transform:scale(.72)}.soro-home-carousel .sc-pine.c{right:7%;transform:scale(.9)}',
      '.soro-home-carousel .sc-city-distance{position:absolute;left:58%;right:8%;bottom:76px;height:74px;z-index:6;display:flex;align-items:flex-end;gap:5px;opacity:.72}',
      '.soro-home-carousel .sc-city-distance i{display:block;width:12px;background:#43525a;border-radius:1px 1px 0 0;box-shadow:inset 0 8px rgba(255,255,255,.06)}',
      '.soro-home-carousel .sc-city-distance i:nth-child(1){height:28px}.soro-home-carousel .sc-city-distance i:nth-child(2){height:45px}.soro-home-carousel .sc-city-distance i:nth-child(3){height:34px}.soro-home-carousel .sc-city-distance i:nth-child(4){height:60px}.soro-home-carousel .sc-city-distance i:nth-child(5){height:39px}.soro-home-carousel .sc-city-distance i:nth-child(6){height:52px}',
      '.soro-home-carousel .sc-city-distance i:after{content:"";display:block;width:3px;height:3px;margin:8px 3px;background:#e9cf91;box-shadow:6px 0 #e9cf91,0 9px #e9cf91,6px 9px #e9cf91;opacity:.55}',
      '.soro-home-carousel .sc-urban{position:absolute;left:0;right:0;bottom:43px;height:155px;z-index:7;display:flex;align-items:flex-end;justify-content:center;gap:7px;padding:0 5%;box-sizing:border-box}',
      '.soro-home-carousel .sc-building{position:relative;flex:0 0 auto;width:clamp(30px,5vw,64px);background:linear-gradient(90deg,#1c2730,#40505a 48%,#202b34);border-radius:2px 2px 0 0;box-shadow:inset -7px 0 12px rgba(0,0,0,.2),0 -5px 12px rgba(0,0,0,.12)}',
      '.soro-home-carousel .sc-building:before{content:"";position:absolute;left:8px;right:8px;top:13px;bottom:10px;background:repeating-linear-gradient(90deg,rgba(255,224,142,.75) 0 5px,transparent 5px 13px),repeating-linear-gradient(180deg,rgba(255,224,142,.72) 0 5px,transparent 5px 14px);background-size:13px 14px;opacity:.58}',
      '.soro-home-carousel .sc-building:after{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:rgba(255,255,255,.15)}',
      '.soro-home-carousel .sc-building.b1{height:72px}.soro-home-carousel .sc-building.b2{height:112px;width:42px}.soro-home-carousel .sc-building.b3{height:86px}.soro-home-carousel .sc-building.b4{height:144px;width:58px;background:linear-gradient(90deg,#16232d,#53616a 48%,#1a252d)}.soro-home-carousel .sc-building.b5{height:98px}.soro-home-carousel .sc-building.b6{height:126px;width:47px}.soro-home-carousel .sc-building.b7{height:78px}.soro-home-carousel .sc-building.b8{height:54px;width:34px}.soro-home-carousel .sc-building.b9{height:92px;width:38px}.soro-home-carousel .sc-building.b10{height:118px;width:44px}.soro-home-carousel .sc-building.b11{height:67px;width:32px}',
      '.soro-home-carousel .sc-store{position:absolute;bottom:43px;left:6%;width:74px;height:48px;background:#6e5c4b;border-radius:4px 4px 0 0;z-index:11;box-shadow:0 7px 10px rgba(0,0,0,.2)}',
      '.soro-home-carousel .sc-store:before{content:"";position:absolute;left:6px;right:6px;top:8px;height:18px;background:#24333a;box-shadow:inset 0 0 0 2px rgba(255,255,255,.1)}',
      '.soro-home-carousel .sc-lamp{position:absolute;bottom:66px;width:3px;height:75px;background:#20282d;z-index:15}.soro-home-carousel .sc-lamp:before{content:"";position:absolute;left:-7px;top:-4px;width:17px;height:10px;border-radius:50%;background:#ffe7a0;box-shadow:0 0 12px rgba(255,231,160,.48)}',
      '.soro-home-carousel .sc-lamp.a{left:23%}.soro-home-carousel .sc-lamp.b{right:24%}',
      '.soro-home-carousel .sc-car{position:absolute;bottom:49px;width:42px;height:14px;background:#26343b;border-radius:9px 11px 4px 4px;z-index:16;box-shadow:inset -5px 0 0 rgba(0,0,0,.16),0 3px 5px rgba(0,0,0,.2)}.soro-home-carousel .sc-car:before{content:"";position:absolute;left:9px;top:-7px;width:22px;height:8px;background:#3e515b;border-radius:7px 8px 1px 1px}.soro-home-carousel .sc-car:after{content:"";position:absolute;left:6px;right:5px;bottom:-3px;height:5px;background:radial-gradient(circle at 15% 50%,#111 0 3px,transparent 3.5px),radial-gradient(circle at 85% 50%,#111 0 3px,transparent 3.5px)}.soro-home-carousel .sc-car.car-a{left:-55px;animation:scDrive 15s linear infinite}.soro-home-carousel .sc-car.car-b{right:-55px;animation:scDriveBack 18s linear infinite}',
      '.soro-home-carousel .sc-night-window{opacity:.82}.soro-home-carousel .sc-night-window:before{background:repeating-linear-gradient(90deg,rgba(255,213,105,.9) 0 5px,transparent 5px 13px),repeating-linear-gradient(180deg,rgba(255,213,105,.82) 0 5px,transparent 5px 14px)}',
      '.soro-home-carousel .sc-stars{position:absolute;inset:0;z-index:1;background-image:radial-gradient(circle at 8% 18%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 18% 32%,rgba(255,255,255,.78) 0 1px,transparent 1.8px),radial-gradient(circle at 31% 11%,rgba(255,255,255,.8) 0 1px,transparent 1.8px),radial-gradient(circle at 44% 25%,rgba(255,255,255,.72) 0 1px,transparent 1.8px),radial-gradient(circle at 57% 13%,rgba(255,255,255,.9) 0 1px,transparent 1.8px),radial-gradient(circle at 69% 29%,rgba(255,255,255,.7) 0 1px,transparent 1.8px),radial-gradient(circle at 82% 15%,rgba(255,255,255,.82) 0 1px,transparent 1.8px),radial-gradient(circle at 94% 33%,rgba(255,255,255,.72) 0 1px,transparent 1.8px),radial-gradient(circle at 25% 46%,rgba(255,255,255,.62) 0 1px,transparent 1.8px),radial-gradient(circle at 88% 49%,rgba(255,255,255,.65) 0 1px,transparent 1.8px)}',
      '.soro-home-carousel .sc-moon{position:absolute;right:13%;top:34px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 34% 32%,#fffdf0,#eee7c0 62%,#c8c1a2);box-shadow:0 0 22px rgba(247,240,197,.55);z-index:3}',
      '.soro-home-carousel .sc-meteor{position:absolute;width:74px;height:2px;background:linear-gradient(90deg,transparent,#fff);opacity:0;transform:rotate(-27deg);animation:scMeteor 8s linear infinite;z-index:4}.soro-home-carousel .sc-meteor.one{left:16%;top:70px}.soro-home-carousel .sc-meteor.two{left:52%;top:120px;animation-delay:4s}',
      '.soro-home-carousel .sc-company-vehicle{position:absolute;left:0;right:0;bottom:0;height:62px;overflow:hidden;z-index:21;pointer-events:none}.soro-home-carousel .sc-company-vehicle .sc-mini-car{position:absolute;left:-80px;bottom:6px;width:52px;height:18px;transform:scale(.7);transform-origin:center bottom;animation:scCompanyVehiclePass 12s linear forwards;background:var(--vc-body);border-radius:10px 12px 4px 4px;box-shadow:inset -7px 0 0 var(--vc-secondary),0 3px 5px rgba(0,0,0,.25)}.soro-home-carousel .sc-company-vehicle .sc-mini-car:before{content:"";position:absolute;left:9px;top:-9px;width:30px;height:11px;background:var(--vc-secondary);border-radius:9px 11px 2px 2px;box-shadow:inset 0 2px 0 var(--vc-window)}.soro-home-carousel .sc-company-vehicle .sc-mini-car:after{content:"";position:absolute;left:4px;right:4px;bottom:-4px;height:7px;background:radial-gradient(circle at 15% 50%,var(--vc-wheel) 0 3px,transparent 3.5px),radial-gradient(circle at 85% 50%,var(--vc-wheel) 0 3px,transparent 3.5px)}@keyframes scCompanyVehiclePass{0%{left:-80px}100%{left:calc(100% + 80px)}}','.soro-home-carousel .sc-snow{position:absolute;inset:-40px 0 0;z-index:18;background-image:radial-gradient(circle,rgba(255,255,255,.92) 1px,transparent 2px),radial-gradient(circle,rgba(255,255,255,.72) 2px,transparent 3px);background-size:31px 31px,71px 71px;animation:scSnow 9s linear infinite;opacity:.72}',
      '.soro-home-carousel .sc-winter-city .sc-building{background:linear-gradient(90deg,#263642,#60727c 48%,#293740)}.soro-home-carousel .sc-winter-city .sc-building:before{opacity:.35}',
      '.soro-home-carousel .sc-snowbank{position:absolute;bottom:43px;left:-5%;right:-5%;height:32px;background:linear-gradient(#e8f0f1,#b8c9ce);z-index:12;clip-path:polygon(0 52%,8% 30%,17% 55%,27% 24%,37% 56%,49% 28%,61% 58%,74% 20%,86% 54%,100% 30%,100% 100%,0 100%)}',
      '.soro-home-carousel .sc-ice{position:absolute;bottom:43px;width:120px;height:8px;border-radius:50%;background:rgba(202,235,241,.7);filter:blur(1px);z-index:13}.soro-home-carousel .sc-ice.a{left:18%}.soro-home-carousel .sc-ice.b{right:15%;width:90px}',
      '.soro-home-carousel .sc-flowers{position:absolute;left:0;right:0;bottom:43px;height:90px;z-index:11;overflow:hidden}',
      '.soro-home-carousel .sc-flower{position:absolute;bottom:5px;width:5px;height:42px;background:#3f7048;transform-origin:bottom}.soro-home-carousel .sc-flower:before{content:"✿";position:absolute;left:-7px;top:-13px;font-size:20px;text-shadow:0 1px 2px rgba(0,0,0,.2)}',
      '.soro-home-carousel .sc-flower.pink:before{color:#f59ab5}.soro-home-carousel .sc-flower.yellow:before{color:#ffd75f}.soro-home-carousel .sc-flower.white:before{color:#fff}.soro-home-carousel .sc-flower.purple:before{color:#c9a5f5}',
      '.soro-home-carousel .sc-tree{position:absolute;bottom:43px;width:112px;height:128px;z-index:10}.soro-home-carousel .sc-tree:before{content:"";position:absolute;left:51px;bottom:0;width:12px;height:66px;background:#5b4431}.soro-home-carousel .sc-tree:after{content:"";position:absolute;left:0;top:0;width:112px;height:92px;border-radius:50%;background:#4f8c55;box-shadow:-35px 18px 0 -9px #609c5d,35px 20px 0 -7px #3f7949,0 35px 0 -11px #70a865}.soro-home-carousel .sc-tree.a{left:4%}.soro-home-carousel .sc-tree.b{right:7%;transform:scale(.78)}',
      '.soro-home-carousel .sc-path-park{position:absolute;left:32%;bottom:43px;width:250px;height:100px;background:#c4b08c;clip-path:polygon(42% 0,58% 0,88% 100%,12% 100%);z-index:9}',
      '.soro-home-carousel .sc-bench{position:absolute;bottom:71px;left:49%;width:68px;height:8px;background:#6d4c34;border-radius:3px;z-index:13;box-shadow:0 13px 0 -2px #4a3629}.soro-home-carousel .sc-bench:before{content:"";position:absolute;left:7px;top:5px;width:4px;height:18px;background:#4a3629;box-shadow:50px 0 #4a3629}',
      '.soro-home-carousel .sc-petal{position:absolute;top:-10px;width:7px;height:10px;border-radius:70% 30%;background:#f39ab3;animation:scPetal 7s linear infinite;z-index:17}.soro-home-carousel .sc-petal.a{left:24%;animation-delay:1s}.soro-home-carousel .sc-petal.b{left:54%;animation-delay:3s}.soro-home-carousel .sc-petal.c{left:72%;animation-delay:5s}',
      '.soro-home-carousel .sc-butterfly{position:absolute;font-size:15px;animation:scButterfly 9s ease-in-out infinite;z-index:18}.soro-home-carousel .sc-butterfly.a{left:62%;top:35%}.soro-home-carousel .sc-butterfly.b{left:73%;top:48%;animation-delay:3s}',
      '.soro-home-carousel .sc-work-panel{margin-top:16px;width:min(390px,100%);padding:14px 16px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(9,15,29,.55);backdrop-filter:blur(12px)}',
      '.soro-home-carousel .sc-work-icon{float:right;font-size:28px}.soro-home-carousel .sc-work-panel b{display:block;font-size:18px}.soro-home-carousel .sc-work-panel small{display:block;opacity:.65;margin-top:3px}',
      '.soro-home-carousel .sc-office{position:absolute;right:7%;bottom:43px;width:270px;height:195px;border-radius:14px 14px 0 0;background:linear-gradient(145deg,#2d3948,#121925);border:1px solid rgba(255,255,255,.13);z-index:7;box-shadow:0 25px 45px rgba(0,0,0,.25);transform:skewY(-2deg)}',
      '.soro-home-carousel .sc-office:before{content:"";position:absolute;left:18px;right:18px;top:22px;height:88px;background:linear-gradient(145deg,#5c7582,#18252f);border:5px solid #252e38;box-shadow:inset 0 0 30px rgba(143,205,221,.18)}',
      '.soro-home-carousel .sc-desk{position:absolute;right:15%;bottom:43px;width:240px;height:16px;background:#6b5745;border-radius:5px;z-index:10}.soro-home-carousel .sc-monitor{position:absolute;right:27%;bottom:59px;width:74px;height:49px;background:#111820;border:4px solid #303c47;border-radius:4px;z-index:11}.soro-home-carousel .sc-monitor:after{content:"";position:absolute;left:29px;bottom:-13px;width:10px;height:10px;background:#303c47}',
      '.soro-home-carousel .sc-phone{position:absolute;right:8%;top:45px;width:230px;height:270px;border:7px solid #161a20;border-radius:30px;background:#f7f8fa;color:#17202a;z-index:22;box-shadow:0 25px 55px rgba(0,0,0,.38);overflow:hidden}',
      '.soro-home-carousel .sc-phone-notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:92px;height:20px;background:#161a20;border-radius:0 0 14px 14px;z-index:5}',
      '.soro-home-carousel .sc-phone-status{height:31px;padding:7px 14px 0;box-sizing:border-box;font-size:10px;font-weight:800;display:flex;justify-content:space-between}.soro-home-carousel .sc-phone-head{padding:11px 14px;border-top:1px solid #e4e7eb;border-bottom:1px solid #e4e7eb;font-weight:900;font-size:12px;display:flex;justify-content:space-between}',
      '.soro-home-carousel .sc-news-list{padding:10px;display:grid;gap:7px}.soro-home-carousel .sc-news-card{padding:9px;border-radius:9px;background:#fff;border:1px solid #e2e6eb;box-shadow:0 2px 7px rgba(20,30,40,.08)}.soro-home-carousel .sc-news-card.main{background:#eef4ff}.soro-home-carousel .sc-news-card b{display:block;font-size:11px;line-height:1.25}.soro-home-carousel .sc-news-card small{display:block;font-size:8px;line-height:1.35;color:#66717e;margin-top:4px}',
      '.soro-home-carousel .sc-category{display:inline-block;margin:0 3px 3px 0;padding:3px 6px;border-radius:99px;background:#e8edf4;font-size:7px;font-weight:800;color:#4d5965}',
      '.soro-home-carousel .sc-future-city{position:absolute;left:0;right:0;bottom:43px;height:195px;z-index:7;display:flex;align-items:flex-end;justify-content:center;gap:8px;padding:0 8%}',
      '.soro-home-carousel .sc-future-building{position:relative;width:clamp(35px,5vw,66px);background:linear-gradient(135deg,#26334a,#5c6d83 48%,#1a2434);clip-path:polygon(8% 100%,8% 14%,38% 0,92% 12%,92% 100%);box-shadow:0 0 18px rgba(95,190,230,.08)}',
      '.soro-home-carousel .sc-future-building:before{content:"";position:absolute;inset:18px 8px 10px;background:repeating-linear-gradient(90deg,rgba(105,231,255,.55) 0 3px,transparent 3px 12px),repeating-linear-gradient(180deg,rgba(105,231,255,.55) 0 3px,transparent 3px 15px);opacity:.5}.soro-home-carousel .sc-future-building.f1{height:118px}.soro-home-carousel .sc-future-building.f2{height:165px;width:52px}.soro-home-carousel .sc-future-building.f3{height:138px}.soro-home-carousel .sc-future-building.f4{height:190px;width:60px}.soro-home-carousel .sc-future-building.f5{height:150px}',
      '.soro-home-carousel .sc-holo{position:absolute;padding:8px 11px;border:1px solid rgba(91,225,255,.45);border-radius:9px;background:rgba(56,206,242,.08);color:#b9f5ff;font-size:9px;letter-spacing:.08em;box-shadow:0 0 20px rgba(69,220,255,.1);z-index:12;animation:scFloat 4s ease-in-out infinite}.soro-home-carousel .sc-holo.one{right:10%;top:26%}.soro-home-carousel .sc-holo.two{left:9%;top:42%;animation-delay:1.5s}',
      '.soro-home-carousel .sc-future-light{position:absolute;left:0;right:0;bottom:43px;height:55px;background:radial-gradient(ellipse at 50% 70%,rgba(66,211,240,.17),transparent 60%);z-index:5}',
      '@keyframes scDrive{0%{transform:translateX(0)}100%{transform:translateX(calc(100vw + 110px))}}@keyframes scDriveBack{0%{transform:translateX(0)}100%{transform:translateX(calc(-100vw - 110px))}}@keyframes scSnow{from{transform:translateY(-35px)}to{transform:translateY(120px)}}@keyframes scMeteor{0%,100%{opacity:0;transform:translate(0,0) rotate(-27deg)}7%{opacity:.9}22%{opacity:0;transform:translate(150px,80px) rotate(-27deg)}}@keyframes scPetal{0%{transform:translate3d(0,0,0) rotate(0)}100%{transform:translate3d(120px,300px,0) rotate(260deg)}}@keyframes scButterfly{0%,100%{transform:translate(0,0)}50%{transform:translate(28px,-18px)}}@keyframes scFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
      '@media(max-width:800px){.soro-home-carousel,.soro-home-carousel .sc-scene{min-height:330px;height:330px}.soro-home-carousel .sc-content{padding:26px 22px 66px;max-width:100%}.soro-home-carousel .sc-content .sc-text{max-width:58%}.soro-home-carousel .sc-phone{right:4%;width:190px;height:245px}.soro-home-carousel .sc-office{right:-5%;opacity:.7}.soro-home-carousel .sc-urban{padding:0 2%;gap:3px}.soro-home-carousel .sc-building{transform:scale(.82);transform-origin:bottom}.soro-home-carousel .sc-future-city{padding:0 2%;gap:3px}}',
      '@media(max-width:560px){.soro-home-carousel .sc-content .sc-text{max-width:100%;text-shadow:0 1px 8px #000}.soro-home-carousel .sc-phone,.soro-home-carousel .sc-office{opacity:.25}.soro-home-carousel .sc-sun{left:78%}.soro-home-carousel .sc-nav{left:12px;right:12px}.soro-home-carousel .sc-dot.active{width:20px}}',
      '.soro-home-carousel .sc-spring-sky{position:absolute;inset:0;z-index:1;background:radial-gradient(circle at 70% 25%,rgba(255,246,184,.72),transparent 17%),linear-gradient(180deg,rgba(255,255,255,.14),transparent 34%)}',
      '.soro-home-carousel .sc-spring-cloud{position:absolute;width:150px;height:38px;border-radius:999px;background:rgba(255,255,255,.58);filter:blur(1px);z-index:3;animation:scCloud 22s linear infinite}.soro-home-carousel .sc-spring-cloud:before,.soro-home-carousel .sc-spring-cloud:after{content:"";position:absolute;border-radius:50%;background:inherit}.soro-home-carousel .sc-spring-cloud:before{width:54px;height:54px;left:27px;top:-20px}.soro-home-carousel .sc-spring-cloud:after{width:70px;height:70px;right:18px;top:-31px}.soro-home-carousel .sc-spring-cloud.a{left:8%;top:18%}.soro-home-carousel .sc-spring-cloud.b{right:12%;top:28%;transform:scale(.72);animation-delay:8s}',
      '.soro-home-carousel .sc-spring-glow{position:absolute;left:67%;top:13%;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,245,167,.8),rgba(255,221,117,.2) 45%,transparent 72%);z-index:2;animation:scSunPulse 4s ease-in-out infinite}',
      '.soro-home-carousel .sc-grass{position:absolute;left:0;right:0;bottom:43px;height:72px;z-index:10;background:linear-gradient(180deg,transparent,#6fa35c 52%,#4f8249);clip-path:polygon(0 38%,4% 27%,8% 42%,13% 20%,18% 41%,24% 25%,30% 44%,37% 18%,44% 40%,51% 23%,58% 43%,65% 19%,72% 41%,79% 25%,86% 44%,93% 21%,100% 38%,100% 100%,0 100%);opacity:.92}',
      '.soro-home-carousel .sc-tree:before{box-shadow:-18px 13px 0 -5px #5b4431,18px 9px 0 -5px #5b4431}.soro-home-carousel .sc-tree:after{background:#3f824b;box-shadow:-37px 18px 0 -7px #5b9b5d,36px 19px 0 -5px #4b8f50,-13px 43px 0 -8px #6aa966,24px 43px 0 -10px #78b86e}.soro-home-carousel .sc-tree.c{left:32%;transform:scale(.52);bottom:43px}',
      '.soro-home-carousel .sc-butterfly{position:absolute!important;font-size:0;width:30px;height:22px;z-index:22;animation:scButterflyFly 9s ease-in-out infinite;pointer-events:none}.soro-home-carousel .sc-butterfly:before,.soro-home-carousel .sc-butterfly:after{content:"";position:absolute;top:2px;width:13px;height:18px;border-radius:80% 25% 75% 25%;background:linear-gradient(135deg,#f7a9c4,#a978e8);box-shadow:inset 2px 2px rgba(255,255,255,.55)}.soro-home-carousel .sc-butterfly:before{left:0;transform:rotate(-28deg)}.soro-home-carousel .sc-butterfly:after{right:0;transform:scaleX(-1) rotate(-28deg)}.soro-home-carousel .sc-butterfly.a{left:22%;top:34%;animation-delay:-2s}.soro-home-carousel .sc-butterfly.b{left:68%;top:43%;animation-delay:-5s}@keyframes scButterflyFly{0%,100%{transform:translate(0,0) rotate(-4deg)}25%{transform:translate(38px,-18px) rotate(7deg)}50%{transform:translate(12px,22px) rotate(-5deg)}75%{transform:translate(-32px,-10px) rotate(6deg)}}',
      '.soro-home-carousel .sc-road{height:68px}.soro-home-carousel .sc-sidewalk{bottom:68px}.soro-home-carousel .sc-car.car-a{bottom:48px;left:-70px;animation:scDrive 17s linear infinite}.soro-home-carousel .sc-car.car-b{bottom:62px;right:-70px;animation:scDriveBack 20s linear infinite;animation-delay:6s}',
      '.soro-home-carousel .sc-job-deco{position:absolute;right:5%;bottom:43px;width:360px;height:220px;z-index:8;pointer-events:none}.soro-home-carousel .sc-job-card{position:absolute;right:0;bottom:0;width:300px;height:178px;border:1px solid rgba(255,255,255,.15);border-radius:20px;background:linear-gradient(145deg,rgba(30,43,58,.96),rgba(8,15,25,.94));box-shadow:0 25px 50px rgba(0,0,0,.3);overflow:hidden}.soro-home-carousel .sc-job-card:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 75% 25%,rgba(255,255,255,.12),transparent 32%)}.soro-home-carousel .sc-job-object{position:absolute;z-index:2}.soro-home-carousel .sc-job-label{position:absolute;left:18px;top:16px;z-index:3;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.7}.soro-home-carousel .sc-job-main{position:absolute;left:18px;bottom:18px;z-index:3;font-size:17px;font-weight:900}.soro-home-carousel .sc-job-desk{position:absolute;left:0;right:0;bottom:0;height:35px;background:#5e4938}.soro-home-carousel .sc-job-student .sc-job-object{font-size:68px;right:28px;top:48px}.soro-home-carousel .sc-job-delivery .sc-job-object{font-size:70px;right:20px;top:45px}.soro-home-carousel .sc-job-shop .sc-job-object{font-size:62px;right:24px;top:50px}.soro-home-carousel .sc-job-driver .sc-job-object{font-size:76px;right:16px;top:44px}.soro-home-carousel .sc-job-police .sc-job-object{font-size:70px;right:24px;top:44px}.soro-home-carousel .sc-job-nurse .sc-job-object{font-size:70px;right:24px;top:45px}.soro-home-carousel .sc-job-doctor .sc-job-object{font-size:68px;right:25px;top:46px}.soro-home-carousel .sc-job-programmer .sc-job-object{font-size:65px;right:25px;top:49px}.soro-home-carousel .sc-job-engineer .sc-job-object{font-size:70px;right:24px;top:44px}.soro-home-carousel .sc-job-mechanic .sc-job-object{font-size:68px;right:24px;top:48px}.soro-home-carousel .sc-job-teacher .sc-job-object{font-size:66px;right:24px;top:48px}.soro-home-carousel .sc-job-investigator .sc-job-object{font-size:68px;right:24px;top:46px}.soro-home-carousel .sc-job-lawyer .sc-job-object{font-size:68px;right:24px;top:46px}.soro-home-carousel .sc-job-judge .sc-job-object{font-size:68px;right:24px;top:46px}.soro-home-carousel .sc-job-student .sc-job-card{background:linear-gradient(145deg,#30465b,#101a28)}.soro-home-carousel .sc-job-delivery .sc-job-card{background:linear-gradient(145deg,#4d3326,#151b21)}.soro-home-carousel .sc-job-shop .sc-job-card{background:linear-gradient(145deg,#5a4227,#171812)}.soro-home-carousel .sc-job-driver .sc-job-card{background:linear-gradient(145deg,#304956,#10181d)}.soro-home-carousel .sc-job-police .sc-job-card{background:linear-gradient(145deg,#263c50,#0d1722)}.soro-home-carousel .sc-job-nurse .sc-job-card{background:linear-gradient(145deg,#3d6570,#10242b)}.soro-home-carousel .sc-job-doctor .sc-job-card{background:linear-gradient(145deg,#31505b,#102027)}.soro-home-carousel .sc-job-programmer .sc-job-card{background:linear-gradient(145deg,#263c5d,#0b1220)}.soro-home-carousel .sc-job-engineer .sc-job-card{background:linear-gradient(145deg,#3d4438,#161b1b)}.soro-home-carousel .sc-job-mechanic .sc-job-card{background:linear-gradient(145deg,#4a3a2e,#161b20)}.soro-home-carousel .sc-job-teacher .sc-job-card{background:linear-gradient(145deg,#3f4c61,#17202d)}.soro-home-carousel .sc-job-investigator .sc-job-card{background:linear-gradient(145deg,#403d35,#161719)}.soro-home-carousel .sc-job-lawyer .sc-job-card{background:linear-gradient(145deg,#493d32,#17191d)}.soro-home-carousel .sc-job-judge .sc-job-card{background:linear-gradient(145deg,#493f56,#181521)}',
      '.soro-home-carousel .sc-job-window{position:absolute;right:20px;top:23px;width:105px;height:55px;border:5px solid rgba(230,238,242,.25);border-radius:5px;background:linear-gradient(135deg,rgba(117,177,201,.35),rgba(18,29,39,.7));box-shadow:inset 0 0 18px rgba(118,211,236,.15);z-index:1}',
      '.soro-home-carousel .sc-job-window:before{content:"";position:absolute;left:48%;top:0;bottom:0;width:2px;background:rgba(255,255,255,.18)}',
      '.soro-home-carousel .sc-job-window:after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(255,255,255,.14)}',
      '.soro-home-carousel .sc-job-shelf{position:absolute;left:18px;top:56px;width:75px;height:4px;background:#6b5540;z-index:2;box-shadow:0 22px #6b5540}',
      '.soro-home-carousel .sc-job-shelf:before{content:"";position:absolute;left:5px;bottom:4px;width:12px;height:18px;background:#8d6a43;box-shadow:20px -2px 0 #4f6d83,42px 1px 0 #a17c4e,60px -3px 0 #6a536f}',
      '.soro-home-carousel .sc-job-light{position:absolute;right:73px;top:5px;width:30px;height:12px;border-radius:50%;background:#ffe7a2;box-shadow:0 0 20px rgba(255,224,145,.35);opacity:.75;z-index:2}',
      '.soro-home-carousel .sc-job-props{position:absolute;left:19px;bottom:39px;display:flex;gap:8px;z-index:4}.soro-home-carousel .sc-job-props i{width:12px;height:12px;border-radius:3px;background:rgba(255,255,255,.22);box-shadow:0 0 0 1px rgba(255,255,255,.08)}',
      '.soro-home-carousel .sc-job-student .sc-job-window{background:linear-gradient(135deg,#8cb4d0,#304d68)}.soro-home-carousel .sc-job-student .sc-job-shelf{background:#806344}',
      '.soro-home-carousel .sc-job-delivery .sc-job-window{background:linear-gradient(135deg,#e1a55d,#513a2a)}.soro-home-carousel .sc-job-delivery .sc-job-object{filter:drop-shadow(0 7px 5px rgba(0,0,0,.35))}',
      '.soro-home-carousel .sc-job-shop .sc-job-window{background:linear-gradient(135deg,#d7a657,#5a3b1e)}.soro-home-carousel .sc-job-shop .sc-job-shelf{background:#8b5d2d}',
      '.soro-home-carousel .sc-job-driver .sc-job-window{background:linear-gradient(135deg,#89b9c9,#243d49)}.soro-home-carousel .sc-job-driver .sc-job-shelf{background:#4f5960}',
      '.soro-home-carousel .sc-job-police .sc-job-window{background:linear-gradient(135deg,#476b85,#101c28)}.soro-home-carousel .sc-job-police .sc-job-shelf{background:#34495a}',
      '.soro-home-carousel .sc-job-nurse .sc-job-window,.soro-home-carousel .sc-job-doctor .sc-job-window{background:linear-gradient(135deg,#b9e6e8,#456d74)}.soro-home-carousel .sc-job-nurse .sc-job-shelf,.soro-home-carousel .sc-job-doctor .sc-job-shelf{background:#d6e5e6}',
      '.soro-home-carousel .sc-job-programmer .sc-job-window{background:linear-gradient(135deg,#3c6591,#111a2b)}.soro-home-carousel .sc-job-programmer .sc-job-shelf{background:#28394d}',
      '.soro-home-carousel .sc-job-engineer .sc-job-window{background:linear-gradient(135deg,#8d9a85,#364138)}.soro-home-carousel .sc-job-engineer .sc-job-shelf{background:#65513a}',
      '.soro-home-carousel .sc-job-mechanic .sc-job-window{background:linear-gradient(135deg,#a47c52,#32291f)}.soro-home-carousel .sc-job-mechanic .sc-job-shelf{background:#584737}',
      '.soro-home-carousel .sc-job-teacher .sc-job-window{background:linear-gradient(135deg,#91b8d1,#31475a)}.soro-home-carousel .sc-job-teacher .sc-job-shelf{background:#725438}',
      '.soro-home-carousel .sc-job-investigator .sc-job-window{background:linear-gradient(135deg,#555b5a,#171a1b)}.soro-home-carousel .sc-job-investigator .sc-job-shelf{background:#51463b}',
      '.soro-home-carousel .sc-job-lawyer .sc-job-window{background:linear-gradient(135deg,#9d8060,#32291f)}.soro-home-carousel .sc-job-lawyer .sc-job-shelf{background:#6b5139}',
      '.soro-home-carousel .sc-job-judge .sc-job-window{background:linear-gradient(135deg,#82799a,#2a2635)}.soro-home-carousel .sc-job-judge .sc-job-shelf{background:#594c68}',
      '.soro-home-carousel .sc-job-default .sc-job-window{background:linear-gradient(135deg,#71808b,#27313a)}',
      '@keyframes scCloud{0%{transform:translateX(-30px)}50%{transform:translateX(35px)}100%{transform:translateX(-30px)}}@keyframes scSunPulse{0%,100%{transform:scale(.96);opacity:.72}50%{transform:scale(1.05);opacity:1}}',
      '@media(max-width:800px){.soro-home-carousel .sc-job-deco{right:-8%;opacity:.7;transform:scale(.8);transform-origin:right bottom}}',
      '@media(prefers-reduced-motion:reduce){.soro-home-carousel *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  const companyVehicleCycleKey='sorokiba_company_vehicle_cycle_20260930';
  let companyVehicleLast=0;
  try{companyVehicleLast=Number(sessionStorage.getItem(companyVehicleCycleKey)||0)}catch{}
  const companyVehicleReady=!companyVehicleLast||Date.now()-companyVehicleLast>=600000;
  if(companyVehicleReady)try{sessionStorage.setItem(companyVehicleCycleKey,String(Date.now()))}catch{}
  const first=esc((me?.name||'Cidadão').trim().split(/\s+/)[0]);
  const job=esc(me?.jobName||'Cidadão');
  const SP='America/Sao_Paulo';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:SP,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const spMonth=Number(parts.month),spDay=Number(parts.day);
  const seasonInfo=((spMonth===3&&spDay>=20)||(spMonth>3&&spMonth<6)||(spMonth===6&&spDay<21))?{name:'Outono',icon:'🍂',desc:'Folhas secas, tons quentes e caminhos tranquilos marcam a estação.',kind:'autumn'}:((spMonth===6&&spDay>=21)||(spMonth>6&&spMonth<9)||(spMonth===9&&spDay<23))?{name:'Inverno',icon:'❄️',desc:'Frio, neve e luz suave transformam a paisagem de Sorokiba.',kind:'winter'}:((spMonth===9&&spDay>=23)||(spMonth>9&&spMonth<12)||(spMonth===12&&spDay<21))?{name:'Primavera',icon:'🌸',desc:'Flores, árvores verdes e vida nova tomam conta do parque de Sorokiba.',kind:'spring'}:{name:'Verão',icon:'☀️',desc:'O verão traz luz quente, movimento e dias ensolarados para Sorokiba.',kind:'summer'};

  const carouselDataPromise=Promise.all([
    api('/api/news').then(data=>Array.isArray(data)?data:[]).catch(()=>[]),
    api('/api/jobs').then(data=>Array.isArray(data)?data:(data.jobs||[])).catch(()=>[]),
    api('/api/companies').then(data=>data||{companies:[]}).catch(()=>({companies:[]}))
  ]);
  let carouselDataTimeout;
  const [news,jobs,companyData]=await Promise.race([
    carouselDataPromise,
    new Promise(resolve=>{carouselDataTimeout=setTimeout(()=>resolve([[],[],{companies:[]}]),1200)})
  ]);
  clearTimeout(carouselDataTimeout);
  const currentJob=jobs.find(j=>String(j.name||'').toLowerCase()===String(me?.jobName||'').toLowerCase()||String(j.id||'')===String(me?.jobId||''))||null;
  const companyVehicles=(companyData.companies||[]).flatMap(c=>(c.products||[]).filter(p=>p.type==='veiculo').map(p=>({name:p.name,image:p.image||'',emoji:p.emoji||'🚗',company:c.name,custom:p.vehicleCustomization||{}})));
  let streetVehicle=null;const ownedVehicleId=me?.equippedVehicleProductId;if(ownedVehicleId){for(const c of (companyData?.companies||[])){const p=(c.products||[]).find(x=>x.id===ownedVehicleId&&x.type==='veiculo');if(p){streetVehicle={name:p.name,image:p.image||'',emoji:p.emoji||'🚗',company:c.name,custom:p.vehicleCustomization||{}};break}}}if(!streetVehicle&&companyVehicles.length&&companyVehicleReady&&Math.random()<0.35)streetVehicle=companyVehicles[Math.floor(Math.random()*companyVehicles.length)];
  const vehicleArt=streetVehicle?'<div class="sc-company-vehicle"><div class="sc-mini-car" style="--vc-body:'+esc(streetVehicle.custom.bodyColor||'#dfe6ee')+';--vc-secondary:'+esc(streetVehicle.custom.secondaryColor||'#273449')+';--vc-window:'+esc(streetVehicle.custom.windowColor||'#7fc8e8')+';--vc-wheel:'+esc(streetVehicle.custom.wheelColor||'#151a22')+';--vc-neon:'+esc(streetVehicle.custom.neonColor||'#7c5cff')+'"><i></i><b></b><em></em></div></div>':'';

  const salary=currentJob&&currentJob.salary!=null?'<span>Salário: R$ '+Number(currentJob.salary).toLocaleString('pt-BR')+'</span>':'';
  const workExtra='<div class="sc-work-panel"><div class="sc-work-icon">'+(currentJob?.icon||'💼')+'</div><b>'+job+'</b><small>Carreira atual '+salary+'</small></div>';
  const jobDecorations={
    estudante:['sc-job-student','📚','Sala de estudos'],
    entregador:['sc-job-delivery','🛵','Central de entregas'],
    entregador_ifood:['sc-job-delivery','🛵','Central de entregas'],
    comerciante:['sc-job-shop','🛍️','Loja e comércio'],
    motorista:['sc-job-driver','🚗','Central de transporte'],
    policial:['sc-job-police','🚓','Delegacia e patrulha'],
    enfermeiro:['sc-job-nurse','🩺','Enfermaria'],
    medico:['sc-job-doctor','⚕️','Hospital'],
    programador:['sc-job-programmer','💻','Escritório de tecnologia'],
    engenheiro:['sc-job-engineer','🏗️','Escritório de engenharia'],
    mecanico:['sc-job-mechanic','🔧','Oficina mecânica'],
    professor:['sc-job-teacher','🧑‍🏫','Sala de aula'],
    investigador:['sc-job-investigator','🔎','Sala de investigação'],
    advogado:['sc-job-lawyer','⚖️','Escritório de advocacia'],
    juiz:['sc-job-judge','⚖️','Tribunal de Sorokiba']
};
  const normalizeJobId=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const selectedJobId=normalizeJobId(currentJob?.id||me?.jobId||me?.job?.id||job);
  const jd=jobDecorations[selectedJobId]||['sc-job-default','💼','Vida profissional'];
  const jobArt='<div class="sc-job-deco '+jd[0]+'"><div class="sc-job-card"><div class="sc-job-window"></div><div class="sc-job-shelf"></div><div class="sc-job-light"></div><span class="sc-job-label">'+esc(jd[2])+'</span><div class="sc-job-object">'+jd[1]+'</div><div class="sc-job-props"><i></i><i></i><i></i></div><div class="sc-job-main">'+job+'</div><div class="sc-job-desk"></div></div></div>';

  function newsMarkup(){
    const latest=news[0]||null;
    const smaller=news.slice(1,3);
    const mainTitle=esc(latest?.title||'Nenhuma manchete publicada');
    const mainBody=esc(latest?.body||'As novidades oficiais de Sorokiba aparecerão aqui.');
    const mainDate=latest?.createdAt||latest?.date||latest?.publishedAt;
    const dateText=mainDate?new Date(mainDate).toLocaleDateString('pt-BR',{timeZone:SP}):'Hoje';
    return '<div class="sc-phone"><div class="sc-phone-notch"></div><div class="sc-phone-status"><span>09:41</span><span>◔ ◫ ▰</span></div><div class="sc-phone-head"><span>SOROKIBA NEWS</span><span>•••</span></div><div class="sc-news-list"><div><span class="sc-category">CIDADE</span><span class="sc-category">OFICIAL</span></div><div class="sc-news-card main"><small>'+dateText+'</small><b>'+mainTitle+'</b><small>'+mainBody.slice(0,95)+(mainBody.length>95?'…':'')+'</small></div>'+smaller.map(n=>'<div class="sc-news-card"><b>'+esc(n.title||'Notícia de Sorokiba')+'</b><small>'+esc((n.body||'').slice(0,65))+'</small></div>').join('')+'</div></div>';
  }

  function urbanScene(extraClass,night,winter){
    const buildingClass=night?'sc-night-window':'';
    return '<div class="sc-urban '+extraClass+'"><i class="sc-building b8 '+buildingClass+'"></i><i class="sc-building b9 '+buildingClass+'"></i><i class="sc-building b1 '+buildingClass+'"></i><i class="sc-building b2 '+buildingClass+'"></i><i class="sc-building b3 '+buildingClass+'"></i><i class="sc-building b4 '+buildingClass+'"></i><i class="sc-building b5 '+buildingClass+'"></i><i class="sc-building b6 '+buildingClass+'"></i><i class="sc-building b7 '+buildingClass+'"></i><i class="sc-building b10 '+buildingClass+'"></i><i class="sc-building b11 '+buildingClass+'"></i></div><div class="sc-store"></div><div class="sc-lamp a"></div><div class="sc-lamp b"></div><div class="sc-car car-a"></div><div class="sc-car car-b"></div><div class="sc-sidewalk"></div><div class="sc-road"></div>'+(winter?'<div class="sc-snowbank"></div><div class="sc-ice a"></div><div class="sc-ice b"></div>':'');
  }

  let seasonArt='';
  if(seasonInfo.kind==='spring'){
    seasonArt='<div class="sc-spring-sky"></div><div class="sc-spring-glow"></div><div class="sc-spring-cloud a"></div><div class="sc-spring-cloud b"></div><div class="sc-tree a"></div><div class="sc-tree b"></div><div class="sc-tree c"></div><div class="sc-path-park"></div><div class="sc-bench"></div><div class="sc-grass"></div><div class="sc-flowers"><i class="sc-flower pink" style="left:10%;transform:scale(1.1)"></i><i class="sc-flower yellow" style="left:18%;transform:scale(.8)"></i><i class="sc-flower white" style="left:28%;transform:scale(.95)"></i><i class="sc-flower purple" style="left:38%;transform:scale(.72)"></i><i class="sc-flower pink" style="left:49%;transform:scale(1.1)"></i><i class="sc-flower yellow" style="left:60%;transform:scale(.85)"></i><i class="sc-flower white" style="left:71%;transform:scale(.95)"></i><i class="sc-flower purple" style="left:83%;transform:scale(.78)"></i><i class="sc-flower pink" style="left:91%;transform:scale(.7)"></i></div><div class="sc-petal a"></div><div class="sc-petal b"></div><div class="sc-petal c"></div><div class="sc-butterfly a"></div><div class="sc-butterfly b"></div><div class="sc-sidewalk"></div><div class="sc-road"></div>';
  }else if(seasonInfo.kind==='winter'){
    seasonArt='<div class="sc-snow"></div>'+urbanScene('sc-winter-city',true,true);
  }else if(seasonInfo.kind==='autumn'){
    seasonArt='<div class="sc-autumn-ground"></div><div class="sc-tree a"></div><div class="sc-tree b"></div><div class="sc-flowers"><i class="sc-flower yellow" style="left:18%"></i><i class="sc-flower yellow" style="left:32%;transform:scale(.75)"></i><i class="sc-flower yellow" style="left:66%;transform:scale(.85)"></i><i class="sc-flower yellow" style="left:79%;transform:scale(.7)"></i></div><div class="sc-sidewalk"></div><div class="sc-road"></div>';
  }else{
    seasonArt='<div class="sc-sun afternoon"></div>'+urbanScene('',false,false);
  }

  const greetingHour=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:SP,hour:'2-digit',hour12:false}).format(new Date()));
  const greeting=(()=>{
    if(greetingHour>=5&&greetingHour<12) return {
      k:'🌅 SOROKIBA • BOM DIA',
      t:'Bom dia, '+first+'!',
      m:'O nascer do sol surge no horizonte, iluminando montanhas em diferentes distâncias enquanto Sorokiba desperta.',
      bg:'linear-gradient(180deg,#334a73 0%,#8b6b7a 43%,#d98b65 68%,#f2c991 100%)',
      art:vehicleArt+'<div class="sc-mountain far"></div><div class="sc-mountain mid"></div><div class="sc-mountain near"></div><div class="sc-mist"></div><div class="sc-sun morning"></div><div class="sc-path"></div><div class="sc-pine a"></div><div class="sc-pine b"></div><div class="sc-pine c"></div><div class="sc-city-distance"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="sc-sidewalk"></div><div class="sc-road"></div>'
    };
    if(greetingHour>=12&&greetingHour<19) return {
      k:'☀️ SOROKIBA • BOA TARDE',
      t:'Boa tarde, '+first+'!',
      m:'O centro de Sorokiba ganha vida com prédios de alturas e fachadas diferentes, ruas, comércio e movimento.',
      bg:'linear-gradient(180deg,#2585c3 0%,#66c5dd 54%,#d4d7bd 100%)',
      art:vehicleArt+'<div class="sc-sky-haze"></div><div class="sc-sun afternoon"></div>'+urbanScene('',false,false)
    };
    return {
      k:'🌌 SOROKIBA • BOA NOITE',
      t:'Boa noite, '+first+'!',
      m:'As janelas acesas e as luzes das ruas mantêm a cidade viva sob a Lua e um céu naturalmente estrelado.',
      bg:'linear-gradient(180deg,#020513 0%,#08152f 56%,#18233b 100%)',
      art:vehicleArt+'<div class="sc-stars"></div><div class="sc-moon"></div><div class="sc-meteor one"></div><div class="sc-meteor two"></div>'+urbanScene('',true,false)
    };
  })();

  const slides=[
    greeting,
    {k:seasonInfo.icon+' SOROKIBA • '+seasonInfo.name.toUpperCase(),t:seasonInfo.name+' em Sorokiba.',m:seasonInfo.desc,bg:seasonInfo.kind==='spring'?'linear-gradient(180deg,#78c9e5,#b8e0cb 55%,#8cb36d)':seasonInfo.kind==='winter'?'linear-gradient(180deg,#253f55,#7d9eab 58%,#cbdde0)':seasonInfo.kind==='autumn'?'linear-gradient(180deg,#5a7280,#c99362 58%,#6e513d)':'linear-gradient(180deg,#4baed0,#8fd29b 58%,#e5bd62)',art:seasonArt},
    {k:'💼 SOROKIBA • TRABALHO',t:'Sua carreira em Sorokiba.',m:'Acompanhe os dados reais da sua profissão e continue evoluindo dentro da cidade.',bg:'linear-gradient(135deg,#172132,#35465a 58%,#697b82)',art:jobArt+'<div class="sc-office"></div><div class="sc-desk"></div><div class="sc-monitor"></div>'},
    {k:'📰 SOROKIBA • NOTÍCIAS',t:'Notícias de Sorokiba.',m:'Um resumo das informações oficiais publicadas na cidade, usando o mesmo sistema de notícias do jogo.',bg:'linear-gradient(135deg,#101722,#2a3542 55%,#0e141c)',art:newsMarkup()},
    {k:'🚀 SOROKIBA • FUTURO',t:'O futuro de Sorokiba começa agora.',m:'Uma visão de uma cidade em evolução, com arquitetura avançada, informação digital e tecnologia integrada ao cotidiano.',bg:'radial-gradient(circle at 74% 28%,rgba(74,183,224,.2),transparent 25%),linear-gradient(135deg,#070b13,#182437 55%,#080d15)',art:'<div class="sc-future-light"></div><div class="sc-future-city"><i class="sc-future-building f1"></i><i class="sc-future-building f2"></i><i class="sc-future-building f3"></i><i class="sc-future-building f4"></i><i class="sc-future-building f5"></i></div><div class="sc-holo one">SOROKIBA • 2045</div><div class="sc-holo two">TRANSPORTE • ENERGIA</div>'}
  ];

  const groups=[[0],[1],[2],[3],[4]];
  const root=document.createElement('section');
  root.className='soro-home-carousel';
  root.setAttribute('aria-label','Carrossel da Cidade de Sorokiba');
  root.innerHTML='<div class="sc-track"></div><div class="sc-nav"><div class="sc-dots">'+groups.map((g,i)=>'<button type="button" class="sc-dot '+(i===0?'active':'')+'" data-group="'+i+'" aria-label="Grupo '+(i+1)+'"></button>').join('')+'</div><div class="sc-arrows"><button type="button" class="sc-arrow" data-prev aria-label="Anterior">‹</button><button type="button" class="sc-arrow" data-next aria-label="Próxima">›</button></div></div>';
  box.prepend(root);
  const safeFallback=box.querySelector('.soro-home-carousel.safe-fallback');
  if(safeFallback) safeFallback.remove();

  const track=root.querySelector('.sc-track');
  slides.forEach((s,i)=>{
    const el=document.createElement('article');
    el.className='sc-scene '+(i===0?'active':'');
    el.dataset.index=i;
    el.style.background=s.bg;
    let extra='';
    if(i===2)extra=workExtra;
    el.innerHTML='<div class="sc-content"><div class="sc-kicker">'+s.k+'</div><h2>'+s.t+'</h2><p class="sc-text">'+s.m+'</p>'+extra+'</div>'+s.art;
    track.appendChild(el);
  });

  let initialScene=0;

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

  root.dataset.version='app-home-carousel-city-scenes-v6-jobs';
  window.__sorokibaHomeCarouselCleanup=()=>{clearInterval(timer);if(root&&root.parentNode)root.remove();window.__sorokibaHomeCarouselCleanup=null;};
}

async function jobPage(box){
 const d=await api("/api/jobs");
 const jobs=d.jobs||[];
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">CARREIRA PROFISSIONAL</span><h1>Escolha seu caminho</h1><p>Cada profissão tem sua função na cidade. Ganhe XP e desbloqueie oportunidades.</p></div></div>
 <div class="jobs-grid">${jobs.map(j=>{const locked = (me.xp || 0) < (j.xpRequired || 0); return `<div class="job-card"><div class="job-icon">${jobIcon(j.id)}</div><h3>${j.name}</h3><p>${j.task}</p><small>Salário: R$ ${j.salary} • XP necessário: ${j.xpRequired || 0}</small><button class="primary" ${locked?"disabled":""} onclick="selectJob('${j.id}')">${locked?"Bloqueado":"Escolher"}</button></div>`}).join('')}</div>`;
}
function jobIcon(id){return {estudante:"🎓",entregador:"📦",comerciante:"🛍️",motorista:"🚗",policial:"🛡️",enfermeiro:"🩺",medico:"⚕️",programador:"💻",engenheiro:"🏗️",eletricista:"⚡",militar:"🎖️"}[id]||"💼"}
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
  let ach=[];
  let products=[];
  try{const d=await api("/api/achievements");ach=Array.isArray(d)?d:(d.achievements||[])}catch{}
  try{const d=await api("/api/company-inventory");products=d.items||[]}catch{}
  box.innerHTML=`<div class="profile-header"><div class="avatar xl">${esc((me.name||"C")[0])}</div><div><span class="tag">CIDADÃO</span><h1>${esc(me.name)}</h1><p>@${esc(me.username)} · ${esc(me.jobName)}</p></div></div>
  <div class="stats-grid"><div class="stat-card"><span>⭐</span><small>Nível</small><b>${me.level}</b></div><div class="stat-card"><span>✨</span><small>XP</small><b>${me.xp}</b></div><div class="stat-card"><span>💰</span><small>Dinheiro</small><b>${money(me.money)}</b></div></div>
  <section class="character-account-card">
    <div class="section-head"><div><span class="eyebrow">PERSONAGEM</span><h3>Seu personagem</h3></div><span class="tag">PERSONALIZAR</span></div>
    <div id="characterEditor"></div>
  </section>
  <section><div class="section-head"><h3>Conquistas</h3></div><div class="achievements-list">${ach.length?ach.map(a=>`<div class="achievement"><span>${esc(a.icon||"⭐")}</span><div><h4>${esc(a.name||"Conquista")}</h4><p>${esc(a.description||"")}</p></div></div>`).join(""):'<p>Nenhuma conquista ainda</p>'}</div></section>`;
  renderCharacterEditor(document.getElementById("characterEditor"),products);
}
function characterClone(){return JSON.parse(JSON.stringify(me.character||{gender:"masculino",skin:"#f1c27d",hair:"#2b2118",hairStyle:"curto",shirt:"#4f6cff",pants:"#273449",shoes:"#151a22",bodyType:"normal",eyeStyle:"normal",browStyle:"normal",mouthStyle:"normal",noseStyle:"normal",earStyle:"normal",accessories:[],held:null}))}
function characterOption(label,name,value,values){return '<label class="char-field"><span>'+label+'</span><select data-char-field="'+name+'">'+values.map(v=>'<option value="'+esc(v)+'"'+(v===value?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>'}
function characterColor(label,name,value){return '<label class="char-field"><span>'+label+'</span><input type="color" data-char-field="'+name+'" value="'+esc(value||"#20242c")+'"></label>'}
function renderCharacterEditor(root,products){
  if(!root)return;
  if(!document.getElementById("sorokiba-character-v2-style")){
    const st=document.createElement("style");st.id="sorokiba-character-v2-style";
    st.textContent=`
      .character-editor-v2{display:grid;grid-template-columns:minmax(310px,.9fr) minmax(360px,1.1fr);gap:24px}
      .character-stage-v2{height:560px;border:1px solid var(--line);border-radius:26px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 20%,rgba(99,102,241,.25),transparent 34%),linear-gradient(180deg,#1b2638 0%,#0a1019 100%);display:flex;align-items:flex-end;justify-content:center}
      .character-stage-v2:before{content:"";position:absolute;width:300px;height:300px;border-radius:50%;top:80px;background:rgba(255,255,255,.025);filter:blur(2px)}
      .character-stage-v2:after{content:"";position:absolute;bottom:42px;width:260px;height:26px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(10px)}
      .character-label-v2{position:absolute;top:18px;left:20px;z-index:50;font-size:10px;font-weight:900;letter-spacing:.16em;color:rgba(255,255,255,.58)}
      .char-v2{position:relative;width:250px;height:485px;margin-bottom:43px;--skin:#e9b987;--hair:#29221d;--shirt:#4d68e8;--pants:#263247;--shoe:#111722;--neck:#e9b987;z-index:5}
      .char-v2 *{box-sizing:border-box}
      .v2-neck{position:absolute;z-index:3;left:104px;top:133px;width:42px;height:48px;background:var(--skin);border-radius:0 0 18px 18px}
      .v2-head{position:absolute;z-index:8;left:69px;top:31px;width:112px;height:126px;background:var(--skin);border:3px solid rgba(0,0,0,.14);border-radius:48% 48% 45% 45%;box-shadow:inset 0 -8px 0 rgba(0,0,0,.035)}
      .v2-ear{position:absolute;z-index:7;top:78px;width:27px;height:42px;background:var(--skin);border:2px solid rgba(0,0,0,.1);border-radius:50%}.v2-ear.l{left:50px}.v2-ear.r{right:50px}
      .v2-ear:after{content:"";position:absolute;inset:9px 7px;border-left:2px solid rgba(80,45,30,.18);border-radius:50%}
      .v2-hair-back{position:absolute;z-index:6;left:61px;top:20px;width:128px;height:155px;background:var(--hair);border-radius:62px 62px 38px 38px;box-shadow:0 10px 18px rgba(0,0,0,.22)}
      .v2-hair-front{position:absolute;z-index:12;left:63px;top:22px;width:124px;height:100px;background:transparent;pointer-events:none}
      .hair-short .v2-hair-back{height:80px;border-radius:62px 62px 28px 28px}
      .hair-short .v2-hair-front{height:58px;clip-path:polygon(0 0,100% 0,100% 55%,82% 73%,65% 53%,50% 82%,31% 56%,0 70%);background:var(--hair)}
      .hair-medium .v2-hair-back{height:115px;border-radius:62px 62px 35px 35px}
      .hair-medium .v2-hair-front{height:76px;clip-path:polygon(0 0,100% 0,100% 48%,77% 66%,58% 52%,40% 77%,20% 54%,0 68%);background:var(--hair)}
      .hair-long .v2-hair-back{height:178px;border-radius:62px 62px 45px 45px}
      .hair-long .v2-hair-front{height:120px;clip-path:polygon(0 0,100% 0,100% 58%,82% 68%,66% 50%,49% 78%,31% 53%,0 70%);background:var(--hair)}
      .hair-curly .v2-hair-back,.hair-coily .v2-hair-back{height:130px;border-radius:48%;filter:drop-shadow(0 3px 2px rgba(0,0,0,.15))}
      .hair-curly .v2-hair-front,.hair-coily .v2-hair-front{height:84px;background:var(--hair);border-radius:48%;clip-path:none}
      .hair-bun .v2-hair-back{height:105px}.hair-bun .v2-hair-back:after{content:"";position:absolute;right:-12px;top:-26px;width:54px;height:54px;border-radius:50%;background:var(--hair)}
      .hair-bun .v2-hair-front{height:74px;background:var(--hair);clip-path:polygon(0 0,100% 0,100% 58%,75% 69%,54% 51%,35% 76%,0 67%)}
      .hair-shaved .v2-hair-back{height:25px;top:35px;border-radius:50%;opacity:.95}.hair-shaved .v2-hair-front{display:none}
      .hair-mohawk .v2-hair-back{left:96px;width:58px;height:112px;border-radius:50%}.hair-mohawk .v2-hair-front{left:96px;width:58px;height:65px;background:var(--hair);clip-path:none;border-radius:50%}
      .hair-bangs .v2-hair-front{height:100px;background:var(--hair);clip-path:polygon(0 0,100% 0,100% 46%,85% 63%,71% 50%,57% 85%,43% 54%,25% 73%,0 56%)}
      .hair-side .v2-hair-front{height:105px;background:var(--hair);clip-path:polygon(0 0,100% 0,100% 36%,82% 48%,65% 68%,43% 83%,18% 62%,0 74%)}
      .v2-face{position:absolute;z-index:13;left:84px;top:83px;width:82px;height:66px}
      .v2-eye{position:absolute;top:9px;width:11px;height:11px;border-radius:50%;background:#18202b}.v2-eye.l{left:9px}.v2-eye.r{right:9px}
      .eye-big .v2-eye{width:14px;height:14px}.eye-closed .v2-eye{height:3px;top:13px;border-radius:8px}.eye-narrow .v2-eye{width:15px;height:4px;top:13px}.eye-shiny .v2-eye{box-shadow:0 0 0 2px rgba(255,255,255,.35),0 0 9px rgba(255,255,255,.6)}
      .v2-brow{position:absolute;top:0;width:23px;height:4px;border-radius:5px;background:#33251c}.v2-brow.l{left:4px}.v2-brow.r{right:4px}.brow-arched .v2-brow.l{transform:rotate(-10deg)}.brow-arched .v2-brow.r{transform:rotate(10deg)}.brow-strong .v2-brow{height:6px}.brow-worried .v2-brow.l{transform:rotate(10deg)}.brow-worried .v2-brow.r{transform:rotate(-10deg)}
      .v2-nose{position:absolute;left:37px;top:21px;width:9px;height:19px;border-right:2px solid rgba(80,45,30,.38);border-bottom:2px solid rgba(80,45,30,.38);border-radius:0 0 7px 0}.nose-thin .v2-nose{width:5px;height:15px}.nose-round .v2-nose{width:11px;height:10px;border:2px solid rgba(80,45,30,.35);border-radius:50%;top:25px}.nose-up .v2-nose{height:9px;transform:rotate(-12deg)}
      .v2-mouth{position:absolute;left:31px;top:51px;width:21px;height:5px;border-radius:8px;background:#773b47}.mouth-smile .v2-mouth{height:10px;background:transparent;border-bottom:3px solid #773b47}.mouth-serious .v2-mouth{height:3px}.mouth-open .v2-mouth{height:12px;border-radius:50%}.mouth-surprised .v2-mouth{left:35px;width:12px;height:12px;border-radius:50%}.mouth-sad .v2-mouth{background:transparent;border-top:3px solid #773b47}
      .v2-torso{position:absolute;z-index:4;top:166px;left:42px;width:166px;height:145px;background:var(--shirt);border:2px solid rgba(0,0,0,.14);border-radius:32px 32px 20px 20px}
      .gender-female .v2-torso{left:57px;width:136px;height:139px;border-radius:42px 42px 27px 27px}
      .gender-male .v2-torso{left:34px;width:182px;height:149px;border-radius:30px 30px 18px 18px}
      .body-slim.gender-male .v2-torso{left:48px;width:154px}.body-strong.gender-male .v2-torso{left:25px;width:198px}
      .body-slim.gender-female .v2-torso{left:66px;width:118px}.body-strong.gender-female .v2-torso{left:49px;width:152px}
      .v2-shoulder{position:absolute;z-index:3;top:174px;width:49px;height:73px;background:var(--skin);border-radius:25px}.v2-shoulder.l{left:20px;transform:rotate(8deg)}.v2-shoulder.r{right:20px;transform:rotate(-8deg)}
      .gender-female .v2-shoulder{width:39px}.gender-female .v2-shoulder.l{left:43px}.gender-female .v2-shoulder.r{right:43px}
      .gender-male .v2-shoulder{width:55px}.gender-male .v2-shoulder.l{left:10px}.gender-male .v2-shoulder.r{right:10px}
      .v2-waist{position:absolute;z-index:5;top:286px;left:61px;width:128px;height:31px;background:var(--pants);border-radius:0 0 15px 15px}
      .gender-female .v2-waist{left:78px;width:94px}.gender-male .v2-waist{left:55px;width:140px}
      .v2-legs{position:absolute;z-index:3;top:306px;left:62px;width:126px;height:132px;background:var(--pants);border-radius:10px 10px 25px 25px}
      .gender-female .v2-legs{left:69px;width:113px;border-radius:14px 14px 28px 28px}.gender-male .v2-legs{left:58px;width:134px}
      .v2-leg-seam{position:absolute;left:50%;top:0;height:117px;border-left:5px solid rgba(0,0,0,.12)}
      .v2-shoe{position:absolute;z-index:6;top:423px;width:60px;height:27px;border-radius:10px 16px 9px 9px;background:var(--shoe)}.v2-shoe.l{left:50px}.v2-shoe.r{right:50px}
      .gender-female .v2-shoe.l{left:58px}.gender-female .v2-shoe.r{right:58px}.gender-male .v2-shoe.l{left:43px}.gender-male .v2-shoe.r{right:43px}
      .product-overlay-v2{position:absolute;z-index:30;pointer-events:none}.p-shirt{top:166px;left:42px;width:166px;height:145px;border-radius:32px 32px 20px 20px;background:var(--p1);border:2px solid rgba(0,0,0,.15)}.gender-female .p-shirt{left:57px;width:136px;height:139px;border-radius:42px 42px 27px 27px}.gender-male .p-shirt{left:34px;width:182px;height:149px;border-radius:30px 30px 18px 18px}.p-pants{top:306px;left:62px;width:126px;height:132px;border-radius:10px 10px 25px 25px;background:var(--p1)}.p-cap{top:18px;left:59px;width:132px;height:55px;border-radius:65px 65px 16px 16px;background:var(--p1);z-index:31}.p-cap:after{content:"";position:absolute;left:44px;bottom:-8px;width:102px;height:14px;border-radius:50%;background:var(--p2)}.p-glasses{top:91px;left:80px;width:96px;height:31px;z-index:32}.p-glasses:before,.p-glasses:after{content:"";position:absolute;top:0;width:35px;height:24px;border:4px solid var(--p1);border-radius:9px;background:var(--lens)}.p-glasses:before{left:0}.p-glasses:after{right:0}.p-glasses i{position:absolute;left:35px;top:9px;width:26px;border-top:4px solid var(--p1)}.p-shoe{top:421px;width:62px;height:29px;border-radius:10px 16px 9px 9px;background:var(--p1);z-index:31}.p-shoe.l{left:49px}.p-shoe.r{right:49px}.p-tech{right:12px;top:247px;width:33px;height:57px;border-radius:7px;background:var(--p1);border:2px solid var(--p2);transform:rotate(-10deg);z-index:35;box-shadow:0 5px 12px rgba(0,0,0,.3)}.p-tech:after{content:"";position:absolute;inset:6px 5px;border-radius:3px;background:var(--p2)}.p-equip{right:3px;top:210px;width:43px;height:67px;border-radius:12px;background:linear-gradient(145deg,var(--p1),var(--p2));z-index:35}
      .char-controls-v2{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:13px}.char-tab-v2{padding:9px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel);cursor:pointer}.char-tab-v2.active{border-color:#7c5cff;background:rgba(124,92,255,.13)}.char-panel-v2{padding:16px;border:1px solid var(--line);border-radius:17px;background:var(--panel)}.char-grid-v2{display:grid;grid-template-columns:1fr 1fr;gap:11px}.char-grid-v2 label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--muted);font-weight:700}.char-grid-v2 select,.char-grid-v2 input{width:100%;box-sizing:border-box}.char-products-v2{max-height:245px;overflow:auto}.char-product-v2{display:flex;align-items:center;gap:9px;padding:11px;border-bottom:1px solid rgba(127,127,127,.12)}.char-product-v2:last-child{border-bottom:0}.char-product-v2 small{display:block;color:var(--muted);font-weight:400;margin-top:3px}.char-save-v2{margin-top:14px}.char-hint-v2{font-size:12px;color:var(--muted)}@media(max-width:850px){.character-editor-v2{grid-template-columns:1fr}.char-grid-v2{grid-template-columns:1fr}.character-stage-v2{height:520px}}`;;
    document.head.appendChild(st);
  }
  let draft=characterClone();if(!Array.isArray(draft.accessories))draft.accessories=[];
  const owned=(Array.isArray(products)?products:[]).map(x=>x.product||{}).filter(p=>p&&p.id);
  const selected=()=>owned.filter(p=>draft.accessories.includes(String(p.id)));
  const cls=s=>String(s||"normal").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-");
  const hairMap={curto:"short",medio:"medium",longo:"longo",cacheado:"curly",crespo:"coily",coque:"bun",raspado:"shaved",moicano:"mohawk",franja:"bangs",lateral:"side"};
  const eyeMap={normal:"normal",grande:"big",fechado:"closed",estreito:"narrow",brilhante:"shiny"};
  const browMap={normal:"normal",reto:"normal",arqueada:"arched",forte:"strong",preocupada:"worried"};
  const mouthMap={normal:"normal",sorriso:"smile",serio:"serious",aberta:"open",surpreso:"surprised",triste:"sad"};
  const gender=String(draft.gender||"masculino").toLowerCase().includes("fem")?"female":"male";
  const bodyMap={magro:"slim",normal:"normal",forte:"strong"};
  const overlays=()=>{
    const out=[];
    selected().filter(p=>p.type==="roupa").forEach(p=>{
      const q=p.clothingCustomization||{},a=q.primaryColor||p.productDesign?.primaryColor||"#4d68e8",b=q.secondaryColor||p.productDesign?.secondaryColor||"#263247";
      if(["Camiseta","Jaqueta"].includes(q.category))out.push('<div class="product-overlay-v2 p-shirt" style="--p1:'+esc(a)+';--p2:'+esc(b)+'"></div>');
      if(q.category==="Calça")out.push('<div class="product-overlay-v2 p-pants" style="--p1:'+esc(a)+'"></div>');
      if(q.category==="Boné")out.push('<div class="product-overlay-v2 p-cap" style="--p1:'+esc(a)+';--p2:'+esc(b)+'"></div>');
      if(q.category==="Óculos")out.push('<div class="product-overlay-v2 p-glasses" style="--p1:'+esc(a)+';--lens:'+(q.lensColor||"#dce8f2")+'"><i></i></div>');
      if(q.category==="Tênis")out.push('<div class="product-overlay-v2 p-shoe l" style="--p1:'+esc(a)+'"></div><div class="product-overlay-v2 p-shoe r" style="--p1:'+esc(a)+'"></div>');
    });
    const t=selected().find(p=>p.type==="tecnologia");
    if(t){const q=t.technologyCustomization||{},a=q.color||t.productDesign?.primaryColor||"#596cff",b=q.accent||t.productDesign?.secondaryColor||"#25d0a5";out.push('<div class="product-overlay-v2 p-tech" style="--p1:'+esc(a)+';--p2:'+esc(b)+'"></div>')}
    const eq=selected().find(p=>p.type==="equipamento");
    if(eq){const a=eq.productDesign?.primaryColor||"#7c5cff",b=eq.productDesign?.secondaryColor||"#e8edf5";out.push('<div class="product-overlay-v2 p-equip" style="--p1:'+esc(a)+';--p2:'+esc(b)+'"></div>')}
    return out.join("");
  };
  const redraw=()=>{
    const h=hairMap[draft.hairStyle]||"short",e=eyeMap[draft.eyeStyle]||"normal",br=browMap[draft.browStyle]||"normal",m=mouthMap[draft.mouthStyle]||"normal",bd=bodyMap[draft.bodyType]||"normal";
    root.innerHTML='<div class="character-editor-v2"><div class="character-stage-v2"><span class="character-label-v2">PERSONAGEM</span><div class="char-v2 gender-'+gender+' body-'+bd+' hair-'+h+' eye-'+e+' brow-'+br+' mouth-'+m+'" style="--skin:'+esc(draft.skin)+';--hair:'+esc(draft.hair)+';--shirt:'+esc(draft.shirt)+';--pants:'+esc(draft.pants)+';--shoe:'+esc(draft.shoes)+'"><div class="v2-ear l"></div><div class="v2-ear r"></div><div class="v2-hair-back"></div><div class="v2-neck"></div><div class="v2-head"></div><div class="v2-face"><i class="v2-brow l"></i><i class="v2-brow r"></i><i class="v2-eye l"></i><i class="v2-eye r"></i><i class="v2-nose"></i><i class="v2-mouth"></i></div><div class="v2-hair-front"></div><div class="v2-shoulder l"></div><div class="v2-shoulder r"></div><div class="v2-torso"></div><div class="v2-waist"></div><div class="v2-legs"><i class="v2-leg-seam"></i></div><div class="v2-shoe l"></div><div class="v2-shoe r"></div>'+overlays()+'</div></div><div><div class="char-controls-v2"><button class="char-tab-v2 active" data-tab="face">Rosto</button><button class="char-tab-v2" data-tab="body">Corpo</button><button class="char-tab-v2" data-tab="hair">Cabelo</button><button class="char-tab-v2" data-tab="colors">Cores</button><button class="char-tab-v2" data-tab="products">Produtos</button></div><div class="char-panel-v2" id="charPanelV2"></div><button class="primary wide char-save-v2" id="charSaveV2">Salvar personagem</button><p class="char-hint-v2">Cada escolha altera visualmente o personagem. Produtos comprados podem ser equipados e aparecem diretamente na prévia.</p></div></div>';
    const panel=root.querySelector("#charPanelV2");
    const option=(label,key,value,values)=>'<label>'+label+'<select data-field="'+key+'">'+values.map(v=>'<option value="'+esc(v)+'" '+(v===value?"selected":"")+'>'+esc(v.charAt(0).toUpperCase()+v.slice(1))+'</option>').join("")+'</select></label>';
    const color=(label,key,value)=>'<label>'+label+'<input type="color" data-field="'+key+'" value="'+esc(value||"#ffffff")+'"></label>';
    const setTab=tab=>{
      root.querySelectorAll(".char-tab-v2").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));
      if(tab==="face")panel.innerHTML='<div class="char-grid-v2">'+option("Olhos","eyeStyle",draft.eyeStyle||"normal",["normal","grande","fechado","estreito","brilhante"])+option("Sobrancelhas","browStyle",draft.browStyle||"normal",["normal","reto","arqueada","forte","preocupada"])+option("Boca","mouthStyle",draft.mouthStyle||"normal",["normal","sorriso","serio","aberta","surpreso","triste"])+option("Nariz","noseStyle",draft.noseStyle||"normal",["normal","fino","arredondado","arrebitado"])+color("Pele","skin",draft.skin)+'</div>';
      else if(tab==="body")panel.innerHTML='<div class="char-grid-v2">'+option("Sexo","gender",draft.gender||"masculino",["masculino","feminino"])+option("Corpo","bodyType",draft.bodyType||"normal",["magro","normal","forte"])+option("Orelhas","earStyle",draft.earStyle||"normal",["normal","pequena","redonda","pontuda"])+'</div>';
      else if(tab==="hair")panel.innerHTML='<div class="char-grid-v2">'+option("Cabelo","hairStyle",draft.hairStyle||"curto",["curto","medio","longo","cacheado","crespo","coque","raspado","moicano","franja","lateral"])+color("Cor do cabelo","hair",draft.hair)+'</div>';
      else if(tab==="colors")panel.innerHTML='<div class="char-grid-v2">'+color("Camisa base","shirt",draft.shirt)+color("Calça base","pants",draft.pants)+color("Tênis base","shoes",draft.shoes)+'</div>';
      else{
        const allowed=owned.filter(p=>["roupa","tecnologia","equipamento"].includes(p.type));
        panel.innerHTML='<div class="char-products-v2">'+(allowed.map(p=>'<label class="char-product-v2"><input type="checkbox" data-product="'+esc(p.id)+'" '+(draft.accessories.includes(String(p.id))?"checked":"")+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.clothingCustomization?.category||p.type)+'</small></span></label>').join("")||'<span class="char-hint-v2">Nenhum produto compatível comprado ainda.</span>')+'</div>';
      }
      panel.querySelectorAll("[data-field]").forEach(x=>x.onchange=()=>{draft[x.dataset.field]=x.value;redraw();setTab(tab)});
      panel.querySelectorAll("[data-product]").forEach(x=>x.onchange=()=>{const id=String(x.dataset.product);if(x.checked&&!draft.accessories.includes(id))draft.accessories.push(id);if(!x.checked)draft.accessories=draft.accessories.filter(v=>String(v)!==id);redraw();setTab("products")});
    };
    root.querySelectorAll(".char-tab-v2").forEach(x=>x.onclick=()=>setTab(x.dataset.tab));
    root.querySelector("#charSaveV2").onclick=async()=>{try{const d=await put("/api/me/character",{character:draft});me.character=d.character;toast(d.message||"Personagem atualizado!");redraw()}catch(e){toast(e.message,"error")}};
    setTab("face");
  };
  redraw();
}

async function inventoryPage(box){
 const [d,cd]=await Promise.all([api("/api/inventory"),api("/api/company-inventory")]);
 const inv=d.inventory||{},companyItems=cd.items||[];
 const items=(d.items||[]).filter(i=>inv[i.id]).map(i=>`<article class="item-card"><div class="item-icon">${i.icon}</div><div><h3>${esc(i.name)}</h3><small>Quantidade: ${inv[i.id]}${i.rewardItem?' • Recompensa':''}</small><p>${i.rewardItem?esc(i.description||'Item recebido por código de resgate.'):'+'+(i.hunger||0)+' fome, +'+(i.hydration||0)+' hidratação, +'+(i.energy||0)+' energia'}</p></div>${i.rewardItem?'':'<button class="primary" onclick="useItem('+i.id+')">Usar</button>'}</article>`).join('');
 const companyCards=companyItems.map(x=>{const p=x.product||{},id=String(p.id||'');let action=p.type==='consumivel'?'<button class="primary" onclick="useCompanyItem(\''+id+'\')">Usar</button>':'<button class="primary" onclick="productSystemEquip(\''+id+'\')">Equipar</button>';return '<article class="item-card product-system-card"><div class="item-icon">'+(p.image?'<img src="'+esc(p.image)+'" alt="">':esc(p.emoji||'📦'))+'</div><div><small>'+esc(x.companyName||'Empresa')+'</small><h3>'+esc(p.name||'Produto')+'</h3><small>Quantidade: '+Number(x.quantity||0)+'</small><p>'+esc(p.description||'Produto da cidade')+'</p></div>'+action+'</article>'}).join('');
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">SEUS PERTENCES</span><h1>Inventário</h1><p>Use seus itens comuns e produtos comprados nas empresas.</p></div><button class="ghost" onclick="nav('shop')">🏪 Ir para Lojas</button></div><section class="inventory-section"><div class="section-head"><div><span class="eyebrow">ITENS DA CIDADE</span><h3>Itens comuns</h3></div></div><div class="items-grid">${items.length?items:'<div class="empty"><div>📭</div><h3>Nenhum item comum</h3><p>Compre itens na Loja.</p></div>'}</div></section><section class="inventory-section"><div class="section-head"><div><span class="eyebrow">PRODUTOS DE EMPRESAS</span><h3>Produtos comprados</h3></div></div><div class="items-grid">${companyCards||'<div class="empty"><div>📦</div><h3>Nenhum produto de empresa</h3><p>Compre um produto em Lojas.</p></div>'}</div></section>`;
}
async function useCompanyItem(productId){try{const d=await post("/api/company-inventory/use",{productId});me=d.user;updateHUD();toast(d.message);loadPage("inventory")}catch(e){toast(e.message,"error")}}

async function useItem(id){try{const d=await post("/api/inventory/use",{itemId:id});me=d.user;updateHUD();toast(d.message);loadPage("inventory")}catch(e){toast(e.message,"error")}}

async function companiesPage(box){
 const d=await api("/api/my-companies"),companies=d.companies||[];
 const cards=companies.map(c=>`<article class="owner-company-card"><div><span class="eyebrow">EMPRESA</span><h3>${esc(c.name)}</h3><p>${esc(c.description||'')}</p></div><div class="company-kpis"><div><b>${money(c.balance)}</b><small>Saldo</small></div><div><b>${c.salesCount||0}</b><small>Vendas</small></div><div><b>Nível ${c.level||1}</b><small>${c.xp||0} XP</small></div></div><div class="company-owner-actions"><button class="primary" onclick="openCompanyDashboard('${c.id}')">Gerenciar empresa</button></div></article>`).join('');
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">MEUS NEGÓCIOS</span><h1>Empresas</h1><p>Aqui você cria e acompanha suas empresas. As compras ficam em Lojas.</p></div><button class="primary" onclick="openCreateCompany()">＋ Criar empresa</button></div><div class="owner-companies-grid">${cards||'<div class="empty"><div>🏢</div><h3>Você ainda não tem uma empresa</h3><p>Crie sua primeira empresa para começar a vender.</p></div>'}</div>`;
}

async function deleteCompanyPrompt(id){const reason=prompt('Por que você quer excluir esta empresa?\nInforme uma justificativa com pelo menos 10 caracteres.');if(reason===null)return;if(reason.trim().length<10){toast('A justificativa precisa ter pelo menos 10 caracteres.','error');return}if(!confirm('Tem certeza? A empresa será excluída e você receberá R$ 5.000.'))return;try{const d=await fetch('/api/companies/'+encodeURIComponent(id),{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('sorokiba_token')||'')},body:JSON.stringify({reason})}).then(async r=>{let x={};try{x=await r.json()}catch(_){x={}}if(!r.ok)throw new Error(x.error||('Erro ao excluir a empresa ('+r.status+').'));return x});me.money=(Number(me.money)||0)+Number(d.refund||0);updateHUD();closeModal();toast(d.message);loadPage('companies')}catch(e){toast(e.message,'error')}}
async function openCompanyDashboard(id){
 const d=await api("/api/company-sales?companyId="+encodeURIComponent(id)),c=(await api("/api/companies/"+encodeURIComponent(id))).company;
 const sales=Array.isArray(d.sales)?d.sales:[],now=Date.now(),dayAgo=now-24*60*60*1000;
 const last24=sales.filter(x=>{const t=Date.parse(x.date);return Number.isFinite(t)&&t>=dayAgo&&t<=now});
 const revenue24=last24.reduce((a,x)=>a+Number(x.total||0),0),units24=last24.reduce((a,x)=>a+Number(x.quantity||0),0);
 const hourly=Array.from({length:24},(_,n)=>{const end=now-(23-n)*60*60*1000,start=end-60*60*1000;const rows=last24.filter(x=>{const t=Date.parse(x.date);return t>=start&&t<end});return{label:new Date(end).getHours().toString().padStart(2,'0')+'h',value:rows.reduce((a,x)=>a+Number(x.total||0),0)}});
 const max=Math.max(1,...hourly.map(x=>x.value));
 const top={};last24.forEach(x=>{top[x.product]=(top[x.product]||0)+Number(x.quantity||0)});const topProduct=Object.entries(top).sort((a,b)=>b[1]-a[1])[0];
 const chart=hourly.map(x=>'<div class="company-chart-col" title="'+x.label+' · '+money(x.value)+'"><div class="company-chart-bar" style="height:'+Math.max(4,(x.value/max)*100)+'%"></div><span>'+x.label+'</span></div>').join('');
 const salesRows=sales.slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,20);
 openModal(`<div class="company-dashboard company-dashboard-pro">
  <div class="company-dashboard-hero"><div><span class="eyebrow">CENTRAL DA EMPRESA</span><h2>${esc(c.name)}</h2><p>${esc(c.description||'Empresa de Sorokiba')} · ${esc(c.companyTypeLabel||'Empresa')}</p></div><button class="ghost" onclick="openEditCompany('${id}')">Editar empresa</button></div>
  <section class="company-info-strip"><div><small>PROPRIETÁRIO</small><b>${esc(c.ownerName||'Você')}</b></div><div><small>CRIADA EM</small><b>${c.createdAt?new Date(c.createdAt).toLocaleDateString('pt-BR'):'—'}</b></div><div><small>NÍVEL</small><b>${d.level||1} · ${d.xp||0} XP</b></div><div><small>PRÓXIMA TAXA</small><b>${d.nextFeeAt?new Date(d.nextFeeAt).toLocaleDateString('pt-BR'):'—'}</b></div></section>
  <section><div class="company-dashboard-title"><div><span class="eyebrow">DESEMPENHO</span><h3>Últimas 24 horas</h3></div><span class="dashboard-live">● ATUALIZADO AGORA</span></div>
   <div class="company-kpis dashboard-kpis"><div><b>${money(revenue24)}</b><small>Faturamento nas 24h</small></div><div><b>${units24}</b><small>Unidades vendidas</small></div><div><b>${last24.length}</b><small>Pedidos nas 24h</small></div><div><b>${topProduct?esc(topProduct[0]):'—'}</b><small>Produto mais vendido</small></div></div>
   <div class="company-chart-card"><div class="chart-heading"><div><h4>Faturamento por hora</h4><small>Últimas 24 horas · valores reais das vendas registradas</small></div><strong>${money(revenue24)}</strong></div><div class="company-sales-chart">${chart}</div></div>
  </section>
  <section><div class="company-dashboard-title"><div><span class="eyebrow">CATÁLOGO</span><h3>Produtos da empresa</h3></div><button class="primary" onclick="openAddCompanyProduct('${id}')">＋ Produto</button></div><div class="company-products-grid">${(c.products||[]).map(p=>`<div class="owner-product-mini"><b>${p.emoji||'📦'} ${esc(p.name)}</b><span>${money(p.price)}</span><small>${esc(p.type)} · estoque/venda ativa</small></div>`).join('')}</div></section>
  <section><div class="company-dashboard-title"><div><span class="eyebrow">HISTÓRICO</span><h3>Últimas vendas</h3></div></div><div class="sales-list">${salesRows.length?salesRows.map(x=>`<div><b>${esc(x.product)}</b><span>x${Number(x.quantity)||0} — ${money(x.total)}</span><small>${x.date?new Date(x.date).toLocaleString('pt-BR'):'—'}</small></div>`).join(''):'<div class="empty">Nenhuma venda registrada ainda. Quando um jogador comprar, ela aparecerá aqui.</div>'}</div></section>
  <div class="company-fee-note">Taxa semanal da empresa: <b>R$ 250</b> · Saldo atual: <b>${money(d.balance)}</b></div>
  <div class="company-danger-zone"><h4>Excluir empresa</h4><p>A exclusão encerra a empresa e devolve <b>R$ 5.000</b>, metade da taxa de criação de R$ 10.000. A justificativa é obrigatória.</p><button class="ghost danger" onclick="deleteCompanyPrompt('${id}')">Excluir minha empresa</button></div>
 </div>`);
}
async function shopPage(box){
 const card=c=>`<article class="company-card" onclick="openCompany('${c.id}')"><div class="company-cover">${c.companyImage?'<img src="'+c.companyImage+'" alt="">':'<span>'+esc(c.products?.[0]?.emoji||'🏢')+'</span>'}</div><div class="company-card-body"><div class="company-name-row"><h3>${esc(c.name)}</h3>${c.featured?'<span class="company-featured">DESTAQUE</span>':''}</div><p>${esc(c.description||'Empresa de Sorokiba')}</p><small>🛍️ ${c.productCount} produto${c.productCount===1?'':'s'}</small></div></article>`;
 const pharmacyCard=`<section class="company-section"><div class="section-head"><div><span class="eyebrow">LOJA DA CIDADE</span><h3>Farmácia Hospitalar Sorokiba</h3></div></div><article class="company-card pharmacy-store-card" role="button" tabindex="0" onclick="currentPage='pharmacy';loadPage('pharmacy')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();currentPage='pharmacy';loadPage('pharmacy')}"><div class="pharmacy-store-art"><span>✚</span><small>FARMÁCIA</small></div><div class="company-card-body"><div class="company-name-row"><h3>Farmácia Sorokiba</h3><span class="company-featured">ATENDIMENTO NPC</span></div><p>Medicamentos de suporte, atendimento no balcão com receita ou compra rápida no autoatendimento.</p><small>💊 Catálogo completo · preços em reais</small></div></article></section>`;
 const loading=`<div class="company-section"><div class="section-head"><div><span class="eyebrow">EMPRESAS</span><h3>Carregando lojas...</h3></div></div><div class="loading-card"><div class="spinner"></div>Carregando lojas da cidade...</div></div>`;
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">LOJAS DE SOROKIBA</span><h1>Comprar</h1><p>Escolha uma loja da cidade ou visite a farmácia hospitalar.</p></div></div>${pharmacyCard}<div class="company-search"><input placeholder="Pesquisar empresa ou produto..." oninput="searchCompanies(this.value)"></div><div id="companyStoreResults">${loading}</div>`;
 try{
  const d=await api("/api/companies"),featured=d.featured||[],recent=d.recent||[];
  if(!box.isConnected||currentPage!=="shop")return;
  document.getElementById("companyStoreResults").innerHTML=`${featured.length?`<section class="company-section"><div class="section-head"><div><span class="eyebrow">EM DESTAQUE</span><h3>Empresas em destaque</h3></div></div><div class="companies-grid">${featured.map(card).join('')}</div></section>`:''}<section class="company-section"><div class="section-head"><div><span class="eyebrow">EMPRESAS</span><h3>Conheça as lojas</h3></div></div><div class="companies-grid">${recent.length?recent.map(card).join(''):'<div class="empty"><div>🏪</div><h3>Ainda não há empresas</h3></div>'}</div></section>`;
 }catch(error){
  const results=document.getElementById("companyStoreResults");
  if(results&&box.isConnected&&currentPage==="shop")results.innerHTML=`<div class="empty"><div>⚠️</div><h3>Não foi possível carregar as outras lojas</h3><p>${esc(error.message)} A Farmácia Sorokiba continua disponível acima.</p></div>`;
 }
}
async function pharmacyStorePage(box){
 const d=await api("/api/hospital");
 box.innerHTML=`<div class="company-page pharmacy-store-page"><button class="ghost company-back" onclick="currentPage='shop';loadPage('shop')">← Voltar para lojas</button>${hospitalPharmacyPanel(d.pharmacy,d.visit,d.visit?.stage||"reception",{shopMode:true,returnPage:"pharmacy"})}</div>`;
 hospitalLive(box,d.visit,"pharmacy");
}
async function searchCompanies(q){
 const d=await api("/api/companies?search="+encodeURIComponent(q||"")),box=document.getElementById("companyStoreResults");if(!box)return;
 const list=d.companies||[],card=c=>`<article class="company-card" onclick="openCompany('${c.id}')"><div class="company-cover">${c.companyImage?'<img src="'+c.companyImage+'" alt="">':'<span>'+esc(c.products?.[0]?.emoji||'🏢')+'</span>'}</div><div class="company-card-body"><h3>${esc(c.name)}</h3><p>${esc(c.description||'')}</p><small>🛍️ ${c.productCount} produto${c.productCount===1?'':'s'}</small></div></article>`;
 box.innerHTML=`<section class="company-section"><div class="section-head"><div><span class="eyebrow">RESULTADOS</span><h3>${list.length} empresa${list.length===1?'':'s'}</h3></div></div><div class="companies-grid">${list.length?list.map(card).join(''):'<div class="empty"><div>🔎</div><h3>Nenhuma empresa encontrada</h3></div>'}</div></section>`;
}
async function openCompany(id){
 const d=await api("/api/companies/"+encodeURIComponent(id)),c=d.company;
 const box=document.getElementById("content");if(!box)return;
 const products=(c.products||[]).map(p=>`<article class="company-product company-product-page">
   <div class="product-photo">${p.image?'<img src="'+p.image+'" alt="">':'<span>'+esc(p.emoji||'📦')+'</span>'}</div>
   <div class="product-info">
    <span class="product-type">${esc(p.type||'produto')}</span>
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.description||'Sem descrição.')}</p>
    ${p.type==='consumivel'&&Object.keys(p.effects||{}).length?'<div class="product-effects">'+Object.entries(p.effects||{}).map(([k,v])=>`<span>${k==='hunger'?'🍽️':k==='hydration'?'💧':k==='energy'?'⚡':'❤️'} ${v>0?'+':''}${v}</span>`).join('')+'</div>':''}
    <strong>${money(p.price)}</strong>
    <div class="company-buy-row">${(d.isOwner&&!(c.companyType==='alimentacao'&&p.type==='consumivel'))?'<span class="company-owner-note">🔒 Você é o dono desta empresa e não pode comprar este produto.</span>':'<label>Quantidade<input id="qty-'+p.id+'" type="number" min="1" max="99" value="1"></label><button class="primary" onclick="buyCompanyProduct(\''+c.id+'\',\''+p.id+'\')">Comprar</button>'}</div>
   </div>
  </article>`).join('');
 box.innerHTML=`<div class="company-page">
  <button class="ghost company-back" onclick="loadPage('shop')">← Voltar para lojas</button>
  <div class="company-page-hero">
   <div class="company-page-icon">${c.companyImage?'<img src="'+c.companyImage+'" alt="">':esc(c.products?.[0]?.emoji||'🏢')}</div>
   <div class="company-page-info"><span class="eyebrow">LOJA</span><h1>${esc(c.name)}</h1><div class="company-owner">👤 Dono: ${esc(c.ownerName||c.ownerUsername)}</div></div>
  </div>
  <div class="company-products-title"><div><span class="eyebrow">PRODUTOS</span><h2>Produtos disponíveis</h2></div></div>
  <div class="company-products-grid company-public-products">${products||'<div class="empty"><div>📦</div><h3>Nenhum produto disponível</h3></div>'}</div>
 </div>`;
}
async function buyCompanyProduct(companyId,productId){
 try{
  const input=document.getElementById("qty-"+productId);
  const q=Math.max(1,Math.min(99,Math.floor(Number(input?.value)||1)));
  const d=await post("/api/companies/"+encodeURIComponent(companyId)+"/products/"+encodeURIComponent(productId)+"/buy",{quantity:q});
  me=d.user;updateHUD();toast(d.message);await loadPage('inventory');
 }catch(e){toast(e.message,"error")}
}
function openAddCompanyProductPage(companyId){openAddCompanyProduct(companyId)}
function readProductImage(input){return new Promise(resolve=>{const f=input?.files?.[0];if(!f)return resolve("");if(!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(f.type)||f.size>400000){toast("Imagem JPG, PNG, WEBP ou GIF de até 400 KB.","error");return resolve(null)}const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>resolve(null);r.readAsDataURL(f)})}
function technologyCustomizationFields(v={}){
 const x=v||{},category=x.category||'Celular',target=['Dinheiro','Comida','XP'].includes(x.effectTarget)?x.effectTarget:'XP',effect=Math.max(1,Math.min(20,Number(x.effect)||1)),utility=x.utilityDescription||'Aumenta '+target,color=x.color||'#5b6cff',accent=x.accent||'#25d0a5';
 const opt=(name,val,arr,field)=>'<label class="tech-field"><span>'+name+'</span><select name="'+field+'">'+arr.map(o=>'<option'+(o===val?' selected':'')+'>'+o+'</option>').join('')+'</select></label>';
 return '<div class="technology-customizer tech-studio"><div class="tech-studio-head"><div><span>TECH STUDIO</span><h3>Construa sua tecnologia</h3><p>Crie um produto com aparência, componentes e benefício próprios.</p></div><strong>AO VIVO</strong></div><div class="tech-showcase"><div class="tech-product-stage"><div class="tech-device tech-'+category.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'" id="techPreview" style="--tech-color:'+color+';--tech-accent:'+accent+'"><i class="tech-screen"></i><i class="tech-camera"></i><i class="tech-button"></i><i class="tech-watch-face"></i><i class="tech-watch-strap"></i></div><div class="tech-orbit"></div></div><div class="tech-product-info"><span>PRODUTO</span><h3 id="techPreviewName">'+esc(category)+'</h3><p id="techPreviewEffect">'+esc(utility)+' · +'+effect+'% em '+esc(target)+'</p><div class="tech-mini-specs"><span>Versão <b>'+esc(x.version||'1.0')+'</b></span><span>Material <b>'+esc(x.material||'Alumínio')+'</b></span></div></div></div><div class="tech-studio-grid"><section class="tech-card"><header><b>01</b><div><h4>Identidade</h4><small>Defina a aparência do produto.</small></div></header><div class="tech-fields">'+opt('Tipo',category,['Celular','Computador','Tablet','Relógio inteligente','Console'],'techCategory')+'<label class="tech-field"><span>Versão</span><input name="techVersion" value="'+esc(x.version||'1.0')+'" maxlength="30"></label><label class="tech-field"><span>Cor principal</span><input name="techColor" type="color" value="'+color+'"></label><label class="tech-field"><span>Cor de destaque</span><input name="techAccent" type="color" value="'+accent+'"></label>'+opt('Material',x.material||'Alumínio',['Alumínio','Vidro','Aço','Plástico premium','Fibra de carbono'],'techMaterial')+opt('Acabamento',x.finish||'Fosco',['Fosco','Brilhante','Metalizado','Texturizado'],'techFinish')+'</div></section><section class="tech-card"><header><b>02</b><div><h4>Componentes</h4><small>Monte a configuração do aparelho.</small></div></header><div class="tech-fields">'+opt('Tela',x.screen||'OLED',['LCD','OLED','AMOLED','Mini-LED'],'techScreen')+opt('Câmera',x.camera||'Dupla',['Única','Dupla','Tripla','Profissional'],'techCamera')+opt('Armazenamento',x.storage||'128 GB',['32 GB','64 GB','128 GB','256 GB','512 GB','1 TB'],'techStorage')+'<label class="tech-field"><span>Bateria</span><input name="techBattery" value="'+esc(x.battery||'4500 mAh')+'"></label></div><label class="tech-field tech-wide"><span>Especificações</span><textarea name="techSpecs" maxlength="300" placeholder="Processador, sensores, recursos...">'+esc(x.specs||'')+'</textarea></label></section><section class="tech-card tech-benefit"><header><b>03</b><div><h4>Benefício para a cidade</h4><small>Escolha somente uma das três melhorias.</small></div></header><div class="tech-benefit-options"><label><input type="radio" name="techUtilityType" value="Dinheiro" '+(target==='Dinheiro'?'checked':'')+'><span>💰<b>Dinheiro</b><small>Aumenta o dinheiro recebido</small></span></label><label><input type="radio" name="techUtilityType" value="Comida" '+(target==='Comida'?'checked':'')+'><span>🍔<b>Comida</b><small>Aumenta o ganho de comida</small></span></label><label><input type="radio" name="techUtilityType" value="XP" '+(target==='XP'?'checked':'')+'><span>⭐<b>XP</b><small>Aumenta o ganho de experiência</small></span></label></div><div class="tech-effect-row"><label class="tech-field"><span>Descrição do benefício</span><input name="techUtility" value="'+esc(utility)+'" maxlength="120"></label><label class="tech-field"><span>Melhoria</span><input name="techEffect" type="number" min="1" max="20" value="'+effect+'"></label></div><div class="tech-effect-live"><span>EFEITO DO PRODUTO</span><b id="techEffectLive">+'+effect+'% em '+esc(target)+'</b></div></section></div></div>';
}
function readTechnologyCustomization(f){return{category:f.techCategory?.value||'Celular',utility:f.techUtilityType?.value||'XP',version:f.techVersion?.value||'1.0',specs:f.techSpecs?.value||'',color:f.techColor?.value||'#5b6cff',accent:f.techAccent?.value||'#25d0a5',material:f.techMaterial?.value||'Alumínio',finish:f.techFinish?.value||'Fosco',screen:f.techScreen?.value||'OLED',camera:f.techCamera?.value||'Dupla',storage:f.techStorage?.value||'128 GB',battery:f.techBattery?.value||'4500 mAh',utilityDescription:f.techUtility?.value||'Aumenta XP',effectTarget:f.techUtilityType?.value||'XP',effect:Math.max(1,Math.min(20,Number(f.techEffect?.value)||1))}}

function updateTechnologyPreview(f){const box=f.querySelector('.technology-customizer');if(!box)return;const category=f.techCategory?.value||'Celular',color=f.techColor?.value||'#5b6cff',accent=f.techAccent?.value||'#25d0a5',utility=f.techUtility?.value||'Aumenta energia',target=f.techUtilityType?.value||'Energia',effect=Math.max(1,Math.min(20,Number(f.techEffect?.value)||1));const p=box.querySelector('#techPreview');if(p){p.style.setProperty('--tech-color',color);p.style.setProperty('--tech-accent',accent);p.className='tech-device tech-'+category.toLowerCase().replace(/[^a-z0-9]+/g,'-')}const n=box.querySelector('#techPreviewName');if(n)n.textContent=category;if(n&&f.productName)n.textContent=f.productName.value||category;const s=box.querySelector('#techPreviewEffect');if(s)s.textContent=utility+' • +'+effect+'% em '+target;const live=box.querySelector('#techEffectLive');if(live)live.textContent='+'+effect+'% em '+target}

function bindTechnologyCustomizer(f){const box=f.querySelector('.technology-customizer');if(!box)return;box.querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('input',()=>updateTechnologyPreview(f));el.addEventListener('change',()=>updateTechnologyPreview(f))});updateTechnologyPreview(f)}
function clothingSlug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}

function clothingCustomizationFields(v={}){
 const x=v||{},category=x.category||'Camiseta',style=x.style||'Casual',size=x.size||'M',pattern=x.pattern||'Lisa',primary=x.primaryColor||'#20242c',secondary=x.secondaryColor||'#e8edf5',fabric=x.fabric||'Algodão',fit=x.fit||'Normal',collar=x.collar||'Redonda',detail=x.detail||'Nenhum',sole=x.sole||'Clássica',lens=x.lens||'Transparente',lensColor=x.lensColor||secondary,shape=x.shape||'Clássico',shoeModel=x.shoeModel||'Esportivo',closure=x.closure||'Cadarço',frameStyle=x.frameStyle||'Esportivo',frameMaterial=x.frameMaterial||'Acetato';
 return '<div class="clothing-customizer"><div class="customizer-head"><div><span class="customizer-step">ATELIÊ</span><strong>Personalização</strong><small>As opções mudam conforme a peça escolhida.</small></div><div class="customizer-status">RASCUNHO</div></div><div class="clothing-preview"><div class="clothing-stage"><div class="garment garment-'+clothingSlug(category)+'" id="clothingPreview" style="--cloth-primary:'+primary+';--cloth-secondary:'+secondary+';--cloth-lens:'+lensColor+'"><i class="garment-detail"></i><i class="garment-pattern"></i><i class="garment-extra"></i></div></div><div class="clothing-summary"><span>Prévia em tempo real</span><b id="clothingPreviewName">'+esc(category)+'</b><small id="clothingPreviewInfo">'+esc(style)+' • '+esc(size)+'</small></div></div><div class="customizer-section"><h4>1. Produto</h4><div class="form-row-2"><label>Categoria<select name="clothCategory"><option>Camiseta</option><option>Calça</option><option>Jaqueta</option><option>Boné</option><option>Tênis</option><option>Óculos</option></select></label><label class="cloth-size-option">Tamanho<select name="clothSize"><option>P</option><option>M</option><option>G</option><option>GG</option></select></label></div></div><div class="customizer-section category-options" data-for="roupa"><h4>2. Visual da roupa</h4><div class="form-row-2"><label>Estilo<select name="clothStyle"><option>Casual</option><option>Esportivo</option><option>Urbano</option><option>Social</option><option>Elegante</option><option>Streetwear</option><option>Vintage</option></select></label><label>Ajuste<select name="clothFit"><option>Normal</option><option>Solto</option><option>Justo</option><option>Oversized</option></select></label><label>Material<select name="clothFabric"><option>Algodão</option><option>Jeans</option><option>Couro sintético</option><option>Poliéster</option><option>Malha</option><option>Tecido premium</option></select></label><label class="only-top">Gola<select name="clothCollar"><option>Redonda</option><option>V</option><option>Alta</option><option>Sem gola</option></select></label><label>Detalhe<select name="clothDetail"><option>Nenhum</option><option>Faixa</option><option>Costura</option><option>Bolso</option><option>Faixa dupla</option><option>Zíper</option></select></label></div></div><div class="customizer-section category-options" data-for="Tênis"><h4>2. Design do tênis</h4><div class="form-row-2"><label>Estilo<select name="clothShoeModel"><option>Esportivo</option><option>Corrida</option><option>Basquete</option><option>Skate</option><option>Casual</option><option>Futebol</option></select></label><label>Fechamento<select name="clothClosure"><option>Cadarço</option><option>Velcro</option><option>Slip-on</option></select></label><label>Solado<select name="clothSole"><option>Baixo</option><option>Esportivo</option><option>Alto</option><option>Transparente</option></select></label><label>Detalhe<select name="clothShoeDetail"><option>Nenhum</option><option>Listras</option><option>Costura</option><option>Faixa</option><option>Refletivo</option><option>Textura</option></select></label></div></div><div class="customizer-section category-options" data-for="Óculos"><h4>2. Design dos óculos</h4><div class="form-row-2"><label>Formato<select name="clothShape"><option>Clássico</option><option>Redondo</option><option>Quadrado</option><option>Aviador</option><option>Aerodinâmico</option></select></label><label>Armação<select name="clothFrameStyle"><option>Esportivo</option><option>Minimalista</option><option>Retro</option><option>Premium</option></select></label><label>Material<select name="clothFrameMaterial"><option>Acetato</option><option>Metal</option><option>Policarbonato</option><option>Esportivo</option></select></label><label>Tipo de lente<select name="clothLens"><option>Transparente</option><option>Escura</option><option>Colorida</option><option>Reflexiva</option></select></label><label>Cor da lente<input name="clothLensColor" type="color" value="'+lensColor+'"></label></div></div><div class="customizer-section color-section"><h4>3. Cores</h4><div class="form-row-2"><label>Cor principal<input name="clothPrimaryColor" type="color" value="'+primary+'"></label><label>Cor de detalhe<input name="clothSecondaryColor" type="color" value="'+secondary+'"></label><label class="pattern-option">Estampa<select name="clothPattern"><option>Lisa</option><option>Listras</option><option>Pontos</option><option>Xadrez</option><option>Degradê</option><option>Camuflagem</option><option>Geométrica</option></select></label></div></div><div class="design-note" id="clothingCategoryHint"></div></div>';
}
function readClothingCustomization(f){return{category:f.clothCategory?.value,style:f.clothStyle?.value,size:f.clothSize?.value,pattern:f.clothPattern?.value,primaryColor:f.clothPrimaryColor?.value,secondaryColor:f.clothSecondaryColor?.value,fabric:f.clothFabric?.value,fit:f.clothFit?.value,collar:f.clothCollar?.value,detail:f.clothDetail?.value,sole:f.clothSole?.value,lens:f.clothLens?.value,lensColor:f.clothLensColor?.value,shape:f.clothShape?.value,shoeModel:f.clothShoeModel?.value,closure:f.clothClosure?.value,shoeDetail:f.clothShoeDetail?.value,frameStyle:f.clothFrameStyle?.value,frameMaterial:f.clothFrameMaterial?.value}}
function renderClothingPreview(p,category,opts){
 const {style,primary,secondary,pattern,size,fit,collar,detail,shape,lens,lensColor,frameStyle,frameMaterial}=opts;
 const uid='c'+Math.random().toString(36).slice(2,7);
 const pat=pattern==='Listras'?'<path d="M20 80L210 20M10 115L220 45M20 150L210 85" stroke="'+secondary+'" stroke-width="10" opacity=".65"/>':pattern==='Pontos'?'<g fill="'+secondary+'"><circle cx="65" cy="75" r="7"/><circle cx="105" cy="105" r="7"/><circle cx="145" cy="75" r="7"/><circle cx="180" cy="115" r="7"/></g>':pattern==='Xadrez'?'<path d="M20 70H210M15 105H215M25 140H205M65 45V160M105 40V165M145 40V165M185 50V150" stroke="'+secondary+'" stroke-width="5" opacity=".45"/>':pattern==='Degradê'?'<rect x="15" y="35" width="200" height="130" fill="url(#'+uid+'g)"/>':'';
 let svg='';
 if(category==='Camiseta'||category==='Jaqueta'){
   const jacket=category==='Jaqueta';
   const sleeve=jacket?'M30 60L5 105L45 125L68 92':'M38 65L10 105L48 122L67 91';
   svg='<svg class="clothing-real" viewBox="0 0 240 190"><defs><linearGradient id="'+uid+'g"><stop stop-color="'+primary+'"/><stop offset="1" stop-color="'+secondary+'"/></linearGradient></defs><path d="'+sleeve+'" fill="'+primary+'"/><path d="M'+(jacket?'67 52':'72 54')+'L'+(jacket?'95 38':'98 35')+'L120 52L142 35L'+(jacket?'173 52':'168 54')+'L'+(jacket?'205 110L172 125L165 91L165 165L75 165L75 91L68 125L35 110L67 52Z':'205 110L170 125L164 92L164 165L76 165L76 92L70 125L35 110L67 54Z')+'" fill="url(#'+uid+'g)" stroke="rgba(0,0,0,.22)" stroke-width="3"/>'+(jacket?'<path d="M120 52V165M104 45L120 64L136 45" stroke="'+secondary+'" stroke-width="5" fill="none"/>':'<path d="'+(collar==='V'?'M105 36L120 58L135 36':collar==='Alta'?'M104 37Q120 55 136 37':'M103 38Q120 52 137 38')+'" fill="none" stroke="'+secondary+'" stroke-width="5"/>')+pat+(detail==='Bolso'?'<rect x="132" y="112" width="25" height="24" rx="3" fill="none" stroke="'+secondary+'" stroke-width="4"/>':detail==='Zíper'?'<path d="M120 55V158" stroke="'+secondary+'" stroke-width="4" stroke-dasharray="5 5"/>':'')+'</svg>';
 } else if(category==='Calça'){
   const wide=fit==='Solto'||fit==='Oversized';
   svg='<svg class="clothing-real" viewBox="0 0 220 230"><defs><linearGradient id="'+uid+'g"><stop stop-color="'+primary+'"/><stop offset="1" stop-color="'+secondary+'"/></linearGradient></defs><path d="M'+(wide?'45':'55')+' 25H'+(wide?'175':'165')+'L'+(wide?'166':'153')+' 102L'+(wide?'198':'158')+' 211H'+(wide?'145':'139')+'L120 122L'+(wide?'95':'101')+' 211H'+(wide?'42':'80')+'L'+(wide?'54':'62')+' 102Z" fill="url(#'+uid+'g)" stroke="rgba(0,0,0,.24)" stroke-width="3"/><path d="M120 28V122M65 100H175" stroke="'+secondary+'" stroke-width="4" opacity=".8"/>'+ (detail==='Bolso'?'<path d="M70 62L101 74L92 104L64 91M170 62L139 74L148 104L176 91" fill="none" stroke="'+secondary+'" stroke-width="4"/>':'')+pat+'</svg>';
 } else if(category==='Boné'){
   svg='<svg class="clothing-real" viewBox="0 0 240 170"><path d="M48 102Q50 45 120 38Q190 45 192 102L171 111H69Z" fill="'+primary+'" stroke="rgba(0,0,0,.25)" stroke-width="4"/><path d="M69 101Q120 86 174 101Q218 105 224 121Q180 145 116 129Q70 122 35 118Q38 106 69 101Z" fill="'+secondary+'" stroke="rgba(0,0,0,.22)" stroke-width="3"/><path d="M82 76Q120 59 158 76" fill="none" stroke="'+secondary+'" stroke-width="5"/></svg>';
 } else if(category==='Tênis'){ renderSneakerPreview(p,opts.shoeModel,primary,secondary,opts.sole,opts.closure,opts.shoeDetail); return; } else if(category==='Óculos'){
   const round=shape==='Redondo', square=shape==='Quadrado', avi=shape==='Aviador';
   const rx=round?'42':square?'8':avi?'22':'18';
   svg='<svg class="clothing-real glasses-real" viewBox="0 0 250 120"><path d="M18 49Q22 39 34 39H91Q103 39 108 52L105 76Q101 91 84 94H48Q30 91 25 76Z" fill="'+(lens==='Escura'?'#17202b':lens==='Colorida'?lensColor:'rgba(220,240,255,.25)')+'" stroke="'+primary+'" stroke-width="'+(frameStyle==='Minimalista'?'3':'7')+'" rx="'+rx+'"/><path d="M142 52Q147 39 159 39H216Q228 39 232 49L225 76Q220 91 202 94H166Q149 91 145 76Z" fill="'+(lens==='Escura'?'#17202b':lens==='Colorida'?lensColor:'rgba(220,240,255,.25)')+'" stroke="'+primary+'" stroke-width="'+(frameStyle==='Minimalista'?'3':'7')+'" rx="'+rx+'"/><path d="M106 55Q125 43 144 55" fill="none" stroke="'+primary+'" stroke-width="6"/><path d="M25 48L8 37M225 48L242 37" stroke="'+primary+'" stroke-width="6" stroke-linecap="round"/></svg>';
 } else if(category==='Tênis'){
   renderSneakerPreview(p,opts.shoeModel,primary,secondary,opts.sole,opts.closure,opts.shoeDetail); return;
 }
 p.innerHTML=svg;
}

function updateClothingPreview(f){
 const box=f.querySelector('.clothing-customizer'); if(!box)return;
 const category=f.clothCategory?.value||'Camiseta';
 const style=f.clothStyle?.value||'Casual',size=f.clothSize?.value||'M',pattern=f.clothPattern?.value||'Lisa';
 const primary=f.clothPrimaryColor?.value||'#20242c',secondary=f.clothSecondaryColor?.value||'#e8edf5';
 const fabric=f.clothFabric?.value||'Algodão',fit=f.clothFit?.value||'Normal',collar=f.clothCollar?.value||'Redonda',detail=f.clothDetail?.value||'Nenhum';
 const lens=f.clothLens?.value||'Transparente',lensColor=f.clothLensColor?.value||secondary,shape=f.clothShape?.value||'Clássico';
 const shoeModel=f.clothShoeModel?.value||'Esportivo',closure=f.clothClosure?.value||'Cadarço',sole=f.clothSole?.value||'Baixo',shoeDetail=f.clothShoeDetail?.value||'Nenhum';
 const frameStyle=f.clothFrameStyle?.value||'Esportivo',frameMaterial=f.clothFrameMaterial?.value||'Acetato';
 const p=box.querySelector('#clothingPreview');
 if(p){p.className='garment garment-'+clothingSlug(category);p.style.setProperty('--cloth-primary',primary);p.style.setProperty('--cloth-secondary',secondary);renderClothingPreview(p,category,{style,primary,secondary,pattern,size,fit,collar,detail,shape,lens,lensColor,frameStyle,frameMaterial,shoeModel,closure,sole,shoeDetail});}
 const n=box.querySelector('#clothingPreviewName');if(n)n.textContent=category;
 const info=box.querySelector('#clothingPreviewInfo');if(info)info.textContent=category==='Tênis'?shoeModel+' • '+closure+' • '+sole:category==='Óculos'?shape+' • '+frameStyle+' • '+lens:style+' • '+size+' • '+pattern;
 box.querySelectorAll('.category-options').forEach(el=>{el.hidden=el.dataset.for!==(category==='Tênis'?'Tênis':category==='Óculos'?'Óculos':'roupa')});
 box.querySelectorAll('.color-section').forEach(el=>el.hidden=false);
 box.querySelectorAll('.cloth-size-option').forEach(el=>el.hidden=category==='Óculos');
}
function bindClothingCustomizer(f){
 const box=f.querySelector('.clothing-customizer');if(!box)return;
 box.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',()=>updateClothingPreview(f));el.addEventListener('change',()=>updateClothingPreview(f));});
 updateClothingPreview(f);
}
function productCustomizationForForm(f){
 const box=f.querySelector('#productCustomizationBox');
 if(!box)return;
 const type=f.type?.value;
 box.style.display='block';
 if(type==='tecnologia'){
   box.innerHTML=technologyCustomizationFields();
   bindTechnologyCustomizer(f);
 }else if(type==='roupa'){
   box.innerHTML=clothingCustomizationFields();
   bindClothingCustomizer(f);
 }else if(type==='veiculo'){
   box.innerHTML=vehicleCustomizationFields();
   bindVehicleCustomizer(f);
 }else{
   box.innerHTML='<div class="customizer-empty"><strong>Sem editor específico</strong><span>Este produto usa as opções gerais da empresa.</span></div>';
 }
}
function companyProductFields(){return '<label>Nome do produto<input name="productName" maxlength="80" required></label><label>Descrição<textarea name="productDescription" maxlength="300"></textarea></label><div class="form-row-2"><label>Preço (R$)<input name="price" type="number" min="0.01" max="1000000" step="0.01" required></label><label>Tipo<select name="type" onchange="toggleCompanyEffects(this.value);vehicleFieldsForForm(this.form);productCustomizationForForm(this.form)"><option value="consumivel">Consumível</option><option value="equipamento">Equipamento</option><option value="tecnologia">Tecnologia</option><option value="veiculo">Veículo</option><option value="roupa">Roupa</option><option value="decoracao">Decoração</option></select></label></div><div id="companyEffectsBox" class="company-effects-form"><strong>Efeitos ao usar</strong><div class="form-row-2"><label>Fome<input name="hunger" type="number" min="-100" max="100" value="0"></label><label>Hidratação<input name="hydration" type="number" min="-100" max="100" value="0"></label><label>Energia<input name="energy" type="number" min="-100" max="100" value="0"></label><label>Vida<input name="life" type="number" min="-100" max="100" value="0"></label></div></div><div id="productCustomizationBox"></div><label>Emoji do produto <input name="emoji" maxlength="8" placeholder="Opcional"></label><label>Foto do produto <span style="opacity:.65">(opcional)</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>'}

function vehicleCustomizationFields(v={}){
 const x=v||{};
 return `<div class="vehicle-customizer"><div class="vehicle-editor-head"><div><span>GARAGEM</span><strong>Personalização do veículo</strong><small>Cada escolha altera a aparência da prévia.</small></div><div class="vehicle-status">RASCUNHO</div></div>
 <div class="vehicle-preview" id="vehiclePreview"><div class="vehicle-shape" style="--vc-body:${x.bodyColor||'#dfe6ee'};--vc-secondary:${x.secondaryColor||'#273449'};--vc-window:${x.windowColor||'#7fc8e8'};--vc-wheel:${x.wheelColor||'#151a22'};--vc-neon:${x.neonColor||'#7c5cff'}"><i class="vehicle-window"></i><i class="vehicle-body"></i><i class="vehicle-wheel left"></i><i class="vehicle-wheel right"></i><i class="vehicle-detail"></i><i class="vehicle-light"></i></div></div>
 <div class="vehicle-section"><h4>1. Carroceria e pintura</h4><div class="form-row-2">
 <label>Cor principal<input name="bodyColor" type="color" value="${x.bodyColor||'#dfe6ee'}"></label><label>Cor secundária<input name="secondaryColor" type="color" value="${x.secondaryColor||'#273449'}"></label>
 <label>Carroceria<select name="bodyStyle"><option>Esportivo</option><option>Urbano</option><option>Off-road</option><option>Luxo</option><option>Clássico</option></select></label>
 <label>Acabamento<select name="finish"><option>Brilhante</option><option>Fosco</option><option>Metalizado</option><option>Perolizado</option></select></label></div></div>
 <div class="vehicle-section"><h4>2. Rodas, vidros e iluminação</h4><div class="form-row-2">
 <label>Rodas<select name="wheels"><option>Esportivas</option><option>Clássicas</option><option>Off-road</option><option>Luxo</option><option>Corrida</option></select></label>
 <label>Vidros<select name="windows"><option>Originais</option><option>Escuros</option><option>Claros</option><option>Reflexivos</option></select></label>
 <label>Cor das rodas<input name="wheelColor" type="color" value="${x.wheelColor||'#151a22'}"></label><label>Cor dos vidros<input name="windowColor" type="color" value="${x.windowColor||'#7fc8e8'}"></label>
 <label>Faróis<select name="lights"><option>Originais</option><option>LED</option><option>Esportivos</option><option>Matrix</option></select></label><label>Cor do neon<input name="neonColor" type="color" value="${x.neonColor||'#7c5cff'}"></label></div></div>
 <div class="vehicle-section"><h4>3. Kit e detalhes</h4><div class="form-row-2">
 <label>Para-choque<select name="bumper"><option>Original</option><option>Esportivo</option><option>Off-road</option><option>Premium</option></select></label>
 <label>Escape<select name="exhaust"><option>Original</option><option>Duplo</option><option>Esportivo</option><option>Performance</option></select></label>
 <label>Cor da placa<input name="plateColor" type="color" value="${x.plateColor||'#f2f2f2'}"></label>
 </div><div class="vehicle-checks"><label><input name="spoiler" type="checkbox" ${x.spoiler?'checked':''}> Aerofólio</label><label><input name="neon" type="checkbox" ${x.neon?'checked':''}> Neon</label><label><input name="sportKit" type="checkbox" ${x.sportKit?'checked':''}> Kit esportivo</label><label><input name="roof" type="checkbox" ${x.roof?'checked':''}> Teto panorâmico</label></div></div></div>`
}
function readVehicleCustomization(f){return{bodyColor:f.bodyColor?.value,secondaryColor:f.secondaryColor?.value,wheelColor:f.wheelColor?.value,windowColor:f.windowColor?.value,neonColor:f.neonColor?.value,plateColor:f.plateColor?.value,wheels:f.wheels?.value,windows:f.windows?.value,bodyStyle:f.bodyStyle?.value,finish:f.finish?.value,lights:f.lights?.value,bumper:f.bumper?.value,exhaust:f.exhaust?.value,spoiler:!!f.spoiler?.checked,neon:!!f.neon?.checked,sportKit:!!f.sportKit?.checked,roof:!!f.roof?.checked}}
function updateVehiclePreview(f){const p=f.querySelector("#vehiclePreview .vehicle-shape");if(!p)return;const v=readVehicleCustomization(f);for(const [k,val] of Object.entries({'--vc-body':v.bodyColor,'--vc-secondary':v.secondaryColor,'--vc-window':v.windowColor,'--vc-wheel':v.wheelColor,'--vc-neon':v.neonColor}))p.style.setProperty(k,val);p.classList.toggle("has-spoiler",v.spoiler);p.classList.toggle("has-neon",v.neon);p.classList.toggle("sport-kit",v.sportKit);p.classList.toggle("panoramic-roof",v.roof);p.dataset.bodyStyle=v.bodyStyle||'';p.dataset.finish=v.finish||'';p.dataset.wheels=v.wheels||'';p.dataset.windows=v.windows||'';p.dataset.lights=v.lights||'';p.dataset.bumper=v.bumper||'';p.dataset.exhaust=v.exhaust||''}
function bindVehicleCustomizer(f){const box=f.querySelector(".vehicle-customizer");if(!box)return;box.querySelectorAll("input,select").forEach(el=>{el.addEventListener("input",()=>updateVehiclePreview(f));el.addEventListener("change",()=>updateVehiclePreview(f))});updateVehiclePreview(f)}

function vehicleFieldsForForm(f){const type=f.type?.value;const old=f.querySelector(".vehicle-customizer");if(type==="veiculo"&&!old){const wrap=document.createElement("div");wrap.innerHTML=vehicleCustomizationFields();f.appendChild(wrap.firstElementChild);bindVehicleCustomizer(f)}if(type!=="veiculo"&&old)old.remove()}

function openCreateCompany(){
 const companyTypesUI={
  tecnologia:{label:"Tecnologia",products:["tecnologia"]},
  automotiva:{label:"Automotiva",products:["veiculo"]},
  alimentacao:{label:"Alimentação",products:["consumivel"]},
  moda:{label:"Moda",products:["roupa"]}
 };
 const productNames={tecnologia:"Tecnologia",veiculo:"Veículo",consumivel:"Consumível",roupa:"Roupa"};
 const options=Object.entries(companyTypesUI).map(([k,v])=>'<option value="'+k+'">'+v.label+'</option>').join('');
 openModal('<div class="product-builder"><span class="eyebrow">NOVA EMPRESA</span><h2>Criar empresa e primeiro produto</h2><p>Escolha o setor e personalize seu primeiro produto antes de criar a empresa.</p><div class="company-creation-fee"><strong>💰 Custo para abrir a empresa: R$ 10.000</strong><span>O valor será descontado do seu dinheiro somente quando a empresa for criada com sucesso. Ao excluir a empresa, você recebe R$ 5.000 de volta.</spanSeu saldo atual: <b>R$ ${formatMoney(me?.money||0)}</b></span></div><form id="createCompanyForm" class="company-form"><section class="builder-panel"><h3>1. Sua empresa</h3><label>Nome da empresa<input name="name" maxlength="80" required></label><label>Descrição<textarea name="description" maxlength="500" required></textarea></label><label>Setor<select name="companyType">'+options+'</select></label><div id="companyAllowedProducts" class="product-system-info"></div><label>Foto da empresa <span style="opacity:.65">(opcional)</span><input name="companyImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></section><section class="builder-panel"><h3>2. Primeiro produto</h3>'+companyProductFields()+'</section><div id="firstProductCustomization" class="builder-panel"><h3>3. Personalização do primeiro produto</h3><p>Carregando editor...</p></div><button class="primary wide" type="submit">Criar empresa e primeiro produto</button></form></div>');
 const f=document.getElementById('createCompanyForm');
 const refresh=()=>{
  const allowed=companyTypesUI[f.companyType.value].products;
  f.type.innerHTML=allowed.map(x=>'<option value="'+x+'">'+productNames[x]+'</option>').join('');
  document.getElementById('companyAllowedProducts').innerHTML='<b>Produtos permitidos</b><span>'+allowed.map(x=>productNames[x]).join(', ')+'</span>';
  toggleCompanyEffects(f.type.value);
  const box=f.querySelector('#productCustomizationBox');
  const holder=document.getElementById('firstProductCustomization');
  if(box)holder.appendChild(box);
  productCustomizationForForm(f);
  if(box)holder.appendChild(box);
 };
 f.companyType.onchange=refresh;
 f.type.onchange=refresh;
 refresh();
 f.onsubmit=async e=>{
  e.preventDefault();
  try{
   const allowed=companyTypesUI[f.companyType.value].products;
   if(!allowed.includes(f.type.value))throw new Error('Este setor não pode criar esse tipo de produto.');
   const image=await readProductImage(f.image),companyImage=await readProductImage(f.companyImage);
   if(image===null||companyImage===null)return;
   const body={name:f.name.value,description:f.description.value,companyType:f.companyType.value,companyImage,product:{name:f.productName.value,description:f.productDescription.value,price:f.price.value,type:f.type.value,image,emoji:f.emoji.value,effects:{hunger:f.hunger?.value||0,hydration:f.hydration?.value||0,energy:f.energy?.value||0,life:f.life?.value||0},technologyCustomization:f.type.value==='tecnologia'?readTechnologyCustomization(f):null,clothingCustomization:f.type.value==='roupa'?readClothingCustomization(f):null,vehicleCustomization:f.type.value==='veiculo'?readVehicleCustomization(f):null}};
   const d=await post('/api/companies',body);
   closeModal();toast(d.message);loadPage('companies');
  }catch(err){toast(err.message,'error')}
 };
}
async function openEditCompany(id){const d=await api("/api/companies/"+encodeURIComponent(id)),c=d.company;openModal(`<h2>Foto da empresa</h2><p>${esc(c.name)}</p><form id="editCompanyForm" class="company-form"><label>Nova foto/logo <span style="opacity:.65">(opcional)</span><input name="companyImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><small>Deixe sem selecionar para remover a foto atual.</small><button class="primary wide" type="submit">Salvar foto</button></form>`);const f=document.getElementById("editCompanyForm");f.onsubmit=async e=>{e.preventDefault();try{const image=await readProductImage(f.companyImage);if(image===null)return;const r=await put("/api/companies/"+encodeURIComponent(id),{companyImage:image});closeModal();toast(r.message);openCompanyDashboard(id)}catch(err){toast(err.message,"error")}}}

function toggleCompanyEffects(type){const e=document.getElementById("companyEffectsBox");if(e)e.style.display=type==="consumivel"?"block":"none"}
function openAddCompanyProduct(companyId){
 openModal(`<h2>Adicionar produto</h2><form id="addCompanyProductForm" class="company-form">${companyProductFields()}<button class="primary wide" type="submit">Adicionar produto</button></form>`);
 const f=document.getElementById("addCompanyProductForm");const type=f.type;toggleCompanyEffects(type.value);vehicleFieldsForForm(f);productCustomizationForForm(f);type.addEventListener("change",()=>{toggleCompanyEffects(type.value);vehicleFieldsForForm(f);productCustomizationForForm(f)});f.onsubmit=async e=>{e.preventDefault();try{const image=await readProductImage(f.image);if(image===null)return;const d=await post("/api/companies/"+encodeURIComponent(companyId)+"/products",{name:f.productName.value,description:f.productDescription.value,price:f.price.value,type:f.type.value,image,emoji:f.emoji.value,effects:{hunger:f.hunger.value,hydration:f.hydration.value,energy:f.energy.value,life:f.life.value},vehicleCustomization:f.type.value==="veiculo"?readVehicleCustomization(f):null,technologyCustomization:f.type.value==="tecnologia"?readTechnologyCustomization(f):null,clothingCustomization:f.type.value==="roupa"?readClothingCustomization(f):null});closeModal();toast(d.message);openCompany(companyId)}catch(err){toast(err.message,"error")}};
}
async function editCompanyVehicle(companyId,productId){
 const d=await api("/api/companies/"+encodeURIComponent(companyId)),p=(d.company.products||[]).find(x=>x.id===productId);if(!p)return toast("Veículo não encontrado.","error");
 openModal(`<h2>Personalizar veículo</h2><p>${esc(p.name)}</p><form id="vehicleEditForm" class="company-form">${vehicleCustomizationFields(p.vehicleCustomization||{})}<label>Emoji do veículo<input name="emoji" maxlength="8" value="${esc(p.emoji||'🚗')}"></label><button class="primary wide" type="submit">Salvar personalização</button></form>`);
 const f=document.getElementById("vehicleEditForm");bindVehicleCustomizer(f);f.onsubmit=async e=>{e.preventDefault();try{const r=await put("/api/companies/"+encodeURIComponent(companyId)+"/products/"+encodeURIComponent(productId),{vehicleCustomization:readVehicleCustomization(f),emoji:f.emoji.value});closeModal();toast(r.message);openCompanyDashboard(companyId)}catch(err){toast(err.message,"error")}};
}
async function deleteCompanyProduct(companyId,productId){if(!confirm("Remover este produto da empresa?"))return;try{const r=await fetch("/api/companies/"+encodeURIComponent(companyId)+"/products/"+encodeURIComponent(productId),{method:"DELETE",headers:{Authorization:"Bearer "+localStorage.getItem("sorokiba_token")}});const d=await r.json();if(!r.ok)throw new Error(d.error||"Erro ao remover");toast(d.message);openCompany(companyId)}catch(e){toast(e.message,"error")}}

async function confirmBuy(itemId){try{const qty=Number($("#buyQty").value);if(qty<1){toast("Quantidade inválida","error");return}const d=await post("/api/shop/buy",{itemId:itemId,quantity:qty});me=d.user;updateHUD();closeModal();toast(d.message);loadPage("shop")}catch(e){toast(e.message,"error")}}

function hospitalMetric(icon,label,value,meta){
  return `<div class="vital-card"><span class="vital-icon">${icon}</span><div><small>${esc(label)}</small><strong>${esc(String(value))}</strong><em>${esc(String(meta))}</em></div></div>`;
}
function hospitalTriageTimestamp(visit){
  const measuredAt=Date.parse(visit?.triage?.measuredAt);
  if(!Number.isFinite(measuredAt))return "";
  return `<small class="hospital-vitals-timestamp">Aferidos na triagem às ${esc(new Date(measuredAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}))}. Registro da consulta; os valores não oscilam em tempo real.</small>`;
}
function hospitalMedicationPlan(medications){
  const items=Array.isArray(medications)?medications:[];
  if(!items.length)return "";
  return `<div class="hospital-medication-plan"><b>Cuidados e medicamentos do jogo</b><ul>${items.map(item=>`<li>${esc(item)}</li>`).join("")}</ul></div>`;
}
function hospitalSyncPlayer(player){
  if(!player||!me)return;
  ["life","hunger","hydration","energy","money"].forEach(key=>{if(player[key]!==undefined)me[key]=player[key]});
  updateHUD();
  const vitals=$(".hospital-patient-vitals");
  if(vitals)vitals.innerHTML=`<b>❤️ ${Math.round(Number(me.life||0))}% vida</b><b>💧 ${Math.round(Number(me.hydration||0))}% hidratação</b><b>⚡ ${Math.round(Number(me.energy||0))}% energia</b>`;
  const health=$("#hospitalHealthCircle");
  if(health)health.textContent=`${Math.round(Number(me.life||0))}%`;
}
function hospitalRoom(stage,exam){
  const room=stage==="reception"||stage==="discharged"?"reception":stage==="triage"?"triage":stage==="assessment"||stage==="consultation"?"consult":stage==="exam"?"exam":stage==="results"?"results":"ward";
  const captions={reception:["Recepção","A equipe está preparando seu atendimento."],triage:["Triagem de enfermagem","A enfermeira confere seus sinais vitais."],consult:["Consultório","O médico revisa seu prontuário."],exam:["Sala de exames","O técnico está operando os equipamentos."],results:["Sala de resultados","O médico está conferindo os resultados."],ward:["Internação e recuperação","A equipe acompanha sua evolução."]};
  const copy=captions[room]||captions.reception;
  return `<div class="hospital-scene room-${room} exam-${Number(exam?.serviceId||0)}" role="img" aria-label="${esc(copy[0])}">
    <div class="scene-window"><i></i><i></i><i></i><i></i></div><div class="scene-light"></div>
    <div class="scene-monitor"><i></i><b>♥</b></div><div class="scene-counter"><div class="scene-computer"></div></div>
    <div class="scene-bed"><i></i></div><div class="scene-chair"></div><div class="scene-documents"></div>
    <div class="scene-staff receptionist"><span>👩‍💼</span><small>RECEPÇÃO</small></div><div class="scene-staff nurse"><span>🧑‍⚕️</span><small>ENFERMAGEM</small></div><div class="scene-staff doctor"><span>👩‍⚕️</span><small>MÉDICA</small></div>
    <div class="scene-patient"><span>🧍</span><small>PACIENTE</small></div>
    <div class="scene-room-label"><b>${esc(copy[0])}</b><span>${esc(copy[1])}</span></div>
  </div>`;
}
function hospitalSteps(stage){
  const index={reception:0,triage:1,consultation:2,assessment:2,exam:3,results:4,treatment:5,followup:6,discharged:7}[stage]??0;
  const labels=["Chegada","Triagem","Consulta","Exames","Resultados","Tratamento","Retorno","Alta"];
  return `<div class="hospital-steps" aria-label="Etapas do atendimento">${labels.map((label,i)=>`<div class="hospital-step ${i<index?"done":i===index?"active":""}"><i>${i<index?"✓":i+1}</i><span>${label}</span></div>`).join("")}</div>`;
}
function hospitalClock(target){
  const remaining=Math.max(0,Math.ceil((Date.parse(target||"")-Date.now())/1000));
  return `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`;
}
function hospitalLive(box,visit,returnPage="hospital"){
  if(hospitalPollTimer)clearInterval(hospitalPollTimer);
  if(!visit)return;
  if(visit.stage==="followup"&&visit.followupRequired&&visit.followupAt){
    const updateAppointment=()=>{
      const countdown=$("#hospitalFollowupCountdown"),button=$("#hospitalFollowupReturn");
      const remaining=Date.parse(visit.followupAt)-Date.now();
      if(countdown)countdown.textContent=remaining>0?hospitalClock(visit.followupAt):"Retorno disponível";
      if(button)button.disabled=remaining>0;
      if(remaining<=0&&hospitalPollTimer){clearInterval(hospitalPollTimer);hospitalPollTimer=null}
    };
    updateAppointment();
    if(Date.parse(visit.followupAt)>Date.now())hospitalPollTimer=setInterval(updateAppointment,500);
    return;
  }
  const processing=visit.stage==="exam"&&visit.exam?.status==="processing"?visit.exam:visit.stage==="treatment"&&visit.treatment?.status==="processing"?visit.treatment:null;
  if(!processing)return;
  let lastPoll=0,polling=false,pollErrorShown=false;
  const currentStage=visit.stage,currentVisit=visit.id;
  hospitalPollTimer=setInterval(async()=>{
    if(currentPage!==returnPage||!box.isConnected){clearInterval(hospitalPollTimer);hospitalPollTimer=null;return}
    const clock=$("#hospitalCountdown");
    if(clock)clock.textContent=hospitalClock(processing.endsAt);
    const bar=$(".hospital-progress i");
    if(bar){
      const started=Date.parse(processing.startedAt),ends=Date.parse(processing.endsAt);
      bar.style.width=`${ends>started?Math.min(100,Math.max(0,Math.round((Date.now()-started)/(ends-started)*100))):100}%`;
    }
    const now=Date.now();
    if(polling||now-lastPoll<2000)return;
    lastPoll=now;polling=true;
    try{
      const status=await api("/api/hospital");
      hospitalSyncPlayer(status.player);
      const next=status.visit;
      if(!next||next.id!==currentVisit||next.stage!==currentStage||next.exam?.status!==visit.exam?.status||next.treatment?.status!==visit.treatment?.status){
        await loadPage(returnPage);
        return;
      }
      pollErrorShown=false;
    }catch(error){
      const message=$("#hospitalProcessingMessage");
      if(message)message.textContent="Conexão instável. A equipe mantém o atendimento; tentando atualizar novamente.";
      if(!pollErrorShown){toast(error.message,"error");pollErrorShown=true}
      if(!hospitalPollTimer&&box.isConnected&&currentPage===returnPage)hospitalLive(box,visit,returnPage);
    }finally{polling=false}
  },1000);
}
async function hospitalAction(path,payload,message,returnPage="hospital"){
  const buttons=$$(".hospital-action");
  buttons.forEach(button=>button.disabled=true);
  try{
    const result=await post(path,payload||{});
    hospitalSyncPlayer(result.player);
    if(message)toast(message);
    else if(result.message)toast(result.message);
    await loadPage(returnPage);
  }catch(error){
    toast(error.message,"error");
    buttons.forEach(button=>{if(button.isConnected)button.disabled=false});
    if(["/api/hospital/exams/start","/api/hospital/treatment","/api/hospital/release","/api/hospital/followup/return","/api/hospital/pharmacy/buy","/api/hospital/pharmacy/use"].includes(path))await loadPage(returnPage);
  }
}
function hospitalArrive(){return hospitalAction("/api/hospital/arrive",{},"A recepção registrou sua chegada.");}
function hospitalTriage(){return hospitalAction("/api/hospital/triage",{},"Triagem concluída.");}
function hospitalStartConsultation(){return hospitalAction("/api/hospital/consultation/start",{},"Você foi encaminhado ao consultório.");}
async function hospitalConsult(){
  const symptoms=$$(".hospital-symptom:checked").map(input=>input.value);
  const notes=$("#hospitalNotes")?.value||"";
  const duration=$("#hospitalSymptomDuration")?.value||"recentemente";
  return hospitalAction("/api/hospital/consult",{symptoms,notes,duration},"O médico concluiu a avaliação inicial.");
}
function hospitalConfirmExam(id){
  const service=hospitalServicesCache.find(item=>item.id===Number(id));
  if(!service)return toast("Este exame não está disponível na recomendação atual.","error");
  openModal(`<div class="hospital-payment-modal"><span class="eyebrow">CONFIRMAÇÃO DO EXAME</span><h2>${esc(service.name)}</h2><p>${esc(service.description)}</p><div><span>Valor</span><strong>${money(service.price)}</strong></div><div><span>Tempo estimado</span><strong>${esc(service.durationRange)}</strong></div><p class="hospital-modal-note">O exame só começa após a confirmação do pagamento. O tempo de processamento é acelerado para caber na sessão do jogo.</p><button class="primary wide" id="hospitalPayExam">Pagar e iniciar exame</button></div>`);
  $("#hospitalPayExam").onclick=()=>{closeModal();hospitalAction("/api/hospital/exams/start",{serviceId:service.id})};
}
async function hospitalReviewResults(){return hospitalAction("/api/hospital/results/review",{},"O médico analisou os resultados e explicou o plano.");}
async function hospitalStartTreatment(){return hospitalAction("/api/hospital/treatment",{},"O tratamento foi iniciado.");}
async function hospitalRelease(){return hospitalAction("/api/hospital/release",{},"Alta concedida. Até breve!");}
async function hospitalReturnForFollowup(){return hospitalAction("/api/hospital/followup/return",{},"Retorno registrado. O médico solicitou exames complementares.");}
function hospitalPharmacyBuy(itemId,channel,returnPage="hospital"){toast(channel==="attendant"?"A farmacêutica está conferindo a receita...":"Processando sua compra no autoatendimento...");return hospitalAction("/api/hospital/pharmacy/buy",{itemId,quantity:1,channel},null,returnPage);}
function hospitalPharmacyUse(itemId,returnPage="hospital"){toast("A equipe está registrando o uso do item...");return hospitalAction("/api/hospital/pharmacy/use",{itemId},null,returnPage);}
function hospitalPrescriptionPaper(prescription,showEmpty=false){
  if(!prescription)return showEmpty?`<div class="pharmacy-prescription pharmacy-prescription-empty"><b>📄 Receita médica</b><p>A médica ainda não emitiu uma receita neste atendimento. Você pode conhecer a loja e fazer compras no autoatendimento.</p></div>`:"";
  const items=Array.isArray(prescription.items)?prescription.items:[];
  return `<div class="pharmacy-prescription"><div class="prescription-top"><span>📄 RECEITA · ${esc(String(prescription.id||"").slice(-8).toUpperCase())}</span><b>HOSPITAL SOROKIBA</b></div><h3>Orientação da médica</h3><p><b>Avaliação:</b> ${esc(prescription.diagnosisName||"em acompanhamento")}</p><p>${esc(prescription.instructions||"Siga o plano de cuidado combinado com a equipe.")}</p>${items.length?`<ul>${items.map(entry=>`<li><span>${esc(entry.product?.name||entry.id)} · ${Number(entry.quantity)} un.</span><small>${Number(entry.purchased)>=Number(entry.quantity)?Number(entry.fulfilled)>0?"Retirado no balcão":"Comprado no autoatendimento":`Disponível para retirada: ${Math.max(0,Number(entry.quantity)-Number(entry.purchased||0))}`}${Number(entry.used)>0?" · usado":""}</small></li>`).join("")}</ul>`:"<div class=\"pharmacy-no-prescription\">Nenhum produto de balcão foi indicado. O plano hospitalar continua sendo o cuidado principal.</div>"}</div>`;
}
function hospitalPharmacyPanel(pharmacy,visit,stage,options={}){
  const items=Array.isArray(pharmacy?.items)?pharmacy.items:[],inventory=pharmacy?.inventory||{},prescription=visit?.pharmacyPrescription;
  const returnPage=options.returnPage||"hospital";
  const prescribed=new Map((prescription?.items||[]).map(item=>[item.id,item]));
  const paper=hospitalPrescriptionPaper(prescription,true);
  const cards=items.map(item=>{
    const count=Math.max(0,Number(inventory[item.id]||0)),rx=prescribed.get(item.id),remaining=rx?Math.max(0,Number(rx.quantity||0)-Number(rx.purchased||0)):0;
    const canUse=!!rx&&count>0&&(stage==="followup"||stage==="treatment"&&visit?.treatment?.status==="processing")&&Number(rx.used||0)<Number(rx.quantity||0);
    return `<article class="pharmacy-product"><div class="pharmacy-product-heading"><span>💊</span><div><small>${esc(item.category)}</small><h3>${esc(item.name)}</h3></div></div><p>${esc(item.description)}</p><small class="pharmacy-note">${esc(item.note)}</small><div class="pharmacy-product-footer"><strong>${money(item.price)}</strong><span>Inventário: ${count}</span></div><div class="pharmacy-product-actions"><button class="primary hospital-action" onclick="hospitalPharmacyBuy('${esc(item.id)}','self-service','${returnPage}')">Comprar no autoatendimento</button>${rx&&remaining?`<button class="pharmacy-secondary hospital-action" onclick="hospitalPharmacyBuy('${esc(item.id)}','attendant','${returnPage}')">Retirar ${remaining} no balcão</button>`:""}${canUse?`<button class="pharmacy-secondary hospital-action" onclick="hospitalPharmacyUse('${esc(item.id)}','${returnPage}')">Usar item prescrito</button>`:""}</div>${rx?`<small class="pharmacy-recommended">${remaining?"✓ Recomendado pela médica · receita disponível":Number(rx.fulfilled)>=Number(rx.quantity)?"✓ Receita atendida": "✓ Indicado neste atendimento"}</small>`:""}</article>`;
  }).join("");
  return `<section class="hospital-panel hospital-pharmacy ${options.shopMode?"pharmacy-from-stores":""}"><div class="pharmacy-heading"><div><div class="section-label">LOJA · FARMÁCIA HOSPITALAR</div><h2>Farmácia Sorokiba</h2><p>Atendimento com a farmacêutica ${esc(pharmacy?.attendant||"da equipe")} ou compra direta no autoatendimento.</p></div><span class="pharmacy-mark">✚</span></div><div class="pharmacy-disclaimer">Preços de referência aproximados em reais. Os efeitos dos produtos são fictícios e limitados aos indicadores do jogo; não substituem exames, internação ou tratamento médico.</div>${paper}<div class="pharmacy-counter-note"><span>👩‍⚕️</span><p><b>${esc(pharmacy?.attendant||"Farmacêutica")}:</b> “Posso conferir a receita e separar os itens indicados. Se preferir, use o autoatendimento para comprar diretamente.”</p></div><div class="pharmacy-products">${cards||'<p class="hospital-muted">A farmácia está temporariamente sem produtos.</p>'}</div></section>`;
}

async function hospitalPage(box){
  if(hospitalPollTimer){clearInterval(hospitalPollTimer);hospitalPollTimer=null}
  const hs=await api("/api/hospital");
  hospitalSyncPlayer(hs.player);
  hospitalServicesCache=Array.isArray(hs.services)?hs.services:[];
  const pharmacySection=hospitalPharmacyPanel(hs.pharmacy,hs.visit,hs.visit?.stage||"reception");
  const visit=hs.visit,stage=visit?.stage||"reception",triage=hs.triage||{},v=visit?.triage||triage.vitals||{};
  const arrived=!!visit&&stage!=="discharged";
  const steps=hospitalSteps(stage);
  const scene=hospitalRoom(stage,visit?.exam);
  const vitalCards=`${hospitalMetric('🌡️','Temperatura',Number(v.temperature??36.5).toFixed(1)+'°C','Sinais gerais')}${hospitalMetric('🩸','Pressão',String(v.bloodPressure||'110/70'),'Sistema cardiovascular')}${hospitalMetric('💓','Frequência',Number(v.heartRate??72)+' bpm','Ritmo cardíaco')}${hospitalMetric('🫧','Oxigenação',Number(v.oxygenation??97)+'%','Captação de ar')}${hospitalMetric('🫁','Respiração',Number(v.respiration??18)+' rpm','Ventilação')}${hospitalMetric('💧','Hidratação',Number(v.hydration??me.hydration??100)+'%','Indicador do personagem')}${hospitalMetric('⚡','Energia',Number(v.energy??me.energy??100)+'%','Indicador do personagem')}${hospitalMetric('🍽️','Fome',Number(v.hunger??me.hunger??100)+'%','Indicador do personagem')}`;
  const progressLabel={reception:"Recepção",triage:"Triagem de enfermagem",consultation:"Consulta médica",assessment:"Avaliação médica",exam:"Exame em andamento",results:"Resultado disponível",treatment:"Plano de tratamento",followup:"Revisão médica",discharged:"Atendimento encerrado"}[stage]||"Hospital";
  let body="";
  if(!visit||stage==="discharged"){
    body=`<section class="hospital-panel hospital-welcome"><div class="section-label">RECEPÇÃO · ${esc(visit?"VISITA ENCERRADA":"NOVO ATENDIMENTO")}</div><h2>${visit?"Atendimento concluído":"Bem-vindo ao Hospital Sorokiba"}</h2><p>${visit?`Última avaliação: ${esc(visit.diagnosis?.name||"consulta concluída")}. Seus indicadores estão em ${Math.round(Number(me.life||0))}% de vida, ${Math.round(Number(me.hydration||0))}% de hidratação e ${Math.round(Number(me.energy||0))}% de energia.`:"A recepcionista vai registrar sua chegada. A enfermagem fará a triagem antes da consulta médica."}</p><div class="hospital-staff-note"><span>👩‍💼</span><p><b>Recepção:</b> “Olá, ${esc((me.name||"paciente").split(" ")[0])}. Vou avisar a equipe e organizar seu atendimento.”</p></div><button class="primary hospital-action" onclick="hospitalArrive()">${visit?"Iniciar novo atendimento":"Registrar chegada"}</button></section>`;
  }else if(stage==="reception"){
    body=`<section class="hospital-panel"><div class="section-label">RECEPÇÃO · CADASTRO</div><h2>Chegada confirmada</h2><p>O cadastro foi enviado à enfermagem. A próxima etapa é medir seus sinais vitais.</p><div class="hospital-staff-note"><span>👩‍💼</span><p><b>Recepcionista:</b> “A enfermeira já está pronta para fazer sua triagem. Pode seguir até a sala ao lado.”</p></div><button class="primary hospital-action" onclick="hospitalTriage()">Ir para a triagem</button></section>`;
  }else if(stage==="triage"){
    body=`<section class="hospital-panel"><div class="section-label">TRIAGEM DE ENFERMAGEM</div><h2>Sinais vitais registrados</h2><div class="vital-grid">${vitalCards}</div>${hospitalTriageTimestamp(visit)}<div class="hospital-staff-note"><span>🧑‍⚕️</span><p><b>Enfermeira:</b> “Terminei suas medidas e já enviei a ficha ao consultório. O médico vai ouvir o que você sentiu antes de indicar qualquer exame.”</p></div><button class="primary hospital-action" onclick="hospitalStartConsultation()">Seguir para a consulta médica</button></section>`;
  }else if(stage==="consultation"){
    body=`<div class="hospital-grid"><section class="hospital-panel"><div class="section-label">TRIAGEM CONCLUÍDA</div><h2>Seus sinais vitais</h2><div class="vital-grid">${vitalCards}</div>${hospitalTriageTimestamp(visit)}<div class="hospital-staff-note"><span>🧑‍⚕️</span><p><b>Enfermagem:</b> “Pronto, já registrei suas medidas. O médico vai conversar com você agora.”</p></div></section><section class="hospital-panel"><div class="section-label">CONSULTA · ENTREVISTA</div><h2>O que você percebeu?</h2><div class="dialogue"><div class="chat-bubble doctor">Médico: “Olá. O que aconteceu? O que você percebeu de diferente?”</div><div class="chat-bubble doctor">Médico: “Vou considerar também seus indicadores e há quanto tempo isso ocorre. Ainda não sabemos a causa; vamos investigar.”</div></div><form id="hospitalConsultForm" class="hospital-form"><fieldset><legend>Marque o que está sentindo</legend><label><input class="hospital-symptom" type="checkbox" value="sede"> Sede ou boca seca</label><label><input class="hospital-symptom" type="checkbox" value="tontura"> Tontura</label><label><input class="hospital-symptom" type="checkbox" value="fraqueza"> Fraqueza</label><label><input class="hospital-symptom" type="checkbox" value="cansaço"> Cansaço</label><label><input class="hospital-symptom" type="checkbox" value="fome"> Fome fora do normal</label><label><input class="hospital-symptom" type="checkbox" value="febre"> Sensação de febre</label><label><input class="hospital-symptom" type="checkbox" value="mal-estar"> Mal-estar</label><label><input class="hospital-symptom" type="checkbox" value="dor"> Dor localizada</label><label><input class="hospital-symptom" type="checkbox" value="palpitacao"> Palpitação</label><label><input class="hospital-symptom" type="checkbox" value="falta_ar"> Falta de ar</label><label><input class="hospital-symptom" type="checkbox" value="tosse"> Tosse</label><label><input class="hospital-symptom" type="checkbox" value="nausea"> Náusea</label><label><input class="hospital-symptom" type="checkbox" value="vomito"> Vômito</label><label><input class="hospital-symptom" type="checkbox" value="dor_abdominal"> Dor abdominal</label><label><input class="hospital-symptom" type="checkbox" value="dor_persistente"> Dor persistente há dias</label><label><input class="hospital-symptom" type="checkbox" value="perda_peso"> Perda de peso sem explicação</label></fieldset><label class="hospital-notes-label">Conte mais, se quiser<textarea id="hospitalNotes" maxlength="400" placeholder="Descreva o que mudou no seu personagem"></textarea></label><label>Há quanto tempo?<select id="hospitalSymptomDuration"><option value="recentemente">Começou recentemente</option><option value="hoje">Desde hoje</option><option value="alguns_dias">Há alguns dias</option></select></label><button class="primary hospital-action" type="submit">Concluir conversa com o médico</button></form></section></div>`;
  }else if(stage==="assessment"){
    const suggestions=(visit.recommendedServices||[]);
    const differentials=visit.differential||[];
    const symptomLabels={sede:"sede ou boca seca",tontura:"tontura",fraqueza:"fraqueza",cansaço:"cansaço",fome:"fome fora do normal",febre:"sensação de febre","mal-estar":"mal-estar",dor:"dor localizada",palpitacao:"palpitação",falta_ar:"falta de ar",tosse:"tosse",nausea:"náusea",vomito:"vômito",dor_abdominal:"dor abdominal",dor_persistente:"dor persistente há dias",perda_peso:"perda de peso sem explicação"};
    const reported=(visit.symptoms?.selected||[]).map(item=>symptomLabels[item]).filter(Boolean).join(", ");
    const patientReply=visit.symptoms?.notes|| (reported?`Tenho sentido ${reported}.`:"Percebi mudanças no meu corpo e quero entender o motivo.");
    body=`<div class="hospital-grid"><section class="hospital-panel"><div class="section-label">AVALIAÇÃO MÉDICA</div><h2>Investigando os sinais</h2><div class="dialogue"><div class="chat-bubble patient">Paciente: “${esc(patientReply)}”</div><div class="chat-bubble doctor">Médico: “Entendi. Você percebeu isso ${visit.symptoms?.duration==="alguns_dias"?"há alguns dias":visit.symptoms?.duration==="hoje"?"desde hoje":"recentemente"}? Vou cruzar o que contou com a triagem antes de definir o próximo passo.”</div><div class="chat-bubble doctor">Médico: “Ainda não vou concluir um diagnóstico. Estes exames ajudam a esclarecer as possibilidades.”</div></div>${differentials.length?`<div class="hospital-risk-list">${differentials.map(d=>`<div class="hospital-risk-row"><span><strong>Possibilidade: ${esc(d.name||d.clue)}</strong><small>${esc(d.clue)}</small></span><b>${esc(d.severity)} · chance estimada ${Number(d.probability)}%</b></div>`).join("")}</div>`:"<p class=\"hospital-muted\">Não encontrei sinais de alerta na triagem. Um teste simples pode confirmar que está tudo bem.</p>"}</section><section class="hospital-panel"><div class="section-label">RECOMENDAÇÃO DO MÉDICO</div><h2>Exames indicados</h2><p>Os exames abaixo foram selecionados a partir da triagem e dos sintomas relatados.</p><div class="hospital-exam-list">${suggestions.map(service=>`<article class="hospital-exam-card"><div><span class="hospital-exam-icon">${service.icon}</span><div><h3>${esc(service.name)}</h3><p>${esc(service.reason)}</p></div></div><div class="hospital-service-meta"><small>Preço</small><strong>${money(service.price)}</strong></div><div class="hospital-service-meta"><small>Tempo de exame</small><strong>${esc(service.durationRange)}</strong></div><button class="primary hospital-action" onclick="hospitalConfirmExam(${service.id})">Revisar valor e pagar</button></article>`).join("")}</div></section></div>`;
  }else if(stage==="exam"){
    const exam=visit.exam||{},started=Date.parse(exam.startedAt),ends=Date.parse(exam.endsAt),percent=ends>started?Math.min(100,Math.max(0,Math.round((Date.now()-started)/(ends-started)*100))):100;
    body=`<section class="hospital-panel hospital-processing"><div class="section-label">${esc(exam.serviceName||"EXAME")} · ${esc(exam.status==="processing"?"PROCESSANDO":"CONCLUÍDO")}</div><h2>Seu exame está sendo processado</h2><p>O pagamento foi confirmado às ${esc(new Date(exam.startedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}))}. A equipe técnica avisa o médico quando o resultado estiver pronto.</p><div class="hospital-machine-activity"><span>${esc(hospitalServicesCache.find(s=>s.id===exam.serviceId)?.icon||"⚙️")}</span><i></i><b></b><em></em></div><div class="hospital-progress"><i data-start="${started}" data-end="${ends}" style="width:${percent}%"></i></div><div class="hospital-countdown-row"><span id="hospitalProcessingMessage">Processamento em andamento</span><strong id="hospitalCountdown">${hospitalClock(exam.endsAt)}</strong></div><small>Tempo de processamento acelerado para a sessão do jogo. Início e previsão de término ficam registrados no atendimento.</small></section>`;
  }else if(stage==="results"){
    body=`<div class="hospital-grid"><section class="hospital-panel"><div class="section-label">RESULTADO DO EXAME</div><h2>${esc(visit.exam?.serviceName||"Exame")}</h2><div class="hospital-result-paper"><span>LABORATÓRIO SOROKIBA · RESULTADO</span><p>${esc(visit.exam?.finding||"Exame concluído. O médico fará a leitura dos resultados.")}</p><small>Coleta: ${esc(new Date(visit.exam?.startedAt||Date.now()).toLocaleString("pt-BR"))} · Resultado: ${esc(new Date(visit.exam?.completedAt||Date.now()).toLocaleString("pt-BR"))}</small></div><p>O resultado ainda precisa ser interpretado pelo médico junto com seus sintomas e sinais vitais.</p><button class="primary hospital-action" onclick="hospitalReviewResults()">Conversar com o médico sobre o resultado</button></section><section class="hospital-panel"><div class="section-label">ACOMPANHAMENTO</div><h2>O que acontece agora</h2><div class="hospital-staff-note"><span>👩‍⚕️</span><p><b>Médica:</b> “Recebi o resultado. Vou explicar o que encontramos e combinar o cuidado mais adequado com você.”</p></div>${hospitalUpdates(visit)}</section></div>`;
  }else if(stage==="treatment"&&visit.treatment?.status==="processing"){
    const treatment=visit.treatment,started=Date.parse(treatment.startedAt),ends=Date.parse(treatment.endsAt),percent=ends>started?Math.min(100,Math.max(0,Math.round((Date.now()-started)/(ends-started)*100))):100;
    body=`<section class="hospital-panel hospital-processing hospital-ward"><div class="section-label">${esc(treatment.type)} · ACOMPANHAMENTO</div><h2>Você está sendo acompanhado</h2><p>${visit.admissionRequired?"Você está em observação hospitalar. A equipe confere seus sinais e pode manter a internação se ainda não estiver estável.":"O tratamento está em andamento; seus indicadores melhoram gradualmente durante o acompanhamento."}</p><div class="hospital-patient-vitals"><b>❤️ ${Math.round(Number(me.life||0))}% vida</b><b>💧 ${Math.round(Number(me.hydration||0))}% hidratação</b><b>⚡ ${Math.round(Number(me.energy||0))}% energia</b></div>${hospitalMedicationPlan(treatment.medications||visit.diagnosis?.medications)}<div class="hospital-progress"><i data-start="${started}" data-end="${ends}" style="width:${percent}%"></i></div><div class="hospital-countdown-row"><span id="hospitalProcessingMessage">A enfermagem está monitorando sua recuperação</span><strong id="hospitalCountdown">${hospitalClock(treatment.endsAt)}</strong></div><small>As medidas são atualizadas durante o tratamento, não todas de uma vez.</small></section>`;
  }else if(stage==="treatment"){
    const d=visit.diagnosis||{},price=visit.admissionRequired?300:90,recoveryTime=Array.isArray(d.recovery)?`${d.recovery[0]}–${d.recovery[1]} segundos`:"20–40 segundos";
    body=`<div class="hospital-grid"><section class="hospital-panel"><div class="section-label">CONVERSA SOBRE O DIAGNÓSTICO</div><h2>${esc(d.name||"Avaliação médica")}</h2><div class="hospital-diagnosis ${d.severity==="Grave"?"urgent":""}"><span>${d.severity==="Grave"?"🚨":visit.admissionRequired?"🏥":"🩺"}</span><div><b>Gravidade: ${esc(d.severity||"Leve")}</b><p>${esc(d.explanation||"O médico avaliou seus indicadores e os resultados dos exames.")}</p></div></div>${Number(d.lifeLoss)>0?`<p class="hospital-muted">Sem tratamento, a condição pode reduzir a vida em ${Number(d.lifeLoss)} pontos a cada 15 segundos de jogo.</p>`:""}<div class="hospital-staff-note"><span>👩‍⚕️</span><p><b>Médica:</b> “${esc(d.treatment||"Vamos acompanhar sua recuperação e revisar seus indicadores.")}”</p></div>${hospitalMedicationPlan(d.medications)}${hospitalPrescriptionPaper(visit.pharmacyPrescription)}</section><section class="hospital-panel"><div class="section-label">${visit.admissionRequired?"INTERNAÇÃO RECOMENDADA":"TRATAMENTO"} · PLANO</div><h2>${visit.admissionRequired?"Acompanhamento hospitalar":"Cuidado ambulatorial"}</h2><p>${visit.admissionRequired?"A equipe recomenda permanecer no hospital para monitorar seus sinais. Se ainda não estiver recuperado, o médico pode solicitar outro ciclo.":"O tratamento é acompanhado por uma equipe e melhora os indicadores aos poucos."}</p>${visit.followupRequired?'<p class="hospital-muted">O médico também marcou retorno no próximo dia do jogo para aprofundar a investigação.</p>':""}<div class="hospital-service-meta"><small>Valor</small><strong>${money(price)}</strong></div><div class="hospital-service-meta"><small>Tempo estimado no jogo</small><strong>${esc(recoveryTime)}</strong></div><button class="primary hospital-action" onclick="hospitalStartTreatment()">${visit.admissionRequired?"Pagar e iniciar internação":"Pagar e iniciar tratamento"}</button></section></div>`;
  }else{
    const d=visit.diagnosis||{},requiresMore=visit.admissionRequired&&(Number(me.life||0)<50||Number(me.hydration||0)<35),followupWaiting=!!visit.followupRequired,followupReady=followupWaiting&&Date.parse(visit.followupAt||0)<=Date.now();
    body=`<div class="hospital-grid"><section class="hospital-panel"><div class="section-label">RETORNO MÉDICO</div><h2>${followupWaiting?"Retorno para aprofundar a investigação":requiresMore?"A equipe recomenda continuar em observação":"Recuperação acompanhada"}</h2><p>${esc(d.name||"Avaliação médica")} · gravidade ${esc(d.severity||"Leve")}.</p><div class="hospital-patient-vitals"><b>❤️ ${Math.round(Number(me.life||0))}% vida</b><b>💧 ${Math.round(Number(me.hydration||0))}% hidratação</b><b>⚡ ${Math.round(Number(me.energy||0))}% energia</b></div><div class="hospital-staff-note"><span>👩‍⚕️</span><p><b>Médica:</b> “${followupWaiting?"O tratamento inicial terminou, mas ainda precisamos de exames complementares. Volte no próximo dia do jogo para continuarmos a investigação.":requiresMore?"Seus sinais ainda precisam de acompanhamento. Vamos manter você em observação e rever as medidas.":"Seus indicadores responderam bem. Você pode receber alta; volte se perceber os sintomas novamente."}”</p></div>${followupWaiting?`<div class="hospital-appointment"><b>Retorno agendado</b><span>Próximo dia do jogo · previsão em <strong id="hospitalFollowupCountdown">${followupReady?"Retorno disponível":hospitalClock(visit.followupAt)}</strong></span><small>Um dia do jogo equivale a cerca de 1 minuto real para manter a espera curta.</small><button id="hospitalFollowupReturn" class="primary hospital-action" onclick="hospitalReturnForFollowup()" ${followupReady?"":"disabled"}>Voltar ao hospital e fazer novos exames</button></div>`:requiresMore?`<p class="hospital-muted">Mais um ciclo de acompanhamento custa ${money(300)}.</p><button class="primary hospital-action" onclick="hospitalStartTreatment()">Continuar internação e monitoramento</button>`:`<button class="primary hospital-action" onclick="hospitalRelease()">Receber alta médica</button>`}</section><section class="hospital-panel"><div class="section-label">EVOLUÇÃO</div><h2>Registro da equipe</h2>${hospitalUpdates(visit)}</section></div>`;
  }
  const vitalSection=arrived&&visit.triage&&["assessment","exam","results","treatment","followup"].includes(stage)?`<section class="hospital-panel hospital-vitals-compact"><div class="section-label">SINAIS VITAIS DA TRIAGEM</div><div class="vital-grid">${vitalCards}</div></section>`:"";
  box.innerHTML=`<div class="hospital-shell"><div class="medical-banner hospital-banner"><div><span class="tag">🏥 HOSPITAL SOROKIBA</span><h1>Atendimento e recuperação</h1><p>Da recepção ao retorno médico, cada etapa usa os dados atuais do seu personagem.</p></div><div class="health-circle" id="hospitalHealthCircle">${Math.round(Number(me.life||0))}%</div></div>${steps}${scene}<div class="hospital-current-stage"><span>ETAPA ATUAL</span><b>${esc(progressLabel)}</b><i class="hospital-live-dot"></i></div>${body}${vitalSection}${pharmacySection}</div>`;
  if(stage==="consultation")$("#hospitalConsultForm").onsubmit=event=>{event.preventDefault();hospitalConsult()};
  hospitalLive(box,visit);
}
function hospitalUpdates(visit){
  const updates=Array.isArray(visit?.updates)?visit.updates.slice(0,5):[];
  return `<div class="hospital-updates">${updates.map(item=>`<div><i></i><span>${esc(item.text)}</span><small>${esc(new Date(item.at||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}))}</small></div>`).join("")||"<p class=\"hospital-muted\">Nenhum registro adicional.</p>"}</div>`;
}
async function treat(id){return hospitalConfirmExam(id)}

async function bankPage(box){
 const d=await api("/api/bank"),f=await api("/api/me/fines").catch(()=>({fines:[]}));
 box.innerHTML=`<div class="bank-page">
 <div class="bank-tabs"><button class="bank-tab active" onclick="switchBankTab('bank')">Banco</button><button class="bank-tab" onclick="switchBankTab('fines')">Multas</button></div>
 <div id="bankTabBank"><div class="bank-hero"><div><span class="eyebrow">BANCO SOROKIBA</span><h1>Sua vida financeira</h1><p>Gerencie seu dinheiro com segurança.</p></div><div class="bank-balance"><small>Saldo atual</small><b>${money(d.bankBalance||0)}</b></div></div><div class="bank-actions"><button class="primary" onclick="bankModal('deposit')">＋ Depositar</button><button class="ghost" onclick="bankModal('withdraw')">↗ Sacar</button><button class="ghost" onclick="bankModal('transfer')">💸 Transferir</button></div></div>
 <div id="bankTabFines" style="display:none"><div class="bank-hero"><div><span class="eyebrow">PREFEITURA</span><h1>Minhas multas</h1><p>Veja as multas recebidas nos últimos dias e o motivo de cada uma.</p></div></div><div class="fine-history">${(f.fines||[]).filter(x=>Date.now()-Date.parse(x.date)<=7*24*60*60*1000).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).map(x=>`<article class="fine-card"><div><span>⚖️ MULTA DA PREFEITURA</span><h3>${money(x.amount)}</h3><p><b>Motivo:</b> ${esc(x.reason)}</p><small>${new Date(x.date).toLocaleString('pt-BR')} · Prefeito: ${esc(x.mayorName||'Prefeitura')}</small></div></article>`).join('')||'<div class="empty">Você não recebeu nenhuma multa nos últimos 7 dias.</div>'}</div></div></div>`;
}
function switchBankTab(tab){
 const bank=document.getElementById('bankTabBank'),fines=document.getElementById('bankTabFines'),tabs=document.querySelectorAll('.bank-tab');
 if(!bank||!fines)return;bank.style.display=tab==='bank'?'':'none';fines.style.display=tab==='fines'?'':'none';tabs.forEach((b,i)=>b.classList.toggle('active',(tab==='bank'?i===0:i===1)));
}

// Inicia o jogo automaticamente ao carregar o app.
boot();
