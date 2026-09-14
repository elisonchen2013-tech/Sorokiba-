(() => {
  'use strict';
  const activate = () => {
    const run = () => {
      if (window.SorokibaCarouselV3 && typeof window.SorokibaCarouselV3.refresh === 'function') {
        window.SorokibaCarouselV3.refresh();
        return true;
      }
      return !!document.getElementById('soro-carousel-v3');
    };
    if (run()) return;
    let tries = 0;
    const timer = setInterval(() => { if (run() || ++tries >= 40) clearInterval(timer); }, 250);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, {once:true});
  else activate();
})();
