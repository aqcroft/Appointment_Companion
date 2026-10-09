/* EV Companion v2.55.0: choose each customer's EV situation once.
   No shared/device-wide choice: linked customer state owns persistence. */
(function(){
 'use strict';
 var $=function(id){return document.getElementById(id)};
 var params=new URL(location.href).searchParams;
 var shared=params.has('s')||/^(?:p2|p)=/.test(location.hash.slice(1))||document.documentElement.classList.contains('shared-view');
 var linked=params.has('ac_launch');
 var installed=false,prompted=false,dialog=null,previousFocus=null;
 function element(tag,klass,text){var e=document.createElement(tag);if(klass)e.className=klass;if(text)e.textContent=text;return e}
 function style(){
  if($('acEvV253ModeStyle'))return;
  var st=element('style');st.id='acEvV253ModeStyle';
  st.textContent=[
    '#acMeterModeCard .ac-meter-question,#acMeterModeCard>.ac-meter-choices{display:none!important}',
    'html:not(.ac-metered-mode) #acMeterModeCard{display:none!important}',
    'html.ac-metered-mode #acMeterModeCard{margin-top:2px!important}',
    '.ac-v253-cog{border:1px solid #d8e4e1;border-radius:10px;background:#f4faf8;color:#00766c;min-width:35px;min-height:35px;font-size:18px;cursor:pointer;margin-left:auto}',
    '.ac-v253-change{display:block;width:100%;min-height:42px;border:1px solid #d0e6df;border-radius:10px;background:#f3faf8;color:#12695e;font:750 13px system-ui;cursor:pointer;margin:3px 0 14px}',
    '.ac-v253-mode[hidden]{display:none!important}',
    '.ac-v253-mode{position:fixed;inset:0;background:rgba(21,27,39,.72);z-index:21000;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box}',
    '.ac-v253-dialog{width:min(440px,100%);background:#fff;color:#29303e;border-radius:18px;padding:20px;box-shadow:0 22px 65px rgba(0,0,0,.35);font-family:system-ui;max-height:calc(100dvh - 30px);overflow:auto}',
    '.ac-v253-dialog h2{font-size:20px;margin:4px 0 7px;line-height:1.3;text-align:center}',
    '.ac-v253-sub{font-size:13px;text-align:center;color:#68747c;margin:0 0 18px;line-height:1.5}',
    '.ac-v253-choice{display:flex;align-items:center;gap:12px;width:100%;min-height:76px;text-align:left;background:#f8fbfa;border:1.5px solid #cfe1dd;color:#29303e;border-radius:12px;margin:10px 0;padding:13px 12px;cursor:pointer}',
    '.ac-v253-choice:focus-visible,.ac-v253-change:focus-visible,.ac-v253-cog:focus-visible{outline:3px solid #dfb544;outline-offset:2px}',
    '.ac-v253-emoji{font-size:29px;line-height:1}.ac-v253-choice strong{display:block;font-size:15px}.ac-v253-choice small{display:block;font-size:12px;color:#62727b;margin-top:4px;line-height:1.3}',
    '.ac-v253-choice .ac-arrow{margin-left:auto;font-size:22px;color:#66867e}',
    '@media(max-width:420px){.ac-v253-dialog{padding:16px}.ac-v253-dialog h2{font-size:18px}}'
  ].join('');
  document.head.appendChild(st);
 }
 function choose(mode){
   var existing=document.querySelector('#acMeterModeCard [data-ac-mode="'+mode+'"]');
   if(!existing)return;
   window.__AC_EV_SITUATION_SELECTED=true;
   existing.click();
   document.dispatchEvent(new CustomEvent('ac:ev-situation-chosen',{detail:{mode:mode}}));
   close();
 }
 function close(){
  if(!dialog)return;dialog.remove();dialog=null;
  if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
  previousFocus=null;
 }
 function open(){
  if(dialog||!$('acMeterModeCard'))return;
  previousFocus=document.activeElement;
  var overlay=element('div','ac-v253-mode');overlay.id='acEvSituationDialog';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','acEvV253Title');
  var pane=element('div','ac-v253-dialog');
  var h=element('h2',null,'🚙 Does the potential customer already own an EV?');h.id='acEvV253Title';pane.appendChild(h);
  pane.appendChild(element('p','ac-v253-sub','Choose an option to personalise their electricity comparison.'));
  [
    {value:'meter',icon:'🚙',title:'Yes - they already own an EV',sub:'Use their annual day and night electricity consumption'},
    {value:'estimate',icon:'🚗',title:'No - they’re considering getting one',sub:'Estimate charging costs from expected annual mileage'}
  ].forEach(function(choice){
   var btn=element('button','ac-v253-choice');btn.type='button';btn.dataset.evSituation=choice.value;
   var emoji=element('span','ac-v253-emoji',choice.icon);emoji.setAttribute('aria-hidden','true');
   var text=element('span');text.appendChild(element('strong',null,choice.title));text.appendChild(element('small',null,choice.sub));
   btn.appendChild(emoji);btn.appendChild(text);btn.appendChild(element('span','ac-arrow','›'));
   btn.addEventListener('click',function(){choose(choice.value)});
   pane.appendChild(btn);
  });
  overlay.appendChild(pane);document.body.appendChild(overlay);dialog=overlay;
  overlay.addEventListener('keydown',function(event){
   if(event.key==='Tab'){
    var buttons=overlay.querySelectorAll('button');if(!buttons.length)return;
    if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons[buttons.length-1].focus()}
    else if(!event.shiftKey&&document.activeElement===buttons[buttons.length-1]){event.preventDefault();buttons[0].focus()}
   }
   // Choosing a mode is essential for a new comparison; don't dismiss with Escape.
   if(event.key==='Escape')event.preventDefault();
  });
  overlay.querySelector('button').focus();
 }
 function maybeOpen(){
  if(shared||prompted)return;
  if(linked&&!window.__AC_EV_SITUATION_HYDRATED)return;
  if(window.__AC_EV_SITUATION_SELECTED)return;
  prompted=true;open();
 }
 function install(){
  if(installed||!$('acMeterModeCard')||!$('acV250Modal'))return false;
  style();
  var gear=$('acV250Gear'),title=document.querySelector('header .title-row');
  if(gear&&title){gear.classList.add('ac-v253-cog');title.appendChild(gear)}
  var settings=$('acV250Modal').querySelector('.ac-v250-body');
  if(settings&&!shared){
   var change=element('button','ac-v253-change','🚙 Change EV situation');
   change.id='acEvChangeSituation';change.type='button';
   change.onclick=function(){var x=$('acV250Close');if(x)x.click();open()};
   settings.insertBefore(change,settings.firstChild);
  }
  installed=true;maybeOpen();return true;
 }
 document.addEventListener('ac:ev-workspace-ready',function(){if(installed)maybeOpen()});
 var attempts=0;
 function start(){if(install())return;if(++attempts<120)setTimeout(start,100)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();