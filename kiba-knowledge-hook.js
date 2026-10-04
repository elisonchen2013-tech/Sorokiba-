const db=require('./db');
const express=require('express');
const originalExpress=express;
function token(req){return req.headers.authorization?.split(' ')[1]||''}
async function user(req){const t=token(req);if(!t)return null;const users=(await db.get('users'))||{};const username=Object.keys(users).find(k=>users[k]?.token===t);return username?users[username]:null}
function moveLayersBeforeCatchAll(app,layers){
  const stack=app._router?.stack||[];
  for(const layer of layers){
    const index=stack.indexOf(layer);
    if(index>=0)stack.splice(index,1);
  }
  const catchIndex=stack.findIndex(layer=>layer.route&&layer.route.path==='*');
  if(catchIndex>=0)stack.splice(catchIndex,0,...layers);
  else stack.push(...layers);
}
function register(app){
  if(app.__kibaKnowledgeRoutes)return;
  app.__kibaKnowledgeRoutes=true;
  const addedLayers=[];
  app.get('/api/kiba/knowledge',async(req,res)=>{
    try{
      const list=(await db.get('kibaKnowledge'))||[];
      res.json({knowledge:Array.isArray(list)?list:[]});
    }catch(e){
      res.status(500).json({error:'Não foi possível carregar a memória do Kiba.'});
    }
  });
  addedLayers.push(app._router.stack[app._router.stack.length-1]);
  app.post('/api/kiba/knowledge',async(req,res)=>{
    try{
      const u=await user(req);
      if(!u||!u.isMayor)return res.status(403).json({error:'Apenas o prefeito pode ensinar o Kiba.'});
      const title=String(req.body?.title||'').trim();
      const content=String(req.body?.content||'').trim();
      const category=String(req.body?.category||'Atualização').trim()||'Atualização';
      if(!title||!content)return res.status(400).json({error:'Informe um título e o conteúdo.'});
      const list=(await db.get('kibaKnowledge'))||[];
      const item={id:'kiba_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),title,content,category,createdAt:new Date().toISOString(),createdBy:u.username};
      list.unshift(item);
      await db.set('kibaKnowledge',list.slice(0,200));
      res.json({message:'Kiba atualizado!',item});
    }catch(e){
      console.error(e);
      res.status(500).json({error:'Não foi possível atualizar o Kiba.'});
    }
  });
  addedLayers.push(app._router.stack[app._router.stack.length-1]);
  app.delete('/api/kiba/knowledge/:id',async(req,res)=>{
    try{
      const u=await user(req);
      if(!u||!u.isMayor)return res.status(403).json({error:'Apenas o prefeito pode alterar a memória do Kiba.'});
      const list=(await db.get('kibaKnowledge'))||[];
      const next=list.filter(x=>x?.id!==req.params.id);
      await db.set('kibaKnowledge',next);
      res.json({message:'Informação removida.'});
    }catch(e){
      res.status(500).json({error:'Não foi possível remover a informação.'});
    }
  });
  addedLayers.push(app._router.stack[app._router.stack.length-1]);
  moveLayersBeforeCatchAll(app,addedLayers);
}
const wrapped=function(...args){const app=originalExpress(...args);const listen=app.listen.bind(app);app.listen=function(...a){register(app);return listen(...a)};return app};Object.assign(wrapped,originalExpress);require.cache[require.resolve('express')].exports=wrapped;