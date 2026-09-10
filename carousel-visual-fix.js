(()=>{'use strict';
function install(){
 if(document.getElementById('soro-carousel-fix-style'))return;
 const s=document.createElement('style');s.id='soro-carousel-fix-style';s.textContent=`
.soro-home-carousel.soro-v2 .soro-new-footer{position:absolute!important;left:0!important;right:0!important;bottom:18px!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:auto!important;z-index:50!important;pointer-events:auto!important}
.soro-home-carousel.soro-v2 .soro-new-dots{display:flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;gap:9px!important;padding:8px 12px!important;min-height:28px!important;background:rgba(5,10,20,.72)!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:999px!important;box-shadow:0 8px 24px rgba(0,0,0,.28)!important;backdrop-filter:blur(12px)!important}
.soro-home-carousel.soro-v2 .soro-new-dots button{display:block!important;visibility:visible!important;opacity:.42!important;width:8px!important;height:8px!important;min-width:8px!important;max-width:8px!important;min-height:8px!important;max-height:8px!important;padding:0!important;margin:0!important;border:0!important;border-radius:50%!important;background:#dbe8ff!important;box-shadow:none!important;transform:none!important;transition:all .3s ease!important;cursor:pointer!important}
.soro-home-carousel.soro-v2 .soro-new-dots button.active{opacity:1!important;width:28px!important;min-width:28px!important;max-width:28px!important;height:8px!important;background:#fff!important;box-shadow:0 0 18px rgba(190,220,255,.8)!important}
.soro-home-carousel.soro-v2 .soro-new-copy,.soro-home-carousel.soro-v2 .soro-new-stage{will-change:transform,opacity,filter}
`;
 document.head.appendChild(s);
}
const motions=[
 {copy:[{opacity:0,transform:'translateY(55px) scale(.96)',filter:'blur(7px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],stage:[{opacity:0,transform:'translateY(35px) scale(.88)'},{opacity:1,transform:'translateY(0) scale(1)'}]},
 {copy:[{opacity:0,transform:'translateX(-90px)'},{opacity:1,transform:'translateX(0)'}],stage:[{opacity:0,transform:'translateX(70px) rotate(8deg) scale(.9)'},{opacity:1,transform:'translateX(0) rotate(0) scale(1)'}]},
 {copy:[{opacity:0,transform:'scale(.72) rotate(-2deg)',filter:'blur(10px)'},{opacity:1,transform:'scale(1) rotate(0)',filter:'blur(0)'}],stage:[{opacity:0,transform:'scale(.55) rotate(-18deg)'},{opacity:1,transform:'scale(1) rotate(0)'}]},
 {copy:[{opacity:0,transform:'translateY(-70px) scale(1.05)'},{opacity:1,transform:'translateY(0) scale(1)'}],stage:[{opacity:0,transform:'translateY(-55px)'},{opacity:1,transform:'translateY(0)'}]},
 {copy:[{opacity:0,transform:'scale(1.25)',filter:'blur(12px)'},{opacity:1,transform:'scale(1)',filter:'blur(0)'}],stage:[{opacity:0,transform:'scale(1.45) rotate(12deg)'},{opacity:1,transform:'scale(1) rotate(0)'}]}
];
function animate(root,index){
 const m=motions[index]||motions[0];
 const copy=root.querySelector('.soro-new-copy'),stage=root.querySelector('.soro-new-stage');
 [copy,stage].forEach(x=>{if(x&&x.getAnimations)x.getAnimations().forEach(a=>a.cancel())});
 if(copy)copy.animate(m.copy,{duration:850,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 if(stage)stage.animate(m.stage,{duration:1050,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 const title=root.querySelector('.soro-new-title');
 const text=root.querySelector('.soro-new-text');
 const kicker=root.querySelector('.soro-new-kicker');
 if(title)title.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:180,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 if(text)text.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:280,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 if(kicker)kicker.animate([{opacity:0,transform:'translateY(-10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,delay:80,easing:'ease-out',fill:'both'});
}
function apply(root){
 const dots=[...root.querySelectorAll('.soro-new-dots button')];const active=dots.findIndex(b=>b.classList.contains('active'));if(active<0)return;
 if(root.dataset.visualMotion===String(active))return;
 root.dataset.visualMotion=String(active);animate(root,active);
}
function seasonKey(){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',month:'numeric',day:'numeric'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const n=Number(p.month)*100+Number(p.day);return n>=1221||n<=321?'VERÃO':n<=620?'OUTONO':n<=922?'INVERNO':'PRIMAVERA';
}
function watchSeason(root){
 const current=seasonKey();
 if(root.dataset.soroSeason&&root.dataset.soroSeason!==current){
   const station=root.querySelector('.soro-new-dots button[data-i="1"]');
   if(station)station.click();
 }
 root.dataset.soroSeason=current;
}
function scan(){document.querySelectorAll('.soro-home-carousel.soro-v2').forEach(root=>{apply(root);watchSeason(root);});}
function start(){install();scan();setTimeout(scan,150);setTimeout(scan,600);setTimeout(scan,1200);new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setInterval(scan,500);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();