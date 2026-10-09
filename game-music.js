/* Sorokiba Music Engine: síntese ambiente local, sem assets externos. */
(function(){
  'use strict';
  if(window.__sorokibaMusicEngineLoaded)return;
  window.__sorokibaMusicEngineLoaded=true;
  const KEY='sorokiba.music.settings.v1';
  const defaults={enabled:true,volume:0.32};
  let settings={...defaults};
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');settings={...defaults,...saved};}catch(_){}
  let ctx=null,master=null,playing=false,timer=null,step=0,unlockBound=false;
  const notes=[261.63,329.63,392.00,493.88,392.00,329.63,293.66,349.23,440.00,523.25,440.00,349.23,246.94,293.66,369.99,440.00];
  const chordRoots=[130.81,146.83,110.00,123.47];
  function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}}
  function ui(){
    if(document.getElementById('sorokiba-music-control'))return;
    const box=document.createElement('div');box.id='sorokiba-music-control';box.setAttribute('aria-label','Controles de música');
    box.innerHTML='<button type="button" id="smc-toggle" aria-label="Ligar ou desligar música" title="Ligar ou desligar música">♫</button><div class="smc-copy"><span class="smc-title">Música</span><span class="smc-state" id="smc-state">Aguardando interação</span></div><label class="smc-volume" title="Volume da música"><input id="smc-range" type="range" min="0" max="100" step="1" aria-label="Volume da música"><span id="smc-percent">32%</span></label>';
    document.body.appendChild(box);
    box.querySelector('#smc-toggle').addEventListener('click',()=>{settings.enabled=!settings.enabled;save();if(settings.enabled)start();else stop();paint();});
    box.querySelector('#smc-range').addEventListener('input',e=>{settings.volume=Number(e.target.value)/100;save();if(master&&ctx)master.gain.setTargetAtTime(settings.volume,ctx.currentTime,.12);paint();});
    paint();
  }
  function paint(){
    const b=document.getElementById('smc-toggle'),s=document.getElementById('smc-state'),r=document.getElementById('smc-range'),p=document.getElementById('smc-percent');
    if(!b)return;
    b.textContent=settings.enabled?'♫':'♪';b.setAttribute('aria-pressed',String(settings.enabled));
    s.textContent=!settings.enabled?'Desligada':playing?'Reproduzindo':'Toque para iniciar';
    r.value=String(Math.round(settings.volume*100));p.textContent=Math.round(settings.volume*100)+'%';
  }
  function ensureAudio(){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    if(!ctx){ctx=new AC();master=ctx.createGain();master.gain.value=settings.volume;master.connect(ctx.destination);}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return true;
  }
  function tone(freq,start,duration,volume,type){
    if(!ctx||!master)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    osc.type=type||'sine';osc.frequency.setValueAtTime(freq,start);
    filter.type='lowpass';filter.frequency.value=1500;
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.08);
    gain.gain.setValueAtTime(Math.max(.0002,volume),start+Math.max(.1,duration-.12));
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(master);
    osc.start(start);osc.stop(start+duration+.03);
  }
  function scheduleBar(){
    if(!ctx||!playing||!settings.enabled)return;
    const now=ctx.currentTime+.04;
    const melody=notes[step%notes.length],root=chordRoots[Math.floor(step/4)%chordRoots.length];
    tone(root,now,1.8,.055,'triangle');
    tone(root*1.5,now,1.6,.026,'sine');
    tone(melody,now+.02,step%4===3?1.15:.78,.035,'sine');
    if(step%4===0)tone(melody*2,now+.28,.35,.009,'sine');
    step++;
  }
  function start(){
    if(!settings.enabled)return;
    if(!ensureAudio()){paint();return;}
    if(master)master.gain.setTargetAtTime(settings.volume,ctx.currentTime,.25);
    playing=true;
    if(timer)clearInterval(timer);
    scheduleBar();timer=setInterval(scheduleBar,900);
    paint();
  }
  function stop(){
    playing=false;if(timer){clearInterval(timer);timer=null;}
    if(master&&ctx)master.gain.setTargetAtTime(0,ctx.currentTime,.15);
    paint();
  }
  function resumeVolume(){
    if(!settings.enabled)return;
    if(!ensureAudio())return;
    if(master)master.gain.setTargetAtTime(settings.volume,ctx.currentTime,.25);
    if(!playing)start();
    else paint();
    if(unlockBound){['pointerdown','keydown','touchstart'].forEach(ev=>document.removeEventListener(ev,resumeVolume,true));unlockBound=false;}
  }
  function boot(){
    ui();
    if(settings.enabled&&!unlockBound){
      unlockBound=true;
      ['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,resumeVolume,{capture:true,passive:true,once:true}));
    }
    paint();
  }
  window.sorokibaMusic={start,stop,toggle(){settings.enabled=!settings.enabled;save();if(settings.enabled)start();else stop();},setVolume(v){settings.volume=Math.max(0,Math.min(1,Number(v)||0));save();if(master&&ctx)master.gain.setTargetAtTime(settings.volume,ctx.currentTime,.12);paint();},getState(){return {...settings,playing,available:!!(window.AudioContext||window.webkitAudioContext)}}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();