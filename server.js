const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'server.js');
let s=fs.readFileSync(file,'utf8');
const old="if(answer===q.correct)req.user.xp=(req.user.xp||0)+Math.max(1,Math.floor((m.rewardXp||20)/m.questions.length));m.correctCount=(m.correctCount||0)+(answer===q.correct?1:0);const final=m.answers.filter(v=>v!==undefined).length>=m.questions.length;if(final){m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);req.user.money=(req.user.money||0)+(m.rewardMoney||0);saveData()}";
const neu="if(answer===q.correct)req.user.xp=(req.user.xp||0)+Math.max(1,Math.floor((m.rewardXp||20)/m.questions.length));m.correctCount=(m.correctCount||0)+(answer===q.correct?1:0);const final=m.answers.filter(v=>v!==undefined).length>=m.questions.length;if(final){m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);const correctRatio=m.questions.length?Math.max(0,Math.min(1,(m.correctCount||0)/m.questions.length)):0;const earnedMoney=Math.floor((m.rewardMoney||0)*correctRatio);const earnedXp=Math.floor((m.rewardXp||0)*correctRatio);req.user.money=(req.user.money||0)+earnedMoney;saveData()}";
if(!s.includes(old))throw new Error('Trecho da recompensa da missao nao encontrado');
s=s.replace(old,neu);
fs.writeFileSync(file,s);