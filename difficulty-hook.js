const Module = require('module');
const originalCompile = Module.prototype._compile;

const UI = `
(function(){
  const ranges=[
    {min:0,max:100,label:'XP 0–100 — Fácil',difficulty:1},
    {min:101,max:200,label:'XP 100–200 — Médio',difficulty:2},
    {min:201,max:400,label:'XP 200–400 — Difícil',difficulty:3},
    {min:401,max:700,label:'XP 400–700 — Muito difícil',difficulty:4},
    {min:701,max:1000,label:'XP 700–1000 — Avançado',difficulty:5},
    {min:1001,max:null,label:'XP 1000+ — Especialista',difficulty:6}
  ];
  function rangeOptions(selected){return ranges.map(r=>'<option value="'+r.min+'" '+(Number(selected)===r.min?'selected':'')+'>'+r.label+'</option>').join('');}
  function install(){
    if(typeof window.manageQuestions!=='function' || window.manageQuestions.__xpRanges)return;
    async function wrapped(){
      try{
        const qs=await api('/api/mayor/questions');
        const jobsList=await api('/api/jobs');
        const jobOptions=jobsList.jobs.map(j=>'<option value="'+j.id+'">'+esc(j.name)+'</option>').join('');
        const listHtml=qs.map(q=>{
          const r=ranges.find(x=>Number(q.xpMin)===x.min)||null;
          return '<div class="panel" style="margin-bottom:10px"><b>'+esc(q.text)+'</b><div><small>'+esc(q.jobId||'')+' • '+esc(r?r.label:'Faixa antiga')+'</small></div></div>';
        }).join('') || '<p>Nenhuma pergunta cadastrada.</p>';
        openModal('<h2>Gerenciar perguntas</h2><p>A dificuldade usa o XP da profissão, não o nível da conta.</p><label>Profissão<select id="xpQuestionJob">'+jobOptions+'</select></label><label>Faixa de XP da profissão<select id="xpQuestionRange">'+rangeOptions(0)+'</select></label><label>Pergunta<textarea id="xpQuestionText" rows="3"></textarea></label><label>Opção A<input id="xpOpt0"></label><label>Opção B<input id="xpOpt1"></label><label>Opção C<input id="xpOpt2"></label><label>Opção D<input id="xpOpt3"></label><label>Resposta correta<select id="xpCorrect"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label><button class="primary" onclick="createXpQuestion()">Criar pergunta</button><hr><h3>Perguntas existentes</h3>'+listHtml);
      }catch(e){toast(e.message,'error')}
    }
    wrapped.__xpRanges=true;
    window.manageQuestions=wrapped;
    window.createXpQuestion=async function(){
      try{
        const r=ranges.find(x=>x.min===Number($('#xpQuestionRange').value));
        const d=await post('/api/mayor/questions',{jobId:$('#xpQuestionJob').value,text:$('#xpQuestionText').value,options:[$('#xpOpt0').value,$('#xpOpt1').value,$('#xpOpt2').value,$('#xpOpt3').value],correct:Number($('#xpCorrect').value),difficulty:r.difficulty,xpMin:r.min,xpMax:r.max});
        toast(d.message||'Pergunta criada!');closeModal();
      }catch(e){toast(e.message,'error')}
    };
  }
  const wait=setInterval(()=>{if(typeof window.manageQuestions==='function'){clearInterval(wait);install()}},100);
})();`;

function transformServer(content){
  const marker = 'const jobQuestions=(questionBank[jobId]&&questionBank[jobId].length?questionBank[jobId]:questionBank.generic).slice();';
  const replacement = marker + `const jobXp=Number((users[username]&&users[username].xp)||0);const compatibleQuestions=jobQuestions.filter(q=>q.xpMin==null||(jobXp>=Number(q.xpMin)&&(q.xpMax==null||jobXp<=Number(q.xpMax))));if(compatibleQuestions.length) { jobQuestions.length=0; jobQuestions.push(...compatibleQuestions); }`;
  if(content.includes(marker) && !content.includes('const compatibleQuestions=jobQuestions.filter')) content=content.replace(marker,replacement);

  const staticLine='app.use(express.static(path.join(__dirname)));';
  const inject=`app.use((req,res,next)=>{if(req.path==='/'||req.path==='/index.html'){const oldEnd=res.end;res.end=function(chunk,...args){if(chunk){let text=Buffer.isBuffer(chunk)?chunk.toString('utf8'):String(chunk);if(text.includes('</body>')){text=text.replace('</body>','<script src="/difficulty-ui.js"></script></body>');chunk=text}}return oldEnd.call(this,chunk,...args)}}next()});\napp.get('/difficulty-ui.js',(req,res)=>{res.type('application/javascript').send(${JSON.stringify(UI)})});\n${staticLine}`;
  if(content.includes(staticLine) && !content.includes("/difficulty-ui.js")) content=content.replace(staticLine,inject);
  return content;
}

Module.prototype._compile=function(content,filename){
  if(filename.endsWith('/server.js')) content=transformServer(content);
  return originalCompile.call(this,content,filename);
};
