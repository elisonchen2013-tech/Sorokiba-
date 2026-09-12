(() => {
  const renderAccountDelete=()=>{
    const box=document.getElementById('content');
    if(!box||typeof me==='undefined'||!me)return;
    const old=document.getElementById('accountDeletePanel'); if(old)old.remove();
    const panel=document.createElement('section'); panel.id='accountDeletePanel'; panel.className='panel'; panel.style.marginTop='24px';
    panel.innerHTML='<div class="panel-title"><h3>⚠️ Zona de perigo</h3></div><p>Excluir sua conta é permanente e não pode ser desfeito.</p><form id="deleteAccountForm" style="margin-top:16px"><label>Digite sua senha atual<input name="password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit" style="background:#b42318">Excluir minha conta permanentemente</button></form>';
    box.appendChild(panel);
    document.getElementById('deleteAccountForm').onsubmit=async e=>{
      e.preventDefault(); const password=new FormData(e.target).get('password'); if(!password)return;
      if(!confirm('Tem certeza? Sua conta será apagada permanentemente de Sorokiba.'))return;
      try{const result=await api('/api/me/account',{method:'DELETE',body:JSON.stringify({password})});localStorage.removeItem('sorokiba_token');token=null;alert(result.message||'Conta excluída.');location.reload();}
      catch(err){if(typeof toast==='function')toast(err.message,'error');else alert(err.message);}
    };
  };
  const original=window.accountPage; if(typeof original!=='function')return;
  window.accountPage=async function(box){await original(box);renderAccountDelete();};
})();
