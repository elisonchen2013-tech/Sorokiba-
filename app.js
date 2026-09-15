/* Temporary recovery loader for develop only. Restores the last verified app.js while the direct patch is repaired. */
(async()=>{
  const src='https://raw.githubusercontent.com/elisonchen2013-tech/Sorokiba-/22376d66a3b3d839432b9bd9e93b0657d79ad22b/app.js';
  try{
    const r=await fetch(src,{cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao recuperar app.js');
    const code=await r.text();
    const run=new Function(code+'\n//# sourceURL=sorokiba-app-restored.js');
    run();
  }catch(e){
    console.error(e);
    const loader=document.querySelector('#loader');
    if(loader)loader.classList.add('hidden');
    const content=document.querySelector('#content');
    if(content)content.innerHTML='<div class="empty"><div>⚠️</div><h3>Não foi possível carregar</h3><p>Falha ao restaurar o aplicativo.</p></div>';
  }
})();
