'use strict';

function normalize(text){
  return String(text||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9? ]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function tokens(text){
  return normalize(text).split(' ').filter(Boolean);
}

function overlap(a,b){
  const A=new Set(tokens(a)),B=new Set(tokens(b));
  let score=0;
  A.forEach(x=>{if(B.has(x))score++});
  return score;
}

const synonymGroups=[
  ['prefeito','prefeitura','governante','prefeita'],
  ['dinheiro','saldo','grana','moeda','financeiro'],
  ['emprego','trabalho','profissao','carreira','cargo'],
  ['missao','missoes','atividade','objetivo'],
  ['cidade','sorokiba','populacao','economia','infraestrutura','qualidade'],
  ['empresa','empresas','negocio','negocios','loja','lojas'],
  ['hospital','medico','medica','consulta','exame','doenca','saude'],
  ['noticia','noticias','manchete','novidade','novidades'],
  ['evento','eventos','agenda'],
  ['inventario','item','itens','produto','produtos'],
  ['xp','experiencia','nivel','progressao']
];

function related(a,b){
  const aa=normalize(a),bb=normalize(b);
  if(overlap(aa,bb)>0)return true;
  for(const group of synonymGroups){
    if(group.some(w=>aa.includes(w))&&group.some(w=>bb.includes(w)))return true;
  }
  return false;
}

function detectIntent(q){
  const s=normalize(q);
  if(!s)return {name:'empty',score:1};
  const intents=[
    ['self_xp',()=>/(meu|minha|quanto).*\b(xp|experiencia|nivel)\b|\b(xp|experiencia)\b.*\btenho\b|meu nivel/.test(s)],
    ['self_money',()=>/(meu|minha|quanto).*(dinheiro|saldo|grana)|quanto.*dinheiro.*tenho|meu saldo/.test(s)],
    ['self_job',()=>/(meu|minha).*(emprego|profissao|trabalho|carreira)|qual.*meu.*cargo/.test(s)],
    ['mayor',()=>/\b(prefeito|prefeitura)\b/.test(s)],
    ['city_stats',()=>/populacao|economia|infraestrutura|qualidade.*cidade|dados.*cidade|como.*esta.*cidade|estado.*cidade/.test(s)],
    ['missions',()=>/missoes?|atividades?.*(xp|dinheiro)|como.*funciona.*mis/.test(s)],
    ['jobs',()=>/profissoes?|empregos?|carreiras?|salarios?|qual.*profissao|como.*desbloque/.test(s)],
    ['companies',()=>/empresas?|negocios?|lojas?|produtos?.*(empresa|cidade)|quem.*vende|onde.*compr/.test(s)],
    ['hospital',()=>/hospital|consulta|exame|medico|saude|doenca/.test(s)],
    ['news',()=>/noticias?|manchetes?|novidades?|o que.*aconteceu|atualiz/.test(s)],
    ['events',()=>/eventos?|agenda|acontecer.*cidade/.test(s)],
    ['inventory',()=>/inventario|itens?|produtos?.*(tenho|meu)|o que.*tenho/.test(s)],
    ['kiba',()=>/quem.*(e|eh|é).*kiba|o que.*kiba|ornitorrinco/.test(s)],
    ['help',()=>/ajuda|bug|erro|problema|como.*usar|como.*funciona/.test(s)]
  ];
  for(const [name,fn] of intents)if(fn())return {name,score:2};
  return {name:'general',score:0.2};
}

function firstName(user){
  return String(user?.name||'cidadão').trim().split(/\s+/)[0]||'cidadão';
}

function publicUserSummary(users){
  return (Array.isArray(users)?users:[]).map(u=>({
    username:u.username,name:u.name,isMayor:!!u.isMayor,jobName:u.jobName,level:Number(u.level||1),xp:Number(u.xp||0),createdAt:u.createdAt
  }));
}

function chooseVariant(list,recent){
  const unused=list.filter(x=>!recent.includes(x));
  const pool=unused.length?unused:list;
  const index=Math.floor(Math.random()*pool.length);
  return pool[index];
}

function recentKey(user){
  return String(user?.username||user?.id||'anonymous');
}

function compactNumber(v){
  return Number(v||0).toLocaleString('pt-BR');
}

function currency(v){
  return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function safeArray(v){return Array.isArray(v)?v:[]}

function topNews(snapshot){
  return safeArray(snapshot?.news).sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||''))).slice(0,5);
}

function buildSources(intent,snapshot,user,users){
  const sources=[];
  const add=(name,detail)=>sources.push({name,detail});
  if(intent.name.startsWith('self_'))add('Seu perfil','XP, nível, profissão e saldo do cidadão');
  if(['city_stats','general','mayor'].includes(intent.name))add('Estado da cidade','Dados atuais de Sorokiba');
  if(['jobs','missions','self_job','general'].includes(intent.name))add('Profissões e progressão','Profissões, salários e XP necessário');
  if(['companies'].includes(intent.name)||intent.name==='general')add('Empresas e lojas','Empresas e produtos disponíveis');
  if(['hospital'].includes(intent.name)||intent.name==='general')add('Hospital','Serviços e informações de saúde do jogo');
  if(['news','general'].includes(intent.name))add('Notícias','Publicações recentes de Sorokiba');
  if(['events','general'].includes(intent.name))add('Eventos','Eventos registrados na cidade');
  if(intent.name==='mayor')add('Cadastro público','Cidadãos e prefeito');
  if(Array.isArray(snapshot?.guides)&&snapshot.guides.length)add('Guias do Kiba','Informações oficiais ensinadas ao Kiba');
  return sources;
}

function generate(intent,q,snapshot,user,users,recentResponses,conversation){
  const name=firstName(user);
  const city=snapshot?.city||{};
  const jobs=safeArray(snapshot?.jobs);
  const companies=safeArray(snapshot?.companies);
  const news=topNews(snapshot);
  const events=safeArray(snapshot?.events).slice(0,5);
  const hospital=snapshot?.hospital||{};
  const knowledge=safeArray(snapshot?.guides);
  const allUsers=publicUserSummary(users);
  const mayor=allUsers.find(x=>x.isMayor);
  const currentJob=jobs.find(j=>String(j.id)===String(user?.jobId))||jobs.find(j=>normalize(j.name)===normalize(user?.jobName||''));

  const commonTail=[
    'Quer que eu procure outra informação da cidade?',
    'Posso cruzar isso com outro sistema de Sorokiba também.',
    'Também posso comparar essa informação com notícias, profissões ou empresas.'
  ];

  switch(intent.name){
    case 'empty':
      return {answer:'Pode perguntar. Eu vou pesquisar os dados atuais de Sorokiba antes de responder.',confidence:.95};
    case 'kiba':
      return {answer:chooseVariant([
        'Eu sou o Kiba, a inteligência virtual e mascote de Sorokiba. Meu trabalho é consultar os dados da cidade e explicar o que encontro de forma natural.',
        'Sou o Kiba. Eu fui criado para entender o funcionamento de Sorokiba, consultar os sistemas da cidade e conversar com você.',
        'Eu sou o Kiba, o assistente virtual de Sorokiba. Em vez de inventar dados, eu procuro o que está registrado na cidade antes de responder.'
      ],recentResponses),confidence:1};
    case 'self_xp':
      return {answer:chooseVariant([
        name+', conferi seu perfil: você está com '+compactNumber(user?.xp)+' XP e está no nível '+compactNumber(user?.level)+'.',
        'Seu perfil registra '+compactNumber(user?.xp)+' XP no nível '+compactNumber(user?.level)+'.',
        'Acabei de consultar seu cidadão: nível '+compactNumber(user?.level)+', com '+compactNumber(user?.xp)+' XP.'
      ],recentResponses),confidence:1};
    case 'self_money':
      return {answer:chooseVariant([
        'No seu perfil, seu dinheiro disponível é '+currency(user?.money)+'.',
        'Conferi seu saldo de jogo: '+currency(user?.money)+' em dinheiro disponível.',
        'Seu perfil está registrando '+currency(user?.money)+' de dinheiro disponível agora.'
      ],recentResponses),confidence:1};
    case 'self_job':
      return {answer:chooseVariant([
        'Seu emprego atual é '+String(user?.jobName||currentJob?.name||'Cidadão')+'.',
        'Consultei seu perfil: sua profissão atual é '+String(user?.jobName||currentJob?.name||'Cidadão')+'.',
        'Sua carreira atual está registrada como '+String(user?.jobName||currentJob?.name||'Cidadão')+'.'
      ],recentResponses),confidence:1};
    case 'mayor':
      if(mayor)return {answer:chooseVariant([
        'O prefeito registrado atualmente é '+mayor.name+'.',
        'Consultei o cadastro público de Sorokiba: o prefeito é '+mayor.name+'.',
        'Segundo os dados atuais da cidade, '+mayor.name+' ocupa o cargo de prefeito.'
      ],recentResponses),confidence:.98};
      return {answer:'Não encontrei um prefeito registrado nos dados atuais de Sorokiba.',confidence:.7};
    case 'city_stats':
      return {answer:chooseVariant([
        'Conferi o estado atual de Sorokiba: população '+compactNumber(city.population)+', economia '+currency(city.economy)+', infraestrutura '+compactNumber(city.infrastructure)+'% e qualidade '+compactNumber(city.quality)+'%.',
        'Os dados que encontrei agora mostram '+compactNumber(city.population)+' cidadãos, economia em '+currency(city.economy)+', infraestrutura em '+compactNumber(city.infrastructure)+'% e qualidade em '+compactNumber(city.quality)+'%.',
        'A leitura atual da cidade é: '+compactNumber(city.population)+' habitantes; economia '+currency(city.economy)+'; infraestrutura '+compactNumber(city.infrastructure)+'%; qualidade '+compactNumber(city.quality)+'%.'
      ],recentResponses),confidence:.99};
    case 'jobs':{
      const available=jobs.slice(0,8).map(j=>j.name+' ('+currency(j.salary)+')').join(', ');
      return {answer:jobs.length
        ?'Encontrei '+jobs.length+' profissões cadastradas. Entre as que consultei estão: '+available+'. O XP necessário varia conforme a profissão.'
        :'Ainda não encontrei a lista de profissões cadastrada.',confidence:.96};
    }
    case 'missions':
      return {answer:chooseVariant([
        'As missões são atividades de progressão que podem entregar XP e dinheiro. Eu consultaria a página Missões para saber quais estão disponíveis para o seu emprego atual.',
        'No Sorokiba, as missões ligam trabalho e progressão: você completa atividades, responde quando necessário e recebe recompensas definidas pela cidade.',
        'Missões são uma das formas de evoluir no jogo. A quantidade e as recompensas dependem da configuração da sua profissão.'
      ],recentResponses),confidence:.92};
    case 'companies':{
      if(!companies.length)return {answer:'No momento não encontrei empresas registradas no estado atual da cidade.',confidence:.9};
      const names=companies.slice(0,8).map(c=>c.name).filter(Boolean).join(', ');
      const tech=companies.filter(c=>normalize(c.companyType)==='tecnologia').length;
      return {answer:'Encontrei '+companies.length+' empresas no estado atual de Sorokiba. Algumas delas são: '+names+'.'+(tech?' Há '+tech+' empresa(s) classificadas como tecnologia.':''),confidence:.95};
    }
    case 'hospital':{
      const services=safeArray(hospital.services);
      if(!services.length)return {answer:'O Hospital está registrado, mas não encontrei serviços disponíveis no momento.',confidence:.75};
      return {answer:'Consultei o Hospital. Há '+services.length+' serviços cadastrados; entre eles estão '+services.slice(0,5).map(x=>x.name).join(', ')+'. Os prazos e preços são definidos pelo sistema do jogo.',confidence:.94};
    }
    case 'news':
      if(!news.length)return {answer:'Não encontrei notícias publicadas recentemente em Sorokiba.',confidence:.86};
      return {answer:'Procurei as notícias mais recentes. A manchete principal que encontrei foi: “'+String(news[0].title||'Sem título')+'”.'+(news[1]?' Também encontrei “'+String(news[1].title||'Sem título')+'”.':''),confidence:.96};
    case 'events':
      if(!events.length)return {answer:'Não encontrei eventos registrados no estado atual da cidade.',confidence:.84};
      return {answer:'Encontrei '+events.length+' eventos recentes no registro consultado. O primeiro é “'+String(events[0].title||events[0].name||'Evento sem título')+'”.',confidence:.9};
    case 'inventory':{
      const inv=user?.inventory||{};
      const ids=Object.entries(inv).filter(([,n])=>Number(n)>0);
      if(!ids.length)return {answer:'Seu inventário não registra itens comuns no momento.',confidence:.95};
      const items=ids.slice(0,6).map(([id,n])=>String(id)+': '+n).join(', ');
      return {answer:'Consultei seu inventário e encontrei '+ids.length+' tipo(s) de item com quantidade positiva. Os registros principais são '+items+'.',confidence:.9};
    }
    case 'help':
      return {answer:chooseVariant([
        'Claro. Diga qual sistema você está tentando usar e eu procuro os dados relacionados antes de explicar.',
        'Posso investigar problemas de Cidade, Emprego, Missões, Inventário, Lojas, Empresas, Hospital, Banco e outros sistemas.',
        'Me diga o que aconteceu e em qual página. Eu vou analisar o contexto do jogo antes de responder.'
      ],recentResponses),confidence:.9};
    default:{
      let best=null,bestScore=0;
      for(const item of knowledge){
        const text=String(item.title||'')+' '+String(item.content||'');
        const score=overlap(q,text)+(related(q,text)?2:0);
        if(score>bestScore){best=item;bestScore=score}
      }
      if(best&&bestScore>=2){
        return {answer:'Encontrei uma informação ensinada ao Kiba: '+String(best.content),confidence:.78};
      }
      const qTokens=tokens(q);
      const evidence=[];
      if(qTokens.some(x=>['cidade','sorokiba'].includes(x)))evidence.push('cidade');
      if(qTokens.some(x=>['empresa','empresas','loja','lojas'].includes(x)))evidence.push('empresas');
      if(qTokens.some(x=>['noticia','noticias','novidade'].includes(x)))evidence.push('notícias');
      if(qTokens.some(x=>['hospital','exame','medico'].includes(x)))evidence.push('hospital');
      if(evidence.length){
        return {answer:'Entendi que sua pergunta envolve '+evidence.join(', ')+', mas os dados que encontrei não são suficientes para dar uma resposta confiável sem inventar. Tente acrescentar um detalhe e eu faço uma busca mais específica.',confidence:.55};
      }
      return {answer:chooseVariant([
        'Entendi a pergunta, mas ainda não encontrei evidência suficiente nos sistemas atuais de Sorokiba para responder com segurança.',
        'Procurei nos dados disponíveis e não encontrei informação suficiente para responder sem inventar.',
        'A pergunta parece estar fora do conhecimento que tenho registrado agora. Posso pesquisar outro sistema de Sorokiba a partir de uma palavra-chave mais específica.'
      ],recentResponses),confidence:.5};
    }
  }
}

function createKibaBrain({getSnapshot,getUsers,getKnowledge}){
  const sessions=new Map();
  function stateFor(user){
    const key=recentKey(user);
    if(!sessions.has(key))sessions.set(key,{recentQuestions:[],recentResponses:[],conversation:[]});
    return sessions.get(key);
  }
  return {
    async ask({user,question}){
      const started=Date.now();
      const state=stateFor(user);
      const snapshot=await getSnapshot();
      const users=await getUsers();
      const knowledge=await getKnowledge();
      const q=String(question||'').trim().slice(0,500);
      const intent=detectIntent(q);
      const result=generate(intent,q,{...snapshot,guides:knowledge},user,users,state.recentResponses,state.conversation);
      state.recentQuestions.push(q);
      state.recentResponses.push(result.answer);
      state.conversation.push({role:'user',content:q,intent:intent.name});
      state.conversation.push({role:'assistant',content:result.answer});
      while(state.recentQuestions.length>12)state.recentQuestions.shift();
      while(state.recentResponses.length>12)state.recentResponses.shift();
      while(state.conversation.length>20)state.conversation.shift();
      const sources=buildSources(intent,snapshot,user,users);
      const elapsedMs=Date.now()-started;
      return {
        answer:result.answer,
        intent:intent.name,
        confidence:result.confidence,
        elapsedMs,
        searched:sources,
        conversationLength:state.conversation.length
      };
    }
  };
}

module.exports={createKibaBrain,normalize};
