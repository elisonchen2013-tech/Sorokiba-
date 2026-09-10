(()=>{'use strict';
function guard(){
  document.querySelectorAll('.hero').forEach(el=>{
    if(el.closest('.soro-home-carousel')) return;
    el.classList.remove('hero');
    el.classList.add('soro-home-carousel');
  });
  document.querySelectorAll('.soro-home-carousel,.soro-live-carousel').forEach(el=>{
    if(el.dataset.soroRebuilt==='1' && !el.querySelector('.soro-new-shell')) delete el.dataset.soroRebuilt;
  });
}
function start(){guard();new MutationObserver(guard).observe(document.body,{childList:true,subtree:true});setInterval(guard,700);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();