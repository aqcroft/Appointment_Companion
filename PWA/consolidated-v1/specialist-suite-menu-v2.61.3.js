/* Appointment Companion v2.61.3 - in-place suite menu for EV and Should I Fix.
   The specialist pages have no Main Companion customer form. Selecting a
   customer-edit action explicitly navigates to Main with a single-use action
   request; opening this menu or the TCP status control never navigates.
   Customer shared/portable views never display Partner-only controls.
*/
(function (global) {
  'use strict';
  var path=global.location.pathname;
  if(!/\/consolidated-v1\/(?:ev|should-i-fix)\//.test(path))return;
  if(document.documentElement.classList.contains('view-mode') ||
     document.documentElement.classList.contains('shared-view') ||
     document.documentElement.classList.contains('ac-customer-shared'))return;
  var menu=null,trigger=null,view='root';
  var home=new URL('../',global.location.href);

  var QUICK=[
    {label:'New customer',icon:'📄',action:'new-customer'},
    {label:'Saved quote basket link',icon:'🧺',action:'basket'},
    {label:'Save as new scenario',icon:'💾',action:'save-as'},
    {label:'All Cloud customers',icon:'☁️',action:'all-customers'},
    {label:'Delete current customer',icon:'🗑️',action:'delete-current'}
  ];
  var GROUPS=[
    {id:'customers',title:'Customers & quotes',icon:'👥',items:[
      ['☁️','All Cloud customers','all-customers'],['📄','New customer','new-customer'],
      ['💾','Save to Cloud','save'],['💾','Save as new scenario','save-as'],
      ['🧺','Saved quote basket link','basket'],['🗑️','Delete current customer','delete-current']
    ]},
    {id:'account',title:'Account & app',icon:'⚙️',items:[
      ['👤','My profile','partner'],['🔎','App status & updates','status'],
      ['⚙️','Settings & backup','settings']
    ]},
    {id:'more',title:'More',icon:'📚',items:[
      ['🔗','Share app link','share-app'],['📲','Getting started','help'],
      ['🔐','Admin','admin']
    ]}
  ];

  function ensureStyle(){
    if(document.getElementById('acSpecialistMenuStyles'))return;
    var s=document.createElement('style');s.id='acSpecialistMenuStyles';
    s.textContent=[
      '#acSpecialistSuiteMenu{position:fixed;inset:auto;z-index:2147483000;box-sizing:border-box;width:min(340px,calc(100vw - 24px));max-height:min(76dvh,650px);overflow:auto;overscroll-behavior:contain;padding:10px;background:#fff;color:#26164f;border:1px solid #e5d9f3;border-radius:16px;box-shadow:0 16px 46px rgba(38,22,79,.23);font:600 13px/1.3 system-ui,sans-serif}',
      '#acSpecialistSuiteMenu:not(:popover-open):not(.ac-spec-open){display:none}',
      '#acSpecialistSuiteMenu .ac-suite-body{display:grid;gap:5px}',
      '#acSpecialistSuiteMenu .ac-suite-heading{font:800 10px/1.25 system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:#785b9c;margin:7px 4px 4px}',
      '#acSpecialistSuiteMenu .ac-suite-action{display:flex;width:100%;min-height:41px;align-items:center;justify-content:flex-start;gap:10px;padding:9px 10px;border:1px solid #e6dbf5;background:#fff;border-radius:11px;box-sizing:border-box;color:#26164f;font:750 12.5px/1.3 system-ui,sans-serif;text-align:left;cursor:pointer}',
      '#acSpecialistSuiteMenu .ac-suite-action:focus-visible{outline:3px solid #ad86dc;outline-offset:1px}',
      '#acSpecialistSuiteMenu .ac-suite-icon{width:24px;text-align:center;font-size:17px;flex:0 0 24px}',
      '#acSpecialistSuiteMenu .ac-suite-chevron{margin-left:auto;font-size:18px;color:#7b638d}',
      '#acSpecialistSuiteMenu .ac-suite-back{background:#f8f4fd;color:#6c4b94}',
      '#acSpecialistSuiteMenu .ac-suite-action[data-ac-suite-action="delete-current"]{color:#903d45}',
      '#acSpecialistSuiteMenu .ac-suite-note{margin:8px 4px 4px;font:500 11px/1.35 system-ui;color:#76698a}'
    ].join('');
    document.head.appendChild(s);
  }

  function node(label,icon,action,section){
    var b=document.createElement('button');b.type='button';b.className='ac-suite-action';
    b.dataset.acSuiteAction=action;
    if(section)b.dataset.acSuiteSection=section;
    var graphic=document.createElement('span');graphic.className='ac-suite-icon';graphic.textContent=icon;
    var text=document.createElement('span');text.textContent=label;
    b.append(graphic,text);
    if(section){var arrow=document.createElement('span');arrow.className='ac-suite-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';b.appendChild(arrow);}
    return b;
  }
  function sectionHeading(text){
    var h=document.createElement('div');h.className='ac-suite-heading';h.textContent=text;return h;
  }
  function render(){
    if(!menu)return;
    menu.replaceChildren();
    var body=document.createElement('div');body.className='ac-suite-body';
    if(view==='root'){
      body.appendChild(sectionHeading('Quick actions'));
      QUICK.forEach(function(item){body.appendChild(node(item.label,item.icon,item.action));});
      body.appendChild(sectionHeading('More options'));
      GROUPS.forEach(function(g){body.appendChild(node(g.title,g.icon,'section',g.id));});
    }else{
      var group=GROUPS.find(function(g){return g.id===view;});
      body.appendChild(node('‹  Back to menu','', 'back'));
      body.appendChild(sectionHeading(group.title));
      group.items.forEach(function(item){body.appendChild(node(item[1],item[0],item[2]));});
      if(group.id==='customers') {
        var note=document.createElement('p');note.className='ac-suite-note';
        note.textContent='Customer editing continues in Main Companion. Opening this menu does not switch tools.';
        body.appendChild(note);
      }
    }
    menu.appendChild(body);
  }
  function position(){
    if(!menu||!trigger)return;
    var bounds=trigger.getBoundingClientRect(),width=Math.min(340,Math.max(180,global.innerWidth-24));
    var right=Math.max(8,Math.min(global.innerWidth-width-8,global.innerWidth-bounds.right));
    var top=Math.max(6,Math.min(global.innerHeight-52,bounds.bottom+7));
    menu.style.setProperty('inset','auto','important');
    menu.style.setProperty('top',Math.round(top)+'px','important');
    menu.style.setProperty('right',Math.round(right)+'px','important');
    menu.style.setProperty('left','auto','important');
    menu.style.setProperty('bottom','auto','important');
    menu.style.setProperty('margin','0','important');
    menu.style.setProperty('max-height','calc(100dvh - '+Math.round(top+12)+'px)','important');
  }
  function close(){
    if(!menu)return;
    if(typeof menu.hidePopover==='function'){
      try{if(menu.matches(':popover-open'))menu.hidePopover();}catch(_){}
    }
    menu.classList.remove('ac-spec-open');
    if(trigger)trigger.setAttribute('aria-expanded','false');
  }
  function open(){
    if(!install())return;
    view='root';render();position();
    try{if(typeof menu.showPopover==='function')menu.showPopover();else menu.classList.add('ac-spec-open');}
    catch(_){menu.classList.add('ac-spec-open');}
    if(trigger)trigger.setAttribute('aria-expanded','true');
  }
  function toggle(){
    if(menu&&(menu.classList.contains('ac-spec-open')||typeof menu.matches==='function'&&menu.matches(':popover-open')))close();
    else open();
  }
  function navigate(action){
    if(action==='status'){
      close();
      var status=global.AppointmentCompanionUnifiedStatus;
      if(status&&typeof status.open==='function')status.open();
      return;
    }
    if(action==='share-app'){
      close();
      var link=home.href;
      if(global.navigator.share){
        global.navigator.share({title:'Appointment Companion',url:link}).catch(function(){});
      }else if(global.navigator.clipboard&&global.navigator.clipboard.writeText){
        global.navigator.clipboard.writeText(link).then(function(){global.alert('Appointment Companion link copied.');},function(){global.prompt('Copy this link:',link);});
      }else global.prompt('Copy this link:',link);
      return;
    }
    if(action==='admin'){global.location.assign(new URL('../admin/',home).href);return;}
    var url=new URL(home.href);
    url.searchParams.set('open',action);
    global.location.assign(url.href);
  }
  function install(){
    if(menu&&menu.isConnected)return true;
    var buttons=Array.prototype.slice.call(document.querySelectorAll('#acSharedToolstrip .ac-toolbtn'));
    trigger=buttons.find(function(b){return b.getAttribute('aria-label')==='Companion menu';});
    if(!trigger)return false;
    ensureStyle();
    menu=document.getElementById('acSpecialistSuiteMenu');
    if(!menu){
      menu=document.createElement('div');menu.id='acSpecialistSuiteMenu';
      menu.setAttribute('role','menu');menu.setAttribute('aria-label','Appointment Companion menu');
      if(typeof menu.showPopover==='function')menu.setAttribute('popover','auto');
      document.body.appendChild(menu);
      menu.addEventListener('click',function(event){
        var btn=event.target.closest('[data-ac-suite-action]');if(!btn)return;
        event.preventDefault();event.stopPropagation();
        var action=btn.dataset.acSuiteAction;
        if(action==='back'){view='root';render();position();}
        else if(action==='section'){view=btn.dataset.acSuiteSection;render();position();}
        else navigate(action);
      });
      menu.addEventListener('toggle',function(){
        if(trigger)trigger.setAttribute('aria-expanded',menu.matches(':popover-open')?'true':'false');
      });
      document.addEventListener('keydown',function(e){
        if(e.key==='Escape'&&menu&&(menu.classList.contains('ac-spec-open')||menu.matches(':popover-open'))){
          if(view!=='root'){e.preventDefault();e.stopPropagation();view='root';render();}
          else close();
        }
      });
      document.addEventListener('pointerdown',function(e){
        if(menu.classList.contains('ac-spec-open')&&!menu.contains(e.target)&&e.target!==trigger)close();
      },true);
      global.addEventListener('resize',function(){if(menu&&trigger)position();},{passive:true});
    }
    trigger.setAttribute('aria-haspopup','menu');
    trigger.setAttribute('aria-expanded','false');
    render();
    return true;
  }
  // Capture before the legacy specialist toolbar button's direct handler.
  // Clicking hamburger must NEVER navigate to Main Companion.
  document.addEventListener('click',function(e){
    var target=e.target&&e.target.closest&&e.target.closest('#acSharedToolstrip .ac-toolbtn[aria-label="Companion menu"]');
    if(!target)return;
    e.preventDefault();e.stopImmediatePropagation();
    trigger=target;
    toggle();
  },true);
  global.AppointmentCompanionSpecialistMenu={open:open,close:close,installed:function(){return !!(menu&&menu.isConnected);}};
  var attempts=0,timer=setInterval(function(){if(install()||++attempts>240)clearInterval(timer);},50);
})(window);
