(function(){
  const escLocal = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  window.proposalsPage = async function(box){
    const ps = await api('/api/proposals');
    const visible = isMayor ? ps : ps.filter(p => p.authorUsername === me.username);
    box.innerHTML = `<div class="page-intro"><div><span class="eyebrow">PARTICIPAÇÃO CÍVICA</span><h1>Propostas</h1><p>Envie ideias para a prefeitura e acompanhe o resultado.</p></div><button class="primary" onclick="proposalModal()">📝 Nova proposta</button></div><div class="proposals-list">${visible.length ? visible.map(p => { const status = p.status === 'approved' ? 'APROVADA' : p.status === 'rejected' ? 'REJEITADA' : 'PENDENTE'; const statusText = p.status === 'approved' ? 'Sua proposta foi aprovada pela prefeitura.' : p.status === 'rejected' ? 'Sua proposta foi rejeitada pela prefeitura.' : 'Aguardando avaliação do prefeito.'; return `<div class="proposal-card"><h3>${escLocal(p.title)}</h3><p>${escLocal(p.description)}</p><small>Por ${escLocal(p.author)} • Status: <b>${status}</b></small>${p.response ? `<p style="margin-top:10px"><b>Mensagem da prefeitura:</b> ${escLocal(p.response)}</p>` : ''}${p.status !== 'pending' ? `<p style="margin-top:8px"><b>${statusText}</b></p>` : ''}${isMayor && p.status === 'pending' ? `<button class="primary" onclick="decideProposal('${p.id}','${p.status}')">Decidir</button>` : ''}</div>`; }).join('') : '<div class="empty"><div>📭</div><h3>Nenhuma proposta encontrada</h3><p>Envie uma proposta ou aguarde uma avaliação.</p></div>'}</div>`;
  };
  window.finishDecision = async function(id,status){
    try{
      const response = ($('#decisionText')?.value || '').trim();
      if(!response){ toast('Escreva uma mensagem para a pessoa antes de concluir.','error'); return; }
      await post('/api/mayor/proposals/' + id + '/decide',{status,response});
      closeModal();
      toast(status === 'approved' ? 'Proposta aprovada e mensagem enviada!' : 'Proposta rejeitada e mensagem enviada!');
      loadPage('proposals');
    }catch(e){toast(e.message,'error')}
  };
})();
