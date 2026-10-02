(function(){
'use strict';
window.hospitalPageV2=async function(box){
 try{const d=await api('/api/hospital');renderHospital(box,d);}
 catch(e){box.innerHTML='<div class="empty"><h3>Hospital</h3><p>'+esc(e.message)+'</p></div>';}
};
function renderHospital(box,d){
 const v=d.health||{},visit=d.visit,exams=d.exams||[],pending=exams.filter(e=>e.status==='pending'),ready=exams.filter(e=>e.status!=='pending');
 box.innerHTML='<div class="hosp"><div class="hosp-top"><div>Vida <b>'+v.life+'</b></div><div>Fome <b>'+v.hunger+'</b></div><div>Hidratação <b>'+v.hydration+'</b></div><div>Energia <b>'+v.energy+'</b></div><div>Exames pendentes <b>'+pending.length+'</b></div></div>'+
 '<div class="hosp-scene"><div class="hosp-person"><div class="hosp-head"></div><div class="hosp-body"></div><div class="hosp-arm"></div></div><div><small>ATENDIMENTO</small><h2>Hospital</h2><p>O profissional analisa as informações do atendimento antes de seguir.</p><p class="hosp-thinking">Estado: '+esc(d.conversation?.animation||'analisando')+'</p></div></div>'+
 '<div class="hosp-grid"><section class="hosp-panel"><h3>Atendimento</h3><div class="hosp-actions">'+
 (!visit?'<button class="primary" onclick="hospitalDo(\'checkin\')">Fazer check-in</button>':'')+
 (visit&&!visit.triage?'<button class="primary" onclick="hospitalDo(\'triage\')">Fazer triagem</button>':'')+
 (visit?'<button class="ghost" onclick="hospitalTalk(\'describe_symptoms\')">Informar sintomas</button><button class="ghost" onclick="hospitalTalk(\'ask_about_exams\')">Perguntar sobre exames</button>':'')+
 (visit&&!pending.length?'<button class="ghost" onclick="hospitalDo(\'discharge\')">Finalizar atendimento</button>':'')+
 '</div></section><section class="hosp-panel"><h3>Exames</h3><div class="hosp-exams">'+[
 ['sangue','Exame de sangue','60'],['urina','Exame de urina','40'],['glicose','Glicose','25'],['pressao','Pressão arterial','15'],['temperatura','Temperatura','10'],['colesterol','Colesterol','55'],['vitaminas','Vitaminas','90']
 ].map(x=>'<button onclick="hospitalExam(\''+x[0]+'\')"><b>'+x[1]+'</b><small>R$ '+x[2]+' · resultado em 1–2 horas</small></button>').join('')+'</div>'+
 '<div class="hosp-list">'+pending.map(e=>'<article><b>'+esc(e.name)+'</b><span>Aguardando até '+new Date(e.readyAt).toLocaleString('pt-BR')+'</span></article>').join('')+
 ready.map(e=>'<article><b>'+esc(e.name)+'</b><span>'+esc(e.status==='reviewed'?'Analisado':'Pronto')+'</span><button class="ghost" onclick="hospitalReview(\''+e.id+'\')">Ver resultado</button></article>').join('')+'</div></section></div></div>';
}
window.hospitalDo=async function(action){try{const d=await post('/api/hospital/'+action,{});const md=await api('/api/me');me=md.user;updateHUD();toast(d.message||'Concluído');renderHospital($('#content'),d);}catch(e){toast(e.message,'error');}};
window.hospitalTalk=async function(intent){try{const d=await post('/api/hospital/talk',{intent});renderHospital($('#content'),d);}catch(e){toast(e.message,'error');}};
window.hospitalExam=async function(type){try{const d=await post('/api/hospital/exams',{type});const md=await api('/api/me');me=md.user;updateHUD();toast(d.message||'Exame solicitado');renderHospital($('#content'),d);}catch(e){toast(e.message,'error');}};
window.hospitalReview=async function(id){try{const d=await post('/api/hospital/exams/'+encodeURIComponent(id)+'/review',{});renderHospital($('#content'),d);if(d.exam)openModal('<h3>'+esc(d.exam.name)+'</h3><pre class="hosp-result">'+esc(JSON.stringify(d.exam.result?.values||{},null,2))+'</pre>');}catch(e){toast(e.message,'error');}};
})();