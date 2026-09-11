/* Strict share allowlists for consolidated Main and specialist views. */
(function (global) {
  'use strict';
  var MAIN = new Set(('n dt y f cE uE cB uB uBr cM uM md is cT uT sM ct w rf nl bf mf au ef ed cn fm cs cbt ip bc bcf it mac mau map oo ool macr maur bl pn pr ps pj up usc').split(' '));
  var MAIN_FIGURES = new Set(('y f cE uE cB uB uBr cM uM md is cT uT sM ct w rf nl bf mf au ef ed cn fm cs cbt ip bc bcf it mac mau map oo ool macr maur').split(' '));
  var EV_TOP = new Set(('schema_version view_type customer_name electricityUsageTotalKwh electricityProfile electricityUsageDayKwh electricityUsageNightKwh ev_state').split(' '));
  var EV_STATE = new Set(('schema_version tool_version vehicle_efficiency_mi_kwh vehicle_icon annual_mileage home_usage_kwh uw_services region ev_offpeak_pct e7_offpeak_pct e7_actual e7_day_kwh e7_night_kwh away_pct away_rate_p_kwh efficiency_override_mi_kwh known_ev_kwh dual_fuel period stress_pct').split(' '));
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function safeHttps(value) { try { var url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; } catch (_) { return ''; } }
  function pick(source, allowed) { var out = {}; Object.keys(source || {}).forEach(function (key) { if (allowed.has(key)) out[key] = clone(source[key]); }); return out; }
  function main(source) {
    var out = pick(source, MAIN);
    if (out.up && typeof out.up === 'object') out.up = pick(out.up, MAIN_FIGURES);
    if (out.bl !== undefined) { out.bl = safeHttps(out.bl); if (!out.bl) delete out.bl; }
    if (out.pj !== undefined) { out.pj = safeHttps(out.pj); if (!out.pj) delete out.pj; }
    return out;
  }
  function ev(source) {
    var input = source || {}, out = pick(input, EV_TOP);
    out.schema_version = 1; out.view_type = 'ev';
    out.customer_name = String(input.customer_name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (input.electricityUsageTotalKwh == null && input.electricity_usage_kwh != null) out.electricityUsageTotalKwh = Number(input.electricity_usage_kwh);
    out.ev_state = pick(input.ev_state || {}, EV_STATE);
    return out;
  }
  function specialist(viewType, snapshot) { return String(viewType || '').toLowerCase() === 'ev' ? ev(snapshot) : {}; }
  var policy = { main: main, ev: ev, specialist: specialist, safeHttps: safeHttps };
  global.AppointmentCompanionSharePolicy = policy;
  if (typeof global.buildShareData === 'function' && !global.buildShareData.__consolidatedAllowlist) {
    var original = global.buildShareData;
    var wrapped = function () { var result = original(); return result && result.error ? result : { data: main(result && result.data || {}) }; };
    wrapped.__consolidatedAllowlist = true; global.buildShareData = wrapped;
  }
})(window);
