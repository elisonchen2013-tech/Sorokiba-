const expressModule = require('express');
const db = require('./db');

const originalExpress = expressModule;
const originalStatic = expressModule.static;

function registerActivityRoutes(app) {
  if (app.__sorokibaActivityRoutes) return;
  app.__sorokibaActivityRoutes = true;

  app.get('/api/me/recovery-status', async (req, res) => {
    try {
      const users = (await db.get('users')) || {};
      const user = users[req.username];
      res.json({ configured: Boolean(user && user.recoveryCode) });
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

      const users = (await db.get('users')) || {};
      const user = users[req.username];
      if (!user || user.password !== currentPassword) return res.status(401).json({ error: 'Senha atual incorreta.' });

      user.recoveryCode = String(recoveryCode);
      await db.set('users', users);
      req.user.recoveryCode = user.recoveryCode;
      res.json({ message: 'Código de recuperação salvo com sucesso!' });
    } catch (e) {
      console.error('Falha ao salvar código de recuperação', e);
      res.status(500).json({ error: 'Não foi possível salvar o código agora.' });
    }
  });

  app.post('/api/me/activity', async (req, res) => {
    try {
      const activeSeconds = Math.max(0, Math.min(30, Number(req.body?.activeSeconds) || 0));
      const users = (await db.get('users')) || {};
      const user = users[req.username];
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      user.activeNeedSeconds = Math.max(0, Number(user.activeNeedSeconds) || 0) + activeSeconds;
      const minutes = Math.floor(user.activeNeedSeconds / 60);
      if (minutes > 0) {
        user.activeNeedSeconds -= minutes * 60;
        user.hydration = Math.max(0, Math.min(100, Number(user.hydration ?? 100) - minutes));
        user.energy = Math.max(0, Math.min(100, Number(user.energy ?? 100) - minutes));
      }

      await db.set('users', users);
      req.user.hydration = user.hydration;
      req.user.energy = user.energy;
      res.json({ hydration: user.hydration, energy: user.energy });
    } catch (e) {
      console.error('Falha ao atualizar necessidades', e);
      res.status(500).json({ error: 'Não foi possível atualizar suas necessidades agora.' });
    }
  });
}

const wrappedExpress = function () {
  const app = originalExpress();
  const originalListen = app.listen.bind(app);
  app.listen = function (...args) {
    registerActivityRoutes(app);
    return originalListen(...args);
  };
  return app;
};

Object.assign(wrappedExpress, originalExpress);
require.cache[require.resolve('express')].exports = wrappedExpress;

// Kept as a small preload hook so the existing server structure stays untouched.
// The normal Express static handler remains unchanged; the client-side activity
// script is included by index.html.
void originalStatic;
