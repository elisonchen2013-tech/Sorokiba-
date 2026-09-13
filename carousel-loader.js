(function(){
  function load(){
    if(!document.head.querySelector('link[data-soro-carousel]')){
      var c=document.createElement('link');c.rel='stylesheet';c.href='home-carousel.css?v=2';c.dataset.soroCarousel='1';document.head.appendChild(c);
    }
    if(!document.body.querySelector('script[data-soro-carousel]')){
      var s=document.createElement('script');s.src='home-carousel.js?v=2';s.dataset.soroCarousel='1';document.body.appendChild(s);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
