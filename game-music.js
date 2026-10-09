/* Sorokiba Audio Engine — trilhas contextuais e efeitos discretos, sem assets externos. */
(function (w, d) {
  'use strict';
  if (w.SorokibaAudio && w.SorokibaAudio.version === 3) return;
  const KEY='sorokibaAudio';
  const defaults={music:.34,sfx:.42,muted:false};
  let prefs={...defaults};
  try { prefs={...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}; } catch (_) {}
  prefs.music=Math.max(0,Math.min(1,Number(prefs.music)||0));
  prefs.sfx=Math.max(0,Math.min(1,Number(prefs.sfx)||0));
  let ctx=null, master=null, musicBus=null, sfxBus=null, timer=null, mode=null, nextTime=0, step=0, unlocked=false;
  const $=id=>d.getElementById(id);
  const midi=n=>440*Math.pow(2,(n-69)/12);
  const melodies={
    day:{bpm:94,notes:[72,76,79,76,74,76,81,79,72,76,79,83,81,79,76,74],chords:[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]]},
    night:{bpm:68,notes:[69,0,72,76,0,74,72,0,67,0,71,74,0,72,69,0],chords:[[45,52,57,60],[41,48,53,57],[48,55,60,64],[43,50,55,59]]},
    halloween:{bpm:66,notes:[69,0,70,69,0,65,67,0,72,70,0,67,65,0,62,0],chords:[[45,48,52],[47,50,53],[40,44,47],[45,48,52]]}
  };
  function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_){}}
  function init(){
    const AC=w.AudioContext||w.webkitAudioContext;if(!AC)return false;
    if(ctx){if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true;}
    ctx=new AC();
    master=ctx.createGain();master.gain.value=prefs.muted?0:1;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.knee.value=18;comp.ratio.value=3;comp.attack.value=.01;comp.release.value=.25;
    master.connect(comp);comp.connect(ctx.destination);
    musicBus=ctx.createGain();musicBus.gain.value=prefs.music;musicBus.connect(master);
    sfxBus=ctx.createGain();sfxBus.gain.value=prefs.sfx;sfxBus.connect(master);
    return true;
  }
  function tone(freq,duration,opts={}){
    if(!ctx)return;
    const t=opts.at===undefined?ctx.currentTime:opts.at, osc=ctx.createOscillator(), gain=ctx.createGain(), filter=ctx.createBiquadFilter();
    osc.type=opts.type||'sine';osc.frequency.setValueAtTime(Math.max(20,freq),t);
    if(opts.to)osc.frequency.exponentialRampToValueAtTime(Math.max(20,opts.to),t+duration);
    filter.type='lowpass';filter.frequency.value=opts.cutoff||2200;
    const peak=opts.volume===undefined?.04:opts.volume, attack=Math.min(opts.attack||.025,duration*.4);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+Math.max(.005,attack));
    gain.gain.setValueAtTime(Math.max(.0002,peak),Math.max(t+attack,t+duration*.55));
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(opts.bus||sfxBus);
    osc.start(t);osc.stop(t+duration+.03);return osc;
  }
  function noise(duration,opts={}){
    if(!ctx)return;
    const t=opts.at===undefined?ctx.currentTime:opts.at, length=Math.max(1,Math.floor(ctx.sampleRate*duration)), buffer=ctx.createBuffer(1,length,ctx.sampleRate), data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=buffer;filter.type=opts.filter||'bandpass';filter.frequency.value=opts.frequency||1800;filter.Q.value=opts.q||.7;
    gain.gain.setValueAtTime(Math.max(.0001,opts.volume||.025),t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(gain);gain.connect(opts.bus||sfxBus);source.start(t);source.stop(t+duration+.02);
  }
  function currentMode(){
    if(w.SorokibaHalloween&&typeof w.SorokibaHalloween.isActive==='function'&&w.SorokibaHalloween.isActive())return 'halloween';
    const h=new Date().getHours();return h>=6&&h<18?'day':'night';
  }
  function scheduleStep(){
    if(!ctx||!timer||prefs.muted||!mode)return;
    const m=melodies[mode], seconds=60/m.bpm/2;
    while(nextTime<ctx.currentTime+.22){
      const s=step%16, bar=Math.floor(step/16)%m.chords.length, t=nextTime, chord=m.chords[bar];
      if(s===0)chord.forEach((n,i)=>tone(midi(n),seconds*7,{at:t,bus:musicBus,volume:mode==='day'?.012:.016,attack:.4,type:'sine',cutoff:mode==='night'?1200:1900}));
      if(mode==='day'){
        if(s%4===0)tone(midi(chord[0]-12),seconds*1.4,{at:t,bus:musicBus,volume:.026,type:'triangle',to:midi(chord[0]-18),cutoff:600});
        if(s%2===0){const note=m.notes[s];if(note)tone(midi(note),.42,{at:t,bus:musicBus,volume:.018,type:'triangle',cutoff:2600});}
        if(s===7&&Math.random()<.18)tone(midi(84+Math.floor(Math.random()*4)),.12,{at:t,bus:musicBus,volume:.006,cutoff:4000});
      }else if(mode==='night'){
        if(s===0||s===8)chord.slice(0,3).forEach((n,i)=>tone(midi(n+12),1.05,{at:t+i*.035,bus:musicBus,volume:.015,type:'sine',cutoff:1500}));
        const note=m.notes[s];if(note)tone(midi(note),.7,{at:t,bus:musicBus,volume:.019,type:'sine',cutoff:1800});
        if(s===4)tone(midi(chord[0]-12),.35,{at:t,bus:musicBus,volume:.018,type:'triangle',cutoff:500});
      }else{
        if(s===0)tone(midi(chord[0]-12),1.2,{at:t,bus:musicBus,volume:.035,type:'triangle',to:midi(chord[0]-18),cutoff:700});
        if(s===4||s===12){const note=m.notes[s];if(note)tone(midi(note),.65,{at:t,bus:musicBus,volume:.024,type:'triangle',cutoff:1100});}
        if(s===7&&Math.random()<.12)tone(midi(42),.8,{at:t,bus:musicBus,volume:.008,to:midi(35),cutoff:350});
      }
      step++;nextTime+=seconds;
    }
  }
  function startMusic(forceMode){
    if(!prefs.music||prefs.muted)return;
    if(!init())return;
    const chosen=forceMode||currentMode();
    if(chosen===mode&&timer)return;
    if(timer)clearInterval(timer);
    mode=chosen;step=0;nextTime=ctx.currentTime+.08;
    timer=setInterval(scheduleStep,70);scheduleStep();paint();
  }
  function stopMusic(){if(timer)clearInterval(timer);timer=null;mode=null;paint();}
  const sounds={
    click(){tone(760,.045,{volume:.035,type:'triangle',to:520});},
    hover(){tone(1050,.025,{volume:.012,type:'sine',to:850});},
    notify(){tone(740,.12,{volume:.045});tone(990,.18,{at:ctx.currentTime+.1,volume:.035});},
    chat(){tone(540,.055,{volume:.025});tone(760,.07,{at:ctx.currentTime+.05,volume:.022});},
    error(){tone(220,.12,{volume:.04,type:'triangle',to:165});},
    unlock(){tone(392,.1,{volume:.04});tone(523,.13,{at:ctx.currentTime+.09,volume:.04});tone(784,.24,{at:ctx.currentTime+.18,volume:.035});},
    coin(){tone(988,.07,{volume:.04,type:'sine'});tone(1318,.16,{at:ctx.currentTime+.06,volume:.035});},
    buy(){tone(660,.09,{volume:.035,type:'triangle'});tone(880,.16,{at:ctx.currentTime+.07,volume:.03});},
    reward(){[523,659,784,1047].forEach((n,i)=>tone(n,.28,{at:ctx.currentTime+i*.085,volume:.04,type:'triangle'}));},
    jackpot(){[523,659,784,1047,1318].forEach((n,i)=>tone(n,.35,{at:ctx.currentTime+i*.09,volume:.045,type:'triangle'}));},
    levelUp(){[392,494,587,784].forEach((n,i)=>tone(n,.22,{at:ctx.currentTime+i*.11,volume:.04,type:'triangle'}));},
    roulette(){tone(1200,.035,{volume:.035,type:'triangle',to:900});},
    door(){noise(.16,{volume:.045,frequency:420,filter:'lowpass'});tone(95,.18,{volume:.04,to:65,type:'triangle'});},
    shopBell(){tone(1568,.55,{volume:.035,type:'sine',cutoff:2800});},
    atm(){[740,880,1040].forEach((n,i)=>tone(n,.055,{at:ctx.currentTime+i*.075,volume:.025,type:'triangle'}));},
    phone(){[660,880,660].forEach((n,i)=>tone(n,.12,{at:ctx.currentTime+i*.16,volume:.035,type:'sine'}));},
    monitor(){tone(880,.08,{volume:.02,type:'sine'});},
    exam(){tone(420,.25,{volume:.025,to:780,type:'sine'});},
    heal(){[523,659,784].forEach((n,i)=>tone(n,.35,{at:ctx.currentTime+i*.1,volume:.025,type:'sine'}));},
    rain(){noise(.5,{volume:.025,frequency:3600,filter:'highpass'});},
    wind(){noise(.65,{volume:.018,frequency:450,filter:'lowpass'});},
    ghost(){const t=ctx.currentTime;const o=tone(420,1.2,{at:t,volume:.035,to:270,type:'sine',cutoff:900});if(o){const l=ctx.createOscillator(),g=ctx.createGain();l.frequency.value=5;g.gain.value=10;l.connect(g);g.connect(o.frequency);l.start(t);l.stop(t+1.25);}},
    thunder(){noise(1.2,{volume:.07,frequency:160,filter:'lowpass'});tone(55,1.1,{volume:.035,to:35,type:'triangle',cutoff:220});},
    cauldron(){[180,220,150,260].forEach((n,i)=>tone(n,.15,{at:ctx.currentTime+i*.1,volume:.022,to:n*1.5,type:'triangle'}));}
  };
  function paint(){
    const toggle=$('smc-toggle'),state=$('smc-state'),music=$('smc-range'),sfx=$('smc-sfx-range'),percent=$('smc-percent'),sfxPercent=$('smc-sfx-percent'),mute=$('smc-mute');
    if(!toggle)return;
    toggle.textContent=prefs.music>0?'♫':'♪';toggle.setAttribute('aria-pressed',String(prefs.music>0));
    state.textContent=prefs.muted?'Silenciado':timer?(mode==='day'?'Trilha diurna':mode==='night'?'Trilha noturna':'Trilha de Halloween'):'Clique para iniciar';
    if(music)music.value=String(Math.round(prefs.music*100));if(sfx)sfx.value=String(Math.round(prefs.sfx*100));
    if(percent)percent.textContent=Math.round(prefs.music*100)+'%';if(sfxPercent)sfxPercent.textContent=Math.round(prefs.sfx*100)+'%';
    if(mute){mute.textContent=prefs.muted?'Ativar som':'Silenciar';mute.setAttribute('aria-pressed',String(prefs.muted));}
  }
  function buildUI(){
    if($('sorokiba-music-control'))return;
    const box=d.createElement('section');box.id='sorokiba-music-control';box.setAttribute('aria-label','Controles de áudio');
    box.innerHTML='<button type="button" id="smc-toggle" title="Ligar ou desligar música" aria-label="Ligar ou desligar música">♫</button><div class="smc-copy"><span class="smc-title">Áudio</span><span class="smc-state" id="smc-state">Clique para iniciar</span></div><label class="smc-volume"><span>Música</span><input id="smc-range" type="range" min="0" max="100" value="34" aria-label="Volume da música"><span id="smc-percent">34%</span></label><label class="smc-volume"><span>Efeitos</span><input id="smc-sfx-range" type="range" min="0" max="100" value="42" aria-label="Volume dos efeitos"><span id="smc-sfx-percent">42%</span></label><button type="button" id="smc-mute" aria-pressed="false">Silenciar</button>';
    d.body.appendChild(box);
    $('smc-toggle').addEventListener('click',()=>{if(prefs.music>0){prefs.music=0;stopMusic();}else{prefs.music=.34;startMusic();}save();if(musicBus)musicBus.gain.setTargetAtTime(prefs.music,ctx.currentTime,.15);paint();});
    $('smc-range').addEventListener('input',e=>{prefs.music=Number(e.target.value)/100;save();if(musicBus&&ctx)musicBus.gain.setTargetAtTime(prefs.music,ctx.currentTime,.12);if(prefs.music>0&&!prefs.muted)startMusic();else if(!prefs.music)stopMusic();paint();});
    $('smc-sfx-range').addEventListener('input',e=>{prefs.sfx=Number(e.target.value)/100;save();if(sfxBus&&ctx)sfxBus.gain.setTargetAtTime(prefs.sfx,ctx.currentTime,.12);paint();});
    $('smc-mute').addEventListener('click',()=>{prefs.muted=!prefs.muted;save();if(!init())return;master.gain.setTargetAtTime(prefs.muted?0:1,ctx.currentTime,.12);if(!prefs.muted&&prefs.music>0)startMusic();paint();});
    paint();
  }
  function unlock(){if(unlocked)return;unlocked=true;if(!init())return;if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(prefs.music>0&&!prefs.muted)startMusic();paint();}
  function boot(){buildUI();['pointerdown','keydown','touchstart'].forEach(ev=>d.addEventListener(ev,unlock,{once:true,capture:true,passive:true}));d.addEventListener('click',e=>{const el=e.target&&e.target.closest('button,a,[role=button],input[type=button],input[type=submit]');if(!el||el.closest('#sorokiba-music-control')||el.disabled||el.getAttribute('aria-disabled')==='true')return;const label=((el.innerText||el.value||el.getAttribute('aria-label')||'')+'').toLocaleLowerCase('pt-BR');if(/comprar|confirmar compra|adquirir|pagar/.test(label))w.SorokibaAudio.play('buy');else if(/resgatar|recompensa|conquista|subiu de nivel|subiu de nível/.test(label))w.SorokibaAudio.play('reward');else w.SorokibaAudio.play('click');},true);setInterval(()=>{if(!prefs.muted&&prefs.music>0&&unlocked){const desired=currentMode();if(desired!==mode)startMusic(desired);}},60000);paint();}
  w.SorokibaAudio={version:3,init,play(name){if(prefs.muted||prefs.sfx<=0)return;if(!init())return;if(ctx.state==='suspended')ctx.resume().catch(()=>{});const fn=sounds[name];if(fn)try{return fn();}catch(e){return;}},music:{start:startMusic,stop:stopMusic,get mode(){return mode;}},setMusicVolume(v){prefs.music=Math.max(0,Math.min(1,Number(v)||0));save();if(musicBus&&ctx)musicBus.gain.setTargetAtTime(prefs.music,ctx.currentTime,.12);if(prefs.music&&!prefs.muted)startMusic();else if(!prefs.music)stopMusic();paint();},setSfxVolume(v){prefs.sfx=Math.max(0,Math.min(1,Number(v)||0));save();if(sfxBus&&ctx)sfxBus.gain.setTargetAtTime(prefs.sfx,ctx.currentTime,.12);paint();},mute(b){prefs.muted=!!b;save();if(init())master.gain.setTargetAtTime(prefs.muted?0:1,ctx.currentTime,.12);if(!prefs.muted&&prefs.music)startMusic();paint();},get volumes(){return {...prefs};},get sounds(){return Object.keys(sounds);}};
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);