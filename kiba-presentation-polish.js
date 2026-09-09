(function(){'use strict';
if(window.__kibaPresentationPolish)return;window.__kibaPresentationPolish=true;
function polish(){
 const root=document.getElementById('kibaIntroReplay');if(!root)return;
 const style=document.createElement('style');style.id='kibaPresentationPolishStyle';style.textContent=`
#kibaIntroReplay .horizon{position:absolute;left:0;right:0;bottom:29%;height:18%;z-index:2;pointer-events:none;background:linear-gradient(180deg,transparent,#08131c99);filter:blur(1px)}
#kibaIntroReplay .fog{position:absolute;left:-10%;right:-10%;bottom:27%;height:18%;z-index:3;opacity:.18;background:radial-gradient(ellipse at 20% 60%,#b9d0dc 0,transparent 38%),radial-gradient(ellipse at 70% 50%,#8ca8b7 0,transparent 34%);filter:blur(12px);animation:kFog 12s ease-in-out infinite alternate}
#kibaIntroReplay .tree{position:absolute;bottom:29%;z-index:4;width:70px;height:150px;opacity:.8;filter:drop-shadow(0 10px 10px #0008)}
#kibaIntroReplay .tree:before{content:"";position:absolute;left:34px;bottom:0;width:7px;height:75px;background:#18221f;border-radius:5px}
#kibaIntroReplay .tree:after{content:"";position:absolute;left:0;bottom:45px;width:70px;height:85px;background:radial-gradient(circle at 50% 35%,#19352f 0 35%,#10251f 36% 70%,transparent 71%);border-radius:50%}
#kibaIntroReplay .tree.t1{left:5%;transform:scale(.72)}#kibaIntroReplay .tree.t2{right:5%;transform:scale(.9)}#kibaIntroReplay .tree.t3{left:25%;transform:scale(.52);opacity:.55}
#kibaIntroReplay .kiba{filter:drop-shadow(0 24px 18px #000d) drop-shadow(0 0 18px #e0b65a18)}
#kibaIntroReplay .kiba svg{overflow:visible}
#kibaIntroReplay .kiba .body{filter:drop-shadow(0 4px 3px #0005)}
#kibaIntroReplay .kiba .beakshine{opacity:.55;animation:kBeak 2.2s ease-in-out infinite}
#kibaIntroReplay .kiba .chestshine{opacity:.18;animation:kChest 2.4s ease-in-out infinite}
#kibaIntroReplay .kiba .eyeGlow{animation:kEyeGlow 3s ease-in-out infinite}
#kibaIntroReplay .kiba .footmark{opacity:0;animation:kFootMark .84s ease-out infinite}
@keyframes kFog{from{transform:translateX(-3%)}to{transform:translateX(5%)}}@keyframes kBeak{0%,100%{opacity:.35}50%{opacity:.72}}@keyframes kChest{0%,100%{opacity:.12}50%{opacity:.25}}@keyframes kEyeGlow{0%,100%{opacity:.65}50%{opacity:1}}@keyframes kFootMark{0%{opacity:0;transform:translateY(0) scale(.5)}35%{opacity:.3}100%{opacity:0;transform:translateY(16px) scale(1.4)}}`;
 document.head.appendChild(style);
 const horizon=document.createElement('div');horizon.className='horizon';root.appendChild(horizon);
 ['t1','t2','t3'].forEach(c=>{const t=document.createElement('div');t.className='tree '+c;root.appendChild(t)});
 const fog=document.createElement('div');fog.className='fog';root.appendChild(fog);
 const svg=root.querySelector('.kiba svg');if(svg&&!svg.querySelector('.kibaExtra')){
   const ns='http://www.w3.org/2000/svg';const g=document.createElementNS(ns,'g');g.classList.add('kibaExtra');
   g.innerHTML=`<ellipse class="chestshine" cx="108" cy="145" rx="28" ry="30" fill="#fff3d4"/><path class="beakshine" d="M73 101c15-8 37-8 51 0" fill="none" stroke="#ffd98a" stroke-width="2.5" stroke-linecap="round"/><circle class="eyeGlow" cx="82" cy="84" r="14" fill="none" stroke="#ffd77b" stroke-width="2" opacity=".25"/><circle class="eyeGlow" cx="120" cy="84" r="14" fill="none" stroke="#ffd77b" stroke-width="2" opacity=".25"/><ellipse class="footmark" cx="84" cy="202" rx="16" ry="4" fill="#d7a74b"/><ellipse class="footmark" cx="133" cy="202" rx="16" ry="4" fill="#d7a74b"/>`;
   svg.appendChild(g);
 }
}
const original=window.showKibaPresentation;window.showKibaPresentation=function(){if(typeof original==='function')original();setTimeout(polish,30)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(polish,100));
})();