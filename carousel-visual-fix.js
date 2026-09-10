(()=>{'use strict';
function install(){
 if(document.getElementById('soro-carousel-fix-style'))return;
 const s=document.createElement('style');s.id='soro-carousel-fix-style';s.textContent=`
.soro-home-carousel.soro-v2 .soro-new-footer{position:absolute!important;left:0!important;right:0!important;bottom:18px!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:auto!important;z-index:50!important;pointer-events:auto!important}
.soro-home-carousel.soro-v2 .soro-new-dots{display:flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;gap:9px!important;padding:8px 12px!important;min-height:28px!important;background:rgba(5,10,20,.72)!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:999px!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important;backdrop-filter:blur(12px)!important}
.soro-home-carousel.soro-v2 .soro-new-dots button{display:block!important;visibility:visible!important;opacity:.45!important;width:8px!important;height:8px!important;min-width:8px!important;max-width:8px!important;min-height:8px!important;max-height:8px!important;padding:0!important;margin:0!important;border:0!important;border-radius:50%!important;background:#dbe8ff!important;box-shadow:none!important;transform:none!important;transition:all .3s ease!important}
.soro-home-carousel.soro-v2 .soro-new-dots button.active{opacity:1!important;width:28px!important;min-width:28px!important;max-width:28px!important;height:8px!important;background:#fff!important;box-shadow:0 0 14px rgba(190,220,255,.7)!important}
.soro-home-carousel.soro-v2 .soro-new-copy,.soro-home-carousel.soro-v2 .soro-new-stage{will-change:transform,opacity,filter}
@keyframes soroFix0{from{opacity:0;transform:translateY(32px) scale(.97);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}@keyframes soroFix1{from{opacity:0;transform:translateX(-55px)}to{opacity:1;transform:none}}@keyframes soroFix2{from{opacity:0;transform:scale(.82) translateX(35px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}@keyframes soroFix3{from{opacity:0;transform:translateY(48px) scale(.92)}to{opacity:1;transform:none}}@keyframes soroFix4{from{opacity:0;transform:scale(.78);filter:blur(10px)}to{opacity:1;transform:scale(1);filter:none}}
@keyframes soroStage0{from{opacity:0;transform:translateY(25px) rotate(-2deg)}to{opacity:1;transform:none}}@keyframes soroStage1{from{opacity:0;transform:translateX(45px) rotate(5deg)}to{opacity:1;transform:none}}@keyframes soroStage2{from{opacity:0;transform:scale(.65) rotate(-12deg)}to{opacity:1;transform:none}}@keyframes soroStage3{from{opacity:0;transform:translateY(-35px) scale(1.05)}to{opacity:1;transform:none}}@keyframes soroStage4{from{opacity:0;transform:scale(1.25);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}
`;
 document.head.appendChild(s);
}
const motions=[['soroFix0 .8s cubic-bezier(.2,.8,.2,1) both','soroStage0 1s cubic-bezier(.2,.8,.2,1) both'],['soroFix1 .8s cubic-bezier(.16,1,.3,1) both','soroStage1 1s cubic-bezier(.16,1,.3,1) both'],['soroFix2 .9s cubic-bezier(.16,1,.3,1) both','soroStage2 1s cubic-bezier(.16,1,.3,1) both'],['soroFix3 .85s cubic-bezier(.2,.9,.2,1) both','soroStage3 1s cubic-bezier(.2,.9,.2,1) both'],['soroFix4 .95s cubic-bezier(.16,1,.3,1) both','soroStage4 1s cubic-bezier(.16,1,.3,1) both']];
function apply(root,force=false){
 const dots=[...root.querySelectorAll('.soro-new-dots button')];const active=dots.findIndex(b=>b.classList.contains('active'));if(active<0)return;
 if(!force&&root.dataset.visualMotion===String(active))return;
 root.dataset.visualMotion=String(active);
 const copy=root.querySelector('.soro-new-copy'),stage=root.querySelector('.soro-new-stage');
 if(copy){copy.style.setProperty('animation','none','important');void copy.offsetWidth;copy.style.setProperty('animation',motions[active][0],'important');}
 if(stage){stage.style.setProperty('animation','none','important');void stage.offsetWidth;stage.style.setProperty('animation',motions[active][1],'important');}
}
function scan(){document.querySelectorAll('.soro-home-carousel.soro-v2').forEach(root=>apply(root));}
function start(){install();scan();setTimeout(scan,150);setTimeout(scan,500);setTimeout(scan,1200);new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(scan,250);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();