/* Sorokiba Mayor Broadcasts — server-side live announcements. */
module.exports=function setupMayorBroadcast({app,getUsers,getCity,saveData}){
  const clean=s=>String(s??'').replace(/[<>]/g,'').trim();
  const getAuthUser=req=>{
    const raw=String(req.headers.authorization||'');
    const token=raw.startsWith('Bearer ')?raw.slice(7).trim():'';
    if(!token)return null;
    const users=getUsers()||{};
    return Object.values(users).find(u=>u && ((u.token&&u.token===token)||(Array.isArray(u.tokens)&&u.tokens.includes(token))))||null;
  };
  const requireMayor=(req,res)=>{
    const user=getAuthUser(req);
    if(!user)return res.status(401).json({error:'Você precisa estar conectado.'});
    if(!user.isMayor)return res.status(403).json({error:'Apenas o prefeito pode usar os comunicados oficiais.'});
    req.mayorUser=user;
    return null;
  };

  app.get('/api/mayor/broadcasts', (req,res)=>{
    const city=getCity()||{};
    const list=Array.isArray(city.mayorBroadcasts)?city.mayorBroadcasts:[];
    const now=Date.now();
    const active=list.filter(x=>new Date(x.expiresAt).getTime()>now).slice(-20);
    res.json({broadcasts:active});
  });

  app.post('/api/mayor/broadcasts',(req,res)=>{
    const denied=requireMayor(req,res); if(denied)return;
    const title=clean(req.body?.title||'Comunicado da Prefeitura').slice(0,80);
    const message=clean(req.body?.message||'').slice(0,280);
    const type=['info','warning','success','event'].includes(req.body?.type)?req.body.type:'info';
    const duration=Math.max(5,Math.min(30,Number(req.body?.duration)||10));
    if(!message)return res.status(400).json({error:'Escreva uma mensagem para a cidade.'});
    const city=getCity()||{};
    if(!Array.isArray(city.mayorBroadcasts))city.mayorBroadcasts=[];
    const now=Date.now();
    city.mayorBroadcasts=city.mayorBroadcasts.filter(x=>new Date(x.expiresAt).getTime()>now).slice(-19);
    const item={
      id:'broadcast_'+now+'_'+Math.random().toString(36).slice(2,8),
      title,
      message,
      type,
      duration,
      createdAt:new Date(now).toISOString(),
      expiresAt:new Date(now+duration*1000).toISOString(),
      mayorName:clean(req.mayorUser.name).slice(0,80)
    };
    city.mayorBroadcasts.push(item);
    saveData();
    res.json({message:'Comunicado enviado para Sorokiba!',broadcast:item});
  });
};
