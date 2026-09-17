/* Canonical appointment schema and donor-UI compatibility adapter. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var baseSerialize = typeof global.serializeForm === 'function' ? global.serializeForm : function () { return {}; };
  var baseRestore = typeof global.restoreForm === 'function' ? global.restoreForm : function () { return false; };
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function number(value) { var n = value !== '' && value != null ? Number(value) : NaN; return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; }
  function bool(value, fallback) { if (value === true || value === false) return value; if (value === 'true') return true; if (value === 'false') return false; return fallback; }
  function source(value) { var v = String(value || '').toLowerCase(); if (v === 'estimate' || v === 'estimated') return 'estimated'; if (v && v !== 'legacy/unknown' && v !== 'unknown') return 'actual'; return null; }
  function detail(value, fallback) { var v = String(value || '').toLowerCase(); if (!v || v === 'legacy/unknown' || v === 'unknown') return fallback || 'legacy_unknown'; if (v === 'estimate' || v === 'estimated') return fallback || null; return v === 'manual' ? 'manual' : v; }
  function defaults() {
    return {
      customerName: '', homeStatus: null,
      selectedServices: { energy: false, broadband: false, mobile: false },
      basketUrl: '', privateNotes: '', lastQuoteSharedAt: '',
      energy: {
        energyFuelSelection: 'both', electricityUsageTotalKwh: null, gasUsageKwh: null,
        electricityUsageSource: null, gasUsageSource: null,
        electricityUsageSourceDetail: null, gasUsageSourceDetail: null,
        electricityProfile: 'standard', electricityUsageDayKwh: null, electricityUsageNightKwh: null
      },
      mobile: { simCount: 1 }
    };
  }
  function normaliseCanonical(input) {
    var out = defaults(), row = input || {}, energy = row.energy || {}, mobile = row.mobile || {};
    out.customerName = String(row.customerName || '').trim();
    out.homeStatus = row.homeStatus === 'homeowner' || row.homeStatus === 'tenant' ? row.homeStatus : null;
    out.selectedServices = Object.assign(out.selectedServices, clone(row.selectedServices || {}));
    out.basketUrl = String(row.basketUrl || ''); out.privateNotes = String(row.privateNotes || ''); out.lastQuoteSharedAt = String(row.lastQuoteSharedAt || '');
    var fuel = String(energy.energyFuelSelection || 'both'); out.energy.energyFuelSelection = ['electricity', 'gas', 'both'].indexOf(fuel) >= 0 ? fuel : 'both';
    out.energy.electricityUsageTotalKwh = number(energy.electricityUsageTotalKwh);
    out.energy.gasUsageKwh = number(energy.gasUsageKwh);
    out.energy.electricityUsageSource = ['actual', 'estimated'].indexOf(energy.electricityUsageSource) >= 0 ? energy.electricityUsageSource : null;
    out.energy.gasUsageSource = ['actual', 'estimated'].indexOf(energy.gasUsageSource) >= 0 ? energy.gasUsageSource : null;
    out.energy.electricityUsageSourceDetail = energy.electricityUsageSourceDetail || null; out.energy.gasUsageSourceDetail = energy.gasUsageSourceDetail || null;
    var profile = String(energy.electricityProfile || 'standard'); out.energy.electricityProfile = ['standard', 'economy7', 'ev'].indexOf(profile) >= 0 ? profile : 'standard';
    out.energy.electricityUsageDayKwh = number(energy.electricityUsageDayKwh); out.energy.electricityUsageNightKwh = number(energy.electricityUsageNightKwh);
    if (out.energy.electricityProfile !== 'standard' && out.energy.electricityUsageDayKwh != null && out.energy.electricityUsageNightKwh != null) out.energy.electricityUsageTotalKwh = out.energy.electricityUsageDayKwh + out.energy.electricityUsageNightKwh;
    out.mobile.simCount = Math.max(1, Math.min(5, Number(mobile.simCount || 1)));
    return out;
  }
  function legacyCanonical(saved) {
    var data = saved || {}, inputs = data.inputs || {}, state = data.state || {}, services = state.services || {};
    var hasElectricity = bool(inputs.energyHasElectricity, state.splitElec !== false), hasGas = bool(inputs.energyHasGas, state.splitGas !== false);
    var day = number(inputs.electricityUsageDayKwh), night = number(inputs.electricityUsageNightKwh);
    var total = number(inputs.electricityUsageTotalKwh != null ? inputs.electricityUsageTotalKwh : inputs.electricityUsageKwh);
    var profile = String(inputs.electricityProfile || ((day != null || night != null) ? 'economy7' : 'standard'));
    var rawElecSource = inputs.electricityUsageSource, rawGasSource = inputs.gasUsageSource;
    return normaliseCanonical({
      customerName: data.customerName || inputs.customerName || '', homeStatus: state.homeowner || null,
      selectedServices: { energy: !!services.energy, broadband: !!services.broadband, mobile: !!services.mobile },
      basketUrl: inputs.basketLink || data.basket_url || '', privateNotes: data.notes || '', lastQuoteSharedAt: data.quoteSharedAt || '',
      energy: {
        energyFuelSelection: hasElectricity && hasGas ? 'both' : hasGas ? 'gas' : 'electricity',
        electricityUsageTotalKwh: total, gasUsageKwh: number(inputs.gasUsageKwh),
        electricityUsageSource: source(rawElecSource), gasUsageSource: source(rawGasSource),
        electricityUsageSourceDetail: detail(rawElecSource), gasUsageSourceDetail: detail(rawGasSource),
        electricityProfile: profile, electricityUsageDayKwh: day, electricityUsageNightKwh: night
      }, mobile: { simCount: state.simCount || 1 }
    });
  }
  function cleanUi(saved) {
    var ui = clone(saved || {}); delete ui.canonical; delete ui.schema_version; delete ui.customerName; delete ui.notes; delete ui.quoteSharedAt; delete ui._journey;
    ui.inputs = ui.inputs || {}; ['customerName','basketLink','energyHasElectricity','energyHasGas','electricityUsageKwh','electricityUsageTotalKwh','electricityUsageSource','electricityUsageSourceDetail','electricityUsageCapturedAt','electricityUsageBasis','electricityUsageDayKwh','electricityUsageNightKwh','electricityProfile','gasUsageKwh','gasUsageSource','gasUsageSourceDetail','gasUsageCapturedAt','canonicalFuelSelection','canonicalElectricityProfile','canonicalElectricitySource','canonicalGasSource','canonicalElectricitySourceDetail','canonicalGasSourceDetail','canonicalElectricityTotal','canonicalGasUsage','canonicalElectricityDay','canonicalElectricityNight','canonicalSimCount','splitAnnualTotal','splitSampleDay','splitSampleNight'].forEach(function (key) { delete ui.inputs[key]; });
    ui.state = ui.state || {}; delete ui.state.homeowner; delete ui.state.services; delete ui.state.simCount;
    return ui;
  }
  function normaliseAppointment(input) {
    var saved = input && input.appointment_state ? input.appointment_state : input || {};
    if (saved && saved.schema_version === 1 && saved.canonical) return { schema_version: 1, canonical: normaliseCanonical(saved.canonical), ui_state: cleanUi(saved.ui_state || {}) };
    return { schema_version: 1, canonical: legacyCanonical(saved), ui_state: cleanUi(saved) };
  }
  function sourceProjection(kind, detailValue) { if (kind === 'estimated') return 'estimate'; return detailValue && detailValue !== 'legacy_unknown' ? detailValue : kind === 'actual' ? 'manual' : ''; }
  function toLegacySnapshot(input) {
    var appointment = normaliseAppointment(input), c = appointment.canonical, e = c.energy, ui = clone(appointment.ui_state || {});
    ui.app = ui.app || 'appointment-companion'; ui.v = ui.v || 2; ui.customerName = c.customerName; ui.notes = c.privateNotes; ui.quoteSharedAt = c.lastQuoteSharedAt;
    ui.inputs = ui.inputs || {}; ui.state = ui.state || {};
    ui.inputs.customerName = c.customerName; ui.inputs.basketLink = c.basketUrl;
    ui.inputs.energyHasElectricity = e.energyFuelSelection !== 'gas'; ui.inputs.energyHasGas = e.energyFuelSelection !== 'electricity';
    ui.inputs.electricityUsageTotalKwh = e.electricityUsageTotalKwh == null ? '' : String(e.electricityUsageTotalKwh);
    ui.inputs.electricityUsageKwh = ui.inputs.electricityUsageTotalKwh;
    ui.inputs.electricityUsageSource = sourceProjection(e.electricityUsageSource, e.electricityUsageSourceDetail);
    ui.inputs.electricityUsageDayKwh = e.electricityUsageDayKwh == null ? '' : String(e.electricityUsageDayKwh);
    ui.inputs.electricityUsageNightKwh = e.electricityUsageNightKwh == null ? '' : String(e.electricityUsageNightKwh);
    ui.inputs.electricityProfile = e.electricityProfile; ui.inputs.gasUsageKwh = e.gasUsageKwh == null ? '' : String(e.gasUsageKwh);
    ui.inputs.gasUsageSource = sourceProjection(e.gasUsageSource, e.gasUsageSourceDetail);
    ui.state.homeowner = c.homeStatus; ui.state.services = clone(c.selectedServices); ui.state.simCount = c.mobile.simCount;
    ui.state.splitElec = e.energyFuelSelection !== 'gas'; ui.state.splitGas = e.energyFuelSelection !== 'electricity';
    return ui;
  }
  function domCanonical(base) {
    var migrated = legacyCanonical(base), controls = global.AppointmentCompanionCanonicalControls;
    if (controls && typeof controls.capture === 'function') migrated = normaliseCanonical(Object.assign({}, migrated, controls.capture()));
    var name = document.getElementById('customerName'), notes = document.getElementById('apptNotes'), basket = document.getElementById('basketLink');
    if (name) migrated.customerName = String(name.value || '').trim(); if (notes) migrated.privateNotes = String(notes.value || ''); if (basket) migrated.basketUrl = String(basket.value || '').trim();
    migrated.lastQuoteSharedAt = String(global.AppointmentCompanionQuoteSharedAt || '');
    return migrated;
  }
  function capture() {
    var base = baseSerialize();
    return { app: 'appointment-companion', schema_version: 1, saved_at: new Date().toISOString(), canonical: domCanonical(base), ui_state: cleanUi(base) };
  }
  function restore(saved) {
    var appointment = normaliseAppointment(saved), result = baseRestore(toLegacySnapshot(appointment));
    setTimeout(function () { var controls = global.AppointmentCompanionCanonicalControls; if (controls && controls.hydrate) controls.hydrate(appointment.canonical); }, 0);
    return result;
  }
  var api = { defaults: defaults, normaliseCanonical: normaliseCanonical, normaliseAppointment: normaliseAppointment, migrateSnapshot: normaliseAppointment, capture: capture, restore: restore, toLegacySnapshot: toLegacySnapshot, baseSerialize: baseSerialize, baseRestore: baseRestore };
  global.AppointmentCompanionCanonical = api; global.serializeForm = capture; global.restoreForm = restore;
})(window);
