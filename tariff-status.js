/* ============================================================================
   Tariff status panel — shared across every tool. Fixed filename on purpose
   (never versioned), so all tools reference one file and update together.

   Add to any tool:
     1) header mount:  <div id="tariffStatus" data-feed-url="https://.../exec"></div>
     2) before </body>: <script src="tariff-status.js"></script>

   Three rows — Fixed, Var (standard variable), EV — each a coloured dot, a
   terse label, and a refresh. Full detail is on the tooltip. Every refresh
   re-runs the same feed check.

   COLOUR HONESTY:
     Var / EV  — a TRUE currency check. Green while today sits inside the sheet's
                 quarter; amber once the calendar has rolled into a new quarter
                 and the sheet hasn't caught up (e.g. 1 Oct, sheet still on Q3).
     Fixed     — green whenever fixed rates are loaded. This canNOT prove the
                 series is UW's newest without the automated updater ("hunter").
                 Once the feed carries meta.latestFixedSeries, Fixed becomes a
                 true green/amber check automatically.
     Red       — feed unreachable; the tool is on its built-in fallback rates.
   ============================================================================ */
(function () {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var Q_START = ['Jan', 'Apr', 'Jul', 'Oct'];

  function pick(row, names) {
    if (!row) return null;
    for (var i = 0; i < names.length; i++) { var v = row[names[i]]; if (v != null && v !== '') return v; }
    return null;
  }
  function refDate(ref) {
    if (!ref) return null;
    var m = String(ref).match(/(\d{2})(\d{2})(\d{2})\s*$/);
    if (!m) return null;
    var dt = new Date(2000 + (+m[3]), (+m[2]) - 1, +m[1]);
    return isNaN(dt.getTime()) ? null : dt;
  }
  function seriesOf(row) {
    var s = pick(row, ['fixed_series', 'fixedSeries']);
    if (s) return String(s).replace(/[^0-9]/g, '');
    var name = pick(row, ['tariff_name', 'tariffName']);
    var m = name && String(name).match(/(\d+)\s*$/);
    return m ? m[1] : null;
  }
  function fmtDate(dt) {
    return dt ? dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'unknown date';
  }
  // Quarter of a variable/EV row from valid_from, plus whether today is still inside it.
  function quarterOf(row) {
    var from = pick(row, ['valid_from', 'validFrom']);
    if (!from) return null;
    var fd = new Date(from);
    if (isNaN(fd.getTime())) return null;
    var qn = Math.floor(fd.getMonth() / 3) + 1;
    var label = Q_START[qn - 1] + ' Q' + qn;
    var current = true;
    var to = pick(row, ['valid_to', 'validTo']);
    if (to) {
      var td = new Date(to);
      if (!isNaN(td.getTime())) { td.setHours(23, 59, 59, 999); current = (Date.now() <= td.getTime()); }
    }
    return { label: label, current: current, from: fd, to: to };
  }

  function injectStyles() {
    if (document.getElementById('tariff-status-styles')) return;
    var css =
      '.tstat-panel{display:inline-grid;grid-template-columns:auto auto auto;gap:.2rem .5rem;align-items:center;' +
      'padding:.4rem .6rem;border:1px solid var(--line,#e6e2ef);border-radius:12px;background:#fff;' +
      'box-shadow:0 1px 3px rgba(0,0,0,.06);font:600 .78rem/1.15 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink,#1f1f24);}' +
      '.tstat-panel .tdot{width:.6rem;height:.6rem;border-radius:50%;background:#9aa0ad;justify-self:center;transition:background .2s;}' +
      '.tstat-panel .tdot.is-green{background:var(--good,#1d9b50);box-shadow:0 0 0 3px rgba(29,155,80,.15);}' +
      '.tstat-panel .tdot.is-amber{background:var(--amber,#d98a00);box-shadow:0 0 0 3px rgba(217,138,0,.15);}' +
      '.tstat-panel .tdot.is-red{background:var(--bad,#c43b3b);box-shadow:0 0 0 3px rgba(196,59,59,.15);}' +
      '.tstat-panel .tlabel{white-space:nowrap;}' +
      '.tstat-panel .trefresh{border:0;background:transparent;cursor:pointer;font-size:.95rem;line-height:1;padding:.05rem .2rem;color:var(--muted,#6b6b76);border-radius:6px;justify-self:end;}' +
      '.tstat-panel .trefresh:hover{color:var(--ink,#1f1f24);background:rgba(0,0,0,.06);}';
    var st = document.createElement('style'); st.id = 'tariff-status-styles'; st.textContent = css;
    document.head.appendChild(st);
  }

  function mountOne(mount) {
    var feedUrl = mount.getAttribute('data-feed-url') || '';
    mount.classList.add('tstat-panel');
    var order = [['fixed', 'Fixed'], ['var', 'Var'], ['ev', 'EV']];
    var rows = {};
    mount.innerHTML = '';
    order.forEach(function (o) {
      var dot = document.createElement('span'); dot.className = 'tdot';
      var lab = document.createElement('span'); lab.className = 'tlabel'; lab.textContent = o[1] + ' …';
      var btn = document.createElement('button'); btn.className = 'trefresh'; btn.type = 'button';
      btn.title = 'Re-check tariff feed'; btn.setAttribute('aria-label', 'Re-check tariff feed'); btn.textContent = '\u27f3';
      btn.addEventListener('click', check);
      mount.appendChild(dot); mount.appendChild(lab); mount.appendChild(btn);
      rows[o[0]] = { dot: dot, lab: lab };
    });

    function setRow(key, state, text, title) {
      var r = rows[key];
      r.dot.className = 'tdot is-' + state;
      r.lab.textContent = text;
      r.dot.title = r.lab.title = title || text;
    }
    function allRed(title) {
      setRow('fixed', 'red', 'Fixed \u2014', title);
      setRow('var', 'red', 'Var \u2014', title);
      setRow('ev', 'red', 'EV \u2014', title);
    }

    function apply(data) {
      var list = (data && data.tariffLive) || [];
      if (!list.length) { allRed('Feed reached but returned no rows \u2014 the tool is on its built-in fallback rates.'); return; }

      var fixedRow = null, varRow = null, evRow = null;
      for (var i = 0; i < list.length; i++) {
        var t = String(pick(list[i], ['tariff_type', 'tariffType']) || '');
        if (!fixedRow && t.indexOf('fixed') === 0) fixedRow = list[i];
        if (!varRow && t === 'variable') varRow = list[i];
        if (!evRow && t === 'variable_ev') evRow = list[i];
      }

      // FIXED — green when loaded; true check once the hunter supplies meta.
      var fx = seriesOf(fixedRow);
      var dt = refDate(pick(fixedRow, ['source_ref', 'sourceRef']));
      var meta = data.meta || null;
      var latest = meta ? (meta.latestFixedSeries != null ? meta.latestFixedSeries : meta.latest_fixed_series) : null;
      if (latest != null) {
        latest = String(latest).replace(/[^0-9]/g, '');
        var checked = meta.checkedAt || meta.checked_at || '';
        if (fx && latest && fx === latest) {
          setRow('fixed', 'green', 'Fixed ' + fx, 'Fixed ' + fx + ' \u00b7 label ' + fmtDate(dt) + ' \u2014 matches UW\u2019s latest' + (checked ? ' (checked ' + checked + ')' : '') + '.');
        } else {
          setRow('fixed', 'amber', 'Fixed ' + (fx || '?'), 'Sheet is on Fixed ' + (fx || '?') + ' but UW has published Fixed ' + latest + ' \u2014 run the tariff update.');
        }
      } else if (fx) {
        setRow('fixed', 'green', 'Fixed ' + fx, 'Fixed ' + fx + ' \u00b7 label ' + fmtDate(dt) + '. Loaded from the live feed. Note: a true \u201clatest series\u201d check arrives with the automated updater \u2014 this green means loaded, not verified newest.');
      } else {
        setRow('fixed', 'red', 'Fixed \u2014', 'No fixed rates found in the feed.');
      }

      // VAR / EV — true calendar currency check.
      [['var', varRow, 'Var'], ['ev', evRow, 'EV']].forEach(function (grp) {
        var key = grp[0], row = grp[1], name = grp[2];
        var q = quarterOf(row);
        if (!q) { setRow(key, 'red', name + ' \u2014', 'No ' + name + ' rates found in the feed.'); return; }
        if (q.current) {
          setRow(key, 'green', name + ' ' + q.label, name + ' ' + q.label + ' \u2014 current quarter.');
        } else {
          setRow(key, 'amber', name + ' ' + q.label, name + ' is still on ' + q.label + ', which ended ' + (q.to ? fmtDate(new Date(q.to)) : 'last quarter') + '. A new quarter has started \u2014 update the sheet.');
        }
      });
    }

    function check() {
      if (!feedUrl) { allRed('Add data-feed-url to the tariff-status element, pointing at your live feed.'); return; }
      setRow('fixed', 'check', 'Fixed \u2026', 'Contacting the live tariff feed\u2026');
      setRow('var', 'check', 'Var \u2026', 'Contacting the live tariff feed\u2026');
      setRow('ev', 'check', 'EV \u2026', 'Contacting the live tariff feed\u2026');
      fetch(feedUrl, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(apply)
        .catch(function (e) { allRed('Can\u2019t reach the live feed, so the tool is on its built-in fallback rates. (' + e.message + ')'); });
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
