/* Appointment Companion v2.42 - Partner tariff notification preferences. */
(function(global){
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var SESSION_KEY='apptCloudPilotAuthSession';
  var DEVICE_KEY='apptCloudPilotAuthDeviceV1';

  function auth(){
    try {
      var a=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
      if(!(a&&a.partner_id&&a.workspace_key)) a=JSON.parse(localStorage.getItem(DEVICE_KEY)||'null');
      return a&&a.partner_id&&a.workspace_key?a:null;
    } catch(_){return null;}
  }
  function api(){return global.AppointmentCompanionCloud;}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function permission(){return 'Notification' in global ? Notification.permission : 'unsupported';}

  function styles(){
    if(document.getElementById('acNotifyPrefsStyle'))return;
    var st=document.createElement('style');st.id='acNotifyPrefsStyle';
    st.textContent='.ac-notify-modal{display:none;position:fixed;inset:0;z-index:16200;background:rgba(38,22,79,.48);padding:16px;align-items:center;justify-content:center}.ac-notify-modal.open{display:flex}.ac-notify-card{width:min(440px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#26164f;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28)}.ac-notify-card h3{margin:0 0 5px}.ac-notify-card p{font-size:12px;line-height:1.45;color:#6b6b76}.ac-notify-field{display:grid;gap:5px;margin:10px 0}.ac-notify-field input[type="email"]{min-height:42px}.ac-notify-check{display:flex;gap:8px;align-items:flex-start;margin:10px 0;font-size:12px}.ac-notify-actions{display:grid;gap:7px;margin-top:12px}.ac-notify-actions button{min-height:42px;border-radius:10px;border:1px solid rgba(122,66,200,.18);background:#fff;color:#26164f;font-weight:800}.ac-notify-actions .primary{background:#7a42c8;color:#fff;border-color:#7a42c8}.ac-notify-permission{font-size:11px;font-weight:800}';
    document.head.appendChild(st);
  }
  function ensureModal(){
    var m=document.getElementById('acNotifyPrefsModal');if(m)return m;
    m=document.createElement('div');m.id='acNotifyPrefsModal';m.className='ac-notify-modal';
    m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-notify-close]'))m.classList.remove('open');});
    document.body.appendChild(m);return m;
  }
  async function openPrefs(){
    var credentials=auth(), cloud=api();
    if(!credentials||!cloud||typeof cloud.getNotificationPreferences!=='function'){
      alert('Connect Companion Cloud first, then try again.');return;
    }
    var m=ensureModal();
    m.innerHTML='<div class="ac-notify-card"><h3>🔔 Tariff notifications</h3><p>Choose how tariff-change alerts should reach you. Push delivery is being prepared; this screen already records your device permission so it is ready when delivery is switched on.</p><p>Loading preferences…</p></div>';
    m.classList.add('open');
    try{
      var res=await cloud.getNotificationPreferences(credentials), p=res.preferences||{};
      m.innerHTML='<div class="ac-notify-card"><h3>🔔 Tariff notifications</h3><p>These preferences are stored against your Partner profile.</p>'+
        '<label class="ac-notify-field"><span>Email for tariff alerts</span><input id="acNotifyEmail" type="email" value="'+esc(p.notification_email||'')+'"></label>'+
        '<label class="ac-notify-check"><input id="acNotifyEmailOpt" type="checkbox" '+(p.tariff_email_opt_in?'checked':'')+'><span>Email me when verified tariff changes are published</span></label>'+
        '<label class="ac-notify-check"><input id="acNotifyPushOpt" type="checkbox" '+(p.tariff_push_opt_in?'checked':'')+'><span>Prepare this device for push tariff alerts</span></label>'+
        '<p>Browser/PWA permission: <span class="ac-notify-permission" id="acNotifyPermission">'+esc(permission())+'</span></p>'+
        '<div class="ac-notify-actions"><button type="button" id="acNotifyAsk">Allow device notifications</button><button type="button" class="primary" id="acNotifySave">Save notification preferences</button><button type="button" data-notify-close>Close</button></div></div>';
      m.querySelector('#acNotifyAsk').addEventListener('click',async function(){
        if(!('Notification' in global)){m.querySelector('#acNotifyPermission').textContent='unsupported';return;}
        try{await Notification.requestPermission();}catch(_){}
        m.querySelector('#acNotifyPermission').textContent=permission();
      });
      m.querySelector('#acNotifySave').addEventListener('click',async function(){
        this.disabled=true;
        try{
          await cloud.setNotificationPreferences(credentials,{
            notification_email:m.querySelector('#acNotifyEmail').value,
            tariff_email_opt_in:m.querySelector('#acNotifyEmailOpt').checked,
            tariff_push_opt_in:m.querySelector('#acNotifyPushOpt').checked,
            notification_permission:permission()
          });
          this.textContent='✅ Saved';
          setTimeout(function(){m.classList.remove('open');},500);
        }catch(err){alert((err&&err.message)||String(err));this.disabled=false;}
      });
    }catch(err){
      m.innerHTML='<div class="ac-notify-card"><h3>🔔 Tariff notifications</h3><p>'+esc((err&&err.message)||String(err))+'</p><div class="ac-notify-actions"><button data-notify-close>Close</button></div></div>';
    }
  }
  function install(){
    var pane=document.querySelector('#cloudSettingsModal [data-settings-pane="hub"] .cloud-settings-list');
    if(!pane)return false;
    if(document.getElementById('acNotifyPrefsButton'))return true;
    var b=document.createElement('button');b.type='button';b.id='acNotifyPrefsButton';b.className='pill cloud-menu-item';
    b.innerHTML='<span class="menu-ico">🔔</span><span>Tariff notifications</span>';
    b.addEventListener('click',function(){var s=document.getElementById('cloudSettingsModal');if(s)s.classList.remove('open');openPrefs();});
    pane.appendChild(b);return true;
  }
  styles();
  var tries=0,t=setInterval(function(){if(install()||++tries>240)clearInterval(t);},50);
})(window);
