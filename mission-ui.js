/* Interface de missões — visual Sorokiba, sem exibir dificuldade e com feedback claro. */
(function(){
  const escMission = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const $m = s => document.querySelector(s);
  const $$m = s => [...document.querySelectorAll(s)];

  function missionTime(mission){
    return Math.max(0, Math.floor(new Date(mission.started_at).getTime() + Number(mission.duration_seconds||0)*1000 - Date.now()));
  }
  function formatTime(ms){
    const sec=Math.floor(ms/1000);
    return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
  }
  function stopMissionTimer(){
    if(window.__sorokibaMissionTimer) clearInterval(window.__sorokibaMissionTimer);
    window.__sorokibaMissionTimer=null;
  }
  function updateMissionTimer(){
    const state=window.missionModalState;
    const el=$m('#missionTimer');
    if(!state||!el)return;
    const left=missionTime(state.mission);
    el.textContent=formatTime(left);
    if(left<=0){
      stopMissionTimer();
      $$('.mission-answer-btn').forEach(b=>b.disabled=true);
      post(`/api/missions/${state.mission.id}/complete`,{}).then(()=>{
        toast('O tempo da missão acabou.','error');
        closeMissionModal();
        loadPage('missions');
      }).catch(()=>{});
    }
  }

  function renderMissionQuestion(){
    const state=window.missionModalState;
    if(!state)return;
    const mission=state.mission;
    const index=state.currentIndex;
    const questions=mission.questions||[];
    const q=questions[index]||{text:'Pergunta indisponível',options:[]};
    const letters=['A','B','C','D','E','F'];
    const options=(q.options||[]).map((opt,i)=>`
      <button class="mission-answer-btn" data-index="${i}" onclick="answerMission('${escMission(mission.id)}',${i})">
        <span class="mission-answer-letter">${letters[i]||String(i+1)}</span>
        <span class="mission-answer-text">${escMission(opt)}</span>
      </button>`).join('');

    openModal(`<div class="mission-modern">
      <div class="mission-modern-head">
        <div><span class="eyebrow">MISSÃO • ${escMission(me?.jobName||'TRABALHO')}</span><h2>Resolva o desafio</h2></div>
        <div class="mission-progress-pill">${index+1} / ${questions.length}</div>
      </div>
      <div class="mission-question-box"><span class="mission-question-label">PERGUNTA</span><h3>${escMission(q.text)}</h3></div>
      <div class="mission-modern-options">${options}</div>
      <div class="mission-modern-footer"><span>⏱️ Tempo restante</span><strong id="missionTimer">${formatTime(missionTime(mission))}</strong></div>
    </div>`);

    stopMissionTimer();
    window.__sorokibaMissionTimer=setInterval(updateMissionTimer,250);
    updateMissionTimer();
  }

  window.showMissionModal=function(mission){
    stopMissionTimer();
    window.missionModalState={mission,currentIndex:0,endAt:new Date(mission.started_at).getTime()+Number(mission.duration_seconds||0)*1000,timerId:null};
    renderMissionQuestion();
  };

  window.closeMissionModal=function(){
    stopMissionTimer();
    window.missionModalState=null;
    closeModal();
  };

  window.answerMission=async function(id,index){
    const state=window.missionModalState;
    if(!state||String(state.mission.id)!==String(id))return toast('Missão inválida.','error');
    const buttons=$$('.mission-answer-btn');
    if(buttons.some(b=>b.disabled))return;
    buttons.forEach(b=>b.disabled=true);
    try{
      const questionIndex=state.currentIndex;
      const d=await post(`/api/missions/${id}/answer`,{answer:index,questionIndex});
      if(d.user){me=d.user;updateHUD();}

      if(!d.correct){
        const correctText=d.correctOptionText||'Resposta não informada';
        const correctIndex=Number.isFinite(Number(d.correctIndex))?Number(d.correctIndex):-1;
        buttons.forEach(b=>{
          const n=Number(b.dataset.index);
          if(n===index)b.classList.add('mission-wrong');
          if(n===correctIndex)b.classList.add('mission-correct');
        });
        openModal(`<div class="mission-feedback wrong">
          <div class="mission-feedback-icon">✕</div>
          <span class="eyebrow">RESPOSTA INCORRETA</span>
          <h2>Quase!</h2>
          <p>${escMission(d.message||'Essa não era a resposta correta.')}</p>
          <div class="mission-correct-answer"><small>RESPOSTA CERTA</small><strong>${escMission(correctText)}</strong></div>
          <button class="primary wide" onclick="window.__missionFeedbackNext && window.__missionFeedbackNext()">Continuar →</button>
        </div>`);
        await new Promise(resolve=>{window.__missionFeedbackNext=()=>{window.__missionFeedbackNext=null;resolve();};});
        closeModal();
      }else{
        toast(d.message||'Resposta correta!');
      }

      if(d.final){
        stopMissionTimer();
        window.missionModalState=null;
        openModal(`<div class="mission-feedback success">
          <div class="mission-feedback-icon">✓</div>
          <span class="eyebrow">MISSÃO CONCLUÍDA</span>
          <h2>Bom trabalho!</h2>
          <p>${escMission(d.message||'Você concluiu a missão.')}</p>
          <div class="mission-rewards"><div><small>XP</small><strong>+${Number(d.xpGiven||0)}</strong></div><div><small>DINHEIRO</small><strong>${money(d.moneyGiven||0)}</strong></div></div>
          <button class="primary wide" onclick="closeModal();loadPage('missions')">Continuar</button>
        </div>`);
        return;
      }

      state.currentIndex+=1;
      renderMissionQuestion();
    }catch(e){
      buttons.forEach(b=>b.disabled=false);
      toast(e.message,'error');
    }
  };

  // Remove qualquer etiqueta antiga de dificuldade que venha de uma versão anterior da interface.
  function hideOldDifficulty(){
    $$('.mission-modal, .mission-modern').forEach(root=>{
      root.querySelectorAll('*').forEach(el=>{
        if(el.children.length===0 && /dificuldade\s*\d+\s*\/\s*\d+/i.test(el.textContent||'')) el.style.display='none';
      });
    });
  }
  new MutationObserver(hideOldDifficulty).observe(document.body,{subtree:true,childList:true});
})();
