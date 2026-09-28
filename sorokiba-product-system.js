(function(){'use strict';if(window.__sorokibaProductSystem)return;window.__sorokibaProductSystem=true;
const labels={roupa:'Personalização do personagem',tecnologia:'Celular / personagem',equipamento:'Acessório do personagem',veiculo:'Garagem e trânsito',decoracao:'Cidade e decoração',consumivel:'Necessidades do cidadão'};
const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function compatibility(p){return labels[p?.type]||'Cidade';}
window.productSystemEquip=async function(id){try{const d=await post('/api/company-inventory/equip',{productId:id});me=d.user;updateHUD();toast(d.message);loadPage('inventory')}catch(e){toast(e.message,'error')}};
window.productSystemUnequip=async function(id){try{const d=await post('/api/company-inventory/unequip',{productId:id});me=d.user;updateHUD();toast(d.message);loadPage('inventory')}catch(e){toast(e.message,'error')}};
window.renderCompanyProductSystemInventory=async function(box){
 try{
  const d=await api('/api/company-inventory'),items=d.items||[];
  const cards=items.map(x=>{
   const p=x.product||{},eq=!!(me.equippedCompanyProducts&&me.equippedCompanyProducts[p.id]),veh=me.equippedVehicleProductId===p.id,cons=p.type==='consumivel';
   const action=cons?'<button class="primary" onclick="useCompanyItem(\''+p.id+'\')">Usar</button>':((eq||veh)?'<button class="ghost" onclick="productSystemUnequip(\''+p.id+'\')">Desequipar</button>':'<button class="primary" onclick="productSystemEquip(\''+p.id+'\')">Equipar</button>');
   return '<article class="item-card product-system-card"><div class="item-icon company-inventory-photo">'+(p.image?'<img src="'+esc2(p.image)+'" alt="">':esc2(p.emoji||'📦'))+'</div><div><small>'+esc2(x.companyName)+' <span class="product-system-badge">'+esc2(x.companyTypeLabel||'Empresa')+'</span></small><h3>'+esc2(p.name)+'</h3><small>Quantidade: '+x.quantity+'</small><p>'+esc2(p.description||'Produto da cidade')+'<br><span class="product-system-compatible">Compatível com: '+esc2(compatibility(p))+'</span></p></div>'+action+'</article>';
  }).join('');
  box.innerHTML='<section class="inventory-section"><div class="section-head"><div><span class="eyebrow">PRODUTOS DE EMPRESAS</span><h3>Equipar e usar</h3></div></div><div class="items-grid">'+(cards||'<div class="empty"><h3>Nenhum produto de empresa</h3><p>Visite Lojas para comprar.</p></div>')+'</div></section>';
 }catch(e){box.innerHTML='<div class="empty"><h3>Não foi possível carregar os produtos</h3><p>'+esc2(e.message)+'</p></div>'}
};
})();