const fs = require('fs');
const path = require('path');
const previousRead = fs.readFileSync;

const serverPatch = `
// Sorokiba friendships system
const ensureFriendshipState = user => {
  if (!user.friendships || typeof user.friendships !== 'object') user.friendships = {};
  if (!Array.isArray(user.friendships.friends)) user.friendships.friends = [];
  if (!Array.isArray(user.friendships.received)) user.friendships.received = [];
  if (!Array.isArray(user.friendships.sent)) user.friendships.sent = [];
  return user.friendships;
};
const publicFriend = u => ({name:u.name,username:u.username,jobName:u.jobName||'Estudante',level:Number(u.level||1),xp:Number(u.xp||0)});
app.get('/api/friends/search',(req,res)=>{const q=String(req.query.q||'').trim().replace(/^@/,'').toLowerCase();if(!q)return res.json({users:[]});const mine=ensureFriendshipState(req.user);const list=Object.values(users).filter(u=>u&&u.username!==req.username&&String(u.username).toLowerCase().includes(q)).slice(0,20).map(u=>{const other=ensureFriendshipState(u);let status='none';if(mine.friends.includes(u.username))status='friends';else if(mine.sent.includes(u.username))status='sent';else if(mine.received.includes(u.username))status='received';return {...publicFriend(u),status};});res.json({users:list});});
app.get('/api/friends',(req,res)=>{const s=ensureFriendshipState(req.user);const clean=a=>a.map(username=>users[username]).filter(Boolean).map(publicFriend);res.json({friends:clean(s.friends),received:clean(s.received),sent:clean(s.sent)});});
app.post('/api/friends/request',(req,res)=>{const targetUsername=String(req.body?.username||'').trim();if(!targetUsername)return res.status(400).json({error:'Informe o usuário.'});if(targetUsername===req.username)return res.status(400).json({error:'Você não pode adicionar a si mesmo.'});const target=users[targetUsername];if(!target)return res.status(404).json({error:'Usuário não encontrado.'});const mine=ensureFriendshipState(req.user),theirs=ensureFriendshipState(target);if(mine.friends.includes(targetUsername))return res.status(400).json({error:'Vocês já são amigos.'});if(mine.sent.includes(targetUsername))return res.status(400).json({error:'Solicitação já enviada.'});if(mine.received.includes(targetUsername))return res.status(400).json({error:'Este usuário já enviou uma solicitação para você.'});mine.sent.push(targetUsername);theirs.received.push(req.username);saveData();res.json({message:'Solicitação de amizade enviada!'});});
app.post('/api/friends/accept',(req,res)=>{const username=String(req.body?.username||'').trim();const target=users[username];if(!target)return res.status(404).json({error:'Usuário não encontrado.'});const mine=ensureFriendshipState(req.user),theirs=ensureFriendshipState(target);if(!mine.received.includes(username))return res.status(400).json({error:'Solicitação não encontrada.'});mine.received=mine.received.filter(x=>x!==username);theirs.sent=theirs.sent.filter(x=>x!==req.username);if(!mine.friends.includes(username))mine.friends.push(username);if(!theirs.friends.includes(req.username))theirs.friends.push(req.username);saveData();res.json({message:'Amizade aceita!'});});
app.post('/api/friends/reject',(req,res)=>{const username=String(req.body?.username||'').trim();const target=users[username];if(!target)return res.status(404).json({error:'Usuário não encontrado.'});const mine=ensureFriendshipState(req.user),theirs=ensureFriendshipState(target);mine.received=mine.received.filter(x=>x!==username);theirs.sent=theirs.sent.filter(x=>x!==req.username);saveData();res.json({message:'Solicitação recusada.'});});
app.post('/api/friends/cancel',(req,res)=>{const username=String(req.body?.username||'').trim();const target=users[username];if(!target)return res.status(404).json({error:'Usuário não encontrado.'});const mine=ensureFriendshipState(req.user),theirs=ensureFriendshipState(target);mine.sent=mine.sent.filter(x=>x!==username);theirs.received=theirs.received.filter(x=>x!==req.username);saveData();res.json({message:'Solicitação cancelada.'});});
app.post('/api/friends/remove',(req,res)=>{const username=String(req.body?.username||'').trim();const target=users[username];if(!target)return res.status(404).json({error:'Usuário não encontrado.'});const mine=ensureFriendshipState(req.user),theirs=ensureFriendshipState(target);mine.friends=mine.friends.filter(x=>x!==username);theirs.friends=theirs.friends.filter(x=>x!==req.username);saveData();res.json({message:'Amizade removida.'});});
`;

const uiPatch = `
/*__sorokibaFriendshipUI__*/
(function(){
  const wait=()=>{if(typeof window.api!=='function'||typeof window.nav!=='function')return setTimeout(wait,80);
    window.playersPage=async function(box){
      box.innerHTML='<div class="page-intro"><div><span class="eyebrow">SOCIAL</span><h1>Amizades</h1><p>Pesquise usuários, envie solicitações e gerencie suas amizades.</p></div></div><div class="panel"><div class="panel-title"><h3>🔎 Pesquisar usuário</h3></div><div style="display:flex;gap:10px"><input id="friendSearchInput" placeholder="@nome_do_usuario" autocomplete="off" style="flex:1"><button class="primary" id="friendSearchBtn">Pesquisar</button></div><div id="friendSearchResults" style="margin-top:14px"></div></div><div class="friend-tabs" style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0"><button class="primary" data-friend-tab="friends">🤝 Minhas amizades</button><button class="ghost" data-friend-tab="received">📥 Solicitações recebidas <span id="friendReceivedBadge"></span></button><button class="ghost" data-friend-tab="sent">📤 Solicitações enviadas <span id="friendSentBadge"></span></button></div><div id="friendList"></div>';
      const action=async(type,username)=>{try{const d=await api('/api/friends/'+type,{method:'POST',body:JSON.stringify({username})});toast(d.message);await refresh();}catch(e){toast(e.message,'error')}};
      window.friendAction=action;
      const card=(p,type)=>{let a='';if(type==='received')a='<button class="primary" onclick="friendAction(\\'accept\\',\\''+encodeURIComponent(p.username)+"\\')">✓ Aceitar</button> <button class="ghost" onclick="friendAction(\\'reject\\',\\''+encodeURIComponent(p.username)+"\\')">Recusar</button>";else if(type==='sent')a='<button class="ghost" onclick="friendAction(\\'cancel\\',\\''+encodeURIComponent(p.username)+"\\')">Cancelar</button>';else a='<button class="ghost" onclick="friendAction(\\'remove\\',\\''+encodeURIComponent(p.username)+"\\')">Remover</button>';return '<div class="player-card"><div class="avatar">'+esc(String(p.name||'?').charAt(0).toUpperCase())+'</div><div style="flex:1"><h3>'+esc(p.name)+'</h3><small>@'+esc(p.username)+'</small><p>'+esc(p.jobName||'Estudante')+' • Nível '+Number(p.level||1)+'</p></div><div>'+a+'</div></div>';};
      const show=type=>{const d=window.__friends||{friends:[],received:[],sent:[]},list=d[type]||[];document.querySelector('#friendList').innerHTML=list.length?'<div class="players-list">'+list.map(p=>card(p,type)).join('')+'</div>':'<div class="empty"><div>🤝</div><h3>Nenhum usuário aqui</h3><p>Quando houver movimentação, ela aparecerá nesta área.</p></div>';document.querySelectorAll('[data-friend-tab]').forEach(b=>{const on=b.dataset.friendTab===type;b.classList.toggle('primary',on);b.classList.toggle('ghost',!on)});};
      const refresh=async()=>{const d=await api('/api/friends');window.__friends=d;document.querySelector('#friendReceivedBadge').textContent=d.received.length?'('+d.received.length+')':'';document.querySelector('#friendSentBadge').textContent=d.sent.length?'('+d.sent.length+')':'';show('friends');};
      document.querySelectorAll('[data-friend-tab]').forEach(b=>b.onclick=()=>show(b.dataset.friendTab));
      document.querySelector('#friendSearchBtn').onclick=async()=>{const q=document.querySelector('#friendSearchInput').value.trim();if(!q)return toast('Digite um nome de usuário.','error');try{const d=await api('/api/friends/search?q='+encodeURIComponent(q));document.querySelector('#friendSearchResults').innerHTML=d.users.length?d.users.map(p=>'<div class="player-card"><div class="avatar">'+esc(String(p.name||'?').charAt(0).toUpperCase())+'</div><div style="flex:1"><h3>'+esc(p.name)+'</h3><small>@'+esc(p.username)+'</small><p>'+esc(p.jobName||'Estudante')+' • Nível '+Number(p.level||1)+'</p></div><div>'+({none:'<button class="primary" onclick="friendAction(\\'request\\',\\''+encodeURIComponent(p.username)+"\\')">+ Adicionar amigo</button>",sent:'<span class="tag">⏳ Solicitação enviada</span>',received:'<span class="tag">📥 Solicitação recebida</span>',friends:'<span class="tag">✓ Amigos</span>'}[p.status]||'')+'</div></div>').join(''):'<div class="empty"><div>🔎</div><h3>Nenhum usuário encontrado</h3><p>Confira o @usuário e tente novamente.</p></div>';}catch(e){toast(e.message,'error')}};
      document.querySelector('#friendSearchInput').onkeydown=e=>{if(e.key==='Enter')document.querySelector('#friendSearchBtn').click()};
      await refresh();
    };
    document.querySelectorAll('.nav-btn[data-page="players"]').forEach(b=>{const s=b.querySelector('span');if(s)s.textContent='Amizades';});
    document.querySelectorAll('.nav-btn[data-page="proposals"]').forEach(b=>b.remove());
  };wait();
})();
`;

fs.readFileSync = function(filePath, options) {
  const result = previousRead.call(fs, filePath, options);
  if (typeof filePath !== 'string' || typeof result !== 'string') return result;
  const base = path.basename(filePath);
  if (base === 'server.js' && !result.includes('__sorokibaFriendships')) {
    let source = result.replace("const defaultAchievements=", serverPatch + "\nconst __sorokibaFriendships=true;\nconst defaultAchievements=");
    source = source.replace(/app\.get\('\/api\/me',\(req,res\)=>res\.json\(\{user:\{name:req\.user\.name,username:req\.user\.username,money:req\.user\.money,level:req\.user\.level,xp:req\.user\.xp,jobName:req\.user\.jobName,life:req\.user\.life,hunger:req\.user\.hunger,hydration:req\.user\.hydration,energy:req\.user\.energy\},isMayor:req\.user\.isMayor\}\)\);/,"app.get('/api/me',(req,res)=>{if(!req.user.friendships)req.user.friendships={friends:[],received:[],sent:[]};res.json({user:{name:req.user.name,username:req.user.username,money:req.user.money,level:req.user.level,xp:req.user.xp,jobId:req.user.jobId,jobName:req.user.jobName,professionalXpByJob:req.user.professionalXpByJob||{},friendships:req.user.friendships,life:req.user.life,hunger:req.user.hunger,hydration:req.user.hydration,energy:req.user.energy},isMayor:req.user.isMayor})});");
    return source;
  }
  if (base === 'app.js' && !result.includes('__sorokibaFriendshipUI')) return result + '\n' + uiPatch;
  return result;
};
