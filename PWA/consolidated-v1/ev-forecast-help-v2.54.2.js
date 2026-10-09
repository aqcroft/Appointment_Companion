/* EV Companion v2.54.2 - tap-to-read context for variable price scenarios.
   Does not change the tariff engine, input states or calculations. */
(function(){
 'use strict';
 var installed=false;
 function $(id){return document.getElementById(id)}
 function install(){
  if(installed)return true;
  var buttons=$('stressButtons'),note=$('stressNote');
  var bar=buttons&&buttons.closest('.stressbar');
  var label=bar&&bar.querySelector('.stresslabel');
  if(!buttons||!bar||!label||!note)return false;
  if($('acEvForecastHelp')){installed=true;return true;}
  var css=document.createElement('style');css.id='acEvForecastHelpStyle';
  css.textContent=[
   '.stressbar{position:relative}',
   '.stressbar .stresslabel{display:inline-flex;align-items:center;gap:5px;min-width:0;line-height:1.3}',
   '.ac-v2542-forecast-help{display:inline-flex;flex:0 0 auto;align-items:center;position:static}',
   '.ac-v2542-forecast-help summary{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;min-width:21px;min-height:21px;box-sizing:border-box;border:1px solid #afd6cc;border-radius:50%;background:#eff8f5;color:#087569;font:900 13px/1 system-ui;cursor:pointer;list-style:none;user-select:none}',
   '.ac-v2542-forecast-help summary::-webkit-details-marker{display:none}',
   '.ac-v2542-forecast-help summary:focus-visible{outline:3px solid #e3b53e;outline-offset:2px}',
   '.ac-v2542-forecast-help[open] summary{background:#dff2eb;color:#005e55}',
   '.ac-v2542-forecast-panel{position:absolute;z-index:350;top:calc(100% + 8px);right:0;box-sizing:border-box;width:min(330px,calc(100vw - 42px));border:1px solid #b9ddd2;border-radius:12px;background:#fff;padding:12px 13px;box-shadow:0 10px 27px rgba(0,80,70,.17);color:#31554d;font:500 12px/1.5 system-ui}',
   '.ac-v2542-forecast-panel strong{display:block;font-weight:850;color:#075c52;margin-bottom:4px}',
   '.ac-v2542-forecast-panel p{margin:0}',
   '#stressNote{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}',
   '@media(max-width:380px){.stressbar{gap:4px!important}.stressbar .stresslabel{font-size:9px!important}.stressbuttons{gap:3px!important}.stressbuttons button{padding:5px 5px!important}.ac-v2542-forecast-help summary{width:20px;height:20px;min-width:20px;min-height:20px}}'
  ].join('');
  document.head.appendChild(css);
  var details=document.createElement('details');details.id='acEvForecastHelp';
  details.className='ac-v2542-forecast-help';
  var trigger=document.createElement('summary');trigger.textContent='ⓘ';
  trigger.title='How the forecast uplift is calculated';
  trigger.setAttribute('aria-label','How the variable price forecast is estimated');
  var panel=document.createElement('div');panel.className='ac-v2542-forecast-panel';
  panel.appendChild(Object.assign(document.createElement('strong'),{textContent:'About the +21% forecast'}));
  var body=document.createElement('p');
  body.textContent='The 21% forecast is based on a typical medium-use, dual-fuel household paying by Direct Debit. This tool applies the selected uplift evenly to variable electricity costs for illustration. Actual peak, off-peak and standing charges could change differently.';
  panel.appendChild(body);
  details.appendChild(trigger);details.appendChild(panel);label.appendChild(details);
  document.addEventListener('click',function(event){
    if(details.open&&!details.contains(event.target))details.open=false;
  });
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'&&details.open){details.open=false;trigger.focus();}
  });
  installed=true;return true;
 }
 var attempts=0;function start(){if(install())return;if(++attempts<100)setTimeout(start,100)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
 else start();
})();