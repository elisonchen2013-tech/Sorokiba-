const fs = require('fs');
const path = require('path');

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, options) {
  const result = originalReadFileSync.call(fs, filePath, options);
  if (typeof filePath === 'string' && path.basename(filePath) === 'server.js' && typeof result === 'string' && !result.includes('__sorokibaAccountXpFix')) {
    return result.replace(
      "registerMissionUse(req.user);",
      "registerMissionUse(req.user);/*__sorokibaAccountXpFix*/req.user.xp=(req.user.xp||0)+earnedXp;"
    );
  }
  return result;
};
