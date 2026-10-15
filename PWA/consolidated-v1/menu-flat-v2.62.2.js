/* Appointment Companion v2.62.2 - one-level, partner-only main menu.
   Reorders ORIGINAL Cloud action buttons. Never clone, replace, or recreate
   their event handlers. More expands in place; no submenu navigation.
*/
(function (global) {
  'use strict';
  if (global.__AC_SHARED_VIEW ||
      document.documentElement.classList.contains('view-mode') ||
      document.documentElement.classList.contains('shared-view') ||
      /(?:^|[?&])public=1(?:&|$)/.test(global.location.search) ||
      /^#d=/.test(global.location.hash)) return;

  var SECTION = [
    {id:'customers',title:'Customers & quotes',items:[
      '[data-cloud-action="new-customer"]',
      '[data-cloud-action="all-customers"]',
      '[data-cloud-action="save"]',
      '[data-cloud-action="save-as"]',
      '[data-cloud-action="basket"]'
    ]},
    {id:'account',title:'Account & app',items:[
      '[data-cloud-action="partner"]',
      '#acUnifiedMenuLink',
      '[data-cloud-action="settings"]'
    ]},
    {id:'more',title:'More options',items:[
      '#acShareAppMenuButton',
      '#acGsMenu',
      '[data-cloud-action="admin"]',
      '#acFlatOutreachLink'
    ]}
  ];
  var deleteSelector='[data-cloud-action="delete-current"]';
  var menu=null,toggle=null,watcher=null;
  function direct(selector) {
    var node=menu && menu.querySelector(selector);
    return node && node.parentElement===menu ? node : null;
  }
  function heading(id,label) {
    var key='acFlatHeading-'+id;
    var el=document.getElementById(key);
    if(!el){el=document.createElement('div');el.id=key;el.className='ac-flat-heading';}
    el.textContent=label;
    el.setAttribute('role','separator');
    return el;
  }
  function rename(selector,label) {
    var btn=direct(selector);
    if(!btn)return;
    var span=btn.querySelector('.menu-ico + span');
    if(span)span.textContent=label;
    btn.setAttribute('aria-label',label);
  }
  function moreToggle() {
    var btn=document.getElementById('acFlatMoreToggle');
    if(btn)return btn;
    btn=document.createElement('button');
    btn.type='button';btn.id='acFlatMoreToggle';
    btn.className='pill cloud-menu-item ac-flat-more';
    btn.setAttribute('role','menuitem');
    btn.setAttribute('aria-expanded','false');
    var icon=document.createElement('span');
    icon.className='menu-ico';icon.textContent='📚';
    var label=document.createElement('span');
    label.className='ac-flat-more-label';label.textContent='More options';
    var arrow=document.createElement('span');
    arrow.className='ac-flat-more-arrow';arrow.textContent='⌄';
    arrow.setAttribute('aria-hidden','true');
    btn.append(icon,label,arrow);
    btn.addEventListener('click',function(event) {
      event.preventDefault();event.stopPropagation();
      var expanded=menu.dataset.acMoreOpen==='1';
      menu.dataset.acMoreOpen=expanded?'0':'1';
      btn.setAttribute('aria-expanded',expanded?'false':'true');
      arrow.textContent=expanded?'⌄':'⌃';
      position();
    });
    return btn;
  }
  function outreachLink() {
    var a=document.getElementById('acFlatOutreachLink');
    if(a)return a;
    a=document.createElement('a');a.id='acFlatOutreachLink';
    a.className='pill cloud-menu-item ac-flat-outreach';
    a.href=new URL('../outreach/',global.location.href).href;
    a.setAttribute('aria-label','Open the standalone Relationship follow-up app');
    a.textContent='🤝  Relationship follow-up';
    return a;
  }
  function organise() {
    if(!menu)return;
    var obsolete=['#acRelationshipFollowupLink','#acV22StatusBlock','#acMenuRootActions','#acMenuBack'];
    obsolete.forEach(function(sel){var el=direct(sel);if(el)el.remove();});
    rename('[data-cloud-action="all-customers"]','View all Cloud customers');
    rename('[data-cloud-action="partner"]','My profile');
    rename('[data-cloud-action="settings"]','Settings');
    outreachLink();
    var ordered=[],used=new Set();
    function add(node,section){
      if(!node||used.has(node))return;
      used.add(node);
      if(section)node.dataset.acFlatGroup=section;
      ordered.push(node);
    }
    SECTION.slice(0,2).forEach(function(section){
      add(heading(section.id,section.title));
      section.items.forEach(function(sel){add(direct(sel),section.id);});
    });
    add(moreToggle());
    SECTION[2].items.forEach(function(sel){add(sel==='#acFlatOutreachLink'?outreachLink():direct(sel),'more');});
    // New extensions remain accessible, without being promoted into quick actions.
    Array.from(menu.children).forEach(function(child){
      if(!used.has(child) && child!==direct(deleteSelector) &&
         !child.classList.contains('ac-menu-heading') &&
         !child.classList.contains('ac-menu-back')){
        add(child,'more');
      }
    });
    var del=direct(deleteSelector);
    if(del){
      add(heading('danger',''));
      add(del,'delete');
    }
    ordered.forEach(function(node,index){
      if(menu.children[index]!==node)menu.insertBefore(node,menu.children[index]||null);
    });
    // Removed headings from the previous tiered implementation are not actionable.
    Array.from(menu.children).forEach(function(child){
      if(!used.has(child) && (child.classList.contains('ac-menu-heading')||
         child.classList.contains('ac-menu-back')))child.remove();
    });
    if(!menu.dataset.acMoreOpen)menu.dataset.acMoreOpen='0';
    return true;
  }
  function position(){
    if(!menu||!toggle)return;
    var box=toggle.getBoundingClientRect();
    var width=Math.min(340,global.innerWidth-16);
    var left=Math.max(8,Math.min(global.innerWidth-width-8,box.right-width));
    var top=Math.max(6,Math.min(global.innerHeight-52,box.bottom+6));
    var st=menu.style;
    st.setProperty('position','fixed','important');
    st.setProperty('inset','auto','important');
    st.setProperty('top',Math.round(top)+'px','important');
    st.setProperty('left',Math.round(left)+'px','important');
    st.setProperty('right','auto','important');
    st.setProperty('bottom','auto','important');
    st.setProperty('margin','0','important');
    st.setProperty('width','min(340px, calc(100vw - 16px))','important');
    st.setProperty('max-height','calc(100dvh - '+Math.round(top+10)+'px)','important');
    st.setProperty('overflow-y','auto','important');
    st.setProperty('z-index','2147483000','important');
  }
  function sync(){
    if(!menu)return;
    var open=menu.classList.contains('open');
    if(open)position();
    if(!menu.hasAttribute('popover'))return;
    try{
      if(open&&!menu.matches(':popover-open'))menu.showPopover();
      else if(!open&&menu.matches(':popover-open'))menu.hidePopover();
    }catch(e){menu.removeAttribute('popover');}
  }
  function css(){
    if(document.getElementById('acFlatMenuStyles'))return;
    var style=document.createElement('style');
    style.id='acFlatMenuStyles';
    style.textContent=[
      '#cloudMenuPopover[data-ac-flat="1"]{overscroll-behavior:contain;box-sizing:border-box}',
      '#cloudMenuPopover[data-ac-flat="1"]:popover-open{display:grid!important}',
      '#cloudMenuPopover[data-ac-flat="1"] .ac-flat-heading{margin:7px 4px 3px;padding-top:7px;border-top:1px solid #eee3f9;font:800 10px/1.25 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.075em;color:#71568d}',
      '#cloudMenuPopover[data-ac-flat="1"] #acFlatHeading-customers{margin-top:0;padding-top:2px;border:0}',
      '#cloudMenuPopover[data-ac-flat="1"] #acFlatHeading-danger{height:0;min-height:0;padding:0;margin:7px 4px 3px;border-top:1px solid #eee3f9}',
      '#cloudMenuPopover[data-ac-flat="1"] .cloud-menu-item{min-height:40px;box-sizing:border-box}',
      '#cloudMenuPopover[data-ac-flat="1"] .ac-flat-more{display:flex;align-items:center;gap:8px;width:100%;font-weight:750}',
      '#cloudMenuPopover[data-ac-flat="1"] .ac-flat-more .ac-flat-more-arrow{margin-left:auto;font-size:17px;color:#805fa5}',
      '#cloudMenuPopover[data-ac-flat="1"] .ac-flat-outreach{display:flex;align-items:center;min-height:40px;box-sizing:border-box;text-decoration:none;font-weight:700;color:#26164f}',
      '#cloudMenuPopover[data-ac-flat="1"][data-ac-more-open="0"] > [data-ac-flat-group="more"]{display:none!important}',
      '#cloudMenuPopover[data-ac-flat="1"] > [data-ac-flat-group="delete"]:not(:disabled){color:#923f48}',
      '#cloudMenuPopover[data-ac-flat="1"] .cloud-menu-item:focus-visible{outline:3px solid #ad86dc;outline-offset:2px}'
    ].join('');
    document.head.appendChild(style);
  }
  function install(){
    menu=document.getElementById('cloudMenuPopover');
    toggle=document.getElementById('cloudActionMenu');
    if(!menu||!toggle)return false;
    if(menu.dataset.acFlat==='1')return true;
    menu.dataset.acFlat='1';
    menu.dataset.acMoreOpen='0';
    css();
    if(typeof menu.showPopover==='function'&&typeof menu.hidePopover==='function'){
      menu.setAttribute('popover','manual');
    }
    organise();position();
    toggle.addEventListener('click',function(){
      // Cloud code owns opening/closing; this module only arranges the menu.
      menu.dataset.acMoreOpen='0';
      var more=document.getElementById('acFlatMoreToggle');
      if(more){more.setAttribute('aria-expanded','false');more.querySelector('.ac-flat-more-arrow').textContent='⌄';}
      organise();
      Promise.resolve().then(sync);
    },true);
    watcher=new MutationObserver(sync);
    watcher.observe(menu,{attributes:true,attributeFilter:['class']});
    global.addEventListener('resize',function(){if(menu.classList.contains('open'))position();},{passive:true});
    global.addEventListener('scroll',function(){if(menu.classList.contains('open'))position();},{passive:true});
    global.AppointmentCompanionMenuGroups={refresh:organise,openRoot:function(){menu.dataset.acMoreOpen='0';}};
    sync();
    return true;
  }
  var attempts=0,timer=setInterval(function(){if(install()||++attempts>240)clearInterval(timer);},50);
})(window);
