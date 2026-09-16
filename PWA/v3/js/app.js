import { VERSION } from './config/version.js';
import { TOOLS } from './config/tools.js';
import { calculateAppointment } from './appointment/calculations.js';
import { calculateAnnualDayNightSplit, calculateEconomy7AnnualCost } from './energy/split-helper.js';
import { UW_RULES_2026_10_01 } from './rules/uw-rules-2026-10-01.js';
import { createAppointment, createSim, clone, normaliseAppointment, normaliseName, REGIONS } from './state/canonical-state.js';
import { customerStore } from './state/customer-store.js';
import { getCloudAuth, setCloudAuth, syncAll, markDeleted, resolveConflict } from './state/cloud-sync.js';
import { buildShareData, buildShareUrl, decodeShareData, figuresText } from './summary/share-data.js';
import { createSummaryActivity, summaryHistory } from './summary/history.js';
import { UnsavedWorkGuard } from './shell/unsaved-work-guard.js';
import { launchTool } from './specialists/launcher.js';
import { loadTariffs, TARIFF_FEED_URL } from './data/tariff-client.js';
import { buildIndicativeTiers } from './energy/indicative-cost.js';
import { previewUpgrade } from './appointment/upgrade-preview.js';

const app = document.getElementById('app');
const nav = document.getElementById('globalNav');
const saveState = document.getElementById('saveState');
const personChip = document.getElementById('activePersonChip');
const peopleDialog = document.getElementById('peopleDialog');
const shareDialog = document.getElementById('shareDialog');
const historyDialog = document.getElementById('historyDialog');
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
let tariffData = null;
let tariffInfo = null;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const checked = value => value ? ' checked' : '';
const selected = (value, expected) => String(value) === String(expected) ? ' selected' : '';
const on = (value, expected = true) => value === expected ? ' on' : '';
const field = (path, value, attrs = '') => `<input data-field="${path}" value="${escapeHtml(value || '')}" ${attrs}>`;
const serviceLabels = Object.freeze({ energy: 'Energy', broadband: 'Broadband', mobile: 'Mobile', boilerCover: 'Boiler Cover' });

function initials(value) {
  return String(value || '').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || '•';
}

function activeServiceNames(source = appointment) {
  return Object.entries(source.services || {}).filter(([, enabled]) => enabled).map(([name]) => serviceLabels[name] || name);
}

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
  record.appointment_state.activity = [...(record.appointment_state.activity || []), { type: 'tool_used', tool: payload.tool, at: payload.savedAt || new Date().toISOString() }].slice(-20);
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
  const services = activeServiceNames(record.appointment_state).join(', ') || 'No services yet';
  return `<div class="person-row recent-person">
    ${selectable ? `<input class="person-select" type="checkbox" data-select-person="${record.local_id}" aria-label="Select ${escapeHtml(record.customer_name)}"${checked(selectedPeople.has(record.local_id))}>` : ''}
    <span class="avatar" aria-hidden="true">${escapeHtml(initials(record.customer_name))}</span>
    <button type="button" class="open-person" data-open-person="${record.local_id}"><strong>${escapeHtml(record.customer_name)}</strong><small>${escapeHtml(services)}</small></button>
    <time>${escapeHtml(relativeDate(record.updated_at))}</time>
    ${selectable ? `<button type="button" class="danger-quiet" data-delete-person="${record.local_id}" aria-label="Delete ${escapeHtml(record.customer_name)}">🗑</button>` : ''}
  </div>`;
}

function renderLaunchpad(query = '') {
  app.innerHTML = `<div class="stack launchpad">
    <section class="launch-hero">
      <div class="eyebrow">Appointment Companion</div>
      <h1>Who are you talking to?</h1>
      <p class="lead">Find someone you know or start a new conversation.</p>
      <form class="launch-form" id="personForm">
        <label class="search-field"><span aria-hidden="true">⌕</span><input id="personNameInput" name="name" autocomplete="off" maxlength="80" placeholder="Search or enter a name" aria-label="Search or enter a person's name" value="${escapeHtml(query)}"></label>
        <button class="primary" type="submit"><span aria-hidden="true">＋</span> Start</button>
      </form>
      <div id="duplicateWarning"></div><div id="personSearchResults"></div>
    </section>
    <section class="card recent-card">
      <div class="section-title"><h2>Recent people</h2><button class="text-button" type="button" data-manage-people>Manage</button></div>
      <div class="recent-list">${people.slice(0, 3).map(row => personRow(row)).join('') || '<p class="empty-state">Your three most recent people will appear here.</p>'}</div>
    </section>
    <button class="opportunity-card" type="button" data-section="tools"><span><strong>Tools and opportunities</strong><small>Explore, compare and create summaries — all in one place.</small></span><b aria-hidden="true">›</b></button>
  </div>`;
}

function progress() {
  const visibleServices = ['energy', 'broadband', 'mobile', 'boilerCover']
    .filter(name => name !== 'boilerCover' || appointment.person.homeStatus !== 'tenant');
  const selected = visibleServices.filter(name => appointment.services[name]).length;
  return Math.round((selected / visibleServices.length) * 100);
}

function renderProfile() {
  const pct = progress();
  const services = activeServiceNames();
  const history = summaryHistory(appointment.activity);
  const toolEvents = appointment.activity.filter(item => item?.tool).slice(-3).reverse();
  app.innerHTML = `<div class="stack profile-hub">
    <section class="person-heading"><span class="avatar large">${escapeHtml(initials(appointment.person.name))}</span><div><h1>${escapeHtml(appointment.person.name)}</h1><span class="context-pill">◉ Save Money</span></div><button class="icon-button" type="button" data-manage-people aria-label="Manage people">•••</button></section>
    <section class="card appointment-card">
      <div class="appointment-title"><span class="feature-icon appointment">▣</span><div><h2>Appointment</h2><p>${services.length} service${services.length === 1 ? '' : 's'} explored</p></div><strong>${pct}%</strong></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <div class="service-progress">${['energy','broadband','mobile','boilerCover'].filter(name => name !== 'boilerCover' || appointment.person.homeStatus !== 'tenant').map(name => `<span class="${appointment.services[name] ? 'done' : ''}"><i>${appointment.services[name] ? '✓' : ''}</i>${serviceLabels[name]}</span>`).join('')}</div>
      <button class="primary wide" type="button" data-go="appointment">${pct ? 'Continue appointment' : 'Start appointment'} <span aria-hidden="true">→</span></button>
      <p class="autosave-note">◆ Your progress is saved automatically</p>
    </section>
    <section><div class="section-title"><h2>Tools for ${escapeHtml(appointment.person.name.split(/\s+/)[0])}</h2><button class="text-button" type="button" data-section="tools">See all ›</button></div><div class="tool-grid">
      <button class="tool-tile fix" type="button" data-tool="fix"><span>⌁</span><strong>Should I Fix?</strong><small>Region and usage prefilled</small></button>
      <button class="tool-tile ev" type="button" data-tool="ev"><span>◆</span><strong>EV Companion</strong><small>Explore EV savings</small></button>
    </div></section>
    <section><h2>Summary</h2><div class="list-card"><button type="button" data-go="summary"><span>▤</span>Build or view summary<b>›</b></button><button type="button" data-share><span>⌯</span>Share summary<b>›</b></button><button type="button" data-go="summary"><span>↗</span>${appointment.summary.basketUrl ? 'View basket link' : 'Add basket link (optional)'}<b>›</b></button></div></section>
    <section><div class="section-title"><h2>Recent activity</h2>${history.length ? '<span class="hint">Tap a summary to reopen</span>' : ''}</div><div class="list-card history-list">
      ${history.map(item => `<button type="button" data-history-id="${escapeHtml(item.id)}"><span>▤</span><span><strong>${item.type === 'summary_shared' ? 'Summary shared' : 'Summary saved'}</strong><small>${escapeHtml((item.services || []).map(name => serviceLabels[name] || name).join(' · '))}</small></span><time>${escapeHtml(relativeDate(item.at))}</time></button>`).join('')}
      ${toolEvents.map(item => `<div class="history-row"><span>◆</span><span><strong>${escapeHtml(item.tool === 'ev' ? 'EV Companion used' : item.tool === 'fix' ? 'Should I Fix? opened' : 'PET opened')}</strong></span><time>${escapeHtml(relativeDate(item.at))}</time></div>`).join('')}
      ${!history.length && !toolEvents.length ? '<p class="empty-state">Summaries and tools used for this person will appear here.</p>' : ''}
    </div></section>
    <section class="card notes-card"><div class="section-title"><h2>Notes</h2><small class="hint">Private · never shared</small></div><textarea data-field="summary.privateNotes" placeholder="Useful follow-up notes">${escapeHtml(appointment.summary.privateNotes)}</textarea></section>
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
  return `<button type="button" class="service-card service-${name}${on(appointment.services[name])}" data-service="${name}"><span class="icon">${icon}</span><span class="arrow">›</span><strong>${label}</strong><small>${serviceState(name)}</small><i><b style="width:${appointment.services[name] ? serviceState(name) === 'Complete' ? 100 : 50 : 0}%"></b></i><em>${detail}</em></button>`;
}

function usageSourceBlock(fuel, label, estimates) {
  const energy = appointment.energy;
  const prefix = fuel === 'electricity' ? 'electricity' : 'gas';
  const source = energy[`${prefix}UsageSource`];
  const active = energy[fuel === 'electricity' ? 'annualElectricityKwh' : 'annualGasKwh'];
  return `<div class="usage-card"><div class="section-title"><div><h3>${label}</h3><small>Active figure: ${Math.round(active).toLocaleString('en-GB')} kWh/year</small></div><span class="source-badge">${source === 'bill' ? 'Bill' : source === 'estimated' ? 'Estimated' : 'UW / database'}</span></div>
    <label class="field"><span>UW / database annual usage</span>${field(`energy.${prefix}UwKwh`, energy[`${prefix}UwKwh`], 'type="number" inputmode="numeric" min="0"')}</label>
    ${energy.billUsageAvailable ? `<label class="field"><span>Customer bill annual usage</span>${field(`energy.${prefix}BillKwh`, energy[`${prefix}BillKwh`], 'type="number" inputmode="numeric" min="0"')}</label>` : ''}
    <div class="pills source-pills"><button class="pill${on(source,'uw')}" type="button" data-choice="energy.${prefix}UsageSource" data-value="uw">Use UW / database</button>${energy.billUsageAvailable ? `<button class="pill${on(source,'bill')}" type="button" data-choice="energy.${prefix}UsageSource" data-value="bill" ${energy[`${prefix}BillKwh`] ? '' : 'disabled'}>Use bill</button>` : ''}<button class="pill${on(source,'estimated')}" type="button" data-choice="energy.${prefix}UsageSource" data-value="estimated">Use estimate</button></div>
    ${source === 'estimated' ? `<div class="estimate-row">${estimates.map(([name,value]) => `<button class="pill${on(energy[`${prefix}EstimatedKwh`],value)}" type="button" data-estimate-fuel="${prefix}" data-estimate-value="${value}">${name}<small>${value.toLocaleString('en-GB')}</small></button>`).join('')}</div>` : ''}
  </div>`;
}

function renderEnergy() {
  const energy = appointment.energy;
  const split = calculateAnnualDayNightSplit(energy.annualElectricityKwh, energy.splitSampleDayKwh, energy.splitSampleNightKwh);
  const e7CurrentAnnual = calculateEconomy7AnnualCost({ dayKwh: energy.dayKwh, nightKwh: energy.nightKwh, dayRate: energy.currentDayRate, nightRate: energy.currentNightRate, standingCharge: energy.currentStandingCharge });
  const e7Saving = e7CurrentAnnual && energy.e7StandardAnnualCost ? e7CurrentAnnual - energy.e7StandardAnnualCost : 0;
  const indicative = tariffData ? buildIndicativeTiers(tariffData, appointment) : {};
  const selectedIndicative = indicative[calculateAppointment(appointment).rules.energyTariff || 1];
  return `<section class="card service-workspace energy-workspace" id="energyPanel"><div class="workspace-heading"><button class="back-chip" type="button" data-service="energy" aria-label="Close Energy">‹</button><span class="feature-icon energy">ϟ</span><div><div class="eyebrow">Energy</div><h2>Energy details</h2><p>Start with the essentials. Open deeper options only when they help.</p></div></div>
    <div class="grid-2"><label class="field"><span>Region</span><select data-field="energy.region">${REGIONS.map(([id, label]) => `<option value="${id}"${selected(energy.region,id)}>${label}</option>`).join('')}</select></label><div class="field"><span>Fuel type</span><div class="segmented"><button class="${on(energy.fuel,'electricity')}" type="button" data-choice="energy.fuel" data-value="electricity">Electricity</button><button class="${on(energy.fuel,'gas')}" type="button" data-choice="energy.fuel" data-value="gas">Gas</button><button class="${on(energy.fuel,'dual')}" type="button" data-choice="energy.fuel" data-value="dual">Dual fuel</button></div></div></div>
    <section class="workspace-section"><div class="section-title"><div><h3>Annual usage</h3><p>Keep the original UW/database figure and optionally compare a bill figure.</p></div></div><div class="usage-grid">${energy.fuel !== 'gas' ? usageSourceBlock('electricity','Electricity',[['Low',1600],['Typical',2500],['High',3800]]) : ''}${energy.fuel !== 'electricity' ? usageSourceBlock('gas','Gas',[['Low',7500],['Typical',11500],['High',17000]]) : ''}</div><label class="toggle-row"><input type="checkbox" data-field="energy.billUsageAvailable"${checked(energy.billUsageAvailable)}><span><strong>I have annual usage from the customer's bill</strong><small>Reveals a second figure without replacing the UW/database usage.</small></span></label></section>
    <section class="workspace-section"><div class="section-title"><div><h3>Current Energy cost</h3><p>Monthly Direct Debit is quickest; use annual bills when more representative.</p></div></div><div class="segmented wrap"><button class="${on(energy.currentCostMode,'monthly')}" type="button" data-choice="energy.currentCostMode" data-value="monthly">Monthly payment</button><button class="${on(energy.currentCostMode,'split')}" type="button" data-choice="energy.currentCostMode" data-value="split">Split electricity / gas</button><button class="${on(energy.currentCostMode,'annual')}" type="button" data-choice="energy.currentCostMode" data-value="annual">Annual bill cost</button></div><div class="grid-2 field-gap">${energy.currentCostMode === 'monthly' ? `<label class="field"><span>Current monthly Direct Debit</span>${field('energy.currentMonthly',energy.currentMonthly,'type="number" min="0" step="0.01"')}</label>` : energy.currentCostMode === 'split' ? `${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity / month</span>${field('energy.currentElectricityMonthly',energy.currentElectricityMonthly,'type="number" min="0" step="0.01"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas / month</span>${field('energy.currentGasMonthly',energy.currentGasMonthly,'type="number" min="0" step="0.01"')}</label>` : ''}` : `${energy.fuel !== 'gas' ? `<label class="field"><span>Annual electricity cost</span>${field('energy.annualElectricityCost',energy.annualElectricityCost,'type="number" min="0" step="0.01"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Annual gas cost</span>${field('energy.annualGasCost',energy.annualGasCost,'type="number" min="0" step="0.01"')}</label>` : ''}`}</div></section>
    ${energy.fuel !== 'gas' ? `<section class="workspace-section"><label class="toggle-row"><input type="checkbox" data-field="energy.peakOffPeak"${checked(energy.peakOffPeak)}><span><strong>Peak &amp; off-peak electricity?</strong><small>Off by default. Use for Economy 7 or an existing EV tariff.</small></span></label>${energy.peakOffPeak ? `<div class="segmented"><button class="${on(energy.electricityProfile,'economy7')}" type="button" data-choice="energy.electricityProfile" data-value="economy7">Economy 7</button><button class="${on(energy.electricityProfile,'ev')}" type="button" data-choice="energy.electricityProfile" data-value="ev">EV</button></div><div class="grid-2 field-gap"><label class="field"><span>Annual day usage</span>${field('energy.dayKwh',energy.dayKwh,'type="number" min="0"')}</label><label class="field"><span>Annual night usage</span>${field('energy.nightKwh',energy.nightKwh,'type="number" min="0"')}</label></div><details class="advanced"><summary>Estimate annual day/night split</summary><div class="grid-2"><label class="field"><span>Bill-period day kWh</span>${field('energy.splitSampleDayKwh',energy.splitSampleDayKwh,'type="number" min="0"')}</label><label class="field"><span>Bill-period night kWh</span>${field('energy.splitSampleNightKwh',energy.splitSampleNightKwh,'type="number" min="0"')}</label></div><p class="notice">${split.annualDayKwh || split.annualNightKwh ? `${split.dayPercent.toFixed(1)}% day / ${split.nightPercent.toFixed(1)}% night → ${split.annualDayKwh} day and ${split.annualNightKwh} night kWh/year.` : 'Add matching day and night figures from a recent bill period.'}</p><button class="secondary" type="button" data-apply-split ${split.annualDayKwh || split.annualNightKwh ? '' : 'disabled'}>Apply split to profile</button></details><details class="advanced"><summary>Current ${energy.electricityProfile === 'ev' ? 'EV' : 'Economy 7'} tariff rates</summary><div class="grid-3"><label class="field"><span>Day p/kWh</span>${field('energy.currentDayRate',energy.currentDayRate,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Night p/kWh</span>${field('energy.currentNightRate',energy.currentNightRate,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Standing p/day</span>${field('energy.currentStandingCharge',energy.currentStandingCharge,'type="number" min="0" step="0.01"')}</label></div><label class="field"><span>Indicative standard alternative annual cost</span>${field('energy.e7StandardAnnualCost',energy.e7StandardAnnualCost,'type="number" min="0" step="0.01"')}</label>${e7CurrentAnnual && energy.e7StandardAnnualCost ? `<p class="notice ${e7Saving < 0 ? 'warn' : ''}">${e7Saving >= 0 ? `Moving off Economy 7 could save about £${money(e7Saving / 12)}/month · £${money(e7Saving)}/year.` : `Economy 7 is about £${money(Math.abs(e7Saving))}/year lower.`}</p>` : ''}</details>` : ''}</section>` : ''}
    <section class="workspace-section indicative-panel"><div class="section-title"><div><h3>Indicative UW Energy</h3><p>Central tariff data applied to the active usage above.</p></div><span class="source-badge">${tariffInfo?.source === 'live' ? 'Live' : tariffData ? 'Cached' : 'Checking'}</span></div>${tariffData ? `<div class="tariff-tier-grid">${[1,2,3].map(tier => `<div class="${tier === calculateAppointment(appointment).rules.energyTariff ? 'selected' : ''}"><small>${tier}-service</small><strong>${indicative[tier] ? `£${money(indicative[tier].monthly)}` : '—'}</strong><span>/month</span></div>`).join('')}</div><p class="hint">${selectedIndicative ? `${escapeHtml(selectedIndicative.tariffName)} · ${escapeHtml(selectedIndicative.sourceRef)} · Indicative, based on usage entered.` : 'No matching central row was found for this profile.'}</p><button class="secondary wide" type="button" data-use-indicative ${Object.values(indicative).some(Boolean) ? '' : 'disabled'}>Use these indicative bundle tiers</button>` : '<p class="hint">Checking the central tariff feed. Manual or confirmed quote entry remains available below.</p>'}</section>
    <details class="advanced"><summary>Confirmed quote, exit fees &amp; manual adjustments</summary><div class="grid-2"><label class="field"><span>Electricity exit fee</span>${field('energy.electricityExitFee',energy.electricityExitFee,'type="number" min="0"')}</label><label class="field"><span>Gas exit fee</span>${field('energy.gasExitFee',energy.gasExitFee,'type="number" min="0"')}</label></div><div class="segmented wrap"><button class="${on(energy.uwQuoteMode,'single')}" type="button" data-choice="energy.uwQuoteMode" data-value="single">Single quote</button><button class="${on(energy.uwQuoteMode,'tiers')}" type="button" data-choice="energy.uwQuoteMode" data-value="tiers">Bundle tiers</button></div><div class="grid-3 field-gap">${energy.uwQuoteMode === 'tiers' ? [1,2,3].map(tier => `<label class="field"><span>${tier}-service / month</span>${field(`energy.uwTier${tier}`,energy[`uwTier${tier}`],'type="number" min="0" step="0.01"')}</label>`).join('') : `<label class="field"><span>UW monthly amount</span>${field('energy.uwMonthly',energy.uwMonthly,'type="number" min="0" step="0.01"')}</label>`}<label class="field"><span>Status</span><select data-field="energy.quoteStatus"><option value="indicative"${selected(energy.quoteStatus,'indicative')}>Indicative</option><option value="manual"${selected(energy.quoteStatus,'manual')}>Manually entered</option><option value="confirmed"${selected(energy.quoteStatus,'confirmed')}>Confirmed UW quote</option></select></label></div><label class="toggle-row"><input type="checkbox" data-field="energy.adjustmentEnabled"${checked(energy.adjustmentEnabled)}><span><strong>Use a manual Energy adjustment</strong><small>Only for an awkward case the standard routes cannot represent.</small></span></label>${energy.adjustmentEnabled ? `<div class="grid-3"><label class="field"><span>Apply to</span><select data-field="energy.adjustmentTarget"><option value="current"${selected(energy.adjustmentTarget,'current')}>Current</option><option value="uw"${selected(energy.adjustmentTarget,'uw')}>UW</option></select></label><label class="field"><span>Period</span><select data-field="energy.adjustmentPeriod"><option value="monthly"${selected(energy.adjustmentPeriod,'monthly')}>Monthly</option><option value="annual"${selected(energy.adjustmentPeriod,'annual')}>Annual</option></select></label><label class="field"><span>Amount</span>${field('energy.adjustmentAmount',energy.adjustmentAmount,'type="number" min="0" step="0.01"')}</label></div>` : ''}</details>
  </section>`;
}

function renderBroadband() {
  const bb = appointment.broadband;
  return `<section class="card service-workspace"><div class="workspace-heading"><button class="back-chip" type="button" data-service="broadband">‹</button><span class="feature-icon broadband">⌁</span><div><div class="eyebrow">Broadband</div><h2>Choose the closest package</h2><p>Known package pricing is applied automatically.</p></div></div><div class="package-grid">${UW_RULES_2026_10_01.broadband.packages.map(item => `<button type="button" class="package-option${on(bb.packageId,item.id)}" data-package="${item.id}"><strong>${escapeHtml(item.label)}</strong><span>£${money(item.monthly)}/month</span></button>`).join('')}</div><div class="grid-2 field-gap"><label class="field"><span>Current broadband / month</span>${field('broadband.currentMonthly',bb.currentMonthly,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Exit fee</span>${field('broadband.exitFee',bb.exitFee,'type="number" min="0"')}</label><label class="field"><span>Home phone / month</span>${field('broadband.homePhoneMonthly',bb.homePhoneMonthly,'type="number" min="0" step="0.01"')}</label></div><label class="toggle-row"><input type="checkbox" data-field="broadband.wholeHomeWifi"${checked(bb.wholeHomeWifi)}><span><strong>Whole Home Wi-Fi</strong><small>+£5/month</small></span></label>${appointment.person.homeStatus === 'homeowner' ? `<label class="toggle-row"><input type="checkbox" data-field="broadband.freeMonthsOffer"${checked(bb.freeMonthsOffer)}><span><strong>Eligible free-month offer</strong><small>Calculated across April where relevant.</small></span></label>` : ''}<details class="advanced"><summary>Use a manually confirmed UW price</summary><label class="field"><span>Confirmed UW broadband / month</span>${field('broadband.uwMonthly',bb.uwMonthly,'type="number" min="0" step="0.01"')}</label></details></section>`;
}

function renderMobile() {
  return `<section class="card service-workspace"><div class="workspace-heading"><button class="back-chip" type="button" data-service="mobile">‹</button><span class="feature-icon mobile">▯</span><div><div class="eyebrow">Mobile</div><h2>Choose plans for each SIM</h2><p>Plan prices come from the October 2026 rule module.</p></div></div><div class="segmented">${[1,2,3,4,5].map(count => `<button class="${on(appointment.mobile.simCount,count)}" type="button" data-sim-count="${count}">${count} SIM${count === 1 ? '' : 's'}</button>`).join('')}</div><div class="stack field-gap">${appointment.mobile.sims.map((sim,index) => `<div class="sim"><div class="sim-head"><label class="field"><span>SIM label</span>${field(`mobile.sims.${index}.name`,sim.name,'maxlength="40"')}</label><label class="compact-check"><input type="checkbox" data-field="mobile.sims.${index}.include"${checked(sim.include)}> Include</label></div><div class="plan-grid"><button class="plan-option${on(sim.planId,'essentialMax')}" type="button" data-sim-plan="${index}" data-value="essentialMax"><strong>Go Essentials</strong><span>£6/month</span></button><button class="plan-option${on(sim.planId,'unlimitedMax')}" type="button" data-sim-plan="${index}" data-value="unlimitedMax"><strong>Go Unlimited</strong><span>£13/month</span></button></div><div class="grid-2 field-gap"><label class="field"><span>Current / month</span>${field(`mobile.sims.${index}.currentMonthly`,sim.currentMonthly,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Exit fee</span>${field(`mobile.sims.${index}.exitFee`,sim.exitFee,'type="number" min="0"')}</label></div>${sim.planId === 'unlimitedMax' && appointment.mobile.sims.slice(0,index).some(item => item.include && item.planId === 'unlimitedMax') ? '<p class="notice">Additional Go Unlimited: first 3 months free, then £13/month.</p>' : ''}</div>`).join('')}</div></section>`;
}

function renderAdjustments() {
  const a = appointment.adjustments;
  return `<section class="card"><details class="advanced"><summary>Cashback Card &amp; advanced adjustments</summary><label class="person-row"><input type="checkbox" data-field="cashback.enabled"${checked(appointment.cashback.enabled)}><span><strong>Include Cashback Card estimate</strong><small>Appointment calculation, separate from the PET toolbar shortcut.</small></span></label>${appointment.cashback.enabled ? `<div class="grid-2"><label class="field"><span>Monthly card spend</span>${field('cashback.monthlySpend',appointment.cashback.monthlySpend,'type="number" min="0" step="50"')}</label><label class="field"><span>Estimate basis</span><select data-field="cashback.tier"><option value="low"${selected(appointment.cashback.tier,'low')}>1% capped</option><option value="average"${selected(appointment.cashback.tier,'average')}>Average active cardholder</option><option value="high"${selected(appointment.cashback.tier,'high')}>Top earners</option></select></label></div>` : ''}<label class="person-row"><input type="checkbox" data-field="adjustments.recurringEnabled"${checked(a.recurringEnabled)}><span><strong>Manual recurring adjustment</strong></span></label>${a.recurringEnabled ? `<div class="grid-2"><label class="field"><span>Current amount</span>${field('adjustments.currentAmount',a.currentAmount,'type="number" min="0" step="0.01"')}</label><label class="field"><span>UW amount</span>${field('adjustments.uwAmount',a.uwAmount,'type="number" min="0" step="0.01"')}</label><label class="field"><span>Current reason</span>${field('adjustments.currentReason',a.currentReason)}</label><label class="field"><span>UW reason</span>${field('adjustments.uwReason',a.uwReason)}</label><label class="field"><span>Period</span><select data-field="adjustments.period"><option value="monthly"${selected(a.period,'monthly')}>Monthly</option><option value="annual"${selected(a.period,'annual')}>Annual</option></select></label></div>` : ''}<label class="person-row"><input type="checkbox" data-field="adjustments.oneOffEnabled"${checked(a.oneOffEnabled)}><span><strong>One-off benefit or charge</strong></span></label>${a.oneOffEnabled ? `<div class="grid-3"><label class="field"><span>Type</span><select data-field="adjustments.oneOffType"><option value="benefit"${selected(a.oneOffType,'benefit')}>Benefit/refund</option><option value="charge"${selected(a.oneOffType,'charge')}>Charge</option></select></label><label class="field"><span>Amount</span>${field('adjustments.oneOffAmount',a.oneOffAmount,'type="number" min="0"')}</label><label class="field"><span>Label</span>${field('adjustments.oneOffLabel',a.oneOffLabel)}</label></div>` : ''}</details></section>`;
}

function renderAppointment() {
  const home = appointment.person.homeStatus;
  const visibleServices = ['energy','broadband','mobile',...(home === 'tenant' ? [] : ['boilerCover'])];
  const explored = visibleServices.filter(name => appointment.services[name]).length;
  app.innerHTML = `<div class="stack appointment-screen"><section class="person-heading compact"><button class="back-chip" type="button" data-go="profile">‹</button><span class="avatar">${escapeHtml(initials(appointment.person.name))}</span><div><strong>${escapeHtml(appointment.person.name)}</strong><span class="context-pill">◉ Save Money</span></div></section><section class="card appointment-overview"><div class="section-title"><div><div class="eyebrow">Appointment</div><h1>Services overview</h1><p>${explored} of ${visibleServices.length} services explored</p></div><strong>${Math.round(explored / visibleServices.length * 100)}%</strong></div><div class="progress"><span style="width:${explored / visibleServices.length * 100}%"></span></div><div class="segmented home-status"><button class="${on(home,'homeowner')}" type="button" data-choice="person.homeStatus" data-value="homeowner">Homeowner</button><button class="${on(home,'tenant')}" type="button" data-choice="person.homeStatus" data-value="tenant">Tenant</button></div><div class="service-grid">${serviceCard('energy','ϟ','Energy','Electricity, gas or dual fuel')}${serviceCard('broadband','⌁','Broadband','Choose a package')}${serviceCard('mobile','▯','Mobile','1–5 SIMs')}${home === 'tenant' ? '' : serviceCard('boilerCover','◆','Boiler Cover','Homeowner service')}</div>
  ${appointment.services.energy ? `<div class="subpanel"><div class="pills"><button class="pill${on(appointment.energy.fuel,'electricity')}" type="button" data-choice="energy.fuel" data-value="electricity">Electricity only</button><button class="pill${on(appointment.energy.fuel,'gas')}" type="button" data-choice="energy.fuel" data-value="gas">Gas only</button><button class="pill${on(appointment.energy.fuel,'dual')}" type="button" data-choice="energy.fuel" data-value="dual">Dual fuel</button></div></div>` : ''}
  ${appointment.services.mobile ? `<div class="subpanel"><div class="pills">${[1,2,3,4,5].map(count => `<button class="pill${on(appointment.mobile.simCount,count)}" type="button" data-sim-count="${count}">${count} SIM${count === 1 ? '' : 's'}</button>`).join('')}</div></div>` : ''}</section>
  ${appointment.services.energy ? renderEnergy() : ''}${appointment.services.broadband ? renderBroadband() : ''}${appointment.services.mobile ? renderMobile() : ''}
  ${appointment.services.boilerCover && home === 'homeowner' ? `<section class="card service-workspace"><div class="workspace-heading"><button class="back-chip" type="button" data-service="boilerCover">‹</button><span class="feature-icon boiler">◆</span><div><div class="eyebrow">Boiler Cover</div><h2>Homeowner service</h2><p>£25/month. No introductory free-month benefit.</p></div></div></section>` : ''}
  <section class="card"><div class="eyebrow">Benefits</div><h2>Referral route</h2><label class="person-row"><input type="checkbox" data-field="benefits.referral"${checked(appointment.benefits.referral)}><span><strong>Standard referral</strong><small>£50 when eligible; homeowner-only.</small></span></label><label class="person-row"><input type="checkbox" data-field="benefits.nationalLeague"${checked(appointment.benefits.nationalLeague)}><span><strong>National League</strong><small>£50 club-shop voucher when eligible.</small></span></label></section>${renderAdjustments()}
  <section class="action-bar"><button class="quiet" type="button" data-save>Save</button><button class="primary" type="button" data-go="summary">Reveal basket summary →</button></section></div>`;
}

function updateLiveResults() {
  // Financial results are intentionally held for the whole-basket summary reveal.
}

function summaryLines(result) {
  return `<div class="summary-table"><div class="summary-line"><span>Current monthly cost</span><strong>£${money(result.current.total)}</strong></div><div class="summary-line"><span>UW service cost</span><strong>£${money(result.uw.total)}</strong></div><div class="summary-line"><span>Effective UW monthly position</span><strong>£${money(result.effectiveUwMonthly ?? result.uw.total)}</strong></div><div class="summary-line"><span>Effective monthly saving</span><strong class="money ${(result.effectiveMonthlySaving ?? result.monthlyServiceSaving) >= 0 ? 'good' : 'bad'}">${(result.effectiveMonthlySaving ?? result.monthlyServiceSaving) < 0 ? '−' : ''}£${money(Math.abs(result.effectiveMonthlySaving ?? result.monthlyServiceSaving))}</strong></div><div class="summary-line"><span>Welcome Bonus</span><strong>£${money(result.welcomeBonus)}</strong></div>${result.mobileIntroBenefit ? `<div class="summary-line"><span>Additional Unlimited first 3 months</span><strong>£${money(result.mobileIntroBenefit)}</strong></div>` : ''}${result.broadbandIntroBenefit ? `<div class="summary-line"><span>Broadband introductory benefit</span><strong>£${money(result.broadbandIntroBenefit)}</strong></div>` : ''}${result.referral ? `<div class="summary-line"><span>Referral</span><strong>£${money(result.referral)}</strong></div>` : ''}${result.nationalLeague ? `<div class="summary-line"><span>National League voucher</span><strong>£${money(result.nationalLeague)}</strong></div>` : ''}${result.exitFeeDeduction ? `<div class="summary-line"><span>Exit-fee deduction</span><strong class="money bad">−£${money(result.exitFeeDeduction)}</strong></div>` : ''}<div class="summary-line"><span><strong>First-year result</strong></span><strong class="money ${result.yearOneResult >= 0 ? 'good' : 'bad'}">${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</strong></div></div>`;
}

function basketStrip(services = {}, count = 0) {
  const items = [
    ['energy','ϟ','Energy'], ['broadband','⌁','Broadband'], ['mobile','▯','Mobile'], ['boilerCover','◆','Boiler Cover']
  ].filter(([key]) => services[key]);
  return `<section class="basket-strip"><div class="section-title"><strong>${count} service${count === 1 ? '' : 's'} in this basket</strong><span class="basket-glyph">▰</span></div><div class="basket-services">${items.map(([key,icon,label]) => `<span class="basket-${key}"><i>${icon}</i>${label}</span>`).join('')}</div></section>`;
}

function monthlySummary(result) {
  const effective = result.effectiveUwMonthly ?? result.uw?.total ?? 0;
  const saving = result.effectiveMonthlySaving ?? result.monthlyServiceSaving ?? 0;
  return `<section class="monthly-summary"><div class="section-title"><strong>Monthly summary <small>(including Cashback Card)</small></strong><span title="The effective UW position includes the selected Cashback Card estimate.">ⓘ</span></div><div class="monthly-grid"><span></span><b>Current</b><b>UW*</b><b>Saving</b><strong>Total monthly</strong><strong>£${money(result.current?.total)}</strong><strong>£${money(effective)}</strong><strong class="money ${saving >= 0 ? 'good' : 'bad'}">${saving < 0 ? '−' : ''}£${money(Math.abs(saving))}</strong></div><p>* UW service cost minus estimated Cashback Card contribution where selected.</p></section>`;
}

function summaryAccordions(result) {
  const serviceAnnual = Number(result.monthlyServiceSaving || 0) * 12;
  const bonusTotal = Number(result.welcomeBonus || 0) + Number(result.mobileIntroBenefit || 0) + Number(result.broadbandIntroBenefit || 0) + Number(result.referral || 0) + Number(result.nationalLeague || 0) + Number(result.oneOff || 0) - Number(result.exitFeeDeduction || 0);
  const cashbackAnnual = Number(result.cashback?.active ? result.cashback.monthlyNet * 12 + result.cashback.feeWaiver : result.cashbackAnnual || 0);
  return `<div class="summary-accordions"><details open><summary><span class="accordion-icon">▥</span><strong>Year-one savings on services</strong><b>£${money(serviceAnnual)}</b></summary><div>${summaryLines(result)}</div></details><details><summary><span class="accordion-icon">◆</span><strong>Year-one welcome bonuses</strong><b>£${money(bonusTotal)}</b></summary><div class="summary-table"><div class="summary-line"><span>Welcome Bonus</span><strong>£${money(result.welcomeBonus)}</strong></div>${result.mobileIntroBenefit ? `<div class="summary-line"><span>Additional Unlimited offer</span><strong>£${money(result.mobileIntroBenefit)}</strong></div>` : ''}${result.broadbandIntroBenefit ? `<div class="summary-line"><span>Broadband offer</span><strong>£${money(result.broadbandIntroBenefit)}</strong></div>` : ''}${result.exitFeeDeduction ? `<div class="summary-line"><span>Exit-fee deduction</span><strong>−£${money(result.exitFeeDeduction)}</strong></div>` : ''}</div></details><details><summary><span class="accordion-icon">▰</span><strong>Cashback Card benefits</strong><b>${cashbackAnnual ? `£${money(cashbackAnnual)}` : 'Not included'}</b></summary><div><p class="lead">Cashback contribution is folded into the effective monthly UW position above.</p></div></details></div>`;
}

function upgradeBlock(preview, customer = false) {
  return `<details class="upgrade-card"><summary><span class="basket-glyph">▰</span><span><strong>Could this basket be even better?</strong><small>${preview ? escapeHtml(preview.description) : 'Preview a sensible next service without changing the saved appointment.'}</small></span><b>›</b></summary><div>${preview ? `<h3>${escapeHtml(preview.title)}</h3><div class="metric-grid"><div class="metric"><small>Service count</small><strong>${preview.serviceCount}</strong></div><div class="metric"><small>Welcome Bonus</small><strong>£${money(preview.welcomeBonus)}</strong></div><div class="metric"><small>First-year change</small><strong>+£${money(preview.improvement)}</strong></div></div><p class="hint">Preview only. Nothing has been added to the basket.</p>` : '<p class="lead">No clearly positive automatic upgrade is available from the figures currently shared.</p>'}<button class="primary wide" type="button" ${customer ? 'data-customer-upgrade' : 'data-partner-upgrade'}>Preview upgrade →</button></div></details>`;
}

function renderSummary() {
  const result = calculateAppointment(appointment);
  const preview = previewUpgrade(appointment);
  app.innerHTML = `<div class="summary-page partner-summary"><header class="summary-header"><button class="back-chip" type="button" data-go="appointment">‹</button><span class="feature-icon appointment">▣</span><div><strong>Appointment Companion</strong><small>What they pay now. What they could save.</small></div><button class="icon-button" type="button" data-go="profile">•••</button></header><section class="year-hero"><p>Year one in your pocket</p><h1>${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</h1><strong>One app · One password · One bill</strong><small>Prepared for ${escapeHtml(appointment.person.name)}</small><span aria-hidden="true">◒</span></section>${basketStrip(appointment.services,result.rules.serviceCount)}${monthlySummary(result)}${summaryAccordions(result)}${result.e7StandardAnnualSaving ? `<p class="notice">Is Economy 7 still right for you? A standard alternative could save about £${money(result.e7StandardAnnualSaving)}/year.</p>` : ''}${upgradeBlock(preview)}<section class="card basket-link-card"><label class="field"><span>Optional personalised basket link</span>${field('summary.basketUrl',appointment.summary.basketUrl,'type="url" placeholder="https://…"')}</label>${appointment.summary.basketUrl ? `<a class="action primary wide" href="${escapeHtml(appointment.summary.basketUrl)}" target="_blank" rel="noopener">Open basket →</a>` : ''}</section><section class="summary-actions"><button class="primary" type="button" data-share>Share summary</button><button class="secondary" type="button" data-save-snapshot>Save snapshot</button><button class="quiet" type="button" data-copy-figures>Copy figures</button></section><p class="compliance-note">Indicative summary based on the figures entered. Confirm prices and eligibility in the official UW process.</p></div>`;
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
  const result = { current: data.current || {}, uw: data.uw || {}, monthlyServiceSaving: data.monthlyServiceSaving || 0, effectiveUwMonthly: data.effectiveUwMonthly, effectiveMonthlySaving: data.effectiveMonthlySaving, welcomeBonus: data.welcomeBonus || 0, mobileIntroBenefit: data.mobileIntroBenefit || 0, broadbandIntroBenefit: data.broadbandIntroBenefit || 0, referral: data.referral || 0, nationalLeague: data.nationalLeague || 0, exitFeeDeduction: data.exitFeeDeduction || 0, cashbackAnnual: Number(data.cashbackMonthlyNet || 0) * 12 + Number(data.cashbackFeeWaiver || 0), yearOneResult: data.yearOneResult || 0, e7StandardAnnualSaving: data.energyInsight?.standardAnnualSaving || 0 };
  app.innerHTML = `<div class="summary-page customer-summary"><header class="summary-header"><span class="feature-icon appointment">▣</span><div><strong>Appointment Companion</strong><small>Your personalised summary</small></div></header><section class="year-hero"><p>Year one in your pocket</p><h1>${data.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(data.yearOneResult))}</h1><strong>One app · One password · One bill</strong><small>Prepared for ${escapeHtml(data.personName || 'you')}</small><span aria-hidden="true">◒</span></section>${basketStrip(data.services || {},Number(data.serviceCount || 0))}${monthlySummary(result)}${summaryAccordions(result)}${result.e7StandardAnnualSaving ? `<p class="notice">Is Economy 7 still right for you? A standard alternative could save about £${money(result.e7StandardAnnualSaving)}/year.</p>` : ''}${upgradeBlock(data.upgradePreview,true)}${data.basketUrl ? `<section class="customer-cta"><span class="basket-glyph">▰</span><div><h2>Ready to get started?</h2><p>View your basket and take the next step.</p></div><a class="action primary wide" href="${escapeHtml(data.basketUrl)}" rel="noopener">View your basket →</a></section>` : ''}<div class="partner">${data.partnerName ? `<small>Your Partner</small><strong>${escapeHtml(data.partnerName)}</strong><p>${escapeHtml(data.partnerRole || '')}${data.partnerStrap ? `<br>${escapeHtml(data.partnerStrap)}` : ''}</p>` : ''}${data.joinUrl ? `<a href="${escapeHtml(data.joinUrl)}" rel="noopener">Start saving here →</a>` : ''}</div><p class="compliance-note">Illustrative summary, not a formal quote.</p></div>`;
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
}

async function saveSummarySnapshot(type = 'summary_saved') {
  const entry = createSummaryActivity(appointment, type);
  appointment.activity = [...appointment.activity, entry].slice(-20);
  if (type === 'summary_shared') appointment.summary.lastSharedAt = entry.at;
  markChanged();
  await persistActive(true);
  toast(type === 'summary_shared' ? 'Shared summary saved to history.' : 'Summary snapshot saved.');
  return entry;
}

function openHistorySummary(id) {
  const entry = summaryHistory(appointment.activity).find(item => item.id === id);
  if (!entry) return;
  const data = entry.snapshot;
  const result = { current: data.current || {}, uw: data.uw || {}, monthlyServiceSaving: data.monthlyServiceSaving || 0, effectiveUwMonthly: data.effectiveUwMonthly, effectiveMonthlySaving: data.effectiveMonthlySaving, welcomeBonus: data.welcomeBonus || 0, mobileIntroBenefit: data.mobileIntroBenefit || 0, broadbandIntroBenefit: data.broadbandIntroBenefit || 0, referral: data.referral || 0, nationalLeague: data.nationalLeague || 0, exitFeeDeduction: data.exitFeeDeduction || 0, cashbackAnnual: Number(data.cashbackMonthlyNet || 0) * 12 + Number(data.cashbackFeeWaiver || 0), yearOneResult: data.yearOneResult || 0 };
  historyDialog.innerHTML = `<div class="modal-card history-summary"><div class="section-title"><div><div class="eyebrow">Historical summary</div><h2>${escapeHtml(relativeDate(entry.at))}</h2></div><button class="quiet" type="button" data-close-dialog>Close</button></div><div class="history-hero"><small>Year one in your pocket</small><strong>${data.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(data.yearOneResult))}</strong></div>${basketStrip(data.services || {},data.serviceCount || 0)}${monthlySummary(result)}${summaryAccordions(result)}${entry.toolsUsed?.length ? `<p class="hint"><strong>Tools used:</strong> ${entry.toolsUsed.map(tool => escapeHtml(tool.label)).join(' · ')}</p>` : ''}<p class="hint">Read-only snapshot. Current appointment data has not been changed.</p></div>`;
  historyDialog.showModal();
}

function applyIndicativeTariffs() {
  if (!tariffData) return false;
  const tiers = buildIndicativeTiers(tariffData, appointment);
  let applied = false;
  for (const tier of [1,2,3]) if (tiers[tier]) {
    appointment.energy[`uwTier${tier}`] = tiers[tier].monthly;
    applied = true;
  }
  if (!applied) return false;
  appointment.energy.uwQuoteMode = 'tiers';
  appointment.energy.quoteStatus = 'indicative';
  if (appointment.energy.electricityProfile === 'economy7') {
    const standard = clone(appointment);
    standard.energy.electricityProfile = 'standard';
    const standardTier = buildIndicativeTiers(tariffData, standard)[calculateAppointment(appointment).rules.energyTariff || 1];
    if (standardTier) appointment.energy.e7StandardAnnualCost = standardTier.annual;
  }
  markChanged();
  render();
  toast('Central indicative Energy tiers applied.');
  return true;
}

document.addEventListener('input', event => {
  const target = event.target;
  if (target.id === 'personNameInput') { showDuplicateWarning(target.value); showPersonSearch(target.value); return; }
  if (!target.dataset.field) return;
  setPath(appointment, target.dataset.field, inputValue(target));
  if (target.dataset.field === 'energy.billUsageAvailable' && !target.checked) {
    if (appointment.energy.electricityUsageSource === 'bill') appointment.energy.electricityUsageSource = 'uw';
    if (appointment.energy.gasUsageSource === 'bill') appointment.energy.gasUsageSource = 'uw';
  }
  if (target.dataset.field === 'benefits.referral' && target.checked) appointment.benefits.nationalLeague = false;
  if (target.dataset.field === 'benefits.nationalLeague' && target.checked) appointment.benefits.referral = false;
  markChanged();
  const billUsageMatch = target.dataset.field.match(/^energy\.(electricity|gas)BillKwh$/);
  if (billUsageMatch) {
    const button = document.querySelector(`[data-choice="energy.${billUsageMatch[1]}UsageSource"][data-value="bill"]`);
    if (button) button.disabled = !(Number(target.value) > 0);
  }
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
  if (['energy.billUsageAvailable','energy.peakOffPeak','energy.adjustmentEnabled','broadband.freeMonthsOffer','cashback.enabled','adjustments.recurringEnabled','adjustments.oneOffEnabled','person.homeStatus'].includes(path)) render();
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
  if (target.dataset.historyId) return openHistorySummary(target.dataset.historyId);
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
  if (target.dataset.package) {
    const selectedPackage = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === target.dataset.package);
    if (!selectedPackage) return;
    appointment.broadband.packageId = selectedPackage.id;
    appointment.broadband.uwMonthly = selectedPackage.monthly;
    markChanged(); render(); return;
  }
  if (target.dataset.estimateFuel) {
    const prefix = target.dataset.estimateFuel;
    appointment.energy[`${prefix}EstimatedKwh`] = Number(target.dataset.estimateValue);
    appointment.energy[`${prefix}UsageSource`] = 'estimated';
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-apply-split')) {
    const split = calculateAnnualDayNightSplit(appointment.energy.annualElectricityKwh, appointment.energy.splitSampleDayKwh, appointment.energy.splitSampleNightKwh);
    appointment.energy.dayKwh = split.annualDayKwh; appointment.energy.nightKwh = split.annualNightKwh;
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-save')) return persistActive(false);
  if (target.hasAttribute('data-use-indicative')) return applyIndicativeTariffs();
  if (target.hasAttribute('data-save-snapshot')) return saveSummarySnapshot('summary_saved');
  if (target.hasAttribute('data-partner-upgrade') || target.hasAttribute('data-customer-upgrade')) { toast('Upgrade preview only — the saved basket has not changed.'); return; }
  if (target.dataset.tool) {
    if (currentRecord) {
      appointment.activity = [...appointment.activity, { type: 'tool_used', tool: target.dataset.tool, at: new Date().toISOString() }].slice(-20);
      markChanged();
    }
    if (guard.isDirty() && appointment.person.name) await persistActive(true);
    return launchTool(target.dataset.tool, currentRecord ? { ...appointment, _localId: currentRecord.local_id } : null);
  }
  if (target.hasAttribute('data-share')) return openShareDialog();
  if (target.hasAttribute('data-copy-figures')) {
    const text = figuresText(buildShareData(appointment, branding()));
    await navigator.clipboard.writeText(text); toast('Figures copied.'); return;
  }
  if (target.hasAttribute('data-copy-link')) { await navigator.clipboard.writeText(target.dataset.url); await saveSummarySnapshot('summary_shared'); toast('Share link copied.'); return; }
  if (target.hasAttribute('data-whatsapp')) { await saveSummarySnapshot('summary_shared'); location.href = `https://wa.me/?text=${encodeURIComponent(`Here is your UW first-year summary:\n${target.dataset.url}`)}`; return; }
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
  loadTariffs(TARIFF_FEED_URL, {
    onData: (data, info) => {
      tariffData = data;
      tariffInfo = info;
      if (view === 'appointment' && appointment.services.energy) render();
    },
    onError: (_error, info) => { tariffInfo = info; }
  }).catch(() => {});
  if (migration.imported) toast(`${migration.imported} existing ${migration.imported === 1 ? 'profile' : 'profiles'} copied safely into V3.`);
  scheduleSync(500);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => setSaveState('Saved locally · PWA update pending'));
  setInterval(() => scheduleSync(0), 45000);
}

boot().catch(error => {
  console.error(error);
  app.innerHTML = `<section class="card"><h1>V3 needs attention</h1><p>${escapeHtml(error.message)}</p><p>Your existing donor data has not been changed.</p></section>`;
});
