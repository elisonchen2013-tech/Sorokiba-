# Sorokiba — Cidade Virtual Online

Projeto completo com frontend + API Express + PostgreSQL.

## Render

**Build Command**
```bash
npm install
```

**Start Command**
```bash
npm start
```

Variáveis de ambiente:
- `DATABASE_URL` = URL do PostgreSQL
- `JWT_SECRET` = uma chave secreta longa (recomendado)

O servidor usa automaticamente a variável `PORT` fornecida pelo Render.

Teste:
`/health` deve retornar `{"ok":true,"service":"Sorokiba"}`.

## Estrutura

- `server.js` — API, autenticação, PostgreSQL e regras do jogo.
- `index.html` — interface.
- `app.js` — frontend conectado à API.
- `style.css` — visual responsivo.
- `package.json` — dependências e comandos.

O botão Inventário não aparece no menu lateral, mas o inventário continua funcionando para armazenar e consumir alimentos.
