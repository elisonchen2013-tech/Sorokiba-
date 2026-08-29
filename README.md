
# Sorokiba

Cidade virtual online multiplayer com Express + PostgreSQL.

## Rodar localmente

1. Instale Node.js 20+.
2. Crie um PostgreSQL.
3. Defina:
   - `DATABASE_URL=...`
   - `JWT_SECRET=uma-chave-secreta-longa`
   - `PORT=3000`
4. Execute:
```bash
npm install
npm start
```
5. Abra `http://localhost:3000`.

## Render

- Build Command: `npm install`
- Start Command: `npm start`
- Adicione um PostgreSQL no Render e use a `DATABASE_URL` fornecida.
- Adicione `JWT_SECRET` como variável secreta.
- O servidor usa automaticamente `PORT`.
- Não existe `app.get("*")`; o fallback usa middleware compatível com Express 5.

O primeiro usuário cadastrado recebe automaticamente a função de prefeito (o prefeito é definido como o usuário de menor ID).

## Funcionalidades

Cadastro/login com hash bcrypt, token JWT, PostgreSQL persistente, necessidades, empregos e desbloqueios, missões com cronômetro server-side, recompensas, inventário, loja, hospital, banco/transferências, notícias, eventos, propostas, decisões da prefeitura, painel administrativo, jogadores, perfis e conquistas.
