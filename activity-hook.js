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

  app.post('/api/me/activity', async (req, res) => {
    try {
      const activeSeconds = Math.max(0, Math.min(30, Number(req.body?.activeSeconds) || 0));
      const found = await findUser(req);
      if (!found) return res.status(401).json({ error: 'Token inválido' });
      const user = found.user;
      user.activeNeedSeconds = Math.max(0, Number(user.activeNeedSeconds) || 0) + activeSeconds;
      const minutes = Math.floor(user.activeNeedSeconds / 60);
      if (minutes > 0) {
        user.activeNeedSeconds -= minutes * 60;
        user.hydration = Math.max(0, Number(user.hydration ?? 100) - minutes);
        user.energy = Math.max(0, Number(user.energy ?? 100) - minutes);
      }
      await db.set('users', found.users);
      res.json({ hydration: user.hydration, energy: user.energy });
    } catch (e) {
      console.error('Falha ao atualizar necessidades', e);
      res.status(500).json({ error: 'Não foi possível atualizar suas necessidades agora.' });
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
