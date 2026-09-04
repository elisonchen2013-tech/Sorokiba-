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

function moveLayersBeforeCatchAll(app, layers) {
  const stack = app._router?.stack || [];
  for (const layer of layers) {
    const index = stack.indexOf(layer);
    if (index >= 0) stack.splice(index, 1);
  }
  const catchIndex = stack.findIndex(layer => layer.route && layer.route.path === '*');
  if (catchIndex >= 0) stack.splice(catchIndex, 0, ...layers);
  else stack.push(...layers);
}

function registerActivityRoutes(app) {
  if (app.__sorokibaActivityRoutes) return;
  app.__sorokibaActivityRoutes = true;
  const addedLayers = [];

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
  addedLayers.push(app._router.stack[app._router.stack.length - 1]);

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
  addedLayers.push(app._router.stack[app._router.stack.length - 1]);

  app.get('/api/mayor/users', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Token inválido' });
      if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode acessar' });
      const users = (await db.get('users')) || {};
      const list = Object.values(users).filter(user => user && user.username !== req.user.username && !user.isMayor).map(user => ({name:user.name,username:user.username,jobName:user.jobName||'Estudante',level:user.level||1,xp:user.xp||0,money:user.money||0}));
      res.json({ users: list });
    } catch (e) {
      console.error('Falha ao listar contas para o prefeito', e);
      res.status(500).json({ error: 'Não foi possível carregar as contas.' });
    }
  });
  addedLayers.push(app._router.stack[app._router.stack.length - 1]);

  app.delete('/api/mayor/users/:username', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Token inválido' });
      if (!req.user.isMayor) return res.status(403).json({ error: 'Apenas o prefeito pode excluir contas' });
      const targetUsername = decodeURIComponent(req.params.username);
      if (targetUsername === req.user.username) return res.status(400).json({ error: 'O prefeito não pode excluir a própria conta.' });
      const users = (await db.get('users')) || {};
      const target = users[targetUsername];
      if (!target) return res.status(404).json({ error: 'Conta não encontrada.' });
      if (target.isMayor) return res.status(403).json({ error: 'A conta do prefeito não pode ser excluída por este painel.' });
      delete users[targetUsername];
      await db.set('users', users);
      const city = (await db.get('city')) || {};
      if (target.countedInPopulation) {
        city.population = Math.max(0, Number(city.population || 0) - 1);
        await db.set('city', city);
      }
      res.json({ message: `Conta de ${target.name || targetUsername} excluída com sucesso!`, population: city.population });
    } catch (e) {
      console.error('Falha ao excluir conta pelo prefeito', e);
      res.status(500).json({ error: 'Não foi possível excluir a conta agora.' });
    }
  });
  addedLayers.push(app._router.stack[app._router.stack.length - 1]);

  app.get('/admin-delete.js', (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(process.cwd(), 'admin-delete.js');
      res.type('application/javascript').send(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error('Falha ao servir admin-delete.js', e);
      res.status(500).send('// Erro ao carregar painel');
    }
  });
  addedLayers.push(app._router.stack[app._router.stack.length - 1]);

  moveLayersBeforeCatchAll(app, addedLayers);
}

const wrappedExpress = function (...args) {
  const app = originalExpress(...args);
  const originalListen = app.listen.bind(app);
  app.listen = function (...listenArgs) {
    registerActivityRoutes(app);
    const fs = require('fs');
    const path = require('path');
    if (!app.__sorokibaSendFilePatched) {
      app.__sorokibaSendFilePatched = true;
      app.use((req, res, next) => {
        const original = res.sendFile.bind(res);
        res.sendFile = function(filePath, options, callback) {
          try {
            if (path.basename(filePath) === 'index.html') {
              let html = fs.readFileSync(filePath, 'utf8');
              if (!html.includes('admin-delete.js')) html = html.replace('</body>', '<script src="/admin-delete.js"></script></body>');
              res.type('html').send(html);
              return;
            }
          } catch (e) { console.error('Falha ao carregar painel de contas', e); }
          return original(filePath, options, callback);
        };
        next();
      });
      const stack = app._router?.stack || [];
      const middleware = stack[stack.length - 1];
      moveLayersBeforeCatchAll(app, [middleware]);
    }
    return originalListen(...listenArgs);
  };
  return app;
};
Object.assign(wrappedExpress, originalExpress);
require.cache[require.resolve('express')].exports = wrappedExpress;

const Module = require('module');
const originalLoader = Module._extensions['.js'];
Module._extensions['.js'] = function(module, filename) {
  if (filename.endsWith('/server.js')) {
    const fs = require('fs');
    let source = fs.readFileSync(filename, 'utf8');
    source = source.replace(/Date\.now\(\) \+ 3600 \* 1000/g, 'Date.now() + 1800 * 1000');
    source = source.replace(/Aguarde 1 hora para receber mais 2 missões/g, 'Aguarde 30 minutos para receber mais 2 missões');
    source = source.replace(/city\.proposals\.push\(\{id:`prop_\$\{Date\.now\(\)\}`,author:req\.user\.name,/g, 'city.proposals.push({id:`prop_${Date.now()}`,author:req.user.name,authorUsername:req.user.username,');
    source = source.replace(/const final=m\.answers\.filter\(v=>v!==undefined\)\.length>=m\.questions\.length;/g, 'const final=m.answers.filter(v=>v!==undefined).length>=m.questions.length;const earnedMoney=Math.floor((m.rewardMoney||0)*((m.correctCount||0)/Math.max(1,m.questions.length)));');
    source = source.replace(/req\.user\.money=\(req\.user\.money\|\|0\)\+\(m\.rewardMoney\|\|0\);/g, 'req.user.money=(req.user.money||0)+earnedMoney;');
    source = source.replace(/moneyGiven:final\?m\.rewardMoney\|\|0:0/g, 'moneyGiven:final?earnedMoney:0');
    return module._compile(source, filename);
  }
  return originalLoader(module, filename);
};
