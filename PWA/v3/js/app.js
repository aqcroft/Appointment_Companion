import { VERSION } from './config/version.js';
import { TOOLS } from './config/tools.js';
import { calculateAppointment } from './appointment/calculations.js';
import { calculateAnnualDayNightSplit, calculateEconomy7AnnualCost } from './energy/split-helper.js';
import { UW_RULES_2026_10_01 } from './rules/uw-rules-2026-10-01.js';
import { createAppointment, createSim, clone, normaliseAppointment, normaliseName, REGIONS } from './state/canonical-state.js';
import { customerStore } from './state/customer-store.js';
import { getCloudAuth, setCloudAuth, syncAll, markDeleted, resolveConflict } from './state/cloud-sync.js';
import { buildShareData, buildShareUrl, decodeShareData, figuresText } from './summary/share-data.js';
import { UnsavedWorkGuard } from './shell/unsaved-work-guard.js';
import { launchTool } from './specialists/launcher.js';

const app = document.getElementById('app');
const nav = document.getElementById('globalNav');
const saveState = document.getElementById('saveState');
const personChip = document.getElementById('activePersonChip');
const peopleDialog = document.getElementById('peopleDialog');
const shareDialog = document.getElementById('shareDialog');
const toastElement = document.getElementById('toast');
const CURRENT_KEY = 'apptCompanionV3Current';
const BRAND_KEY = 'apptCompanionV3Partner';

let currentRecord = null;
let appointment = createAppointment();
let persistedAppointment = clone(appointment);
let people = [];
let view = 'launchpad';
let section = 'save';
let autosaveTimer = null;
let syncTimer = null;
let syncRetryMs = 2500;
let selectedPeople = new Set();

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const checked = value => value ? ' checked' : '';
const selected = (value, expected) => String(value) === String(expected) ? ' selected' : '';
const on = (value, expected = true) => value === expected ? ' on' : '';
const field = (path, value, attrs = '') => `<input data-field="${path}" value="${escapeHtml(value || '')}" ${attrs}>`;

function toast(message) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  clearTimeout(toastElement._timer);
  toastElement._timer = setTimeout(() => toastElement.classList.remove('show'), 2200);
}

function branding() {
  try { return { role: 'Independent UW Partner', ...JSON.parse(localStorage.getItem(BRAND_KEY) || '{}') }; }
  catch { return { role: 'Independent UW Partner' }; }
}

function setSaveState(text, tone = '') {
  saveState.textContent = text;
  saveState.className = `save-state ${tone}`;
}

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split('.');
  const final = keys.pop();
  const parent = keys.reduce((value, key) => value[key] ??= {}, object);
  parent[final] = value;
}

function inputValue(element) {
  if (element.type === 'checkbox') return element.checked;
  if (element.type === 'number' || element.dataset.type === 'number') return Math.max(0, Number(element.value) || 0);
  return element.value;
}

const guard = new UnsavedWorkGuard({
  modal: document.getElementById('unsavedDialog'),
  save: () => persistActive(false),
  restore: async () => {
    appointment = clone(persistedAppointment);
    guard.initialise(appointment);
    render();
  }
});

function markChanged() {
  appointment = normaliseAppointment(appointment);
  guard.changed(appointment);
  setSaveState(currentRecord ? 'Saving locally…' : 'Add name to save');
  clearTimeout(autosaveTimer);
  if (appointment.person.name) autosaveTimer = setTimeout(() => persistActive(true).catch(saveFailed), 450);
}

function saveFailed(error) {
  setSaveState('Local save needs attention', 'bad');
  toast(error?.message || 'Local save failed. Keep this page open.');
}

async function persistActive(silent = true) {
  clearTimeout(autosaveTimer);
  if (!appointment.person.name) throw new Error("Add the person's name before saving.");
  currentRecord = await customerStore.put({
    ...(currentRecord || {}),
    local_id: currentRecord?.local_id || customerStore.makeId(),
    appointment_state: appointment,
    customer_name: appointment.person.name,
    basket_url: appointment.summary.basketUrl,
    specialist_state: currentRecord?.specialist_state || {}
  });
  sessionStorage.setItem(CURRENT_KEY, currentRecord.local_id);
  appointment = normaliseAppointment(currentRecord.appointment_state);
  persistedAppointment = clone(appointment);
  guard.persisted(appointment);
  setSaveState(currentRecord.sync_state === 'synced' ? 'Saved · Cloud synced' : 'Saved on this device', 'good');
  people = await customerStore.list();
  if (!silent) toast('Saved safely on this device.');
  scheduleSync();
  updateHeader();
  return currentRecord;
}

function scheduleSync(delay = 900) {
  clearTimeout(syncTimer);
  if (!getCloudAuth()) return;
  syncTimer = setTimeout(async () => {
    try {
      setSaveState('Cloud syncing…');
      await syncAll();
      syncRetryMs = 2500;
      people = await customerStore.list();
      if (currentRecord) currentRecord = await customerStore.get(currentRecord.local_id);
      setSaveState('Saved · Cloud synced', 'good');
      if (view === 'more') render();
    } catch {
      setSaveState('Saved locally · Cloud pending');
      syncRetryMs = Math.min(syncRetryMs * 2, 120000);
      scheduleSync(syncRetryMs);
    }
  }, delay);
}

async function loadPerson(localId) {
  if (currentRecord?.local_id !== localId && !(await guard.confirmNavigation())) return;
  const record = await customerStore.get(localId);
  if (!record || record.deleted) return;
  currentRecord = record;
  appointment = normaliseAppointment(record.appointment_state);
  persistedAppointment = clone(appointment);
  guard.initialise(appointment);
  sessionStorage.setItem(CURRENT_KEY, record.local_id);
  section = 'save';
  view = 'profile';
  peopleDialog.close();
  render();
}

async function consumeSpecialistReturn() {
  let payload;
  try {
    payload = JSON.parse(localStorage.getItem('apptCompanionV3SpecialistReturn') || 'null');
    localStorage.removeItem('apptCompanionV3SpecialistReturn');
  } catch { return; }
  if (!payload?.tool || !payload?.localId) return;
  const record = await customerStore.get(payload.localId);
  if (!record || record.deleted) return;
  record.specialist_state = { ...(record.specialist_state || {}), [payload.tool]: payload.state || {} };
  record.appointment_state.activity = [...(record.appointment_state.activity || []), { type: `${payload.tool}_explored`, at: payload.savedAt || new Date().toISOString() }].slice(-20);
  const saved = await customerStore.put(record);
  if (currentRecord?.local_id === saved.local_id) {
    currentRecord = saved;
    appointment = normaliseAppointment(saved.appointment_state);
    persistedAppointment = clone(appointment);
    guard.persisted(appointment);
  }
  people = await customerStore.list();
}

async function leavePerson() {
  if (!(await guard.confirmNavigation())) return;
  currentRecord = null;
  appointment = createAppointment();
  persistedAppointment = clone(appointment);
  guard.initialise(appointment);
  sessionStorage.removeItem(CURRENT_KEY);
  view = 'launchpad';
  render();
}

function updateHeader() {
  const active = Boolean(currentRecord && appointment.person.name);
  personChip.hidden = !active;
  personChip.textContent = active ? `👤 ${appointment.person.name}` : '';
  nav.hidden = document.documentElement.classList.contains('shared-view');
  nav.querySelectorAll('[data-section]').forEach(button => button.classList.toggle('active', button.dataset.section === section));
}

function relativeDate(value) {
  if (!value) return 'No activity date';
  const date = new Date(value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}

function personRow(record, selectable = false) {
  const clue = `${relativeDate(record.updated_at)} · ${Object.entries(record.appointment_state?.services || {}).filter(([, enabled]) => enabled).map(([name]) => name).join(', ') || 'No services yet'}`;
  return `<div class="person-row">
    ${selectable ? `<input class="person-select" type="checkbox" data-select-person="${record.local_id}" aria-label="Select ${escapeHtml(record.customer_name)}"${checked(selectedPeople.has(record.local_id))}>` : ''}
    <button type="button" class="open-person" data-open-person="${record.local_id}"><strong>${escapeHtml(record.customer_name)}</strong><small>${escapeHtml(clue)}</small></button>
    ${selectable ? `<button type="button" class="danger-quiet" data-delete-person="${record.local_id}" aria-label="Delete ${escapeHtml(record.customer_name)}">🗑</button>` : ''}
  </div>`;
}

function renderLaunchpad(query = '') {
  const matches = query ? people.filter(person => normaliseName(person.customer_name).includes(normaliseName(query))).slice(0, 8) : [];
  app.innerHTML = `<div class="stack">
    <section class="card hero">
      <div class="eyebrow">Appointment Companion V3</div>
      <h1>Who are you talking to?</h1>
      <p class="lead">Start with a name. The conversation can become Save Money, EV, Should I Fix or something else later.</p>
      <form class="launch-form" id="personForm">
        <input id="personNameInput" name="name" autocomplete="off" maxlength="80" placeholder="Person's name" aria-label="Person's name" value="${escapeHtml(query)}">
        <button class="primary" type="submit">Start</button>
      </form>
      <div id="duplicateWarning"></div>
      <div id="personSearchResults"></div>
    </section>
    <section class="card">
      <div class="section-title"><div><div class="eyebrow">Quick return</div><h2>Recent people</h2></div><button class="quiet" type="button" data-manage-people>All people</button></div>
      <div class="recent-list">${people.slice(0, 3).map(row => personRow(row)).join('') || '<p class="lead">Saved people will appear here after you add a name.</p>'}</div>
    </section>
    ${query ? `<section class="card"><h2>Search results</h2><div class="recent-list">${matches.map(row => personRow(row)).join('') || '<p class="lead">No matching saved people.</p>'}</div></section>` : ''}
    <section class="card flat"><div class="action-row"><button class="secondary" type="button" data-section="tools">Open a standalone tool</button><button class="quiet" type="button" data-section="more">Cloud &amp; settings</button></div></section>
  </div>`;
}

function progress() {
  const active = Object.values(appointment.services).filter(Boolean).length;
  const detailed = [appointment.services.energy && (appointment.energy.currentMonthly || appointment.energy.annualElectricityCost || appointment.energy.currentElectricityMonthly), appointment.services.broadband && appointment.broadband.uwMonthly, appointment.services.mobile && appointment.mobile.sims.some(sim => sim.currentMonthly), appointment.services.boilerCover].filter(Boolean).length;
  return active ? Math.min(100, Math.round((detailed / active) * 100)) : 0;
}

function renderProfile() {
  const result = calculateAppointment(appointment);
  const pct = progress();
  app.innerHTML = `<div class="stack">
    <section class="card hero">
      <div class="eyebrow">Save Money · active person</div><h1>${escapeHtml(appointment.person.name)}</h1>
      <p class="lead">Continue this person's appointment or use their shared Energy context in a specialist tool.</p>
    </section>
    <section class="card">
      <div class="section-title"><div><div class="eyebrow">Appointment first</div><h2>${pct ? 'Continue appointment' : 'Start appointment'}</h2></div><strong>${pct}%</strong></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <p class="lead">${Object.entries(appointment.services).filter(([, enabled]) => enabled).map(([name]) => name).join(' · ') || 'No services selected yet.'}</p>
      <button class="primary" type="button" data-go="appointment">${pct ? 'Continue appointment' : 'Start appointment'}</button>
    </section>
    <section class="card">
      <div class="section-title"><div><div class="eyebrow">At a glance</div><h2>First-year picture</h2></div><strong class="money ${result.yearOneResult >= 0 ? 'good' : 'bad'}">${result.yearOneResult >= 0 ? '' : '−'}£${money(Math.abs(result.yearOneResult))}</strong></div>
      <div class="metric-grid"><div class="metric"><small>Service count</small><strong>${result.rules.serviceCount}</strong></div><div class="metric"><small>Energy tariff</small><strong>${result.rules.energyTariff || '—'}</strong></div><div class="metric"><small>Welcome Bonus</small><strong>£${result.welcomeBonus}</strong></div></div>
      <div class="action-row" style="margin-top:12px"><button class="secondary" type="button" data-go="summary">View summary</button><button class="quiet" type="button" data-share>Share summary</button></div>
    </section>
    <section class="card"><div class="eyebrow">Tools for this person</div><h2>Use known Energy details</h2><div class="grid-2">
      <button class="quiet tool-card" type="button" data-tool="fix"><span class="tool-icon">📈</span><span class="tool-copy"><strong>Should I Fix?</strong><small>Region and usage prefilled</small></span></button>
      <button class="quiet tool-card" type="button" data-tool="ev"><span class="tool-icon">🚙</span><span class="tool-copy"><strong>EV Companion</strong><small>Profile-linked, still standalone</small></span></button>
    </div></section>
    <section class="card"><div class="section-title"><h2>Notes</h2><small class="hint">Private · never shared</small></div><textarea data-field="summary.privateNotes" placeholder="Lightweight appointment notes">${escapeHtml(appointment.summary.privateNotes)}</textarea>${appointment.activity.length ? `<div class="subpanel"><div class="eyebrow">Recent activity</div>${appointment.activity.slice(-3).reverse().map(item => `<p class="hint">${escapeHtml(item.type.replaceAll('_',' '))} · ${relativeDate(item.at)}</p>`).join('')}</div>` : ''}</section>
    <section class="card flat"><div class="action-row"><button class="quiet" type="button" data-manage-people>Manage people</button><button class="quiet" type="button" data-new-person>Talk to someone else</button></div></section>
  </div>`;
}

function serviceState(name) {
  if (!appointment.services[name]) return 'Not started';
  if (name === 'energy') return appointment.energy.currentMonthly || appointment.energy.annualElectricityCost || appointment.energy.currentElectricityMonthly ? 'In progress' : 'Selected';
  if (name === 'broadband') return appointment.broadband.uwMonthly ? 'In progress' : 'Selected';
  if (name === 'mobile') return appointment.mobile.sims.some(sim => sim.currentMonthly) ? 'In progress' : 'Selected';
  return 'Complete';
}

function serviceCard(name, icon, label, detail) {
  return `<button type="button" class="service-card${on(appointment.services[name])}" data-service="${name}"><span class="state">${serviceState(name)}</span><span class="icon">${icon}</span><strong>${label}</strong><small>${detail}</small></button>`;
}

function renderEnergy() {
  const energy = appointment.energy;
  const split = calculateAnnualDayNightSplit(energy.annualElectricityKwh, energy.splitSampleDayKwh, energy.splitSampleNightKwh);
  const e7CurrentAnnual = calculateEconomy7AnnualCost({ dayKwh: energy.dayKwh, nightKwh: energy.nightKwh, dayRate: energy.currentDayRate, nightRate: energy.currentNightRate, standingCharge: energy.currentStandingCharge });
  const e7Saving = e7CurrentAnnual && energy.e7StandardAnnualCost ? e7CurrentAnnual - energy.e7StandardAnnualCost : 0;
  return `<section class="card" id="energyPanel"><div class="section-title"><div><div class="eyebrow">Energy</div><h2>Keep the common case simple</h2></div><span class="hint">Indicative - based on usage entered.</span></div>
    <div class="grid-2"><label class="field"><span>Region</span><select data-field="energy.region">${REGIONS.map(([id, label]) => `<option value="${id}"${selected(energy.region, id)}>${id} ${label}</option>`).join('')}</select></label><label class="field"><span>Usage source</span><select data-field="energy.usageSource"><option value="actual"${selected(energy.usageSource, 'actual')}>From bill / actual</option><option value="estimated"${selected(energy.usageSource, 'estimated')}>Estimated</option></select></label></div>
    <div class="subpanel"><span class="hint">Fuel</span><div class="pills"><button class="pill${on(energy.fuel, 'electricity')}" type="button" data-choice="energy.fuel" data-value="electricity">Electricity only</button><button class="pill${on(energy.fuel, 'gas')}" type="button" data-choice="energy.fuel" data-value="gas">Gas only</button><button class="pill${on(energy.fuel, 'dual')}" type="button" data-choice="energy.fuel" data-value="dual">Dual fuel</button></div></div>
    <div class="grid-2 subpanel">
      ${energy.fuel !== 'gas' ? `<label class="field"><span>Annual electricity usage (kWh)</span>${field('energy.annualElectricityKwh', energy.annualElectricityKwh, 'type="number" inputmode="numeric" min="0"')}<span class="pills"><button class="pill" type="button" data-estimate-path="energy.annualElectricityKwh" data-estimate-value="1600">Low</button><button class="pill" type="button" data-estimate-path="energy.annualElectricityKwh" data-estimate-value="2500">Typical</button><button class="pill" type="button" data-estimate-path="energy.annualElectricityKwh" data-estimate-value="3800">High</button></span></label>` : ''}
      ${energy.fuel !== 'electricity' ? `<label class="field"><span>Annual gas usage (kWh)</span>${field('energy.annualGasKwh', energy.annualGasKwh, 'type="number" inputmode="numeric" min="0"')}<span class="pills"><button class="pill" type="button" data-estimate-path="energy.annualGasKwh" data-estimate-value="7500">Low</button><button class="pill" type="button" data-estimate-path="energy.annualGasKwh" data-estimate-value="11500">Typical</button><button class="pill" type="button" data-estimate-path="energy.annualGasKwh" data-estimate-value="17000">High</button></span></label>` : ''}
    </div>
    ${energy.fuel !== 'gas' ? `<label class="person-row subpanel"><input type="checkbox" data-field="energy.peakOffPeak"${checked(energy.peakOffPeak)}><span><strong>Peak &amp; off-peak electricity?</strong><small>Off by default. Reveals Economy 7 / EV details.</small></span></label>` : ''}
    ${energy.peakOffPeak && energy.fuel !== 'gas' ? `<div class="subpanel"><div class="pills"><button class="pill${on(energy.electricityProfile, 'economy7')}" type="button" data-choice="energy.electricityProfile" data-value="economy7">Economy 7</button><button class="pill${on(energy.electricityProfile, 'ev')}" type="button" data-choice="energy.electricityProfile" data-value="ev">EV</button></div><div class="grid-2" style="margin-top:10px"><label class="field"><span>Annual day usage</span>${field('energy.dayKwh', energy.dayKwh, 'type="number" min="0"')}</label><label class="field"><span>Annual night usage</span>${field('energy.nightKwh', energy.nightKwh, 'type="number" min="0"')}</label></div>
      <details class="advanced" style="margin-top:12px"><summary>Estimate annual day/night split</summary><div class="grid-2"><label class="field"><span>Recent period day kWh</span>${field('energy.splitSampleDayKwh', energy.splitSampleDayKwh, 'type="number" min="0"')}</label><label class="field"><span>Recent period night kWh</span>${field('energy.splitSampleNightKwh', energy.splitSampleNightKwh, 'type="number" min="0"')}</label></div><p class="notice">${split.annualDayKwh || split.annualNightKwh ? `${split.dayPercent.toFixed(1)}% day / ${split.nightPercent.toFixed(1)}% night → about ${split.annualDayKwh} day and ${split.annualNightKwh} night kWh a year.` : 'Add total annual use and a matching sample of day/night use.'}</p><button class="secondary" type="button" data-apply-split ${split.annualDayKwh || split.annualNightKwh ? '' : 'disabled'}>Use these annual figures</button></details>
      <details class="advanced" style="margin-top:12px"><summary>Current Economy 7 / EV tariff detail</summary><div class="grid-3"><label class="field"><span>Day rate p/kWh</span>${field('energy.currentDayRate', energy.currentDayRate, 'type="number" min="0" step="0.01"')}</label><label class="field"><span>Night rate p/kWh</span>${field('energy.currentNightRate', energy.currentNightRate, 'type="number" min="0" step="0.01"')}</label><label class="field"><span>Standing p/day</span>${field('energy.currentStandingCharge', energy.currentStandingCharge, 'type="number" min="0" step="0.01"')}</label></div><label class="field" style="margin-top:10px"><span>Indicative standard alternative annual cost</span>${field('energy.e7StandardAnnualCost', energy.e7StandardAnnualCost, 'type="number" min="0" step="0.01"')}<small>Enter the central tariff comparison result; V3 derives the difference from the E7 facts above.</small></label>${e7CurrentAnnual && energy.e7StandardAnnualCost ? `<p class="notice ${e7Saving < 0 ? 'warn' : ''}">${e7Saving >= 0 ? `Moving off Economy 7 could save about £${money(e7Saving)}/year.` : `Economy 7 is about £${money(Math.abs(e7Saving))}/year lower on these figures.`}</p>` : ''}</details></div>` : ''}
    <div class="subpanel"><span class="hint">Current cost route</span><div class="pills"><button class="pill${on(energy.currentCostMode, 'monthly')}" type="button" data-choice="energy.currentCostMode" data-value="monthly">Monthly payment</button><button class="pill${on(energy.currentCostMode, 'split')}" type="button" data-choice="energy.currentCostMode" data-value="split">Split electricity / gas</button><button class="pill${on(energy.currentCostMode, 'annual')}" type="button" data-choice="energy.currentCostMode" data-value="annual">Annual bill cost</button></div>
      <div class="grid-2" style="margin-top:10px">${energy.currentCostMode === 'monthly' ? `<label class="field"><span>Current monthly payment</span>${field('energy.currentMonthly', energy.currentMonthly, 'type="number" min="0" step="0.01"')}</label>` : energy.currentCostMode === 'split' ? `${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity / month</span>${field('energy.currentElectricityMonthly', energy.currentElectricityMonthly, 'type="number" min="0" step="0.01"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas / month</span>${field('energy.currentGasMonthly', energy.currentGasMonthly, 'type="number" min="0" step="0.01"')}</label>` : ''}` : `${energy.fuel !== 'gas' ? `<label class="field"><span>Annual electricity cost</span>${field('energy.annualElectricityCost', energy.annualElectricityCost, 'type="number" min="0" step="0.01"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Annual gas cost</span>${field('energy.annualGasCost', energy.annualGasCost, 'type="number" min="0" step="0.01"')}</label>` : ''}`}</div>
    </div>
    <div class="grid-2 subpanel"><label class="field"><span>Electricity exit fee</span>${field('energy.electricityExitFee', energy.electricityExitFee, 'type="number" min="0"')}</label><label class="field"><span>Gas exit fee</span>${field('energy.gasExitFee', energy.gasExitFee, 'type="number" min="0"')}</label></div>
    <div class="subpanel"><span class="hint">UW Energy quote</span><div class="pills"><button class="pill${on(energy.uwQuoteMode, 'single')}" type="button" data-choice="energy.uwQuoteMode" data-value="single">Single quote</button><button class="pill${on(energy.uwQuoteMode, 'tiers')}" type="button" data-choice="energy.uwQuoteMode" data-value="tiers">Bundle tiers</button></div><div class="grid-3" style="margin-top:10px">${energy.uwQuoteMode === 'tiers' ? [1,2,3].map(tier => `<label class="field"><span>${tier}-service / month</span>${field(`energy.uwTier${tier}`, energy[`uwTier${tier}`], 'type="number" min="0" step="0.01"')}</label>`).join('') : `<label class="field"><span>UW monthly amount</span>${field('energy.uwMonthly', energy.uwMonthly, 'type="number" min="0" step="0.01"')}</label>`}<label class="field"><span>Quote status</span><select data-field="energy.quoteStatus"><option value="indicative"${selected(energy.quoteStatus, 'indicative')}>Indicative</option><option value="manual"${selected(energy.quoteStatus, 'manual')}>Manually entered</option><option value="confirmed"${selected(energy.quoteStatus, 'confirmed')}>Confirmed UW quote</option></select></label></div></div>
    <details class="advanced subpanel"><summary>Advanced Energy adjustment</summary><label class="person-row"><input type="checkbox" data-field="energy.adjustmentEnabled"${checked(energy.adjustmentEnabled)}><span><strong>Use a manual Energy adjustment</strong><small>For E7, EV, solar or unusual billing complexity.</small></span></label>${energy.adjustmentEnabled ? `<div class="grid-3" style="margin-top:10px"><label class="field"><span>Apply to</span><select data-field="energy.adjustmentTarget"><option value="current"${selected(energy.adjustmentTarget,'current')}>Current</option><option value="uw"${selected(energy.adjustmentTarget,'uw')}>UW</option></select></label><label class="field"><span>Period</span><select data-field="energy.adjustmentPeriod"><option value="monthly"${selected(energy.adjustmentPeriod,'monthly')}>Monthly</option><option value="annual"${selected(energy.adjustmentPeriod,'annual')}>Annual</option></select></label><label class="field"><span>Amount</span>${field('energy.adjustmentAmount', energy.adjustmentAmount, 'type="number" min="0" step="0.01"')}</label></div>` : ''}</details>
  </section>`;
}

function renderBroadband() {
  const bb = appointment.broadband;
  return `<section class="card"><div class="eyebrow">Broadband</div><h2>Current vs UW</h2><div class="grid-2"><label class="field"><span>Current / month</span>${field('broadband.currentMonthly', bb.currentMonthly, 'type="number" min="0" step="0.01"')}</label><label class="field"><span>UW / month</span>${field('broadband.uwMonthly', bb.uwMonthly, 'type="number" min="0" step="0.01"')}</label><label class="field"><span>Package</span><select data-field="broadband.packageId"><option value="">Select / manual</option><option value="fibre900"${selected(bb.packageId,'fibre900')}>Full Fibre 900</option><option value="fibre500"${selected(bb.packageId,'fibre500')}>Full Fibre 500</option><option value="fibre150"${selected(bb.packageId,'fibre150')}>Full Fibre 150</option><option value="ultraPlus"${selected(bb.packageId,'ultraPlus')}>Ultra+</option><option value="ultra"${selected(bb.packageId,'ultra')}>Ultra</option></select></label><label class="field"><span>Exit fee</span>${field('broadband.exitFee', bb.exitFee, 'type="number" min="0"')}</label><label class="field"><span>Home phone / month</span>${field('broadband.homePhoneMonthly', bb.homePhoneMonthly, 'type="number" min="0" step="0.01"')}</label></div><label class="person-row"><input type="checkbox" data-field="broadband.wholeHomeWifi"${checked(bb.wholeHomeWifi)}><span><strong>Whole Home Wi-Fi (+£5/month)</strong></span></label>${appointment.person.homeStatus === 'homeowner' ? `<label class="person-row"><input type="checkbox" data-field="broadband.freeMonthsOffer"${checked(bb.freeMonthsOffer)}><span><strong>Eligible broadband free-month offer</strong><small>Preserved appointment offer logic; calculated across April where relevant.</small></span></label>` : ''}</section>`;
}

function renderMobile() {
  return `<section class="card"><div class="eyebrow">Mobile</div><h2>${appointment.mobile.simCount} SIM${appointment.mobile.simCount === 1 ? '' : 's'}</h2><div class="pills">${[1,2,3,4,5].map(count => `<button class="pill${on(appointment.mobile.simCount,count)}" type="button" data-sim-count="${count}">${count} SIM${count === 1 ? '' : 's'}</button>`).join('')}</div><div class="stack subpanel">${appointment.mobile.sims.map((sim,index) => `<div class="sim"><div class="sim-head"><label class="field" style="flex:1"><span>SIM label</span>${field(`mobile.sims.${index}.name`,sim.name,'maxlength="40"')}</label><label><input type="checkbox" data-field="mobile.sims.${index}.include"${checked(sim.include)}> Include</label></div><div class="grid-2"><label class="field"><span>Current / month</span>${field(`mobile.sims.${index}.currentMonthly`,sim.currentMonthly,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Exit fee</span>${field(`mobile.sims.${index}.exitFee`,sim.exitFee,'type="number" min="0"')}</label></div><div class="pills" style="margin-top:10px"><button class="pill${on(sim.planId,'essentialMax')}" type="button" data-sim-plan="${index}" data-value="essentialMax">Go Essentials · £6</button><button class="pill${on(sim.planId,'unlimitedMax')}" type="button" data-sim-plan="${index}" data-value="unlimitedMax">Go Unlimited · £13</button></div>${sim.planId === 'unlimitedMax' && appointment.mobile.sims.slice(0,index).some(item => item.include && item.planId === 'unlimitedMax') ? '<p class="notice">Additional Go Unlimited: first 3 months free, then £13/month.</p>' : ''}</div>`).join('')}</div></section>`;
}

function renderAdjustments() {
  const a = appointment.adjustments;
  return `<section class="card"><details class="advanced"><summary>Cashback Card &amp; advanced adjustments</summary><label class="person-row"><input type="checkbox" data-field="cashback.enabled"${checked(appointment.cashback.enabled)}><span><strong>Include Cashback Card estimate</strong><small>Appointment calculation, separate from the PET toolbar shortcut.</small></span></label>${appointment.cashback.enabled ? `<div class="grid-2"><label class="field"><span>Monthly card spend</span>${field('cashback.monthlySpend',appointment.cashback.monthlySpend,'type="number" min="0" step="50"')}</label><label class="field"><span>Estimate basis</span><select data-field="cashback.tier"><option value="low"${selected(appointment.cashback.tier,'low')}>1% capped</option><option value="average"${selected(appointment.cashback.tier,'average')}>Average active cardholder</option><option value="high"${selected(appointment.cashback.tier,'high')}>Top earners</option></select></label></div>` : ''}<label class="person-row"><input type="checkbox" data-field="adjustments.recurringEnabled"${checked(a.recurringEnabled)}><span><strong>Manual recurring adjustment</strong></span></label>${a.recurringEnabled ? `<div class="grid-2"><label class="field"><span>Current amount</span>${field('adjustments.currentAmount',a.currentAmount,'type="number" min="0" step="0.01"')}</label><label class="field"><span>UW amount</span>${field('adjustments.uwAmount',a.uwAmount,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Current reason</span>${field('adjustments.currentReason',a.currentReason)}</label><label class="field"><span>UW reason</span>${field('adjustments.uwReason',a.uwReason)}</label><label class="field"><span>Period</span><select data-field="adjustments.period"><option value="monthly"${selected(a.period,'monthly')}>Monthly</option><option value="annual"${selected(a.period,'annual')}>Annual</option></select></label></div>` : ''}<label class="person-row"><input type="checkbox" data-field="adjustments.oneOffEnabled"${checked(a.oneOffEnabled)}><span><strong>One-off benefit or charge</strong></span></label>${a.oneOffEnabled ? `<div class="grid-3"><label class="field"><span>Type</span><select data-field="adjustments.oneOffType"><option value="benefit"${selected(a.oneOffType,'benefit')}>Benefit/refund</option><option value="charge"${selected(a.oneOffType,'charge')}>Charge</option></select></label><label class="field"><span>Amount</span>${field('adjustments.oneOffAmount',a.oneOffAmount,'type="number" min="0"')}</label><label class="field"><span>Label</span>${field('adjustments.oneOffLabel',a.oneOffLabel)}</label></div>` : ''}</details></section>`;
}

function renderAppointment() {
  const result = calculateAppointment(appointment);
  const home = appointment.person.homeStatus;
  app.innerHTML = `<div class="result-bar"><div><small>First-year result</small><strong data-live-year class="${result.yearOneResult >= 0 ? '' : 'money bad'}">${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</strong></div><button class="secondary" type="button" data-go="summary">Summary</button></div>
  <div class="appointment-columns"><div class="stack"><section class="card"><div class="section-title"><div><div class="eyebrow">${escapeHtml(appointment.person.name)}</div><h1>Save Money appointment</h1></div><button class="quiet" type="button" data-go="profile">Profile</button></div><div class="pills"><button class="pill${on(home,'homeowner')}" type="button" data-choice="person.homeStatus" data-value="homeowner">Homeowner</button><button class="pill${on(home,'tenant')}" type="button" data-choice="person.homeStatus" data-value="tenant">Tenant</button></div></section>
  <section class="card"><div class="eyebrow">Services</div><h2>What are you exploring?</h2><div class="service-grid">${serviceCard('energy','⚡','Energy','Electricity, gas or dual fuel')}${serviceCard('broadband','🛜','Broadband','Package and useful add-ons')}${serviceCard('mobile','📱','Mobile','1-5 SIMs')}${home === 'tenant' ? `<div class="service-card" aria-disabled="true"><span class="state">Homeowners only</span><span class="icon">🛡️</span><strong>Boiler Cover</strong><small>Unavailable for tenants</small></div>` : serviceCard('boilerCover','🛡️','Boiler Cover','£25/month · no introductory benefit')}</div>
  ${appointment.services.energy ? `<div class="subpanel"><div class="pills"><button class="pill${on(appointment.energy.fuel,'electricity')}" type="button" data-choice="energy.fuel" data-value="electricity">Electricity only</button><button class="pill${on(appointment.energy.fuel,'gas')}" type="button" data-choice="energy.fuel" data-value="gas">Gas only</button><button class="pill${on(appointment.energy.fuel,'dual')}" type="button" data-choice="energy.fuel" data-value="dual">Dual fuel</button></div></div>` : ''}
  ${appointment.services.mobile ? `<div class="subpanel"><div class="pills">${[1,2,3,4,5].map(count => `<button class="pill${on(appointment.mobile.simCount,count)}" type="button" data-sim-count="${count}">${count} SIM${count === 1 ? '' : 's'}</button>`).join('')}</div></div>` : ''}</section>
  ${appointment.services.energy ? renderEnergy() : ''}${appointment.services.broadband ? renderBroadband() : ''}${appointment.services.mobile ? renderMobile() : ''}
  ${appointment.services.boilerCover ? `<section class="card"><div class="eyebrow">Boiler Cover</div><h2>Homeowner service</h2><p class="lead">£25/month. Boiler Cover contributes to applicable service rules. The retired three-month introductory benefit is not included.</p></section>` : ''}
  <section class="card"><div class="eyebrow">Benefits</div><h2>Referral route</h2><label class="person-row"><input type="checkbox" data-field="benefits.referral"${checked(appointment.benefits.referral)}><span><strong>Standard referral</strong><small>£50 when eligible; homeowner-only.</small></span></label><label class="person-row"><input type="checkbox" data-field="benefits.nationalLeague"${checked(appointment.benefits.nationalLeague)}><span><strong>National League</strong><small>£50 club-shop voucher when eligible.</small></span></label></section>${renderAdjustments()}
  <section class="card"><div class="action-row"><button class="primary" type="button" data-save>Save appointment</button><button class="secondary" type="button" data-go="summary">Build summary</button></div></section></div>
  <aside class="stack sticky-column"><section class="card"><div class="eyebrow">Live basket rules</div><h2>Three distinct outputs</h2><div class="metric-grid"><div class="metric"><small>Service count</small><strong data-live-service>${result.rules.serviceCount}</strong></div><div class="metric"><small>Energy tariff</small><strong data-live-tariff>${result.rules.energyTariff ? `${result.rules.energyTariff}-service` : '—'}</strong></div><div class="metric"><small>Welcome Bonus</small><strong data-live-welcome>£${result.welcomeBonus}</strong></div></div><div class="summary-table" style="margin-top:12px"><div class="summary-line"><span>Current / month</span><strong data-live-current>£${money(result.current.total)}</strong></div><div class="summary-line"><span>UW / month</span><strong data-live-uw>£${money(result.uw.total)}</strong></div><div class="summary-line"><span>Mobile intro benefit</span><strong data-live-mobile>£${money(result.mobileIntroBenefit)}</strong></div><div class="summary-line"><span>Boiler intro benefit</span><strong>£0</strong></div></div></section><section class="card"><div class="eyebrow">Official quote companion</div><p class="lead">Indicative values support the conversation. Confirm prices and orders in the official UW quote process.</p></section></aside></div>`;
}

function updateLiveResults() {
  if (view !== 'appointment') return;
  const result = calculateAppointment(appointment);
  const set = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
  set('[data-live-year]', `${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}`);
  set('[data-live-service]', result.rules.serviceCount);
  set('[data-live-tariff]', result.rules.energyTariff ? `${result.rules.energyTariff}-service` : '—');
  set('[data-live-welcome]', `£${result.welcomeBonus}`);
  set('[data-live-current]', `£${money(result.current.total)}`);
  set('[data-live-uw]', `£${money(result.uw.total)}`);
  set('[data-live-mobile]', `£${money(result.mobileIntroBenefit)}`);
}

function summaryLines(result) {
  return `<div class="summary-table"><div class="summary-line"><span>Current monthly cost</span><strong>£${money(result.current.total)}</strong></div><div class="summary-line"><span>UW monthly cost</span><strong>£${money(result.uw.total)}</strong></div><div class="summary-line"><span>Monthly service saving</span><strong class="money ${result.monthlyServiceSaving >= 0 ? 'good' : 'bad'}">${result.monthlyServiceSaving < 0 ? '−' : ''}£${money(Math.abs(result.monthlyServiceSaving))}</strong></div><div class="summary-line"><span>Welcome Bonus</span><strong>£${money(result.welcomeBonus)}</strong></div>${result.mobileIntroBenefit ? `<div class="summary-line"><span>Additional Unlimited first 3 months</span><strong>£${money(result.mobileIntroBenefit)}</strong></div>` : ''}${result.broadbandIntroBenefit ? `<div class="summary-line"><span>Broadband introductory benefit</span><strong>£${money(result.broadbandIntroBenefit)}</strong></div>` : ''}${result.referral ? `<div class="summary-line"><span>Referral</span><strong>£${money(result.referral)}</strong></div>` : ''}${result.nationalLeague ? `<div class="summary-line"><span>National League voucher</span><strong>£${money(result.nationalLeague)}</strong></div>` : ''}${result.exitFeeDeduction ? `<div class="summary-line"><span>Exit-fee deduction</span><strong class="money bad">−£${money(result.exitFeeDeduction)}</strong></div>` : ''}<div class="summary-line"><span><strong>First-year result</strong></span><strong class="money ${result.yearOneResult >= 0 ? 'good' : 'bad'}">${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</strong></div></div>`;
}

function renderSummary() {
  const result = calculateAppointment(appointment);
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">Summary for ${escapeHtml(appointment.person.name)}</div><h1>${result.yearOneResult >= 0 ? 'Better off by' : 'First-year difference'} ${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</h1><p class="lead">A clear first-year picture, with current cost, UW cost, savings and benefits kept distinct.</p></section><section class="card"><div class="metric-grid"><div class="metric"><small>Service count</small><strong>${result.rules.serviceCount}</strong></div><div class="metric"><small>Energy tariff</small><strong>${result.rules.energyTariff ? `${result.rules.energyTariff}-service` : '—'}</strong></div><div class="metric"><small>Welcome Bonus</small><strong>£${result.welcomeBonus}</strong></div></div></section><section class="card"><h2>Your first-year picture</h2>${summaryLines(result)}${result.e7StandardAnnualSaving ? `<p class="notice">Is Economy 7 still right for you? Moving to a standard profile could save about £${money(result.e7StandardAnnualSaving)}/year.</p>` : ''}<p class="hint">Estimate based on the figures entered. Not a formal quote.</p></section><section class="card"><label class="field"><span>Optional basket link</span>${field('summary.basketUrl',appointment.summary.basketUrl,'type="url" placeholder="https://…"')}</label><div class="action-row" style="margin-top:12px"><button class="primary" type="button" data-share>Share summary</button><button class="secondary" type="button" data-copy-figures>Copy figures</button><button class="quiet" type="button" data-go="appointment">Back to appointment</button></div></section></div>`;
}

function renderMakeMoney() {
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">Make Money</div><h1>Partner opportunities</h1><p class="lead">The current earnings tool and referral route are ready. Connector and Partner opportunity journeys have room to grow without blocking Save Money.</p></section><section class="card tool-card"><div class="tool-icon">💷</div><div class="tool-copy"><h2>${TOOLS.pet.label}</h2><p class="lead">Open the current PET experience.</p></div><button class="primary" type="button" data-tool="pet">Open PET</button></section><section class="card"><h2>Referrals</h2><p class="lead">Referral and National League inputs remain in the Save Money appointment and feed the first-year summary when eligible.</p>${currentRecord ? '<button class="secondary" type="button" data-go="appointment">Open appointment</button>' : '<button class="secondary" type="button" data-go="launchpad">Choose a person</button>'}</section><div class="grid-2"><section class="card placeholder"><h2>Connector</h2><p class="lead">Reserved for a later focused journey.</p></section><section class="card placeholder"><h2>Partner opportunity</h2><p class="lead">Reserved for a later focused journey.</p></section></div></div>`;
}

function renderTools() {
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">Tools</div><h1>Specialist conversations</h1><p class="lead">${currentRecord ? `Using ${escapeHtml(appointment.person.name)}'s known region and usage where the tool supports it.` : 'These tools also work without an Appointment Companion profile.'}</p></section><section class="card tool-card"><div class="tool-icon">📈</div><div class="tool-copy"><h2>Should I Fix?</h2><p class="lead">Compare usage against current and fixed tariff scenarios.</p></div><button class="primary" type="button" data-tool="fix">Open</button></section><section class="card tool-card"><div class="tool-icon">🚙</div><div class="tool-copy"><h2>EV Companion</h2><p class="lead">Explore home and EV charging costs with a standalone, shareable tool.</p></div><button class="primary" type="button" data-tool="ev">Open</button></section><section class="card tool-card"><div class="tool-icon">💷</div><div class="tool-copy"><h2>PET</h2><p class="lead">Partner Earnings - First 60 Days.</p></div><button class="secondary" type="button" data-tool="pet">Open</button></section></div>`;
}

function renderMore() {
  const brand = branding();
  const auth = getCloudAuth();
  const conflicts = people.filter(person => person.conflict);
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">More</div><h1>Settings &amp; customer safety</h1><p class="lead">Local storage remains primary. Cloud is optional backup, sync and cross-device support.</p></section><section class="card"><div class="section-title"><div><div class="eyebrow">People</div><h2>${people.length} saved on this device</h2></div><button class="secondary" type="button" data-manage-people>Manage</button></div><p class="lead">Individual deletion, tick-and-delete, pending Cloud tombstones and conflict review are kept here.</p></section><section class="card"><div class="section-title"><div><div class="eyebrow">Cloud</div><h2>${auth ? 'Connected for this session' : 'Optional connection'}</h2></div><span>${auth ? '☁️' : '📵'}</span></div><form id="cloudForm" class="grid-2"><label class="field"><span>Partner ID</span><input name="partner_id" autocomplete="username" value="${escapeHtml(auth?.partner_id || '')}"></label><label class="field"><span>Workspace key</span><input name="workspace_key" type="password" autocomplete="current-password" value="${escapeHtml(auth?.workspace_key || '')}"></label><div class="action-row"><button class="primary" type="submit">Save for session &amp; sync</button>${auth ? '<button class="quiet" type="button" data-cloud-disconnect>Disconnect</button>' : ''}</div></form><p class="hint">The workspace key stays in session storage; it is not included in shared customer data.</p></section>${conflicts.length ? `<section class="card"><h2>Cloud conflicts need review</h2><div class="people-list">${conflicts.map(row => `<div class="person-row"><div style="flex:1"><strong>${escapeHtml(row.customer_name)}</strong><small>${row.conflict.paths?.length || 1} field conflict(s)</small></div><button class="secondary" data-conflict="${row.local_id}" data-choice="local">Keep mine</button><button class="quiet" data-conflict="${row.local_id}" data-choice="cloud">Use Cloud</button></div>`).join('')}</div></section>` : ''}<section class="card"><div class="eyebrow">Partner branding</div><h2>Customer-facing shares</h2><form id="brandingForm" class="grid-2"><label class="field"><span>Name</span><input name="name" value="${escapeHtml(brand.name || '')}"></label><label class="field"><span>Role</span><input name="role" value="${escapeHtml(brand.role || '')}"></label><label class="field"><span>Short message</span><input name="strap" value="${escapeHtml(brand.strap || '')}"></label><label class="field"><span>Join link (https)</span><input name="joinUrl" type="url" value="${escapeHtml(brand.joinUrl || '')}"></label><button class="primary" type="submit">Save branding</button></form></section><section class="card flat"><p class="hint">Appointment Companion V${VERSION}. Local database: ${customerStore.database.name}. October 2026 rule boundary.</p></section></div>`;
}

function renderCustomerView(data) {
  document.documentElement.classList.add('shared-view');
  document.getElementById('topbar').hidden = true;
  nav.hidden = true;
  const result = { current: data.current || {}, uw: data.uw || {}, monthlyServiceSaving: data.monthlyServiceSaving || 0, welcomeBonus: data.welcomeBonus || 0, mobileIntroBenefit: data.mobileIntroBenefit || 0, broadbandIntroBenefit: data.broadbandIntroBenefit || 0, referral: data.referral || 0, nationalLeague: data.nationalLeague || 0, exitFeeDeduction: data.exitFeeDeduction || 0, yearOneResult: data.yearOneResult || 0, e7StandardAnnualSaving: data.energyInsight?.standardAnnualSaving || 0 };
  app.innerHTML = `<div class="customer-view stack"><section class="card hero share-hero"><div class="eyebrow">Your UW first-year picture</div><h1>${escapeHtml(data.personName || 'Your summary')}</h1><div class="year-result">${data.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(data.yearOneResult))}</div><p class="lead">${data.yearOneResult >= 0 ? 'estimated better off in the first 12 months' : 'estimated first-year difference'}</p></section><section class="card"><div class="metric-grid"><div class="metric"><small>Service count</small><strong>${Number(data.serviceCount || 0)}</strong></div><div class="metric"><small>Energy tariff</small><strong>${data.energyTariff ? `${data.energyTariff}-service` : '—'}</strong></div><div class="metric"><small>Welcome Bonus</small><strong>£${money(data.welcomeBonus)}</strong></div></div></section><section class="card"><h2>How the figure is built</h2>${summaryLines(result)}${result.e7StandardAnnualSaving ? `<p class="notice">Is Economy 7 still right for you? A standard alternative could save about £${money(result.e7StandardAnnualSaving)}/year.</p>` : ''}<p class="hint">Illustrative summary, not a formal quote. Confirm prices and eligibility in the official UW process.</p>${data.basketUrl ? `<a class="action primary" style="display:block;text-align:center;text-decoration:none;margin-top:12px" href="${escapeHtml(data.basketUrl)}" rel="noopener">Open your basket →</a>` : ''}<div class="partner">${data.partnerName ? `<strong>${escapeHtml(data.partnerName)}</strong><p>${escapeHtml(data.partnerRole || '')}${data.partnerStrap ? `<br>${escapeHtml(data.partnerStrap)}` : ''}</p>` : ''}${data.joinUrl ? `<a href="${escapeHtml(data.joinUrl)}" rel="noopener">Start saving here →</a>` : ''}</div></section></div>`;
}

function render() {
  updateHeader();
  if (section === 'make') renderMakeMoney();
  else if (section === 'tools') renderTools();
  else if (section === 'more') renderMore();
  else if (!currentRecord || view === 'launchpad') renderLaunchpad();
  else if (view === 'appointment') renderAppointment();
  else if (view === 'summary') renderSummary();
  else renderProfile();
  updateHeader();
  app.focus({ preventScroll: true });
}

async function navigate(nextView, nextSection = section) {
  if ((nextView !== view || nextSection !== section) && !(await guard.confirmNavigation())) return;
  section = nextSection;
  if (nextView === 'launchpad' && currentRecord) return leavePerson();
  if (['appointment', 'profile', 'summary'].includes(nextView) && !currentRecord) { view = 'launchpad'; section = 'save'; }
  else view = nextView;
  render();
}

async function createPerson(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!cleaned) return;
  appointment = createAppointment(cleaned);
  currentRecord = null;
  guard.initialise(appointment);
  guard.changed(appointment);
  await persistActive(true);
  view = 'profile'; section = 'save'; render();
}

function showDuplicateWarning(value) {
  const target = document.getElementById('duplicateWarning');
  if (!target) return;
  const normalised = normaliseName(value);
  const matches = normalised ? people.filter(row => normaliseName(row.customer_name) === normalised) : [];
  target.innerHTML = matches.length ? `<div class="duplicate"><strong>Possible duplicate</strong> · ${matches.map(row => `${escapeHtml(row.customer_name)} (${relativeDate(row.updated_at)})`).join(', ')}. You can still create another person with this name.</div>` : '';
}

function showPersonSearch(value) {
  const target = document.getElementById('personSearchResults');
  if (!target) return;
  const query = normaliseName(value);
  const matches = query ? people.filter(row => normaliseName(row.customer_name).includes(query)).slice(0, 5) : [];
  target.innerHTML = matches.length ? `<div class="card flat" style="margin-top:10px;padding:10px"><div class="eyebrow">Existing people</div><div class="recent-list">${matches.map(row => personRow(row)).join('')}</div></div>` : '';
}

async function openPeopleDialog() {
  selectedPeople.clear();
  people = await customerStore.list();
  peopleDialog.innerHTML = `<div class="modal-card"><div class="section-title"><div><div class="eyebrow">Local-first profiles</div><h2>People on this device</h2></div><button class="quiet" type="button" data-close-dialog>Close</button></div><label class="person-row"><input type="checkbox" data-select-all><span><strong>Select multiple</strong><small>Tick profiles, then delete once.</small></span></label><div class="people-list" id="peopleDialogRows">${people.map(row => personRow(row,true)).join('') || '<p class="lead">No saved people yet.</p>'}</div><div class="modal-actions"><button class="danger-quiet" type="button" data-delete-selected disabled>Delete selected</button></div></div>`;
  peopleDialog.showModal();
}

async function deletePeople(ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length || !confirm(`Delete ${unique.length} selected ${unique.length === 1 ? 'person' : 'people'}? Cloud-backed deletions will complete now when connected, or automatically after reconnecting.`)) return;
  for (const id of unique) await markDeleted(id);
  const deletedActive = unique.includes(currentRecord?.local_id);
  people = await customerStore.list();
  selectedPeople.clear();
  if (deletedActive) {
    currentRecord = null; appointment = createAppointment(); persistedAppointment = clone(appointment); guard.initialise(appointment); sessionStorage.removeItem(CURRENT_KEY); view = 'launchpad';
  }
  peopleDialog.close();
  render();
  scheduleSync(50);
  toast(`${unique.length} ${unique.length === 1 ? 'person' : 'people'} removed. Cloud acknowledgement may still be pending.`);
}

async function openShareDialog() {
  if (guard.isDirty()) await persistActive(true);
  const data = buildShareData(appointment, branding());
  const url = buildShareUrl(appointment, branding());
  shareDialog.innerHTML = `<div class="modal-card"><div class="section-title"><div><div class="eyebrow">Customer-safe share</div><h2>Share ${escapeHtml(appointment.person.name)}'s summary</h2></div><button class="quiet" data-close-dialog type="button">Close</button></div><p class="lead">Works with or without a basket link. Private notes, Cloud credentials and admin controls are excluded.</p><div class="metric-grid"><div class="metric"><small>Service count</small><strong>${data.serviceCount}</strong></div><div class="metric"><small>Energy tariff</small><strong>${data.energyTariff || '—'}</strong></div><div class="metric"><small>Welcome Bonus</small><strong>£${data.welcomeBonus}</strong></div></div><div class="modal-actions"><button class="primary" type="button" data-whatsapp data-url="${escapeHtml(url)}">WhatsApp</button><button class="secondary" type="button" data-copy-link data-url="${escapeHtml(url)}">Copy link</button><button class="quiet" type="button" data-copy-figures>Copy figures</button><a class="action quiet" href="${escapeHtml(url)}" target="_blank" rel="noopener">Preview customer view</a></div></div>`;
  shareDialog.showModal();
  appointment.summary.lastSharedAt = new Date().toISOString();
  markChanged();
}

document.addEventListener('input', event => {
  const target = event.target;
  if (target.id === 'personNameInput') { showDuplicateWarning(target.value); showPersonSearch(target.value); return; }
  if (!target.dataset.field) return;
  setPath(appointment, target.dataset.field, inputValue(target));
  if (target.dataset.field === 'benefits.referral' && target.checked) appointment.benefits.nationalLeague = false;
  if (target.dataset.field === 'benefits.nationalLeague' && target.checked) appointment.benefits.referral = false;
  markChanged();
  updateLiveResults();
});

document.addEventListener('change', event => {
  const path = event.target.dataset.field;
  if (!path) return;
  if (path === 'broadband.packageId' && event.target.value) {
    const selectedPackage = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === event.target.value);
    if (selectedPackage) {
      appointment.broadband.uwMonthly = selectedPackage.monthly;
      markChanged();
      render();
      return;
    }
  }
  if (['energy.peakOffPeak','energy.adjustmentEnabled','broadband.freeMonthsOffer','cashback.enabled','adjustments.recurringEnabled','adjustments.oneOffEnabled','person.homeStatus'].includes(path)) render();
});

document.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id === 'personForm') return createPerson(new FormData(event.target).get('name'));
  if (event.target.id === 'cloudForm') {
    const data = Object.fromEntries(new FormData(event.target));
    setCloudAuth(data);
    toast('Cloud credentials saved for this session. Syncing…');
    try { await syncAll(); people = await customerStore.list(); setSaveState('Saved · Cloud synced','good'); }
    catch { setSaveState('Saved locally · Cloud pending'); toast('Cloud is unavailable. Local work remains safe.'); }
    render();
  }
  if (event.target.id === 'brandingForm') {
    localStorage.setItem(BRAND_KEY, JSON.stringify(Object.fromEntries(new FormData(event.target))));
    toast('Partner branding saved on this device.');
  }
});

document.addEventListener('click', async event => {
  const target = event.target.closest('button,a');
  if (!target) return;
  if (target.dataset.go) return navigate(target.dataset.go, target.dataset.go === 'launchpad' ? 'save' : section);
  if (target.dataset.section) return navigate(currentRecord ? 'profile' : 'launchpad', target.dataset.section);
  if (target.dataset.openPerson) return loadPerson(target.dataset.openPerson);
  if (target.hasAttribute('data-new-person')) return leavePerson();
  if (target.hasAttribute('data-manage-people')) return openPeopleDialog();
  if (target.hasAttribute('data-close-dialog')) return target.closest('dialog').close();
  if (target.dataset.service) {
    const name = target.dataset.service;
    appointment.services[name] = !appointment.services[name];
    if (name === 'boilerCover' && appointment.person.homeStatus !== 'homeowner') appointment.services.boilerCover = false;
    markChanged(); render(); return;
  }
  if (target.dataset.choice) {
    setPath(appointment, target.dataset.choice, target.dataset.value);
    if (target.dataset.choice === 'person.homeStatus' && target.dataset.value === 'tenant') appointment.services.boilerCover = false;
    if (target.dataset.choice === 'energy.electricityProfile') appointment.energy.peakOffPeak = true;
    markChanged(); render(); return;
  }
  if (target.dataset.simCount) {
    const count = Number(target.dataset.simCount);
    appointment.mobile.simCount = count;
    appointment.mobile.sims = Array.from({ length: count }, (_, index) => appointment.mobile.sims[index] || createSim(index));
    markChanged(); render(); return;
  }
  if (target.dataset.simPlan) {
    appointment.mobile.sims[Number(target.dataset.simPlan)].planId = target.dataset.value;
    markChanged(); render(); return;
  }
  if (target.dataset.estimatePath) {
    setPath(appointment, target.dataset.estimatePath, Number(target.dataset.estimateValue));
    appointment.energy.usageSource = 'estimated';
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-apply-split')) {
    const split = calculateAnnualDayNightSplit(appointment.energy.annualElectricityKwh, appointment.energy.splitSampleDayKwh, appointment.energy.splitSampleNightKwh);
    appointment.energy.dayKwh = split.annualDayKwh; appointment.energy.nightKwh = split.annualNightKwh;
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-save')) return persistActive(false);
  if (target.dataset.tool) {
    if (guard.isDirty() && appointment.person.name) await persistActive(true);
    return launchTool(target.dataset.tool, currentRecord ? { ...appointment, _localId: currentRecord.local_id } : null);
  }
  if (target.hasAttribute('data-share')) return openShareDialog();
  if (target.hasAttribute('data-copy-figures')) {
    const text = figuresText(buildShareData(appointment, branding()));
    await navigator.clipboard.writeText(text); toast('Figures copied.'); return;
  }
  if (target.hasAttribute('data-copy-link')) { await navigator.clipboard.writeText(target.dataset.url); toast('Share link copied.'); return; }
  if (target.hasAttribute('data-whatsapp')) { location.href = `https://wa.me/?text=${encodeURIComponent(`Here is your UW first-year summary:\n${target.dataset.url}`)}`; return; }
  if (target.dataset.selectPerson) {
    target.checked ? selectedPeople.add(target.dataset.selectPerson) : selectedPeople.delete(target.dataset.selectPerson);
  }
  if (target.hasAttribute('data-select-all')) {
    const all = target.checked;
    selectedPeople = new Set(all ? people.map(row => row.local_id) : []);
    peopleDialog.querySelectorAll('[data-select-person]').forEach(box => { box.checked = all; });
  }
  if (target.dataset.deletePerson) return deletePeople([target.dataset.deletePerson]);
  if (target.hasAttribute('data-delete-selected')) return deletePeople([...selectedPeople]);
  if (target.dataset.conflict) { await resolveConflict(target.dataset.conflict, target.dataset.choice); people = await customerStore.list(); render(); scheduleSync(50); return; }
  if (target.hasAttribute('data-cloud-disconnect')) { setCloudAuth(null); setSaveState('Saved on this device','good'); render(); }
});

peopleDialog.addEventListener('change', event => {
  if (event.target.dataset.selectPerson) event.target.checked ? selectedPeople.add(event.target.dataset.selectPerson) : selectedPeople.delete(event.target.dataset.selectPerson);
  if (event.target.hasAttribute('data-select-all')) {
    selectedPeople = new Set(event.target.checked ? people.map(row => row.local_id) : []);
    peopleDialog.querySelectorAll('[data-select-person]').forEach(box => { box.checked = event.target.checked; });
  }
  const deleteButton = peopleDialog.querySelector('[data-delete-selected]');
  if (deleteButton) { deleteButton.disabled = selectedPeople.size === 0; deleteButton.textContent = `Delete selected${selectedPeople.size ? ` (${selectedPeople.size})` : ''}`; }
});

window.addEventListener('online', () => scheduleSync(50));
window.addEventListener('focus', async () => { await consumeSpecialistReturn(); scheduleSync(100); if (currentRecord && view === 'profile') render(); });

async function boot() {
  const shareMatch = location.hash.match(/^#share=(.+)$/);
  if (shareMatch) {
    try { renderCustomerView(decodeShareData(shareMatch[1])); }
    catch { app.innerHTML = '<section class="card"><h1>This shared summary could not be opened</h1><p>The link may be incomplete.</p></section>'; }
    return;
  }
  await customerStore.open();
  const migration = await customerStore.migrate();
  await consumeSpecialistReturn();
  people = await customerStore.list();
  const currentId = sessionStorage.getItem(CURRENT_KEY);
  currentRecord = currentId ? await customerStore.get(currentId) : null;
  if (currentRecord && !currentRecord.deleted) {
    appointment = normaliseAppointment(currentRecord.appointment_state);
    persistedAppointment = clone(appointment);
    view = 'profile';
  } else {
    currentRecord = null;
    appointment = createAppointment();
    persistedAppointment = clone(appointment);
  }
  guard.initialise(appointment);
  render();
  if (migration.imported) toast(`${migration.imported} existing ${migration.imported === 1 ? 'profile' : 'profiles'} copied safely into V3.`);
  scheduleSync(500);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => setSaveState('Saved locally · PWA update pending'));
  setInterval(() => scheduleSync(0), 45000);
}

boot().catch(error => {
  console.error(error);
  app.innerHTML = `<section class="card"><h1>V3 needs attention</h1><p>${escapeHtml(error.message)}</p><p>Your existing donor data has not been changed.</p></section>`;
});
