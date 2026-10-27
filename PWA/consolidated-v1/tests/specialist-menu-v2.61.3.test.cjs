/* Companion v2.61.3: tool-preserving hamburger menu and universal TCP UI. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.resolve(root,p),'utf8');
const menuScript=read('specialist-suite-menu-v2.61.3.js');

test('EV and Should I Fix load the same universal TCP and in-tool menu',()=>{
  for(const name of ['ev','should-i-fix']){
    const loader=read(name+'/index.html');
    assert.match(loader,/unified-status-v2\.59\.0\.js/);
    assert.match(loader,/specialist-suite-menu-v2\.62\.2\.js/);
    assert.match(loader,/v2\.66\.0/);
  }
  const core=read('unified-status-v2.59.0.js');
  assert.match(core,/version: 'v2\.66\.0'/);
  assert.match(core,/function dimensions\(\)/);
  assert.match(core,/function refreshCloud\(/);
  assert.match(core,/global\.AppointmentCompanionUnifiedStatus/);
});
test('the specialist hamburger code contains no immediate Main redirect',()=>{
  const features=read('specialist-features-v1.js');
  assert.doesNotMatch(features,/specialistMode\) location\.assign\(new URL\('\.\/\?open=menu'/);
  assert.match(features,/AppointmentCompanionSpecialistMenu/);
  assert.match(menuScript,/e\.stopImmediatePropagation\(\)/);
  assert.match(menuScript,/if\(action==='status'\)/);
  assert.match(menuScript,/document\.documentElement\.classList\.contains\('shared-view'\)/);
});
test('selected customer actions wait until the safe controller intercept is installed',()=>{
  const features=read('specialist-features-v1.js'),engine=read('consolidated-controller-v2.56.3.js');
  assert.match(features,/dataset\.acLocalFirstReady!=='1'/);
  assert.match(features,/sensitive\.indexOf\(open\)>=0/);
  assert.match(engine,/intercept\(\); document\.documentElement\.dataset\.acLocalFirstReady='1'/);
  assert.match(features,/'all-customers':'cloudPilotLoad'/);
  assert.match(features,/target\.click\(\)/);
});
class El{
  constructor(tag='div'){this.tagName=tag;this.id='';this.children=[];this.parent=null;this.dataset={};this.attrs={};this.listeners={};this.style={setProperty(){}};this.textContent='';this.hidden=false;this.popped=false;this.activeClasses=new Set();}
  setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]||null;}
  get classList(){return{contains:k=>this.activeClasses.has(k),add:k=>this.activeClasses.add(k),remove:k=>this.activeClasses.delete(k)};}
  get isConnected(){return !!this.parent;}
  append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;}}
  appendChild(n){this.append(n);return n;}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
  getBoundingClientRect(){return {bottom:75,right:365};}
  matches(s){return s===':popover-open'?this.popped:false;}
  showPopover(){this.popped=true;}
  hidePopover(){this.popped=false;}
  closest(selector){if(selector==='[data-ac-suite-action]'&&this.dataset.acSuiteAction)return this;return null;}
}
function harness(tool){
  const events={},byId=new Map(),button=new El('button');button.setAttribute('aria-label','Companion menu');
  const body=new El('body'),head=new El('head');
  const document={
    body,head,documentElement:{classList:{contains:()=>false}},
    createElement:tag=>new El(tag),
    getElementById:id=>byId.get(id)||null,
    querySelectorAll:s=>s==='#acSharedToolstrip .ac-toolbtn'?[button]:[],
    addEventListener:(t,fn)=>(events[t]??=[]).push(fn)
  };
  body.appendChild=function(el){el.parent=body;byId.set(el.id,el);return el;};
  head.appendChild=function(el){el.parent=head;byId.set(el.id,el);return el;};
  let assigned=[],alerted=[],shared=false;
  const location={pathname:'/PWA/consolidated-v1/'+tool+'/',href:'https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/'+tool+'/',assign:url=>assigned.push(url)};
  const window={location,innerWidth:390,innerHeight:840,addEventListener(){},navigator:{share(){shared=true;return Promise.resolve();}},alert:s=>alerted.push(s)};
  let installTimer;
  vm.runInNewContext(menuScript,{window,document,URL,setInterval(fn){installTimer=fn;return 5;},clearInterval(){}},{filename:'specialist-suite-menu-v2.61.3.js'});
  assert.ok(installTimer);
  installTimer();
  const menu=byId.get('acSpecialistSuiteMenu');
  assert.ok(menu);
  function tapHamburger(){
    const e={target:{closest:sel=>sel.includes('Companion menu')?button:null},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
    events.click[0](e);assert.equal(e.prevented,true);assert.equal(e.stopped,true);
  }
  function tapAction(action,section){
    const item=menu.children[0].children.find(x=>x.dataset.acSuiteAction===action&&(!section||x.dataset.acSuiteSection===section));
    assert.ok(item,action);
    menu.listeners.click[0]({target:{closest:()=>item},preventDefault(){},stopPropagation(){}});
    return item;
  }
  return {window,menu,trigger:button,events,assigned,tapHamburger,tapAction,get shared(){return shared;}};
}
for(const tool of ['ev','should-i-fix']){
test(tool+': hamburger opens a popover without leaving the current tool',()=>{
  const h=harness(tool);
  h.tapHamburger();
  assert.equal(h.assigned.length,0);
  assert.equal(h.menu.popped,true);
  assert.equal(h.trigger.attrs['aria-expanded'],'true');
  assert.equal(h.menu.children[0].children.filter(x=>x.dataset.acSuiteAction==='section').length,3);
  assert.ok(h.menu.children[0].children.some(x=>x.dataset.acSuiteAction==='delete-current'),'Delete is visible in specialist quick actions');
  assert.ok(h.menu.children[0].children.some(x=>x.dataset.acSuiteAction==='basket'),'Saved basket link is visible in specialist quick actions');
  assert.match(h.menu.children[0].children.find(x=>x.dataset.acSuiteAction==='basket').children[0].innerHTML,/viewBox="0 0 24 24"/);
  h.tapAction('section','customers');
  assert.equal(h.assigned.length,0);
  assert.ok(h.menu.children[0].children.some(x=>x.textContent==='Customers & quotes' || x.dataset.acSuiteAction==='all-customers'));
  h.tapAction('back');
  assert.equal(h.assigned.length,0);
  assert.ok(h.menu.children[0].children.some(x=>x.dataset.acSuiteAction==='section'));
});
test(tool+': customer editing navigates only AFTER explicitly choosing an action',()=>{
  const h=harness(tool);h.tapHamburger();h.tapAction('new-customer');
  assert.equal(h.assigned.length,1);
  const url=new URL(h.assigned[0]);
  assert.equal(url.searchParams.get('open'),'new-customer');
  assert.equal(url.pathname,'/Appointment_Companion/PWA/consolidated-v1/');
});
}
test('unknown Partner/Cloud/Customer status cannot be implicitly shown green',()=>{
  const status=read('unified-status-v2.59.0.js');
  assert.match(status,/cloud\.connection==='verified' && sync\.checked===true/);
  assert.match(status,/state:tariffState==='green'\?'green':tariffState==='red'\?'red':'amber'/);
  assert.match(status,/cloud\.profile==='loaded'\?'green'/);
});
