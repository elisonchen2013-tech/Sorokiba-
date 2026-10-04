// Compatibilidade do carrossel.
// O carrossel oficial agora é criado diretamente por app.js/homeCarousel().
// Este arquivo não deve substituir .hero nem injetar scripts inexistentes.
(()=>{'use strict';
  function ensure(){
    const game=document.getElementById('gameView');
    if(!game || game.classList.contains('hidden')) return;
    const city=document.getElementById('content');
    if(!city) return;
    // Nunca removemos conteúdo criado pelo app.js e não fazemos varreduras periódicas.
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
})();
