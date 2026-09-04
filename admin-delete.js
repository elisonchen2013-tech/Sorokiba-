(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const token=()=>localStorage.getItem('sorokiba_token')||'';
  async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erro');return d}
  async function showPanel(){
    const title=$('#pageTitle');
    const content=$('#content');
    if(!title||title.textContent.trim()!=='Prefeitura'||!content||$('#accountDeletePanel'))return;
    try{
      const d=await api('/api/mayor/users');
      const panel=document.createElement('section');panel.id='accountDeletePanel';panel.className='panel';
      panel.innerHTML=`<div class="panel-title"><h3>👥 Gerenciar contas</h3></div><p>Exclua uma conta de cidadão. O prefeito não pode excluir a própria conta.</p><div id="accountDeleteList"></div>`;
      content.appendChild(panel);
      const list=panel.querySelector('#accountDeleteList');
      list.innerHTML=d.users.length?d.users.map(u=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)"><div><b>${esc(u.name)}</b><br><small>@${esc(u.username)} • ${esc(u.jobName||'Estudante')}</small></div><button class="primary" style="background:#b42318" onclick="window.sorokibaDeleteAccount('${encodeURIComponent(u.username)}','${esc(u.name)}')">Excluir conta</button></div>`).join(''):'<p>Nenhuma outra conta encontrada.</p>';
    }catch(e){console.error('Gerenciar contas:',e)}
  }
  function render(){
    if(document.body.dataset.sorokibaDeleteLoaded)return;
    document.body.dataset.sorokibaDeleteLoaded='1';
    showPanel();
    setInterval(showPanel,500);
  }
  window.sorokibaDeleteAccount=async(encoded,name)=>{
    const username=decodeURIComponent(encoded);
    if(!confirm(`Tem certeza que deseja excluir a conta de ${name}? Esta ação não pode ser desfeita.`))return;
    try{const d=await api(`/api/mayor/users/${encodeURIComponent(username)}`,{method:'DELETE'});alert(d.message||'Conta excluída.');const list=document.querySelector('#accountDeleteList');if(list)list.parentElement.innerHTML='<p>Atualizando contas...</p>';await showPanel()}catch(e){alert(e.message)}
  };
  render();
})();
