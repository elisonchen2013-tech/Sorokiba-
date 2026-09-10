(()=>{'use strict';
function install(){
 if(document.getElementById('soro-carousel-fix-style'))return;
 const s=document.createElement('style');s.id='soro-carousel-fix-style';s.textContent=`
.soro-home-carousel.soro-v2 .soro-new-footer{position:absolute!important;left:0!important;right:0!important;bottom:18px!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:auto!important;z-index:50!important;pointer-events:auto!important}
.soro-home-carousel.soro-v2 .soro-new-dots{display:flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;gap:9px!important;padding:8px 12px!important;min-height:28px!important;background:rgba(5,10,20,.72)!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:999px!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important;backdrop-filter:blur(12px)!important}
.soro-home-carousel.soro-v2 .soro-new-dots button{display:block!important;visibility:visible!important;opacity:.45!important;width:8px!important;height:8px!important;min-width:8px!important;max-width:8px!important;min-height:8px!important;max-height:8px!important;padding:0!important;margin:0!important;border:0!important;border-radius:50%!important;background:#dbe8ff!important;box-shadow:none!important;transform:none!important}
.soro-home-carousel.soro-v2 .soro-new-dots button.active{opacity:1!important;width:28px!important;min-width:28px!important;max-width:28px!important;height:8px!important;background:#fff!important;box-shadow:0 0 14px rgba(190,220,255,.7)!important}
.soro-home-carousel.soro-v2 .soro-new-copy,.soro-home-carousel.soro-v2 .soro-new-stage{will-change:transform,opacity,filter}
.soro-home-carousel.soro-v2[data-motion="0"] .soro-new-copy{animation:soroFix0 .75s ease-out both}.soro-home-carousel.soro-v2[data-motion="1"] .soro-new-copy{animation:soroFix1 .75s cubic-bezier(.2,.8,.2,1) both}.soro-home-carousel.soro-v2[data-motion="2"] .soro-new-copy{animation:soroFix2 .8s cubic-bezier(.16,1,.3,1) both}.soro-home-carousel.soro-v2[data-motion="3"] .soro-new-copy{animation:soroFix3 .75s cubic-bezier(.2,.9,.2,1) both}.soro-home-carousel.soro-v2[data-motion="4"] .soro-new-copy{animation:soroFix4 .85s ease both}
.soro-home-carousel.soro-v2[data-motion="0"] .soro-new-stage{animation:soroStage0 1s ease-out both}.soro-home-carousel.soro-v2[data-motion="1"] .soro-new-stage{animation:soroStage1 1s ease-out both}.soro-home-carousel.soro-v2[data-motion="2"] .soro-new-stage{animation:soroStage2 1s ease-out both}.soro-home-carousel.soro-v2[data-motion="3"] .soro-new-stage{animation:soroStage3 1s ease-out both}.soro-home-carousel.soro-v2[data-motion="4"] .soro-new-stage{animation:soroStage4 1s ease-out both}
@keyframes soroFix0{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}@keyframes soroFix1{from{opacity:0;transform:translateX(-48px)}to{opacity:1;transform:none}}@keyframes soroFix2{from{opacity:0;transform:scale(.9) translateX(25px);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}@keyframes soroFix3{from{opacity:0;transform:translateY(45px) scale(.94)}to{opacity:1;transform:none}}@keyframes soroFix4{from{opacity:0;transform:scale(.84);filter:blur(8px)}to{opacity:1;transform:scale(1);filter:none}}
@keyframes soroStage0{from{opacity:.2;transform:translateY(20px)}to{opacity:1;transform:none}}@keyframes soroStage1{from{opacity:.2;transform:translateX(35px) rotate(3deg)}to{opacity:1;transform:none}}@keyframes soroStage2{from{opacity:.2;transform:scale(.75) rotate(-8deg)}to{opacity:1;transform:none}}@keyframes soroStage3{from{opacity:.2;transform:translateY(-30px)}to{opacity:1;transform:none}}@keyframes soroStage4{from{opacity:.2;transform:scale(1.18)}to{opacity:1;transform:none}}
`;
 document.head.appendChild(s);
}
function apply(root){
 if(!root||!root.classList.contains('soro-v2'))return;
 const dots=[...root.querySelectorAll('.soro-new-dots button')];
 const active=dots.findIndex(b=>b.classList.contains('active')); if(active<0)return;
 if(root.dataset.motion===String(active))return;
 root.dataset.motion=String(active);
 const copy=root.querySelector('.soro-new-copy'),stage=root.querySelector('.soro-new-stage');
 [copy,stage].forEach(el=>{if(!el)return;el.style.animation='none';void el.offsetWidth;el.style.animation='';});
}
function scan(){document.querySelectorAll('.soro-home-carousel.soro-v2').forEach(root=>{apply(root);if(root.dataset.fixObserved)return;root.dataset.fixObserved='1';new MutationObserver(()=>apply(root)).observe(root,{subtree:true,attributes:true,attributeFilter:['class']});});}
function start(){install();scan();setTimeout(scan,200);setTimeout(scan,1000);new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();