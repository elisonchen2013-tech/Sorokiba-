'use strict';

const crypto = require('crypto');

const EXAMS = {
  sangue:{name:'Exame de sangue',price:60,category:'Sangue'},
  urina:{name:'Exame de urina',price:40,category:'Urina'},
  glicose:{name:'Glicose',price:25,category:'Sangue'},
  pressao:{name:'Pressão arterial',price:15,category:'Sinais vitais'},
  temperatura:{name:'Temperatura',price:10,category:'Sinais vitais'},
  colesterol:{name:'Colesterol',price:55,category:'Sangue'},
  vitaminas:{name:'Vitaminas',price:90,category:'Sangue'}
};

const AREAS=['reception','queue','triage','office','exams','pending','results','history','pharmacy','observation','urgent','return','discharge'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const id=()=>crypto.randomBytes(9).toString('hex');
const iso=t=>new Date(t||Date.now()).toISOString();

function ensure(u){
  if(!u.hospital||typeof u.hospital!=='object')u.hospital={};
  const h=u.hospital;
  h.exams=Array.isArray(h.exams)?h.exams:[];
  h.history=Array.isArray(h.history)?h.history:[];
  h.conversation=Array.isArray(h.conversation)?h.conversation:[];
  h.area=AREAS.includes(h.area)?h.area:'reception';
  h.visit=h.visit&&typeof h.visit==='object'?h.visit:null;
  return h;
}

function vitals(u){
  return {life:clamp(Number(u.life)||0,0,100),hunger:clamp(Number(u.hunger)||0,0,100),hydration:clamp(Number(u.hydration)||0,100),energy:clamp(Number(u.energy)||0,0,100)};
}

function resultFor(type,u,exam){
  const v=vitals(u);
  const seed=(parseInt(exam.id.slice(0,8),16)%1000)/1000;
  const data={
    sangue:{hemoglobina:Number((12+v.energy*.045+seed*.8).toFixed(1)),leucocitos:Number((5+v.life*.03+seed*2).toFixed(1))},
    urina:{ph:Number((5.5+v.hydration*.012+seed*.5).toFixed(1)),densidade:Number((1.005+(100-v.hydration)*.0002+seed*.002).toFixed(3))},
    glicose:{glicose:Math.round(75+(100-v.hunger)*.35+seed*12)},
    pressao:{sistolica:Math.round(105+(100-v.life)*.18+(100-v.hydration)*.08+seed*12),diastolica:Math.round(68+(100-v.hydration)*.07+seed*8)},
    temperatura:{temperatura:Number((36.2+(100-v.life)*.008+seed*.5).toFixed(1))},
    colesterol:{total:Math.round(145+seed*65),hdl:Math.round(42+seed*28),ldl:Math.round(75+seed*45)},
    vitaminas:{vitaminaD:Math.round(25+v.hunger*.45+seed*25),vitaminaB12:Math.round(300+v.energy*4+seed*180)}
  };
  return {type,name:EXAMS[type].name,category:EXAMS[type].category,values:data[type]||{},fictional:true};
}

function ctx(u,h,intent,extra={}){
  const pending=h.exams.filter(e=>e.status==='pending').length;
  const ready=h.exams.filter(e=>e.status==='ready'&&!e.reviewedAt).length;
  return Object.assign({
    intent,area:h.area,pendingCount:pending,readyCount:ready,hasVisit:!!h.visit,
    money:Number(u.money||0),life:Number(u.life||0),hunger:Number(u.hunger||0),
    hydration:Number(u.hydration||0),energy:Number(u.energy||0)
  },extra);
}

function conversation(u,h,intent,extra={}){
  const c=ctx(u,h,intent,extra);
  const thinking=['analyze','think','check'][Math.floor(Math.random()*3)];
  const response={
    speaker:c.area==='triage'||c.area==='reception'?'nurse':'doctor',
    animation:thinking,
    context:c,
    choices:['describe_symptoms','ask_about_exams','request_exam','review_results'].filter(x=>{
      if(x==='request_exam')return !!h.visit;
      if(x==='review_results')return c.readyCount>0;
      return true;
    })
  };
  h.conversation.unshift({at:iso(),intent,area:h.area,context:{pendingCount:c.pendingCount,readyCount:c.readyCount}});
  h.conversation=h.conversation.slice(0,50);
  return response;
}

function send(res,u,h,extra={}){
  res.json({
    ok:true,
    area:h.area,
    visit:h.visit,
    exams:h.exams.slice(0,30).map(e=>Object.assign({},e,{result:e.status==='ready'||e.status==='reviewed'?e.result:null})),
    history:h.history.slice(0,20),
    health:vitals(u),
    conversation:extra.conversation||conversation(u,h,'idle'),
    ...extra
  });
}

function auth(app,getUsers,saveData){
  const users=()=>getUsers();

  app.get('/api/hospital', (req,res)=>{
    const u=req.user,h=ensure(u);
    const now=Date.now();
    h.exams.forEach(e=>{
      if(e.status==='pending'&&Date.parse(e.readyAt)<=now){
        e.status='ready';
        if(!e.result)e.result=resultFor(e.type,u,e);
      }
    });
    if(!h.visit)h.area='reception';
    saveData();
    send(res,u,h,{conversation:conversation(u,h,'enter')});
  });

  app.post('/api/hospital/checkin',(req,res)=>{
    const u=req.user,h=ensure(u);
    if(h.visit)return res.status(409).json({error:'Você já possui um atendimento em andamento.'});
    const urgent=Number(u.life||0)<=25;
    h.visit={id:'visit_'+id(),openedAt:iso(),state:'waiting',urgent,spent:0,triage:null,symptoms:[]};
    h.area=urgent?'urgent':'queue';
    saveData();
    send(res,u,h,{message:'Check-in realizado.',conversation:conversation(u,h,'checkin',{urgent})});
  });

  app.post('/api/hospital/triage',(req,res)=>{
    const u=req.user,h=ensure(u);
    if(!h.visit)return res.status(409).json({error:'Faça o check-in primeiro.'});
    const pressure=(100-Number(u.hunger||100))+(100-Number(u.hydration||100))+(100-Number(u.energy||100));
    const risk=h.visit.urgent||Number(u.life||100)<=25?'vermelho':pressure>=150?'laranja':pressure>=90?'amarelo':'verde';
    h.visit.triage={at:iso(),risk,vitals:vitals(u)};
    h.visit.state='in_care';
    h.area='triage';
    saveData();
    send(res,u,h,{message:'Triagem registrada.',triage:h.visit.triage,conversation:conversation(u,h,'triage_done',{risk})});
  });

  app.post('/api/hospital/talk',(req,res)=>{
    const u=req.user,h=ensure(u);
    const intent=String(req.body?.intent||'ask');
    const topic=String(req.body?.topic||'general');
    const symptom=String(req.body?.symptom||'').slice(0,80);
    if(!h.visit&&intent!=='enter')return res.status(409).json({error:'Faça o check-in primeiro.'});
    if(symptom&&h.visit){h.visit.symptoms=Array.isArray(h.visit.symptoms)?h.visit.symptoms:[];if(!h.visit.symptoms.includes(symptom))h.visit.symptoms.push(symptom);}
    if(intent==='describe_symptoms'&&h.visit)h.area='office';
    if(intent==='request_exam')h.area='exams';
    if(intent==='review_results')h.area='results';
    saveData();
    send(res,u,h,{conversation:conversation(u,h,intent,{topic,symptom})});
  });

  app.post('/api/hospital/exams',(req,res)=>{
    const u=req.user,h=ensure(u);
    if(!h.visit)return res.status(409).json({error:'Faça o check-in primeiro.'});
    const type=String(req.body?.type||'');
    if(!EXAMS[type])return res.status(400).json({error:'Exame inválido.'});
    if(h.exams.filter(e=>e.status==='pending').length>=8)return res.status(400).json({error:'Limite de exames pendentes atingido.'});
    const already=h.exams.find(e=>e.visitId===h.visit.id&&e.type===type&&['pending','ready'].includes(e.status));
    if(already)return res.status(409).json({error:'Este exame já foi solicitado neste atendimento.'});
    const price=EXAMS[type].price;
    if(Number(u.money||0)<price)return res.status(400).json({error:'Dinheiro insuficiente.'});
    u.money=Number(u.money||0)-price;
    const started=Date.now(),ready=started+(60+Math.floor(Math.random()*61))*60*1000;
    const exam={id:'exam_'+id(),visitId:h.visit.id,type,name:EXAMS[type].name,category:EXAMS[type].category,price,startedAt:iso(started),readyAt:iso(ready),status:'pending',reviewedAt:null,result:null};
    h.exams.unshift(exam);
    h.visit.spent=Number(h.visit.spent||0)+price;
    h.area='pending';
    saveData();
    send(res,u,h,{message:'Exame solicitado. O resultado ficará disponível entre 1 e 2 horas.',exam,conversation:conversation(u,h,'exam_ordered')});
  });

  app.get('/api/hospital/exams',(req,res)=>{
    const u=req.user,h=ensure(u),now=Date.now();
    let changed=false;
    h.exams.forEach(e=>{if(e.status==='pending'&&Date.parse(e.readyAt)<=now){e.status='ready';e.result=e.result||resultFor(e.type,u,e);changed=true;}});
    if(changed)saveData();
    res.json({ok:true,exams:h.exams.slice(0,50).map(e=>Object.assign({},e,{result:e.status==='pending'?null:e.result}))});
  });

  app.post('/api/hospital/exams/:id/review',(req,res)=>{
    const u=req.user,h=ensure(u),e=h.exams.find(x=>x.id===req.params.id);
    if(!e)return res.status(404).json({error:'Exame não encontrado.'});
    if(e.status==='pending')return res.status(409).json({error:'O resultado ainda não está pronto.',readyAt:e.readyAt});
    e.reviewedAt=iso();e.status='reviewed';h.area='results';
    saveData();
    send(res,u,h,{message:'Resultado analisado.',exam:e,conversation:conversation(u,h,'results_reviewed',{abnormalLast:false})});
  });

  app.post('/api/hospital/discharge',(req,res)=>{
    const u=req.user,h=ensure(u);
    if(!h.visit)return res.status(409).json({error:'Nenhum atendimento ativo.'});
    if(h.exams.some(e=>e.visitId===h.visit.id&&e.status==='pending'))return res.status(409).json({error:'Existem exames pendentes.'});
    h.history.unshift({visitId:h.visit.id,openedAt:h.visit.openedAt,closedAt:iso(),triage:h.visit.triage,symptoms:h.visit.symptoms||[],spent:h.visit.spent||0,examIds:h.exams.filter(e=>e.visitId===h.visit.id).map(e=>e.id)});
    h.history=h.history.slice(0,100);h.visit=null;h.area='history';
    saveData();send(res,u,h,{message:'Atendimento finalizado.',conversation:conversation(u,h,'discharged')});
  });

  app.get('/api/hospital/history',(req,res)=>{
    const h=ensure(req.user);res.json({history:h.history.slice(0,100)});
  });
}

module.exports=auth;
