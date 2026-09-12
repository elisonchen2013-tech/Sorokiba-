const fs = require('fs');
const path = require('path');

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, options) {
  const result = originalReadFileSync.call(fs, filePath, options);
  if (typeof filePath !== 'string' || path.basename(filePath) !== 'server.js' || typeof result !== 'string') return result;

  let patched = result;

  // New missions must read the current reward configuration from PostgreSQL.
  const oldCreate = "const createMission=(jobId,username)=>{const cfg=(city.missionRewards&&city.missionRewards[jobId])||{questionsPerMission:2,xpPerMission:50,moneyPerMission:50};";
  const newCreate = "const createMission=async(jobId,username)=>{const liveCity=(await db.get('city'))||city;const cfg=(liveCity.missionRewards&&liveCity.missionRewards[jobId])||{questionsPerMission:2,xpPerMission:50,moneyPerMission:50};";
  patched = patched.replace(oldCreate, newCreate);
  patched = patched.replace("app.post('/api/missions/start',(req,res)=>{", "app.post('/api/missions/start',async(req,res)=>{");
  patched = patched.replace('const mission=createMission(req.user.jobId,req.username);', 'const mission=await createMission(req.user.jobId,req.username);');

  // Replace the ORIGINAL reward endpoints, because Express uses the first matching route.
  // The previous fix appended routes after these endpoints, so the old in-memory route won.
  const rewardStart = patched.indexOf("app.get('/api/mayor/rewards'");
  const newsStart = rewardStart >= 0 ? patched.indexOf("app.post('/api/mayor/news'", rewardStart) : -1;
  if (rewardStart >= 0 && newsStart > rewardStart) {
    const rewardRoutes = `app.get('/api/mayor/rewards',async(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const liveCity=(await db.get('city'))||city;if(!liveCity.missionRewards)liveCity.missionRewards={};jobs.forEach(j=>{if(!liveCity.missionRewards[j.id])liveCity.missionRewards[j.id]={moneyPerMission:Math.max(50,Math.floor(j.salary*.15)),xpPerMission:Math.max(20,Math.floor(j.salary*.08)),questionsPerMission:j.xpRequired>=1000?3:2};});city.missionRewards=liveCity.missionRewards;res.json({missionRewards:liveCity.missionRewards})});\napp.post('/api/mayor/rewards',async(req,res)=>{if(!req.user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode acessar'});const payload=req.body||{};const updates=payload.missionRewards&&typeof payload.missionRewards==='object'?payload.missionRewards:{[payload.jobId]:payload};const liveCity=(await db.get('city'))||city;if(!liveCity.missionRewards)liveCity.missionRewards={};for(const [jobId,value] of Object.entries(updates)){if(!jobs.some(j=>j.id===jobId))continue;const money=Number(value.moneyPerMission),xp=Number(value.xpPerMission),questions=Number(value.questionsPerMission);if(!Number.isFinite(money)||money<0||!Number.isFinite(xp)||xp<0||!Number.isInteger(questions)||questions<1||questions>20)return res.status(400).json({error:'Valores de recompensa inválidos.'});liveCity.missionRewards[jobId]={moneyPerMission:Math.floor(money),xpPerMission:Math.floor(xp),questionsPerMission:questions};}city.missionRewards=liveCity.missionRewards;await db.set('city',liveCity);res.json({message:'Recompensas atualizadas e salvas no PostgreSQL!',missionRewards:liveCity.missionRewards})});\n\n`;
    patched = patched.slice(0, rewardStart) + rewardRoutes + patched.slice(newsStart);
  }

  return patched;
};
