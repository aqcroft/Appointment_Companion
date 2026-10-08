/* EV Companion v2.49.0 - human-first page labels; no tariff maths here. */
(function(){
 'use strict';
 function el(id){return document.getElementById(id)}
 function copy(selector,value){var x=document.querySelector(selector);if(x)x.textContent=value}
 function text(id,value){var x=el(id);if(x)x.textContent=value}
 function init(){
   if(document.documentElement.dataset.acEvCopy249)return;
   document.documentElement.dataset.acEvCopy249='1';
   copy('h1','⚡ UW EV Tariff Companion (unofficial)');
   copy('#shareSetup .share-setup-copy strong','📤 Share this comparison');
   copy('#shareSetup .share-setup-copy small','Share these starting figures so someone can explore the costs for themselves.');
   copy('#shareSetup #createShareBtn','📤 Share');
   copy('#customerWelcome small','These figures were chosen for you. Feel free to change them and see how the costs compare.');
   copy('#vehiclePills + .range-title b','How many miles do you drive each year?');
   var vehicleSection=el('vehiclePills')&&el('vehiclePills').closest('section.card');
   if(vehicleSection){var title=vehicleSection.querySelector('.label');if(title)title.textContent='🚙 What sort of EV are you thinking about?'}
   var homeCard=el('usagePills')&&el('usagePills').closest('section.card');
   if(homeCard){var heading=homeCard.querySelector('.label');if(heading)heading.textContent='🏠 How much electricity does your home use now?'}
   copy('#usagePills button[data-use="medium"]','Average');
   copy('#usagePills button[data-use="custom"]','My figures');
   copy('#usageTimingToggle strong','⏱️ When do you use your electricity?');
   copy('#usageTimingAction','Change');
   copy('#e7ActualToggle','Use figures from my bill');
   copy('#e7TimingHint','Economy 7 normally gives seven hours of cheaper electricity overnight, usually around midnight to 7 am. This tool estimates the household electricity that may benefit. Change the figures if you know your usage.');
   copy('#comparison',el('comparison')?el('comparison').textContent:'');
   copy('.section-title','⚡ Which electricity tariff could work out cheapest?');
   copy('.section-copy','Tap any price to see how it is calculated. The highlighted column matches the services you selected above.');
   copy('.stresslabel','What if variable prices rise?');
   var stress=el('stressButtons');
   if(stress){
     var buttons=stress.querySelectorAll('button');
     if(buttons.length===4){
       [0,5,15,25].forEach(function(n,i){
         buttons[i].dataset.stress=String(n);
         buttons[i].textContent=n===0?'Today':'+'+n+'%';
         buttons[i].title=n===0?'Current variable tariff prices':'Illustrative '+n+'% increase for variable tariffs';
       });
     }
   }
   var foot=document.querySelector('.tablewrap + .foot');
   if(foot)foot.textContent='These estimates include electricity, the daily standing charge and charging at home. Charging elsewhere is not included. Variable prices can change every three months; fixed unit rates and standing charges stay fixed for the stated term.';
   var settings=document.querySelector('details > summary');
   if(settings&&settings.textContent.includes('Settings & assumptions'))settings.textContent='⚙️ More options';
   var fields=document.querySelectorAll('.settings .field > label');
   fields.forEach(function(field){
     var old=field.textContent.trim();
     var names={
       'Electricity region':'Where do you live?',
       'Charged away from home %':'How much charging happens away from home? (%)',
       'Public charging p/kWh':'Charging away from home (p/kWh)',
       'Efficiency override mi/kWh':'Know your car’s actual efficiency? (miles/kWh)',
       'Known annual EV use kWh':'Know your car’s yearly electricity use? (kWh)'
     };
     if(names[old])field.textContent=names[old];
   });
   copy('.switchrow > span','Would you also have gas with UW?');
   var disclaimer=document.querySelector('.smallnote');
   if(disclaimer)disclaimer.textContent='This is a guide, not an official UW quote. Variable prices may change; fixed tariffs can have exit fees. Your UW Partner can check the exact prices.';
   var car=document.querySelector('#vehiclePills .vpill[data-eff="2.8"] span:not(.ico)');
   if(car&&car.firstChild&&car.firstChild.nodeType===3)car.firstChild.textContent='Large family SUV / 7 seats';
   var van=document.querySelector('#vehiclePills .vpill[data-eff="2.5"] span:not(.ico)');
   if(van&&van.firstChild&&van.firstChild.nodeType===3)van.firstChild.textContent='Van / less miles per kWh';
   copy('#acEvFuelTitle','⛽ What could you save by driving electric?');
   copy('.ac-ev-settings summary','⚙️ Change petrol and diesel estimates');
   copy('.ac-ev-fuel-stat #acEvHouseCost',el('acEvHouseCost')?el('acEvHouseCost').textContent:'');
   var onCost=el('acEvHouseCost')&&el('acEvHouseCost').parentElement&&el('acEvHouseCost').parentElement.querySelector('.ac-label');
   if(onCost)onCost.textContent='🏠 Home electricity difference';
   copy('#acEvFuelAssumptions + .ac-ev-explain','This compares charging and fuel only, not buying, insuring or maintaining the vehicles. Petrol and diesel prices are estimates you can change.');
   var prompt=document.querySelector('#acMeterModeCard .ac-meter-question');
   if(prompt)prompt.textContent='⚡ Are you…';
 }
 // The asynchronously loaded EV engine already exists when this script runs.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();