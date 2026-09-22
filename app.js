/* Temporary recovery loader for develop only. Restores the last verified app.js while the direct patch is repaired. */
(async()=>{
  const src='https://raw.githubusercontent.com/elisonchen2013-tech/Sorokiba-/22376d66a3b3d839432b9bd9e93b0657d79ad22b/app.js';
  try{
    const r=await fetch(src,{cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao recuperar app.js');
    const code=await r.text();
    code=code.replace('if(page===\"job\")return jobPage(box);','if(page===\"job\")return (window.jobPage||jobPage)(box);').replace('if(page===\"mayor\")return mayorPage(box);','if(page===\"mayor\")return (window.mayorPage||mayorPage)(box);');
    const run=new Function(code+'\nwindow.__sorokibaExports={nav,selectJob,startMission,openMissionModal,answerMission,closeMissionModal,closeModal,useItem,openBuyModal,confirmBuy,treat,bankModal,doBank,playerProfile,proposalModal,decideProposal,sendProposal,finishDecision,saveMayor,mayorContent,manageQuestions,manageRewards,publishNews,publishEvent,editQuestion,deleteQuestion,addQuestion,saveQuestion,saveRewards};\n//# sourceURL=sorokiba-app-restored.js');
    run();
    Object.assign(window,window.__sorokibaExports||{});
    const loadKibaPresentation=()=>{if(document.getElementById('kibaPresentationAutoLoader'))return;const s=document.createElement('script');s.id='kibaPresentationAutoLoader';s.src='kiba-presentation-auto.js?v=8';s.async=false;s.onload=()=>console.log('[Sorokiba] Kiba presentation loader conectado.');s.onerror=e=>console.error('[Sorokiba] Falha ao carregar apresentação do Kiba.',e);document.body.appendChild(s)};
    setTimeout(loadKibaPresentation,600);
  }catch(e){
    console.error(e);
    const loader=document.querySelector('#loader');
    if(loader)loader.classList.add('hidden');
    const content=document.querySelector('#content');
    if(content)content.innerHTML='<div class="empty"><div>⚠️</div><h3>Não foi possível carregar</h3><p>Falha ao restaurar o aplicativo.</p></div>';
  }
})();
