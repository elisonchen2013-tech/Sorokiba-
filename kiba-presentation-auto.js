(function(){'use strict';
function run(){
  if(typeof window.showKibaPresentation!=='function')return setTimeout(run,100);
  var old=document.getElementById('kibaIntro12');if(old)old.remove();
  var oldReplay=document.getElementById('kibaIntroReplay');if(oldReplay)oldReplay.remove();
  setTimeout(function(){window.showKibaPresentation()},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();