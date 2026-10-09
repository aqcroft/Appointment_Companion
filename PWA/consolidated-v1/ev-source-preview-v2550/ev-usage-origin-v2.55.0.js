/* v2.55.0: Existing EV driver's annual usage source, independent of tariff/maths. */
(function(global){
'use strict';
const choices=['bill_estimate','actual_12m','customer_estimate'];
function normalise(value){return choices.includes(value)?value:'bill_estimate'}
function el(){return document.getElementById('acEvUsageOrigin')}
function mount(){
 if(el())return true;
 const body=document.getElementById('acMeterActual'),fields=body&&body.querySelector('.ac-meter-fields');
 if(!fields)return false;
 const style=document.createElement('style');style.id='acEvUsageOriginCss';
 style.textContent='.ac-ev-origin{display:flex;align-items:center;gap:7px;margin:9px 0 6px;font:700 10.5px/1.3 system-ui;color:#446a61}.ac-ev-origin label{flex:0 0 auto}.ac-ev-origin select{flex:1;min-width:0;border:1px solid #c6e2d7;border-radius:8px;background:#f3faf8;padding:8px 7px;font:700 11px system-ui;color:#15564a}.ac-ev-origin-tip{font:500 10px/1.4 system-ui;color:#657974;margin:0 0 7px}.ac-ev-origin-tip[hidden]{display:none}@media(max-width:390px){.ac-ev-origin{font-size:10px;gap:5px}.ac-ev-origin select{font-size:10px;padding:7px 5px}}';
 document.head.appendChild(style);
 const row=document.createElement('div');row.className='ac-ev-origin';
 const label=document.createElement('label');label.htmlFor='acEvUsageOrigin';label.textContent='📋 Usage figures from';
 const select=document.createElement('select');select.id='acEvUsageOrigin';
 [['bill_estimate','Estimated annual usage on bill'],['actual_12m','Actual usage over 12 months'],['customer_estimate','Customer-provided estimate']].forEach(function(k){const o=document.createElement('option');o.value=k[0];o.textContent=k[1];select.appendChild(o)});
 const tip=document.createElement('p');tip.id='acEvUsageOriginTip';tip.className='ac-ev-origin-tip';tip.hidden=true;tip.textContent='Enter total home electricity including home EV charging, not car-only consumption.';
 select.addEventListener('change',function(){tip.hidden=select.value!=='customer_estimate'});
 row.append(label,select);fields.parentNode.insertBefore(row,fields);fields.parentNode.insertBefore(tip,fields);return true;
}
function set(value){if(!mount())return false;el().value=normalise(value);el().dispatchEvent(new Event('change',{bubbles:true}));return true}
function get(){return normalise(el()&&el().value)}
global.AppointmentCompanionEvUsageOrigin={mount:mount,get:get,set:set,normalise:normalise};
if(!mount()){let tries=0;const timer=setInterval(function(){if(mount()||++tries>200)clearInterval(timer)},50)}
})(window);