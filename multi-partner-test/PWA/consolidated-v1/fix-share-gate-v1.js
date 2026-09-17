/* Partner-facing basket gate for personalised Should I Fix shares. */
(function (global) {
  'use strict';
  var params = new URL(location.href).searchParams;
  if (params.get('public') === '1') return;
  var bridge = global.AppointmentCompanionBridge;

  function safeHttps(value) {
    try { var u = new URL(String(value || '').trim()); return u.protocol === 'https:' ? u.href : ''; }
    catch (_) { return ''; }
  }
  function creatorPartnerId() { try { var a = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null'); if (a && a.partner_id) return String(a.partner_id).trim(); } catch (_) {} try { var p = JSON.parse(localStorage.getItem('apptCompanionPartner') || 'null'); if (p && p.partner_id) return String(p.partner_id).trim(); } catch (_) {} return ''; }
  function envelope() { try { return bridge && bridge.receive ? bridge.receive() : null; } catch (_) { return null; } }
  function savedBasket() {
    var e = envelope(), c = e && e.extra && e.extra.customer;
    return safeHttps((e && e.basket_url) || (c && c.basket_url) || '');
  }
  function cleanName(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80); }
  function num(el) { var n = el && el.value !== '' ? Number(el.value) : NaN; return Number.isFinite(n) ? n : 0; }

  function scenario(doc, win) {
    var fuel = doc.querySelector('#fuelSeg button[aria-pressed="true"]');
    var tariff = doc.querySelector('#fixedCard button[data-tariff][aria-pressed="true"]');
    var out = {
      r: doc.getElementById('region') ? doc.getElementById('region').value : '11',
      f: fuel ? fuel.dataset.mode : 'dual',
      e: num(doc.getElementById('elec')),
      g: num(doc.getElementById('gas')),
      eh: doc.getElementById('electricHeat') && doc.getElementById('electricHeat').checked ? '1' : '0',
      t: tariff ? tariff.dataset.tariff : 'saver',
      sp: Number(win.__sifStressPct) || 0
    };
    if (out.t === 'custom') {
      out.o = '1';
      out.es = num(doc.getElementById('mESC'));
      out.eu = num(doc.getElementById('mEU'));
      out.gs = num(doc.getElementById('mGSC'));
      out.gu = num(doc.getElementById('mGU'));
    }
    return out;
  }

  function basePublicUrl() {
    var u = new URL(location.origin + location.pathname);
    u.searchParams.set('public', '1');
    var pid = creatorPartnerId(); if (pid) u.searchParams.set('pid', pid);
    return u;
  }

  function buildUrl(doc, win, basketUrl) {
    var u = basePublicUrl();
    var s = scenario(doc, win);
    Object.keys(s).forEach(function (key) {
      if ((key === 'e' && s.f === 'gas') || (key === 'g' && s.f === 'elec') || (key === 'eh' && s.eh === '0') || (key === 't' && s.t === 'saver')) return;
      u.searchParams.set(key, String(s[key]));
    });
    var name = cleanName((doc.getElementById('sifCustomerName') || {}).value);
    if (name) u.searchParams.set('n', name);
    var b = safeHttps(basketUrl);
    if (b) u.searchParams.set('b', b);
    return u.href;
  }

  function toast(doc, message) {
    var el = doc.getElementById('sifInjectedToast');
    if (!el) { el = doc.createElement('div'); el.id = 'sifInjectedToast'; doc.body.appendChild(el); }
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try { var t = document.createElement('textarea'); t.value = text; t.readOnly = true; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = document.execCommand('copy'); t.remove(); ok ? resolve() : reject(new Error('copy failed')); }
      catch (e) { reject(e); }
    });
  }
  async function nativeShare(doc, title, text, url, done) {
    if (navigator.share) {
      try { await navigator.share({ title: title, text: text, url: url }); toast(doc, done); return; }
      catch (error) { if (error && error.name === 'AbortError') return; }
    }
    try { await copyText(url); toast(doc, done.replace('shared', 'copied')); }
    catch (_) { global.prompt('Copy this link:', url); }
  }
  async function shareResult(doc, win, basketUrl) {
    var name = cleanName((doc.getElementById('sifCustomerName') || {}).value);
    var url = buildUrl(doc, win, basketUrl);
    var text = name ? 'Hi ' + name + ' - here is the energy comparison we looked at.' : 'Here is the energy comparison we looked at.';
    await nativeShare(doc, 'Your Should I Fix? comparison', text, url, 'Personalised result shared');
  }
  async function shareTool(doc) {
    await nativeShare(doc, 'Should I Fix?', 'A simple way to explore whether fixing your energy could make sense.', basePublicUrl().href, 'Public tool shared');
  }

  function ensureGateStyle() {
    if (document.getElementById('acFixShareGateStyle')) return;
    var st = document.createElement('style'); st.id = 'acFixShareGateStyle';
    st.textContent = '.ac-share-gate{position:fixed;inset:0;z-index:20000;background:rgba(38,22,79,.48);display:flex;align-items:center;justify-content:center;padding:16px}.ac-share-gate-card{width:min(430px,100%);background:#fff;color:#26164f;border-radius:17px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.ac-share-gate-card h3{margin:0 0 5px;font-size:18px}.ac-share-gate-card p{margin:.3rem 0 .8rem;color:#6b6b76;font-size:12px;line-height:1.45}.ac-share-gate-card label{display:block;font-size:11px;font-weight:800;margin-bottom:5px}.ac-share-gate-card input{width:100%;box-sizing:border-box;border:1.5px solid #e4dfec;border-radius:10px;padding:10px 11px;font:650 12px system-ui;color:#26164f}.ac-share-gate-card .hint{font-size:10px;color:#81788d;margin-top:5px}.ac-share-gate-actions{display:grid;gap:7px;margin-top:13px}.ac-share-gate-actions button{min-height:42px;border:1px solid rgba(122,66,200,.2);border-radius:10px;background:#fff;color:#26164f;font:800 13px system-ui;cursor:pointer}.ac-share-gate-actions button.primary{background:#7a42c8;color:#fff;border-color:#7a42c8}.ac-share-gate-error{min-height:16px;margin-top:5px;color:#a33232;font-size:10px;font-weight:700}';
    document.head.appendChild(st);
  }

  function chooseBasket() {
    ensureGateStyle();
    return new Promise(function (resolve) {
      var overlay = document.createElement('div'); overlay.className = 'ac-share-gate';
      var existing = savedBasket();
      overlay.innerHTML = '<div class="ac-share-gate-card" role="dialog" aria-modal="true"><h3>📤 Share personalised result</h3><p>If this comparison is part of a wider UW quote, including the basket link removes a step for the customer.</p><label for="acFixBasketGate">UW basket / quote link <span style="font-weight:600">(optional)</span></label><input id="acFixBasketGate" type="url" inputmode="url" value="' + existing.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" placeholder="https://..."><div class="hint">The saved basket is filled in automatically when one is available.</div><div class="ac-share-gate-error" id="acFixGateError"></div><div class="ac-share-gate-actions"><button type="button" class="primary" data-choice="include">Include basket and share</button><button type="button" data-choice="plain">Share without basket</button><button type="button" data-choice="cancel">Cancel</button></div></div>';
      function done(value) { overlay.remove(); resolve(value); }
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) return done({ cancelled: true, basket: '' });
        var choice = e.target && e.target.dataset && e.target.dataset.choice; if (!choice) return;
        if (choice === 'cancel') return done({ cancelled: true, basket: '' });
        if (choice === 'plain') return done({ cancelled: false, basket: '' });
        var raw = overlay.querySelector('#acFixBasketGate').value.trim();
        var safe = safeHttps(raw);
        if (!safe) { overlay.querySelector('#acFixGateError').textContent = raw ? 'Please use a valid https:// basket link.' : 'Add a basket link, or choose Share without basket.'; return; }
        done({ cancelled: false, basket: safe });
      });
      document.body.appendChild(overlay);
      setTimeout(function () { var input = overlay.querySelector('#acFixBasketGate'); if (input && !input.value) input.focus(); }, 0);
    });
  }

  function wire() {
    var frame = document.getElementById('fixFrame');
    if (!frame || !frame.contentDocument) return false;
    var doc = frame.contentDocument, win = frame.contentWindow;
    var old = doc.getElementById('sifShareResult');
    if (!old) return false;
    if (old.dataset.acBasketGate !== '1') {
      var fresh = old.cloneNode(true); fresh.dataset.acBasketGate = '1'; old.parentNode.replaceChild(fresh, old);
      fresh.addEventListener('click', async function () {
        var choice = await chooseBasket();
        if (!choice || choice.cancelled) return;
        await shareResult(doc, win, choice.basket);
      });
    }
    var toolOld = doc.getElementById('sifShareTool');
    if (toolOld && toolOld.dataset.acPartnerShare !== '1') {
      var toolFresh = toolOld.cloneNode(true); toolFresh.dataset.acPartnerShare = '1'; toolOld.parentNode.replaceChild(toolFresh, toolOld);
      toolFresh.addEventListener('click', function () { shareTool(doc); });
    }
    return true;
  }

  var frame = document.getElementById('fixFrame');
  if (frame) frame.addEventListener('load', function () { setTimeout(wire, 150); });
  var tries = 0, timer = setInterval(function () { if (wire() || ++tries > 180) clearInterval(timer); }, 100);
})(window);
