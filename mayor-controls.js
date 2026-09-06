/* Controles extras da Prefeitura: recompensas e contas. */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const icon=id=>({estudante:'🎓',entregador:'📦',mecanico:'🔧',professor:'📚',policial:'🛡️',investigador:'🔎',advogado:'⚖️',engenheiro:'🏗️',medico:'⚕️',juiz:'👨‍⚖️'}[id]||'💼');
  window.manageRewards=async function(){
    try{
      const [r,j]=await Promise.all([api('/api/mayor/rewards'),api('/api/jobs')]);
      const rewards=r.missionRewards||{};
      openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • MISSÕES</span><h2>Recompensas das missões</h2><p>Defina quanto cada profissão recebe em dinheiro e XP ao concluir uma missão.</p></div></div><div class="mayor-reward-list">${(j.jobs||[]).map(job=>{const x=rewards[job.id]||{moneyPerMission:50,xpPerMission:20,questionsPerMission:2};return `<div class="mayor-reward-card"><div class="mayor-reward-title"><span>${icon(job.id)}</span><div><strong>${esc(job.name)}</strong><small>${esc(job.task||'Missões desta profissão')}</small></div></div><div class="mayor-reward-fields"><label>💰 Dinheiro<input class="reward-money" data-job="${esc(job.id)}" type="number" min="0" value="${Number(x.moneyPerMission||0)}"></label><label>⭐ XP<input class="reward-xp" data-job="${esc(job.id)}" type="number" min="0" value="${Number(x.xpPerMission||0)}"></label><label>❓ Perguntas<input class="reward-questions" data-job="${esc(job.id)}" type="number" min="1" max="10" value="${Number(x.questionsPerMission||2)}"></label></div></div>`}).join('')}</div><button class="primary wide" onclick="saveMissionRewards()">💾 Salvar recompensas</button></div>`);
    }catch(e){toast(e.message,'error')}
  };
  window.saveMissionRewards=async function(){
    try{
      const missionRewards={};
      document.querySelectorAll('.reward-money').forEach(input=>{const id=input.dataset.job;missionRewards[id]={moneyPerMission:Number(input.value)||0,xpPerMission:Number(document.querySelector(`.reward-xp[data-job="${CSS.escape(id)}"]`)?.value)||0,questionsPerMission:Number(document.querySelector(`.reward-questions[data-job="${CSS.escape(id)}"]`)?.value)||1};});
      const d=await post('/api/mayor/rewards',{missionRewards});toast(d.message||'Recompensas salvas!');closeModal();loadPage('mayor');
    }catch(e){toast(e.message,'error')}
  };
  window.manageAccounts=async function(){
    try{
      const d=await api('/api/mayor/users');
      openModal(`<div class="mayor-modal"><div class="mayor-modal-head"><div><span class="eyebrow">PREFEITURA • ADMINISTRAÇÃO</span><h2>Contas dos cidadãos</h2><p>Gerencie as contas cadastradas. A conta do prefeito fica protegida.</p></div></div><div class="mayor-account-list">${(d.users||[]).length?(d.users||[]).map(u=>`<div class="mayor-account-card"><div><strong>${esc(u.name)}</strong><small>@${esc(u.username)} • ${esc(u.jobName||'Estudante')} • Nível ${Number(u.level||1)}</small></div><button class="ghost mayor-delete-btn" onclick="deleteMayorAccount('${encodeURIComponent(u.username)}','${esc(u.name)}')">🗑️ Excluir</button></div>`).join(''):'<div class="empty"><div>👥</div><h3>Nenhuma conta para administrar</h3></div>'}</div></div>`);
    }catch(e){toast(e.message,'error')}
  };
  window.deleteMayorAccount=async function(username,name){
    if(!confirm(`Tem certeza que deseja excluir a conta de ${name}? Esta ação não pode ser desfeita.`))return;
    try{const d=await api(`/api/mayor/users/${username}`,{method:'DELETE'});toast(d.message||'Conta excluída!');manageAccounts();}catch(e){toast(e.message,'error')}
  };
  window.mayorSection=(function(original){return function(type){if(type==='rewards')return manageRewards();if(type==='accounts')return manageAccounts();return original(type);};})(window.mayorSection);
  const oldMayorPage=window.mayorPage;
  if(oldMayorPage){window.mayorPage=async function(box){await oldMayorPage(box);if(!isMayor)return;const quick=box.querySelector('.mayor-quick-grid');if(quick&&!quick.querySelector('[data-accounts]')){const b=document.createElement('button');b.setAttribute('data-accounts','1');b.onclick=()=>manageAccounts();b.innerHTML='👥<strong>Gerenciar contas</strong><small>Veja e exclua contas de cidadãos.</small>';quick.appendChild(b);}};}
})();
