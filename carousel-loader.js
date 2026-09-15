(function(){
  function load(){
    if(!document.body.querySelector('script[data-soro-carousel]')){
      var s=document.createElement('script');
      s.src='home-carousel-v3.js?v=3';
      s.dataset.soroCarousel='1';
      document.body.appendChild(s);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
