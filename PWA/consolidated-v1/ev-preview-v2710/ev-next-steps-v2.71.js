/* EV Companion v2.71 - contact options only, no tariff mathematics.
   The customer's UW status is optional and never required to run comparisons. */
(function(){
 'use strict';
 var root=document.documentElement,params=new URL(location.href).searchParams;
 var linked=params.has('ac_launch');
 var hasPersonalLink=params.has('s')||/^(?:p|p2)=/.test(location.hash.slice(1));
 var isPublic=!linked&&!hasPersonalLink;
 if(isPublic)root.classList.add('ac-ev-public');
 function el(tag,klass,label){
  var x=document.createElement(tag);
  if(klass)x.className=klass;
  if(label!==undefined)x.textContent=label;
  return x;
 }
 function style(){
  if(document.getElementById('acEvSmartStyle'))return;
  var s=el('style');s.id='acEvSmartStyle';
  s.textContent=[
   'html.ac-ev-public #shareSetup{display:none!important}',
   '.ac-ev-smart-help{box-sizing:border-box;max-width:100%;margin:17px 0 27px;padding:16px;border:1px solid #d8d6e8;border-radius:14px;background:#fbfaff;color:#302547;font:400 13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}',
   '.ac-ev-smart-help h2{margin:0 0 7px;font-size:18px;line-height:1.3}',
   '.ac-ev-smart-help p{margin:7px 0;color:#504b64}',
   '.ac-ev-smart-help .ac-ev-notice{background:#f4f1fa;padding:10px 11px;border-radius:10px;margin:10px 0;font-size:12px}',
   '.ac-ev-smart-help button{font:700 12px system-ui;text-align:left;border-radius:9px;padding:9px 10px;border:1px solid #ddd6eb;background:#fff;color:#423265;cursor:pointer}',
   '.ac-ev-smart-help button:focus-visible,.ac-ev-smart-help a:focus-visible{outline:3px solid #e8bb4a;outline-offset:3px}',
   '.ac-ev-smart-choices{display:grid;gap:7px;margin:12px 0}',
   '.ac-ev-smart-help a.ac-ev-smart-book{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 14px;border-radius:10px;color:#fff;background:#6651a7;text-decoration:none;font-weight:800}',
   '.ac-ev-smart-help .ac-ev-smart-selection[hidden]{display:none}',
   '.ac-ev-smart-help .ac-ev-smart-change{padding:3px 5px;border:0;background:transparent;color:#604bac;text-decoration:underline}',
   '@media(min-width:650px){.ac-ev-smart-choices{grid-template-columns:repeat(3,minmax(0,1fr))}}'
  ].join('');
  document.head.appendChild(s);
 }
 function status(){
  var value=window.__AC_EV_UW_STATUS||params.get('uw')||'';
  return value==='existing'||value==='exploring'?value:null;
 }
 function mount(){
  var wrap=document.querySelector('.wrap');
  if(!wrap)return false;
  style();
  var box=document.getElementById('acEvSmartHelp');
  if(!box){box=el('section','ac-ev-smart-help');box.id='acEvSmartHelp';box.setAttribute('aria-label','Help with your UW EV options');wrap.appendChild(box);}
  render(box);return true;
 }
 function render(box){
  if(!box)return;
  box.textContent='';
  var value=status();
  if(!value){box.hidden=true;return}
  box.hidden=false;
  box.appendChild(el('h2',null,value==='existing'?'🔌 Already with Utility Warehouse?':'⚡ Interested in Utility Warehouse?'));
  if(value==='existing'){
   box.appendChild(el('p',null,'Explore how different UW electricity options affect the total cost of charging your EV and powering your home.'));
   box.appendChild(el('p','ac-ev-notice','These are illustrative UW tariff comparisons, not a confirmed saving against your own current tariff. Check your existing tariff, eligibility and any terms before switching.'));
   if(window.__AC_EV_KNOWN_PARTNER==='adrian'){
    box.appendChild(el('p',null,'Adrian is already your UW contact. If you would like to review these options together, you can get in touch directly.'));
    box.appendChild(booking());
   }else{
    box.appendChild(el('p',null,'If you would like help with your own tariff, which best describes you?'));
   var choices=el('div','ac-ev-smart-choices');
   [
    ['own','Adrian is my UW Partner'],
    ['other','I’m still in touch with my UW Partner'],
    ['missing','I’ve lost touch, have no Partner contact, or I’m not sure']
   ].forEach(function(item){
    var btn=el('button',null,item[1]);btn.type='button';
    btn.addEventListener('click',function(){
     var output=box.querySelector('#acEvSmartSelection');
     output.textContent='';
     output.appendChild(el('p',null,item[0]==='other'?
      'Your own UW Partner is best placed to help you check your current tariff and available options.':
      'Adrian can talk through your EV requirements and help you find the right UW contact or tariff information.'));
     if(item[0]!=='other')output.appendChild(booking());
     output.hidden=false;
    });
    choices.appendChild(btn);
   });
   box.appendChild(choices);
   var output=el('div','ac-ev-smart-selection');output.id='acEvSmartSelection';output.hidden=true;box.appendChild(output);
   }
  }else{
   box.appendChild(el('p',null,'Curious whether Utility Warehouse could be a good fit for your household? Adrian Croft is a local UW Authorised Partner and can help you explore the options. No obligation.'));
   box.appendChild(booking());
  }
  if(isPublic){
   var change=el('button','ac-ev-smart-change','Change UW customer status');
   change.type='button';
   change.onclick=function(){
     if(window.AppointmentCompanionEvJourney)window.AppointmentCompanionEvJourney.askUwStatus();
   };
   box.appendChild(el('p')).appendChild(change);
  }
 }
 function booking(){
  var a=el('a','ac-ev-smart-book','📅 Arrange an informal chat with Adrian');
  a.href='https://tidycal.com/aqcroft/uwpresent';
  a.rel='noopener noreferrer';
  a.target='_blank';
  return a;
 }
 document.addEventListener('ac:ev-uw-change',function(){mount()});
 document.addEventListener('ac:ev-core-ready',function(){mount()});
 document.addEventListener('ac:ev-comparison',function(){if(!document.getElementById('acEvSmartHelp'))mount()});
 var count=0;function start(){if(!mount()&&++count<80)setTimeout(start,125)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
