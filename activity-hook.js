const db = require('./db');
const expressModule = require('express');
const originalExpress = expressModule;

function getToken(req) {
  return req.headers.authorization?.split(' ')[1] || '';
}

async function findUser(req) {
  const token = getToken(req);
  if (!token) return null;
  const users = (await db.get('users')) || {};
  const username = Object.keys(users).find(k => users[k] && users[k].token === token);
  return username ? { users, username, user: users[username] } : null;
}

function registerActivityRoutes(app) {
  if (app.__sorokibaActivityRoutes) return;
  app.__sorokibaActivityRoutes = true;

  app.get('/api/me/recovery-status', async (req, res) => {
    try {
      const found = await findUser(req);
      if (!found) return res.status(401).json({ error: 'Token inválido' });
      res.json({ configured: Boolean(found.user.recoveryCode) });
    } catch (e) {
      console.error('Falha ao verificar código de recuperação', e);
      res.status(500).json({ error: 'Não foi possível verificar o código de recuperação.' });
    }
  });

  app.post('/api/me/recovery-code', async (req, res) => {
    try {
      const { currentPassword, recoveryCode } = req.body || {};
      if (!currentPassword || !recoveryCode) return res.status(400).json({ error: 'Preencha a senha atual e o código de recuperação.' });
      if (String(recoveryCode).length < 6) return res.status(400).json({ error: 'O código de recuperação deve ter no mínimo 6 caracteres.' });
      const found = await findUser(req);
      if (!found) return res.status(401).json({ error: 'Token inválido' });
      if (found.user.password !== currentPassword) return res.status(401).json({ error: 'Senha atual incorreta.' });
      found.user.recoveryCode = String(recoveryCode);
      await db.set('users', found.users);
      res.json({ message: 'Código de recuperação salvo com sucesso!' });
    } catch (e) {
      console.error('Falha ao salvar código de recuperação', e);
      res.status(500).json({ error: 'Não foi possível salvar o código agora.' });
    }
  });
}

const wrappedExpress = function (...args) {
  const app = originalExpress(...args);
  const originalListen = app.listen.bind(app);
  app.listen = function (...listenArgs) {
    registerActivityRoutes(app);
    return originalListen(...listenArgs);
  };
  return app;
};
Object.assign(wrappedExpress, originalExpress);
require.cache[require.resolve('express')].exports = wrappedExpress;

// Pequenos ajustes no código do servidor, sem reestruturar o jogo:
// 1) O limite passa a ser 2 missões consecutivas + 30 minutos de espera.
// 2) Toda proposta guarda o username do autor para que o resultado seja entregue à pessoa certa.
const Module = require('module');
const originalLoader = Module._extensions['.js'];
Module._extensions['.js'] = function(module, filename) {
  if (filename.endsWith('/server.js')) {
    const fs = require('fs');
    let source = fs.readFileSync(filename, 'utf8');
    source = source.replace(/Date\.now\(\) \+ 3600 \* 1000/g, 'Date.now() + 1800 * 1000');
    source = source.replace(/Aguarde 1 hora para receber mais 2 missões/g, 'Aguarde 30 minutos para receber mais 2 missões');
    source = source.replace(/city\.proposals\.push\(\{id:`prop_\$\{Date\.now\(\)\}`,author:req\.user\.name,/g, 'city.proposals.push({id:`prop_${Date.now()}`,author:req.user.name,authorUsername:req.user.username,');
    return module._compile(source, filename);
  }
  return originalLoader(module, filename);
};
