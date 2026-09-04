/* ============================================================================
   Tariff status dashboard — shared across every tool. Fixed filename on purpose
   (never versioned), so all tools reference one file and update together.

   To add to any tool:
     1) put a mount point in the header:
          <div id="tariffStatus" data-feed-url="https://.../exec"></div>
     2) include this file before </body>:
          <script src="tariff-status.js"></script>

   It reads the live tariff feed and shows, at a glance, which fixed series and
   label date the tool is working from, with a green / amber / red light.

   HONEST NOTE ON THE LIGHT:
   Until the automated updater ("hunter") writes a `meta` block into the feed,
   the colour is a freshness heuristic based on the age of the label, NOT proof
   that this is UW's newest published label — nothing in a browser tool can know
   that without going to check. So for now:
       green = live feed loaded and the label looks recent
       amber = loaded, but the label is old — go check UW before quoting
       red   = feed unreachable, tool is running on its built-in fallback rates
   The version text (Fixed nn · date) is always the honest core; the colour is
   just the glance. Once the feed carries meta.latestFixedSeries + meta.checkedAt,
   green automatically becomes a true "matches UW's latest" check.
   ============================================================================ */
(function () {
  var FRESH_DAYS = 45; // label older than this -> amber prompt (heuristic; tune to cadence)

  function pick(row, names) {
    for (var i = 0; i < names.length; i++) {
      var v = row[names[i]];
      if (v != null && v !== '') return v;
    }
    return null;
  }

  // UW source ref e.g. "UWETL010426" / "UEWETL230326" -> Date (trailing DDMMYY)
  function refDate(ref) {
    if (!ref) return null;
    var m = String(ref).match(/(\d{2})(\d{2})(\d{2})\s*$/);
    if (!m) return null;
    var dt = new Date(2000 + (+m[3]), (+m[2]) - 1, +m[1]);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Fixed series number: prefer a clean column, fall back to the tariff name text
  function series(row) {
    if (!row) return null;
    var s = pick(row, ['fixed_series', 'fixedSeries']);
    if (s) return String(s).replace(/[^0-9]/g, '');
    var name = pick(row, ['tariff_name', 'tariffName']);
    var m = name && String(name).match(/(\d+)\s*$/);
    return m ? m[1] : null;
  }

  // Variable quarter: prefer a clean column, else derive from valid_from
  function quarter(row) {
    if (!row) return null;
    var q = pick(row, ['quarter']);
    if (q) return String(q);
    var from = pick(row, ['valid_from', 'validFrom']);
    if (!from) return null;
    var dt = new Date(from);
    if (isNaN(dt.getTime())) return null;
    return dt.getFullYear() + '-Q' + (Math.floor(dt.getMonth() / 3) + 1);
  }

  function fmtDate(dt) {
    return dt ? dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'unknown date';
  }

  function injectStyles() {
    if (document.getElementById('tariff-status-styles')) return;
    var css =
      '.tstat{display:inline-flex;align-items:center;gap:.5rem;padding:.35rem .65rem;border-radius:999px;' +
      'font:600 .8rem/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border:1px solid var(--line,#e6e2ef);' +
      'background:#fff;color:var(--ink,#1f1f24);box-shadow:0 1px 3px rgba(0,0,0,.06);max-width:100%;}' +
      '.tstat .tdot{width:.6rem;height:.6rem;border-radius:50%;flex:0 0 auto;background:#9aa0ad;transition:background .2s;}' +
      '.tstat.is-green .tdot{background:var(--good,#1d9b50);box-shadow:0 0 0 3px rgba(29,155,80,.15);}' +
      '.tstat.is-amber .tdot{background:var(--amber,#d98a00);box-shadow:0 0 0 3px rgba(217,138,0,.15);}' +
      '.tstat.is-red   .tdot{background:var(--bad,#c43b3b);box-shadow:0 0 0 3px rgba(196,59,59,.15);}' +
      '.tstat .tmain{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.tstat .trefresh{border:0;background:transparent;cursor:pointer;font-size:1rem;line-height:1;padding:.05rem .25rem;color:var(--muted,#6b6b76);border-radius:6px;}' +
      '.tstat .trefresh:hover{color:var(--ink,#1f1f24);background:rgba(0,0,0,.05);}';
    var st = document.createElement('style');
    st.id = 'tariff-status-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function mountOne(mount) {
    var feedUrl = mount.getAttribute('data-feed-url') || '';
    mount.classList.add('tstat', 'is-check');
    mount.innerHTML =
      '<span class="tdot"></span><span class="tmain">Checking tariffs…</span>' +
      '<button class="trefresh" type="button" title="Re-check tariff feed" aria-label="Re-check tariff feed">\u27f3</button>';
    var main = mount.querySelector('.tmain');
    var btn = mount.querySelector('.trefresh');

    function set(state, text, title) {
      mount.classList.remove('is-green', 'is-amber', 'is-red', 'is-check');
      mount.classList.add('is-' + state);
      main.textContent = text;
      mount.setAttribute('title', title || text);
    }

    function apply(data) {
      var rows = (data && (data.tariffLive || data.tariff_live)) || [];
      if (!rows.length) {
        set('red', 'Tariffs offline', 'Feed reached but returned no rows — the tool is on its built-in fallback rates.');
        return;
      }
      var fixedRow = null, varRow = null;
      for (var i = 0; i < rows.length; i++) {
        var t = String(pick(rows[i], ['tariff_type', 'tariffType']) || '');
        if (!fixedRow && t.indexOf('fixed') === 0) fixedRow = rows[i];
        if (!varRow && t.indexOf('variable') === 0) varRow = rows[i];
      }
      var fx = series(fixedRow);
      var dt = refDate(pick(fixedRow || {}, ['source_ref', 'sourceRef']));
      var q = quarter(varRow);
      var label = (fx ? 'Fixed ' + fx : 'Fixed ?') + ' \u00b7 ' + fmtDate(dt) + (q ? ' \u00b7 Var ' + q : '');

      // True check, once the hunter writes it into the feed
      var meta = data.meta || null;
      var latest = meta ? (meta.latestFixedSeries != null ? meta.latestFixedSeries : meta.latest_fixed_series) : null;
      if (latest != null) {
        latest = String(latest).replace(/[^0-9]/g, '');
        var checked = meta.checkedAt || meta.checked_at || '';
        if (fx && latest && fx === latest) {
          set('green', label, 'Matches UW\u2019s latest published label' + (checked ? ' (checked ' + checked + ')' : '') + '.');
        } else {
          set('amber', label + ' \u2014 update available', 'UW has published Fixed ' + latest + '. The sheet is still on ' + (fx || '?') + ' \u2014 run the tariff update.');
        }
        return;
      }

      // Interim: freshness heuristic on the label date
      var ageDays = dt ? (Date.now() - dt.getTime()) / 86400000 : null;
      if (ageDays != null && ageDays > FRESH_DAYS) {
        set('amber', label + ' \u2014 check', 'This label is ' + Math.round(ageDays) + ' days old. UW may have published a newer one — worth checking before you quote.');
      } else {
        set('green', label, 'Live feed loaded, showing ' + label + '. Recency check only — a guaranteed \u201clatest\u201d check arrives with the automated updater.');
      }
    }

    function check() {
      if (!feedUrl) {
        set('red', 'No feed set', 'Add data-feed-url to the tariff-status element, pointing at your live feed.');
        return;
      }
      set('check', 'Checking tariffs\u2026', 'Contacting the live tariff feed\u2026');
      fetch(feedUrl, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(apply)
        .catch(function (e) {
          set('red', 'Tariffs offline', 'Can\u2019t reach the live feed, so the tool is on its built-in fallback rates. (' + e.message + ')');
        });
    }

    btn.addEventListener('click', check);
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
