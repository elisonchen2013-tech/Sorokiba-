window.HOSPITAL_LINES=window.HOSPITAL_LINES||{};
window.addHospitalLines=function(map){Object.assign(window.HOSPITAL_LINES,map||{});};
window.hospitalLine=function(key,ctx){
 const v=window.HOSPITAL_LINES[key];
 if(v==null||v==='')return null;
 if(typeof v==='function')return String(v(ctx||{})||'')||null;
 if(Array.isArray(v))return v[Math.floor(Math.random()*v.length)]||null;
 return String(v);
};