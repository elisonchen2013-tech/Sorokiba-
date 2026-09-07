(function(){
  const STYLE='soro-realistic-v3-style';
  const ART='soro-realistic-v3-art';
  const themes=['summer','autumn','winter','spring','city','goals','career','news'];

  function injectStyle(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      .soro-realistic-v3-art{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;border-radius:inherit;opacity:.98}
      .soro-realistic-v3-art svg{position:absolute;right:0;top:0;width:min(54%,560px);height:100%;overflow:visible;filter:drop-shadow(0 18px 32px rgba(0,0,0,.25))}
      .soro-live-main,.soro-live-dots,.soro-live-season{z-index:8!important}
      .soro-live-art{z-index:2!important;opacity:.35!important}
      .soro-live-art .symbol,.soro-live-art .extra{display:none!important}
      .soro-realistic-v3-art .soft{animation:srSoftFloat 6s ease-in-out infinite}
      .soro-realistic-v3-art .slow{animation:srSlowFloat 9s ease-in-out infinite}
      .soro-realistic-v3-art .spin{transform-box:fill-box;transform-origin:center;animation:srSpin 28s linear infinite}
      .soro-realistic-v3-art .snowflake{animation:srFall 5s linear infinite}
      .soro-realistic-v3-art .leaf{animation:srLeafFall 6s ease-in-out infinite}
      .soro-realistic-v3-art .petal{animation:srPetal 5s ease-in-out infinite}
      @keyframes srSoftFloat{50%{transform:translateY(-9px)}}
      @keyframes srSlowFloat{50%{transform:translate(7px,-6px)}}
      @keyframes srSpin{to{transform:rotate(360deg)}}
      @keyframes srFall{0%{transform:translateY(-30px);opacity:0}20%{opacity:.8}100%{transform:translateY(190px);opacity:0}}
      @keyframes srLeafFall{50%{transform:translate(12px,16px) rotate(8deg)}}
      @keyframes srPetal{50%{transform:rotate(4deg) translateY(-4px)}}
      .soro-live-season,.soro-live-tag,.soro-live-meta div{font-variant-numeric:tabular-nums}
      @media(max-width:900px){.soro-realistic-v3-art svg{width:64%;opacity:.65}}
      @media(max-width:600px){.soro-realistic-v3-art svg{width:100%;right:-25%;opacity:.28}}
    `;document.head.appendChild(s)
  }

  function svg(theme){
    const common=`<defs>
      <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="blur"><feGaussianBlur stdDeviation="10"/></filter>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".22"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".04"/><stop offset="1" stop-color="#000000" stop-opacity=".08"/></linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5f7ff" stop-opacity=".9"/><stop offset=".25" stop-color="#8e99b5" stop-opacity=".7"/><stop offset=".55" stop-color="#323b54"/><stop offset="1" stop-color="#dce4ff" stop-opacity=".55"/></linearGradient>
    </defs>`;
    if(theme==='summer')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><radialGradient id="sun"><stop stop-color="#fffde2"/><stop offset=".32" stop-color="#ffe38b"/><stop offset=".7" stop-color="#ffc247"/><stop offset="1" stop-color="#e88e27"/></radialGradient><linearGradient id="cloud" x2="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".72"/><stop offset="1" stop-color="#d7e4f4" stop-opacity=".16"/></linearGradient></defs>
      <g class="soft"><circle cx="382" cy="142" r="72" fill="#ffcc62" opacity=".12" filter="url(#blur)"/><circle cx="382" cy="142" r="48" fill="url(#sun)" filter="url(#glow)"/>
      <g stroke="#ffe39a" stroke-linecap="round" opacity=".6" fill="none">${Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;const x1=382+61*Math.cos(a),y1=142+61*Math.sin(a),x2=382+91*Math.cos(a),y2=142+91*Math.sin(a);return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="4"/>`}).join('')}</g></g>
      <g class="slow" transform="translate(65 35)"><path d="M95 205 C55 205 50 168 78 151 C79 116 125 104 148 130 C172 103 220 119 217 155 C246 163 241 205 204 205Z" fill="url(#cloud)" stroke="#fff" stroke-opacity=".2" stroke-width="2"/></g>
      <path d="M95 292 C180 255 308 270 472 300" fill="none" stroke="#f9d98d" stroke-opacity=".25" stroke-width="2"/>
    </svg>`;
    if(theme==='autumn')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><linearGradient id="bark" x2="1"><stop stop-color="#25160f"/><stop offset=".35" stop-color="#70462e"/><stop offset=".55" stop-color="#9b6946"/><stop offset=".8" stop-color="#4a2a1c"/><stop offset="1" stop-color="#21140e"/></linearGradient><linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#f2bd61"/><stop offset=".45" stop-color="#c96532"/><stop offset="1" stop-color="#74311f"/></linearGradient></defs>
      <ellipse cx="365" cy="315" rx="145" ry="25" fill="#170f0b" opacity=".35" filter="url(#blur)"/>
      <path d="M365 320 C350 270 352 200 365 108 L393 108 C398 196 401 268 390 320Z" fill="url(#bark)"/><path d="M377 205 C328 164 288 128 254 91 M382 178 C430 140 455 110 479 77 M368 149 C339 119 320 91 306 62" fill="none" stroke="#6b422a" stroke-width="15" stroke-linecap="round"/>
      <g fill="url(#leaf)" stroke="#4b2419" stroke-opacity=".25" stroke-width="2"><ellipse class="leaf" cx="245" cy="88" rx="31" ry="16" transform="rotate(-28 245 88)"/><ellipse class="leaf" cx="286" cy="56" rx="37" ry="18" transform="rotate(17 286 56)"/><ellipse class="leaf" cx="334" cy="83" rx="33" ry="17" transform="rotate(-12 334 83)"/><ellipse class="leaf" cx="468" cy="72" rx="38" ry="18" transform="rotate(-24 468 72)"/><ellipse class="leaf" cx="501" cy="105" rx="28" ry="15" transform="rotate(25 501 105)"/><ellipse class="leaf" cx="422" cy="102" rx="34" ry="17" transform="rotate(12 422 102)"/></g>
      <g class="leaf" fill="#d8793e" opacity=".8"><ellipse cx="195" cy="170" rx="10" ry="6" transform="rotate(35 195 170)"/><ellipse cx="475" cy="192" rx="11" ry="6" transform="rotate(-35 475 192)"/><ellipse cx="280" cy="230" rx="9" ry="5" transform="rotate(15 280 230)"/></g>
    </svg>`;
    if(theme==='winter')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><radialGradient id="moon"><stop stop-color="#ffffff"/><stop offset=".5" stop-color="#dcecff"/><stop offset="1" stop-color="#9fc5e7"/></radialGradient><linearGradient id="ice" x2="0" y2="1"><stop stop-color="#e9f8ff" stop-opacity=".72"/><stop offset="1" stop-color="#65a9d5" stop-opacity=".12"/></linearGradient></defs>
      <circle cx="390" cy="115" r="78" fill="#8dd6ff" opacity=".12" filter="url(#blur)"/><circle cx="390" cy="115" r="50" fill="url(#moon)" filter="url(#glow)"/><circle cx="371" cy="97" r="9" fill="#7698b1" opacity=".18"/><circle cx="409" cy="130" r="13" fill="#7698b1" opacity=".13"/><circle cx="384" cy="142" r="6" fill="#7698b1" opacity=".14"/>
      <path d="M220 296 Q325 255 495 292" fill="none" stroke="#cceeff" stroke-opacity=".5" stroke-width="6"/><path d="M242 296 Q300 272 345 291 T455 292" fill="url(#ice)" stroke="#e8fbff" stroke-opacity=".3"/>
      <g fill="#eaf8ff" opacity=".8">${[[245,80],[300,142],[445,62],[492,175],[272,230],[460,245],[350,210]].map((p,i)=>`<circle class="snowflake" style="animation-delay:${i*.55}s" cx="${p[0]}" cy="${p[1]}" r="${i%2?2:3}"/>`).join('')}</g>
    </svg>`;
    if(theme==='spring')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><radialGradient id="flower"><stop stop-color="#fff3a6"/><stop offset=".35" stop-color="#f5d47a"/><stop offset="1" stop-color="#c88a4a"/></radialGradient><linearGradient id="petal" x2="1" y2="1"><stop stop-color="#fff4fb"/><stop offset=".45" stop-color="#efafd8"/><stop offset="1" stop-color="#ad5f9a"/></linearGradient></defs>
      <path d="M384 320 C375 258 386 191 387 108" fill="none" stroke="#5a9b70" stroke-width="7" stroke-linecap="round"/><path d="M384 260 C334 233 307 204 288 170 M386 224 C438 203 461 176 476 139" fill="none" stroke="#5a9b70" stroke-width="4"/>
      <g class="petal" transform="translate(388 103)">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-28" rx="21" ry="38" fill="url(#petal)" transform="rotate(${a})"/>`).join('')}<circle r="15" fill="url(#flower)"/></g>
      <g fill="#9bd28f" opacity=".8"><ellipse cx="301" cy="176" rx="25" ry="10" transform="rotate(-32 301 176)"/><ellipse cx="456" cy="152" rx="28" ry="11" transform="rotate(28 456 152)"/></g>
      <path d="M250 310 C325 270 414 278 500 309" fill="none" stroke="#8bd19c" stroke-opacity=".3" stroke-width="3"/>
    </svg>`;
    if(theme==='city')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><linearGradient id="building" x2="0" y2="1"><stop stop-color="#8ea8d0" stop-opacity=".62"/><stop offset="1" stop-color="#17263f" stop-opacity=".9"/></linearGradient><linearGradient id="window" x2="0" y2="1"><stop stop-color="#fff0a8"/><stop offset="1" stop-color="#6e8bbd"/></linearGradient></defs>
      <path d="M205 300 L205 134 L267 118 L267 300Z M267 300 L267 78 L345 60 L345 300Z M345 300 L345 120 L414 105 L414 300Z M414 300 L414 158 L482 144 L482 300Z" fill="url(#building)" stroke="#b9d2ff" stroke-opacity=".15"/>
      ${[[220,155],[220,188],[220,221],[283,103],[283,137],[283,171],[283,205],[283,239],[361,145],[361,180],[361,215],[430,178],[430,213],[430,248]].map((p,i)=>`<rect x="${p[0]}" y="${p[1]}" width="15" height="9" rx="2" fill="url(#window)" opacity="${i%4===0?.9:.5}"/>`).join('')}
      <path d="M170 305 Q330 260 520 305" fill="none" stroke="#9fc1ff" stroke-opacity=".5" stroke-width="3"/><path d="M170 306 Q330 285 520 306" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="16" filter="url(#blur)"/>
    </svg>`;
    if(theme==='goals')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><radialGradient id="target"><stop stop-color="#f7eaff"/><stop offset=".32" stop-color="#b98aff"/><stop offset="1" stop-color="#7046c9"/></radialGradient></defs>
      <g class="spin" opacity=".6" fill="none" stroke="#d5c0ff"><ellipse cx="382" cy="175" rx="135" ry="48" stroke-width="2"/><ellipse cx="382" cy="175" rx="98" ry="35" stroke-opacity=".5" transform="rotate(52 382 175)"/><ellipse cx="382" cy="175" rx="155" ry="57" stroke-opacity=".22" transform="rotate(-28 382 175)"/></g>
      <circle cx="382" cy="175" r="76" fill="#8d60e9" opacity=".1"/><circle cx="382" cy="175" r="64" fill="none" stroke="#dfcbff" stroke-width="6" opacity=".8"/><circle cx="382" cy="175" r="40" fill="none" stroke="#bd92ff" stroke-width="5"/><circle cx="382" cy="175" r="18" fill="url(#target)" filter="url(#glow)"/>
      <path d="M382 88 V262 M295 175 H469" stroke="#d9c6ff" stroke-opacity=".3" stroke-width="2"/>
    </svg>`;
    if(theme==='career')return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><linearGradient id="case" x2="1" y2="1"><stop stop-color="#d8fff6" stop-opacity=".35"/><stop offset=".5" stop-color="#35c5a4" stop-opacity=".16"/><stop offset="1" stop-color="#0e6657" stop-opacity=".3"/></linearGradient></defs>
      <g class="soft"><rect x="310" y="112" width="145" height="106" rx="15" fill="url(#case)" stroke="#8ff3dd" stroke-opacity=".65" stroke-width="3"/><path d="M356 112 V91 Q356 79 368 79 H397 Q409 79 409 91 V112" fill="none" stroke="#8ff3dd" stroke-opacity=".65" stroke-width="4"/><path d="M310 163 H455" stroke="#8ff3dd" stroke-opacity=".55" stroke-width="3"/><circle cx="382" cy="163" r="6" fill="#a8ffeb"/></g>
      <g transform="translate(432 65)"><path d="M0 105 L0 35 M0 105 H92" stroke="#8ff3dd" stroke-opacity=".4"/><path d="M8 88 L27 71 L43 78 L61 48 L76 55 L91 20" fill="none" stroke="#9ffff0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="91" cy="20" r="5" fill="#c9fff5" filter="url(#glow)"/></g>
    </svg>`;
    return `<svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid meet">${common}
      <defs><linearGradient id="crystal" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".65"/><stop offset=".28" stop-color="#b99bff" stop-opacity=".45"/><stop offset=".7" stop-color="#6851c7" stop-opacity=".22"/><stop offset="1" stop-color="#6fe0ff" stop-opacity=".35"/></linearGradient></defs>
      <g class="slow"><path d="M390 62 L458 111 L429 270 L350 292 L315 121Z" fill="url(#crystal)" stroke="#e6ddff" stroke-opacity=".65" stroke-width="2"/><path d="M390 62 L389 265 M315 121 L389 265 L458 111 M350 292 L389 265 L429 270" fill="none" stroke="#ffffff" stroke-opacity=".3"/><path d="M350 92 L389 62 L425 96 L389 265Z" fill="#ffffff" fill-opacity=".07"/></g>
      <g class="spin" fill="none" stroke="#cdbbff"><ellipse cx="389" cy="178" rx="150" ry="60" opacity=".25"/><ellipse cx="389" cy="178" rx="185" ry="73" opacity=".12" transform="rotate(45 389 178)"/></g>
      <circle cx="389" cy="178" r="12" fill="#e7dcff" filter="url(#glow)"/>
    </svg>`;
  }

  function cleanText(){
    document.querySelectorAll('.soro-live-season,.soro-live-tag,.soro-live-meta div').forEach(el=>{
      el.textContent=el.textContent.replace(/[\p{Extended_Pictographic}\uFE0F]/gu,'').replace(/\s{2,}/g,' ').trim();
    });
  }

  function decorate(){
    injectStyle();
    cleanText();
    document.querySelectorAll('.soro-live-carousel').forEach(root=>{
      const theme=themes.find(t=>root.classList.contains(t))||'news';
      let art=root.querySelector('.'+ART);
      if(art&&art.dataset.theme===theme)return;
      if(art)art.remove();
      art=document.createElement('div');art.className=ART;art.dataset.theme=theme;art.innerHTML=svg(theme);root.appendChild(art);
    });
  }

  function start(){
    decorate();
    let last='';
    setInterval(()=>{
      const current=[...document.querySelectorAll('.soro-live-carousel')].map(x=>[...x.classList].join('.')).join('|');
      if(current!==last){last=current;decorate();}
      else decorate();
    },900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
