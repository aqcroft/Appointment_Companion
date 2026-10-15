/* Synthetic DOM behaviour for shared Companion Back navigation. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','menu-groups-v2.60.2.js'),'utf8');
class Element{
  constructor(id='',action=''){this.id=id;this.action=action;this.children=[];this.parentNode=null;this.dataset={};this.listeners={};this.attributes={};this.style={setProperty(){}};this.className='';this.textContent='';}
  getBoundingClientRect(){return {right:375,bottom:75};}
  get firstChild(){return this.children[0]||null;}
  get firstElementChild(){return this.firstChild;}
  get nextSibling(){if(!this.parentNode)return null;return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null;}
  get nextElementSibling(){return this.nextSibling;}
  get classList(){return {contains:n=>this.className.split(/\s+/).includes(n),remove:n=>{this.className=this.className.split(/\s+/).filter(c=>c!==n).join(' ');},add:n=>{if(!this.className.split(/\s+/).includes(n))this.className+=' '+n;}};}
  insertBefore(n,ref){if(n.parentNode){const old=n.parentNode.children;const ix=old.indexOf(n);if(ix>=0)old.splice(ix,1);}
    const ix=ref?this.children.indexOf(ref):this.children.length;if(ix<0)throw Error('invalid insertBefore reference');
    this.children.splice(ix,0,n);n.parentNode=this;return n;}
  appendChild(n){return this.insertBefore(n,null);}
  click(){this.clickCount=(this.clickCount||0)+1;for(const cb of (this.listeners.click||[]))cb({preventDefault(){},stopPropagation(){}});}
  remove(){if(!this.parentNode)return;const a=this.parentNode.children;a.splice(a.indexOf(this),1);this.parentNode=null;}
  setAttribute(k,v){this.attributes[k]=v;if(k==='data-ac-menu-group')this.dataset.acMenuGroup=v;}
  addEventListener(k,fn){(this.listeners[k]||=[]).push(fn);}
  matches(selector){if(selector===':popover-open')return !!this.popped;if(selector.startsWith('#'))return this.id===selector.slice(1);
    let m=selector.match(/^\[data-cloud-action="([^"]+)"\]$/);return !!m&&this.action===m[1];}
  querySelector(selector){if(selector==='.menu-ico + span')return {textContent:''};
    for(const n of this.children){if(n.matches(selector))return n;let nested=n.querySelector(selector);if(nested)return nested;}return null;}
}
function build(options={}){
  const root=new Element('document'),head=new Element('head'),menu=new Element('cloudMenuPopover'),toggle=new Element('cloudActionMenu');
  root.appendChild(head);root.appendChild(menu);root.appendChild(toggle);
  const actions=[['new-customer','New'],['delete-current','Delete'],['all-customers','Cloud'],['save','Save'],['save-as','Scenario'],['basket','Basket'],['partner','Profile'],['settings','Settings'],['admin','Admin']];
  let existing={};for(const [action,id]of actions){const e=new Element(id,action);existing[id]=e;menu.appendChild(e);}
  for(const id of ['acUnifiedMenuLink','acShareAppMenuButton','acGsMenu','acV22StatusBlock','acRelationshipFollowupLink'])menu.appendChild(new Element(id));
  const seek=(n,id)=>n.id===id?n:n.children.map(x=>seek(x,id)).find(Boolean);
  const document={documentElement:{classList:{contains:()=>false}},head,createElement:()=>new Element(),getElementById:id=>seek(root,id)};
  let schedule,observeMenu;
  const window={innerWidth:390,innerHeight:840,addEventListener(){}};
  if(options.popover){
    menu.showPopover=()=>{menu.popped=true;menu.popoverShown=(menu.popoverShown||0)+1;};
    menu.hidePopover=()=>{menu.popped=false;menu.popoverHidden=(menu.popoverHidden||0)+1;};
  }
  class MutationObserver {constructor(cb){this.cb=cb} observe(){observeMenu=this.cb} disconnect(){}}
  vm.runInNewContext(source,{window,document,MutationObserver,setInterval:fn=>{schedule=fn;return 1;},clearInterval:()=>{}});
  schedule();
  return {window,document,menu,toggle,existing,notify:()=>{if(observeMenu)observeMenu();}};
}
test('root shows three menu choices; submenu Back returns without losing actions',()=>{
  const x=build(),menu=x.menu;
  assert.equal(menu.dataset.acMenuView,'root');
  const root=menu.querySelector('#acMenuRootActions'),back=menu.querySelector('#acMenuBack');
  assert.equal(root.children.length,9); // two headings, four shortcuts, three submenus
  root.querySelector('#acMenuSection-customers').click();
  assert.equal(menu.dataset.acMenuView,'customers');
  assert.ok(menu.children.includes(x.existing.Save));
  assert.ok(menu.children.includes(x.existing.Delete));
  back.listeners.click[0]({preventDefault(){},stopPropagation(){}});
  assert.equal(menu.dataset.acMenuView,'root');
  root.querySelector('#acMenuSection-account').click();
  assert.equal(menu.dataset.acMenuView,'account');
  menu.listeners.keydown[0]({key:'Escape',preventDefault(){},stopPropagation(){}});
  assert.equal(menu.dataset.acMenuView,'root');
});
test('reopening and dynamically added actions preserve original event-bound buttons',()=>{
  const x=build(),menu=x.menu,save=x.existing.Save;
  const extra=new Element('extra-extension');menu.appendChild(extra);
  x.window.AppointmentCompanionMenuGroups.refresh();
  assert.equal(menu.querySelector('#extra-extension'),extra);
  assert.equal(extra.dataset.acMenuGroup,'more');
  assert.equal(menu.children.filter(n=>n===save).length,1);
  x.toggle.listeners.click[0]();
  assert.equal(menu.dataset.acMenuView,'root');
  assert.equal(menu.children.filter(n=>n===save).length,1);
  assert.equal(menu.querySelector('#acV22StatusBlock'),null);
  assert.equal(menu.querySelector('#acRelationshipFollowupLink'),null);
});

test('four visible quick actions trigger the original, single-source menu handlers',()=>{
  const x=build(),root=x.menu.querySelector('#acMenuRootActions');
  const actions=[
    ['new','New'],
    ['basket','Basket'],
    ['scenario','Scenario'],
    ['customers','Cloud']
  ];
  const ids=['acQuickAction-new','acQuickAction-basket','acQuickAction-scenario','acQuickAction-customers'];
  assert.deepEqual(root.children.filter(n=>n.className.includes('ac-menu-shortcut')).map(n=>n.id),ids);
  for(let i=0;i<actions.length;i++){
    const [shortId,sourceKey]=actions[i],shortcut=root.querySelector('#acQuickAction-'+shortId);
    assert.ok(shortcut,shortId);
    shortcut.click();
    assert.equal(x.existing[sourceKey].clickCount,1,sourceKey);
    assert.equal(x.menu.dataset.acMenuView,'root');
  }
  assert.equal(root.querySelector('#acQuickAction-customers').attributes['data-ac-quick-action'],'all-customers');
  assert.equal(x.existing.Save.clickCount||0,0,'Normal Save remains a toolbar/submenu action');
  const originalButtons=['New','Basket','Scenario','Cloud'];
  originalButtons.forEach(key=>assert.equal(x.menu.children.filter(n=>n===x.existing[key]).length,1));
  x.window.AppointmentCompanionMenuGroups.refresh();
  assert.deepEqual(root.children.filter(n=>n.className.includes('ac-menu-shortcut')).map(n=>n.id),ids,'Refresh does not duplicate shortcuts');
});

test('menu becomes a true browser top-layer popover above an expanded accordion',()=>{
  const h=build({popover:true}),menu=h.menu;
  assert.equal(menu.attributes.popover,'manual');
  assert.ok(menu.style.setProperty,'fixed-position styling is supported');
  menu.className='cloud-menu-popover open';
  h.notify();
  assert.equal(menu.popoverShown,1,'Opening menu must call native showPopover');
  assert.equal(menu.popped,true);
  h.notify();
  assert.equal(menu.popoverShown,1,'Repeated mutations must not reopen it');
  menu.className='cloud-menu-popover';
  h.notify();
  assert.equal(menu.popoverHidden,1,'Closing menu hides the top-layer popover');
  assert.equal(menu.popped,false);
  const root=menu.querySelector('#acMenuRootActions');
  assert.equal(root.querySelector('#acQuickAction-basket').children[0].textContent,'🧺');
});
