(function(){
  const DURATION=14000;
  const TZ='America/Sao_Paulo';
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

  function parts(){
    const now=new Date();
    const f=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(now);
    const get=t=>Number(f.find(x=>x.type===t)?.value||0);
    return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute'),second:get('second')};
  }

  function seasonInfo(){
    const {year,month,day}=parts();
    const d=month*100+day;
    if(d>=1221||d<=321)return {name:'VERÃO',icon:'☀️',className:'summer',note:'Calor, céu aberto e energia na cidade'};
    if(d>=322&&d<=620)return {name:'OUTONO',icon:'🍂',className:'autumn',note:'As folhas mudam e uma nova fase começa'};
    if(d>=621&&d<=922)return {name:'INVERNO',icon:'❄️',className:'winter',note:'Dias frios e noites tranquilas em Sorokiba'};
    return {name:'PRIMAVERA',icon:'🌸',className:'spring',note:'A cidade floresce e ganha novas cores'};
  }

  function timeInfo(){
    const {hour,minute,second}=parts();
    if(hour>=6&&hour<12)return {name:'BOM DIA',icon:'🌅',className:'morning'};
    if(hour>=12&&hour<18)return {name:'BOA TARDE',icon:'☀️',className:'afternoon'};
    return {name:'BOA NOITE',icon:'🌙',className:'night'};
  }

  function liveDateTime(){
    const now=new Date();
    return new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
  }

  function themeFor(item,season){
    const tag=String(item.tag||'').toUpperCase();
    const time=timeInfo();
    if(tag.includes('ESTAÇÃO'))return {key:season.className,icon:season.icon,note:season.note,art:season.className,animation:'season'};
    if(tag.includes('SOROKIBA ONLINE'))return {key:time.className,icon:time.icon,note:'Horário ao vivo • '+time.name,art:'clock',animation:'clock'};
    if(tag.includes('VIDA NA CIDADE'))return {key:'city',icon:'🏙️',note:'A cidade continua em movimento',art:'city',animation:'city'};
    if(tag.includes('NOVOS OBJETIVOS'))return {key:'goals',icon:'🎯',note:'Cada objetivo abre um novo caminho',art:'goals',animation:'goals'};
    if(tag.includes('SUA CARREIRA'))return {key:'career',icon:'💼',note:'Seu trabalho ajuda Sorokiba a crescer',art:'career',animation:'career'};
    return {key:'future',icon:'✨',note:'O futuro da cidade está em movimento',art:'future',animation:'future'};
  }

  function artHTML(art){
    const map={
      summer:'<div class="soro-art-sun">☀️</div><div class="soro-art-cloud cloud1">☁️</div><div class="soro-art-cloud cloud2">☁️</div><div class="soro-art-rays"></div><div class="soro-art-particles">✦ · ✧ · ✦ ·</div>',
      autumn:'<div class="soro-art-tree">🌳</div><div class="soro-art-leaves">🍂 🍁 🍂 🍁</div><div class="soro-art-wind">〰 〰 〰</div>',
      winter:'<div class="soro-art-moon">❄️</div><div class="soro-art-snow">❄︎  ❄︎  ❄︎<br>❄︎  ❄︎  ❄︎</div><div class="soro-art-ice"></div>',
      spring:'<div class="soro-art-flower">🌸</div><div class="soro-art-flower flower2">🌷</div><div class="soro-art-vines">✿  ❀  ✿</div>',
      clock:'<div class="soro-art-clock"><span class="clock-hour"></span><span class="clock-minute"></span><span class="clock-second"></span></div><div class="soro-art-ticks">•  •  •  •</div>',
      city:'<div class="soro-art-city">🏙️</div><div class="soro-art-windows">▦ ▦ ▦</div><div class="soro-art-road">━━━━━━━━</div><div class="soro-art-lights">• · • · •</div>',
      goals:'<div class="soro-art-target">🎯</div><div class="soro-art-stars">✦  ✧  ✦</div><div class="soro-art-orbit"></div>',
      career:'<div class="soro-art-briefcase">💼</div><div class="soro-art-chart">▗▘▗▆▗▇</div><div class="soro-art-coins">✦  ◇  ✦</div>',
      future:'<div class="soro-art-crystal">✦</div><div class="soro-art-stars">✧  ✦  ✧</div><div class="soro-art-orbit"></div>'
    };
    return map[art]||map.future;
  }

  function injectStyles(){
    if(document.getElementById('soro-carousel-v4-style'))return;
    const s=document.createElement('style');s.id='soro-carousel-v4-style';s.textContent=`
      .soro-home-carousel.soro-v2 .soro-carousel-progress,.soro-home-carousel .soro-carousel-progress{display:none!important;height:0!important;visibility:hidden!important;opacity:0!important}
      .soro-home-carousel.soro-v2{overflow:hidden!important;position:absolute!important;transition:background 1.4s ease,box-shadow 1.4s ease!important;isolation:isolate}
      .soro-home-carousel.soro-v2:before{content:"";position:absolute;inset:-20%;z-index:0;pointer-events:none;background:radial-gradient(circle at var(--mx,72%) var(--my,35%),rgba(255,255,255,.11),transparent 25%);opacity:.75;transition:background-position .25s ease}
      .soro-home-carousel.soro-v2:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(5,9,18,.18),transparent 55%,rgba(255,255,255,.03));mix-blend-mode:screen}
      .soro-home-carousel.soro-v2 .soro-carousel-decoration{display:none!important}
      .soro-home-carousel.soro-v2 .soro-carousel-theme-decor{position:absolute!important;right:4%!important;top:50%!important;bottom:auto!important;transform:translate3d(0,-50%,0)!important;width:410px!important;height:320px!important;display:block!important;z-index:3!important;pointer-events:none!important;opacity:1!important;perspective:900px}
      .soro-v2 .soro-carousel-slide{position:relative;z-index:4;animation:soroSlideIn .9s cubic-bezier(.16,1,.3,1) both;will-change:transform,opacity;transform-origin:center left}
      .soro-v2 .soro-carousel-title{animation:soroTitleIn 1s cubic-bezier(.16,1,.3,1) .08s both}
      .soro-v2 .soro-carousel-text{animation:soroTextIn 1s cubic-bezier(.16,1,.3,1) .18s both}
      .soro-v2 .soro-carousel-accent{animation:soroTextIn .9s cubic-bezier(.16,1,.3,1) .28s both}
      .soro-v2 .soro-carousel-tag{animation:soroTagIn .8s ease both}
      .soro-v2 .soro-carousel-theme-decor{animation:soroDecorIn 1.1s cubic-bezier(.16,1,.3,1) both}
      .soro-v2 .soro-theme-art{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:72px;text-shadow:0 0 35px rgba(255,255,255,.25);animation:soroArtFloat 5s ease-in-out infinite;transform-style:preserve-3d}
      .soro-v2 .soro-theme-art:before,.soro-v2 .soro-theme-art:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.16);width:245px;height:245px;animation:soroOrbit 16s linear infinite}
      .soro-v2 .soro-theme-art:after{width:175px;height:175px;border-style:dashed;animation-direction:reverse;animation-duration:11s}
      .soro-v2 .soro-theme-note{position:absolute!important;right:4%!important;bottom:50px!important;z-index:5!important;font-size:9px!important;letter-spacing:1.3px!important;text-transform:uppercase!important;color:rgba(225,231,245,.68)!important;animation:soroNoteIn .8s ease .3s both}
      .soro-v2 .soro-live-clock{position:absolute;left:32px;bottom:48px;z-index:6;font:600 10px/1.4 Inter,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:rgba(235,240,250,.62);white-space:nowrap;animation:soroNoteIn .8s ease .35s both}
      .soro-v2 .soro-live-clock strong{color:rgba(255,255,255,.9);font-weight:700;margin-right:8px}
      .soro-v2 .soro-live-clock .live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;box-shadow:0 0 12px currentColor;animation:soroPulse 1.5s ease-in-out infinite}
      .soro-v2.theme-summer{background:radial-gradient(circle at 78% 25%,rgba(255,193,61,.3),transparent 27%),linear-gradient(125deg,#172139,#293a58)!important}
      .soro-v2.theme-autumn{background:radial-gradient(circle at 80% 25%,rgba(221,123,49,.27),transparent 29%),linear-gradient(125deg,#241b29,#3a292d)!important}
      .soro-v2.theme-winter{background:radial-gradient(circle at 78% 22%,rgba(100,183,255,.28),transparent 30%),linear-gradient(125deg,#101b30,#19314a)!important}
      .soro-v2.theme-spring{background:radial-gradient(circle at 78% 24%,rgba(238,122,190,.25),transparent 30%),linear-gradient(125deg,#172332,#263846)!important}
      .soro-v2.theme-morning{background:radial-gradient(circle at 78% 25%,rgba(255,218,125,.24),transparent 29%),linear-gradient(125deg,#172039,#2d3850)!important}
      .soro-v2.theme-afternoon{background:radial-gradient(circle at 78% 25%,rgba(255,170,70,.24),transparent 29%),linear-gradient(125deg,#211d35,#3c304b)!important}
      .soro-v2.theme-night{background:radial-gradient(circle at 78% 25%,rgba(91,119,255,.25),transparent 29%),linear-gradient(125deg,#0c1428,#1a2140)!important}
      .soro-v2.theme-city{background:radial-gradient(circle at 78% 30%,rgba(84,129,255,.26),transparent 30%),linear-gradient(125deg,#10182b,#1b2944)!important}
      .soro-v2.theme-goals{background:radial-gradient(circle at 78% 30%,rgba(154,102,255,.3),transparent 30%),linear-gradient(125deg,#15152e,#262044)!important}
      .soro-v2.theme-career{background:radial-gradient(circle at 78% 30%,rgba(35,213,170,.23),transparent 30%),linear-gradient(125deg,#101e2c,#183337)!important}
      .soro-v2.theme-future{background:radial-gradient(circle at 78% 30%,rgba(191,126,255,.25),transparent 30%),linear-gradient(125deg,#17162e,#272343)!important}
      .soro-theme-art.theme-summer .soro-art-sun{filter:drop-shadow(0 0 35px rgba(255,205,80,.8));font-size:105px;animation:soroSun 5s ease-in-out infinite}.soro-art-cloud{position:absolute;left:28%;top:30%;font-size:48px;opacity:.65}.soro-art-cloud.cloud2{left:62%;top:58%;font-size:30px;opacity:.38;animation:soroCloud 8s ease-in-out infinite}.soro-art-rays{position:absolute;width:190px;height:190px;border:2px solid rgba(255,207,83,.2);border-radius:50%;box-shadow:0 0 80px rgba(255,195,60,.2);animation:soroSunRing 7s linear infinite}.soro-art-particles{position:absolute;bottom:18%;font-size:17px;letter-spacing:14px;opacity:.45;animation:soroParticles 4s ease-in-out infinite}
      .soro-theme-art.theme-autumn .soro-art-tree{font-size:100px;filter:drop-shadow(0 0 20px rgba(218,128,57,.35))}.soro-art-leaves{position:absolute;top:25%;font-size:28px;animation:soroLeaves 4s ease-in-out infinite}.soro-art-wind{position:absolute;bottom:25%;font-size:30px;opacity:.45;animation:soroWind 3.5s ease-in-out infinite}
      .soro-theme-art.theme-winter .soro-art-moon{font-size:90px;filter:drop-shadow(0 0 35px rgba(130,200,255,.65));animation:soroMoon 5s ease-in-out infinite}.soro-art-snow{position:absolute;line-height:2;font-size:23px;opacity:.7;animation:soroSnow 4s ease-in-out infinite}.soro-art-ice{position:absolute;width:210px;height:55px;border-bottom:2px solid rgba(140,215,255,.35);border-radius:50%;bottom:22%;box-shadow:0 15px 35px rgba(90,180,255,.15)}
      .soro-theme-art.theme-spring .soro-art-flower{font-size:95px;filter:drop-shadow(0 0 30px rgba(244,142,207,.55));animation:soroFlower 4s ease-in-out infinite}.soro-art-flower.flower2{position:absolute;font-size:55px;left:25%;top:38%;animation:soroFlower 4s ease-in-out infinite reverse}.soro-art-vines{position:absolute;bottom:23%;font-size:32px;color:#b8e9cf;letter-spacing:12px}
      .soro-theme-art.theme-morning .soro-art-clock,.soro-theme-art.theme-afternoon .soro-art-clock,.soro-theme-art.theme-night .soro-art-clock{width:135px;height:135px;border:5px solid rgba(255,224,153,.6);border-radius:50%;box-shadow:0 0 45px rgba(255,210,110,.2);position:relative;animation:soroClockFloat 5s ease-in-out infinite}.soro-theme-art.theme-night .soro-art-clock{border-color:rgba(137,170,255,.6);box-shadow:0 0 45px rgba(100,135,255,.2)}.soro-theme-art.theme-afternoon .soro-art-clock{border-color:rgba(255,190,120,.65)}.soro-art-clock span{position:absolute;display:block;left:50%;top:50%;transform-origin:50% 100%;border-radius:4px}.soro-art-clock .clock-hour{width:4px;height:40px;background:rgba(255,235,190,.85);transform:translate(-50%,-100%) rotate(35deg)}.soro-art-clock .clock-minute{width:3px;height:52px;background:rgba(255,245,215,.78);transform:translate(-50%,-100%) rotate(125deg)}.soro-art-clock .clock-second{width:2px;height:58px;background:rgba(255,130,100,.8);transform:translate(-50%,-100%) rotate(220deg)}.soro-art-ticks{position:absolute;bottom:22%;font-size:25px;letter-spacing:14px;opacity:.55}
      .soro-theme-art.theme-city .soro-art-city{font-size:105px;filter:drop-shadow(0 0 28px rgba(95,145,255,.5));animation:soroCity 6s ease-in-out infinite}.soro-art-windows{position:absolute;font-size:34px;letter-spacing:18px;opacity:.5;top:24%;animation:soroWindows 4s ease-in-out infinite}.soro-art-road{position:absolute;bottom:22%;font-size:20px;opacity:.4;letter-spacing:8px}.soro-art-lights{position:absolute;bottom:29%;font-size:13px;letter-spacing:20px;opacity:.5;animation:soroLights 2s ease-in-out infinite}
      .soro-theme-art.theme-goals .soro-art-target{font-size:105px;filter:drop-shadow(0 0 30px rgba(174,127,255,.65));animation:soroTarget 4s ease-in-out infinite}.soro-art-stars{position:absolute;font-size:28px;letter-spacing:18px;opacity:.7;animation:soroStars 3s ease-in-out infinite}.soro-art-orbit{position:absolute;width:220px;height:85px;border:1px solid rgba(190,155,255,.35);border-radius:50%;transform:rotate(-18deg);animation:soroOrbitTilt 7s linear infinite}
      .soro-theme-art.theme-career .soro-art-briefcase{font-size:100px;filter:drop-shadow(0 0 30px rgba(45,220,180,.5));animation:soroCareer 4s ease-in-out infinite}.soro-art-chart{position:absolute;bottom:24%;font-size:42px;letter-spacing:9px;color:rgba(91,231,196,.65);animation:soroChart 3s ease-in-out infinite}.soro-art-coins{position:absolute;top:22%;font-size:27px;letter-spacing:12px;opacity:.6;animation:soroCoins 3s ease-in-out infinite}
      .soro-theme-art.theme-future .soro-art-crystal{font-size:110px;color:#cbbaff;text-shadow:0 0 45px #9c79ff;animation:soroCrystal 3s ease-in-out infinite}.soro-theme-art.theme-future .soro-art-stars{top:24%}
      @keyframes soroSlideIn{from{opacity:0;transform:translate3d(-28px,8px,0) scale(.985)}to{opacity:1;transform:none}}
      @keyframes soroTitleIn{from{opacity:0;transform:translate3d(0,20px,0) scale(.98)}to{opacity:1;transform:none}}
      @keyframes soroTextIn{from{opacity:0;transform:translate3d(0,14px,0)}to{opacity:1;transform:none}}
      @keyframes soroTagIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
      @keyframes soroDecorIn{from{opacity:0;transform:translate3d(38px,-50%,0) scale(.9) rotateY(-10deg)}to{opacity:1;transform:translate3d(0,-50%,0) scale(1) rotateY(0)}}
      @keyframes soroNoteIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
      @keyframes soroArtFloat{0%,100%{transform:translateY(0) rotateZ(0)}50%{transform:translateY(-9px) rotateZ(.7deg)}}@keyframes soroOrbit{to{transform:rotate(360deg)}}@keyframes soroLeaves{50%{transform:translate(18px,9px) rotate(8deg)}}@keyframes soroWind{50%{transform:translateX(16px)}}@keyframes soroSnow{50%{transform:translateY(12px)}}@keyframes soroFlower{50%{transform:translateY(-10px) rotate(4deg)}}@keyframes soroStars{50%{opacity:.25;transform:scale(.9)}}@keyframes soroCrystal{50%{transform:scale(1.06) rotate(3deg)}}
      @keyframes soroSun{50%{transform:scale(1.05) rotate(3deg)}}@keyframes soroSunRing{to{transform:rotate(360deg) scale(1.06)}}@keyframes soroCloud{50%{transform:translateX(22px)}}@keyframes soroParticles{50%{transform:translateY(-12px);opacity:.7}}@keyframes soroMoon{50%{transform:translateY(-7px) scale(1.03)}}@keyframes soroClockFloat{50%{transform:translateY(-7px) rotate(1deg)}}@keyframes soroCity{50%{transform:translateY(-6px) scale(1.02)}}@keyframes soroWindows{50%{opacity:.8}}@keyframes soroLights{50%{opacity:.9;transform:translateX(8px)}}@keyframes soroTarget{50%{transform:scale(1.05) rotate(-2deg)}}@keyframes soroOrbitTilt{to{transform:rotate(342deg)}}@keyframes soroCareer{50%{transform:translateY(-7px) rotate(-2deg)}}@keyframes soroChart{50%{transform:translateY(-5px) scale(1.04)}}@keyframes soroCoins{50%{transform:translateY(-7px);opacity:.9}}@keyframes soroPulse{50%{opacity:.35;transform:scale(.75)}}
      @media(max-width:900px){.soro-home-carousel.soro-v2 .soro-carousel-theme-decor{right:-55px!important;opacity:.42!important}.soro-v2 .soro-carousel-theme-note{right:25px!important}.soro-v2 .soro-live-clock{left:25px}.soro-v2 .soro-carousel-dots{bottom:30px!important}}
      @media(max-width:600px){.soro-home-carousel.soro-v2 .soro-carousel-theme-decor{display:none!important}.soro-v2 .soro-carousel-theme-note{display:none!important}.soro-v2 .soro-live-clock{left:18px;bottom:24px;font-size:8px}.soro-v2 .soro-carousel-slide{animation-duration:.7s}}
      @media(prefers-reduced-motion:reduce){.soro-v2 *,.soro-v2 *:before,.soro-v2 *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}.soro-v2{transition:none!important}}
    `;document.head.appendChild(s);
  }

  function getText(el,sel){return el.querySelector(sel)?.textContent?.trim()||''}

  function start(box){
    const hero=box?.querySelector('.hero');
    const old=hero?.querySelector('.soro-home-carousel');
    if(!hero||!old)return false;
    injectStyles();
    if(hero._soroV2Timer)clearInterval(hero._soroV2Timer);
    if(hero._soroLiveTimer)clearInterval(hero._soroLiveTimer);
    const content=old.querySelector('#soroCarouselContent');
    if(!content)return false;

    const original=[...content.querySelectorAll('.soro-carousel-slide')].map(x=>({
      tag:getText(x,'.soro-carousel-tag'),
      title:getText(x,'.soro-carousel-title'),
      text:getText(x,'.soro-carousel-text'),
      meta:getText(x,'.soro-carousel-accent span:nth-child(2)'),
      metaValue:getText(x,'.soro-carousel-accent b'),
      icon:getText(x,'.soro-carousel-accent span:first-child')
    }));
    if(!original.length)return false;

    const dots=[...old.querySelectorAll('.soro-carousel-dots button')];
    let index=0;

    function updateLive(){
      const time=timeInfo();
      const season=seasonInfo();
      const live=old.querySelector('.soro-live-clock');
      if(live)live.innerHTML='<span class="live-dot"></span><strong>'+esc(time.name)+'</strong>'+esc(liveDateTime())+' • '+esc(season.icon+' '+season.name);
      const badge=old.querySelector('.soro-carousel-season');
      if(badge)badge.textContent=season.icon+' '+season.name;
    }

    function render(){
      const season=seasonInfo();
      const item=original[index%original.length];
      const theme=themeFor(item,season);
      const oldTheme=[...old.classList].filter(c=>/^theme-/.test(c));
      oldTheme.forEach(c=>old.classList.remove(c));
      old.classList.add('soro-v2','theme-'+theme.key);
      old.style.setProperty('--mx','72%');
      old.style.setProperty('--my','35%');

      old.querySelectorAll('.soro-carousel-progress,.soro-carousel-decoration,.soro-carousel-theme-decor,.soro-carousel-theme-note,.soro-live-clock').forEach(e=>e.remove());
      const badge=old.querySelector('.soro-carousel-season');
      if(badge)badge.textContent=season.icon+' '+season.name;

      content.innerHTML='<div class="soro-carousel-slide"><span class="soro-carousel-tag"><i></i>'+esc(item.tag)+'</span><h1 class="soro-carousel-title">'+esc(item.title)+'</h1><p class="soro-carousel-text">'+esc(item.text)+'</p><div class="soro-carousel-accent"><span>'+esc(item.icon||theme.icon)+'</span><span>'+esc(item.meta)+'</span><b>'+esc(item.metaValue)+'</b></div></div>';

      const deco=document.createElement('div');
      deco.className='soro-carousel-theme-decor';
      deco.innerHTML='<div class="soro-theme-art theme-'+theme.key+' '+theme.art+' animation-'+theme.animation+'">'+artHTML(theme.art)+'</div>';
      old.appendChild(deco);

      const note=document.createElement('div');
      note.className='soro-carousel-theme-note';
      note.textContent=theme.note;
      old.appendChild(note);

      const clock=document.createElement('div');
      clock.className='soro-live-clock';
      old.appendChild(clock);
      updateLive();

      dots.forEach((d,i)=>d.classList.toggle('active',i===index%dots.length));
    }

    dots.forEach((d,i)=>{d.onclick=()=>{index=i;render()}});
    render();
    hero._soroV2Timer=setInterval(()=>{index=(index+1)%original.length;render()},DURATION);
    hero._soroLiveTimer=setInterval(updateLive,1000);

    old.addEventListener('pointermove',e=>{
      const r=old.getBoundingClientRect();
      const x=((e.clientX-r.left)/r.width)*100;
      const y=((e.clientY-r.top)/r.height)*100;
      old.style.setProperty('--mx',Math.max(35,Math.min(90,x))+'%');
      old.style.setProperty('--my',Math.max(10,Math.min(80,y))+'%');
      const art=old.querySelector('.soro-theme-art');
      if(art&&window.matchMedia('(prefers-reduced-motion: no-preference)').matches){
        const dx=(x-70)/20,dy=(y-50)/20;
        art.style.transform='translate3d('+dx+'px,'+dy+'px,0)';
      }
    },{passive:true});
    old.addEventListener('pointerleave',()=>{const art=old.querySelector('.soro-theme-art');if(art)art.style.transform='';},{passive:true});
    return true;
  }

  function boot(){
    if(typeof window.cityPage!=='function'){setTimeout(boot,200);return}
    if(window.cityPage.__soroV4)return;
    const original=window.cityPage;
    const wrapped=async function(box){await original(box);setTimeout(()=>start(box),40)};
    wrapped.__soroV4=true;
    window.cityPage=wrapped;
    if(typeof currentPage!=='undefined'&&currentPage==='city'){
      const box=document.getElementById('content');
      if(box)start(box);
    }
  }
  boot();
})();
