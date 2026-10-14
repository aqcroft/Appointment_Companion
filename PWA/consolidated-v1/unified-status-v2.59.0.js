/* Appointment Companion v2.59.0 - one top-left control and one App status & updates modal.
   Read-only reporting. Real Cloud checks run only when the modal is opened/refreshed.
   All status dimensions are independent: a green tariff light is NOT Cloud health.
   A dedicated fixture mode runs the EXACT SAME modal UI without reading live data.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var demo = !!global.__AC_UNIFIED_STATUS_PREVIEW;
  var meta = Object.freeze({
    version: 'v2.59.1',
    date: '14 October 2026',
    summary: 'Partner Cloud profile connection repaired',
    changes: [
      'Corrected the Cloud client loaded by Appointment Companion so Partner profile retrieval is available.',
      'The unified status panel now checks the real Cloud service and profile instead of reporting a missing local API as an outage.',
      'Local customer records, savings calculations and the one-tap status design are unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  var ID = 'acUnifiedStatusModal', trigger = null, checkSeq = 0, previousFocus = null, waitTimer = null;
  var cloud = { connection: 'idle', profile: 'idle', message: '', profileName: '', customerCount: null, owner: '', error: '' };
  var sync = { mode: 'checking', detail: 'Checking saved customer profiles…', count: null, pending: 0, conflicts: 0, current: '', local: 'Checking local save…' };
  function $(id) { return document.getElementById(id); }
  function esc(value) { return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function readable(when) {
    if (!when) return 'Not yet verified';
    var d = new Date(when);
    return Number.isNaN(d.getTime()) ? 'Not yet verified' : d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function ownAuth() {
    try {
      var a = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null');
      if (!(a && a.partner_id && a.workspace_key)) a = JSON.parse(localStorage.getItem('apptCloudPilotAuthDeviceV1') || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) { return null; }
  }
  function profileForAuth(profile, auth) {
    if (!profile || !auth) return null;
    var id = String(profile.partner_id || profile.companion_login_id || '').toLowerCase().trim();
    var owner = '';
    try { owner = String(localStorage.getItem('apptCompanionPartnerCloudOwnerV1') || '').toLowerCase().trim(); } catch (_) {}
    if (!id && owner === String(auth.partner_id).toLowerCase().trim()) id = owner;
    return id === String(auth.partner_id).toLowerCase().trim() && profile.name ? profile : null;
  }
  function localPartner(auth) {
    if (!auth) return null;
    var p = null;
    try { p = JSON.parse(localStorage.getItem('apptCompanionPartnerCloudProfileV1') || 'null'); } catch (_) {}
    p = profileForAuth(p, auth);
    if (p) return p;
    try { p = JSON.parse(localStorage.getItem('apptCompanionPartner') || 'null'); } catch (_) {}
    return profileForAuth(p, auth);
  }
  function tariff() {
    if (demo) return {status:'green',summary:{fixed:'Fixed Saver 99',tracker:'Tracker Start 6',variable:'Value',ev:'EV Value'}, checkedAt: '2026-10-14T12:02:00+01:00'};
    var api = global.AppointmentCompanionTariffsV242;
    try { return api && typeof api.state==='function' ? api.state() : {status:'amber',summary:{}}; }
    catch (_) { return {status:'amber',summary:{},error:'Tariff status could not be read'}; }
  }
  function tone(state) { return state==='green' || state==='verified' || state==='loaded' || state==='synced' ? 'good' : state==='red' || state==='failed' || state==='conflict' || state==='disconnected' ? 'bad' : 'warn'; }
  function stateLabel(kind, status) {
    if (kind==='tariff') return status==='green'?'Verified':status==='red'?'Attention needed':'Checking / cached';
    if (status==='verified') return 'Verified';
    if (status==='loaded') return 'Loaded';
    if (status==='checking') return 'Checking…';
    if (status==='saved') return 'Login saved';
    if (status==='local') return 'Local only';
    if (status==='cached') return 'Cached only';
    if (status==='disconnected') return 'Not connected';
    if (status==='failed') return 'Unavailable';
    if (status==='synced') return 'Synced';
    if (status==='conflict') return 'Conflict';
    return 'Needs checking';
  }
  function badge(kind, value) { return '<span class="ac-us-pill '+tone(value)+'">'+esc(stateLabel(kind,value))+'</span>'; }
  function section(title, status, content, id) {
    return '<section class="ac-us-section" aria-labelledby="'+id+'"><div class="ac-us-head"><h3 id="'+id+'">'+title+'</h3>'+status+'</div>'+content+'</section>';
  }
  function tariffSection() {
    var s=tariff(), x=s.summary||{}, rows = [
      ['Fixed',x.fixed,x.fixedCode],['Tracker',x.tracker,x.trackerCode],
      ['Variable',x.variable,x.variableCode],['EV',x.ev,x.evCode]
    ].map(function(item){return '<div class="ac-us-detail"><span>'+esc(item[0])+'</span><strong>'+esc(item[1]||'Checking…')+'</strong>'+(item[2]?'<small>'+esc(item[2])+'</small>':'')+'</div>';}).join('');
    return section('Tariff data',badge('tariff',s.status),'<div class="ac-us-rows">'+rows+'</div>'+
      '<p class="ac-us-note">Last live verification: '+esc(readable(s.checkedAt))+
      (s.error?' · '+esc(s.error):'')+'</p><button type="button" data-us-action="tariff">Refresh tariff data</button>','acUsTariff');
  }
  function appSection() {
    return section('App version & latest updates','<span class="ac-us-version">'+esc(meta.version)+'</span>',
      '<p class="ac-us-summary">'+esc(meta.summary)+'</p>'+
      '<p class="ac-us-note">Released '+esc(meta.date)+(demo?' · Preview demonstration':'')+'</p>'+
      '<ul class="ac-us-changes">'+meta.changes.map(function(change){return '<li>'+esc(change)+'</li>';}).join('')+'</ul>',
      'acUsApp');
  }
  function cloudSection() {
    var auth = demo ? {partner_id:'DEMO'} : ownAuth();
    var connection=demo?'verified':cloud.connection, profile=demo?'loaded':cloud.profile;
    var details = '<div class="ac-us-minirow"><span>Cloud connection</span>'+badge('cloud',connection)+'</div>'+
      '<p class="ac-us-note">'+esc(demo?'Example connected session':cloud.message || (auth?'Checking saved login against Cloud…':'Connect to Companion to sync across devices.'))+'</p>'+
      '<div class="ac-us-minirow"><span>Partner profile</span>'+badge('profile',profile)+'</div>'+
      '<p class="ac-us-note">'+esc(demo?'Example Partner - all details are fictitious':cloud.profileName ? cloud.profileName +(profile==='cached'?' (verified local copy only)':'') : 'No verified Cloud profile loaded')+'</p>';
    if (auth && !demo) details += '<p class="ac-us-note">Companion Partner ID: '+esc(auth.partner_id)+'</p>';
    if (cloud.error && !demo) details += '<p class="ac-us-error">'+esc(cloud.error)+'</p>';
    return section('Cloud & Partner identity','',details+
      (demo?'':'<button type="button" data-us-action="connect">Connect / reconnect Cloud</button>'),'acUsCloud');
  }
  function customerSection() {
    var status=demo?'synced':sync.mode;
    var customerCount = demo ? 3 : sync.count;
    var explanation = demo ? '3 example customer profiles · all changes synced' : sync.detail;
    var current = demo ? 'Example customer saved locally and synced' : sync.current;
    var local = demo ? 'Example device · local save current' : sync.local;
    return section('Customer profiles & this device',badge('customers',status),
      '<p class="ac-us-note">'+esc(explanation)+'</p>'+
      (customerCount == null?'':'<div class="ac-us-minirow"><span>Saved customer profiles on this device</span><strong>'+customerCount+'</strong></div>')+
      (current?'<p class="ac-us-note">'+esc(current)+'</p>':'')+
      (sync.conflicts && !demo?'<p class="ac-us-error">'+sync.conflicts+' sync conflict(s) need attention.</p>':'')+
      (sync.pending && !demo?'<p class="ac-us-note">'+sync.pending+' profile(s) waiting to sync.</p>':'')+
      '<div class="ac-us-minirow"><span>Local device save</span><span>'+esc(local)+'</span></div>'+
      (!demo && cloud.customerCount!==null?'<p class="ac-us-note">Customers available from Cloud: '+cloud.customerCount+'</p>':''),
      'acUsCustomers');
  }
  function css() {
    if ($('acUnifiedStatusCss')) return;
    var st=document.createElement('style'); st.id='acUnifiedStatusCss';
    st.textContent = [
      '#acV22StatusBlock{display:none!important}', // old five-row menu status block
      '#acUnifiedStatusTrigger{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:34px;min-width:49px;padding:3px 6px;border:1px solid #e4d6f4;border-radius:11px;background:#fff;color:#533587;font:700 10px/1 system-ui,sans-serif;cursor:pointer}',
      '#acUnifiedStatusTrigger .ac-us-light{width:9px;height:9px;border-radius:50%;background:#d98a00;box-shadow:0 0 0 2px #d98a0022}',
      '#acUnifiedStatusTrigger[data-tariff="green"] .ac-us-light{background:#1d9b50;box-shadow:0 0 0 2px #1d9b5022}',
      '#acUnifiedStatusTrigger[data-tariff="red"] .ac-us-light{background:#c43b3b;box-shadow:0 0 0 2px #c43b3b22}',
      '#acUnifiedStatusTrigger:focus-visible,.ac-us-card button:focus-visible{outline:3px solid #a88bd9;outline-offset:2px}',
      '#acUnifiedStatusModal{position:fixed;inset:0;z-index:17000;background:#201633a3;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}',
      '#acUnifiedStatusModal[hidden]{display:none!important}',
      '#acUnifiedStatusModal .ac-us-card{width:min(468px,100%);max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;border-radius:17px;background:white;color:#281b3d;padding:18px;box-sizing:border-box;box-shadow:0 18px 65px #180e3545;font:13px/1.45 system-ui,sans-serif}',
      '.ac-us-mainhead{display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:10px}',
      '.ac-us-mainhead h2{font-size:18px;line-height:1.2;margin:0;color:#3b235d}',
      '.ac-us-mainhead p{margin:3px 0 0;color:#756884;font-size:11px}',
      '.ac-us-close{font-size:20px;line-height:1!important;width:32px;padding:5px!important;flex:0 0 32px}',
      '.ac-us-section{border-top:1px solid #e9e4f0;padding:12px 0 10px}',
      '.ac-us-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}',
      '.ac-us-head h3{font-size:14px;line-height:1.2;margin:0;color:#321b51}',
      '.ac-us-version{font-weight:850;color:#67439b;font-size:12px}',
      '.ac-us-pill{font-size:10px;font-weight:800;padding:4px 8px;border-radius:99px;white-space:nowrap;background:#fff2dd;color:#8d5608}',
      '.ac-us-pill.good{background:#e3f6e9;color:#167642}',
      '.ac-us-pill.bad{background:#ffe9e9;color:#b02734}',
      '.ac-us-section .ac-us-note{font-size:11px;color:#756e7b;margin:5px 0;line-height:1.4}',
      '.ac-us-section .ac-us-error{font-size:11px;color:#b02734;margin:6px 0}',
      '.ac-us-summary{font-size:12px;margin:5px 0;font-weight:600}',
      '.ac-us-changes{padding-left:18px;margin:7px 0 0;font-size:11px;color:#52465f}',
      '.ac-us-changes li{margin:4px 0}',
      '.ac-us-rows{display:grid;gap:0}',
      '.ac-us-detail,.ac-us-minirow{display:flex;align-items:start;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #f0edf4;font-size:11px}',
      '.ac-us-detail span,.ac-us-minirow span:first-child{color:#64566f}',
      '.ac-us-detail strong{margin-left:auto;text-align:right;font-weight:750}',
      '.ac-us-detail small{color:#8a8292}',
      '.ac-us-section button,.ac-us-foot button{min-height:36px;border:1px solid #dbceed;border-radius:9px;background:#fff;color:#56347f;font-weight:800;padding:7px 11px;font-size:12px;cursor:pointer;margin-top:7px}',
      '.ac-us-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid #e9e4f0}',
      '.ac-us-foot .primary{background:#7645b9;color:white;border-color:#7645b9}',
      '#acUnifiedStatusMessage{font-size:11px;min-height:15px;color:#705887}',
      '#acUnifiedMenuLink{display:flex;align-items:center;gap:8px}',
      '.ac-us-demo{font-size:10px;color:#a63b49;font-weight:850;letter-spacing:.04em}'
    ].join('');
    document.head.appendChild(st);
  }
  function ensure() {
    css();
    var el=$(ID);if(el)return el;
    el=document.createElement('div');el.id=ID;el.hidden=true;
    el.innerHTML='<div class="ac-us-card" role="dialog" aria-modal="true" aria-labelledby="acUnifiedStatusHeading">'+
      '<div class="ac-us-mainhead"><div><h2 id="acUnifiedStatusHeading">App status & updates</h2><p>Everything in one place'+(demo?' · <span class="ac-us-demo">DEMO DATA</span>':'')+'</p></div>'+
      '<button type="button" class="ac-us-close" aria-label="Close status" data-us-action="close">×</button></div>'+
      '<div id="acUnifiedStatusContent"></div>'+
      '<div class="ac-us-foot"><span id="acUnifiedStatusMessage" role="status" aria-live="polite"></span>'+
      '<div><button type="button" data-us-action="refresh">Refresh status</button> '+
      '<button type="button" class="primary" data-us-action="close">Done</button></div></div></div>';
    el.addEventListener('click', function(e){
      if(e.target===el)return close();
      var action=e.target.closest('[data-us-action]');if(!action)return;
      var a=action.getAttribute('data-us-action');
      if(a==='close')close();
      else if(a==='refresh')refreshAll();
      else if(a==='tariff')refreshTariff();
      else if(a==='connect') {close(); var b=$('cloudSettingsConnect')||document.querySelector('[data-cloud-action="settings"]');if(b)b.click();}
    });
    document.body.appendChild(el);
    return el;
  }
  function paint() {
    if(trigger) {var t=tariff();trigger.dataset.tariff=t.status||'amber';trigger.title='App status & updates - tariff data '+stateLabel('tariff',t.status);trigger.setAttribute('aria-label',trigger.title);}
    var target=$('acUnifiedStatusContent');if(!target)return;
    target.innerHTML=appSection()+tariffSection()+cloudSection()+customerSection();
  }
  function showMessage(msg){var e=$('acUnifiedStatusMessage');if(e)e.textContent=msg||'';}
  function onEsc(e){if(e.key==='Escape')close();}
  function open() {
    previousFocus=document.activeElement;
    ensure().hidden=false;
    document.addEventListener('keydown',onEsc);
    paint();showMessage('');
    var closeBtn=document.querySelector('#'+ID+' [data-us-action="close"]');
    if(closeBtn)closeBtn.focus();
    refreshAll();
  }
  function close(){
    var m=$(ID);if(m)m.hidden=true;
    document.removeEventListener('keydown',onEsc);
    checkSeq++;
    if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
  }
  function refreshTariff(){
    if(demo){showMessage('Demo data - no live tariff request made.');return;}
    var api=global.AppointmentCompanionTariffsV242;
    if(!api||typeof api.refresh!=='function'){showMessage('Tariff refresh is currently unavailable.');return;}
    if(!confirm('Refreshing tariff data reloads Appointment Companion. Save any unsaved work before continuing. Refresh now?'))return;
    showMessage('Refreshing tariff data…');
    try {Promise.resolve(api.refresh()).then(function(){paint();showMessage('Tariff refresh finished.');},function(){paint();showMessage('Could not refresh tariff data.');});}
    catch(_){showMessage('Could not refresh tariff data.');}
  }
  function timeout(promise, ms) {
    return new Promise(function(resolve) {
      var finished=false,t=setTimeout(function(){if(!finished){finished=true;resolve({ok:false,error:'Timed out'});}},ms);
      Promise.resolve(promise).then(function(data){if(!finished){finished=true;clearTimeout(t);resolve({ok:true,data:data});}},
        function(e){if(!finished){finished=true;clearTimeout(t);resolve({ok:false,error:String(e&&e.message||e)});}});
    });
  }
  async function refreshCustomerSync(sequence) {
    if(demo){sync={mode:'synced',detail:'Three example customers synchronised',count:3,pending:0,conflicts:0,current:'Example customer synced',local:'Saved locally'};paint();return;}
    var engine=global.AppointmentCompanionConsolidated;
    var localHealth=$('cloudLocalState');
    sync.local=localHealth ? (localHealth.classList.contains('warn')?'Saving latest changes…':'Local save indicator healthy') : 'Local save status unavailable';
    if(!engine||typeof engine.list!=='function'){sync.mode='checking';sync.detail='Customer store unavailable';paint();return;}
    try{
      var rows=await engine.list();
      if(sequence!==checkSeq || !$(ID) || $(ID).hidden)return;
      rows=Array.isArray(rows)?rows:[];
      var meaningful=rows.filter(function(r){return r&&(String(r.customer_name||'').trim()||r.deleted||r.tombstone);});
      var pending=meaningful.filter(function(r){return r.sync_state==='pending'||r.sync_state==='pending_delete';});
      var conflicts=meaningful.filter(function(r){return r.sync_state==='conflict'||r.conflict;});
      var current=typeof engine.currentRecord==='function'?engine.currentRecord():null;
      var currentMessage='';
      if(current&&String(current.customer_name||'').trim()){
        if(current.sync_state==='conflict'||current.conflict)currentMessage='Current customer: sync conflict';
        else if(current.sync_state==='pending')currentMessage='Current customer: awaiting Cloud sync';
        else if(current.cloud_id&&current.sync_state==='synced'&&Number(current.cloud_synced_local_revision)===Number(current.local_revision))currentMessage='Current customer: synced to Cloud';
        else if(!current.cloud_id&&!current.cloud_creation_approved)currentMessage='Current customer: local draft (not sent to Cloud)';
        else currentMessage='Current customer: Cloud sync status not confirmed';
      }
      var currentIsSynced=!!(current&&current.cloud_id&&current.sync_state==='synced'&&Number(current.cloud_synced_local_revision)===Number(current.local_revision));
      sync={mode:conflicts.length?'conflict':pending.length?'checking':currentIsSynced?'synced':'local',
        detail:conflicts.length?'Some customers have Cloud sync conflicts':pending.length?'Some customers are waiting to sync':'Local customer store checked. Individual drafts may remain local.',
        count:meaningful.filter(function(r){return !r.deleted && !r.tombstone && String(r.customer_name||'').trim();}).length,pending:pending.length,conflicts:conflicts.length,current:currentMessage,local:sync.local};
    }catch(e){sync.mode='failed';sync.detail='Could not read saved customer profiles';}
    if(sequence===checkSeq&&$(ID)&&!$(ID).hidden)paint();
  }
  async function refreshCloud(sequence) {
    if(demo){cloud={connection:'verified',profile:'loaded',message:'Example login verified',profileName:'Demo Partner',customerCount:3,error:''};paint();return;}
    var auth=ownAuth();
    if(!auth){cloud={connection:'disconnected',profile:'failed',message:'Not signed in to Companion Cloud',profileName:'',customerCount:null,error:''};paint();return;}
    var cached=localPartner(auth);
    cloud={connection:'checking',profile:'checking',message:'Checking Cloud with your saved Companion login…',profileName:cached?cached.name:'',customerCount:null,error:''};
    paint();
    if(global.__AC_LOCAL_ONLY){
      cloud.connection='saved';cloud.profile=cached?'cached':'failed';
      cloud.message='Local-only mode: Cloud verification paused on this device.';
      paint();return;
    }
    var api=global.AppointmentCompanionCloud;
    if(!api||typeof api.listCustomers!=='function'||typeof api.getPartnerProfile!=='function'){
      cloud.connection='failed';cloud.profile=cached?'cached':'failed';cloud.message='Cloud services are unavailable.';paint();return;
    }
    var checks=await Promise.all([
      timeout(api.listCustomers(auth),6500),
      timeout(api.getPartnerProfile(auth),6500)
    ]);
    if(sequence!==checkSeq||!$(ID)||$(ID).hidden)return;
    var clients=checks[0],p=checks[1];
    cloud.connection=clients.ok?'verified':'failed';
    cloud.message=clients.ok?'Companion login verified with Cloud.':'Cloud login could not be verified just now.';
    cloud.customerCount=clients.ok&&Array.isArray(clients.data.customers)?clients.data.customers.length:null;
    var candidate=p.ok&&p.data?p.data.partner:null;
    // The authenticated getPartnerProfile endpoint can return legacy records
    // without a partner_id. Accept those only if no conflicting ID is present.
    var returnedId=String(candidate&&(candidate.partner_id||candidate.companion_login_id)||'').trim().toLowerCase();
    var verified=candidate&&String(candidate.name||'').trim()&&(!returnedId||returnedId===String(auth.partner_id).trim().toLowerCase())?candidate:null;
    cloud.profile=verified?'loaded':cached?'cached':'failed';
    cloud.profileName=verified?verified.name:cached?cached.name:'';
    cloud.error=(!clients.ok||!p.ok)?('Cloud checks: '+(!clients.ok?'connection '+(clients.error||'unavailable')+'; ':'')+(!p.ok?'profile '+(p.error||'unavailable'):'')).slice(0,220):'';
    paint();
  }
  function refreshAll(){
    if(!$(ID)||$(ID).hidden)return;
    var seq=++checkSeq;
    cloud.connection='checking';cloud.profile='checking';sync.mode='checking';
    paint();showMessage(demo?'Preview uses fictional status values.':'Checking status…');
    Promise.all([refreshCloud(seq),refreshCustomerSync(seq)]).then(function(){
      if(seq===checkSeq&&$(ID)&&!$(ID).hidden){paint();showMessage(demo?'Demonstration only.':'Status checked.');}
    });
  }
  function install(){
    var version=document.querySelector('.ac-version-mini'),rag=$('acTariffHealth242');
    if(!version)return false;
    var stack=version.closest('.ac-version-stack');
    if(!stack){stack=document.createElement('span');stack.className='ac-version-stack';version.parentNode.insertBefore(stack,version);stack.appendChild(version);}
    if($('acUnifiedStatusTrigger'))return true;
    css();
    version.style.display='none';if(rag)rag.style.display='none';
    trigger=document.createElement('button');trigger.id='acUnifiedStatusTrigger';trigger.type='button';
    trigger.innerHTML='<span>'+esc(meta.version)+'</span><span class="ac-us-light" aria-hidden="true"></span>';
    stack.insertBefore(trigger,version);
    trigger.addEventListener('click',open);
    paint();
    if(!demo){
      var menu=$('cloudMenuPopover');
      if(menu&&!$('acUnifiedMenuLink')){
        var b=document.createElement('button');b.className='pill cloud-menu-item';b.type='button';b.id='acUnifiedMenuLink';
        b.innerHTML='<span class="menu-ico">🔎</span><span>App status & updates</span>';
        b.addEventListener('click',function(){menu.classList.remove('open');open();});
        var settings=menu.querySelector('[data-cloud-action="settings"]');
        if(settings)menu.insertBefore(b,settings);else menu.appendChild(b);
      }
    }
    ['checking','changed','error','verified'].forEach(function(name){global.addEventListener('ac:tariffs:'+name,function(){if(trigger){var t=tariff();trigger.dataset.tariff=t.status||'amber';}if($(ID)&&!$(ID).hidden)paint();});});
    ['ac:cloud-authenticated','ac:cloud-disconnected','ac:cloud-sync-state-changed','ac:partner-profile-ready'].forEach(function(name){global.addEventListener(name,function(){if($(ID)&&!$(ID).hidden)refreshAll();});});
    return true;
  }
  var tries=0,work=setInterval(function(){if(install()||++tries>240)clearInterval(work);},50);
  global.AppointmentCompanionUnifiedStatus={open:open,refresh:refreshAll,version:meta.version};
})(window);
