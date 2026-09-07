const fs = require('fs');
const path = require('path');

// Corrige o fluxo das missões antes do activity-hook.js transformar o server.js.
// O XP ganho em uma missão deve ser aplicado tanto à profissão quanto à conta.
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, options) {
  const result = originalReadFileSync.call(fs, filePath, options);
  if (typeof filePath === 'string' && path.basename(filePath) === 'server.js' && typeof result === 'string') {
    const marker = '__sorokibaAccountXpFix';
    if (!result.includes(marker)) {
      return result.replace(
        "registerMissionUse(req.user);",
        "registerMissionUse(req.user);/*__sorokibaAccountXpFix*/req.user.xp=(req.user.xp||0)+earnedXp;"
      );
    }
  }
  return result;
};
