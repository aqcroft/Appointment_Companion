/* ============================================================================
   Tariff status panel - shared across every tool. Fixed filename on purpose
   (never versioned), so all tools reference one file and update together.

   EV-inspired compact checker:
   - Fixed series button
   - Seasonal variable/EV freshness button
   - Expandable detail panels
   - Explicit stale/mismatch warnings
   - Manual refresh retained from the original checker
   - Europe/London date handling

   Mount with:
     <div id="tariffStatus" data-feed-url="https://.../exec"></div>
   Then load:
     <script src="tariff-status.js"></script>
   ============================================================================ */
(function () {
  'use strict';

  var SEASONS = [
    ['❄️', 'Winter', 'Jan-Mar'],
    ['🌱', 'Spring', 'Apr-Jun'],
    ['☀️', 'Summer', 'Jul-Sep'],
    ['🍂', 'Autumn', 'Oct-Dec']
  ];

  function pick(row, names) {
    if (!row) return null;
    for (var i = 0; i < names.length; i++) {
      var v = row[names[i]];
      if (v != null && v !== '') return v;
    }
    return null;
  }

  function iso(v) {
    var s = String(v || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }

  function londonToday() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return out.year + '-' + out.month + '-' + out.day;
  }

  function qinfo(s) {
    var p = String(s || '').split('-');
    var y = +p[0], m = +p[1];
    if (!y || !m) return null;
    var q = Math.floor((m - 1) / 3);
    var sm = q * 3 + 1;
    var em = sm + 2;
    var last = new Date(y, em, 0).getDate();
    return {
      q: q,
      year: y,
      icon: SEASONS[q][0],
      name: SEASONS[q][1],
      short: SEASONS[q][2],
      from: y + '-' + String(sm).padStart(2, '0') + '-01',
      to: y + '-' + String(em).padStart(2, '0') + '-' + String(last).padStart(2, '0')
    };
  }

  function fmt(s) {
    if (!s) return '—';
    var p = String(s).split('-');
    if (p.length < 3) return String(s);
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function fresh(row, now) {
    if (!row) return null;
    var f = iso(pick(row, ['valid_from', 'validFrom']));
    var t = iso(pick(row, ['valid_to', 'validTo']));
    if (f && t) return now >= f && now <= t;
    if (f) {
      var a = qinfo(f), b = qinfo(now);
      return !!(a && b && a.q === b.q && a.year === b.year);
    }
    return null;
  }

  function fixedSeries(rows) {
    var counts = {};
    rows.forEach(function (r) {
      var type = String(pick(r, ['tariff_type', 'tariffType']) || '').toLowerCase();
      if (type !== 'fixed') return;
      var v = pick(r, ['fixed_series', 'fixedSeries']);
      var name = String(pick(r, ['tariff_name', 'tariffName']) || '');
      var s = v == null ? '' : String(v).replace(/\D/g, '');
      if (!s) {
        var m = name.match(/fixed(?:\s+saver|\s+start)?\s*(\d+)/i) || name.match(/(\d+)\s*$/);
        if (m) s = m[1];
      }
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    var keys = Object.keys(counts);
    if (!keys.length) return '—';
    keys.sort(function (a, b) { return counts[b] - counts[a] || (+b) - (+a); });
    return keys[0];
  }

  function latestFixed(meta) {
    var v = meta && (meta.latestFixedSeries != null ? meta.latestFixedSeries : meta.latest_fixed_series);
    return v == null ? '' : String(v).replace(/\D/g, '');
  }

  function rowByType(rows, type) {
    for (var i = 0; i < rows.length; i++) {
      if (String(pick(rows[i], ['tariff_type', 'tariffType']) || '').toLowerCase() === type) return rows[i];
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById('tariff-status-styles')) return;
    var css =
      '.tstat-panel{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.35rem;position:relative;font:600 .78rem/1.25 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink,#1f1f24);}' +
      '.tstat-top{display:inline-flex;align-items:center;gap:.3rem;}' +
      '.tstat-label{color:var(--muted,#6b6b76);font-size:.7rem;font-weight:750;text-transform:uppercase;letter-spacing:0;white-space:nowrap;margin-right:.05rem;}' +
      '.tstat-btn,.tstat-refresh{border:1px solid var(--line,#e6e2ef);background:#fff;color:var(--ink,#1f1f24);border-radius:999px;min-height:30px;display:inline-flex;align-items:center;justify-content:center;gap:.25rem;padding:.22rem .55rem;cursor:pointer;font:inherit;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:border-color .15s,background .15s,box-shadow .15s;}' +
      '.tstat-btn:hover,.tstat-refresh:hover{background:#faf8fe;}' +
      '.tstat-btn.is-green{border-color:rgba(29,155,80,.45);box-shadow:0 0 0 2px rgba(29,155,80,.09);}' +
      '.tstat-btn.is-amber{border-color:rgba(217,138,0,.58);background:#fffaf0;box-shadow:0 0 0 2px rgba(217,138,0,.08);}' +
      '.tstat-btn.is-red{border-color:rgba(196,59,59,.55);background:#fff6f6;box-shadow:0 0 0 2px rgba(196,59,59,.07);}' +
      '.tstat-btn.is-check{opacity:.65;}' +
      '.tstat-fixed strong{font-size:.82rem;}' +
      '.tstat-season{font-size:1rem;min-width:34px;padding-left:.45rem;padding-right:.45rem;}' +
      '.tstat-refresh{border:0;background:transparent;box-shadow:none;color:var(--muted,#6b6b76);font-size:1rem;padding:.2rem .3rem;min-width:28px;}' +
      '.tstat-detail,.tstat-warning{flex-basis:100%;width:min(430px,92vw);margin-top:.15rem;border:1px solid var(--line,#e6e2ef);border-radius:10px;background:#fff;padding:.55rem .65rem;box-shadow:0 4px 14px rgba(0,0,0,.06);font-size:.72rem;font-weight:500;color:var(--muted,#6b6b76);}' +
      '.tstat-detail[hidden],.tstat-warning[hidden]{display:none!important;}' +
      '.tstat-detail-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.2rem;color:var(--ink,#1f1f24);font-weight:750;}' +
      '.tstat-state.good{color:var(--good,#1d9b50);}.tstat-state.stale{color:var(--amber,#d98a00);}.tstat-state.bad{color:var(--bad,#c43b3b);}' +
      '.tstat-lines{display:grid;gap:.18rem;}' +
      '.tstat-warning{border-color:rgba(217,138,0,.45);background:#fffaf0;color:#725300;line-height:1.35;}' +
      '.tstat-warning strong{display:block;margin-bottom:.15rem;color:#725300;}' +
      '@media(max-width:520px){.tstat-detail,.tstat-warning{width:min(330px,88vw);}.tstat-panel{gap:.25rem}.tstat-btn{min-height:28px}}';
    var st = document.createElement('style');
    st.id = 'tariff-status-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function mountOne(mount) {
    var feedUrl = mount.getAttribute('data-feed-url') || '';
    var openPanel = '';
    mount.classList.add('tstat-panel');
    mount.innerHTML = '';

    var top = document.createElement('div');
    top.className = 'tstat-top';

    var label = document.createElement('span');
    label.className = 'tstat-label';
    label.textContent = 'Tariff Version';

    var fixedBtn = document.createElement('button');
    fixedBtn.type = 'button';
    fixedBtn.className = 'tstat-btn tstat-fixed is-check';
    fixedBtn.setAttribute('aria-expanded', 'false');
    fixedBtn.innerHTML = '<span aria-hidden="true">🔒</span><strong>—</strong>';

    var seasonBtn = document.createElement('button');
    seasonBtn.type = 'button';
    seasonBtn.className = 'tstat-btn tstat-season is-check';
    seasonBtn.setAttribute('aria-expanded', 'false');
    seasonBtn.textContent = '◷';

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'tstat-refresh';
    refreshBtn.title = 'Re-check tariff feed';
    refreshBtn.setAttribute('aria-label', 'Re-check tariff feed');
    refreshBtn.textContent = '⟳';

    top.appendChild(label);
    top.appendChild(fixedBtn);
    top.appendChild(seasonBtn);
    top.appendChild(refreshBtn);
    mount.appendChild(top);

    var fixedDetail = document.createElement('div');
    fixedDetail.className = 'tstat-detail';
    fixedDetail.hidden = true;
    fixedDetail.innerHTML = '<div class="tstat-detail-head"><strong class="tstat-fixed-title">🔒 Fixed tariff version</strong><span class="tstat-state tstat-fixed-state">Checking...</span></div><div class="tstat-lines tstat-fixed-lines">Loading fixed tariff version...</div>';
    mount.appendChild(fixedDetail);

    var variableDetail = document.createElement('div');
    variableDetail.className = 'tstat-detail';
    variableDetail.hidden = true;
    variableDetail.innerHTML = '<div class="tstat-detail-head"><strong class="tstat-season-title">Variable tariff period</strong><span class="tstat-state tstat-season-state">Checking...</span></div><div class="tstat-lines tstat-season-lines">Loading validity dates...</div>';
    mount.appendChild(variableDetail);

    var warning = document.createElement('div');
    warning.className = 'tstat-warning';
    warning.hidden = true;
    mount.appendChild(warning);

    function setPanel(which) {
      openPanel = openPanel === which ? '' : which;
      fixedDetail.hidden = openPanel !== 'fixed';
      variableDetail.hidden = openPanel !== 'variable';
      fixedBtn.setAttribute('aria-expanded', openPanel === 'fixed' ? 'true' : 'false');
      seasonBtn.setAttribute('aria-expanded', openPanel === 'variable' ? 'true' : 'false');
    }

    fixedBtn.addEventListener('click', function () { setPanel('fixed'); });
    seasonBtn.addEventListener('click', function () { setPanel('variable'); });
    refreshBtn.addEventListener('click', check);

    function setBtnState(btn, state) {
      btn.classList.remove('is-green', 'is-amber', 'is-red', 'is-check');
      btn.classList.add('is-' + state);
    }

    function stateClass(el, state) {
      el.className = 'tstat-state ' + state;
    }

    function render(data) {
      var rows = data && Array.isArray(data.tariffLive) ? data.tariffLive : [];
      var meta = (data && data.meta) || {};
      var now = londonToday();
      var currentQuarter = qinfo(now);

      if (!rows.length) {
        showFailure('Feed reached but returned no tariff rows.');
        return;
      }

      var loaded = fixedSeries(rows);
      var latest = latestFixed(meta);
      var checked = meta.checkedAt || meta.checked_at || '';
      var fixedState = fixedDetail.querySelector('.tstat-fixed-state');
      var fixedLines = fixedDetail.querySelector('.tstat-fixed-lines');
      var fixedTitle = fixedDetail.querySelector('.tstat-fixed-title');

      fixedBtn.querySelector('strong').textContent = loaded;
      fixedTitle.textContent = '🔒 Fixed ' + loaded;

      var fixedWarn = '';
      if (loaded === '—') {
        setBtnState(fixedBtn, 'red');
        fixedState.textContent = 'Version unavailable';
        stateClass(fixedState, 'bad');
        fixedLines.innerHTML = '<div>No fixed tariff version could be identified in the loaded tariff rows.</div>';
      } else if (latest && latest !== loaded) {
        setBtnState(fixedBtn, 'amber');
        fixedState.textContent = '⚠️ Check version';
        stateClass(fixedState, 'stale');
        fixedLines.innerHTML = '<div>Fixed ' + loaded + ' is loaded.</div><div>Feed metadata reports Fixed ' + latest + ' as the latest published series.</div>';
        fixedWarn = '<strong>⚠️ FIXED TARIFF VERSION MISMATCH</strong>Fixed ' + loaded + ' is loaded, but the feed says Fixed ' + latest + ' is the latest published series.';
      } else {
        setBtnState(fixedBtn, 'green');
        fixedState.textContent = latest ? '✓ Current' : '✓ Loaded';
        stateClass(fixedState, 'good');
        fixedLines.innerHTML = '<div>Fixed ' + loaded + ' suite is loaded' + (latest ? ' and matches the latest published series recorded by the feed.' : '.') + '</div>' +
          (checked ? '<div>Latest-series check: ' + checked + '</div>' : '<div>Latest-series verification is not currently supplied by the feed.</div>');
      }

      var standard = rowByType(rows, 'variable');
      var ev = rowByType(rows, 'variable_ev');
      var sf = standard ? iso(pick(standard, ['valid_from', 'validFrom'])) : '';
      var st = standard ? iso(pick(standard, ['valid_to', 'validTo'])) : '';
      var ef = ev ? iso(pick(ev, ['valid_from', 'validFrom'])) : '';
      var et = ev ? iso(pick(ev, ['valid_to', 'validTo'])) : '';
      var qi = qinfo(sf || ef);
      var standardFresh = fresh(standard, now);
      var evFresh = fresh(ev, now);
      var seasonState = variableDetail.querySelector('.tstat-season-state');
      var seasonLines = variableDetail.querySelector('.tstat-season-lines');
      var seasonTitle = variableDetail.querySelector('.tstat-season-title');

      seasonBtn.textContent = qi ? qi.icon : '◷';
      seasonTitle.textContent = (qi ? qi.icon + ' ' + qi.name + ' ' : '') + 'variable tariff period';

      var combinedState = 'green';
      if (standardFresh === null || evFresh === null) combinedState = 'red';
      else if (standardFresh === false || evFresh === false) combinedState = 'amber';
      setBtnState(seasonBtn, combinedState);

      if (combinedState === 'green') {
        seasonState.textContent = '✓ Current';
        stateClass(seasonState, 'good');
      } else if (combinedState === 'amber') {
        seasonState.textContent = '⚠️ Out of date';
        stateClass(seasonState, 'stale');
      } else {
        seasonState.textContent = 'Date check unavailable';
        stateClass(seasonState, 'bad');
      }

      seasonBtn.setAttribute('aria-label', qi ? (qi.name + ' variable tariff period ' + qi.short + ' ' + qi.year) : 'Variable tariff period');
      seasonLines.innerHTML =
        '<div><strong>Standard variable:</strong> ' + (sf && st ? fmt(sf) + ' to ' + fmt(st) : 'validity dates unavailable') + ' ' + (standardFresh === true ? '✓' : standardFresh === false ? '⚠️' : '—') + '</div>' +
        '<div><strong>EV variable:</strong> ' + (ef && et ? fmt(ef) + ' to ' + fmt(et) : 'validity dates unavailable') + ' ' + (evFresh === true ? '✓' : evFresh === false ? '⚠️' : '—') + '</div>';

      var variableWarn = '';
      if ((standardFresh === false || evFresh === false) && qi && currentQuarter) {
        variableWarn = '<strong>⚠️ VARIABLE TARIFF DATA NEEDS UPDATING</strong>The loaded variable data is from ' + qi.name + ' (' + fmt(qi.from) + ' to ' + fmt(qi.to) + '), but today falls in ' + currentQuarter.name + ' (' + fmt(currentQuarter.from) + ' to ' + fmt(currentQuarter.to) + '). Variable and EV comparisons may be out of date until Tariff_Live is refreshed.';
      }

      var warnings = [];
      if (variableWarn) warnings.push(variableWarn);
      if (fixedWarn) warnings.push(fixedWarn);
      warning.innerHTML = warnings.join('<br><br>');
      warning.hidden = !warnings.length;
    }

    function showFailure(message) {
      fixedBtn.querySelector('strong').textContent = '—';
      seasonBtn.textContent = '⚠️';
      setBtnState(fixedBtn, 'red');
      setBtnState(seasonBtn, 'red');
      var fs = fixedDetail.querySelector('.tstat-fixed-state');
      var ss = variableDetail.querySelector('.tstat-season-state');
      fs.textContent = 'Unavailable';
      ss.textContent = 'Unavailable';
      stateClass(fs, 'bad');
      stateClass(ss, 'bad');
      fixedDetail.querySelector('.tstat-fixed-lines').textContent = message;
      variableDetail.querySelector('.tstat-season-lines').textContent = message;
      warning.innerHTML = '<strong>⚠️ LIVE TARIFF CHECK UNAVAILABLE</strong>' + message;
      warning.hidden = false;
    }

    function check() {
      warning.hidden = true;
      setBtnState(fixedBtn, 'check');
      setBtnState(seasonBtn, 'check');
      fixedBtn.querySelector('strong').textContent = '…';
      seasonBtn.textContent = '◷';
      if (!feedUrl) {
        showFailure('No live tariff feed URL has been configured for this tool.');
        return;
      }
      fetch(feedUrl, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(render)
        .catch(function (e) {
          showFailure('Could not reach the live tariff feed' + (e && e.message ? ' (' + e.message + ')' : '') + '.');
        });
    }

    check();
  }

  function init() {
    injectStyles();
    var mounts = document.querySelectorAll('[data-tariff-status], #tariffStatus');
    for (var i = 0; i < mounts.length; i++) mountOne(mounts[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
