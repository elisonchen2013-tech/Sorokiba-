// Correções de progressão das missões — carregado junto do activity-hook.js.
// Mantém a infraestrutura atual e altera somente a lógica de XP profissional.
const Module = require('module');
const fs = require('fs');
const previousLoader = Module._extensions['.js'];

const ensureProfessionalXp = `
if (!Array.isArray(user.answerHistory)) user.answerHistory = [];
if (!user.professionalXpByJob || typeof user.professionalXpByJob !== 'object') user.professionalXpByJob = {};
if (!Number.isFinite(Number(user.professionalXpByJob.estudante))) user.professionalXpByJob.estudante = 0;
`;

Module._extensions['.js'] = function(module, filename) {
  if (!filename.endsWith('/server.js')) return previousLoader(module, filename);

  let source = fs.readFileSync(filename, 'utf8');

  // Novas contas já começam com XP profissional separado por profissão.
  source = source.replace(
    "missions:[],achievements:[],isMayor,transactions:[],answeredQuestions:[],missionStarts:[]",
    "missions:[],achievements:[],isMayor,transactions:[],answeredQuestions:[],answerHistory:[],professionalXpByJob:{estudante:0},missionStarts:[]"
  );

  // Contas antigas recebem a estrutura automaticamente sem perder XP existente.
  source = source.replace(
    "const findQuestionById=qid=>",
    `const normalizeProfessionalXp=user=>{if(!user||typeof user!=='object')return;if(!user.professionalXpByJob||typeof user.professionalXpByJob!=='object')user.professionalXpByJob={};if(!Number.isFinite(Number(user.professionalXpByJob.estudante)))user.professionalXpByJob.estudante=0;if(user.jobId&&!Number.isFinite(Number(user.professionalXpByJob[user.jobId])))user.professionalXpByJob[user.jobId]=0;if(!Array.isArray(user.answerHistory))user.answerHistory=[];};Object.values(users).forEach(normalizeProfessionalXp);\nconst findQuestionById=qid=>`
  );

  // Ao iniciar uma missão, garante a estrutura do XP profissional do trabalho atual.
  source = source.replace(
    "const createMission=(jobId,username)=>{",
    "const createMission=(jobId,username)=>{if(users[username]){if(!users[username].professionalXpByJob||typeof users[username].professionalXpByJob!=='object')users[username].professionalXpByJob={};if(!Number.isFinite(Number(users[username].professionalXpByJob[jobId])))users[username].professionalXpByJob[jobId]=0;if(!Array.isArray(users[username].answerHistory))users[username].answerHistory=[];}"
  );

  // Guarda as últimas perguntas respondidas. Isso evita repetir imediatamente,
  // mas não bloqueia perguntas antigas para sempre.
  source = source.replace(
    "const answered=(users[username]&&users[username].answeredQuestions)||[];const questionUsage=",
    "const answered=(users[username]&&users[username].answeredQuestions)||[];const recentAnswered=(users[username]&&users[username].answerHistory)||[];const questionUsage="
  );
  source = source.replace(
    "let pool=jobQuestions.filter(q=>Number(questionUsage[q.id]||0)<2&&!answered.includes(q.id));",
    "let pool=jobQuestions.filter(q=>Number(questionUsage[q.id]||0)<2&&!recentAnswered.includes(q.id)&&!answered.includes(q.id));if(pool.length<(cfg.questionsPerMission||2))pool=jobQuestions.filter(q=>Number(questionUsage[q.id]||0)<2&&!recentAnswered.includes(q.id));"
  );
  source = source.replace(
    "chosen.forEach(q=>{users[username].questionUsage[q.id]=Number(users[username].questionUsage[q.id]||0)+1})",
    "chosen.forEach(q=>{users[username].questionUsage[q.id]=Number(users[username].questionUsage[q.id]||0)+1;users[username].answerHistory.push(q.id)});users[username].answerHistory=users[username].answerHistory.slice(-8)"
  );

  // No fim da missão, o XP profissional cresce somente no trabalho atual.
  // O activity-hook continua cuidando do XP geral da conta.
  source = source.replace(
    "m.status='completed';m.createdAt=new Date();registerMissionUse(req.user);",
    "m.status='completed';m.createdAt=new Date();if(!req.user.professionalXpByJob||typeof req.user.professionalXpByJob!=='object')req.user.professionalXpByJob={};const professionalJobId=req.user.jobId||m.jobId;if(!Number.isFinite(Number(req.user.professionalXpByJob[professionalJobId])))req.user.professionalXpByJob[professionalJobId]=0;req.user.professionalXpByJob[professionalJobId]+=earnedXp;registerMissionUse(req.user);"
  );

  // Expõe o XP profissional atual para a interface sem alterar o XP da conta.
  source = source.replace(
    "app.get('/api/jobs',(req,res)=>res.json({jobs,currentJob:req.user.jobId,xp:req.user.xp}));",
    "app.get('/api/jobs',(req,res)=>res.json({jobs,currentJob:req.user.jobId,xp:req.user.xp,professionalXpByJob:req.user.professionalXpByJob||{},professionalXp:Number((req.user.professionalXpByJob||{})[req.user.jobId]||0)}));"
  );

  return module._compile(source, filename);
};
