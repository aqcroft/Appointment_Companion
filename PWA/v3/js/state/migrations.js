import { createAppointment, normaliseAppointment } from './canonical-state.js';

const parse = value => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
};
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const bool = value => value === true || value === 'true' || value === 1 || value === '1';

function legacyInput(source, key, fallback = '') {
  return source?.inputs?.[key] ?? source?.[key] ?? fallback;
}

function legacyState(source) {
  const raw = parse(source) || {};
  if (raw.schemaVersion === 3) return normaliseAppointment(raw);
  if (raw.appointment_state || raw.appointment_state_json || raw.appointment_snapshot) {
    return migrateAppointment(raw.appointment_state || raw.appointment_state_json || raw.appointment_snapshot);
  }
  if (raw.schema_version === 1 && raw.canonical) {
    const c = raw.canonical;
    const ui = raw.ui_state || {};
    const appointment = ui._v3Appointment ? normaliseAppointment(ui._v3Appointment) : createAppointment(c.customerName || '');
    appointment.person.name = c.customerName || appointment.person.name;
    appointment.person.homeStatus = c.homeStatus || appointment.person.homeStatus;
    appointment.services = {
      ...appointment.services,
      ...(c.selectedServices || {}),
      boilerCover: bool(c.selectedServices?.boilerCover || ui.inputs?.boilerCoverToggle || ui.inputs?.boilerCover)
    };
    appointment.energy.region = String(c.energy?.region || legacyInput(ui, 'region', appointment.energy.region || '11'));
    appointment.energy.fuel = c.energy?.energyFuelSelection === 'both' ? 'dual' : c.energy?.energyFuelSelection || appointment.energy.fuel;
    if (c.energy?.electricityUsageTotalKwh != null) appointment.energy.annualElectricityKwh = number(c.energy.electricityUsageTotalKwh);
    if (c.energy?.gasUsageKwh != null) appointment.energy.annualGasKwh = number(c.energy.gasUsageKwh);
    appointment.energy.electricityProfile = c.energy?.electricityProfile || appointment.energy.electricityProfile;
    appointment.energy.peakOffPeak = appointment.energy.electricityProfile !== 'standard';
    if (c.energy?.electricityUsageDayKwh != null) appointment.energy.dayKwh = number(c.energy.electricityUsageDayKwh);
    if (c.energy?.electricityUsageNightKwh != null) appointment.energy.nightKwh = number(c.energy.electricityUsageNightKwh);
    appointment.mobile.simCount = number(c.mobile?.simCount) || appointment.mobile.simCount;
    appointment.summary.basketUrl = c.basketUrl || appointment.summary.basketUrl;
    appointment.summary.privateNotes = c.privateNotes || appointment.summary.privateNotes;
    appointment.summary.lastSharedAt = c.lastQuoteSharedAt || appointment.summary.lastSharedAt;
    return overlayLegacyUi(appointment, ui);
  }
  return overlayLegacyUi(createAppointment(raw.customerName || legacyInput(raw, 'customerName')), raw);
}

function overlayLegacyUi(appointment, ui = {}) {
  const inputs = ui.inputs || {};
  const state = ui.state || {};
  appointment.person.name ||= ui.customerName || inputs.customerName || '';
  appointment.person.homeStatus ||= state.homeowner || null;
  appointment.services.energy ||= bool(state.services?.energy);
  appointment.services.broadband ||= bool(state.services?.broadband);
  appointment.services.mobile ||= bool(state.services?.mobile);
  appointment.services.boilerCover ||= bool(inputs.boilerCoverToggle || inputs.boilerCover);
  if (inputs.currentEnergyMonthly !== undefined) appointment.energy.currentMonthly = number(inputs.currentEnergyMonthly);
  if (inputs.currentElecMonthly !== undefined) appointment.energy.currentElectricityMonthly = number(inputs.currentElecMonthly);
  if (inputs.currentGasMonthly !== undefined) appointment.energy.currentGasMonthly = number(inputs.currentGasMonthly);
  if (inputs.useBillCosts !== undefined || inputs.splitEnergyToggle !== undefined) appointment.energy.currentCostMode = bool(inputs.useBillCosts) ? 'annual' : bool(inputs.splitEnergyToggle) ? 'split' : 'monthly';
  if (inputs.elecAnnualCost !== undefined) appointment.energy.annualElectricityCost = number(inputs.elecAnnualCost);
  if (inputs.gasAnnualCost !== undefined) appointment.energy.annualGasCost = number(inputs.gasAnnualCost);
  if (inputs.currentElecExitFee !== undefined || inputs.currentEnergyExitFee !== undefined) appointment.energy.electricityExitFee = number(inputs.currentElecExitFee || inputs.currentEnergyExitFee);
  if (inputs.currentGasExitFee !== undefined) appointment.energy.gasExitFee = number(inputs.currentGasExitFee);
  if (inputs.uwEnergyMonthly !== undefined) appointment.energy.uwMonthly = number(inputs.uwEnergyMonthly);
  if (inputs.uwEnergyTier1 !== undefined) appointment.energy.uwTier1 = number(inputs.uwEnergyTier1);
  if (inputs.uwEnergyTier2 !== undefined) appointment.energy.uwTier2 = number(inputs.uwEnergyTier2);
  if (inputs.uwEnergyTier3 !== undefined) appointment.energy.uwTier3 = number(inputs.uwEnergyTier3);
  if (inputs.uwEnergyTier1 !== undefined || inputs.uwEnergyTier2 !== undefined || inputs.uwEnergyTier3 !== undefined) appointment.energy.uwQuoteMode = appointment.energy.uwTier1 || appointment.energy.uwTier2 || appointment.energy.uwTier3 ? 'tiers' : 'single';
  appointment.energy.annualElectricityKwh ||= number(inputs.electricityUsageTotalKwh || inputs.electricityUsageKwh);
  appointment.energy.annualGasKwh ||= number(inputs.gasUsageKwh);
  appointment.energy.dayKwh ||= number(inputs.electricityUsageDayKwh);
  appointment.energy.nightKwh ||= number(inputs.electricityUsageNightKwh);
  if (inputs.currentBroadbandMonthly !== undefined) appointment.broadband.currentMonthly = number(inputs.currentBroadbandMonthly);
  if (inputs.uwBroadbandMonthly !== undefined) appointment.broadband.uwMonthly = number(inputs.uwBroadbandMonthly);
  if (inputs.currentBroadbandExitFee !== undefined) appointment.broadband.exitFee = number(inputs.currentBroadbandExitFee);
  if (inputs.wholeHomeWifiToggle !== undefined) appointment.broadband.wholeHomeWifi = bool(inputs.wholeHomeWifiToggle);
  if (inputs.bbFreeMonthsToggle !== undefined) appointment.broadband.freeMonthsOffer = bool(inputs.bbFreeMonthsToggle);
  const legacySims = state.sims || ui.sims || {};
  const simValues = Array.isArray(legacySims) ? legacySims : Object.keys(legacySims).sort().map(key => legacySims[key]);
  if (simValues.length) {
    appointment.mobile.simCount = Math.min(5, simValues.length);
    appointment.mobile.sims = simValues.map((sim, index) => ({
      name: sim.name || `SIM ${index + 1}`,
      include: sim.include !== false,
      planId: sim.planId || sim.uwPlan || 'essentialMax',
      currentMonthly: number(sim.currentMonthly ?? sim.monthlyCost),
      exitFee: number(sim.exitFee)
    }));
  }
  appointment.summary.basketUrl ||= inputs.basketLink || ui.basket_url || '';
  appointment.summary.privateNotes ||= ui.notes || '';
  // Historic Income Protector is deliberately read and discarded. It never contributes to V3.
  delete appointment.services.incomeProtector;
  return normaliseAppointment(appointment);
}

export function migrateAppointment(input) {
  return legacyState(parse(input) || {});
}

export function toLegacyCompatibleAppointment(input) {
  const appointment = normaliseAppointment(input);
  const energy = appointment.energy;
  const sims = Object.fromEntries(appointment.mobile.sims.map((sim, index) => [`sim${index + 1}`, {
    name: sim.name,
    include: sim.include,
    uwPlan: sim.planId,
    monthlyCost: sim.currentMonthly,
    exitFee: sim.exitFee
  }]));
  return {
    app: 'appointment-companion',
    schema_version: 1,
    saved_at: new Date().toISOString(),
    canonical: {
      customerName: appointment.person.name,
      homeStatus: appointment.person.homeStatus,
      selectedServices: { ...appointment.services },
      basketUrl: appointment.summary.basketUrl,
      privateNotes: appointment.summary.privateNotes,
      lastQuoteSharedAt: appointment.summary.lastSharedAt,
      energy: {
        region: energy.region,
        energyFuelSelection: energy.fuel === 'dual' ? 'both' : energy.fuel,
        electricityUsageTotalKwh: energy.annualElectricityKwh || null,
        gasUsageKwh: energy.annualGasKwh || null,
        electricityUsageSource: energy.usageSource,
        gasUsageSource: energy.usageSource,
        electricityProfile: energy.electricityProfile,
        electricityUsageDayKwh: energy.dayKwh || null,
        electricityUsageNightKwh: energy.nightKwh || null
      },
      mobile: { simCount: appointment.mobile.simCount }
    },
    ui_state: {
      _v3Appointment: appointment,
      inputs: {
        customerName: appointment.person.name,
        basketLink: appointment.summary.basketUrl,
        energyHasElectricity: energy.fuel !== 'gas',
        energyHasGas: energy.fuel !== 'electricity',
        electricityUsageTotalKwh: energy.annualElectricityKwh || '',
        electricityUsageKwh: energy.annualElectricityKwh || '',
        gasUsageKwh: energy.annualGasKwh || '',
        electricityUsageDayKwh: energy.dayKwh || '',
        electricityUsageNightKwh: energy.nightKwh || '',
        electricityProfile: energy.electricityProfile,
        currentEnergyMonthly: energy.currentMonthly || '',
        currentElecMonthly: energy.currentElectricityMonthly || '',
        currentGasMonthly: energy.currentGasMonthly || '',
        useBillCosts: energy.currentCostMode === 'annual',
        splitEnergyToggle: energy.currentCostMode === 'split',
        elecAnnualCost: energy.annualElectricityCost || '',
        gasAnnualCost: energy.annualGasCost || '',
        currentElecExitFee: energy.electricityExitFee || '',
        currentGasExitFee: energy.gasExitFee || '',
        uwEnergyMonthly: energy.uwMonthly || '',
        uwEnergyTier1: energy.uwTier1 || '',
        uwEnergyTier2: energy.uwTier2 || '',
        uwEnergyTier3: energy.uwTier3 || '',
        currentBroadbandMonthly: appointment.broadband.currentMonthly || '',
        uwBroadbandMonthly: appointment.broadband.uwMonthly || '',
        currentBroadbandExitFee: appointment.broadband.exitFee || '',
        wholeHomeWifiToggle: appointment.broadband.wholeHomeWifi,
        bbFreeMonthsToggle: appointment.broadband.freeMonthsOffer,
        boilerCoverToggle: appointment.services.boilerCover
      },
      state: {
        homeowner: appointment.person.homeStatus,
        services: { energy: appointment.services.energy, broadband: appointment.services.broadband, mobile: appointment.services.mobile },
        simCount: appointment.mobile.simCount,
        sims
      }
    }
  };
}

export function migrateRecord(candidate = {}) {
  const appointment = migrateAppointment(candidate.appointment_state || candidate.appointment_state_json || candidate.data || candidate);
  return {
    local_id: candidate.local_id || '',
    cloud_id: candidate.cloud_id || candidate.customer_id || '',
    customer_name: candidate.customer_name || candidate.customerName || appointment.person.name,
    appointment_state: appointment,
    specialist_state: candidate.specialist_state || candidate.specialists || {},
    basket_url: candidate.basket_url || appointment.summary.basketUrl,
    cloud_customer: candidate.cloud_customer || null,
    local_revision: Number(candidate.local_revision || 0),
    cloud_synced_local_revision: Number(candidate.cloud_synced_local_revision || 0),
    client_revision_id: candidate.client_revision_id || '',
    base_cloud_revision: candidate.base_cloud_revision || candidate.cloud_revision || candidate.last_cloud_updated_at || '',
    base_cloud_snapshot: candidate.base_cloud_snapshot || candidate.cloud_customer || null,
    sync_state: candidate.sync_state === 'synced' ? 'synced' : 'pending',
    deleted: bool(candidate.deleted),
    tombstone: bool(candidate.tombstone),
    deletion_requested_at: candidate.deletion_requested_at || '',
    conflict: candidate.conflict || null,
    conflict_history: Array.isArray(candidate.conflict_history) ? candidate.conflict_history : [],
    created_at: candidate.created_at || candidate.savedAt || '',
    updated_at: candidate.updated_at || candidate.savedAt || ''
  };
}
