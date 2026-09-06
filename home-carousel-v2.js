(function(){
  const DURATION=14000;
  const themeFor=(slide,season)=>{
    const tag=String(slide.tag||'');
    if(tag.includes('ESTAÇÃO')){
      if(season==='VERÃO') return {icon:'☀️',name:'VERÃO',className:'summer',decor:'☀️  ✦  🌤️',note:'Dias quentes e céu aberto'};
      if(season==='INVERNO') return {icon:'❄️',name:'INVERNO',className:'winter',decor:'❄️  ✦  🌨️',note:'Ar frio e noites tranquilas'};
      if(season==='OUTONO') return {icon:'🍂',name:'OUTONO',className:'autumn',decor:'🍂  ✦  🌰',note:'Folhas caindo pela cidade'};
      return {icon:'🌸',name:'PRIMAVERA',className:'spring',decor:'🌸  ✦  🌿',note:'A cidade está florescendo'};
    }
    if(tag.includes('SOROKIBA ONLINE')) return {icon:'🌅',className:'morning',decor:'✦  ☁️  ✦',note:'Um novo dia começa'};
    if(tag.includes('VIDA NA CIDADE')) return {icon:'🏙️',className:'city',decor:'🏙️  ✦  🏢',note:'A cidade está viva'};
    if(tag.includes('NOVOS OBJETIVOS')) return {icon:'🎯',className:'goals',decor:'✦  ◆  ✦',note:'Novas conquistas esperam por você'};
    if(tag.includes('SUA CARREIRA')) return {icon:'💼',className:'career',decor:'💼  ✦  ⭐',note:'Seu trabalho move Sorokiba'};
    return {icon:'✨',className:'future',decor:'✦  ✧  ✦',note:'Algo novo pode acontecer'};
  };
  function season(){const m=new Date().getMonth()+1;if(m===12||m<=2)return'VERÃO';if(m<=5)return'OUTONO';if(m<=8)return'INVERNO';return'PRIMAVERA';}
  function injectStyles(){if(document.getElementById('soro-carousel-v2-style'))return;const s=document.createElement('style');s.id='soro-carousel-v2-style';s.textContent=`
    .soro-home-carousel.soro-v2{background:linear-gradient(125deg,#111a2c,#151d35 55%,#10182a)!important;transition:background 1s ease}
    .soro-home-carousel.soro-v2.theme-summer{background:radial-gradient(circle at 78% 24%,rgba(255,195,70,.23),transparent 28%),linear-gradient(125deg,#18233a,#243451)!important}
    .soro-home-carousel.soro-v2.theme-winter{background:radial-gradient(circle at 80% 22%,rgba(130,190,255,.23),transparent 30%),linear-gradient(125deg,#101b30,#17283e)!important}
    .soro-home-carousel.soro-v2.theme-autumn{background:radial-gradient(circle at 80% 22%,rgba(210,126,65,.22),transparent 30%),linear-gradient(125deg,#241b28,#31242b)!important}
    .soro-home-carousel.soro-v2.theme-spring{background:radial-gradient(circle at 80% 22%,rgba(238,145,201,.20),transparent 30%),linear-gradient(125deg,#18242d,#202b38)!important}
    .soro-home-carousel.soro-v2.theme-morning{background:radial-gradient(circle at 78% 24%,rgba(255,218,139,.20),transparent 30%),linear-gradient(125deg,#172038,#26344d)!important}
    .soro-home-carousel.soro-v2.theme-city{background:radial-gradient(circle at 80% 30%,rgba(102,142,255,.20),transparent 32%),linear-gradient(125deg,#11182b,#18243b)!important}
    .soro-home-carousel.soro-v2.theme-goals{background:radial-gradient(circle at 78% 28%,rgba(159,113,255,.24),transparent 30%),linear-gradient(125deg,#16162e,#211c3c)!important}
    .soro-home-carousel.soro-v2.theme-career{background:radial-gradient(circle at 78% 28%,rgba(45,207,172,.18),transparent 30%),linear-gradient(125deg,#111e2d,#172e32)!important}
    .soro-home-carousel.soro-v2.theme-future{background:radial-gradient(circle at 78% 28%,rgba(188,137,255,.22),transparent 30%),linear-gradient(125deg,#17162e,#20203c)!important}
    .soro-home-carousel.soro-v2 .soro-carousel-progress{display:none!important}
    .soro-v2 .soro-carousel-dots{bottom:30px}
    .soro-v2 .soro-carousel-theme-decor{position:absolute;right:7%;top:50%;transform:translateY(-50%);z-index:3;width:270px;height:190px;display:flex;align-items:center;justify-content:center;font-size:24px;letter-spacing:16px;opacity:.78;text-shadow:0 0 25px rgba(255,255,255,.28);animation:soroThemeFloat 5s ease-in-out infinite;pointer-events:none}
    .soro-v2 .soro-carousel-theme-decor:before{content:"";position:absolute;width:185px;height:185px;border:1px solid rgba(255,255,255,.13);border-radius:50%;box-shadow:0 0 70px rgba(150,130,255,.12),inset 0 0 50px rgba(255,255,255,.03)}
    .soro-v2 .soro-carousel-theme-decor:after{content:"";position:absolute;width:115px;height:115px;border:1px dashed rgba(255,255,255,.12);border-radius:50%;animation:soroThemeSpin 18s linear infinite}
    .soro-v2 .soro-carousel-theme-note{position:absolute;right:7%;bottom:55px;z-index:4;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(220,227,245,.58)}
    .soro-v2.theme-summer .soro-carousel-theme-decor{filter:drop-shadow(0 0 16px rgba(255,205,90,.3))}
    .soro-v2.theme-winter .soro-carousel-theme-decor{filter:drop-shadow(0 0 16px rgba(130,200,255,.35))}
    .soro-v2.theme-autumn .soro-carousel-theme-decor{filter:drop-shadow(0 0 16px rgba(220,140,70,.3))}
    .soro-v2.theme-spring .soro-carousel-theme-decor{filter:drop-shadow(0 0 16px rgba(240,150,205,.3))}
    .soro-v2.theme-city .soro-carousel-theme-decor{filter:drop-shadow(0 0 18px rgba(100,145,255,.3))}
    .soro-v2.theme-goals .soro-carousel-theme-decor{filter:drop-shadow(0 0 18px rgba(170,120,255,.35))}
    .soro-v2.theme-career .soro-carousel-theme-decor{filter:drop-shadow(0 0 18px rgba(50,220,180,.28))}
    @keyframes soroThemeFloat{0%,100%{margin-top:0;transform:scale(1)}50%{margin-top:-9px;transform:scale(1.035)}}
    @keyframes soroThemeSpin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.soro-v2 .soro-carousel-theme-decor{right:-40px;opacity:.35}.soro-v2 .soro-carousel-theme-note{right:25px}}
    @media(max-width:600px){.soro-v2 .soro-carousel-theme-decor{display:none}.soro-v2 .soro-carousel-theme-note{display:none}}
  `;document.head.appendChild(s)}
  function start(box){
    const hero=box&&box.querySelector('.hero');
    const old=hero&&hero.querySelector('.soro-home-carousel');
    if(!hero||!old)return false;
    injectStyles();
    if(hero._soroCarouselCleanupV2)hero._soroCarouselCleanupV2();
    const content=old.querySelector('#soroCarouselContent');
    if(!content)return false;
    const slides=[...content.querySelectorAll('.soro-carousel-slide')].map((_,i)=>i);
    if(!slides.length)return false;
    const oldRender=()=>{};
    let index=0;
    const seasonName=season();
    const data=window.__soroCarouselSlides||[];
    const source=data.length?data:null;
    const fallback=[...content.querySelectorAll('.soro-carousel-slide')].map(x=>({tag:x.querySelector('.soro-carousel-tag')?.textContent||'SOROKIBA',title:x.querySelector('.soro-carousel-title')?.textContent||'',text:x.querySelector('.soro-carousel-text')?.textContent||'',meta:x.querySelector('.soro-carousel-accent span:nth-child(2)')?.textContent||'',metaValue:x.querySelector('.soro-carousel-accent b')?.textContent||'',icon:x.querySelector('.soro-carousel-accent span:first-child')?.textContent||'✨'}));
    const items=source||fallback;
    const render=()=>{
      const item=items[index%items.length];const theme=themeFor(item,seasonName);
      old.classList.add('soro-v2');old.className=old.className.replace(/theme-\S+/g,'').trim();old.classList.add('theme-'+theme.className);
      const seasonBadge=old.querySelector('.soro-carousel-season');if(seasonBadge)seasonBadge.textContent=theme.icon+' '+(theme.name||seasonName);
      const decoration=old.querySelector('.soro-carousel-theme-decor')||document.createElement('div');decoration.className='soro-carousel-theme-decor';decoration.textContent=theme.decor;if(!decoration.parentNode)old.appendChild(decoration);
      let note=old.querySelector('.soro-carousel-theme-note');if(!note){note=document.createElement('div');note.className='soro-carousel-theme-note';old.appendChild(note)}note.textContent=theme.note;
      content.innerHTML=`<div class="soro-carousel-slide"><span class="soro-carousel-tag"><i></i>${item.tag||'SOROKIBA'}</span><h1 class="soro-carousel-title">${item.title||''}</h1><p class="soro-carousel-text">${item.text||''}</p><div class="soro-carousel-accent"><span>${item.icon||theme.icon}</span><span>${item.meta||''}</span><b>${item.metaValue||''}</b></div></div>`;
      const dots=[...old.querySelectorAll('.soro-carousel-dots button')];dots.forEach((d,i)=>d.classList.toggle('active',i===index%dots.length));
    };
    render();
    const timer=setInterval(()=>{index=(index+1)%items.length;render()},DURATION);
    old.querySelectorAll('.soro-carousel-dots button').forEach((d,i)=>d.onclick=()=>{index=i;render()});
    hero._soroCarouselCleanupV2=()=>clearInterval(timer);
    return true;
  }
  function boot(){
    if(typeof window.cityPage!=='function'){setTimeout(boot,150);return}
    const original=window.cityPage;
    if(original.__soroV2)return;
    const wrapped=async function(box){await original(box);setTimeout(()=>start(box),30)};
    wrapped.__soroV2=true;window.cityPage=wrapped;
    if(typeof currentPage!=='undefined'&&currentPage==='city'){const box=document.getElementById('content');if(box)start(box)}
  }
  boot();
})();
