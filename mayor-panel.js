/* Painel organizado da Prefeitura — usa as mesmas APIs e o mesmo visual do Sorokiba. */
(function(){
  const $=s=>document.querySelector(s);
  const escMayor=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[m]));
  const iconMayor=id=>({estudante:'🎓',entregador:'📦',mecanico:'🔧',professor:'📚',policial:'🛡️',investigador:'🔎',advogado:'⚖️',engenheiro:'🏗️',medico:'⚕️',juiz:'👨‍⚖️',comerciante:'🛍️',motorista:'🚗',enfermeiro:'🩺',programador:'💻'}[id]||'💼');

  async function mayorPageOrganized(box){
    if(!isMayor){box.innerHTML='<div class="empty"><div>🔒</div><h3>Área restrita</h3><p>Apenas o prefeito pode acessar esta página.</p></div>';return;}
    try{
      const [d,qs,jobsData]=await Promise.all([api('/api/mayor'),api('/api/mayor/questions'),api('/api/jobs')]);
      const jobs=jobsData.jobs||[];
      const usedJobs=new Set((qs||[]).map(q=>q.jobId));
      box.innerHTML=`
        <div class="mayor-banner mayor-banner-organized">
          <div><span class="tag">🏛️ GABINETE DO PREFEITO</span><h1>Prefeitura de Sorokiba</h1><p>Um painel central para administrar a cidade, publicar comunicados e organizar as perguntas das missões.</p></div>
          <div class="mayor-seal">🏛️</div>
        </div>
        <div class="mayor-dashboard-grid">
          <button class="mayor-dashboard-card" onclick="mayorSection('questions')"><span>✏️</span><div><strong>Banco de perguntas</strong><small>${qs.length} pergunta${qs.length===1?'':'s'} cadastrada${qs.length===1?'':'s'}</small></div><b>→</b></button>
          <button class="mayor-dashboard-card" onclick="mayorSection('rewards')"><span>🎁</span><div><strong>Recompensas</strong><small>XP, dinheiro e quantidade de perguntas</small></div><b>→</b></button>
          <button class="mayor-dashboard-card" onclick="mayorSection('communication')"><span>📰</span><div><strong>Comunicação</strong><small>Notícias e eventos da cidade</small></div><b>→</b></button>
          <button class="mayor-dashboard-card" onclick="mayorSection('indicators')"><span>📊</span><div><strong>Indicadores</strong><small>Economia, impostos e qualidade</small></div><b>→</b></button>
        </div>
        <div class="section-head mayor-section-heading"><div><span class="eyebrow">RESUMO DA CIDADE</span><h3>Visão administrativa</h3></div></div>
        <div class="stats-grid mayor-stats-grid">
          <div class="stat-card"><span>👥</span><small>População</small><b>${d.population}</b><em>cidadãos</em></div>
          <div class="stat-card"><span>💰</span><small>Tesouro</small><b>${money(d.treasury)}</b><em>recursos da prefeitura</em></div>
          <div class="stat-card"><span>📚</span><small>Perguntas</small><b>${qs.length}</b><em>${usedJobs.size}/${jobs.length||0} profissões com banco</em></div>
          <div class="stat-card"><span>🏗️</span><small>Infraestrutura</small><b>${d.infrastructure}%</b><em>qualidade ${d.quality}%</em></div>
        </div>
        <div class="mayor-control-panel">
          <div class="panel-title"><div><span class="eyebrow">ACESSO RÁPIDO</span><h3>O que você quer administrar?</h3></div></div>
          <div class="mayor-quick-grid">
            <button onclick="mayorSection('questions')">✏️<strong>Adicionar perguntas</strong><small>Crie, edite, filtre e exclua perguntas.</small></button>
            <button onclick="mayorSection('rewards')">🎁<strong>Configurar recompensas</strong><small>Defina XP, dinheiro e quantidade.</small></button>
            <button onclick="mayorSection('communication')">📢<strong>Publicar comunicação</strong><small>Notícias e eventos oficiais.</small></button>
            <button onclick="mayorSection('indicators')">⚙️<strong>Editar indicadores</strong><small>Impostos, economia e infraestrutura.</small></button>
          </div>
        </div>`;
    }catch(e){box.innerHTML=`<div class="empty"><div>⚠️</div><h3>Não foi possível carregar a prefeitura</h3><p>${escMayor(e.message)}</p></div>`;}
  }

  function mayorSection(type){
    if(type==='questions')return manageQuestionsOrganized();
    if(type==='rewards')return manageRewards();
    if(type==='communication')return openMayorCommunication();
    if(type==='indicators')return openMayorIndicators();
  }

  async function manageQuestionsOrganized(){
    try{
      const [qs,jobsData]=await Promise.all([api('/api/mayor/questions'),api('/api/jobs')]);
      const jobs=jobsData.jobs||[];
      const counts={};
      qs.forEach(q=>counts[q.jobId]=(counts[q.jobId]||0)+1);
      const jobOptions=jobs.map(j=>`<option value="${escMayor(j.id)}">${iconMayor(j.id)} ${escMayor(j.name)}${counts[j.id]?` — ${counts[j.id]}`:''}</option>`).join('');
      openModal(`<div class="mayor-modal mayor-questions-modal">
        <div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • BANCO DE DADOS</span><h2>Banco de perguntas</h2><p>Organize as perguntas por profissão e dificuldade sem precisar procurar no código.</p></div><button class="primary mayor-new-question-btn" onclick="newQuestionForm()">＋ Nova pergunta</button></div>
        <div class="mayor-question-tools"><label>Filtrar profissão<select id="mayorQuestionFilter"><option value="all">Todas as profissões (${qs.length})</option>${jobOptions}</select></label><label>Buscar pergunta<input id="mayorQuestionSearch" placeholder="Digite uma palavra..."></label></div>
        <div id="mayorQuestionStats" class="mayor-question-stats"></div>
        <div id="mayorQuestionList" class="mayor-question-list"></div>
      </div>`);
      const render=()=>{
        const filter=$('#mayorQuestionFilter').value;
        const search=($('#mayorQuestionSearch').value||'').toLowerCase().trim();
        const filtered=qs.filter(q=>(filter==='all'||q.jobId===filter)&&(!search||String(q.text).toLowerCase().includes(search)||(q.options||[]).some(o=>String(o).toLowerCase().includes(search))));
        const total=qs.length;
        const avg=total?Math.round(qs.reduce((a,q)=>a+Number(q.difficulty||1),0)/total*10)/10:0;
        $('#mayorQuestionStats').innerHTML=`<div><b>${filtered.length}</b><small>Exibidas</small></div><div><b>${total}</b><small>Total</small></div><div><b>${Object.keys(counts).length}</b><small>Profissões</small></div><div><b>${avg}</b><small>Dificuldade média</small></div>`;
        $('#mayorQuestionList').innerHTML=filtered.length?filtered.map(q=>{
          const job=jobs.find(j=>j.id===q.jobId);
          const opts=(q.options||[]).map((o,i)=>`<div class="mayor-option ${i===Number(q.correct)?'correct':''}"><span>${String.fromCharCode(65+i)}</span>${escMayor(o)}${i===Number(q.correct)?'<b>✓ correta</b>':''}</div>`).join('');
          return `<article class="mayor-question-card"><div class="mayor-question-top"><div><span class="mayor-job-chip">${iconMayor(q.jobId)} ${escMayor(job?.name||q.jobId)}</span><span class="mayor-difficulty">Dificuldade ${Number(q.difficulty||1)}/5</span></div><span class="mayor-question-id">#${escMayor(q.id)}</span></div><h3>${escMayor(q.text)}</h3><div class="mayor-options">${opts}</div><div class="mayor-question-actions"><button class="ghost" onclick="editQuestion('${escMayor(q.id)}')">✏️ Editar</button><button class="ghost mayor-delete-btn" onclick="deleteQuestion('${escMayor(q.id)}')">🗑️ Excluir</button></div></article>`;
        }).join(''):'<div class="empty mayor-empty"><div>📭</div><h3>Nenhuma pergunta encontrada</h3><p>Altere o filtro ou crie uma nova pergunta.</p></div>';
      };
      $('#mayorQuestionFilter').onchange=render;$('#mayorQuestionSearch').oninput=render;render();
    }catch(e){toast(e.message,'error')}
  }

  function newQuestionForm(){
    const current=$('#mayorQuestionFilter')?.value||'all';
    const back=`<button class="ghost" onclick="manageQuestionsOrganized()">← Voltar para perguntas</button>`;
    openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • NOVA PERGUNTA</span><h2>Adicionar pergunta</h2><p>Preencha uma vez e ela já entra no banco da profissão escolhida.</p></div></div><div class="mayor-form-grid"><label>Profissão<select id="newJob">${current==='all'?'':`<option value="${escMayor(current)}" selected>Profissão filtrada</option>`}</select></label><label>Dificuldade<select id="newDiff"><option value="1">1 — Fácil</option><option value="2">2 — Médio</option><option value="3">3 — Difícil</option><option value="4">4 — Muito difícil</option><option value="5">5 — Avançado</option></select></label></div><label>Enunciado<input id="newText" maxlength="500" placeholder="Ex.: Qual é a principal função de um médico em Sorokiba?"></label><div class="mayor-options-editor"><span class="mayor-editor-label">Alternativas</span><label>A<input id="newOpt0" placeholder="Resposta A"></label><label>B<input id="newOpt1" placeholder="Resposta B"></label><label>C<input id="newOpt2" placeholder="Resposta C"></label><label>D<input id="newOpt3" placeholder="Resposta D"></label></div><label>Resposta correta<select id="newCorrect"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label><div class="mayor-form-actions"><button class="primary" onclick="addQuestionOrganized()">✓ Adicionar pergunta</button>${back}</div></div>`);
    api('/api/jobs').then(d=>{const sel=$('#newJob');if(!sel)return;sel.innerHTML=(d.jobs||[]).map(j=>`<option value="${escMayor(j.id)}" ${current===j.id?'selected':''}>${iconMayor(j.id)} ${escMayor(j.name)}</option>`).join('');});
  }

  async function addQuestionOrganized(){
    try{
      const jobId=$('#newJob').value,text=$('#newText').value.trim();
      const options=[$('#newOpt0').value,$('#newOpt1').value,$('#newOpt2').value,$('#newOpt3').value].map(x=>x.trim()).filter(Boolean);
      const correct=Number($('#newCorrect').value),difficulty=Number($('#newDiff').value)||1;
      if(!jobId||!text||options.length<2){toast('Preencha profissão, enunciado e pelo menos 2 alternativas.','error');return;}
      if(correct>=options.length){toast('A resposta correta precisa ser uma das alternativas preenchidas.','error');return;}
      const d=await post('/api/mayor/questions',{jobId,text,options,correct,difficulty});
      toast(d.message||'Pergunta adicionada!');
      manageQuestionsOrganized();
    }catch(e){toast(e.message,'error')}
  }

  function openMayorCommunication(){
    openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • COMUNICAÇÃO</span><h2>Comunicação oficial</h2><p>Publique informações que aparecerão para todos os cidadãos.</p></div></div><div class="mayor-choice-grid"><button onclick="mayorContent('news');"><span>📰</span><strong>Nova notícia</strong><small>Comunicado oficial da prefeitura.</small></button><button onclick="mayorContent('events');"><span>📅</span><strong>Novo evento</strong><small>Adicione um acontecimento à agenda.</small></button></div></div>`);
  }

  async function openMayorIndicators(){
    try{
      const d=await api('/api/mayor');
      openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • INDICADORES</span><h2>Indicadores administrativos</h2><p>Altere os números que representam o estado atual de Sorokiba.</p></div></div><div class="mayor-indicator-grid"><div><span>💰</span><strong>${money(d.treasury)}</strong><small>Tesouro atual</small></div><div><span>👥</span><strong>${d.population}</strong><small>População</small></div></div><div class="admin-form mayor-admin-form"><label>Impostos (%)<input id="tax" type="number" min="0" max="30" value="${d.taxRate}"></label><label>Economia<input id="economy" type="number" min="0" value="${d.economy}"></label><label>Infraestrutura<input id="infra" type="number" min="0" max="100" value="${d.infrastructure}"></label><label>Qualidade<input id="quality" type="number" min="0" max="100" value="${d.quality}"></label></div><button class="primary wide" onclick="saveMayorOrganized()">Salvar indicadores</button></div>`);
    }catch(e){toast(e.message,'error')}
  }

  async function saveMayorOrganized(){
    try{const d=await post('/api/mayor/settings',{tax:Number($('#tax').value),economy:Number($('#economy').value),infrastructure:Number($('#infra').value),quality:Number($('#quality').value)});toast(d.message||'Indicadores atualizados!');closeModal();loadPage('mayor');}catch(e){toast(e.message,'error')}
  }

  window.mayorPage=mayorPageOrganized;
  window.mayorSection=mayorSection;
  window.manageQuestionsOrganized=manageQuestionsOrganized;
  window.newQuestionForm=newQuestionForm;
  window.addQuestionOrganized=addQuestionOrganized;
  window.openMayorCommunication=openMayorCommunication;
  window.openMayorIndicators=openMayorIndicators;
  window.saveMayorOrganized=saveMayorOrganized;
})();
