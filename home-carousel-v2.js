(function(){
  const DURATION=14000;
  const TZ='America/Sao_Paulo';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function seasonInfo(){
    const m=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,month:'numeric'}).format(new Date()));
    if(m===12||m<=2)return {name:'VERÃO',icon:'☀️',className:'summer',note:'Calor, céu aberto e energia na cidade'};
    if(m<=5)return {name:'OUTONO',icon:'🍂',className:'autumn',note:'As folhas mudam e uma nova fase começa'};
    if(m<=8)return {name:'INVERNO',icon:'❄️',className:'winter',note:'Dias frios e noites tranquilas em Sorokiba'};
    return {name:'PRIMAVERA',icon:'🌸',className:'spring',note:'A cidade floresce e ganha novas cores'};
  }
  function timeInfo(){
    const h=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'numeric',hour12:false}).format(new Date()));
    if(h>=6&&h<12)return {name:'MANHÃ',icon:'🌅'};
    if(h>=12&&h<18)return {name:'TARDE',icon:'☀️'};
    if(h>=18&&h<24)return {name:'NOITE',icon:'🌙'};
    return {name:'MADRUGADA',icon:'🌙'};
  }
  function themeFor(item,season){
    const tag=String(item.tag||'').toUpperCase();
    if(tag.includes('ESTAÇÃO'))return {key:season.className,icon:season.icon,note:season.note,art:season.className};
    if(tag.includes('SOROKIBA ONLINE'))return {key:'morning',icon:timeInfo().icon,note:'Horário ao vivo de Sorokiba',art:'clock'};
    if(tag.includes('VIDA NA CIDADE'))return {key:'city',icon:'🏙️',note:'A cidade continua em movimento',art:'city'};
    if(tag.includes('NOVOS OBJETIVOS'))return {key:'goals',icon:'🎯',note:'Cada objetivo abre um novo caminho',art:'goals'};
    if(tag.includes('SUA CARREIRA'))return {key:'career',icon:'💼',note:'Seu trabalho ajuda Sorokiba a crescer',art:'career'};
    return {key:'future',icon:'✨',note:'O futuro da cidade está em movimento',art:'future'};
  }
  function artHTML(art){
    const map={
      summer:'<div class="soro-art-sun">☀️</div><div class="soro-art-cloud">☁️</div><div class="soro-art-rays"></div>',
      autumn:'<div class="soro-art-tree">🌳</div><div class="soro-art-leaves">🍂 🍁 🍂</div><div class="soro-art-wind">〰 〰 〰</div>',
      winter:'<div class="soro-art-moon">❄️</div><div class="soro-art-snow">❄︎  ❄︎  ❄︎<br>❄︎  ❄︎  ❄︎</div><div class="soro-art-ice"></div>',
      spring:'<div class="soro-art-flower">🌸</div><div class="soro-art-flower flower2">🌷</div><div class="soro-art-vines">✿  ❀  ✿</div>',
      clock:'<div class="soro-art-clock"><span></span></div><div class="soro-art-ticks">•  •  •  •</div>',
      city:'<div class="soro-art-city">🏙️</div><div class="soro-art-windows">▦ ▦ ▦</div><div class="soro-art-road">━━━━━━━━</div>',
      goals:'<div class="soro-art-target">🎯</div><div class="soro-art-stars">✦  ✧  ✦</div><div class="soro-art-orbit"></div>',
      career:'<div class="soro-art-briefcase">💼</div><div class="soro-art-chart">▗▘▗▆▗▇</div><div class="soro-art-coins">✦  ◇  ✦</div>',
      future:'<div class="soro-art-crystal">✦</div><div class="soro-art-stars">✧  ✦  ✧</div><div class="soro-art-orbit"></div>'
    };
    return map[art]||map.future;
  }
  function injectStyles(){
    if(document.getElementById('soro-carousel-v3-style'))return;
    const s=document.createElement('style');s.id='soro-carousel-v3-style';s.textContent=`
      .soro-home-carousel.soro-v2 .soro-carousel-progress,.soro-home-carousel .soro-carousel-progress{display:none!important;height:0!important;visibility:hidden!important;opacity:0!important}
      .soro-home-carousel.soro-v2{overflow:hidden!important;position:absolute!important;transition:background 1.2s ease!important}
      .soro-home-carousel.soro-v2 .soro-carousel-decoration{display:none!important}
      .soro-home-carousel.soro-v2 .soro-carousel-theme-decor{position:absolute!important;right:5%!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;width:390px!important;height:300px!important;display:block!important;z-index:2!important;pointer-events:none!important;opacity:1!important}
      .soro-v2 .soro-theme-art{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:72px;text-shadow:0 0 35px rgba(255,255,255,.25);animation:soroArtFloat 5s ease-in-out infinite}
      .soro-v2 .soro-theme-art:before,.soro-v2 .soro-theme-art:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.16);width:245px;height:245px;animation:soroOrbit 16s linear infinite}
      .soro-v2 .soro-theme-art:after{width:175px;height:175px;border-style:dashed;animation-direction:reverse;animation-duration:11s}
      .soro-v2 .soro-theme-note{position:absolute!important;right:5%!important;bottom:54px!important;z-index:4!important;font-size:9px!important;letter-spacing:1.3px!important;text-transform:uppercase!important;color:rgba(225,231,245,.62)!important}
      .soro-v2.theme-summer{background:radial-gradient(circle at 78% 25%,rgba(255,193,61,.3),transparent 27%),linear-gradient(125deg,#172139,#293a58)!important}
      .soro-v2.theme-autumn{background:radial-gradient(circle at 80% 25%,rgba(221,123,49,.27),transparent 29%),linear-gradient(125deg,#241b29,#3a292d)!important}
      .soro-v2.theme-winter{background:radial-gradient(circle at 78% 22%,rgba(100,183,255,.28),transparent 30%),linear-gradient(125deg,#101b30,#19314a)!important}
      .soro-v2.theme-spring{background:radial-gradient(circle at 78% 24%,rgba(238,122,190,.25),transparent 30%),linear-gradient(125deg,#172332,#263846)!important}
      .soro-v2.theme-morning{background:radial-gradient(circle at 78% 25%,rgba(255,218,125,.24),transparent 29%),linear-gradient(125deg,#172039,#2d3850)!important}
      .soro-v2.theme-city{background:radial-gradient(circle at 78% 30%,rgba(84,129,255,.26),transparent 30%),linear-gradient(125deg,#10182b,#1b2944)!important}
      .soro-v2.theme-goals{background:radial-gradient(circle at 78% 30%,rgba(154,102,255,.3),transparent 30%),linear-gradient(125deg,#15152e,#262044)!important}
      .soro-v2.theme-career{background:radial-gradient(circle at 78% 30%,rgba(35,213,170,.23),transparent 30%),linear-gradient(125deg,#101e2c,#183337)!important}
      .soro-v2.theme-future{background:radial-gradient(circle at 78% 30%,rgba(191,126,255,.25),transparent 30%),linear-gradient(125deg,#17162e,#272343)!important}
      .soro-theme-art.theme-summer .soro-art-sun{filter:drop-shadow(0 0 35px rgba(255,205,80,.8));font-size:105px}.soro-art-cloud{position:absolute;left:28%;top:30%;font-size:48px;opacity:.65}.soro-art-rays{position:absolute;width:190px;height:190px;border:2px solid rgba(255,207,83,.2);border-radius:50%;box-shadow:0 0 80px rgba(255,195,60,.2)}
      .soro-theme-art.theme-autumn .soro-art-tree{font-size:100px;filter:drop-shadow(0 0 20px rgba(218,128,57,.35))}.soro-art-leaves{position:absolute;top:25%;font-size:28px;animation:soroLeaves 4s ease-in-out infinite}.soro-art-wind{position:absolute;bottom:25%;font-size:30px;opacity:.45}
      .soro-theme-art.theme-winter .soro-art-moon{font-size:90px;filter:drop-shadow(0 0 35px rgba(130,200,255,.65))}.soro-art-snow{position:absolute;line-height:2;font-size:23px;opacity:.7;animation:soroSnow 4s ease-in-out infinite}.soro-art-ice{position:absolute;width:210px;height:55px;border-bottom:2px solid rgba(140,215,255,.35);border-radius:50%;bottom:22%;box-shadow:0 15px 35px rgba(90,180,255,.15)}
      .soro-theme-art.theme-spring .soro-art-flower{font-size:95px;filter:drop-shadow(0 0 30px rgba(244,142,207,.55))}.soro-art-flower.flower2{position:absolute;font-size:55px;left:25%;top:38%;animation:soroFlower 4s ease-in-out infinite}.soro-art-vines{position:absolute;bottom:23%;font-size:32px;color:#b8e9cf;letter-spacing:12px}
      .soro-theme-art.theme-morning .soro-art-clock{width:135px;height:135px;border:5px solid rgba(255,224,153,.6);border-radius:50%;box-shadow:0 0 45px rgba(255,210,110,.2);position:relative}.soro-art-clock span{position:absolute;width:4px;height:48px;background:rgba(255,235,190,.8);left:50%;top:23%;transform-origin:bottom;transform:rotate(35deg);border-radius:4px}.soro-art-ticks{position:absolute;bottom:22%;font-size:25px;letter-spacing:14px;opacity:.55}
      .soro-theme-art.theme-city .soro-art-city{font-size:105px;filter:drop-shadow(0 0 28px rgba(95,145,255,.5))}.soro-art-windows{position:absolute;font-size:34px;letter-spacing:18px;opacity:.5;top:24%}.soro-art-road{position:absolute;bottom:22%;font-size:20px;opacity:.4;letter-spacing:8px}
      .soro-theme-art.theme-goals .soro-art-target{font-size:105px;filter:drop-shadow(0 0 30px rgba(174,127,255,.65))}.soro-art-stars{position:absolute;font-size:28px;letter-spacing:18px;opacity:.7;animation:soroStars 3s ease-in-out infinite}.soro-art-orbit{position:absolute;width:220px;height:85px;border:1px solid rgba(190,155,255,.35);border-radius:50%;transform:rotate(-18deg)}
      .soro-theme-art.theme-career .soro-art-briefcase{font-size:100px;filter:drop-shadow(0 0 30px rgba(45,220,180,.5))}.soro-art-chart{position:absolute;bottom:24%;font-size:42px;letter-spacing:9px;color:rgba(91,231,196,.65)}.soro-art-coins{position:absolute;top:22%;font-size:27px;letter-spacing:12px;opacity:.6}
      .soro-theme-art.theme-future .soro-art-crystal{font-size:110px;color:#cbbaff;text-shadow:0 0 45px #9c79ff;animation:soroCrystal 3s ease-in-out infinite}.soro-theme-art.theme-future .soro-art-stars{top:24%}
      @keyframes soroArtFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes soroOrbit{to{transform:rotate(360deg)}}@keyframes soroLeaves{50%{transform:translateX(18px) rotate(6deg)}}@keyframes soroSnow{50%{transform:translateY(10px)}}@keyframes soroFlower{50%{transform:translateY(-10px) rotate(4deg)}}@keyframes soroStars{50%{opacity:.25;transform:scale(.9)}}@keyframes soroCrystal{50%{transform:scale(1.06) rotate(3deg)}}
      @media(max-width:900px){.soro-home-carousel.soro-v2 .soro-carousel-theme-decor{right:-55px!important;opacity:.45!important}.soro-v2 .soro-carousel-theme-note{right:25px!important}.soro-v2 .soro-carousel-dots{bottom:30px!important}}
      @media(max-width:600px){.soro-home-carousel.soro-v2 .soro-carousel-theme-decor{display:none!important}.soro-v2 .soro-carousel-theme-note{display:none!important}}
    `;document.head.appendChild(s);
  }
  function getText(el,sel){return el.querySelector(sel)?.textContent?.trim()||''}
  function start(box){
    const hero=box?.querySelector('.hero');const old=hero?.querySelector('.soro-home-carousel');
    if(!hero||!old)return false;
    injectStyles();
    if(hero._soroV2Timer)clearInterval(hero._soroV2Timer);
    const content=old.querySelector('#soroCarouselContent');if(!content)return false;
    const original=[...content.querySelectorAll('.soro-carousel-slide')].map(x=>({tag:getText(x,'.soro-carousel-tag'),title:getText(x,'.soro-carousel-title'),text:getText(x,'.soro-carousel-text'),meta:getText(x,'.soro-carousel-accent span:nth-child(2)'),metaValue:getText(x,'.soro-carousel-accent b'),icon:getText(x,'.soro-carousel-accent span:first-child')}));
    if(!original.length)return false;
    const dots=[...old.querySelectorAll('.soro-carousel-dots button')];
    let index=0;
    function render(){
      const season=seasonInfo();const item=original[index%original.length];const theme=themeFor(item,season);
      old.className=old.className.replace(/\btheme-\S+/g,'').trim();old.classList.add('soro-v2','theme-'+theme.key);
      old.querySelectorAll('.soro-carousel-progress,.soro-carousel-decoration').forEach(e=>e.remove());
      const badge=old.querySelector('.soro-carousel-season');if(badge)badge.textContent=season.icon+' '+season.name;
      content.innerHTML='<div class="soro-carousel-slide"><span class="soro-carousel-tag"><i></i>'+esc(item.tag)+'</span><h1 class="soro-carousel-title">'+esc(item.title)+'</h1><p class="soro-carousel-text">'+esc(item.text)+'</p><div class="soro-carousel-accent"><span>'+esc(item.icon||theme.icon)+'</span><span>'+esc(item.meta)+'</span><b>'+esc(item.metaValue)+'</b></div></div>';
      const deco=document.createElement('div');deco.className='soro-carousel-theme-decor';deco.innerHTML='<div class="soro-theme-art theme-'+theme.key+' '+theme.art+'">'+artHTML(theme.art)+'</div>';old.appendChild(deco);
      let note=old.querySelector('.soro-carousel-theme-note');if(!note){note=document.createElement('div');note.className='soro-carousel-theme-note';old.appendChild(note)}note.textContent=theme.note;
      dots.forEach((d,i)=>d.classList.toggle('active',i===index%dots.length));
    }
    dots.forEach((d,i)=>{d.onclick=()=>{index=i;render()}});
    render();
    hero._soroV2Timer=setInterval(()=>{index=(index+1)%original.length;render()},DURATION);
    return true;
  }
  function boot(){
    if(typeof window.cityPage!=='function'){setTimeout(boot,200);return}
    if(window.cityPage.__soroV2)return;
    const original=window.cityPage;const wrapped=async function(box){await original(box);setTimeout(()=>start(box),40)};wrapped.__soroV2=true;window.cityPage=wrapped;
    if(typeof currentPage!=='undefined'&&currentPage==='city'){const box=document.getElementById('content');if(box)start(box)}
  }
  boot();
})();
