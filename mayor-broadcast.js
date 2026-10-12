/* Sorokiba Mayor Broadcast client */
(function(){
 'use strict';
 let stack=null,lastSeen=new Set(),polling=null;
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 function ensure(){if(stack)return stack;stack=document.createElement('div');stack.className='sorokiba-broadcast-stack';document.body.appendChild(stack);return stack}
 function playArrivalSound(){
   try{
     const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
     const ctx=new AC(),now=ctx.currentTime;
     [[740,0],[988,.12]].forEach(([freq,delay])=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,now+delay);gain.gain.setValueAtTime(.0001,now+delay);gain.gain.exponentialRampToValueAtTime(.10,now+delay+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.18);osc.connect(gain);gain.connect(ctx.destination);osc.start(now+delay);osc.stop(now+delay+.2)});
     setTimeout(()=>ctx.close(),700);
   }catch(e){}
 }
 function show(item){
   if(!item||!item.id||lastSeen.has(item.id))return;
   lastSeen.add(item.id);
   const el=document.createElement('article');el.className='sorokiba-broadcast '+esc(item.type);
   const duration=Math.max(5,Number(item.duration)||10);
   el.style.setProperty('--broadcast-duration',duration+'s');
   el.innerHTML='<button class="sorokiba-broadcast-close" aria-label="Fechar">×</button><div class="sorokiba-broadcast-head"><span class="sorokiba-broadcast-kicker">PREFEITURA DE SOROKIBA</span></div><div class="sorokiba-broadcast-title">'+esc(item.title||'Comunicado oficial')+'</div><div class="sorokiba-broadcast-message">'+esc(item.message)+'</div><div class="sorokiba-broadcast-meta">Publicado por '+esc(item.mayorName||'Prefeitura')+'</div><div class="sorokiba-broadcast-progress"></div>';
   ensure().prepend(el);\n   playArrivalSound();
   const close=()=>{el.style.opacity='0';el.style.transform='translateY(-8px)';setTimeout(()=>el.remove(),180)};
   el.querySelector('.sorokiba-broadcast-close').onclick=close;
   setTimeout(()=>{if(el.isConnected)close()},duration*1000);
   while(stack.children.length>3)stack.lastElementChild.remove();
 }
 async function poll(){
   try{
     const token=localStorage.getItem('sorokiba_token');
     if(!token)return;
     const r=await fetch('/api/mayor/broadcasts',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
     if(r.status===401){return}
     if(r.status===403){if(polling){clearInterval(polling);polling=null}return}
     if(!r.ok)return;
     const d=await r.json();(d.broadcasts||[]).forEach(show);
   }catch(e){}
 }
 function start(){if(polling)return;poll();polling=setInterval(poll,10000)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.sorokibaMayorBroadcast={refresh:poll,show};
})();