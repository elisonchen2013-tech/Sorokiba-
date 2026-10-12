/* figurante-normal.js — moradores animados do Hospital Sorokiba, Canvas 2D */
(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory();else root.FiguranteNormal=factory()})(typeof self!=="undefined"?self:this,function(){
"use strict";
const SK=["#f0c09a","#d9a074","#a8734a","#7a4d2e","#f7d3b4"],HR=["#2a1a10","#5a3a1e","#c9a24b","#111","#7a2a1a"],SH=["#161018","#5a2a1a","#e8e8e8","#2a3a6a"],PN=["#222a3a","#2b3a55","#4a3a2a","#3b2f5a","#333"];
function draw(g,x,y,s,o){o=o||{};const t=o.t==null?performance.now()/1000:o.t,v=Math.abs(o.v||0),sk=o.pele||SK[v%SK.length],hc=o.cabelo||HR[v%HR.length],shirt=o.cor||"#3b82f6",pants=o.calca||PN[(v+2)%PN.length],shoe=o.sapato||SH[v%SH.length],walk=typeof o.walk==="number"?o.walk:o.walk?1:0,ph=o.pos!=null?o.pos/(18.7*s):t*4,step=Math.sin(ph)*walk,headBob=Math.sin(t*1.8)*.6;
g.save();g.translate(x,y);g.scale(s*(o.flip?-1:1),s);g.lineCap=g.lineJoin="round";
g.fillStyle="rgba(0,0,0,.18)";g.beginPath();g.ellipse(0,0,19+Math.abs(step)*2,4,0,0,Math.PI*2);g.fill();
g.strokeStyle=pants;g.lineWidth=8;g.beginPath();g.moveTo(-5,-36);g.lineTo(-6+step*6,-20);g.lineTo(-7+step*8,-4);g.moveTo(5,-36);g.lineTo(6-step*6,-20);g.lineTo(7-step*8,-4);g.stroke();
g.fillStyle=shoe;g.beginPath();g.ellipse(-7+step*8,-3,7,3,0,0,Math.PI*2);g.ellipse(7-step*8,-3,7,3,0,0,Math.PI*2);g.fill();
if(v%3===1&&!o.calca){g.fillStyle=shirt;g.beginPath();g.moveTo(-13,-48);g.lineTo(13,-48);g.lineTo(17,-22);g.lineTo(-17,-22);g.closePath();g.fill()}
g.save();g.translate(Math.sin(ph)*1.2*walk,-36);g.rotate(step*.035);
g.fillStyle=shirt;g.beginPath();g.moveTo(-12,-82);g.quadraticCurveTo(-14,-86,-8,-87);g.lineTo(8,-87);g.quadraticCurveTo(14,-86,12,-82);g.lineTo(13,-36);g.lineTo(-13,-36);g.closePath();g.fill();
const grad=g.createLinearGradient(-12,0,12,0);grad.addColorStop(0,"rgba(255,255,255,.16)");grad.addColorStop(1,"rgba(0,0,0,.18)");g.fillStyle=grad;g.fill();
g.fillStyle=sk;g.fillRect(-4,-94,8,10);
const arm=(side)=>{const swing=Math.sin(ph+(side===-1?0:Math.PI))*walk;g.strokeStyle=shirt;g.lineWidth=7;g.beginPath();g.moveTo(side*12,-79);g.lineTo(side*15+swing*5,-61);g.lineTo(side*13+swing*9,-46);g.stroke();g.fillStyle=sk;g.beginPath();g.arc(side*13+swing*9,-44,3.5,0,Math.PI*2);g.fill()};
arm(-1);arm(1);
if(o.jaqueta){g.fillStyle=o.jaqueta;g.fillRect(-13,-82,4,43);g.fillRect(9,-82,4,43)}
g.restore();
g.save();g.translate(0,-101+headBob);g.rotate((o.look||0)*.12-(o.up?.2:0));g.fillStyle=sk;g.beginPath();g.ellipse(0,0,12.5,14,0,0,Math.PI*2);g.fill();
g.fillStyle=hc;g.beginPath();g.arc(0,-3,13,Math.PI,Math.PI*2);g.lineTo(12,-1);g.quadraticCurveTo(7,-8,0,-7);g.quadraticCurveTo(-8,-7,-12,-1);g.closePath();g.fill();
if(o.hat){g.fillStyle=o.hat;g.beginPath();g.arc(0,-5,13,Math.PI,Math.PI*2);g.fill();g.fillRect(-16,-6,32,4)}
if(o.wh){g.fillStyle=o.wh;g.beginPath();g.moveTo(-12,-8);g.lineTo(3,-34);g.lineTo(13,-8);g.closePath();g.fill();g.fillRect(-16,-9,32,4)}
g.fillStyle="#fff";g.beginPath();g.ellipse(-4,-1,2.4,2.7,0,0,Math.PI*2);g.ellipse(4,-1,2.4,2.7,0,0,Math.PI*2);g.fill();
g.fillStyle="#20202a";g.beginPath();g.arc(-3.5,-1,1.1,0,Math.PI*2);g.arc(4.5,-1,1.1,0,Math.PI*2);g.fill();
if(o.oculos){g.strokeStyle="#25313a";g.lineWidth=1.2;g.beginPath();g.arc(-4,-1,3.7,0,Math.PI*2);g.arc(4,-1,3.7,0,Math.PI*2);g.moveTo(-.3,-1);g.lineTo(.3,-1);g.stroke()}
g.strokeStyle="#8a4d48";g.lineWidth=1.3;g.beginPath();g.arc(0,5,3.2,.15,Math.PI-.15);g.stroke();
if(o.mascara){g.fillStyle="#bfe3f0";g.beginPath();g.moveTo(-8,2);g.lineTo(8,2);g.lineTo(7,8);g.lineTo(-7,8);g.closePath();g.fill()}
g.restore();g.restore()}
return{draw}});
