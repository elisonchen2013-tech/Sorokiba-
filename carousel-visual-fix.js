(()=>{'use strict';
function install(){
 if(document.getElementById('soro-carousel-decoration-style'))return;
 const s=document.createElement('style');s.id='soro-carousel-decoration-style';s.textContent=`
.soro-home-carousel.soro-v2 .soro-new-copy,.soro-home-carousel.soro-v2 .soro-new-stage{transform:none!important;will-change:auto!important}
.soro-home-carousel.soro-v2 .soro-decor{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;border-radius:24px}
.soro-home-carousel.soro-v2 .soro-decor span{position:absolute;display:block;pointer-events:none}
.soro-home-carousel.soro-v2 .soro-decor .glow{width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(125,178,255,.22),rgba(125,178,255,.07) 35%,transparent 70%);filter:blur(2px);animation:decorGlow 3s ease-in-out infinite}
.soro-home-carousel.soro-v2 .soro-decor .ring{width:250px;height:250px;border:1px solid rgba(160,204,255,.22);border-radius:50%;right:10%;top:10%;box-shadow:0 0 40px rgba(95,160,255,.08);animation:decorRing 7s linear infinite}
.soro-home-carousel.soro-v2 .soro-decor .ring2{width:170px;height:170px;border:1px dashed rgba(170,210,255,.24);right:15%;top:21%;border-radius:50%;animation:decorRingReverse 5s linear infinite}
.soro-home-carousel.soro-v2 .soro-decor .beam{width:2px;height:180px;left:64%;top:12%;background:linear-gradient(transparent,rgba(200,225,255,.55),transparent);filter:blur(1px);transform:rotate(35deg);opacity:.35;animation:decorBeam 3.8s ease-in-out infinite}
.soro-home-carousel.soro-v2 .soro-decor .particle{width:5px;height:5px;border-radius:50%;background:#d8ebff;box-shadow:0 0 14px #83bdff;animation:decorParticle 2.8s ease-in-out infinite}
.soro-home-carousel.soro-v2 .soro-decor .p1{right:31%;top:24%}.soro-home-carousel.soro-v2 .soro-decor .p2{right:18%;top:52%;animation-delay:.8s}.soro-home-carousel.soro-v2 .soro-decor .p3{right:39%;top:67%;animation-delay:1.5s}.soro-home-carousel.soro-v2 .soro-decor .p4{left:52%;top:19%;animation-delay:2s}
.soro-home-carousel.soro-v2 .soro-decor .ray{width:130px;height:130px;border:1px solid rgba(255,214,120,.16);border-radius:50%;right:19%;top:25%;box-shadow:0 0 60px rgba(255,190,70,.08);animation:decorRay 4s ease-in-out infinite}
.soro-home-carousel.soro-v2[data-decor="0"] .soro-decor .glow{background:radial-gradient(circle,rgba(255,215,112,.28),rgba(255,215,112,.06) 42%,transparent 72%)}
.soro-home-carousel.soro-v2[data-decor="0"] .soro-decor .ray{border-color:rgba(255,218,125,.3)}
.soro-home-carousel.soro-v2[data-decor="1"] .soro-decor .glow{background:radial-gradient(circle,rgba(255,202,112,.23),rgba(255,168,74,.06) 42%,transparent 72%)}
.soro-home-carousel.soro-v2[data-decor="2"] .soro-decor .glow{background:radial-gradient(circle,rgba(110,185,255,.28),rgba(110,185,255,.05) 42%,transparent 72%)}
.soro-home-carousel.soro-v2[data-decor="2"] .soro-decor .ring{border-color:rgba(160,215,255,.3)}
.soro-home-carousel.soro-v2[data-decor="3"] .soro-decor .glow{background:radial-gradient(circle,rgba(130,220,190,.22),rgba(100,180,255,.05) 42%,transparent 72%)}
.soro-home-carousel.soro-v2[data-decor="3"] .soro-decor .particle{background:#d5fff0;box-shadow:0 0 14px #72d7b5}
.soro-home-carousel.soro-v2[data-decor="4"] .soro-decor .glow{background:radial-gradient(circle,rgba(175,140,255,.23),rgba(95,145,255,.05) 42%,transparent 72%)}
@keyframes decorGlow{0%,100%{opacity:.35;transform:scale(.82)}50%{opacity:.85;transform:scale(1.12)}}
@keyframes decorRing{to{transform:rotate(360deg)}}@keyframes decorRingReverse{to{transform:rotate(-360deg)}}
@keyframes decorBeam{0%,100%{opacity:.08;filter:blur(5px)}50%{opacity:.6;filter:blur(1px)}}
@keyframes decorParticle{0%,100%{opacity:.18;transform:scale(.65)}50%{opacity:1;transform:scale(1.7)}}
@keyframes decorRay{0%,100%{opacity:.15;transform:scale(.82);box-shadow:0 0 30px rgba(255,205,100,.04)}50%{opacity:.65;transform:scale(1.12);box-shadow:0 0 80px rgba(255,205,100,.16)}}
.soro-home-carousel.soro-v2 .soro-new-dots{position:relative;z-index:60}
.soro-home-carousel.soro-v2 .soro-new-dots button.active{animation:dotActive 1.5s ease-in-out infinite}
@keyframes dotActive{0%,100%{box-shadow:0 0 8px rgba(190,220,255,.35)}50%{box-shadow:0 0 22px rgba(190,220,255,.9)}}
@media(prefers-reduced-motion:reduce){.soro-home-carousel.soro-v2 .soro-decor *,.soro-home-carousel.soro-v2 .soro-new-dots button.active{animation:none!important}}
`;
 document.head.appendChild(s);
}
function decorations(root){
 let d=root.querySelector('.soro-decor');if(!d){d=document.createElement('div');d.className='soro-decor';d.innerHTML='<span class="glow"></span><span class="ring"></span><span class="ring2"></span><span class="beam"></span><span class="ray"></span><span class="particle p1"></span><span class="particle p2"></span><span class="particle p3"></span><span class="particle p4"></span>';root.querySelector('.soro-new-shell')?.appendChild(d)}
}
function apply(root){
 const dots=[...root.querySelectorAll('.soro-new-dots button')];const active=dots.findIndex(b=>b.classList.contains('active'));if(active<0)return;
 decorations(root);root.dataset.decor=String(active);
}
function seasonKey(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',month:'numeric',day:'numeric'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const n=Number(p.month)*100+Number(p.day);return n>=1221||n<=321?'VERÃO':n<=620?'OUTONO':n<=922?'INVERNO':'PRIMAVERA'}
function watchSeason(root){const current=seasonKey();if(root.dataset.soroSeason&&root.dataset.soroSeason!==current){root.querySelector('.soro-new-dots button[data-i="1"]')?.click()}root.dataset.soroSeason=current}
function scan(){document.querySelectorAll('.soro-home-carousel.soro-v2').forEach(root=>{apply(root);watchSeason(root)})}
function start(){install();scan();setTimeout(scan,200);setTimeout(scan,900);new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(scan,1000)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();