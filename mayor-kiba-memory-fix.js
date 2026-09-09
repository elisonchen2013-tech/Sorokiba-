(function(){
  'use strict';
  if(window.__mayorKibaMemoryFix)return;
  window.__mayorKibaMemoryFix=true;

  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const apiK=(url,opt)=>{
    opt=opt||{};
    opt.headers=Object.assign({'Content-Type':'application/json'},opt.headers||{},{Authorization:'Bearer '+(localStorage.getItem('sorokiba_token')||'')});
    return fetch(url,opt).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erro ao acessar a memória do Kiba.');return d;});
  };

  let memoryCache=[];
  let memorySearch='';
  let memoryCategory='all';

  function styles(){
    if(document.getElementById('kibaMemoryStylesV2'))return;
    const s=document.createElement('style');
    s.id='kibaMemoryStylesV2';
    s.textContent=`
      #kibaMemoryBox{width:min(1120px,calc(100vw - 42px));max-height:84vh;overflow:auto;padding:4px 2px 18px;color:#edf2ff}
      .km2-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:20px}
      .km2-head h2{font-size:32px;line-height:1.05;margin:6px 0 7px;letter-spacing:-.8px}
      .km2-head p{margin:0;color:#9da9c2;font-size:14px;line-height:1.5;max-width:720px}
      .km2-head-badge{padding:9px 12px;border:1px solid rgba(118,87,255,.25);background:rgba(118,87,255,.09);border-radius:12px;color:#c8c0ff;font-size:11px;font-weight:800;white-space:nowrap}
      .km2-layout{display:grid;grid-template-columns:minmax(330px,390px) minmax(0,1fr);gap:16px;align-items:start}
      .km2-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:19px}
      .km2-card-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      .km2-card-title h3{margin:0;font-size:18px}
      .km2-card-title p{margin:4px 0 0;color:#7f8ba5;font-size:12px;line-height:1.45}
      .km2-label{display:block;margin:14px 0 6px;color:#aeb9d0;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
      .km2-input,.km2-select,.km2-textarea{width:100%;box-sizing:border-box;background:#111a2c!important;color:#edf2ff!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:10px;padding:11px 12px;font:inherit;font-size:14px;outline:none}
      .km2-input:focus,.km2-select:focus,.km2-textarea:focus{border-color:#7657ff!important;box-shadow:0 0 0 3px rgba(118,87,255,.12)}
      .km2-select{cursor:pointer}
      .km2-textarea{min-height:155px;resize:vertical;line-height:1.55}
      .km2-help{color:#7f8ba5;font-size:11px;line-height:1.45}
      .km2-counter{text-align:right;margin-top:5px}
      .km2-save{width:100%;margin-top:13px!important;padding:13px!important}
      .km2-tip{display:flex;gap:9px;align-items:flex-start;margin-top:12px;padding:11px 12px;border-radius:11px;background:rgba(118,87,255,.07);border:1px solid rgba(118,87,255,.12);color:#aeb8ce;font-size:11px;line-height:1.5}
      .km2-tip strong{display:block;color:#d9d4ff;margin-bottom:2px}
      .km2-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:9px;margin-bottom:13px}
      .km2-search{position:relative}
      .km2-search span{position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:.55;font-size:14px;pointer-events:none}
      .km2-search input{padding-left:34px}
      .km2-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px}
      .km2-stat{padding:10px 11px;border-radius:11px;background:rgba(255,255,255,.028);border:1px solid rgba(255,255,255,.065)}
      .km2-stat strong{display:block;font-size:17px}
      .km2-stat span{display:block;margin-top:2px;color:#7f8ba5;font-size:10px}
      .km2-list{display:flex;flex-direction:column;gap:9px;max-height:55vh;overflow:auto;padding-right:2px}
      .km2-item{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:14px;padding:14px;transition:transform .18s ease,border-color .18s ease,background .18s ease}
      .km2-item:hover{transform:translateY(-1px);border-color:rgba(118,87,255,.28);background:rgba(118,87,255,.035)}
      .km2-item-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
      .km2-category{display:inline-flex;align-items:center;gap:5px;background:rgba(118,87,255,.13);color:#bdb4ff;border-radius:999px;padding:5px 9px;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
      .km2-item h4{margin:9px 0 5px;color:#f0f3ff;font-size:15px}
      .km2-item p{margin:0;color:#aeb8cc;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
      .km2-item-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px}
      .km2-item-footer small{color:#68758e;font-size:10px}
      .km2-delete{margin:0!important;font-size:11px!important;padding:7px 9px!important}
      .km2-empty{text-align:center;padding:34px 15px;border:1px dashed rgba(255,255,255,.1);border-radius:14px;color:#7f8ba5}
      .km2-empty strong{display:block;color:#dfe5f4;font-size:15px;margin-bottom:5px}
      .km2-preview{margin-top:14px;padding:13px;border-radius:13px;background:linear-gradient(135deg,rgba(118,87,255,.10),rgba(255,255,255,.025));border:1px solid rgba(118,87,255,.14)}
      .km2-preview-head{display:flex;align-items:center;gap:8px;margin-bottom:7px;color:#c9c2ff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .km2-preview-text{color:#d2d7e6;font-size:12px;line-height:1.55}
      @media(max-width:800px){#kibaMemoryBox{width:calc(100vw - 28px)}.km2-layout{grid-template-columns:1fr}.km2-list{max-height:none}.km2-head{display:block}.km2-head-badge{display:inline-block;margin-top:12px}.km2-toolbar{grid-template-columns:1fr}.km2-summary{grid-template-columns:repeat(3,1fr)}}
      @media(max-width:480px){.km2-card{padding:15px}.km2-head h2{font-size:27px}.km2-summary{grid-template-columns:1fr 1fr}.km2-stat:last-child{grid-column:1/-1}}
    `;
    document.head.appendChild(s);
  }

  function categoryIcon(cat){
    const c=String(cat||'').toLowerCase();
    if(c.includes('person')||c.includes('jogador'))return '👤';
    if(c.includes('jogo')||c.includes('projeto'))return '🎮';
    if(c.includes('hist'))return '📖';
    if(c.includes('item')||c.includes('obj'))return '🎒';
    if(c.includes('local')||c.includes('cidade'))return '📍';
    if(c.includes('evento')||c.includes('atual'))return '📅';
    return '🧠';
  }

  function filteredMemories(){
    const q=memorySearch.toLowerCase().trim();
    return memoryCache.filter(x=>{
      const cat=String(x.category||'Geral');
      const matchesCat=memoryCategory==='all'||cat.toLowerCase()===memoryCategory.toLowerCase();
      const hay=(String(x.title||'')+' '+cat+' '+String(x.content||'')).toLowerCase();
      return matchesCat&&(!q||hay.includes(q));
    });
  }

  function updatePreview(){
    const title=document.getElementById('fixKibaTitle')?.value.trim()||'essa informação';
    const content=document.getElementById('fixKibaText')?.value.trim();
    const out=document.getElementById('fixKibaPreviewText');
    if(!out)return;
    if(!content){out.textContent='Digite uma informação para visualizar como o Kiba pode explicá-la de forma natural.';return;}
    const clean=content.replace(/\s+/g,' ').trim();
    const short=clean.length>240?clean.slice(0,237)+'...':clean;
    out.textContent=`"${title}" parece importante. Pelo que você me ensinou, ${short.charAt(0).toLowerCase()+short.slice(1)}. Vou usar esse conhecimento para explicar o assunto de forma natural quando ele for relevante.`;
  }

  function renderList(){
    const list=document.getElementById('fixKibaList');
    const count=document.getElementById('fixKibaCount');
    const stats=document.getElementById('fixKibaStats');
    if(!list)return;
    const filtered=filteredMemories();
    const categories=new Set(memoryCache.map(x=>String(x.category||'Geral').trim().toLowerCase()).filter(Boolean));
    if(count)count.textContent=filtered.length===memoryCache.length?`${memoryCache.length} ${memoryCache.length===1?'memória':'memórias'}`:`${filtered.length} de ${memoryCache.length}`;
    if(stats)stats.innerHTML=`<div class="km2-stat"><strong>${memoryCache.length}</strong><span>Total</span></div><div class="km2-stat"><strong>${categories.size}</strong><span>Categorias</span></div><div class="km2-stat"><strong>${filtered.length}</strong><span>Exibidas</span></div>`;
    const select=document.getElementById('fixKibaFilter');
    if(select){
      const current=memoryCategory;
      const cats=[...new Set(memoryCache.map(x=>String(x.category||'Geral').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      select.innerHTML='<option value="all">Todas as categorias</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
      select.value=cats.some(c=>c.toLowerCase()===current.toLowerCase())?current:'all';
    }
    if(!filtered.length){
      list.innerHTML=memoryCache.length?'<div class="km2-empty"><strong>Nenhuma memória encontrada</strong>Tente outra palavra ou categoria.</div>':'<div class="km2-empty"><strong>Nenhuma memória cadastrada</strong>Ensine a primeira informação usando o formulário ao lado.</div>';
      return;
    }
    list.innerHTML=filtered.map(x=>`<article class="km2-item"><div class="km2-item-top"><span class="km2-category">${categoryIcon(x.category)} ${esc(x.category||'Geral')}</span></div><h4>${esc(x.title||'Sem título')}</h4><p>${esc(x.content||'')}</p><div class="km2-item-footer"><small>Conhecimento disponível para o Kiba</small><button class="ghost km2-delete" onclick="window.__deleteFixKiba('${esc(x.id)}')">🗑️ Remover</button></div></article>`).join('');
  }

  async function load(){
    const el=document.getElementById('fixKibaList');
    if(!el)return;
    el.innerHTML='<div class="km2-empty">Carregando memórias...</div>';
    try{
      const d=await apiK('/api/kiba/knowledge');
      memoryCache=Array.isArray(d.knowledge)?d.knowledge:[];
      renderList();
    }catch(e){
      el.innerHTML='<div class="km2-empty"><strong>Não foi possível carregar</strong>'+esc(e.message)+'<br><button class="primary" style="margin-top:12px" onclick="window.__loadFixKiba()">Tentar novamente</button></div>';
    }
  }

  function open(){
    styles();
    memorySearch='';memoryCategory='all';
    const html=`<div id="kibaMemoryBox">
      <div class="km2-head">
        <div><span class="eyebrow">INTELIGÊNCIA DA CIDADE</span><h2>Memória do Kiba</h2><p>Ensine fatos ao Kiba para que ele tenha contexto e possa explicá-los naturalmente nas conversas. Você cadastra o conhecimento; o Kiba usa esse conhecimento para formar a resposta.</p></div>
        <span class="km2-head-badge">🧠 BASE DE CONHECIMENTO</span>
      </div>
      <div class="km2-layout">
        <section class="km2-card">
          <div class="km2-card-title"><div><h3>＋ Nova memória</h3><p>Cadastre o fato ou contexto que o Kiba deve conhecer.</p></div></div>
          <label class="km2-label">Título</label>
          <input id="fixKibaTitle" class="km2-input" maxlength="80" placeholder="Ex.: Aegis">
          <label class="km2-label">Categoria</label>
          <select id="fixKibaCat" class="km2-select"><option value="Geral">🧠 Geral</option><option value="Jogador">👤 Jogador</option><option value="Personagem">👤 Personagem</option><option value="Projeto">🎮 Projeto</option><option value="História">📖 História</option><option value="Item">🎒 Item</option><option value="Local">📍 Local</option><option value="Evento">📅 Evento</option></select>
          <input id="fixKibaCustomCat" class="km2-input" maxlength="40" placeholder="Ou digite uma categoria personalizada" style="display:none;margin-top:8px">
          <label class="km2-label">O que o Kiba deve saber?</label>
          <textarea id="fixKibaText" class="km2-textarea" maxlength="2000" placeholder="Escreva os fatos e o contexto. Não precisa escrever uma resposta pronta para o jogador."></textarea>
          <div class="km2-help km2-counter"><span id="fixKibaChars">0</span>/2000 caracteres</div>
          <div class="km2-tip"><span>💡</span><div><strong>Dica</strong>Escreva o conhecimento de forma objetiva. O Kiba pode usar essas informações como contexto e explicá-las com suas próprias palavras.</div></div>
          <div class="km2-preview"><div class="km2-preview-head">💬 Prévia de como o Kiba pode explicar</div><div id="fixKibaPreviewText" class="km2-preview-text">Digite uma informação para visualizar como o Kiba pode explicá-la de forma natural.</div></div>
          <button class="primary km2-save" onclick="window.__saveFixKiba()">🧠 Ensinar Kiba</button>
        </section>
        <section class="km2-card">
          <div class="km2-card-title"><div><h3>Memórias cadastradas</h3><p>Pesquise e filtre o conhecimento já ensinado.</p></div><span id="fixKibaCount" class="km2-head-badge">Carregando...</span></div>
          <div class="km2-toolbar"><div class="km2-search"><span>🔍</span><input id="fixKibaSearch" class="km2-input" placeholder="Buscar por título, categoria ou conteúdo..."></div><select id="fixKibaFilter" class="km2-select"><option value="all">Todas as categorias</option></select></div>
          <div id="fixKibaStats" class="km2-summary"></div>
          <div id="fixKibaList" class="km2-list"><div class="km2-empty">Carregando memórias...</div></div>
        </section>
      </div>
    </div>`;
    if(typeof openModal==='function')openModal(html);
    else{
      let old=document.getElementById('fixKibaOverlay');if(old)old.remove();
      const o=document.createElement('div');o.id='fixKibaOverlay';o.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(2,6,18,.92);overflow:auto;padding:22px';
      o.innerHTML='<div style="max-width:1160px;margin:0 auto;background:#0d1424;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:22px;color:#eef2ff"><button style="float:right" onclick="this.closest(\'#fixKibaOverlay\').remove()">✕</button>'+html+'</div>';
      document.body.appendChild(o);
    }
    const text=document.getElementById('fixKibaText');
    const title=document.getElementById('fixKibaTitle');
    const cat=document.getElementById('fixKibaCat');
    const custom=document.getElementById('fixKibaCustomCat');
    if(text)text.addEventListener('input',()=>{const c=document.getElementById('fixKibaChars');if(c)c.textContent=text.value.length;updatePreview()});
    if(title)title.addEventListener('input',updatePreview);
    if(cat)cat.addEventListener('change',()=>{custom.style.display=cat.value==='__custom'?'block':'none'});
    if(cat){const customOpt=document.createElement('option');customOpt.value='__custom';customOpt.textContent='✏️ Personalizada';cat.appendChild(customOpt)}
    const search=document.getElementById('fixKibaSearch');if(search)search.oninput=()=>{memorySearch=search.value;renderList()};
    const filter=document.getElementById('fixKibaFilter');if(filter)filter.onchange=()=>{memoryCategory=filter.value;renderList()};
    load();
  }

  window.__loadFixKiba=load;
  window.__openFixKiba=open;
  window.__saveFixKiba=async function(){
    try{
      const title=document.getElementById('fixKibaTitle')?.value.trim();
      const cat=document.getElementById('fixKibaCat')?.value||'Geral';
      const custom=document.getElementById('fixKibaCustomCat')?.value.trim();
      const category=cat==='__custom'?(custom||'Geral'):cat;
      const content=document.getElementById('fixKibaText')?.value.trim();
      if(!title||!content){toast('Preencha o título e o que o Kiba deve saber.','error');return}
      await apiK('/api/kiba/knowledge',{method:'POST',body:JSON.stringify({title,category,content})});
      toast('Kiba aprendeu essa informação!');
      document.getElementById('fixKibaTitle').value='';
      document.getElementById('fixKibaCat').value='Geral';
      document.getElementById('fixKibaCustomCat').value='';
      document.getElementById('fixKibaCustomCat').style.display='none';
      document.getElementById('fixKibaText').value='';
      const c=document.getElementById('fixKibaChars');if(c)c.textContent='0';
      updatePreview();
      load();
    }catch(e){toast(e.message,'error')}
  };
  window.__deleteFixKiba=async function(id){
    if(!confirm('Remover esta informação da memória do Kiba?'))return;
    try{await apiK('/api/kiba/knowledge/'+encodeURIComponent(id),{method:'DELETE'});toast('Informação removida.');load();}
    catch(e){toast(e.message,'error')}
  };
  window.openKibaMemory=open;

  function bind(){
    document.querySelectorAll('button,a,[role="button"],.card,.panel-card').forEach(e=>{
      if(e.dataset.kibaBound)return;
      if(/memória do kiba/i.test(e.textContent||'')){
        e.dataset.kibaBound='1';
        e.addEventListener('click',function(ev){ev.preventDefault();ev.stopImmediatePropagation();open()},true);
      }
    });
  }
  function install(){
    bind();
    if(typeof window.mayorSection==='function'){
      const old=window.mayorSection;
      if(!old.__kibaMemoryFixed){
        const wrap=function(type){if(type==='kiba')return open();return old.apply(this,arguments)};
        wrap.__kibaMemoryFixed=true;
        window.mayorSection=wrap;
      }
    }
    setTimeout(install,700);
  }
  install();
  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();