/* Sorokiba Audio v2 — trilhas, ambiências e efeitos 100% sintetizados (Web Audio API). Sem arquivos de áudio. */
(function (w) {
  let ctx, cv, sv, phrase = [], master, musicG, sfxG, ambG, mus, dl, noiseBuf, wanted = null, timer = null, mode = null, step = 0, next = 0, amb = null;
  const vol = { music: 0.6, sfx: 0.8, muted: false };
  try { Object.assign(vol, JSON.parse(localStorage.getItem('sorokibaAudio') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('sorokibaAudio', JSON.stringify(vol)); } catch (e) {} };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), now = () => ctx.currentTime, rnd = a => a[Math.floor(Math.random() * a.length)];

  // reverb sintético: sec = tamanho da sala, a = brilho (menor = mais escuro/abafado)
  function setIR(sec, a) {
    const L = Math.floor(ctx.sampleRate * sec), ib = ctx.createBuffer(2, L, ctx.sampleRate), k = Math.sqrt((2 - a) / a) * .8;
    for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); let y = 0; for (let i = 0; i < L; i++) { y += ((Math.random() * 2 - 1) - y) * a; d[i] = y * k * Math.pow(1 - i / L, 3); } }
    cv.buffer = ib; sv.buffer = ib;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (w.AudioContext || w.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(), sh = ctx.createWaveShaper(), cu = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; cu[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
    sh.curve = cu; sh.oversample = '2x';
    master = ctx.createGain(); master.gain.value = vol.muted ? 0 : 1; master.connect(sh); sh.connect(comp); comp.connect(ctx.destination);
    musicG = ctx.createGain(); musicG.gain.value = 0; musicG.connect(master);
    sfxG = ctx.createGain(); sfxG.gain.value = vol.sfx; sfxG.connect(master);
    ambG = ctx.createGain(); ambG.gain.value = vol.music * 1.2; ambG.connect(master);
    mus = ctx.createBiquadFilter(); mus.type = 'lowpass'; mus.frequency.value = 2600; mus.connect(musicG);
    cv = ctx.createConvolver(); sv = ctx.createConvolver(); setIR(2, .4);
    const rg = ctx.createGain(), sg = ctx.createGain(); rg.gain.value = .3; sg.gain.value = .18;
    mus.connect(rg); rg.connect(cv); cv.connect(musicG); sfxG.connect(sg); sg.connect(sv); sv.connect(master); // sala dos efeitos acompanha o clima
    dl = ctx.createDelay(2); dl.delayTime.value = .4; // eco que acompanha o andamento
    const fb = ctx.createGain(), dg = ctx.createGain(); fb.gain.value = .35; dg.gain.value = .22;
    mus.connect(dg); dg.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(musicG);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  function tone(f, dur, o = {}) {
    const t = o.t ?? now(), os = ctx.createOscillator(), g = ctx.createGain(), v = o.v ?? .2, a = o.a ?? .005;
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
    if (o.sus) g.gain.setValueAtTime(v, t + dur * o.sus);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g);
    if (o.p != null) { const pn = ctx.createStereoPanner(); pn.pan.value = o.p; g.connect(pn); pn.connect(o.d || sfxG); } else g.connect(o.d || sfxG);
    os.start(t); os.stop(t + dur + .05); return os;
  }
  function noise(dur, o = {}) {
    const t = o.t ?? now(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = o.ft || 'highpass'; f.frequency.setValueAtTime(o.f || 6000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(o.v ?? .1, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.d || sfxG); s.start(t); s.stop(t + dur + .05);
  }
  const bell = (f, t, v, d) => [1, 2.76, 5.4].forEach((m, i) => tone(f * m, 1.8 / (i + 1), { t, v: v / (i + 1), d }));
  const vib = (os, rate, depth, t, dur) => { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur); };
  const chirp = (t, d = musicG) => { const n = 2 + Math.floor(Math.random() * 3), f = 2800 + Math.random() * 1500; for (let i = 0; i < n; i++) tone(f, .07, { t: t + i * .09, v: .025, to: f * 1.35, d, p: Math.random() * .8 - .4 }); };
  const cricket = (t, d = musicG) => { for (let i = 0; i < 4; i++) tone(4300, .035, { t: t + i * .055, v: .012, d }); };
  const owl = (t, d = musicG) => [0, .6].forEach((o, i) => tone(i ? 380 : 430, .45, { t: t + o, v: .07, to: i ? 320 : 370, a: .09, d, p: -.3 }));
  const crow = (t, d = musicG) => { for (let i = 0; i < 3; i++) tone(540, .2, { t: t + i * .3, type: 'sawtooth', v: .035, to: 360, d }); };
  const arp = (notes, gap, o = {}) => { const t = now(); notes.forEach((f, i) => tone(f, o.dur || .5, { type: o.type || 'triangle', v: o.v || .14, t: t + i * gap })); };

  /* ---------- Efeitos ---------- */
  const SFX = {
    // interface
    click() { tone(900, .07, { type: 'triangle', v: .15, to: 600 }); },
    hover() { tone(1400, .03, { type: 'triangle', v: .05 }); },
    notify() { const t = now(); tone(784, .25, { t, v: .15 }); tone(1047, .45, { t: t + .12, v: .15 }); },
    chat() { tone(600, .08, { type: 'triangle', v: .12 }); tone(900, .12, { type: 'triangle', v: .12, t: now() + .07 }); },
    type() { noise(.02, { v: .12, f: 3000 }); },
    whoosh() { noise(.4, { ft: 'bandpass', f: 400, to: 3000, v: .2 }); },
    error() { const t = now(); tone(180, .18, { type: 'square', v: .1, t }); tone(140, .3, { type: 'square', v: .1, t: t + .15 }); },
    unlock() { const t = now(); tone(300, .08, { type: 'square', v: .1, t }); tone(450, .08, { type: 'square', v: .1, t: t + .09 }); tone(900, .5, { type: 'triangle', t: t + .2 }); },
    // dinheiro e recompensas
    coin() { const t = now(); tone(988, .08, { type: 'square', v: .09, t }); tone(1319, .4, { type: 'square', v: .09, t: t + .08 }); },
    coins() { const t = now(); for (let i = 0; i < 9; i++) tone(1200 + Math.random() * 900, .12, { type: 'square', v: .05, t: t + i * .06 + Math.random() * .03, p: Math.random() * 2 - 1 }); },
    buy() { const t = now(); noise(.05, { v: .15, f: 4000 }); tone(1568, .12, { type: 'triangle', t: t + .02 }); tone(2093, .5, { type: 'triangle', t: t + .12 }); tone(1047, .5, { v: .08, t: t + .12 }); },
    reward() {
      const t = now();
      [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(f, .5, { type: 'triangle', t: t + i * .09, v: .16 }); tone(f * 2, .3, { t: t + i * .09, v: .05 }); });
      [523, 659, 784, 1047].forEach(f => tone(f, 1.1, { type: 'triangle', t: t + .5, v: .09 })); noise(.6, { t: t + .45, v: .04, f: 9000 });
    },
    jackpot() { SFX.reward(); const t = now() + .6; [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, .9, { type: 'triangle', t: t + i * .1, v: .1 })); setTimeout(SFX.coins, 700); setTimeout(SFX.coins, 1300); },
    levelUp() { const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, { type: 'square', v: .07, t: t + i * .12 })); [523, 784, 1047, 1568].forEach(f => tone(f, 1.2, { type: 'triangle', v: .1, t: t + .5 })); },
    achievement() { arp([659, 988, 1319, 1976], .1, { dur: .8 }); bell(1568, now() + .35, .1); },
    roulette(o = {}) { // devolve a duração real (s) para sincronizar a animação
      const t0 = now(), dur = o.duration || 4; let t = 0, iv = .045, i = 0;
      while (t < dur) { noise(.03, { t: t0 + t, v: .25, f: 2500, ft: 'bandpass' }); tone(i % 2 ? 1500 : 1300, .04, { t: t0 + t, v: .1, type: 'triangle' }); t += iv; iv *= 1.07; i++; }
      if (o.prize !== false) setTimeout(() => SFX[o.prizeSound || 'reward'](), (t + .15) * 1000);
      return t;
    },
    // cidade
    door() { noise(.25, { ft: 'lowpass', f: 500, v: .3 }); tone(90, .25, { type: 'sawtooth', v: .1, to: 60 }); },
    step() { noise(.06, { ft: 'lowpass', f: 700, v: .2 }); },
    shopBell() { bell(1568, now(), .12); },
    atm() { const t = now(); [0, 1, 2].forEach(i => tone(1000 + i * 150, .06, { type: 'square', v: .06, t: t + i * .09 })); },
    phone() { const t = now(); for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, .1, { type: 'triangle', v: .1, t: t + i * .11 + (i > 2 ? .35 : 0) }); },
    siren() { const t = now(), os = tone(700, 3, { type: 'sawtooth', v: .06, sus: .85 }); for (let i = 0; i < 3; i++) { os.frequency.linearRampToValueAtTime(1000, t + i + .5); os.frequency.linearRampToValueAtTime(700, t + i + 1); } },
    multa() { tone(110, .15, { v: .4, to: 50 }); noise(.08, { ft: 'lowpass', f: 800, v: .3 }); setTimeout(SFX.error, 200); },
    // hospital
    monitor() { const t = now(); [0, .8, 1.6].forEach(d => tone(1000, .12, { v: .1, t: t + d })); },
    exam() { const t = now(); [0, .9].forEach(d => tone(400, .8, { v: .08, to: 1200, t: t + d })); },
    heal() { arp([523, 659, 784, 1047, 1319, 1568], .08, { type: 'sine', dur: .9, v: .1 }); },
    // Halloween
    buyHalloween() { const t = now(); bell(659, t, .12); bell(494, t + .35, .1); tone(330, 1, { type: 'sawtooth', v: .05, to: 110, t: t + .1 }); noise(.9, { t, v: .07, f: 3000, to: 300, ft: 'bandpass' }); tone(70, .4, { v: .3, to: 40, t }); SFX.cauldron(); },
    ghost() { const os = tone(420, 1.6, { v: .12, to: 300, a: .3 }); vib(os, 6, 18, now(), 1.7); },
    pop() { tone(300, .15, { type: 'triangle', to: 900, v: .2 }); noise(.05, { v: .08, f: 5000 }); },
    toll() { bell(hz(45), now(), .2); },
    thunder() { noise(2.6, { ft: 'lowpass', f: 400, to: 60, v: .6 }); tone(50, 2, { v: .3, to: 30 }); },
    howl() { const t = now(), os = tone(300, 2.6, { v: .09, a: .5, sus: .5 }); os.frequency.linearRampToValueAtTime(620, t + .9); os.frequency.linearRampToValueAtTime(420, t + 2.6); vib(os, 5, 8, t, 2.7); },
    creak() { const t = now(), os = tone(110, 1, { type: 'sawtooth', v: .05, a: .15, sus: .5 }); os.frequency.linearRampToValueAtTime(190, t + .5); os.frequency.linearRampToValueAtTime(95, t + 1); vib(os, 38, 25, t, 1.1); },
    bats() { const t = now(); for (let i = 0; i < 16; i++) noise(.04, { t: t + i * .04 + Math.random() * .03, v: .08, f: 4000, ft: 'bandpass', }); },
    cauldron() { const t = now(); for (let i = 0; i < 10; i++) { const f = 150 + Math.random() * 200; tone(f, .12, { to: f * 2.5, v: .07, t: t + i * .1 + Math.random() * .05, p: Math.random() * 2 - 1 }); } },
    witch() { const t = now(); for (let i = 0; i < 7; i++) { const f = 500 + (i % 2 ? 260 : 0) + i * 30; tone(f, .09, { type: 'sawtooth', v: .06, to: f * 1.4, t: t + i * .1 }); } },
    trick() { noise(.15, { f: 5000, v: .15 }); setTimeout(SFX.pop, 120); },
    stinger() { [220, 311, 466].forEach(f => tone(f, 2, { type: 'sawtooth', v: .05, a: .08, sus: .3 })); tone(60, 1.2, { v: .3, to: 35 }); },
    salary() { SFX.atm(); setTimeout(SFX.coins, 250); },
    cardSwipe() { noise(.15, { ft: 'bandpass', f: 1500, to: 4000, v: .2 }); setTimeout(() => tone(1200, .1, { type: 'square', v: .07 }), 180); },
    carHorn() { tone(420, .4, { type: 'square', v: .06, sus: .8 }); tone(525, .4, { type: 'square', v: .06, sus: .8 }); },
    whistle() { const t = now(), os = tone(2800, .55, { v: .1, sus: .7 }); vib(os, 32, 160, t, .6); },
    handcuffs() { const t = now(); [0, .12, .5].forEach((d, i) => { noise(.04, { t: t + d, v: .15, f: 6000 }); tone(3200 + i * 300, .06, { t: t + d, v: .05, type: 'triangle' }); }); },
    knock() { const t = now(); [0, .2, .4].forEach(d => { noise(.05, { t: t + d, ft: 'lowpass', f: 500, v: .35 }); tone(110, .1, { t: t + d, v: .25, to: 70 }); }); },
    birds() { chirp(now(), sfxG); chirp(now() + .8, sfxG); },
    owl() { owl(now(), sfxG); },
    crow() { crow(now(), sfxG); },
    nurseCall() { const t = now(); tone(880, .6, { type: 'triangle', v: .12, t }); tone(660, .8, { type: 'triangle', v: .12, t: t + .35 }); },
    sick() { const os = tone(500, .9, { type: 'triangle', v: .1, to: 250 }); vib(os, 9, 25, now(), .95); },
    heartbeat() { const t = now(); tone(60, .15, { v: .35, to: 40, t }); tone(55, .18, { v: .28, to: 38, t: t + .22 }); },
    scream() { const t = now(), os = tone(900, 1.1, { type: 'sawtooth', v: .05, a: .05, sus: .5 }); os.frequency.linearRampToValueAtTime(1500, t + .4); os.frequency.linearRampToValueAtTime(1100, t + 1.1); vib(os, 8, 40, t, 1.2); },
    zombie() { const t = now(), os = tone(110, 1, { type: 'sawtooth', v: .07, a: .2, sus: .5 }); os.frequency.linearRampToValueAtTime(70, t + 1); vib(os, 7, 12, t, 1.1); },
    chains() { const t = now(); for (let i = 0; i < 14; i++) { noise(.05, { t: t + i * .05 + Math.random() * .04, v: .09, f: 3500, ft: 'bandpass' }); tone(2500 + Math.random() * 2000, .04, { t: t + i * .05, v: .03, type: 'triangle' }); } },
    whisper() { noise(1.4, { ft: 'bandpass', f: 2200, to: 3200, v: .12 }); noise(1.2, { t: now() + .5, ft: 'bandpass', f: 2800, to: 2000, v: .09 }); },
    potion() { SFX.cauldron(); setTimeout(() => arp([1047, 1319, 1568, 2093], .07, { type: 'sine', dur: .6, v: .06 }), 400); },
    candy() { const t = now(); [0, .09, .2].forEach(d => noise(.06, { t: t + d, v: .18, f: 2500, ft: 'bandpass' })); setTimeout(SFX.pop, 300); },
    cursedBell() { const t = now(); bell(hz(57), t, .15); bell(hz(63), t + .02, .1); },
    jumpscare() { noise(.5, { v: .4, f: 800, ft: 'lowpass' }); tone(70, .7, { v: .4, to: 35 }); SFX.stinger(); }
  };

  /* ---------- Instrumentos e bateria ---------- */
  const pan = (g, p, d) => { if (p != null) { const pn = ctx.createStereoPanner(); pn.pan.value = p; g.connect(pn); pn.connect(d); } else g.connect(d); };
  const I = {
    pluck(f, t, v, d, p) { // violão/marimba: serra + filtro que fecha
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; fl.Q.value = 2; fl.frequency.setValueAtTime(f * 6, t); fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + .25);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
      o.connect(fl); fl.connect(g); pan(g, p, d); o.start(t); o.stop(t + .5);
    },
    keys(f, t, v, d, p, len = 1) { // piano elétrico (FM)
      const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      c.frequency.value = f; m.frequency.value = f; mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * .05, t + len * .6);
      m.connect(mg); mg.connect(c.frequency);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      c.connect(g); pan(g, p, d); c.start(t); m.start(t); c.stop(t + len + .05); m.stop(t + len + .05);
    },
    box(f, t, v, d) { [1, 3.99, 9.8].forEach((r, i) => tone(f * r, 1.6 / (1 + i * 1.6), { t, v: v / (1 + i * 2), d })); }, // caixinha de música
    choir(f, t, len, v, d) { // coral "ooh": serras desafinadas + formantes de vogal
      const g = ctx.createGain(), os = [-7, 7].map(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; return o; });
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + len * .35); g.gain.setValueAtTime(v, t + len * .7); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      [[350, 1], [800, .5]].forEach(([fq, a]) => { const b = ctx.createBiquadFilter(), ga = ctx.createGain(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = 6; ga.gain.value = a; os.forEach(o => o.connect(b)); b.connect(ga); ga.connect(g); });
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.value = f * .012; l.connect(lg); os.forEach(o => lg.connect(o.frequency));
      g.connect(d); [...os, l].forEach(o => { o.start(t); o.stop(t + len + .1); });
    },
    theremin(f, t, len, v, d) { const o = tone(f, len, { t, v, a: len * .4, sus: .6, d }); vib(o, 5.5, f * .012, t, len + .1); }
  };
  const K = {
    kick(t, v, d) { tone(130, .25, { t, v, to: 42, d }); noise(.02, { t, v: v * .25, f: 1200, ft: 'lowpass', d }); },
    snare(t, v, d) { noise(.14, { t, v, f: 1800, ft: 'bandpass', d }); tone(190, .09, { t, v: v * .5, type: 'triangle', to: 120, d }); },
    hat(t, v, d, open) { noise(open ? .2 : .035, { t, v, f: 7500, d }); }
  };
  const root = c => { const r = c[0] % 12 + 24; return r < 28 ? r + 12 : r; };
  const genPhrase = (pent, n) => { // melodia em frase: passos curtos na escala, com pausas, repetida a cada 2 compassos
    if (!pent) return []; const ph = []; let i = 2;
    for (let s = 0; s < n; s++) { if (Math.random() < .45) { ph.push(0); continue; } i = Math.max(0, Math.min(pent.length - 1, i + rnd([-1, -1, 0, 1, 1, 2, -2]))); ph.push(pent[i]); }
    return ph;
  };

  /* ---------- Trilhas (8 compassos cada) ---------- */
  const M = {
    day:   { bpm: 108, steps: 8, sw: .06, lp: 5200, ir: [1.2, .6], pent: [72, 74, 76, 79, 81],
             prog: [[60,64,67,71],[55,59,62,64],[57,60,64,67],[53,57,60,64],[53,57,60,64],[52,55,59,62],[50,53,57,60],[55,59,62,64]] },
    night: { bpm: 76, steps: 8, sw: .17, lp: 1900, ir: [2.6, .22], pent: [69, 72, 74, 76, 79],
             prog: [[57,60,64,67],[53,57,60,64],[48,52,55,59],[55,59,62,65],[50,53,57,60],[55,59,62,65],[48,52,55,59],[52,56,59,62]] },
    halloween: { bpm: 68, steps: 6, sw: 0, lp: 3000, ir: [3.8, .16],
             prog: [[57,60,64],[59,62,65],[52,56,59],[57,60,64],[50,53,57],[53,57,60],[52,56,59],[52,56,59]],
             motif: [[76,0,77,76,0,72],[74,0,77,74,0,71],[71,0,74,76,0,80],[81,0,0,76,0,0],[77,0,81,77,0,74],[77,0,76,77,0,81],[80,0,76,80,0,83],[81,0,80,0,76,0]] }
  };
  function playStep(m, n, t0) {
    const sd = 60 / m.bpm / 2, bi = Math.floor(n / m.steps), bar = bi % 8, s = n % m.steps, ch = m.prog[bar];
    const Dy = mode === 'day', H = mode === 'halloween', t = t0 + (s % 2 ? sd * m.sw : 0), len = sd * m.steps * 1.05, bs = root(ch), pn = Math.random() * .6 - .3;
    if (s === 0 && bar === 0 && bi > 0) phrase = genPhrase(m.pent, 16);
    if (s === 0) ch.forEach((c, i) => {
      if (H) { I.choir(hz(c + 12), t, len, .22, mus); tone(hz(c - 12) * 1.006, len, { t, type: 'square', v: .01, a: 1, sus: .6, d: mus }); }
      else tone(hz(c), len, { t, type: Dy ? 'sine' : 'triangle', v: Dy ? .035 : .05, a: .5, sus: .6, d: mus, p: i / 3 - .4 });
    });
    if (H) { // valsa sombria: bumbo grave, acordes de caixinha em 2 e 4, batimento em 3
      if (s === 0) { tone(hz(bs), sd * 3, { t, v: .25, d: mus }); K.kick(t, .2, mus); }
      if (s === 2 || s === 4) ch.forEach((c, i) => I.box(hz(c + 12), t + i * .015, .035, mus));
      if (s === 3) tone(55, .3, { t, v: .1, to: 36, d: mus });
      const mel = m.motif[bar][s]; if (mel) { I.box(hz(mel), t, .09, mus); tone(hz(mel + 12), .5, { t, v: .02, d: mus }); }
      if (s === 0) {
        if (bar % 4 === 3 && Math.random() < .6) I.theremin(hz(rnd([76, 77, 80, 81, 83])), t + sd, 2.6, .05, mus);
        if (Math.random() < .3) bell(hz(45), t + sd * 2, .07, mus);
        if (Math.random() < .25) noise(2.5, { t, ft: 'bandpass', f: 300, to: 900, v: .05, d: mus });
        if (Math.random() < .08) owl(t + sd * 2); if (Math.random() < .06) crow(t + sd);
        if (bar === 3 && Math.random() < .25) setTimeout(SFX.howl, 500);
        if (Math.random() < .08) setTimeout(SFX.creak, 1500);
        if (Math.random() < .05) setTimeout(SFX.chains, 900);
        if (bar === 7 && Math.random() < .1) setTimeout(SFX.thunder, 800);
      }
    } else if (Dy) { // dia: ritmo saltitante, violão, melodia marimba, passarinhos
      if (s === 0 || s === 3 || s === 4 || (s === 7 && Math.random() < .5)) tone(hz(bs), sd * 1.4, { t, type: 'triangle', v: .24, d: mus });
      if (s === 0 || s === 4) K.kick(t, .22, mus);
      if (s === 2 || s === 6) K.snare(t, .07, mus);
      K.hat(t, s % 2 ? .035 : .02, mus, s === 7);
      I.pluck(hz(ch[[0, 1, 2, 3, 2, 1, 2, 3][s]]), t, .045, mus, pn);
      const ph = phrase[n % 16]; if (ph) I.pluck(hz(ph), t, .07, mus, .25);
      if (s % 2 && Math.random() < .12) chirp(t);
      if (bar === 0 && s === 0 && Math.random() < .08) bell(hz(79), t, .03, musicG);
    } else {        // noite: lo-fi com piano elétrico, boom-bap suave, chiado, grilos e coruja
      if (s === 0 || s === 3) tone(hz(bs), sd * 2.2, { t, v: .26, d: mus });
      if (s === 0 || s === 3 || (s === 5 && Math.random() < .5)) K.kick(t, .2, mus);
      if (s === 2 || s === 6) K.snare(t, .05, mus);
      if (s % 2 === 0) K.hat(t, .02, mus);
      if (s === 0 || s === 3) ch.forEach((c, i) => I.keys(hz(c + 12), t + i * .02, .035, mus, i / 3 - .3, 1.6));
      const ph = phrase[n % 16]; if (ph) I.keys(hz(ph), t, .06, mus, .2, 1.2);
      if (Math.random() < .5) noise(.01, { t: t + Math.random() * sd, v: .025, f: 3000, d: musicG });
      if (Math.random() < .08) cricket(t);
      if (s === 0 && Math.random() < .05) owl(t + sd * 3);
    }
  }
  function loop() { const m = M[mode], sd = 60 / m.bpm / 2; while (next < now() + .3) { playStep(m, step, next); next += sd; step++; } }
  function stopLoop() { clearInterval(timer); timer = null; }
  const fade = (to, s) => { musicG.gain.cancelScheduledValues(now()); musicG.gain.setValueAtTime(musicG.gain.value, now()); musicG.gain.linearRampToValueAtTime(to, now() + s); };

  const music = {
    get mode() { return mode; },
    // start('day' | 'night' | 'halloween' | 'auto', { halloween: true })  — 'auto' escolhe dia/noite pela hora do aparelho
    start(m = 'auto', o = {}) {
      if (m === 'auto') { const h = new Date().getHours(); m = o.halloween ? 'halloween' : (h >= 6 && h < 18 ? 'day' : 'night'); }
      wanted = m; init();
      ctx.resume().then(() => {
        if (wanted !== m || (timer && mode === m)) return;
        const go = () => { stopLoop(); mode = m; step = 0; mus.frequency.value = M[m].lp; setIR(...M[m].ir); phrase = genPhrase(M[m].pent, 16); next = now() + .1; dl.delayTime.value = 60 / M[m].bpm * .75; fade(vol.music * .5, 1.2); timer = setInterval(loop, 100); loop(); };
        if (timer) { fade(0, .5); setTimeout(() => wanted === m && go(), 550); } else go();
      });
    },
    stop() { wanted = null; if (!ctx) return; fade(0, .6); setTimeout(() => { if (!wanted) stopLoop(); }, 700); }
  };
  function ambience(name) { // 'rain' | 'wind' | null
    init();
    if (amb) { const a = amb; a.g.gain.linearRampToValueAtTime(0, now() + 1); setTimeout(() => { try { a.s.stop(); a.l && a.l.stop(); } catch (e) {} }, 1100); amb = null; }
    if (!name) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); let l = null;
    s.buffer = noiseBuf; s.loop = true; g.gain.value = 0;
    if (name === 'rain') { f.type = 'highpass'; f.frequency.value = 1200; g.gain.linearRampToValueAtTime(.12, now() + 1.5); }
    else { f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = .8; g.gain.linearRampToValueAtTime(.2, now() + 1.5); l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = .15; lg.gain.value = 250; l.connect(lg); lg.connect(f.frequency); l.start(); }
    s.connect(f); f.connect(g); g.connect(ambG); s.start(); amb = { s, g, l };
  }

  w.SorokibaAudio = {
    init, music, ambience, sounds: Object.keys(SFX),
    play(n, o) { if (vol.muted) return; init(); if (ctx.state === 'suspended') ctx.resume(); return SFX[n] && SFX[n](o); },
    setMusicVolume(v) { vol.music = v; save(); if (musicG && timer) musicG.gain.value = v * .5; if (ambG) ambG.gain.value = v * 1.2; },
    setSfxVolume(v) { vol.sfx = v; save(); if (sfxG) sfxG.gain.value = v; },
    mute(b) { vol.muted = !!b; save(); if (master) master.gain.value = b ? 0 : 1; },
    get volumes() { return { ...vol }; }
  };
  // Navegadores só liberam áudio após o primeiro toque/tecla do jogador
  const unlock = () => { init(); if (wanted) music.start(wanted); };
  ['pointerdown', 'keydown'].forEach(e => w.addEventListener(e, unlock, { once: true }));
})(window);