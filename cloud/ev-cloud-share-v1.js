/* EV Companion Cloud share adapter v1
   Adds a Cloud-backed Share action to the EV Cloud pilot without modifying v16C.
*/
(function (global) {
  'use strict';

  const shareApi = global.AppointmentCompanionSpecialistShare;
  if (!shareApi) return;

  const $ = function (id) { return document.getElementById(id); };
  let sharing = false;

  function num(id) {
    const el = $(id);
    if (!el || el.value === '') return null;
    const n = Number(el.value);
    return Number.isFinite(n) ? n : null;
  }

  function active(selector) {
    return document.querySelector(selector + '.on');
  }

  function captureState() {
    const vehicle = active('#vehiclePills .vpill');
    const service = active('#serviceButtons button');
    const period = active('#periodToggle button');
    const stress = active('#stressButtons button');
    const e7Actual = $('e7ActualWrap') ? !$('e7ActualWrap').hidden : false;

    return {
      schema_version: 1,
      tool_version: '16C',
      vehicle_efficiency_mi_kwh: vehicle ? Number(vehicle.dataset.eff) : 3.2,
      vehicle_icon: vehicle ? String(vehicle.dataset.icon || '') : '🚙',
      annual_mileage: num('miles'),
      home_usage_kwh: num('houseKwh'),
      uw_services: service ? Number(service.dataset.tier) + 1 : 3,
      region: num('region'),
      ev_offpeak_pct: num('evTimingSlider'),
      e7_offpeak_pct: num('e7TimingSlider'),
      e7_actual: e7Actual,
      e7_day_kwh: e7Actual ? num('e7DayActualInput') : null,
      e7_night_kwh: e7Actual ? num('e7NightActualInput') : null,
      away_pct: num('awayPct'),
      away_rate_p_kwh: num('awayRate'),
      efficiency_override_mi_kwh: num('effOverride'),
      known_ev_kwh: num('knownEvKwh'),
      dual_fuel: $('dualFuel') ? !!$('dualFuel').checked : true,
      period: period ? period.dataset.period : 'month',
      stress_pct: stress ? Number(stress.dataset.stress || 0) : 0,
      shared_at: new Date().toISOString()
    };
  }

  function showToast(msg) {
    const el = $('shareToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function showLinkDialog(url) {
    const text = 'Your short Cloud share link is ready:';
    if (global.prompt) global.prompt(text, url);
  }

  function shareUrl(token) {
    return new URL('./companion/ev/?s=' + encodeURIComponent(token), global.location.href).href;
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('Copy failed.');
  }

  async function createShare() {
    if (sharing) return;
    sharing = true;
    const btn = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('evCloudShare')
      ? document.activeElement
      : document.querySelector('.evCloudShare');
    const original = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating...';
    }

    try {
      const customer = await shareApi.getCurrentCustomer();
      const snapshot = {
        schema_version: 1,
        view_type: 'ev',
        customer_name: customer.customer_name || '',
        electricity_usage_kwh: customer.electricity_usage_kwh,
        electricity_usage_revision: customer.electricity_usage_revision || 0,
        ev_state: captureState()
      };

      const share = await shareApi.create('ev', snapshot);
      const url = shareUrl(share.token);
      const name = customer.customer_name || 'there';

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'UW EV Tariff Companion',
            text: 'Hi ' + name + ', this EV comparison has been set up for you.',
            url: url
          });
          showToast('Cloud share ready');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') {
            showToast('Share created');
            showLinkDialog(url);
            return;
          }
        }
      }

      try {
        await copyText(url);
        showToast('Short Cloud share link copied');
      } catch (_) {
        showToast('Short Cloud share link ready');
        showLinkDialog(url);
      }
    } catch (err) {
      showToast('Share failed - ' + ((err && err.message) || String(err)));
    } finally {
      sharing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original || '<span class="menu-ico">📤</span><span>Share customer link</span>';
      }
    }
  }

  function mount() {
    const bars = Array.from(document.querySelectorAll('.evBridgeMenu'));
    if (!bars.length) return false;
    let mounted = false;

    bars.forEach(function (actions, index) {
      if (actions.querySelector('.evCloudShare')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'evCloudShare';
      if (index === 0) btn.id = 'evCloudShare';
      btn.innerHTML = '<span class="menu-ico">📤</span><span>Share customer link</span>';
      btn.title = 'Create a short Cloud-backed customer share link';
      btn.setAttribute('aria-label', 'Create customer share link');
      btn.addEventListener('click', createShare);
      actions.appendChild(btn);
      mounted = true;
    });

    return mounted;
  }

  if (mount()) return;
  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (mount() || attempts > 120) clearInterval(timer);
  }, 100);
})(window);
