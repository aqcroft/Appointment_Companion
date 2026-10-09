/* Appointment Companion v2.55.20 - electricity region per customer. */
(function(){
'use strict';
if(document.documentElement.classList.contains('view-mode'))return;
var regions=[[10,'Eastern'],[11,'East Midlands'],[12,'London'],[13,'Manweb'],[14,'Midlands'],[15,'Northern'],[16,'Norweb'],[17,'Scottish Hydro'],[18,'Scottish Power'],[19,'Seeboard'],[20,'Southern'],[21,'Swalec'],[22,'Sweb'],[23,'Yorkshire']];
function install(){
if(document.getElementById('customerRegion'))return true;
var name=document.getElementById('customerName'),field=name&&name.closest('.field');
if(!field||!field.parentNode)return false;
var box=document.createElement('div');box.className='field ac-customer-region';
var label=document.createElement('label');label.htmlFor='customerRegion';label.textContent='⚡ Electricity region';
var select=document.createElement('select');select.id='customerRegion';select.setAttribute('aria-describedby','customerRegionHelp');
select.add(new Option('Select the customer region',''));
regions.forEach(function(r){select.add(new Option(r[0]+' '+r[1],String(r[0])));});
var help=document.createElement('small');help.id='customerRegionHelp';help.textContent='Saved with this customer. Used by Should I Fix? and EV Companion.';
box.appendChild(label);box.appendChild(select);box.appendChild(help);
var style=document.createElement('style');style.textContent='.ac-customer-region{margin:7px 0 10px}.ac-customer-region label{display:block;font-size:12px;font-weight:750;color:#625873;margin-bottom:5px}.ac-customer-region select{box-sizing:border-box;width:100%;min-height:42px;border:1px solid #d9d2e5;border-radius:10px;background:#fff;color:#26164f;font:650 14px system-ui;padding:9px 10px}.ac-customer-region small{display:block;font-size:11px;color:#716a7e;margin-top:4px}.ac-customer-region select:focus-visible{outline:2px solid #7a42c8;outline-offset:2px}';document.head.appendChild(style);
field.insertAdjacentElement('afterend',box);return true;
}
var tries=0,timer=setInterval(function(){if(install()||++tries>120)clearInterval(timer);},50);
})();