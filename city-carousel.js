(function(){
  'use strict';

  const slides = [
    {image:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=88',title:'Sorokiba em movimento',text:'A cidade muda a cada momento. Observe o cenário enquanto você decide o próximo passo.',animation:'carousel-kenburns'},
    {image:'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1800&q=88',title:'Ritmo urbano',text:'Ruas, prédios e caminhos formam uma cidade que nunca fica parada.',animation:'carousel-pan'},
    {image:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1800&q=88',title:'Horizonte da cidade',text:'Uma visão ampla para acompanhar o clima visual de Sorokiba durante o dia.',animation:'carousel-drift'},
    {image:'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1800&q=88',title:'Vida entre os prédios',text:'Cada área da cidade tem seu próprio ritmo e novas possibilidades para explorar.',animation:'carousel-zoom'},
    {image:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=88',title:'Um novo momento',text:'O painel acompanha automaticamente o horário local de São Paulo.',animation:'carousel-float'}
  ];

  let current=0, intervalId=null, clockId=null, paused=false;

  function getSaoPauloDate(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());
    const map={};parts.forEach(p=>map[p.type]=p.value);
    return new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}-03:00`);
  }
  function getSeason(date){
    const m=date.getMonth()+1,d=date.getDate();
    if((m===12&&d>=21)||(m<=3&&!(m===3&&d>=20)))return 'Verão';
    if((m===3&&d>=20)||m===4||m===5||(m===6&&d<21))return 'Outono';
    if((m===6&&d>=21)||m===7||m===8||(m===9&&d<23))return 'Inverno';
    return 'Primavera';
  }
  function getGreeting(hour){if(hour>=5&&hour<12)return 'Bom dia';if(hour>=12&&hour<18)return 'Boa tarde';if(hour>=18&&hour<24)return 'Boa noite';return 'Boa madrugada'}
  function updateClock(){
    const date=getSaoPauloDate(),clock=document.querySelector('[data-sorokiba-clock]'),meta=document.querySelector('[data-sorokiba-meta]');
    if(!clock||!meta)return;
    const hour=date.getHours();
    clock.textContent=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date);
    meta.textContent=`São Paulo · ${getSeason(date)} · ${getGreeting(hour)}`;
  }
  function build(box){
    const old=box.querySelector('.sorokiba-carousel');if(old)old.remove();
    const section=document.createElement('section');section.className='sorokiba-carousel';section.setAttribute('aria-label','Destaques de Sorokiba');
    section.innerHTML=`<div class="carousel-stage"></div><div class="carousel-shade"></div><div class="carousel-content"><div class="carousel-status-row"><span class="carousel-live"><i></i> AO VIVO</span><span class="carousel-meta" data-sorokiba-meta></span></div><div class="carousel-copy"><span class="carousel-counter"><b data-carousel-current>01</b> / ${String(slides.length).padStart(2,'0')}</span><h2 data-carousel-title></h2><p data-carousel-text></p></div><div class="carousel-footer"><div class="carousel-dots" data-carousel-dots></div><div class="carousel-clock-block"><small>HORÁRIO LOCAL</small><strong data-sorokiba-clock>--:--:--</strong></div></div></div><button class="carousel-arrow carousel-prev" type="button" aria-label="Imagem anterior">‹</button><button class="carousel-arrow carousel-next" type="button" aria-label="Próxima imagem">›</button>`;
    box.insertBefore(section,box.firstChild);renderDots(section);showSlide(section,0,true);bindControls(section);updateClock();clearInterval(clockId);clockId=setInterval(updateClock,1000);startAuto(section);
  }
  function renderDots(section){section.querySelector('[data-carousel-dots]').innerHTML=slides.map((_,i)=>`<button type="button" class="carousel-dot" data-index="${i}" aria-label="Ir para imagem ${i+1}"></button>`).join('')}
  function showSlide(section,index,instant){
    current=(index+slides.length)%slides.length;const data=slides[current],stage=section.querySelector('.carousel-stage'),old=stage.querySelector('.carousel-slide.active');
    if(old)old.classList.remove('active');
    const slide=document.createElement('div');slide.className=`carousel-slide ${data.animation}`;slide.innerHTML=`<img src="${data.image}" alt="${data.title}" loading="${current===0?'eager':'lazy'}"><div class="carousel-image-glow"></div>`;stage.appendChild(slide);
    requestAnimationFrame(()=>slide.classList.add('active'));if(old)setTimeout(()=>old.remove(),instant?0:700);
    section.querySelector('[data-carousel-title]').textContent=data.title;section.querySelector('[data-carousel-text]').textContent=data.text;section.querySelector('[data-carousel-current]').textContent=String(current+1).padStart(2,'0');section.querySelectorAll('.carousel-dot').forEach((dot,i)=>dot.classList.toggle('active',i===current));
  }
  function next(section){showSlide(section,current+1,false);startAuto(section)}
  function prev(section){showSlide(section,current-1,false);startAuto(section)}
  function bindControls(section){
    section.querySelector('.carousel-next').onclick=()=>next(section);section.querySelector('.carousel-prev').onclick=()=>prev(section);section.querySelectorAll('.carousel-dot').forEach(dot=>dot.onclick=()=>{showSlide(section,Number(dot.dataset.index),false);startAuto(section)});
    section.addEventListener('mouseenter',()=>paused=true);section.addEventListener('mouseleave',()=>paused=false);section.addEventListener('focusin',()=>paused=true);section.addEventListener('focusout',()=>paused=false);
  }
  function startAuto(section){clearInterval(intervalId);intervalId=setInterval(()=>{if(!paused&&document.visibilityState==='visible')showSlide(section,current+1,false)},7000)}
  function install(){const original=window.cityPage;if(typeof original!=='function')return setTimeout(install,50);if(original.__sorokibaCarousel)return;const wrapped=async function(box){const result=await original(box);build(box);return result};wrapped.__sorokibaCarousel=true;window.cityPage=wrapped}
  install();window.addEventListener('beforeunload',()=>{clearInterval(intervalId);clearInterval(clockId)});
})();
