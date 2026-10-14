/* Appointment Companion v2.60.3 - self-service Partner settings UX.
   Existing Cloud/save hooks are retained. Photo bytes are uploaded only via
   the authenticated current-Partner endpoint, never the Admin endpoint.
*/
(function(global){
  'use strict';
  if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
  var api=global.AppointmentCompanionCloud, uploading=false;
  function $(id){return document.getElementById(id);}
  function auth(){
    try{
      var a=JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession')||'null');
      if(!(a&&a.partner_id&&a.workspace_key))a=JSON.parse(localStorage.getItem('apptCloudPilotAuthDeviceV1')||'null');
      return a&&a.partner_id&&a.workspace_key?a:null;
    }catch(_){return null;}
  }
  function clean(v){return String(v||'').trim();}
  function slug(v) {
    var s=clean(v);
    var m=s.match(/^([^@\s]+)@uw\.partners$/i);
    if(m)s=m[1];
    var link=s.match(/^https:\/\/(?:www\.)?uw\.partners\/([a-z0-9][a-z0-9._-]*)\/(?:partner\/)?join\/?$/i);
    if(link)s=link[1];
    return /^[a-z0-9][a-z0-9._-]*$/i.test(s)?s.toLowerCase():'';
  }
  function https(v) {
    v=clean(v);
    if(!v)return '';
    try{
      var url=new URL(/^https?:\/\//i.test(v)?v:'https://'+v);
      return url.protocol==='https:'&&url.hostname.includes('.')&&!url.username&&!url.password?url.href:'';
    }catch(_){return '';}
  }
  function error(t) {
    var el=$('ppErr');if(!el)return;
    el.textContent=t;el.classList.remove('hidden');el.setAttribute('role','alert');
    el.scrollIntoView({block:'nearest'});
  }
  function setStatus(t,bad) {
    var el=$('ppPhotoStatus');if(el){el.textContent=t;el.style.color=bad?'#b02734':'#665778';}
  }
  function resize(file){
    return new Promise(function(resolve,reject){
      if(!file)return reject(new Error('Select a photo.'));
      if(file.size>12*1024*1024)return reject(new Error('Please choose a photo under 12 MB.'));
      if(file.type&&!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type))return reject(new Error('JPEG, PNG or WebP photos only.'));
      var reader=new FileReader();
      reader.onerror=function(){reject(new Error('Could not read this photo.'));};
      reader.onload=function(){
        var img=new Image();
        img.onerror=function(){reject(new Error('Could not open this image.'));};
        img.onload=function(){
          var w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,side=Math.min(w,h);
          if(!side)return reject(new Error('Invalid photo dimensions.'));
          var canvas=document.createElement('canvas'),out=Math.min(800,Math.max(320,side));
          canvas.width=out;canvas.height=out;
          var ctx=canvas.getContext('2d');
          if(!ctx)return reject(new Error('Photo processing is unavailable.'));
          ctx.drawImage(img,Math.max(0,(w-side)/2),Math.max(0,(h-side)/2),side,side,0,0,out,out);
          resolve(canvas.toDataURL('image/jpeg',.86));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function upload(file){
    if(uploading)return;
    var a=auth();
    if(!a){setStatus('Sign in to Companion Cloud to upload your photo.',true);return;}
    if(!api||typeof api.uploadPartnerPhoto!=='function'){
      setStatus('The photo upload service needs updating first. You can still use a photo URL.',true);return;
    }
    var btn=$('ppChoosePhoto');uploading=true;if(btn)btn.disabled=true;
    setStatus('Cropping the photo to a square…');
    try{
      var dataUrl=await resize(file);
      setStatus('Uploading your photo to Google Drive…');
      var result=await api.uploadPartnerPhoto(a,{data_url:dataUrl});
      if(!result||!result.photo||!https(result.photo.photo_url))throw new Error('Cloud returned no valid photo URL.');
      var input=$('ppPhoto');if(input)input.value=result.photo.photo_url;
      input&&input.dispatchEvent(new Event('input',{bubbles:true}));
      setStatus('✓ Photo uploaded. Tap Save to use it on your shared cards.');
    }catch(e){setStatus('Photo upload failed: '+((e&&e.message)||String(e)),true);}
    finally{uploading=false;if(btn)btn.disabled=false;}
  }
  function addHelp(input,description,example){
    if(!input)return;
    input.type='text';input.placeholder=example;
    var field=input.closest('.field');
    if(field&&!field.querySelector('.ac-pp-tip')){
      var tip=document.createElement('p');
      tip.className='sub ac-pp-tip';tip.textContent=description;
      tip.style.margin='4px 0 6px';
      input.parentNode.insertBefore(tip,input);
    }
  }
  function install(){
    var prompt=$('partnerPrompt'), photo=$('ppPhoto'), booking=$('ppBooking'), website=$('ppWebsite'), save=$('ppSaveBtn');
    if(!prompt||!photo||!booking||!website||!save)return false;
    if($('ppChoosePhoto'))return true;
    var style=document.createElement('style');style.id='acPartnerSettingsEnhancements';
    style.textContent='#partnerPrompt #ppPhotoPreview img{width:66px!important;height:66px!important;object-fit:cover!important;border-radius:50%!important}'+
      '#partnerPrompt #ppChoosePhoto{min-height:40px;padding:8px 12px;border:1px solid #ad8bd7;border-radius:10px;background:#fff;color:#56347f;font-weight:750}'+
      '#partnerPrompt .ac-photo-uploader{display:flex;align-items:center;gap:12px;flex-wrap:wrap}'+
      '#partnerPrompt .ac-pp-tip{font-size:11px}';
    document.head.appendChild(style);
    addHelp(booking,'For example Calendly, TidyCal, Google appointment schedules or Microsoft Bookings.','calendly.com/yourname');
    addHelp(website,'For example aqcroft.com - https:// is optional.','aqcroft.com');
    var url=photo.closest('.field');
    var heading=url&&url.querySelector('label');
    if(heading)heading.textContent='Profile photo';
    var host=document.createElement('div');host.className='ac-photo-uploader';
    var preview=$('ppPhotoPreview');
    if(preview)host.appendChild(preview);
    var choose=document.createElement('button');choose.id='ppChoosePhoto';choose.type='button';choose.textContent='📸 Choose / replace photo';
    var file=document.createElement('input');file.id='ppPhotoFile';file.type='file';
    file.accept='image/jpeg,image/png,image/webp';file.hidden=true;
    host.appendChild(choose);host.appendChild(file);
    if(url)url.insertBefore(host,photo);
    var status=document.createElement('p');status.id='ppPhotoStatus';status.className='sub';
    status.setAttribute('role','status');
    status.textContent='Auto-centre-cropped to a square, resized and uploaded to your Partner profile.';
    host.insertAdjacentElement('afterend',status);
    var details=document.createElement('details');var summary=document.createElement('summary');
    summary.textContent='Or use an existing photo URL';details.appendChild(summary);
    if(photo.parentNode)photo.parentNode.insertBefore(details,photo);
    details.appendChild(photo);
    choose.addEventListener('click',function(){if(!uploading)file.click();});
    file.addEventListener('change',function(){if(file.files&&file.files[0])upload(file.files[0]);file.value='';});
    var login=$('ppPartnerId');
    if(login&&login.closest('.field')){
      var request=document.createElement('button');request.type='button';request.id='ppRequestPassword';
      request.className='pill';request.style.cssText='margin-top:6px;min-height:38px';
      request.textContent='🔑 Request Companion password reset';
      request.addEventListener('click',function(){
        var a=auth(),id=a&&a.partner_id||'my account';
        var msg='Hi, could you please arrange an Appointment Companion password reset for login '+id+'? Thank you.';
        global.open('https://wa.me/447787400800?text='+encodeURIComponent(msg),'_blank','noopener');
      });
      login.closest('.field').appendChild(request);
      var note=document.createElement('p');note.className='sub';note.textContent='Reset requests go to the Companion administrator. This is not your UW password.';
      login.closest('.field').appendChild(note);
    }
    save.addEventListener('click',function(e){
      if(uploading){e.preventDefault();e.stopImmediatePropagation();error('Please wait for the photo upload to finish.');return;}
      if(!slug($('ppJoin')&&$('ppJoin').value)){e.preventDefault();e.stopImmediatePropagation();error('Enter your real UW Partner slug (usually first.last), not an email address.');return;}
      for(var id of ['ppBooking','ppWebsite']){
        var el=$(id);
        if(el&&clean(el.value)){
          var canonical=https(el.value);
          if(!canonical){
            e.preventDefault();e.stopImmediatePropagation();
            error(id==='ppBooking'?'Please check the booking link.':'Please check the website address.');
            return;
          }
          el.value=canonical;
        }
      }
    },true);
    return true;
  }
  var attempts=0,timer=setInterval(function(){if(install()||++attempts>240)clearInterval(timer);},50);
})(window);
