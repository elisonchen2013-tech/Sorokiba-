const fs = require('fs');
const path = require('path');

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, options) {
  const result = originalReadFileSync.call(fs, filePath, options);
  if (typeof filePath !== 'string' || path.basename(filePath) !== 'server.js' || typeof result !== 'string' || result.includes('__sorokibaAccountXpFix')) return result;

  let patched = result.replace(
    'registerMissionUse(req.user);',
    'registerMissionUse(req.user);/*__sorokibaAccountXpFix*/req.user.xp=(req.user.xp||0)+earnedXp;'
  );

  // Read the latest reward configuration from PostgreSQL when a new mission is created.
  patched = patched.replace(
    'const createMission=(jobId,username)=>{const cfg=(city.missionRewards&&city.missionRewards[jobId])||{questionsPerMission:2,xpPerMission:50,moneyPerMission:50};',
    'const createMission=async(jobId,username)=>{const liveCity=(await db.get(\'city\'))||city;const cfg=(liveCity.missionRewards&&liveCity.missionRewards[jobId])||{questionsPerMission:2,xpPerMission:50,moneyPerMission:50};'
  );

  // The mission-start route must be async because createMission now reads PostgreSQL.
  patched = patched.replace(
    "app.post('/api/missions/start',(req,res)=>{",
    "app.post('/api/missions/start',async(req,res)=>{"
  );
  patched = patched.replace(
    'const mission=createMission(req.user.jobId,req.username);',
    'const mission=await createMission(req.user.jobId,req.username);'
  );

  const routes = String.raw`

// Persistent mayor controls and account deletion.
app.get('/api/mayor/rewards',async(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  const liveCity=(await db.get('city'))||city;
  if(!liveCity.missionRewards)liveCity.missionRewards={};
  jobs.forEach(j=>{if(!liveCity.missionRewards[j.id])liveCity.missionRewards[j.id]={moneyPerMission:Math.max(50,Math.floor(j.salary*.15)),xpPerMission:Math.max(20,Math.floor(j.salary*.08)),questionsPerMission:j.xpRequired>=1000?3:2};});
  city.missionRewards=liveCity.missionRewards;
  res.json({missionRewards:liveCity.missionRewards});
});

app.post('/api/mayor/rewards',async(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  const updates=req.body?.missionRewards;
  if(!updates||typeof updates!=='object'||Array.isArray(updates))return res.status(400).json({error:'Recompensas inválidas'});
  const liveCity=(await db.get('city'))||city;
  if(!liveCity.missionRewards)liveCity.missionRewards={};
  for(const job of jobs){
    const v=updates[job.id];
    if(!v)continue;
    const money=Number(v.moneyPerMission),xp=Number(v.xpPerMission),questions=Number(v.questionsPerMission);
    if(!Number.isFinite(money)||money<0||!Number.isFinite(xp)||xp<0||!Number.isInteger(questions)||questions<1||questions>20)return res.status(400).json({error:'Valores de recompensa inválidos.'});
    liveCity.missionRewards[job.id]={moneyPerMission:Math.floor(money),xpPerMission:Math.floor(xp),questionsPerMission:questions};
  }
  city.missionRewards=liveCity.missionRewards;
  await db.set('city',liveCity);
  res.json({ok:true,message:'Recompensas salvas no PostgreSQL com sucesso!',missionRewards:liveCity.missionRewards});
});

app.get('/api/mayor/users',(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  res.json({users:Object.values(users).map(u=>({username:u.username,name:u.name,jobName:u.jobName||'Estudante',level:Number(u.level||1),isMayor:!!u.isMayor}))});
});

app.delete('/api/mayor/users/:username',(req,res)=>{
  if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});
  const username=decodeURIComponent(req.params.username||'');
  if(!username)return res.status(400).json({error:'Conta inválida'});
  if(username===req.user.username)return res.status(400).json({error:'Para excluir sua própria conta, use a opção da sua conta.'});
  const target=users[username];
  if(!target)return res.status(404).json({error:'Conta não encontrada'});
  if(target.isMayor)return res.status(400).json({error:'A conta do prefeito não pode ser excluída pelo painel.'});
  const counted=!!target.countedInPopulation;
  delete users[username];
  if(counted)city.population=Math.max(0,Number(city.population||0)-1);
  if(Array.isArray(city.proposals))city.proposals=city.proposals.filter(p=>p.authorUsername!==username);
  saveData();
  res.json({ok:true,message:'Conta excluída permanentemente.'});
});

app.delete('/api/me/account',async(req,res)=>{
  const password=String(req.body?.password??'');
  if(!password)return res.status(400).json({error:'Digite sua senha atual para excluir a conta.'});
  if(password!==String(req.user.password??''))return res.status(401).json({error:'Senha incorreta. A conta não foi excluída.'});
  const username=req.user.username;
  const wasMayor=!!req.user.isMayor;
  const counted=!!req.user.countedInPopulation;
  delete users[username];
  if(counted)city.population=Math.max(0,Number(city.population||0)-1);
  if(Array.isArray(city.proposals))city.proposals=city.proposals.filter(p=>p.authorUsername!==username);
  if(wasMayor){
    const remaining=Object.values(users);
    remaining.forEach(u=>u.isMayor=false);
    if(remaining.length)remaining.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))[0].isMayor=true;
  }
  await db.set('users',users);
  await db.set('city',city);
  res.json({ok:true,message:'Sua conta foi excluída permanentemente de Sorokiba.'});
});
`;

  const marker="app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));";
  if(!patched.includes("app.delete('/api/me/account'")){
    if(!patched.includes(marker)) throw new Error('Ponto de inserção não encontrado');
    patched=patched.replace(marker,routes+'\n'+marker);
  }
  return patched;
};
