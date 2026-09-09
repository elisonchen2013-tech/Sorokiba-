(function(){
  const escLocal = s => String(s ?? '').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&bsol;','\"':'&quot;',"'":'&#039;'}[m]));
  window.updateCooldownTimer = function(){const el=$('#cooldownTimer');if(!el)return;const end=new Date(missionCooldownUntil).getTime();const msLeft=Number.isFinite(end)?Math.max(0,end-Date.now()):0;const minLeft=Math.floor(msLeft/60000);const secLeft=Math.floor((msLeft%60000)/1000);el.textContent=`${minLeft}:${String(secLeft).padStart(2,'0')}`;if(msLeft<=0){clearInterval(timer);missionCooldownUntil=null;loadPage('missions');}};
  window.proposalsPage = async function(box){try{const ps=await api('/api/proposals');const visible=isMayor?ps.filter(p=>p.status==='pending'):ps.filter(p=>p.authorUsername===me.username||p.author===me.name);box.innerHTML=`<div class="page-intro"><div><span class="eyebrow">PARTICIPAÇÃO CÍVICA</span><h1>Propostas</h1><p>${isMayor?'Avalie as propostas enviadas pelos cidadãos.':'Envie ideias para a prefeitura e acompanhe o resultado das suas propostas.'}</p></div>${!isMayor?'<button class="primary" onclick="proposalModal()">📝 Nova proposta</button>':''}</div><div class="proposals-list">${visible.length?visible.map(p=>{const approved=p.status==='approved',rejected=p.status==='rejected',status=approved?'APROVADA':rejected?'REJEITADA':'PENDENTE',statusText=approved?'Sua proposta foi aprovada pela prefeitura.':rejected?'Sua proposta foi rejeitada pela prefeitura.':'Aguardando avaliação do prefeito.';return `<div class="proposal-card"><h3>${escLocal(p.title)}</h3><p>${escLocal(p.description)}</p><small>${isMayor?`Por ${escLocal(p.author)}`:'Sua proposta'} • Status: <b>${status}</b></small>${isMayor&&p.status==='pending'?`<div style="margin-top:12px"><button class="primary" onclick="decideProposal('${p.id}','approved')">✓ Aprovar proposta</button><button class="ghost" onclick="decideProposal('${p.id}','rejected')">✗ Rejeitar proposta</button></div>`:''}${!isMayor&&p.status!=='pending'?`<div style="margin-top:14px;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,.12)"><strong>${statusText}</strong>${p.response?`<p style="margin:8px 0 0"><b>Mensagem da prefeitura:</b> ${escLocal(p.response)}</p>`:''}</div>`:''}${!isMayor&&p.status==='pending'?`<p style="margin-top:10px">⏳ ${statusText}</p>`:''}</div>`;}).join(''):`<div class="empty"><div>${isMayor?'📭':'📨'}</div><h3>${isMayor?'Nenhuma proposta pendente':'Você ainda não enviou propostas'}</h3><p>${isMayor?'As propostas já avaliadas saem automaticamente desta área.':'Envie uma proposta e acompanhe a resposta das suas propostas aqui.'}</p></div>`}</div>`;}catch(e){toast(e.message,'error')}};
  window.finishDecision=async function(id,status){try{const response=($('#decisionText')?.value||'').trim();if(!response){toast('Escreva uma mensagem para a pessoa antes de concluir.','error');return;}await post('/api/mayor/proposals/'+id+'/decide',{status,response});closeModal();toast(status==='approved'?'Proposta aprovada e resultado enviado ao cidadão!':'Proposta rejeitada e resultado enviado ao cidadão!');loadPage('proposals');}catch(e){toast(e.message,'error')}};
  document.write('<link rel="stylesheet" href="mayor-panel.css"><script src="mayor-panel.js"><\\/script><script src="mission-ui.js"><\\/script>');
  const loadScript=(src,key)=>new Promise(resolve=>{if(document.querySelector('script['+key+']'))return resolve();const s=document.createElement('script');s.src=src;s.setAttribute(key,'1');s.onload=()=>resolve();s.onerror=()=>resolve();document.body.appendChild(s);});
  const loadKiba=async()=>{
    if(window.__kibaLoaderStarted)return;
    window.__kibaLoaderStarted=true;
    await loadScript('home-carousel-v2.js?v=20260909','data-soro-carousel-loader');
    await loadScript('kiba-assistant.js?v=10','data-kiba-loader');
    await loadScript('kiba-ai-client.js?v=4','data-kiba-ai-loader');
    await loadScript('kiba-visual-polish.js?v=5','data-kiba-visual-loader');
    await loadScript('kiba-visual-v10.js?v=13','data-kiba-arrival-loader');
    await loadScript('kiba-intro-v12.js?v=3','data-kiba-intro-loader');
    await loadScript('kiba-tail-random.js?v=3','data-kiba-tail-loader');
    await loadScript('kiba-knowledge-client.js?v=3','data-kiba-knowledge-loader');
    await loadScript('kiba-visual-v13.js?v=3','data-kiba-visual-v13-loader');
    await loadScript('kiba-visual-v15.js?v=15','data-kiba-visual-v15-loader');
    await loadScript('kiba-presentation-v6.js?v=6','data-kiba-presentation-v6-loader');
    await loadScript('mayor-kiba-memory-fix.js?v=1','data-mayor-kiba-memory-fix-loader');
    window.__kibaReady=true;
  };
  window.__sorokibaLoadKiba=loadKiba;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadKiba,{once:true});else setTimeout(loadKiba,0);
})();