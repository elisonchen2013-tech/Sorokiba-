(function(){
  const DURATION=9000;
  const slides=[
    {tag:'NOVA VERSÃO',title:'A nova versão de Sorokiba está chegando.',text:'Uma nova fase da cidade está sendo preparada. Explore, trabalhe e descubra o que vem por aí.',icon:'🚀',meta:'STATUS',value:'EM DESENVOLVIMENTO'},
    {tag:'ATUALIZAÇÃO',title:'Sorokiba continua evoluindo.',text:'Novos recursos, melhorias visuais e ajustes para deixar a experiência da cidade ainda melhor.',icon:'✨',meta:'VERSÃO',value:'NOVA'},
    {tag:'CIDADE ONLINE',title:'Sua cidade não para.',text:'Entre em Sorokiba e continue sua jornada enquanto a próxima atualização é preparada.',icon:'🏙️',meta:'SOROKIBA',value:'ONLINE'},
    {tag:'EM BREVE',title:'Prepare-se para a próxima fase.',text:'A atualização será liberada quando estiver pronta. Fique de olho nas novidades da cidade.',icon:'🔔',meta:'PRÓXIMO',value:'UPDATE'}
  ];

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  function start(box){
    if(!box || box.querySelector('.soro-carousel')) return;
    const hero=box.querySelector('.hero');
    if(!hero) return;

    const carousel=document.createElement('section');
    carousel.className='soro-carousel';
    carousel.setAttribute('aria-label','Novidades de Sorokiba');
    carousel.innerHTML=`
      <div class="soro-track">
        ${slides.map((s,i)=>`<article class="soro-slide ${i===0?'active':''}" data-index="${i}">
          <span class="soro-kicker"><i></i>${esc(s.tag)}</span>
          <h1>${esc(s.title)}</h1>
          <p>${esc(s.text)}</p>
          <div class="soro-work">
            <div class="soro-work-icon">${s.icon}</div>
            <div><small>${esc(s.meta)}</small><strong>${esc(s.value)}</strong><div class="soro-status">● Carregando informações da próxima versão</div></div>
          </div>
          <div class="soro-big-icon">${s.icon}</div>
        </article>`).join('')}
      </div>
      <div class="soro-controls">
        <div class="soro-dots">${slides.map((_,i)=>`<button class="soro-dot ${i===0?'active':''}" aria-label="Ir para slide ${i+1}"></button>`).join('')}</div>
        <div class="soro-arrows"><button class="soro-arrow" type="button" data-dir="prev" aria-label="Anterior">‹</button><button class="soro-arrow" type="button" data-dir="next" aria-label="Próximo">›</button></div>
      </div>`;

    hero.replaceWith(carousel);

    const slideEls=[...carousel.querySelectorAll('.soro-slide')];
    const dots=[...carousel.querySelectorAll('.soro-dot')];
    let index=0;
    let timer=null;

    function render(next){
      index=(next+slides.length)%slides.length;
      slideEls.forEach((el,i)=>el.classList.toggle('active',i===index));
      dots.forEach((el,i)=>el.classList.toggle('active',i===index));
    }
    function restart(){clearInterval(timer);timer=setInterval(()=>render(index+1),DURATION);}

    dots.forEach((dot,i)=>dot.addEventListener('click',()=>{render(i);restart();}));
    carousel.querySelector('[data-dir="prev"]').addEventListener('click',()=>{render(index-1);restart();});
    carousel.querySelector('[data-dir="next"]').addEventListener('click',()=>{render(index+1);restart();});
    carousel.addEventListener('mouseenter',()=>clearInterval(timer));
    carousel.addEventListener('mouseleave',restart);
    restart();
  }

  function install(){
    if(typeof window.cityPage!=='function'){setTimeout(install,100);return;}
    if(window.cityPage.__soroUpdateCarousel)return;
    const original=window.cityPage;
    const wrapped=async function(box){
      await original(box);
      setTimeout(()=>start(box),20);
    };
    wrapped.__soroUpdateCarousel=true;
    window.cityPage=wrapped;
  }

  install();
})();
