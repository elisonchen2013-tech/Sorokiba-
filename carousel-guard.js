(()=>{'use strict';
function guard(){
  document.querySelectorAll('.hero').forEach(old=>{
    if(old.closest('.soro-home-carousel'))return;
    const fresh=document.createElement('section');
    fresh.className='soro-home-carousel';
    fresh.setAttribute('data-soro-guard','1');
    old.replaceWith(fresh);
  });
}
function loadCopy(){
  if(document.querySelector('script[data-soro-carousel-copy]'))return;
  const s=document.createElement('script');
  s.src='/carousel-copy-polish.js?v=16';
  s.dataset.soroCarouselCopy='1';
  document.body.appendChild(s);
}
function start(){guard();loadCopy();new MutationObserver(()=>{guard();loadCopy()}).observe(document.body,{childList:true,subtree:true});setInterval(guard,700);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();