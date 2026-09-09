(()=>{
'use strict';
const STYLE='soro-carousel-motion-v2-style';
function inject(){
 if(document.getElementById(STYLE))return;
 const s=document.createElement('style');s.id=STYLE;s.textContent=`
.soro-live-carousel .soro-live-main{perspective:900px;transform-style:preserve-3d}
.soro-live-carousel .soro-live-main .soro-carousel-slide{animation:soroMsgIn .72s cubic-bezier(.18,.82,.24,1) both;transform-origin:50% 60%;will-change:transform,opacity,filter}
.soro-live-carousel .soro-live-main .soro-carousel-tag{animation:soroTagIn .55s .08s cubic-bezier(.2,.8,.2,1) both}
.soro-live-carousel .soro-live-main .soro-carousel-title{animation:soroTitleIn .65s .14s cubic-bezier(.16,.82,.24,1) both}
.soro-live-carousel .soro-live-main .soro-carousel-text{animation:soroTextIn .62s .22s cubic-bezier(.16,.82,.24,1) both}
.soro-live-carousel .soro-live-main .soro-carousel-accent{animation:soroAccentIn .7s .3s cubic-bezier(.18,.9,.24,1) both}
.soro-live-carousel .soro-live-dots button{transition:transform .28s ease,opacity .28s ease,filter .28s ease}
.soro-live-carousel .soro-live-dots button:hover{transform:scale(1.18);filter:brightness(1.25)}
.soro-live-carousel.soro-motion-pulse .soro-live-main .soro-carousel-slide{animation:soroMsgInAlt .72s cubic-bezier(.18,.82,.24,1) both}
.soro-live-carousel.soro-motion-pulse .soro-live-main .soro-carousel-tag{animation-delay:.04s}
.soro-live-carousel.soro-motion-pulse .soro-live-main .soro-carousel-title{animation-delay:.1s}
.soro-live-carousel.soro-motion-pulse .soro-live-main .soro-carousel-text{animation-delay:.18s}
.soro-live-carousel.soro-motion-pulse .soro-live-main .soro-carousel-accent{animation-delay:.26s}
@keyframes soroMsgIn{0%{opacity:0;transform:translate3d(-34px,10px,0) rotateY(5deg) scale(.97);filter:blur(7px)}60%{opacity:1;transform:translate3d(4px,-2px,0) rotateY(-1deg) scale(1.005);filter:blur(0)}100%{opacity:1;transform:none;filter:none}}
@keyframes soroMsgInAlt{0%{opacity:0;transform:translate3d(34px,8px,0) rotateY(-5deg) scale(.97);filter:blur(7px)}60%{opacity:1;transform:translate3d(-4px,-2px,0) rotateY(1deg) scale(1.005);filter:blur(0)}100%{opacity:1;transform:none;filter:none}}
@keyframes soroTagIn{0%{opacity:0;transform:translateY(12px);filter:blur(5px)}100%{opacity:1;transform:none;filter:none}}
@keyframes soroTitleIn{0%{opacity:0;transform:translateY(18px) scale(.96);filter:blur(6px)}100%{opacity:1;transform:none;filter:none}}
@keyframes soroTextIn{0%{opacity:0;transform:translateY(15px);filter:blur(5px)}100%{opacity:1;transform:none;filter:none}}
@keyframes soroAccentIn{0%{opacity:0;transform:translateY(18px) scale(.9)}70%{opacity:1;transform:translateY(-2px) scale(1.02)}100%{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.soro-live-carousel *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}
`;
 document.head.appendChild(s);
}
function enhance(root){
 if(root.dataset.motionV2==='1')return;
 root.dataset.motionV2='1';
 let last='';let flip=false;
 const play=()=>{
  const main=root.querySelector('.soro-live-main');
  if(!main)return;
  const slide=main.querySelector('.soro-carousel-slide');
  if(!slide)return;
  const signature=(slide.textContent||'').trim();
  if(signature===last)return;
  last=signature;flip=!flip;
  root.classList.toggle('soro-motion-pulse',flip);
  slide.classList.remove('soro-motion-restart');
  void slide.offsetWidth;
  slide.classList.add('soro-motion-restart');
 };
 play();
 new MutationObserver(()=>requestAnimationFrame(play)).observe(root,{childList:true,subtree:true,characterData:true});
}
function start(){inject();document.querySelectorAll('.soro-live-carousel').forEach(enhance);new MutationObserver(()=>document.querySelectorAll('.soro-live-carousel').forEach(enhance)).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
