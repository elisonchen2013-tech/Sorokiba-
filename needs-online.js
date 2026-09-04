const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let source = fs.readFileSync(serverPath, 'utf8');

const oldInterval = "setInterval(()=>{Object.values(users).forEach(user=>{if(user.hunger>0)user.hunger-=1;if(user.hydration>0)user.hydration-=1;if(user.energy>0)user.energy-=1;if(user.life>0&&user.hunger<20)user.life-=2});saveData()},30000);";

const onlineRoutes = `app.post('/api/me/activity',(req,res)=>{\n  const activeSeconds=Math.max(0,Math.min(30,Number(req.body?.activeSeconds)||0));\n  req.user.lastActiveAt=Date.now();\n  req.user.activeNeedSeconds=Math.max(0,Number(req.user.activeNeedSeconds)||0)+activeSeconds;\n  const minutes=Math.floor(req.user.activeNeedSeconds/60);\n  if(minutes>0){\n    req.user.activeNeedSeconds-=minutes*60;\n    if(req.user.hunger>0)req.user.hunger=Math.max(0,req.user.hunger-minutes);\n    if(req.user.hydration>0)req.user.hydration=Math.max(0,req.user.hydration-minutes);\n    if(req.user.energy>0)req.user.energy=Math.max(0,req.user.energy-minutes);\n    if(req.user.life>0&&req.user.hunger<20)req.user.life=Math.max(0,req.user.life-(minutes*2));\n  }\n  saveData();\n  res.json({hunger:req.user.hunger,hydration:req.user.hydration,energy:req.user.energy,life:req.user.life});\n});\n\napp.post('/api/me/offline',(req,res)=>{\n  req.user.lastActiveAt=0;\n  saveData();\n  res.json({ok:true});\n});\n\n`;

if (!source.includes("app.post('/api/me/activity'")) {
  if (!source.includes(oldInterval)) {
    console.error('Não foi possível localizar o intervalo de necessidades no server.js');
    process.exit(1);
  }
  source = source.replace(oldInterval, onlineRoutes + "setInterval(()=>{Object.values(users).forEach(user=>{if(user.lastActiveAt && Date.now()-user.lastActiveAt<=15000){if(user.hunger>0)user.hunger-=1;if(user.hydration>0)user.hydration-=1;if(user.energy>0)user.energy-=1;if(user.life>0&&user.hunger<20)user.life=Math.max(0,user.life-2)}});saveData()},30000);");
  fs.writeFileSync(serverPath, source, 'utf8');
}

require(serverPath);
