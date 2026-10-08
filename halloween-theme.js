/* Sorokiba Halloween Event controller.
   Event window: October 1 through November 2, 2026 (local time).
   The normal visual is never overwritten; the controller only adds/removes one class. */
(function(){
  'use strict';

  const START = new Date('2026-10-01T00:00:00');
  const END = new Date('2026-11-03T00:00:00');

  function isHalloween(date){
    const now = date || new Date();
    return now >= START && now < END;
  }

  function applyHalloween(){
    const active = isHalloween();
    const body = document.body;
    if(!body) return;

    body.classList.toggle('sorokiba-halloween', active);

    const theme = document.querySelector('meta[name="theme-color"]');
    if(theme) theme.setAttribute('content', active ? '#090711' : '#101827');

    document.documentElement.dataset.eventTheme = active ? 'halloween' : 'normal';
  }

  function scheduleNextBoundary(){
    const now = Date.now();
    const next = isHalloween() ? END.getTime() : START.getTime();
    const delay = Math.max(1000, next - now + 250);
    window.setTimeout(function(){
      applyHalloween();
      scheduleNextBoundary();
    }, Math.min(delay, 2147483647));
  }

  window.SorokibaHalloween = {
    isActive: isHalloween,
    refresh: applyHalloween,
    start: START,
    end: END
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      applyHalloween();
      scheduleNextBoundary();
    }, {once:true});
  }else{
    applyHalloween();
    scheduleNextBoundary();
  }
})();