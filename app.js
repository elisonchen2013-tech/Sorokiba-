
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

const titles={city:["VISÃO GERAL","Cidade"],job:["CARREIRA","Emprego"],missions:["OBJETIVOS","Missões"],inventory:["SEUS ITENS","Inventário"],shop:["MERCADO","Lojas"],companies:["NEGÓCIOS","Empresas"],hospital:["SAÚDE","Hospital"],bank:["BANCO","Banco"],players:["COMUNIDADE","Jogadores"],news:["NOTÍCIAS","Notícias"],events:["EVENTOS","Eventos"],proposals:["PROPOSTAS","Propostas"],mayor:["PREFEITURA","Prefeitura"],account:["PERFIL","Conta"]};
async function loadPage(page){
  
  $("#pageEyebrow").textContent=titles[page][0];$("#pageTitle").textContent=titles[page][1];
  const box=$("#content");box.innerHTML='<div class="loading-card"><div class="spinner"></div>Carregando...</div>';
  try{
    if(page==="city")return cityPage(box);
    if(page==="job")return jobPage(box);
    if(page==="missions")return missionsPage(box);
    if(page==="inventory")return inventoryPage(box);
    if(page==="shop")return shopPage(box);
    if(page==="companies")return companiesPage(box);
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
 <div class="two-col"><div class="panel"><div class="panel-title"><h3>Atalhos</h3></div><div class="quick-grid"><button onclick="nav('job')">💼<b>Minha carreira</b><small>Ver profissões</small></button><button onclick="nav('shop')">🛒<b>Lojas</b><small>Compre produtos</small></button><button onclick="nav('companies')">🏢<b>Empresas</b><small>Gerencie seus negócios</small></button><button onclick="nav('missions')">🎯<b>Missões</b><small>Ganhe XP</small></button></div></div>
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
      '.soro-home-carousel .sc-snow{position:absolute;inset:-40px 0 0;z-index:18;background-image:radial-gradient(circle,rgba(255,255,255,.92) 1px,transparent 2px),radial-gradient(circle,rgba(255,255,255,.72) 2px,transparent 3px);background-size:31px 31px,71px 71px;animation:scSnow 9s linear infinite;opacity:.72}',
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

  const first=esc((me?.name||'Cidadão').trim().split(/\s+/)[0]);
  const job=esc(me?.jobName||'Cidadão');
  const SP='America/Sao_Paulo';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:SP,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const spMonth=Number(parts.month),spDay=Number(parts.day);
  const seasonInfo=((spMonth===3&&spDay>=20)||(spMonth>3&&spMonth<6)||(spMonth===6&&spDay<21))?{name:'Outono',icon:'🍂',desc:'Folhas secas, tons quentes e caminhos tranquilos marcam a estação.',kind:'autumn'}:((spMonth===6&&spDay>=21)||(spMonth>6&&spMonth<9)||(spMonth===9&&spDay<23))?{name:'Inverno',icon:'❄️',desc:'Frio, neve e luz suave transformam a paisagem de Sorokiba.',kind:'winter'}:((spMonth===9&&spDay>=23)||(spMonth>9&&spMonth<12)||(spMonth===12&&spDay<21))?{name:'Primavera',icon:'🌸',desc:'Flores, árvores verdes e vida nova tomam conta do parque de Sorokiba.',kind:'spring'}:{name:'Verão',icon:'☀️',desc:'O verão traz luz quente, movimento e dias ensolarados para Sorokiba.',kind:'summer'};

  let news=[];
  try{const newsData=await api('/api/news');news=Array.isArray(newsData)?newsData:[]}catch{}
  let jobs=[];
  try{const jobsData=await api('/api/jobs');jobs=Array.isArray(jobsData)?jobsData:(jobsData.jobs||[])}catch{}
  const currentJob=jobs.find(j=>String(j.name||'').toLowerCase()===String(me?.jobName||'').toLowerCase()||String(j.id||'')===String(me?.jobId||''))||null;
  let companyVehicles=[];
  try{
    const companyData=await api('/api/companies');
    companyVehicles=(companyData.companies||[]).flatMap(c=>(c.products||[]).filter(p=>p.type==='veiculo').map(p=>({name:p.name,image:p.image||'',emoji:p.emoji||'🚗',company:c.name,custom:p.vehicleCustomization||{}})));
  }catch{}
  const streetVehicle=companyVehicles.length&&Math.random()<0.35?companyVehicles[Math.floor(Math.random()*companyVehicles.length)]:null;
  const vehicleArt=streetVehicle?'<div class="sc-company-vehicle"><div class="sc-company-vehicle-label">SOROKIBA • '+esc(streetVehicle.company)+'</div>'+(streetVehicle.image?'<img src="'+streetVehicle.image+'" alt="">':'<div class="sc-mini-car" style="--vc-body:'+esc(streetVehicle.custom.bodyColor||'#dfe6ee')+';--vc-secondary:'+esc(streetVehicle.custom.secondaryColor||'#273449')+';--vc-window:'+esc(streetVehicle.custom.windowColor||'#7fc8e8')+';--vc-wheel:'+esc(streetVehicle.custom.wheelColor||'#151a22')+';--vc-neon:'+esc(streetVehicle.custom.neonColor||'#7c5cff')+'"><i></i><b></b><em></em></div>')+'</div>':'';

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
 const d=await api("/api/inventory"),inv=d.inventory||{};
 const items=d.items.filter(i=>inv[i.id]).map(i=>`<article class="item-card"><div class="item-icon">${i.icon}</div><div><h3>${esc(i.name)}</h3><small>Quantidade: ${inv[i.id]}</small><p>+${i.hunger||0} fome, +${i.hydration||0} hidratação, +${i.energy||0} energia</p></div><button class="primary" onclick="useItem(${i.id})">Usar</button></article>`).join('');
 const cd=await api("/api/company-inventory"),cards=(cd.items||[]).map(x=>`<article class="item-card"><div class="item-icon company-inventory-photo">${x.product.image?'<img src="'+x.product.image+'" alt="">':esc(x.product.emoji||'📦')}</div><div><small>${esc(x.companyName)}</small><h3>${esc(x.product.name)}</h3><small>Quantidade: ${x.quantity}</small><p>${esc(x.product.description||'Produto de empresa')}</p></div><button class="primary" onclick="useCompanyItem('${x.product.id}')">Usar</button></article>`).join('');
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">SEUS PERTENCES</span><h1>Inventário</h1><p>Use seus itens comuns e produtos comprados nas empresas.</p></div><button class="ghost" onclick="nav('shop')">🏪 Ir para Lojas</button></div><section class="inventory-section"><div class="section-head"><div><span class="eyebrow">ITENS DA CIDADE</span><h3>Itens comuns</h3></div></div><div class="items-grid">${items.length?items:'<div class="empty"><div>📭</div><h3>Nenhum item comum</h3><p>Compre itens na Loja.</p></div>'}</div></section><section class="inventory-section"><div class="section-head"><div><span class="eyebrow">PRODUTOS DE EMPRESAS</span><h3>Produtos comprados</h3></div></div><div class="items-grid">${cards||'<div class="empty"><div>🏪</div><h3>Nenhum produto de empresa</h3><p>Visite Lojas para comprar.</p></div>'}</div></section>`;
}
async function useCompanyItem(productId){try{const d=await post("/api/company-inventory/use",{productId});me=d.user;updateHUD();toast(d.message);loadPage("inventory")}catch(e){toast(e.message,"error")}}

async function useItem(id){try{const d=await post("/api/inventory/use",{itemId:id});me=d.user;updateHUD();toast(d.message);loadPage("inventory")}catch(e){toast(e.message,"error")}}

async function companiesPage(box){
 const d=await api("/api/my-companies"),companies=d.companies||[];
 const cards=companies.map(c=>`<article class="owner-company-card"><div><span class="eyebrow">EMPRESA</span><h3>${esc(c.name)}</h3><p>${esc(c.description||'')}</p></div><div class="company-kpis"><div><b>${money(c.balance)}</b><small>Saldo</small></div><div><b>${c.salesCount||0}</b><small>Vendas</small></div><div><b>Nível ${c.level||1}</b><small>${c.xp||0} XP</small></div></div><div class="company-owner-actions"><button class="primary" onclick="openCompanyDashboard('${c.id}')">Gerenciar empresa</button></div></article>`).join('');
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">MEUS NEGÓCIOS</span><h1>Empresas</h1><p>Aqui você cria e acompanha suas empresas. As compras ficam em Lojas.</p></div><button class="primary" onclick="openCreateCompany()">＋ Criar empresa</button></div><div class="owner-companies-grid">${cards||'<div class="empty"><div>🏢</div><h3>Você ainda não tem uma empresa</h3><p>Crie sua primeira empresa para começar a vender.</p></div>'}</div>`;
}
async function openCompanyDashboard(id){
 const d=await api("/api/company-sales?companyId="+encodeURIComponent(id)),c=(await api("/api/companies/"+encodeURIComponent(id))).company;
 const sales=d.sales||[];
 openModal(`<div class="company-dashboard"><span class="eyebrow">PAINEL DA EMPRESA</span><h2>${esc(c.name)}</h2><div class="company-kpis dashboard-kpis"><div><b>${money(d.balance)}</b><small>Faturamento acumulado</small></div><div><b>${d.salesCount||0}</b><small>Produtos vendidos</small></div><div><b>Nível ${d.level||1}</b><small>${d.xp||0} XP da empresa</small></div><div><b>R$ 250</b><small>Taxa semanal ao prefeito</small></div></div><div class="company-dashboard-title"><h3>Empresa</h3><button class="ghost" onclick="openEditCompany('${id}')">🖼️ Foto da empresa</button></div><div class="company-dashboard-title"><h3>Produtos</h3><button class="primary" onclick="openAddCompanyProduct('${id}')">＋ Produto</button></div><div class="company-products-grid">${(c.products||[]).map(p=>`<div class="owner-product-mini"><b>${p.emoji||'📦'} ${esc(p.name)}</b><span>${money(p.price)}</span><small>${esc(p.type)}</small>${p.type==='veiculo'?`<button class="ghost" style="margin-top:8px" onclick="editCompanyVehicle('${c.id}','${p.id}')">🎨 Personalizar veículo</button>`:''}</div>`).join('')}</div><div class="company-dashboard-title"><h3>Últimas vendas</h3></div><div class="sales-list">${sales.length?sales.slice(0,20).map(s=>`<div><b>${esc(s.product)}</b><span>x${s.quantity} — ${money(s.total)}</span><small>${new Date(s.date).toLocaleDateString('pt-BR')}</small></div>`).join(''):'<div class="empty">Nenhuma venda ainda.</div>'}</div></div>`);
}
async function shopPage(box){
 const d=await api("/api/companies"),featured=d.featured||[],recent=d.recent||[];
 const card=c=>`<article class="company-card" onclick="openCompany('${c.id}')"><div class="company-cover">${c.companyImage?'<img src="'+c.companyImage+'" alt="">':'<span>'+esc(c.products?.[0]?.emoji||'🏢')+'</span>'}</div><div class="company-card-body"><div class="company-name-row"><h3>${esc(c.name)}</h3>${c.featured?'<span class="company-featured">DESTAQUE</span>':''}</div><p>${esc(c.description||'Empresa de Sorokiba')}</p><small>🛍️ ${c.productCount} produto${c.productCount===1?'':'s'}</small></div></article>`;
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">LOJAS DE SOROKIBA</span><h1>Comprar</h1><p>Escolha uma empresa para entrar na loja.</p></div></div><div class="company-search"><input placeholder="Pesquisar empresa ou produto..." oninput="searchCompanies(this.value)"></div><div id="companyStoreResults">${featured.length?`<section class="company-section"><div class="section-head"><div><span class="eyebrow">EM DESTAQUE</span><h3>Empresas em destaque</h3></div></div><div class="companies-grid">${featured.map(card).join('')}</div></section>`:''}<section class="company-section"><div class="section-head"><div><span class="eyebrow">EMPRESAS</span><h3>Conheça as lojas</h3></div></div><div class="companies-grid">${recent.length?recent.map(card).join(''):'<div class="empty"><div>🏪</div><h3>Ainda não há empresas</h3></div>'}</div></section></div>`;
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
    <div class="company-buy-row"><label>Quantidade<input id="qty-${p.id}" type="number" min="1" max="99" value="1"></label><button class="primary" onclick="buyCompanyProduct('${c.id}','${p.id}')">Comprar</button></div>
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
  me=d.user;updateHUD();toast(d.message);await openCompany(companyId);
 }catch(e){toast(e.message,"error")}
}
function openAddCompanyProductPage(companyId){openAddCompanyProduct(companyId)}
function readProductImage(input){return new Promise(resolve=>{const f=input?.files?.[0];if(!f)return resolve("");if(!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(f.type)||f.size>400000){toast("Imagem JPG, PNG, WEBP ou GIF de até 400 KB.","error");return resolve(null)}const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>resolve(null);r.readAsDataURL(f)})}
function companyProductFields(){return `<label>Nome do produto<input name="productName" maxlength="80" required></label><label>Descrição<textarea name="productDescription" maxlength="300"></textarea></label><div class="form-row-2"><label>Preço (R$)<input name="price" type="number" min="0.01" max="1000000" step="0.01" required></label><label>Tipo<select name="type" onchange="toggleCompanyEffects(this.value)"><option value="consumivel">Consumível</option><option value="equipamento">Equipamento</option><option value="tecnologia">Tecnologia</option><option value="veiculo">Veículo</option><option value="decoracao">Decoração</option></select></label></div><div id="companyEffectsBox" class="company-effects-form"><strong>Efeitos ao usar</strong><div class="form-row-2"><label>🍽️ Fome<input name="hunger" type="number" min="-100" max="100" value="0"></label><label>💧 Hidratação<input name="hydration" type="number" min="-100" max="100" value="0"></label><label>⚡ Energia<input name="energy" type="number" min="-100" max="100" value="0"></label><label>❤️ Vida<input name="life" type="number" min="-100" max="100" value="0"></label></div></div><label>Emoji do produto <input name="emoji" maxlength="8" placeholder="🚗"></label><label>Foto do produto <span style="opacity:.65">(opcional)</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>`}

function vehicleCustomizationFields(v={}){
 const x=v||{};
 return `<div class="vehicle-customizer"><strong>Personalização do veículo</strong><div class="vehicle-preview" id="vehiclePreview"><div class="vehicle-shape" style="--vc-body:${x.bodyColor||'#dfe6ee'};--vc-secondary:${x.secondaryColor||'#273449'};--vc-window:${x.windowColor||'#7fc8e8'};--vc-wheel:${x.wheelColor||'#151a22'};--vc-neon:${x.neonColor||'#7c5cff'}"><i class="vehicle-window"></i><i class="vehicle-body"></i><i class="vehicle-wheel left"></i><i class="vehicle-wheel right"></i></div></div><div class="form-row-2"><label>Cor principal<input name="bodyColor" type="color" value="${x.bodyColor||'#dfe6ee'}"></label><label>Cor secundária<input name="secondaryColor" type="color" value="${x.secondaryColor||'#273449'}"></label><label>Cor das rodas<input name="wheelColor" type="color" value="${x.wheelColor||'#151a22'}"></label><label>Cor dos vidros<input name="windowColor" type="color" value="${x.windowColor||'#7fc8e8'}"></label><label>Cor do neon<input name="neonColor" type="color" value="${x.neonColor||'#7c5cff'}"></label><label>Cor da placa<input name="plateColor" type="color" value="${x.plateColor||'#f2f2f2'}"></label></div><div class="form-row-2"><label>Rodas<select name="wheels"><option ${x.wheels==='Esportivas'?'selected':''}>Esportivas</option><option ${x.wheels==='Clássicas'?'selected':''}>Clássicas</option><option ${x.wheels==='Off-road'?'selected':''}>Off-road</option></select></label><label>Vidros<select name="windows"><option ${x.windows==='Originais'?'selected':''}>Originais</option><option ${x.windows==='Escuros'?'selected':''}>Escuros</option><option ${x.windows==='Claros'?'selected':''}>Claros</option></select></label></div><label><input name="spoiler" type="checkbox" ${x.spoiler?'checked':''}> Aerofólio</label><label><input name="neon" type="checkbox" ${x.neon?'checked':''}> Neon</label></div>`
}

function readVehicleCustomization(f){return{bodyColor:f.bodyColor?.value,secondaryColor:f.secondaryColor?.value,wheelColor:f.wheelColor?.value,windowColor:f.windowColor?.value,neonColor:f.neonColor?.value,plateColor:f.plateColor?.value,wheels:f.wheels?.value,windows:f.windows?.value,spoiler:!!f.spoiler?.checked,neon:!!f.neon?.checked}}

function updateVehiclePreview(f){const p=f.querySelector("#vehiclePreview .vehicle-shape");if(!p)return;const v=readVehicleCustomization(f);p.style.setProperty("--vc-body",v.bodyColor);p.style.setProperty("--vc-secondary",v.secondaryColor);p.style.setProperty("--vc-window",v.windowColor);p.style.setProperty("--vc-wheel",v.wheelColor);p.style.setProperty("--vc-neon",v.neonColor);p.classList.toggle("has-spoiler",v.spoiler);p.classList.toggle("has-neon",v.neon)}
function bindVehicleCustomizer(f){const box=f.querySelector(".vehicle-customizer");if(!box)return;box.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",()=>updateVehiclePreview(f)));updateVehiclePreview(f)}
function vehicleFieldsForForm(f){const type=f.type?.value;const old=f.querySelector(".vehicle-customizer");if(type==="veiculo"&&!old){const wrap=document.createElement("div");wrap.innerHTML=vehicleCustomizationFields();f.appendChild(wrap.firstElementChild);bindVehicleCustomizer(f)}if(type!=="veiculo"&&old)old.remove()}

function openCreateCompany(){
 openModal(`<h2>Criar empresa</h2><p>Crie sua empresa e escolha uma foto/logo opcional.</p><form id="createCompanyForm" class="company-form"><label>Nome da empresa<input name="name" maxlength="80" required></label><label>Descrição<textarea name="description" maxlength="500" required></textarea></label><label>Foto da empresa <span style="opacity:.65">(opcional)</span><input name="companyImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><h3>Primeiro produto</h3>${companyProductFields()}<button class="primary wide" type="submit">Criar empresa</button></form>`);
 const f=document.getElementById("createCompanyForm");const type=f.type;type.addEventListener("change",()=>{toggleCompanyEffects(type.value);vehicleFieldsForForm(f);bindVehicleCustomizer(f)});f.onsubmit=async e=>{e.preventDefault();try{const image=await readProductImage(f.image),companyImage=await readProductImage(f.companyImage);if(image===null||companyImage===null)return;const d=await post("/api/companies",{name:f.name.value,description:f.description.value,companyImage,product:{name:f.productName.value,description:f.productDescription.value,price:f.price.value,type:f.type.value,image,emoji:f.emoji.value,effects:{hunger:f.hunger.value,hydration:f.hydration.value,energy:f.energy.value,life:f.life.value},vehicleCustomization:f.type.value==="veiculo"?readVehicleCustomization(f):null}});closeModal();toast(d.message);loadPage("shop")}catch(err){toast(err.message,"error")}};
}
async function openEditCompany(id){const d=await api("/api/companies/"+encodeURIComponent(id)),c=d.company;openModal(`<h2>Foto da empresa</h2><p>${esc(c.name)}</p><form id="editCompanyForm" class="company-form"><label>Nova foto/logo <span style="opacity:.65">(opcional)</span><input name="companyImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><small>Deixe sem selecionar para remover a foto atual.</small><button class="primary wide" type="submit">Salvar foto</button></form>`);const f=document.getElementById("editCompanyForm");f.onsubmit=async e=>{e.preventDefault();try{const image=await readProductImage(f.companyImage);if(image===null)return;const r=await put("/api/companies/"+encodeURIComponent(id),{companyImage:image});closeModal();toast(r.message);openCompanyDashboard(id)}catch(err){toast(err.message,"error")}}}

function toggleCompanyEffects(type){const e=document.getElementById("companyEffectsBox");if(e)e.style.display=type==="consumivel"?"block":"none"}
function openAddCompanyProduct(companyId){
 openModal(`<h2>Adicionar produto</h2><form id="addCompanyProductForm" class="company-form">${companyProductFields()}<button class="primary wide" type="submit">Adicionar produto</button></form>`);
 const f=document.getElementById("addCompanyProductForm");const type=f.type;type.addEventListener("change",()=>{toggleCompanyEffects(type.value);vehicleFieldsForForm(f)});f.onsubmit=async e=>{e.preventDefault();try{const image=await readProductImage(f.image);if(image===null)return;const d=await post("/api/companies/"+encodeURIComponent(companyId)+"/products",{name:f.productName.value,description:f.productDescription.value,price:f.price.value,type:f.type.value,image,emoji:f.emoji.value,effects:{hunger:f.hunger.value,hydration:f.hydration.value,energy:f.energy.value,life:f.life.value},vehicleCustomization:f.type.value==="veiculo"?readVehicleCustomization(f):null});closeModal();toast(d.message);openCompany(companyId)}catch(err){toast(err.message,"error")}};
}
async function editCompanyVehicle(companyId,productId){
 const d=await api("/api/companies/"+encodeURIComponent(companyId)),p=(d.company.products||[]).find(x=>x.id===productId);if(!p)return toast("Veículo não encontrado.","error");
 openModal(`<h2>Personalizar veículo</h2><p>${esc(p.name)}</p><form id="vehicleEditForm" class="company-form">${vehicleCustomizationFields(p.vehicleCustomization||{})}<label>Emoji do veículo<input name="emoji" maxlength="8" value="${esc(p.emoji||'🚗')}"></label><button class="primary wide" type="submit">Salvar personalização</button></form>`);
 const f=document.getElementById("vehicleEditForm");bindVehicleCustomizer(f);f.onsubmit=async e=>{e.preventDefault();try{const r=await put("/api/companies/"+encodeURIComponent(companyId)+"/products/"+encodeURIComponent(productId),{vehicleCustomization:readVehicleCustomization(f),emoji:f.emoji.value});closeModal();toast(r.message);openCompanyDashboard(companyId)}catch(err){toast(err.message,"error")}};
}
async function deleteCompanyProduct(companyId,productId){if(!confirm("Remover este produto da empresa?"))return;try{const r=await fetch("/api/companies/"+encodeURIComponent(companyId)+"/products/"+encodeURIComponent(productId),{method:"DELETE",headers:{Authorization:"Bearer "+localStorage.getItem("sorokiba_token")}});const d=await r.json();if(!r.ok)throw new Error(d.error||"Erro ao remover");toast(d.message);openCompany(companyId)}catch(e){toast(e.message,"error")}}

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
