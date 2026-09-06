// Migração leve para contas criadas antes do XP profissional.
// Garante que os campos usados pelas missões existam antes de o servidor criar uma missão.
const db = require('./db');
const originalGet = db.get.bind(db);

db.get = async function(key) {
  const value = await originalGet(key);
  if (key === 'users' && value && typeof value === 'object') {
    for (const user of Object.values(value)) {
      if (!user || typeof user !== 'object') continue;
      if (!Array.isArray(user.answerHistory)) user.answerHistory = [];
      if (!user.professionalXpByJob || typeof user.professionalXpByJob !== 'object') user.professionalXpByJob = {};
      if (!Number.isFinite(Number(user.professionalXpByJob.estudante))) user.professionalXpByJob.estudante = 0;
      if (user.jobId && !Number.isFinite(Number(user.professionalXpByJob[user.jobId]))) user.professionalXpByJob[user.jobId] = 0;
      if (!user.questionUsage || typeof user.questionUsage !== 'object') user.questionUsage = {};
    }
  }
  return value;
};
