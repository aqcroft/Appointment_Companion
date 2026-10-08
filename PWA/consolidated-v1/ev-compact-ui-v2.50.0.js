/* EV Companion v2.50.0 - compact, distraction-free layout.
   Keep original form inputs in the DOM so existing calculations, autosave and
   both sharing workflows continue to function without duplicate state. */
(function () {
  'use strict';
  var installed=false, openedBy=null;
  function $(id){return document.getElementById(id)}
  function make(tag,cls,txt){
    var node=document.createElement(tag);
    if(cls)node.className=cls;
    if(txt)node.textContent=txt;
    return node;
  }
  function installStyles(){
    if($('acV250Styles'))return;
    var style=make('style');style.id='acV250Styles';
    style.textContent=[
      '#shareSetup{display:none!important}',
      '#acMeterActual .ac-meter-summary,#acMeterActual .ac-meter-disclaimer{display:none!important}',
      '#acMeterModeCard{padding:11px 12px!important;margin-bottom:8px!important}',
      '#acMeterModeCard .ac-meter-question{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px!important}',
      '#acMeterModeCard .ac-meter-choices{gap:6px}',
      '#acMeterModeCard .ac-meter-source-label{margin:9px 0 6px!important}',
      '#acMeterModeCard .ac-meter-fields input{padding:8px 10px!important;margin-top:4px!important}',
      '.ac-v250-cog{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:35px;height:33px;border:1px solid #d7e3e0;border-radius:9px;background:#f2f8f6;color:#067f73;font-size:18px;cursor:pointer}',
      '.ac-v250-cog:focus-visible,.ac-v250-modal button:focus-visible{outline:3px solid #cc9e33;outline-offset:2px}',
      '.ac-v250-modal[hidden]{display:none!important}',
      '.ac-v250-modal{position:fixed;inset:0;z-index:19000;background:rgba(23,29,40,.65);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}',
      '.ac-v250-dialog{width:100%;max-width:490px;max-height:calc(100dvh - 24px);overflow:hidden;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.24);color:#233633}',
      '.ac-v250-heading{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:14px 16px 10px;border-bottom:1px solid #e1e8e6}',
      '.ac-v250-heading strong{font-size:17px}',
      '.ac-v250-close{height:34px;width:34px;border-radius:9px;background:#f4f6f6;border:1px solid #d9e4e1;cursor:pointer;font-size:20px}',
      '.ac-v250-body{overflow-y:auto;overscroll-behavior:contain;padding:12px 16px 17px;font-size:12px}',
      '.ac-v250-body > section{margin:0 0 13px;padding:0 0 12px;border-bottom:1px solid #e4ebe9}',
      '.ac-v250-section-title{font-size:12px;font-weight:850;margin:2px 0 8px}',
      '.ac-v250-body details summary{font-size:12px;font-weight:850;cursor:pointer;line-height:1.5}',
      '.ac-v250-body .ac-meter-details{margin:0;border:0;padding:0}',
      '.ac-v250-body .ac-meter-details p{margin:8px 0;font-size:11px;line-height:1.55}',
      '.ac-v250-body .ac-meter-details label{font-size:11px}',
      '.ac-v250-body .ac-meter-details .ac-meter-shift{font-size:11px;line-height:1.5}',
      '.ac-v250-body .usage-timing{display:block!important;margin:0!important;padding:0!important}',
      '.ac-v250-body #acV250Time .usage-timing-panel{margin-top:9px}',
      '.ac-v250-body #acV250General > details{margin:0;padding:0;border:0}',
      '.ac-v250-body #acV250General > details summary{padding:4px 0}',
      '.ac-v250-body .settings{padding:11px 0 0;max-width:100%}',
      '.ac-metered-mode #acV250Time{display:none!important}',
      'html:not(.ac-metered-mode) #acV250Night{display:none!important}',
      '.ac-e7-considering #acV250Time .usage-timing{display:block!important}',
      'body.ac-v250-locked{overflow:hidden!important}',
      '.ac-ev-mile-hint{display:none!important}',
      '#acEvFuelExplain{font-size:10px!important;line-height:1.4!important;margin-top:7px!important}',
      '.ac-v250-preview-share{border:1px solid #cee4de;background:#eef8f5;color:#04776a;border-radius:8px;font-size:17px;line-height:1;padding:7px;cursor:pointer;margin-left:auto}',
      '@media(max-width:390px){.ac-v250-body{padding:10px 12px 14px}.ac-v250-heading{padding:11px 12px}.ac-v250-dialog{max-height:calc(100dvh - 16px)}}'
    ].join('');
    document.head.appendChild(style);
  }
  function closeModal(){
    var modal=$('acV250Modal');if(!modal||modal.hidden)return;
    modal.hidden=true;
    document.body.classList.remove('ac-v250-locked');
    if(openedBy){openedBy.focus();openedBy=null;}
  }
  function openModal(button){
    var modal=$('acV250Modal');if(!modal)return;
    openedBy=button||null;
    modal.hidden=false;
    document.body.classList.add('ac-v250-locked');
    $('acV250Close').focus();
  }
  function modalSection(id,title){
    var section=make('section');section.id=id;
    if(title)section.appendChild(make('div','ac-v250-section-title',title));
    return section;
  }
  function createModal(){
    var overlay=make('div','ac-v250-modal');overlay.id='acV250Modal';overlay.hidden=true;
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','acV250Title');
    var dialog=make('div','ac-v250-dialog');
    var heading=make('div','ac-v250-heading');
    var title=make('strong',null,'⚙️ Electricity settings');title.id='acV250Title';heading.appendChild(title);
    var close=make('button','ac-v250-close','×');close.id='acV250Close';close.type='button';close.setAttribute('aria-label','Close settings');heading.appendChild(close);
    var body=make('div','ac-v250-body');
    var night=modalSection('acV250Night','');var time=modalSection('acV250Time','');var general=modalSection('acV250General','');
    var assumptions=$('acMeterAssumptions');
    var usage=document.querySelector('.usage-timing');
    var settings=document.querySelector('.settings');
    if(!assumptions||!usage||!settings)return false;
    var generalDetails=settings.closest('details');
    if(!generalDetails)return false;
    // Move, never clone: the sliders keep their original event handlers and values.
    night.appendChild(assumptions);time.appendChild(usage);general.appendChild(generalDetails);
    assumptions.open=true;
    var summary=assumptions.querySelector('summary');if(summary)summary.firstChild.textContent='How much electricity is used overnight? ';
    body.appendChild(night);body.appendChild(time);body.appendChild(general);
    dialog.appendChild(heading);dialog.appendChild(body);overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    close.onclick=closeModal;
    overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal()});
    document.addEventListener('keydown',function(e){
      if(overlay.hidden)return;
      if(e.key==='Escape'){e.preventDefault();closeModal()}
      if(e.key==='Tab'){
        var available=overlay.querySelectorAll('button,input,select,summary,textarea,[tabindex]:not([tabindex="-1"])');
        var visible=Array.prototype.filter.call(available,function(x){return x.getClientRects().length>0&&!x.disabled});
        if(visible.length){
          var first=visible[0],last=visible[visible.length-1];
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
        }
      }
    });
    return true;
  }
  function install(){
    if(installed)return true;
    var mode=$('acMeterModeCard'),actual=$('acMeterActual');
    if(!mode||!actual||!$('acMeterAssumptions')||!document.querySelector('.settings'))return false;
    installStyles();
    if(!createModal())return false;
    var title=mode.querySelector('.ac-meter-question');
    if(title){
      var button=make('button','ac-v250-cog','⚙️');button.type='button';
      button.id='acV250Gear';button.setAttribute('aria-label','Open electricity settings');
      button.title='Electricity settings';
      button.onclick=function(){openModal(button)};
      title.appendChild(button);
    }
    // The original Share form is hidden, not deleted: the universal toolbar
    // still invokes createShareBtn, and that action can ask for a name.
    var share=$('shareSetup');if(share)share.hidden=true;
    var fuel=$('acEvFuelExplain');
    if(fuel)fuel.textContent='Fuel and charging costs only. Petrol and diesel prices are estimates.';
    installed=true;
    return true;
  }
  var attempts=0;
  function start(){if(install())return;if(++attempts<100)setTimeout(start,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  // The standalone preview uses a different pathname, so the main universal
  // toolbar may not be injected. Provide a compact testing-only share shortcut.
  setTimeout(function(){
    if(!location.pathname.includes('/ev-preview-'))return;
    if($('acSharedToolstrip')||$('acV250PreviewShare'))return;
    var trigger=$('createShareBtn'),head=document.querySelector('header .title-row');
    if(!trigger||!head)return;
    var btn=make('button','ac-v250-preview-share','↗');btn.id='acV250PreviewShare';btn.type='button';
    btn.title='Share this EV comparison';btn.setAttribute('aria-label','Share this EV comparison');
    btn.onclick=function(){trigger.click()};
    head.appendChild(btn);
  },1700);
})();