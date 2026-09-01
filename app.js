
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let token=localStorage.getItem("sorokiba_token"), me=null, isMayor=false, currentPage="city", timer=null;

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
 box.innerHTML=`<section class="hero"><div><span class="tag">● SOROKIBA ONLINE</span><h1>Bom dia, ${esc(me.name.split(" ")[0])}.</h1><p>A cidade está em movimento. O que você vai fazer hoje?</p></div></section>
 <div class="section-head"><div><span class="eyebrow">STATUS DA CIDADE</span><h3>Sorokiba hoje</h3></div><span class="live"><i></i> AO VIVO</span></div>
 <div class="stats-grid"><div class="stat-card"><span>👥</span><small>População</small><b>${c.population}</b><em>cidadãos</em></div><div class="stat-card"><span>📈</span><small>Economia</small><b>R$ ${c.economy.toLocaleString('pt-BR')}</b></div><div class="stat-card"><span>🏗️</span><small>Infraestrutura</small><b>${c.infrastructure}%</b></div><div class="stat-card"><span>✨</span><small>Qualidade</small><b>${c.quality}%</b></div></div>
 <div class="two-col"><div class="panel"><div class="panel-title"><h3>Atalhos</h3></div><div class="quick-grid"><button onclick="nav('job')">💼<b>Minha carreira</b><small>Ver profissões</small></button><button onclick="nav('shop')">🛒<b>Compras</b><small>Compre itens</small></button><button onclick="nav('missions')">🎯<b>Missões</b><small>Ganhe XP</small></button></div></div>
 <div class="panel health-panel"><div class="panel-title"><h3>Seu cidadão</h3><span>Nível ${me.level}</span></div><p>Profissão atual: <b>${esc(me.jobName)}</b></p><div class="mini-bars"><div><span>❤️</span><i style="width:${me.life}%"></i></div><div><span>🍽️</span><i style="width:${me.hunger}%"></i></div></div></div></div>`;
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
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">TRABALHO</span><h1>Missões de ${esc(d.job.name)}</h1><p>${esc(d.job.task)}</p></div><button class="primary" onclick="startMission()">▶️ Começar nova missão</button></div>
 <div id="missionList" class="mission-list">${d.active.length?d.active.map(m=>missionCard(m)).join(""):'<div class="empty"><div>🎯</div><h3>Nenhuma missão ativa</h3><p>Comece uma nova missão para ganhar XP e dinheiro</p></div>'}
 </div><div class="section-head"><h3>Histórico recente</h3></div><div class="table-card"><table><thead><tr><th>Missão</th><th>Recompensa</th><th>Concluída</th></tr></thead><tbody>${d.history.length?d.history.map(h=>`<tr><td>Missão completa</td><td>+XP</td><td>${new Date(h.createdAt).toLocaleDateString('pt-BR')}</td></tr>`).join(''):'<tr><td colspan="3">Nenhuma missão concluída ainda</td></tr>'}</tbody></table></div>`;
 timer=setInterval(refreshMissionTimers,1000);
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
  const q = mission.question || { text: 'Pergunta indisponível', options: [] };
  let html = `<div class="mission-modal"><h2>Pergunta da missão</h2><p class="mission-q">${esc(q.text)}</p><div class="mission-opts">${q.options.map((opt,i)=>`<button class="primary option-btn" id="opt-${i}" onclick="answerMission('${mission.id}',${i})">${esc(opt)}</button>`).join('')}</div><p>Tempo restante: <strong id="missionTimer">${Math.floor(mission.duration_seconds/60)}:${String(mission.duration_seconds%60).padStart(2,'0')}</strong></p><button class="ghost" onclick="closeModal()">Fechar</button></div>`;
  openModal(html);

  // start countdown
  const endAt = Date.now() + mission.duration_seconds*1000;
  const timerId = setInterval(()=>{
    const sec = Math.max(0, Math.floor((endAt - Date.now())/1000));
    const min = Math.floor(sec/60); const s = sec%60;
    const el = document.getElementById('missionTimer');
    if(el) el.textContent = `${min}:${String(s).padStart(2,'0')}`;
    if(sec<=0){
      clearInterval(timerId);
      // disable options
      $$('.option-btn').forEach(b=>b.disabled=true);
      // mark mission expired on server
      post(`/api/missions/${mission.id}/complete`,{}).then(()=>{toast('Tempo esgotado para responder')}).catch(()=>{});
    }
  },250);
}

async function answerMission(id, index){
 try{
   const d=await post(`/api/missions/${id}/answer`,{answer:index});
   me=d.user;updateHUD();
   if(d.correct){
     toast(`${d.message} +${d.xpGiven} XP e ${money(d.moneyGiven)}`);
   } else {
     openModal(`<h2>${d.message}</h2><p>Resposta correta: <b>${esc(d.correctOptionText || d.correctIndex)}</b></p><p>Ganhou ${d.xpGiven} XP</p><button class="primary" onclick="closeModal()">Fechar</button>`);
   }
   loadPage("missions");
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
 // render as wrapped flex to avoid horizontal swipe on mobile
 const itemsHtml = items.map(i=>`<div class="item-card" style="flex:1 1 200px;margin:8px;min-width:160px"><div class="item-icon">${i.icon}</div><h3>${i.name}</h3><p>${i.description}</p><small>R$ ${i.price}</small><button class="primary" onclick="openBuyModal(${i.id},'${i.name}',${i.price})">Comprar</button></div>`).join('');
 box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">MERCADO DE SOROKIBA</span><h1>Loja de alimentos</h1><p>Compre itens para manter seu cidadão pronto para o dia. Você tem ${money(me.money)}.</p></div></div><div style="display:flex;flex-wrap:wrap;gap:8px">${itemsHtml}</div>`;
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
 box.innerHTML=`<div class="bank-hero"><div><span class="eyebrow">BANCO SOROKIBA</span><h1>Sua vida financeira</h1><p>Gerencie seu dinheiro com segurança.</p></div><div class="bank-balance"><small>Saldo atual</small><b>${money(d.balance)}</b></div></div>
 <div class="bank-actions"><button class="primary" onclick="bankModal('deposit')">＋ Depositar</button><button class="ghost" onclick="bankModal('withdraw')">↗ Sacar</button><button class="ghost" onclick="bankModal('transfer')">💸 Transferir</button></div>
 <div class="section-head"><h3>Histórico financeiro</h3></div><div class="table-card"><table><thead><tr><th>Data</th><th>Tipo</th><th>Pessoa</th><th>Valor</th></tr></thead><tbody>${d.transfers.length?d.transfers.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.type}</td><td>${t.person}</td><td>${money(t.amount)}</td></tr>`).join(''):'<tr><td colspan="4">Nenhuma transação</td></tr>'}</tbody></table></div>`;
}
function bankModal(type){
 const labels={deposit:["Depositar","Valor para depositar","deposit"],withdraw:["Sacar","Valor para sacar","withdraw"],transfer:["Transferir","Valor","transfer"]}[type];
 openModal(`<h2>${labels[0]}</h2><p>${type==="transfer"?"O valor será enviado para a conta bancária do usuário.":"Digite o valor da operação."}</p>${type==="transfer"?'<label>Usuário destinatário<input id="modalUser"></label>':''}<label>${labels[1]}<input id="modalAmount" type="number" min="1"></label><button class="primary" onclick="doBank('${type}')">Confirmar</button>`);
}
async function doBank(type){try{const amount=Number($("#modalAmount").value);if(amount<1){toast("Valor inválido","error");return}let d;if(type==="transfer")d=await post("/api/bank/transfer",{username:$("#modalUser").value,amount});else d=await post("/api/bank/"+type,{amount});closeModal();toast(d.message);loadPage("bank")}catch(e){toast(e.message,"error")}}

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
 <div class="panel"><div class="panel-title"><h3>Comunicação oficial</h3></div><button class="quick-action" onclick="mayorContent('news')">📰 Publicar notícia</button><button class="quick-action" onclick="mayorContent('events')">📅 Criar evento</button></div></div>`;
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

setInterval(async()=>{if(!token||!me)return;try{const d=await api("/api/me");me=d.user;isMayor=d.isMayor;updateHUD();$("#mayorNav").classList.toggle("hidden",!isMayor)}catch{}},60000);
boot();
