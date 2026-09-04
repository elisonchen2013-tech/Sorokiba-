const Module = require('module');
const originalCompile = Module.prototype._compile;

const UI = `
(function(){
  const ranges=[
    {level:1,min:0,max:100,label:'Fácil'},
    {level:2,min:100,max:200,label:'Médio'},
    {level:3,min:200,max:400,label:'Difícil'},
    {level:4,min:400,max:700,label:'Muito difícil'},
    {level:5,min:700,max:1000,label:'Avançado'},
    {level:6,min:1000,max:null,label:'Especialista'}
  ];
  const styleId='sorokiba-mayor-manager-style';
  function addStyles(){
    if(document.getElementById(styleId))return;
    const s=document.createElement('style');s.id=styleId;
    s.textContent=`
      .skm-wrap{max-width:980px;margin:auto}
      .skm-hero{padding:4px 0 18px}.skm-hero h2{margin:0 0 6px}.skm-hero p{margin:0;opacity:.72}
      .skm-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:14px}
      .skm-section{border:1px solid rgba(124,92,255,.18);border-radius:16px;padding:16px;background:rgba(124,92,255,.035);margin-bottom:12px}
      .skm-section h3{margin:0 0 12px}.skm-section .hint{font-size:12px;opacity:.65;margin:-5px 0 12px}
      .skm-label{display:block;font-size:12px;font-weight:700;margin:10px 0 6px}.skm-input,.skm-select,.skm-textarea{width:100%;box-sizing:border-box;border:1px solid rgba(127,127,127,.25);border-radius:10px;padding:10px;background:inherit;color:inherit;font:inherit}.skm-textarea{resize:vertical;min-height:80px}
      .skm-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.skm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.skm-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}.skm-primary{background:#7c5cff;color:#fff}.skm-secondary{background:rgba(127,127,127,.12);color:inherit}
      .skm-range{display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center}.skm-level{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(124,92,255,.13);font-weight:800}.skm-range small{display:block;opacity:.65;margin-top:3px}
      .skm-preview{border-radius:12px;padding:12px;background:rgba(0,0,0,.04);margin-top:12px}.skm-preview b{display:block;margin-bottom:8px}.skm-preview .pv-opt{padding:7px 9px;border-radius:8px;background:rgba(127,127,127,.08);margin:5px 0}
      .skm-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.skm-search{flex:1;min-width:180px}.skm-filter{min-width:170px}
      .skm-list{display:grid;gap:9px;max-height:430px;overflow:auto;padding-right:3px}.skm-qcard{border:1px solid rgba(127,127,127,.2);border-radius:13px;padding:12px}.skm-qtop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.skm-qtext{font-weight:700}.skm-badge{font-size:11px;white-space:nowrap;border-radius:999px;padding:5px 8px;background:rgba(124,92,255,.12)}.skm-meta{font-size:11px;opacity:.65;margin-top:6px}.skm-qactions{display:flex;gap:7px;margin-top:9px}.skm-empty{text-align:center;opacity:.65;padding:28px 10px}
      @media(max-width:760px){.skm-grid{grid-template-columns:1fr}.skm-options{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function rangeForQuestion(q){
    if(q&&q.xpMin!==undefined)return ranges.find(r=>r.min===Number(q.xpMin))||null;
    return null;
  }
  function optionLabel(i){return ['A','B','C','D','E','F'][i]||String(i+1)}
  function rangeOptions(selected){return ranges.map(r=>'<option value="'+r.min+'" '+(Number(selected)===r.min?'selected':'')+'>Nível '+r.level+' — XP '+r.min+(r.max===null?'+':'–'+r.max)+' — '+r.label+'</option>').join('')}
  function jobOptions(jobs,selected){return jobs.map(j=>'<option value="'+esc(j.id)+'" '+(j.id===selected?'selected':'')+'>'+esc(j.icon||'')+' '+esc(j.name)+'</option>').join('')}
  function inputValue(id){const el=document.getElementById(id);return el?el.value.trim():''}
  function renderQuestionCards(qs){
    const search=(document.getElementById('skmSearch')?.value||'').toLowerCase();
    const filter=document.getElementById('skmFilter')?.value||'all';
    const filtered=qs.filter(q=>{
      const text=String(q.text||'').toLowerCase();
      const job=String(q.jobId||'');
      return (!search||text.includes(search))&&(filter==='all'||job===filter);
    });
    return filtered.map(q=>{
      const r=rangeForQuestion(q);
      const level=r?'Nível '+r.level+' • XP '+r.min+(r.max===null?'+':'–'+r.max):'Faixa antiga';
      return '<div class="skm-qcard"><div class="skm-qtop"><div class="skm-qtext">'+esc(q.text)+'</div><span class="skm-badge">'+esc(level)+'</span></div><div class="skm-meta">'+esc(q.jobName||q.jobId||'Profissão não definida')+' • Resposta: '+optionLabel(Number(q.correct)||0)+'</div><div class="skm-qactions"><button class="skm-btn skm-secondary" onclick="editXpQuestion(\''+esc(q.id)+'\')">✏️ Editar</button></div></div>';
    }).join('')||'<div class="skm-empty">Nenhuma pergunta encontrada.</div>';
  }
  async function loadManager(){
    addStyles();
    try{
      const [qs,jobsList]=await Promise.all([api('/api/mayor/questions'),api('/api/jobs')]);
      window.__skQuestions=qs||[];window.__skJobs=jobsList.jobs||[];
      const jobs=window.__skJobs;
      const firstJob=jobs[0]?.id||'estudante';
      const html=`<div class="skm-wrap">
        <div class="skm-hero"><h2>🏛️ Central de perguntas</h2><p>Crie, organize e edite as perguntas das missões sem precisar mexer no código.</p></div>
        <div class="skm-grid">
          <div>
            <div class="skm-section">
              <h3>➕ Criar pergunta</h3>
              <p class="hint">Escolha a profissão e o nível. O nível é definido pelo XP daquela profissão.</p>
              <label class="skm-label">Profissão<select class="skm-select" id="skmJob">${jobOptions(jobs,firstJob)}</select></label>
              <label class="skm-label">Nível de dificuldade<select class="skm-select" id="skmRange">${rangeOptions(0)}</select></label>
              <div class="skm-range"><div class="skm-level" id="skmLevel">1</div><div><b id="skmRangeName">Fácil</b><small id="skmRangeHelp">Jogadores com 0–100 XP nesta profissão.</small></div></div>
              <label class="skm-label">Pergunta<textarea class="skm-textarea" id="skmText" placeholder="Digite a pergunta..."></textarea></label>
              <label class="skm-label">Alternativas</label>
              <div class="skm-options">${[0,1,2,3].map(i=>'<input class="skm-input" id="skmOpt'+i+'" placeholder="Opção '+optionLabel(i)+'">').join('')}</div>
              <label class="skm-label">Resposta correta<select class="skm-select" id="skmCorrect"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label>
              <div class="skm-preview"><b>👁️ Pré-visualização</b><div id="skmPreviewText">Sua pergunta aparecerá aqui.</div><div id="skmPreviewOpts"></div></div>
              <div class="skm-actions"><button class="skm-btn skm-primary" onclick="createXpQuestion()">Criar pergunta</button><button class="skm-btn skm-secondary" onclick="clearXpQuestionForm()">Limpar</button></div>
            </div>
          </div>
          <div>
            <div class="skm-section">
              <h3>📚 Perguntas cadastradas</h3>
              <div class="skm-toolbar"><input class="skm-input skm-search" id="skmSearch" placeholder="🔎 Procurar pergunta..."><select class="skm-select skm-filter" id="skmFilter"><option value="all">Todas as profissões</option>${jobOptions(jobs)}</select></div>
              <div class="skm-list" id="skmList">${renderQuestionCards(window.__skQuestions)}</div>
            </div>
            <div class="skm-section"><h3>💡 Como organizar</h3><p class="hint">Separe as perguntas por profissão e nível. Assim, o jogador recebe perguntas compatíveis com o XP que possui naquela profissão.</p></div>
          </div>
        </div>
      </div>`;
      openModal(html);
      bindManager(jobs);
    }catch(e){toast(e.message,'error')}
  }
  function bindManager(){
    const updateRange=()=>{const r=ranges.find(x=>x.min===Number($('#skmRange').value))||ranges[0];$('#skmLevel').textContent=r.level;$('#skmRangeName').textContent=r.label;$('#skmRangeHelp').textContent='Jogadores com '+r.min+(r.max===null?'+':'–'+r.max)+' XP nesta profissão.'};
    $('#skmRange').onchange=updateRange;updateRange();
    ['skmText','skmOpt0','skmOpt1','skmOpt2','skmOpt3'].forEach(id=>$('#'+id).addEventListener('input',updatePreview));
    $('#skmCorrect').onchange=updatePreview;
    $('#skmSearch').oninput=()=>$('#skmList').innerHTML=renderQuestionCards(window.__skQuestions);
    $('#skmFilter').onchange=()=>$('#skmList').innerHTML=renderQuestionCards(window.__skQuestions);
    updatePreview();
  }
  function updatePreview(){
    const text=inputValue('skmText')||'Sua pergunta aparecerá aqui.';$('#skmPreviewText').textContent=text;
    $('#skmPreviewOpts').innerHTML=[0,1,2,3].map(i=>{const v=inputValue('skmOpt'+i)||('Opção '+optionLabel(i));return '<div class="pv-opt">'+optionLabel(i)+') '+esc(v)+(Number($('#skmCorrect').value)===i?' ✓':'')+'</div>'}).join('');
  }
  window.clearXpQuestionForm=function(){['skmText','skmOpt0','skmOpt1','skmOpt2','skmOpt3'].forEach(id=>{if($('#'+id))$('#'+id).value=''});$('#skmCorrect').value='0';updatePreview()};
  window.createXpQuestion=async function(){
    try{
      const text=inputValue('skmText'),opts=[0,1,2,3].map(i=>inputValue('skmOpt'+i));
      if(!text||opts.some(x=>!x))throw new Error('Preencha a pergunta e as 4 alternativas.');
      const r=ranges.find(x=>x.min===Number($('#skmRange').value))||ranges[0];
      const d=await post('/api/mayor/questions',{jobId:$('#skmJob').value,text,options:opts,correct:Number($('#skmCorrect').value),difficulty:r.level,xpMin:r.min,xpMax:r.max});
      toast(d.message||'Pergunta criada!');
      await loadManager();
    }catch(e){toast(e.message,'error')}
  };
  window.editXpQuestion=async function(id){
    const q=window.__skQuestions.find(x=>x.id===id);if(!q)return;
    const jobs=window.__skJobs||[];const r=rangeForQuestion(q)||ranges[Math.max(0,(Number(q.difficulty)||1)-1)]||ranges[0];
    openModal('<div class="skm-wrap"><div class="skm-hero"><h2>✏️ Editar pergunta</h2><p>Altere o texto, alternativas, resposta ou nível.</p></div><div class="skm-section"><label class="skm-label">Profissão<select class="skm-select" id="editJob">'+jobOptions(jobs,q.jobId)+'</select></label><label class="skm-label">Nível<select class="skm-select" id="editRange">'+rangeOptions(r.min)+'</select></label><label class="skm-label">Pergunta<textarea class="skm-textarea" id="editText">'+esc(q.text)+'</textarea></label><label class="skm-label">Alternativas</label><div class="skm-options">${[0,1,2,3].map(i=>'<input class="skm-input" id="editOpt'+i+'" value="'+esc(q.options?.[i]||'')+'" placeholder="Opção '+optionLabel(i)+'">').join('')}</div><label class="skm-label">Resposta correta<select class="skm-select" id="editCorrect">${[0,1,2,3].map(i=>'<option value="'+i+'" '+(Number(q.correct)===i?'selected':'')+'>'+optionLabel(i)+'</option>').join('')}</select></label><div class="skm-actions"><button class="skm-btn skm-primary" onclick="saveXpQuestion(\''+esc(id)+'\')">💾 Salvar alterações</button><button class="skm-btn skm-secondary" onclick="loadManager()">Cancelar</button></div></div></div>');
  };
  window.saveXpQuestion=async function(id){
    try{
      const r=ranges.find(x=>x.min===Number($('#editRange').value))||ranges[0];
      const options=[0,1,2,3].map(i=>inputValue('editOpt'+i));
      if(!inputValue('editText')||options.some(x=>!x))throw new Error('Preencha a pergunta e as 4 alternativas.');
      const tokenLocal=localStorage.getItem('sorokiba_token');
      const resp=await fetch('/api/mayor/questions/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokenLocal},body:JSON.stringify({jobId:$('#editJob').value,text:inputValue('editText'),options,correct:Number($('#editCorrect').value),difficulty:r.level,xpMin:r.min,xpMax:r.max})});
      const data=await resp.json().catch(()=>({}));if(!resp.ok)throw new Error(data.error||'Não foi possível salvar.');
      toast(data.message||'Pergunta atualizada!');await loadManager();
    }catch(e){toast(e.message,'error')}
  };
  const original=window.manageQuestions;
  if(typeof original!=='function'||original.__xpOrganized)return;
  const wrapped=function(){loadManager()};wrapped.__xpOrganized=true;window.manageQuestions=wrapped;
  const wait=setInterval(()=>{if(typeof window.manageQuestions==='function'){clearInterval(wait);addStyles();}},100);
  document.querySelectorAll('.password-toggle').forEach(function(button){button.remove()});
  document.querySelectorAll('.password-wrap').forEach(function(wrap){wrap.style.display='block'});
})();`;

function transformServer(content){
  const userMarker="const createUser=(name,username,password,isMayor=false,recoveryCode='')=>({";
  if(content.includes(userMarker)&&!content.includes('professionalXpByJob:{estudante:0}')){
    content=content.replace(userMarker,userMarker+'professionalXpByJob:{estudante:0},');
  }

  const helperMarker="const createMission=(jobId,username)=>";
  if(content.includes(helperMarker)&&!content.includes('PROFESSION_XP_RANGES')){
    const helpers=`const PROFESSION_XP_RANGES=[{level:1,min:0,max:100,difficulty:1,label:'Fácil'},{level:2,min:100,max:200,difficulty:2,label:'Médio'},{level:3,min:200,max:400,difficulty:3,label:'Difícil'},{level:4,min:400,max:700,difficulty:4,label:'Muito difícil'},{level:5,min:700,max:1000,difficulty:5,label:'Avançado'},{level:6,min:1000,max:null,difficulty:6,label:'Especialista'}];\nconst getProfessionXp=(user,jobId=user.jobId)=>{user.professionalXpByJob=user.professionalXpByJob||{};const v=Number(user.professionalXpByJob[jobId]);return Number.isFinite(v)?v:Number(user.xp)||0};\nconst getProfessionLevelByXp=xp=>{const n=Math.max(0,Number(xp)||0);return PROFESSION_XP_RANGES.find(r=>n>=r.min&&(r.max===null||n<r.max))||PROFESSION_XP_RANGES[5]};\n`;
    content=content.replace(helperMarker,helpers+helperMarker);
  }

  const missionMarker='const jobQuestions=(questionBank[jobId]&&questionBank[jobId].length?questionBank[jobId]:questionBank.generic).slice();';
  if(content.includes(missionMarker)&&!content.includes('professionXpForMission')){
    const replacement=missionMarker+`const professionXpForMission=getProfessionXp(users[username]||{},jobId);const professionRangeForMission=getProfessionLevelByXp(professionXpForMission);const tagged=jobQuestions.filter(q=>q.xpMin!==undefined||q.xpMax!==undefined);const compatible=tagged.filter(q=>professionXpForMission>=Number(q.xpMin||0)&&(q.xpMax===null||q.xpMax===undefined||professionXpForMission<Number(q.xpMax)));if(compatible.length) { jobQuestions.length=0; jobQuestions.push(...compatible); }`;
    content=content.replace(missionMarker,replacement);
  }

  const answeredMarker='const answered=(users[username]&&users[username].answeredQuestions)||[];let pool=jobQuestions.filter(q=>!answered.includes(q.id));if(pool.length<(cfg.questionsPerMission||2))pool=jobQuestions.slice();';
  if(content.includes(answeredMarker)&&!content.includes('questionUsageForMission')){
    const replacement=`const answered=(users[username]&&users[username].answeredQuestions)||[];const questionUsageForMission=((users[username]&&users[username].questionUsage)||{});let pool=jobQuestions.filter(q=>Number(questionUsageForMission[q.id]||0)<2);if(pool.length<(cfg.questionsPerMission||2)){const minUsage=Math.min(...jobQuestions.map(q=>Number(questionUsageForMission[q.id]||0)));pool=jobQuestions.filter(q=>Number(questionUsageForMission[q.id]||0)===minUsage)};`;
    content=content.replace(answeredMarker,replacement);
  }

  const chosenMarker='for(let i=0;i<n;i++)chosen.push(poolCopy.splice(Math.floor(Math.random()*poolCopy.length),1)[0]);';
  if(content.includes(chosenMarker)&&!content.includes('questionUsageForMissionAfterPick')){
    const replacement=chosenMarker+`const questionUsageForMissionAfterPick=(users[username]&&users[username].questionUsage)||{};if(users[username]){users[username].questionUsage=questionUsageForMissionAfterPick;chosen.forEach(q=>{questionUsageForMissionAfterPick[q.id]=Number(questionUsageForMissionAfterPick[q.id]||0)+1});}`;
    content=content.replace(chosenMarker,replacement);
  }

  const xpLine='req.user.xp=(req.user.xp||0)+Math.max(1,Math.floor((m.rewardXp||20)/m.questions.length));';
  if(content.includes(xpLine)&&!content.includes('professionalXpByJob[jobIdForXp]')){
    const replacement=`const jobIdForXp=req.user.jobId;req.user.professionalXpByJob=req.user.professionalXpByJob||{};const xpGained=Math.max(1,Math.floor((m.rewardXp||20)/m.questions.length));req.user.professionalXpByJob[jobIdForXp]=getProfessionXp(req.user,jobIdForXp)+xpGained;req.user.xp=(req.user.xp||0)+xpGained;`;
    content=content.replace(xpLine,replacement);
  }

  const mayorPost='const q={\n   id:`q_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,\n   text,\n   options,\n   correct:Number(correct)||0,\n   difficulty:Number(difficulty)||1\n };';
  if(content.includes(mayorPost)&&!content.includes('xpMin:Number(xpMin)')){
    content=content.replace(mayorPost,'const q={\n   id:`q_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,\n   text,\n   options,\n   correct:Number(correct)||0,\n   difficulty:Number(difficulty)||1,\n   xpMin:xpMin===undefined?null:Number(xpMin),\n   xpMax:xpMax===undefined?null:(xpMax===null?null:Number(xpMax))\n };');
  }

  const mayorPutMarker="if(req.body.difficulty!==undefined)q.difficulty=Number(req.body.difficulty);saveData();";
  if(content.includes(mayorPutMarker)&&!content.includes('req.body.xpMin!==undefined')){
    content=content.replace(mayorPutMarker,"if(req.body.difficulty!==undefined)q.difficulty=Number(req.body.difficulty);if(req.body.xpMin!==undefined)q.xpMin=req.body.xpMin===null?null:Number(req.body.xpMin);if(req.body.xpMax!==undefined)q.xpMax=req.body.xpMax===null?null:Number(req.body.xpMax);saveData();");
  }

  const mayorGetMarker='res.json(allQuestions())';
  if(content.includes(mayorGetMarker)&&!content.includes('professionLevel')){
    const replacement='res.json(allQuestions().map(q=>{const r=q.xpMin===undefined||q.xpMin===null?null:PROFESSION_XP_RANGES.find(x=>x.min===Number(q.xpMin));return{...q,professionLevel:r?r.level:null,difficultyLabel:r?r.label:null,xpMin:q.xpMin===undefined?null:q.xpMin,xpMax:q.xpMax===undefined?null:q.xpMax}}))';
    content=content.replace(mayorGetMarker,replacement);
  }

  const staticLine='app.use(express.static(path.join(__dirname)));';
  const inject=`app.use((req,res,next)=>{if(req.path==='/'||req.path==='/index.html'){const oldEnd=res.end;res.end=function(chunk,...args){if(chunk){let text=Buffer.isBuffer(chunk)?chunk.toString('utf8'):String(chunk);if(text.includes('</body>')){text=text.replace('</body>','<script src="/difficulty-ui.js"></script></body>');chunk=text}}return oldEnd.call(this,chunk,...args)}}next()});\napp.get('/difficulty-ui.js',(req,res)=>{res.type('application/javascript').send(${JSON.stringify(UI)})});\n${staticLine}`;
  if(content.includes(staticLine) && !content.includes("app.get('/difficulty-ui.js'"))content=content.replace(staticLine,inject);
  return content;
}

Module.prototype._compile=function(content,filename){
  if(filename.endsWith('/server.js'))content=transformServer(content);
  return originalCompile.call(this,content,filename);
};
