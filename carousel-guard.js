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
function start(){guard();new MutationObserver(guard).observe(document.body,{childList:true,subtree:true});setInterval(guard,700);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();