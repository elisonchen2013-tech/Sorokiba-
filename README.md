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
