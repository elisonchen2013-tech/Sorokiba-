/* Controles extras da Prefeitura + carrossel da Cidade. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const icon=id=>({estudante:'🎓',entregador:'📦',mecanico:'🔧',professor:'📚',policial:'🛡️',investigador:'🔎',advogado:'⚖️',engenheiro:'🏗️',medico:'⚕️',juiz:'👨‍⚖️',comerciante:'🛍️',motorista:'🚗',enfermeiro:'🩺',programador:'💻',administrador:'💼'}[id]||'💼');

  function adminStyles(){
    if(document.getElementById('mayor-controls-style'))return;
    const s=document.createElement('style');s.id='mayor-controls-style';s.textContent=`
      .mayor-reward-list,.mayor-account-list{display:grid;gap:14px;max-height:60vh;overflow:auto;padding:4px}.mayor-reward-card,.mayor-account-card{padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.03)}.mayor-reward-title{display:flex;gap:12px;align-items:center;margin-bottom:12px}.mayor-reward-title>span{font-size:25px}.mayor-reward-title strong,.mayor-reward-title small,.mayor-account-card strong,.mayor-account-card small{display:block}.mayor-reward-title small,.mayor-account-card small{opacity:.65;margin-top:4px}.mayor-reward-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.mayor-reward-fields input{display:block;width:100%;box-sizing:border-box;margin-top:5px}.mayor-account-card{display:flex;justify-content:space-between;align-items:center;gap:12px}.mayor-delete-btn{color:#ff8d8d}.mayor-account-open{display:flex!important;align-items:center;gap:12px}.mayor-account-open span{font-size:22px}
    `;document.head.appendChild(s);
  }

  window.manageRewards=async function(){try{const [r,j]=await Promise.all([api('/api/mayor/rewards'),api('/api/jobs')]);const rewards=r.missionRewards||{};openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • MISSÕES</span><h2>Recompensas das missões</h2><p>Altere dinheiro, XP e quantidade de perguntas de cada profissão.</p></div></div><div class="mayor-reward-list">${(j.jobs||[]).map(job=>{const x=rewards[job.id]||{moneyPerMission:50,xpPerMission:20,questionsPerMission:2};return `<div class="mayor-reward-card"><div class="mayor-reward-title"><span>${icon(job.id)}</span><div><strong>${esc(job.name)}</strong><small>${esc(job.task||'Missões desta profissão')}</small></div></div><div class="mayor-reward-fields"><label>💰 Dinheiro<input class="reward-money" data-job="${esc(job.id)}" type="number" min="0" value="${Number(x.moneyPerMission||0)}"></label><label>⭐ XP<input class="reward-xp" data-job="${esc(job.id)}" type="number" min="0" value="${Number(x.xpPerMission||0)}"></label><label>❓ Perguntas<input class="reward-questions" data-job="${esc(job.id)}" type="number" min="1" max="10" value="${Number(x.questionsPerMission||2)}"></label></div></div>`}).join('')}</div><button class="primary wide" onclick="saveMissionRewards()">💾 Salvar recompensas</button></div>`)}catch(e){toast(e.message,'error')}};
  window.saveMissionRewards=async function(){try{const missionRewards={};document.querySelectorAll('.reward-money').forEach(input=>{const id=input.dataset.job;missionRewards[id]={moneyPerMission:Number(input.value)||0,xpPerMission:Number(document.querySelector(`.reward-xp[data-job="${CSS.escape(id)}"]`)?.value)||0,questionsPerMission:Number(document.querySelector(`.reward-questions[data-job="${CSS.escape(id)}"]`)?.value)||1}});const d=await post('/api/mayor/rewards',{missionRewards});toast(d.message||'Recompensas salvas!');closeModal();loadPage('mayor')}catch(e){toast(e.message,'error')}};
  window.manageAccounts=async function(){try{const d=await api('/api/mayor/users');openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • ADMINISTRAÇÃO</span><h2>Gerenciar contas</h2><p>Veja os cidadãos cadastrados e exclua uma conta quando necessário.</p></div></div><div class="mayor-account-list">${(d.users||[]).length?(d.users||[]).map(u=>`<div class="mayor-account-card"><div><strong>${esc(u.name||u.username)}</strong><small>@${esc(u.username)} • ${esc(u.jobName||'Estudante')} • Nível ${Number(u.level||1)}</small></div><button class="ghost mayor-delete-btn" onclick="deleteMayorAccount('${encodeURIComponent(u.username)}','${esc(u.name||u.username)}')">🗑️ Excluir</button></div>`).join(''):'<div class="empty"><div>👥</div><h3>Nenhuma conta para administrar</h3></div>'}</div></div>`)}catch(e){toast(e.message,'error')}};
  window.deleteMayorAccount=async function(username,name){if(!confirm(`Tem certeza que deseja excluir a conta de ${name}? Esta ação não pode ser desfeita.`))return;try{const d=await api(`/api/mayor/users/${username}`,{method:'DELETE'});toast(d.message||'Conta excluída!');manageAccounts()}catch(e){toast(e.message,'error')}};

  function attachMayor(){
    adminStyles();
    if(typeof window.mayorPage!=='function'||typeof window.mayorSection!=='function'){setTimeout(attachMayor,100);return}
    if(window.mayorPage.__sorokibaControls)return;
    const originalPage=window.mayorPage,originalSection=window.mayorSection;
    const page=async function(box){await originalPage(box);if(!isMayor)return;const quick=box.querySelector('.mayor-quick-grid');if(quick&&!quick.querySelector('[data-accounts]')){const b=document.createElement('button');b.setAttribute('data-accounts','1');b.className='mayor-account-open';b.onclick=()=>manageAccounts();b.innerHTML='<span>👥</span><div><strong>Gerenciar contas</strong><small>Veja e exclua contas de cidadãos.</small></div><b>→</b>';quick.appendChild(b)}};
    page.__sorokibaControls=true;window.mayorPage=page;
    window.mayorSection=function(type){if(type==='rewards')return manageRewards();if(type==='accounts')return manageAccounts();return originalSection(type)};
  }
  attachMayor();

  function liveSeason(){
    const m=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',month:'numeric'}).format(new Date()));
    if(m===12||m<=2)return {name:'VERÃO',icon:'☀️',theme:'summer'};
    if(m<=5)return {name:'OUTONO',icon:'🍂',theme:'autumn'};
    if(m<=8)return {name:'INVERNO',icon:'❄️',theme:'winter'};
    return {name:'PRIMAVERA',icon:'🌸',theme:'spring'};
  }
  function liveTime(){
    const h=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'numeric',hour12:false}).format(new Date()));
    if(h>=6&&h<12)return {name:'MANHÃ',icon:'🌅',title:'Bom dia'};
    if(h>=12&&h<18)return {name:'TARDE',icon:'☀️',title:'Boa tarde'};
    if(h>=18&&h<24)return {name:'NOITE',icon:'🌙',title:'Boa noite'};
    return {name:'MADRUGADA',icon:'🌙',title:'Boa madrugada'};
  }
  function carouselStyles(){
    if(document.getElementById('soro-live-carousel-style'))return;
    const s=document.createElement('style');s.id='soro-live-carousel-style';s.textContent=`
      .soro-live-carousel{position:absolute;inset:0;overflow:hidden;padding:42px;display:flex;align-items:center;border-radius:inherit;background:#151d35;transition:background .8s ease}.soro-live-carousel *{box-sizing:border-box}.soro-live-main{position:relative;z-index:4;width:min(72%,780px)}.soro-live-tag{font-size:11px;font-weight:800;letter-spacing:2px;color:#b3aaff}.soro-live-title{font:700 clamp(34px,4.2vw,58px)/1.02 "Space Grotesk",sans-serif;letter-spacing:-2px;margin:14px 0}.soro-live-text{font-size:16px;line-height:1.65;color:#b8c1d3;max-width:680px;margin:0}.soro-live-meta{display:flex;gap:24px;margin-top:28px}.soro-live-meta div{display:flex;align-items:center;gap:9px;color:#9faac0;font-size:10px;font-weight:800;letter-spacing:1px}.soro-live-meta b{color:#d4d9ff}.soro-live-art{position:absolute;right:5%;top:50%;transform:translateY(-50%);width:390px;height:300px;z-index:3;display:flex;align-items:center;justify-content:center}.soro-live-art .orb{position:absolute;width:235px;height:235px;border:1px solid rgba(255,255,255,.18);border-radius:50%;animation:soroLiveSpin 15s linear infinite}.soro-live-art .orb:after{content:"";position:absolute;inset:28px;border:1px dashed rgba(255,255,255,.15);border-radius:50%}.soro-live-art .symbol{position:relative;z-index:2;font-size:105px;filter:drop-shadow(0 0 30px rgba(255,255,255,.3));animation:soroLiveFloat 4s ease-in-out infinite}.soro-live-art .extra{position:absolute;font-size:30px;opacity:.75}.soro-live-dots{position:absolute;right:38px;bottom:28px;z-index:8;display:flex;gap:7px}.soro-live-dots button{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.22)}.soro-live-dots button.active{width:24px;border-radius:10px;background:#9d8cff}.soro-live-season{position:absolute;right:38px;top:28px;z-index:8;padding:9px 14px;border:1px solid rgba(255,255,255,.12);border-radius:99px;background:rgba(255,255,255,.06);color:#d9d7ef;font-size:10px;font-weight:800;letter-spacing:1px;backdrop-filter:blur(10px)}
      .soro-live-carousel.summer{background:radial-gradient(circle at 80% 30%,rgba(255,199,77,.35),transparent 28%),linear-gradient(120deg,#172139,#34445d)}.soro-live-carousel.autumn{background:radial-gradient(circle at 80% 30%,rgba(211,116,52,.32),transparent 28%),linear-gradient(120deg,#241a25,#48302d)}.soro-live-carousel.winter{background:radial-gradient(circle at 80% 30%,rgba(92,181,255,.3),transparent 28%),linear-gradient(120deg,#101b30,#1b3b55)}.soro-live-carousel.spring{background:radial-gradient(circle at 80% 30%,rgba(238,125,194,.3),transparent 28%),linear-gradient(120deg,#162332,#30413e)}.soro-live-carousel.city{background:radial-gradient(circle at 80% 30%,rgba(80,125,255,.3),transparent 28%),linear-gradient(120deg,#11192d,#1f3150)}.soro-live-carousel.goals{background:radial-gradient(circle at 80% 30%,rgba(166,112,255,.35),transparent 28%),linear-gradient(120deg,#15142d,#2e2350)}.soro-live-carousel.career{background:radial-gradient(circle at 80% 30%,rgba(37,214,170,.28),transparent 28%),linear-gradient(120deg,#10202b,#19403d)}.soro-live-carousel.news{background:radial-gradient(circle at 80% 30%,rgba(255,194,79,.25),transparent 28%),linear-gradient(120deg,#191a2b,#352d43)}
      .soro-live-carousel .petals,.soro-live-carousel .snow,.soro-live-carousel .leaves,.soro-live-carousel .stars{position:absolute;inset:0;pointer-events:none;overflow:hidden}.soro-live-carousel .petals:before{content:'🌸  ✿  🌸  ❀  🌸';position:absolute;right:4%;top:12%;font-size:26px;letter-spacing:22px;animation:soroLiveDrift 7s ease-in-out infinite}.soro-live-carousel .snow:before{content:'❄️  ❄︎  ❄️  ❄︎  ❄️';position:absolute;right:5%;top:15%;font-size:22px;letter-spacing:18px;animation:soroLiveSnow 5s ease-in-out infinite}.soro-live-carousel .leaves:before{content:'🍂  🍁  🍂  🍁  🍂';position:absolute;right:3%;top:15%;font-size:24px;letter-spacing:18px;animation:soroLiveDrift 5s ease-in-out infinite}.soro-live-carousel .stars:before{content:'✦   ✧   ✦   ✧';position:absolute;right:7%;top:15%;font-size:25px;letter-spacing:16px;opacity:.6;animation:soroLivePulse 3s ease-in-out infinite}
      @keyframes soroLiveSpin{to{transform:rotate(360deg)}}@keyframes soroLiveFloat{50%{transform:translateY(-10px)}}@keyframes soroLiveDrift{50%{transform:translate(-28px,35px) rotate(5deg)}}@keyframes soroLiveSnow{50%{transform:translateY(35px)}}@keyframes soroLivePulse{50%{opacity:.2;transform:scale(.85)}}
      @media(max-width:900px){.soro-live-carousel{padding:30px}.soro-live-main{width:88%}.soro-live-art{right:-70px;opacity:.35}.soro-live-dots{right:25px}.soro-live-season{right:25px}}@media(max-width:600px){.soro-live-carousel{padding:25px}.soro-live-art{display:none}.soro-live-main{width:100%}.soro-live-title{font-size:34px}.soro-live-text{font-size:13px}}
      .soro-home-carousel .soro-carousel-progress,.soro-carousel-progress{display:none!important}.soro-home-carousel .soro-carousel-decoration{display:none!important}
    `;document.head.appendChild(s);
  }
  function buildSlides(){
    const first=String(me?.name||'Cidadão').trim().split(/\s+/)[0]||'Cidadão';const season=liveSeason();const time=liveTime();
    return [
      {kind:'time',tag:'SOROKIBA ONLINE',title:`${time.title}, ${first}.`,text:'A cidade está em movimento. O que você vai fazer hoje?',meta1:'HORÁRIO',meta2:time.name,icon:time.icon,theme:'city'},
      {kind:'season',tag:`${season.icon} ESTAÇÃO ATUAL`,title:`Hoje é ${season.name.toLowerCase()}.`,text:`A estação atual é ${season.name}. O ambiente de Sorokiba acompanha o período real do ano.`,meta1:'TEMPORADA',meta2:season.name,icon:season.icon,theme:season.theme},
      {kind:'city',tag:'🏙️ VIDA NA CIDADE',title:'Sorokiba está em movimento.',text:'Trabalhe, compre, cuide do seu cidadão e acompanhe o que acontece na cidade.',meta1:'CIDADE',meta2:'ATIVA',icon:'🏙️',theme:'city'},
      {kind:'goals',tag:'🎯 NOVOS OBJETIVOS',title:'Sempre existe algo para conquistar.',text:'Complete missões, ganhe experiência e evolua sua vida em Sorokiba.',meta1:'PROGRESSO',meta2:`NÍVEL ${Number(me?.level||1)}`,icon:'🎯',theme:'goals'},
      {kind:'career',tag:'💼 SUA CARREIRA',title:`${esc(me?.jobName||'Estudante')} em ação.`,text:'Sua profissão faz parte da economia da cidade. Continue evoluindo para abrir oportunidades.',meta1:'CARREIRA',meta2:'EM ANDAMENTO',icon:'💼',theme:'career'},
      {kind:'news',tag:'✨ UMA CIDADE VIVA',title:'O próximo acontecimento pode começar agora.',text:'Fique de olho nas novidades, eventos e notícias de Sorokiba.',meta1:'SOROKIBA',meta2:'CONECTADA',icon:'✨',theme:'news'}
    ];
  }
  function art(slide){
    const extra={season:slide.icon,time:'🕐',city:'🏙️',goals:'✦  ✧  ✦',career:'📈  ◇  📈',news:'✦  ✧  ✦'}[slide.kind]||slide.icon;
    return `<div class="soro-live-art"><div class="orb"></div><div class="symbol">${slide.icon}</div><div class="extra">${extra}</div></div>${slide.theme==='spring'?'<div class="petals"></div>':''}${slide.theme==='winter'?'<div class="snow"></div>':''}${slide.theme==='autumn'?'<div class="leaves"></div>':''}${slide.kind==='news'?'<div class="stars"></div>':''}`;
  }
  function mountLiveCarousel(box){
    const hero=box.querySelector('.hero');if(!hero)return;
    if(hero._soroLiveTimer)clearInterval(hero._soroLiveTimer);
    hero.querySelectorAll('.soro-home-carousel').forEach(x=>x.remove());
    if(hero.querySelector('.soro-live-carousel'))return;
    carouselStyles();
    const slides=buildSlides();let index=0;
    hero.innerHTML='<div class="soro-live-carousel"></div>';
    const root=hero.querySelector('.soro-live-carousel');
    function render(){
      const slide=slides[index];
      root.className=`soro-live-carousel ${slide.theme}`;
      const season=liveSeason();root.innerHTML=`${art(slide)}<div class="soro-live-season">${season.icon} ${season.name}</div><div class="soro-live-main"><div class="soro-live-tag">${slide.tag}</div><h1 class="soro-live-title">${slide.title}</h1><p class="soro-live-text">${slide.text}</p><div class="soro-live-meta"><div>${slide.icon} ${slide.meta1} <b>${slide.meta2}</b></div></div></div><div class="soro-live-dots">${slides.map((_,i)=>`<button type="button" class="${i===index?'active':''}" data-slide="${i}" aria-label="Mensagem ${i+1}"></button>`).join('')}</div>`;
      root.querySelectorAll('.soro-live-dots button').forEach(b=>b.onclick=()=>{index=Number(b.dataset.slide)||0;render();reset();});
    }
    function next(){index=(index+1)%slides.length;render()}
    function reset(){clearInterval(hero._soroLiveTimer);hero._soroLiveTimer=setInterval(next,14000)}
    render();reset();
  }
  function attachCity(){
    if(typeof window.cityPage!=='function'){setTimeout(attachCity,100);return}
    if(window.cityPage.__sorokibaLiveCarousel)return;
    const original=window.cityPage;
    const wrapped=async function(box){await original(box);mountLiveCarousel(box)};
    wrapped.__sorokibaLiveCarousel=true;window.cityPage=wrapped;
  }
  attachCity();
})();
