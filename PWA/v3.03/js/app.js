import { VERSION } from './config/version.js';
import { TOOLS } from './config/tools.js';
import { calculateAppointment } from './appointment/calculations.js';
import { appointmentCompleteness, markComparisonFieldEntered, mobilePlanPrice } from './appointment/completeness.js';
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
import { buildIndicativeTiers, buildTariffGrid, calculateIndicativeEnergyCost } from './energy/indicative-cost.js';
import { buildMealDealPreview } from './appointment/upgrade-preview.js';
import { safeHttps } from './summary/share-policy.js';

const app = document.getElementById('app');
const nav = document.getElementById('globalNav');
const saveState = document.getElementById('saveState');
const personChip = document.getElementById('activePersonChip');
const peopleDialog = document.getElementById('peopleDialog');
const shareDialog = document.getElementById('shareDialog');
const historyDialog = document.getElementById('historyDialog');
const toastElement = document.getElementById('toast');
const CURRENT_KEY = 'apptCompanionV303Current';
const BRAND_KEY = 'apptCompanionV303Partner';
const LEGACY_BRAND_KEY = 'apptCompanionV301Partner';

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
let mealDealPreviewActive = false;
let sharedSummaryData = null;
let sharedMealDealActive = false;
let essentialsExpanded = false;
let serviceSetupOpen = '';
let energyTariffOpen = false;
let splitEstimatorOpen = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const wholeMoney = value => Math.round(Number(value || 0)).toLocaleString('en-GB');
const checked = value => value ? ' checked' : '';
const selected = (value, expected) => String(value) === String(expected) ? ' selected' : '';
const on = (value, expected = true) => value === expected ? ' on' : '';
const field = (path, value, attrs = '') => {
  const explicitlyEntered = appointment.completion?.entered?.includes(path);
  const display = value === 0 && !explicitlyEntered ? '' : value ?? '';
  return `<input data-field="${path}" value="${escapeHtml(display)}" ${attrs}>`;
};
const integerField = (path, value, attrs = '') => {
  const explicitlyEntered = appointment.completion?.entered?.includes(path);
  const numeric = Number(value || 0);
  const display = numeric === 0 && !explicitlyEntered ? '' : Math.round(numeric).toLocaleString('en-GB');
  return `<input data-field="${path}" data-type="number" data-format-number="integer" inputmode="numeric" value="${escapeHtml(display)}" ${attrs}>`;
};
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
  try { return { role: 'Authorised Utility Warehouse Partner', ...JSON.parse(localStorage.getItem(BRAND_KEY) || localStorage.getItem(LEGACY_BRAND_KEY) || '{}') }; }
  catch { return { role: 'Authorised Utility Warehouse Partner' }; }
}

function setSaveState(text, tone = '') {
  saveState.textContent = text;
  saveState.className = `save-state ${tone}`;
  const status = String(text || '').toLowerCase();
  document.documentElement.dataset.cloudState = status.includes('cloud synced')
    ? 'synced'
    : status.includes('cloud syncing') || status.includes('cloud pending')
      ? 'pending'
      : status.includes('cloud') && (status.includes('attention') || status.includes('failed') || tone === 'bad')
        ? 'problem'
        : 'local';
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
  if (element.type === 'number' || element.type === 'range' || element.dataset.type === 'number') {
    const raw = String(element.value || '').replace(/,/g, '').trim();
    return raw === '' ? null : Math.max(0, Number(raw) || 0);
  }
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
  if (appointment.services.energy && tariffData) syncSelectedTariffTiers();
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
      setSaveState('Saved locally · Cloud retrying', 'bad');
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
  essentialsExpanded = !appointment.person.homeStatus;
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
    payload = JSON.parse(localStorage.getItem('apptCompanionV303SpecialistReturn') || 'null');
    localStorage.removeItem('apptCompanionV303SpecialistReturn');
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
  essentialsExpanded = true;
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
  return appointmentCompleteness(appointment).percentage;
}

function customerEssentialsBlock(forceCompact = false) {
  const home = appointment.person.homeStatus;
  if (forceCompact && home && !essentialsExpanded) {
    const route = appointment.benefits.referral ? '🤝 Referral' : appointment.benefits.nationalLeague ? '⚽ National League' : 'No referral';
    return `<button class="customer-context-compact" type="button" data-edit-essentials><strong>${home === 'homeowner' ? '🏠 Homeowner' : '🔑 Tenant'}</strong><span>${route}</span><i>✎</i></button>`;
  }
  return `<section class="card essentials-card essentials-compact-card">
    <div class="essentials-home-buttons">
      <button class="home-status-button${on(home,'homeowner')}" type="button" data-choice="person.homeStatus" data-value="homeowner"><span>🏠</span><strong>Homeowner</strong></button>
      <button class="home-status-button${on(home,'tenant')}" type="button" data-choice="person.homeStatus" data-value="tenant"><span>🔑</span><strong>Tenant</strong></button>
    </div>
    <div class="essentials-referral-row">
      <label class="compact-toggle"><span>🤝 Referral</span><span class="switch-control"><input type="checkbox" data-field="benefits.referral"${checked(appointment.benefits.referral)} aria-label="Referred by an existing customer"><i></i></span></label>
      <label class="compact-toggle"><span>⚽ National League</span><span class="switch-control"><input type="checkbox" data-field="benefits.nationalLeague"${checked(appointment.benefits.nationalLeague)} aria-label="National League referral"><i></i></span></label>
    </div>
  </section>`;
}

function renderProfile() {
  const pct = progress();
  const completion = appointmentCompleteness(appointment);
  const services = activeServiceNames();
  const history = summaryHistory(appointment.activity);
  const toolEvents = appointment.activity.filter(item => item?.tool).slice(-3).reverse();
  app.innerHTML = `<div class="stack profile-hub">
    <section class="profile-name-row"><div><h1>${escapeHtml(appointment.person.name)}</h1><p>${appointment.person.homeStatus === 'homeowner' ? 'Homeowner' : appointment.person.homeStatus === 'tenant' ? 'Tenant' : 'Home status not set'}</p></div><button class="icon-button" type="button" data-manage-people aria-label="Manage people">•••</button></section>
    ${customerEssentialsBlock(true)}
    <section class="card appointment-card"><div class="appointment-title"><span class="feature-icon appointment">📋</span><div><h2>Appointment</h2><p>${services.length} service${services.length === 1 ? '' : 's'} selected</p></div><strong>${pct}%</strong></div><div class="progress"><span style="width:${pct}%"></span></div><button class="primary wide" type="button" data-go="appointment">${pct ? 'Continue appointment' : 'Start appointment'} <span aria-hidden="true">→</span></button></section>
    <section><div class="section-title"><h2>Tools for ${escapeHtml(appointment.person.name.split(/\s+/)[0])}</h2><button class="text-button" type="button" data-section="tools">See all ›</button></div><div class="tool-grid"><button class="tool-tile fix" type="button" data-tool="fix"><span>📈</span><strong>Should I Fix?</strong><small>Region and usage prefilled</small></button><button class="tool-tile ev" type="button" data-tool="ev"><span>🚙</span><strong>EV Companion</strong><small>Explore EV savings</small></button></div></section>
    <section><h2>Summary</h2><div class="list-card"><button type="button" data-go="summary" ${completion.complete ? '' : 'disabled'}><span>▤</span><span>Show Summary<small>${completion.complete ? 'Ready' : `${completion.missing.length} required item${completion.missing.length===1?'':'s'} remaining`}</small></span><b>›</b></button><button type="button" data-share ${completion.complete ? '' : 'disabled'}><span>⌯</span><span>Share summary</span><b>›</b></button><button type="button" data-go="summary" ${completion.complete ? '' : 'disabled'}><span>↗</span><span>${appointment.summary.basketUrl ? 'View basket link' : 'Add basket link (optional)'}</span><b>›</b></button></div></section>
    <section><div class="section-title"><h2>Recent activity</h2>${history.length ? '<span class="hint">Tap a summary to reopen</span>' : ''}</div><div class="list-card history-list">${history.map(item => `<button type="button" data-history-id="${escapeHtml(item.id)}"><span>▤</span><span><strong>${item.type === 'summary_shared' ? 'Summary shared' : 'Summary saved'}</strong><small>${escapeHtml((item.services || []).map(name => serviceLabels[name] || name).join(' · '))}</small></span><time>${escapeHtml(relativeDate(item.at))}</time></button>`).join('')}${toolEvents.map(item => `<div class="history-row"><span>◆</span><span><strong>${escapeHtml(item.tool === 'ev' ? 'EV Companion used' : item.tool === 'fix' ? 'Should I Fix? opened' : 'PET opened')}</strong></span><time>${escapeHtml(relativeDate(item.at))}</time></div>`).join('')}${!history.length && !toolEvents.length ? '<p class="empty-state">Summaries and tools used for this person will appear here.</p>' : ''}</div></section>
    <section class="card notes-card"><div class="section-title"><h2>Notes</h2><small class="hint">Private · never shared</small></div><textarea data-field="summary.privateNotes" placeholder="Useful follow-up notes">${escapeHtml(appointment.summary.privateNotes)}</textarea></section>
  </div>`;
}

function serviceState(name) {
  if (!appointment.services[name]) return 'Not selected';
  const items = appointmentCompleteness(appointment).requirements.filter(item => item.service === name);
  const complete = items.filter(item => item.complete).length;
  return complete === items.length && items.length ? 'Complete' : complete ? 'In progress' : 'Selected';
}

function serviceProgressDots(name) {
  if (!appointment.services[name]) return '';
  const items = appointmentCompleteness(appointment).requirements.filter(item => item.service === name);
  const groups = [
    ['current', 'Current'],
    ['uw', 'UW'],
    ['exit', 'Exit fee']
  ].map(([key, label]) => {
    const matching = items.filter(item => item.id.endsWith(`.${key}`));
    if (!matching.length) return null;
    return { key, label, complete: matching.every(item => item.complete) };
  }).filter(Boolean);
  const aria = groups.map(item => `${item.label} ${item.complete ? 'complete' : 'missing'}`).join(', ');
  return `<span class="progress-dots" aria-label="${escapeHtml(aria)}" title="${escapeHtml(aria)}">${groups.map(item => `<i class="progress-dot${item.complete ? ' done' : ''}" aria-hidden="true"></i>`).join('')}</span>`;
}

function serviceSelector(name, icon, label) {
  const active = Boolean(appointment.services[name]);
  return `<button type="button" class="service-selector service-${name}${active ? ' on' : ''}" data-service="${name}" aria-pressed="${active ? 'true' : 'false'}"><span class="service-emoji" aria-hidden="true">${icon}</span><span class="service-selector-copy"><strong>${label}</strong></span><span class="service-toggle-mark" aria-hidden="true">${active ? '✓' : '＋'}</span></button>`;
}

function serviceSetupSummary(key) {
  if (key === 'energy') return appointment.energy.fuel === 'electricity' ? 'Electricity' : appointment.energy.fuel === 'gas' ? 'Gas' : 'Dual';
  if (key === 'broadband') {
    const chosen = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === appointment.broadband.packageId);
    if (chosen) return chosen.label.replace('Full Fibre ', 'FF ');
    return appointment.broadband.connectionFamily === 'part' ? 'Part Fibre' : 'Full Fibre';
  }
  if (key === 'mobile') return `${appointment.mobile.simCount} SIM${appointment.mobile.simCount === 1 ? '' : 's'}`;
  if (key === 'boilerCover') return '£25/m';
  return '';
}

function quickServiceSetup() {
  const key = serviceSetupOpen;
  if (!key || !appointment.services[key]) return '';
  if (key === 'energy') {
    return `<div class="quick-service-setup quick-energy"><div class="quick-setup-head"><strong>⚡🔥 Energy</strong><button type="button" data-service-remove="energy">Remove</button></div><div class="segmented"><button class="${on(appointment.energy.fuel,'electricity')}" type="button" data-quick-energy-fuel="electricity">⚡ Electricity</button><button class="${on(appointment.energy.fuel,'gas')}" type="button" data-quick-energy-fuel="gas">🔥 Gas</button><button class="${on(appointment.energy.fuel,'dual')}" type="button" data-quick-energy-fuel="dual">⚡🔥 Dual</button></div></div>`;
  }
  if (key === 'broadband') {
    const bb = appointment.broadband;
    return `<div class="quick-service-setup quick-broadband"><div class="quick-setup-head"><strong>🛜 Broadband</strong><button type="button" data-service-remove="broadband">Remove</button></div><div class="segmented"><button class="${on(bb.connectionFamily,'full')}" type="button" data-quick-broadband-family="full">Full Fibre</button><button class="${on(bb.connectionFamily,'part')}" type="button" data-quick-broadband-family="part">Part Fibre</button></div></div>`;
  }
  if (key === 'mobile') {
    return `<div class="quick-service-setup quick-mobile"><div class="quick-setup-head"><strong>📱 Mobile</strong><button type="button" data-service-remove="mobile">Remove</button></div><div class="segmented quick-sim-count">${[1,2,3,4,5].map(count => `<button class="${on(appointment.mobile.simCount,count)}" type="button" data-sim-count="${count}">${count}</button>`).join('')}</div></div>`;
  }
  return `<div class="quick-service-setup quick-boiler"><div class="quick-setup-head"><strong>🛠️ Boiler Cover · £25/m</strong><button type="button" data-service-remove="boilerCover">Remove</button></div></div>`;
}

function stickyBasketBar() {
  const completion = appointmentCompleteness(appointment);
  const result = calculateAppointment(appointment);
  const ordered = [
    ['energy','⚡🔥','Energy'],
    ['broadband','🛜','Broadband'],
    ['mobile','📱','Mobile'],
    ['boilerCover','🛠️','Boiler']
  ].filter(([key]) => key !== 'boilerCover' || appointment.person.homeStatus === 'homeowner');
  const home = appointment.person.homeStatus === 'homeowner' ? '🏠 Homeowner' : appointment.person.homeStatus === 'tenant' ? '🔑 Tenant' : 'Set home status';
  const route = appointment.benefits.referral ? ' · 🤝' : appointment.benefits.nationalLeague ? ' · ⚽' : '';
  return `<section class="sticky-basket" id="stickyBasket">
    <div class="sticky-status-row sticky-status-grid">
      <span class="sticky-total current-total"><small>Current</small><strong>£${wholeMoney(result.current.total)}/m</strong></span>
      <button class="sticky-home" type="button" data-edit-essentials>${home}${route}</button>
      <span class="sticky-total uw-total"><small>UW</small><strong>£${wholeMoney(result.uw.total)}/m</strong></span>
    </div>
    <div class="sticky-services">${ordered.map(([key,icon,label]) => {
      const active = Boolean(appointment.services[key]);
      return `<button type="button" class="sticky-service service-${key}${active ? ' on' : ''}${serviceSetupOpen === key ? ' setup-open' : ''}" data-service-setup="${key}" aria-pressed="${active ? 'true' : 'false'}"><span class="sticky-service-icon">${icon}</span><span class="sticky-service-copy"><strong>${label}</strong><small>${active ? serviceSetupSummary(key) : 'Add'}</small></span><b class="sticky-service-mark" aria-hidden="true">${active ? '✓' : '+'}</b>${active ? serviceProgressDots(key) : ''}</button>`;
    }).join('')}</div>
    ${quickServiceSetup()}
    <div class="sticky-progress"><span><strong>Basket ${completion.percentage}%</strong><small>${completion.completed}/${completion.total || 0} required items</small></span><i><b style="width:${completion.percentage}%"></b></i></div>
  </section>`;
}

function usageSourceBlock(fuel, label, estimates) {
  const energy = appointment.energy;
  const prefix = fuel === 'electricity' ? 'electricity' : 'gas';
  const source = energy[`${prefix}UsageSource`];
  const billValue = energy[`${prefix}BillKwh`];
  return `<div class="alt-usage-block"><div class="section-title"><div><h3>${label}</h3><small>Currently using ${source === 'bill' ? 'customer bill' : source === 'estimated' ? 'estimate' : 'UW / quote'} usage.</small></div></div>
    <label class="field"><span>Customer bill annual usage</span>${field(`energy.${prefix}BillKwh`, billValue, 'type="number" inputmode="numeric" min="0"')}</label>
    <div class="pills source-pills"><button class="pill${on(source,'uw')}" type="button" data-choice="energy.${prefix}UsageSource" data-value="uw">Use UW / quote</button><button class="pill${on(source,'bill')}" type="button" data-choice="energy.${prefix}UsageSource" data-value="bill" ${billValue > 0 ? '' : 'disabled'}>Use bill</button></div>
    <div class="estimate-choice"><small>Or use an estimate</small><div class="estimate-row">${estimates.map(([name,value]) => `<button class="pill${source === 'estimated' && on(energy[`${prefix}EstimatedKwh`],value)}" type="button" data-estimate-fuel="${prefix}" data-estimate-value="${value}">${name}<small>${value.toLocaleString('en-GB')} kWh</small></button>`).join('')}</div></div>
  </div>`;
}

function syncSelectedTariffTiers(preferredFamily = appointment.energy.selectedTariffFamily || 'fixed') {
  if (!tariffData || !appointment.services.energy) return false;
  const rows = buildTariffGrid(tariffData, appointment);
  const row = rows.find(item => item.id === preferredFamily)
    || rows.find(item => item.id === 'fixed')
    || rows.find(item => item.id === 'standardVariable')
    || rows[0];
  if (!row) return false;
  appointment.energy.selectedTariffFamily = row.id;
  appointment.energy.uwQuoteMode = 'tiers';
  appointment.energy.quoteStatus = 'indicative';
  [1,2,3].forEach(tier => {
    appointment.energy[`uwTier${tier}`] = Number(row.values[tier]?.monthly || 0);
  });
  return true;
}

function energyTariffControl() {
  const rows = tariffData ? buildTariffGrid(tariffData, appointment) : [];
  const selectedFamily = appointment.energy.selectedTariffFamily || 'fixed';
  const selectedRow = rows.find(row => row.id === selectedFamily);
  const labelMap = {
    standardVariable: 'Variable',
    tracker: 'Tracker',
    fixed: 'Fixed',
    evVariable: 'EV Variable',
    economy7Variable: 'Economy 7 Variable',
    fixedE7: 'Fixed Economy 7'
  };
  const selectedLabel = labelMap[selectedFamily] || selectedRow?.label || 'Fixed';
  return `<button class="tariff-select-button" type="button" data-toggle-energy-tariff aria-haspopup="dialog" aria-expanded="${energyTariffOpen ? 'true' : 'false'}"><span>Tariff</span><strong>${escapeHtml(selectedLabel)}</strong><b aria-hidden="true">›</b></button>`;
}

function energyTariffModal() {
  if (!energyTariffOpen) return '';
  const rows = tariffData ? buildTariffGrid(tariffData, appointment) : [];
  const tier = calculateAppointment(appointment).rules.energyTariff || 1;
  const selectedFamily = appointment.energy.selectedTariffFamily || 'fixed';
  const labelMap = {
    standardVariable: 'Variable',
    tracker: 'Tracker',
    fixed: 'Fixed',
    evVariable: 'EV Variable',
    economy7Variable: 'Economy 7 Variable',
    fixedE7: 'Fixed Economy 7'
  };
  return `<div class="tariff-modal-backdrop" role="presentation">
    <section class="tariff-modal-card" role="dialog" aria-modal="true" aria-labelledby="tariffModalTitle">
      <div class="tariff-modal-head"><div><small>UW Energy</small><h2 id="tariffModalTitle">Choose your UW tariff</h2></div><button type="button" data-close-energy-tariff aria-label="Close tariff comparison">×</button></div>
      <p class="tariff-modal-intro">Your ${tier}-service price is highlighted.</p>
      ${rows.length ? `<div class="tariff-modal-table"><div class="tariff-modal-row tariff-modal-header"><strong>Tariff</strong>${[1,2,3].map(n => `<strong class="${n===tier?'active-tier':''}">${n} service${n===1?'':'s'}</strong>`).join('')}</div>${rows.map(row => `<button class="tariff-modal-row${row.id===selectedFamily?' selected':''}" type="button" data-tariff-family="${row.id}"><span><i></i><strong>${escapeHtml(labelMap[row.id] || row.label)}</strong></span>${[1,2,3].map(n => `<b class="${n===tier?'active-tier':''}">${row.values[n] ? `£${money(row.values[n].monthly)}` : '—'}</b>`).join('')}</button>`).join('')}</div>` : '<p class="notice">No matching tariff rows are currently available from the tariff feed.</p>'}
      <div class="tariff-modal-foot"><small>${tariffInfo?.source === 'live' ? 'Live tariff feed' : tariffData ? 'Cached tariff feed' : 'Checking tariff feed'}${rows.some(row => row.id === 'tracker') ? '' : ' · Tracker will appear when supplied by the feed'}</small><button class="primary" type="button" data-close-energy-tariff>Done</button></div>
    </section>
  </div>`;
}

function splitEstimatorModal() {
  if (!splitEstimatorOpen) return '';
  const energy = appointment.energy;
  const split = calculateAnnualDayNightSplit(energy.annualElectricityKwh, energy.splitSampleDayKwh, energy.splitSampleNightKwh);
  return `<div class="tariff-modal-backdrop split-modal-backdrop" role="presentation">
    <section class="tariff-modal-card split-modal-card" role="dialog" aria-modal="true" aria-labelledby="splitModalTitle">
      <div class="tariff-modal-head"><div><small>Peak / off-peak</small><h2 id="splitModalTitle">Estimate the annual split</h2></div><button type="button" data-close-split-estimator aria-label="Close split estimator">×</button></div>
      <p class="tariff-modal-intro">Use any matching peak and off-peak readings from a bill. The Companion will apply that ratio to the selected annual electricity usage.</p>
      <div class="grid-2 split-sample-grid">
        <label class="field"><span>☀️ Peak sample kWh</span>${integerField('energy.splitSampleDayKwh',energy.splitSampleDayKwh,'min="0"')}</label>
        <label class="field"><span>🌙 Off-peak sample kWh</span>${integerField('energy.splitSampleNightKwh',energy.splitSampleNightKwh,'min="0"')}</label>
      </div>
      ${split.annualDayKwh || split.annualNightKwh ? `<div class="split-preview"><span><small>Peak</small><strong>${split.dayPercent.toFixed(1)}%</strong><b>${split.annualDayKwh.toLocaleString('en-GB')} kWh</b></span><span><small>Off-peak</small><strong>${split.nightPercent.toFixed(1)}%</strong><b>${split.annualNightKwh.toLocaleString('en-GB')} kWh</b></span></div>` : '<p class="notice">Add both sample figures to calculate the split.</p>'}
      <div class="tariff-modal-foot"><small>Based on annual electricity usage of ${Math.round(Number(energy.annualElectricityKwh || 0)).toLocaleString('en-GB')} kWh.</small><div class="action-row"><button class="quiet" type="button" data-close-split-estimator>Cancel</button><button class="primary" type="button" data-apply-split ${split.annualDayKwh || split.annualNightKwh ? '' : 'disabled'}>Apply split</button></div></div>
    </section>
  </div>`;
}

function energyUsageSelection(source) {
  const energy = appointment.energy;
  const relevant = energy.fuel === 'electricity' ? ['electricity'] : energy.fuel === 'gas' ? ['gas'] : ['electricity','gas'];
  return relevant.every(fuel => energy[`${fuel}UsageSource`] === source);
}

function energyUsageReady(source) {
  const energy = appointment.energy;
  const relevant = energy.fuel === 'electricity' ? ['electricity'] : energy.fuel === 'gas' ? ['gas'] : ['electricity','gas'];
  return relevant.every(fuel => {
    const suffix = source === 'bill' ? 'BillKwh' : source === 'uw' ? 'UwKwh' : 'EstimatedKwh';
    return Number(energy[`${fuel}${suffix}`] || 0) > 0;
  });
}

function refreshIndicativePanel() {
  const panel = document.querySelector('.uw-tariff-control');
  if (panel) panel.outerHTML = energyTariffControl();
}

function renderEnergy() {
  const energy = appointment.energy;
  const result = calculateAppointment(appointment);
  const tier = result.rules.energyTariff || 1;
  const baseDetail = tariffData ? calculateIndicativeEnergyCost(tariffData, appointment, tier, energy.selectedTariffFamily) : null;
  const peakFamily = energy.electricityProfile === 'ev'
    ? 'evVariable'
    : ['fixed','fixedE7'].includes(energy.selectedTariffFamily) ? 'fixedE7'
      : energy.selectedTariffFamily === 'tracker' ? 'tracker'
        : 'economy7Variable';
  const peakDetail = tariffData && energy.peakOffPeak ? calculateIndicativeEnergyCost(tariffData, appointment, tier, peakFamily) : null;
  const e7CurrentAnnual = calculateEconomy7AnnualCost({
    dayKwh: energy.dayKwh,
    nightKwh: energy.nightKwh,
    dayRate: energy.currentDayRate,
    nightRate: energy.currentNightRate,
    standingCharge: energy.currentStandingCharge,
    ratesIncludeVat: energy.currentRatesIncludeVat
  });
  const tariffLabel = {
    standardVariable: 'Variable', tracker: 'Tracker', fixed: 'Fixed',
    evVariable: 'EV Variable', economy7Variable: 'Economy 7 Variable', fixedE7: 'Fixed Economy 7'
  }[energy.selectedTariffFamily] || 'Fixed';
  const fuelLabel = energy.fuel === 'electricity' ? 'Electricity' : energy.fuel === 'gas' ? 'Gas' : 'Dual fuel';
  const usingCurrentUsage = energyUsageSelection('bill');
  const usingUwUsage = energyUsageSelection('uw');
  const usingEstimate = energyUsageSelection('estimated');
  const currentUsageReady = energyUsageReady('bill');

  const currentBlock = energy.currentCostMode === 'monthly'
    ? `<label class="field"><span>Total monthly Direct Debit</span>${field('energy.currentMonthly',energy.currentMonthly,'type="number" min="0" step="1" data-round-whole="true" placeholder="£ per month"')}</label>`
    : energy.currentCostMode === 'split'
      ? `<div class="grid-2 compact-split">${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity monthly DD</span>${field('energy.currentElectricityMonthly',energy.currentElectricityMonthly,'type="number" min="0" step="1" data-round-whole="true"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas monthly DD</span>${field('energy.currentGasMonthly',energy.currentGasMonthly,'type="number" min="0" step="1" data-round-whole="true"')}</label>` : ''}</div>`
      : `<div class="grid-2 compact-split">${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity annual cost</span>${field('energy.annualElectricityCost',energy.annualElectricityCost,'type="number" min="0" step="1" data-round-whole="true"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas annual cost</span>${field('energy.annualGasCost',energy.annualGasCost,'type="number" min="0" step="1" data-round-whole="true"')}</label>` : ''}</div>`;

  const estimateBands = [
    ['low','Low',1600,7500],
    ['medium','Medium',2500,11500],
    ['high','High',3800,17000]
  ];
  const estimateSummary = usingEstimate
    ? `<div class="estimate-active"><strong>Using estimate</strong><span>${energy.fuel !== 'gas' ? Math.round(energy.electricityEstimatedKwh).toLocaleString('en-GB') + ' kWh electricity' : ''}${energy.fuel === 'dual' ? ' · ' : ''}${energy.fuel !== 'electricity' ? Math.round(energy.gasEstimatedKwh).toLocaleString('en-GB') + ' kWh gas' : ''}</span></div>`
    : '';

  const uwBreakdown = baseDetail
    ? `<div class="energy-cost-breakdown">${energy.fuel !== 'gas' ? `<span><small>Electricity</small><strong>£${wholeMoney(baseDetail.electricityMonthly)}/m</strong></span>` : ''}${energy.fuel !== 'electricity' ? `<span><small>Gas</small><strong>£${wholeMoney(baseDetail.gasMonthly)}/m</strong></span>` : ''}<span class="total"><small>Total</small><strong>£${wholeMoney(result.uw.energy)}/m</strong></span></div>`
    : `<div class="selected-service-price energy-price"><strong>UW Energy</strong><span>${result.uw.energy > 0 ? `£${wholeMoney(result.uw.energy)}/m` : 'Waiting for usage'}</span><small>${escapeHtml(tariffLabel)} · ${tier}-service price</small></div>`;

  const uwPeakRates = peakDetail?.electricityRates;
  const liveSuiteRows = tariffData
    ? buildTariffGrid(tariffData, appointment).filter(row => ['standardVariable','tracker','fixed'].includes(row.id))
    : [];

  return `<section class="card service-workspace energy-workspace" id="energyPanel">
    <div class="compact-workspace-title"><strong>⚡🔥 Energy</strong><span>${escapeHtml(fuelLabel)}</span></div>
    <div class="energy-top-row"><label class="field region-field"><span>Region</span><select data-field="energy.region">${REGIONS.map(([id,label]) => `<option value="${id}"${selected(energy.region,id)}>${label}</option>`).join('')}</select></label>${energyTariffControl()}</div>

    ${estimateSummary}
    <div class="compare-grid energy-core-compare">
      <div class="compare-column current-column${usingCurrentUsage ? ' usage-selected' : ''}"><div class="compare-label">CURRENT</div>
        <div class="energy-usage-pair first-block"><small class="usage-section-label">Current provider usage</small>
          ${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity <small>Annual kWh</small></span>${integerField('energy.electricityBillKwh',energy.electricityBillKwh,'min="0" placeholder="kWh/year"')}</label>` : ''}
          ${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas <small>Annual kWh</small></span>${integerField('energy.gasBillKwh',energy.gasBillKwh,'min="0" placeholder="kWh/year"')}</label>` : ''}
          <button class="usage-choice-button${usingCurrentUsage ? ' selected' : ''}" type="button" data-energy-usage-source="bill" ${currentUsageReady ? '' : 'disabled'}>${usingCurrentUsage ? '✓ Using this usage' : 'Use this usage'}</button>
        </div>
        <div class="energy-cost-block"><small class="usage-section-label">Current cost</small>${currentBlock}</div>
        <details class="advanced compact-advanced" ${energy.currentCostMode !== 'monthly' ? 'open' : ''}><summary>Current cost options</summary><p class="micro-copy">Usually use the total monthly Direct Debit. Open this only if the fuels are billed separately or annual costs are easier.</p><div class="segmented wrap"><button class="${on(energy.currentCostMode,'monthly')}" type="button" data-choice="energy.currentCostMode" data-value="monthly">Monthly DD</button><button class="${on(energy.currentCostMode,'split')}" type="button" data-choice="energy.currentCostMode" data-value="split">Separate DDs</button><button class="${on(energy.currentCostMode,'annual')}" type="button" data-choice="energy.currentCostMode" data-value="annual">Annual costs</button></div></details>
        <label class="compact-toggle full current-side-option"><span>Exit fees</span><span class="switch-control"><input type="checkbox" data-field="energy.exitFeesApply"${checked(energy.exitFeesApply)} aria-label="Energy exit fees apply"><i></i></span></label>
        ${energy.exitFeesApply ? `<div class="grid-2 compact-split field-gap">${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity exit fee</span>${field('energy.electricityExitFee',energy.electricityExitFee,'type="number" min="0" step="1"')}</label>` : ''}${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas exit fee</span>${field('energy.gasExitFee',energy.gasExitFee,'type="number" min="0" step="1"')}</label>` : ''}</div>` : ''}
      </div>

      <div class="compare-column uw-column${usingUwUsage ? ' usage-selected' : ''}"><div class="compare-label">UW</div>
        <div class="energy-usage-pair first-block"><small class="usage-section-label">Quote usage <span>(national database)</span></small>
          ${energy.fuel !== 'gas' ? `<label class="field"><span>Electricity <small>Annual kWh</small></span>${integerField('energy.electricityUwKwh',energy.electricityUwKwh,'min="0" placeholder="kWh/year"')}</label>` : ''}
          ${energy.fuel !== 'electricity' ? `<label class="field"><span>Gas <small>Annual kWh</small></span>${integerField('energy.gasUwKwh',energy.gasUwKwh,'min="0" placeholder="kWh/year"')}</label>` : ''}
          <button class="usage-choice-button${usingUwUsage ? ' selected' : ''}" type="button" data-energy-usage-source="uw">${usingUwUsage ? '✓ Using this usage' : 'Use this usage'}</button>
        </div>
        <div class="energy-cost-block"><small class="usage-section-label">UW cost</small>${uwBreakdown}<small class="tariff-source-line">${escapeHtml(baseDetail?.tariffName || tariffLabel)} · ${tier}-service price</small></div>
      </div>
    </div>

    <details class="advanced usage-estimate-fallback"><summary>Using Low, Medium or High?</summary><p class="micro-copy">Use one preset for the whole household. It replaces any electricity and gas usage already entered above.</p><div class="estimate-band-row">${estimateBands.map(([id,label,electricity,gas]) => `<button class="estimate-band${usingEstimate && ((energy.fuel === 'gas' ? energy.gasEstimatedKwh === gas : energy.electricityEstimatedKwh === electricity)) ? ' on' : ''}" type="button" data-estimate-band="${id}" data-electricity="${electricity}" data-gas="${gas}"><strong>${label}</strong><small>${energy.fuel !== 'gas' ? electricity.toLocaleString('en-GB') + ' elec' : ''}${energy.fuel === 'dual' ? '<br>' : ''}${energy.fuel !== 'electricity' ? gas.toLocaleString('en-GB') + ' gas' : ''}</small></button>`).join('')}</div></details>

    ${energy.fuel !== 'gas' ? `<section class="workspace-section compact-options offpeak-section">
      <label class="compact-toggle full"><span>Peak / off-peak</span><span class="switch-control"><input type="checkbox" data-field="energy.peakOffPeak"${checked(energy.peakOffPeak)}><i></i></span></label>
      ${energy.peakOffPeak ? `<button class="secondary wide split-estimator-launch" type="button" data-open-split-estimator>Estimate peak / off-peak split</button>
      <div class="compare-grid offpeak-compare">
        <div class="compare-column current-column offpeak-side">
          <div class="compare-label">CURRENT PROVIDER</div>
          <div class="segmented service-colour-segmented"><button class="${on(energy.electricityProfile,'economy7')}" type="button" data-choice="energy.electricityProfile" data-value="economy7">Economy 7</button><button class="${on(energy.electricityProfile,'ev')}" type="button" data-choice="energy.electricityProfile" data-value="ev">EV</button></div>
          <div class="grid-2 offpeak-usage-fields"><label class="field"><span>☀️ Peak usage</span>${integerField('energy.dayKwh',energy.dayKwh,'min="0" placeholder="kWh"')}</label><label class="field"><span>🌙 Off-peak usage</span>${integerField('energy.nightKwh',energy.nightKwh,'min="0" placeholder="kWh"')}</label></div>
          <div class="rate-fields"><label class="field"><span>☀️ Peak unit rate</span>${field('energy.currentDayRate',energy.currentDayRate,'type="number" min="0" step="0.01" placeholder="p/kWh"')}</label><label class="field"><span>🌙 Off-peak unit rate</span>${field('energy.currentNightRate',energy.currentNightRate,'type="number" min="0" step="0.01" placeholder="p/kWh"')}</label><label class="field"><span>Standing charge</span>${field('energy.currentStandingCharge',energy.currentStandingCharge,'type="number" min="0" step="0.01" placeholder="p/day"')}</label></div>
          <div class="segmented vat-toggle"><button class="${!energy.currentRatesIncludeVat ? 'on' : ''}" type="button" data-current-vat="ex">Rates exclude VAT</button><button class="${energy.currentRatesIncludeVat ? 'on' : ''}" type="button" data-current-vat="inc">Rates include VAT</button></div>
          <div class="offpeak-cost-row"><span>Calculated monthly cost</span><strong>${e7CurrentAnnual ? `£${wholeMoney(e7CurrentAnnual / 12)}/m` : 'Add usage + rates'}</strong></div>
        </div>

        <div class="compare-column uw-column offpeak-side">
          <div class="compare-label">UW</div>
          <div class="segmented service-colour-segmented"><button class="${on(energy.electricityProfile,'economy7')}" type="button" data-choice="energy.electricityProfile" data-value="economy7">Economy 7</button><button class="${on(energy.electricityProfile,'ev')}" type="button" data-choice="energy.electricityProfile" data-value="ev">EV</button></div>
          <div class="offpeak-readonly-grid"><span><small>☀️ Peak usage</small><strong>${Math.round(Number(energy.dayKwh || 0)).toLocaleString('en-GB')} kWh</strong></span><span><small>🌙 Off-peak usage</small><strong>${Math.round(Number(energy.nightKwh || 0)).toLocaleString('en-GB')} kWh</strong></span></div>
          ${uwPeakRates && uwPeakRates.peak != null ? `<div class="rate-readout"><span><small>☀️ Peak unit rate</small><strong>${money(uwPeakRates.peak)}p/kWh</strong></span><span><small>🌙 Off-peak unit rate</small><strong>${money(uwPeakRates.offPeak)}p/kWh</strong></span><span><small>Standing charge</small><strong>${money(uwPeakRates.standing)}p/day</strong></span><small class="vat-note">UW rates shown including VAT</small></div>` : '<p class="notice">This peak / off-peak tariff is not currently available in the live feed for this region and basket.</p>'}
          <div class="offpeak-cost-row uw"><span>Calculated UW monthly cost</span><strong>${peakDetail ? `£${wholeMoney(peakDetail.monthly)}/m` : 'Not available'}</strong></div>
        </div>
      </div>` : ''}
    </section>` : ''}

    <details class="advanced energy-advanced"><summary>Confirmed quote / manual Energy override</summary>
      <div class="segmented wrap"><button class="${on(energy.uwQuoteMode,'single')}" type="button" data-choice="energy.uwQuoteMode" data-value="single">Manual UW quote</button><button class="${on(energy.uwQuoteMode,'tiers')}" type="button" data-choice="energy.uwQuoteMode" data-value="tiers">Live tariff suite</button></div>
      ${energy.uwQuoteMode === 'single'
        ? `<div class="compare-grid field-gap"><div class="compare-column current-column"><div class="compare-label">CURRENT</div><p class="micro-copy">No UW quote override applies here.</p></div><div class="compare-column uw-column"><div class="compare-label">UW</div><label class="field"><span>Confirmed UW monthly amount</span>${field('energy.uwMonthly',energy.uwMonthly,'type="number" min="0" step="1" data-round-whole="true"')}</label></div></div>`
        : `<div class="compare-grid field-gap"><div class="compare-column current-column"><div class="compare-label">CURRENT</div><p class="micro-copy">The live tariff suite applies to UW only. The selected tariff above drives the main comparison.</p></div><div class="compare-column uw-column"><div class="compare-label">UW TARIFF SUITE</div><div class="suite-family-list">${liveSuiteRows.map(row => `<div class="suite-family"><strong>${escapeHtml(row.label)}</strong><div class="suite-price-list">${[1,2,3].map(count => { const detail = row.values[count]; return `<span><small>${count} service${count === 1 ? '' : 's'}</small><strong>${detail ? `£${wholeMoney(detail.monthly)}/m` : '—'}</strong><b>${escapeHtml(detail?.tariffName || row.label)}</b></span>`; }).join('')}</div></div>`).join('') || '<p class="micro-copy">No live tariff suite data is available for this region.</p>'}</div></div>`}
      <label class="compact-toggle full"><span>Manual Energy adjustment</span><span class="switch-control"><input type="checkbox" data-field="energy.adjustmentEnabled"${checked(energy.adjustmentEnabled)}><i></i></span></label>
      ${energy.adjustmentEnabled ? `<div class="compare-grid field-gap manual-energy-adjustment">
        ${['current','uw'].map(side => `<div class="compare-column ${side === 'uw' ? 'uw-column' : 'current-column'}"><div class="compare-label">${side === 'uw' ? 'UW' : 'CURRENT'}</div><button class="side-select ${on(energy.adjustmentTarget,side)}" type="button" data-choice="energy.adjustmentTarget" data-value="${side}">${energy.adjustmentTarget === side ? '✓ Adjusting this side' : 'Adjust this side'}</button>${energy.adjustmentTarget === side ? `<div class="segmented sign-toggle"><button class="${on(energy.adjustmentSign,'plus')}" type="button" data-choice="energy.adjustmentSign" data-value="plus">+ add cost</button><button class="${on(energy.adjustmentSign,'minus')}" type="button" data-choice="energy.adjustmentSign" data-value="minus">− reduce cost</button></div><label class="field"><span>Amount</span>${field('energy.adjustmentAmount',energy.adjustmentAmount,'type="number" min="0" step="1"')}</label><label class="field"><span>Regularity</span><select data-field="energy.adjustmentPeriod"><option value="monthly"${selected(energy.adjustmentPeriod,'monthly')}>Monthly</option><option value="annual"${selected(energy.adjustmentPeriod,'annual')}>Annual</option></select></label><label class="field"><span>Reason</span>${field('energy.adjustmentReason',energy.adjustmentReason,'placeholder="Optional note"')}</label>` : ''}</div>`).join('')}
      </div>` : ''}
    </details>
  </section>`;
}

function renderBroadband() {
  const bb = appointment.broadband;
  const packages = UW_RULES_2026_10_01.broadband.packages.filter(item => bb.connectionFamily === 'part' ? /^ultra/.test(item.id) : /^fibre/.test(item.id));
  const chosen = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === bb.packageId);
  const result = calculateAppointment(appointment);
  const familyLabel = bb.connectionFamily === 'part' ? 'Part Fibre' : 'Full Fibre';
  const phoneBundleLabel = bb.homePhoneBundle === 'peakSaver' ? 'Peak Saver' : bb.homePhoneBundle === 'offPeakSaver' ? 'Off-Peak Saver' : 'No call bundle';
  return `<section class="card service-workspace broadband-workspace" id="broadbandPanel">
    <div class="compact-workspace-title"><strong>🛜 Broadband</strong><span>${escapeHtml(familyLabel)}</span></div>
    <div class="compare-grid">
      <div class="compare-column current-column"><div class="compare-label">CURRENT</div>
        <label class="field"><span>Monthly cost</span>${field('broadband.currentMonthly',bb.currentMonthly,'type="number" min="0" step="1" data-round-whole="true" placeholder="£ per month"')}</label>
        <details class="advanced compact-advanced" ${bb.currentSpeed ? 'open' : ''}><summary>Current speed <small>(optional)</small></summary><label class="field"><span>Speed / note</span>${field('broadband.currentSpeed',bb.currentSpeed,'placeholder="e.g. 100 Mbps"')}</label></details>
        <label class="compact-toggle full current-side-option"><span>Exit fees</span><span class="switch-control"><input type="checkbox" data-field="broadband.exitFeesApply"${checked(bb.exitFeesApply)}><i></i></span></label>${bb.exitFeesApply ? `<label class="field field-gap"><span>Broadband exit fee</span>${field('broadband.exitFee',bb.exitFee,'type="number" min="0"')}</label>` : ''}
      </div>
      <div class="compare-column uw-column"><div class="compare-label">UW</div>
        <small class="uw-subhead">${escapeHtml(familyLabel)}</small>
        <div class="broadband-package-list ${bb.connectionFamily === 'full' ? 'full-fibre-row' : 'part-fibre-row'}">${packages.map(item => {
          const speedLabel = bb.connectionFamily === 'full' ? item.label.replace('Full Fibre ', '') : item.label;
          return `<button class="broadband-package-option${on(bb.packageId,item.id)}" type="button" data-package="${item.id}"><strong>${escapeHtml(speedLabel)}</strong></button>`;
        }).join('')}</div>
        ${chosen ? `<div class="selected-service-price broadband-price"><strong>${escapeHtml(chosen.label)}</strong><span>£${money(result.uw.broadband)}/m</span></div>` : '<p class="hint">Choose the speed/package above.</p>'}
        <div class="uw-side-options">
          <label class="compact-toggle full"><span>Whole Home Wi-Fi <small>+£5/m</small></span><span class="switch-control"><input type="checkbox" data-field="broadband.wholeHomeWifi"${checked(bb.wholeHomeWifi)}><i></i></span></label>
          ${appointment.person.homeStatus === 'homeowner' ? `<label class="compact-toggle full"><span>6 months free</span><span class="switch-control"><input type="checkbox" data-field="broadband.freeMonthsOffer"${checked(bb.freeMonthsOffer)}><i></i></span></label>` : ''}
          <label class="compact-toggle full"><span>Digital phone line</span><span class="switch-control"><input type="checkbox" data-field="broadband.homePhoneEnabled"${checked(bb.homePhoneEnabled)}><i></i></span></label>
          ${bb.homePhoneEnabled ? `<div class="digital-phone-options"><small class="uw-subhead">Call bundle</small><div class="phone-bundle-pills"><button class="phone-bundle-option${on(bb.homePhoneBundle,'none')}" type="button" data-choice="broadband.homePhoneBundle" data-value="none"><strong>No bundle</strong><small>£0/m</small></button><button class="phone-bundle-option${on(bb.homePhoneBundle,'offPeakSaver')}" type="button" data-choice="broadband.homePhoneBundle" data-value="offPeakSaver"><strong>Off-Peak Saver</strong><small>£6.50/m</small></button><button class="phone-bundle-option${on(bb.homePhoneBundle,'peakSaver')}" type="button" data-choice="broadband.homePhoneBundle" data-value="peakSaver"><strong>Peak Saver</strong><small>£13/m</small></button></div><p class="micro-copy">Choose one call bundle only. Digital Home Phone line rental is £0 with Full Fibre.</p></div>` : ''}
        </div>
      </div>
    </div>
  </section>`;
}

function renderMobile() {
  const mobile = appointment.mobile;
  return `<section class="card service-workspace mobile-workspace" id="mobilePanel">
    <div class="compact-workspace-title"><strong>📱 Mobile</strong><span>${mobile.simCount} SIM${mobile.simCount === 1 ? '' : 's'}${mobile.simCount > 1 ? ` · <button class="inline-action" type="button" data-toggle-sim-names>${mobile.showNames ? 'Hide names' : 'Name SIMs'}</button>` : ''}</span></div>
    <div class="stack compact-sim-list">${mobile.sims.map((sim,index) => `<div class="sim compact-sim"><div class="sim-title"><strong>${escapeHtml(mobile.showNames ? sim.name || `SIM ${index+1}` : `SIM ${index+1}`)}</strong>${mobile.showNames ? `<label class="field inline-name"><span>Name</span>${field(`mobile.sims.${index}.name`,sim.name,'maxlength="40" placeholder="Optional name"')}</label>` : ''}</div><div class="compare-grid"><div class="compare-column current-column"><div class="compare-label">CURRENT</div><label class="field"><span>Monthly cost</span>${field(`mobile.sims.${index}.currentMonthly`,sim.currentMonthly,'type="number" min="0" step="1" data-round-whole="true"')}</label><label class="compact-toggle full current-side-option"><span>Exit fee</span><span class="switch-control"><input type="checkbox" data-field="mobile.sims.${index}.exitFeesApply"${checked(sim.exitFeesApply)}><i></i></span></label>${sim.exitFeesApply ? `<label class="field field-gap"><span>Exit fee amount</span>${field(`mobile.sims.${index}.exitFee`,sim.exitFee,'type="number" min="0"')}</label>` : ''}</div><div class="compare-column uw-column"><div class="compare-label">UW</div><div class="plan-grid compact-plans"><button class="plan-option${on(sim.planId,'essentialMax')}" type="button" data-sim-plan="${index}" data-value="essentialMax"><strong>Go Ess'l</strong><span>£6/m</span></button><button class="plan-option${on(sim.planId,'unlimitedMax')}" type="button" data-sim-plan="${index}" data-value="unlimitedMax"><strong>Go U'ltd</strong><span>£13/m</span></button></div></div></div>${sim.planId === 'unlimitedMax' && mobile.sims.slice(0,index).some(item => item.include && item.planId === 'unlimitedMax') ? '<p class="notice">Additional Go Unlimited: first 3 months free, then £13/month.</p>' : ''}</div>`).join('')}</div>
  </section>`;
}

function renderBoilerCover() {
  const boiler = appointment.boilerCover;
  return `<section class="card service-workspace boiler-workspace" id="boilerPanel"><div class="compact-workspace-title"><strong>🛠️ Boiler Cover</strong><span>£25/m with UW</span></div><div class="compare-grid"><div class="compare-column current-column"><div class="compare-label">CURRENT</div><label class="field"><span>Monthly cost</span>${field('boilerCover.currentMonthly',boiler.currentMonthly,'type="number" min="0" step="1" data-round-whole="true"')}</label><label class="compact-toggle full current-side-option"><span>Exit fee</span><span class="switch-control"><input type="checkbox" data-field="boilerCover.exitFeesApply"${checked(boiler.exitFeesApply)}><i></i></span></label>${boiler.exitFeesApply ? `<label class="field field-gap"><span>Exit fee amount</span>${field('boilerCover.exitFee',boiler.exitFee,'type="number" min="0" step="1" data-round-whole="true"')}</label>` : ''}</div><div class="compare-column uw-column"><div class="compare-label">UW</div><div class="selected-service-price"><strong>Boiler Cover</strong><span>£${money(boiler.monthly)}/m</span></div></div></div></section>`;
}

function renderAdjustments() {
  const a = appointment.adjustments;
  const cashbackResult = calculateAppointment(appointment).cashback;
  const recurringColumn = (side,label) => {
    const amountKey = side === 'current' ? 'currentAmount' : 'uwAmount';
    const reasonKey = side === 'current' ? 'currentReason' : 'uwReason';
    const periodKey = side === 'current' ? 'currentPeriod' : 'uwPeriod';
    const signKey = side === 'current' ? 'currentSign' : 'uwSign';
    return `<div class="compare-column ${side === 'uw' ? 'uw-column' : 'current-column'}"><div class="compare-label">${label}</div><div class="segmented sign-toggle"><button class="${on(a[signKey],'plus')}" type="button" data-choice="adjustments.${signKey}" data-value="plus">+ add cost</button><button class="${on(a[signKey],'minus')}" type="button" data-choice="adjustments.${signKey}" data-value="minus">− reduce cost</button></div><label class="field"><span>Amount</span>${field(`adjustments.${amountKey}`,a[amountKey],'type="number" min="0" step="1"')}</label><label class="field"><span>Regularity</span><select data-field="adjustments.${periodKey}"><option value="monthly"${selected(a[periodKey],'monthly')}>Monthly</option><option value="annual"${selected(a[periodKey],'annual')}>Annual</option></select></label><label class="field"><span>Reason</span>${field(`adjustments.${reasonKey}`,a[reasonKey],'placeholder="Optional note"')}</label></div>`;
  };
  const oneOffColumn = (side,label) => {
    const amountKey = side === 'current' ? 'oneOffCurrentAmount' : 'oneOffUwAmount';
    const reasonKey = side === 'current' ? 'oneOffCurrentReason' : 'oneOffUwReason';
    const signKey = side === 'current' ? 'oneOffCurrentSign' : 'oneOffUwSign';
    return `<div class="compare-column ${side === 'uw' ? 'uw-column' : 'current-column'}"><div class="compare-label">${label}</div><div class="segmented sign-toggle"><button class="${on(a[signKey],'plus')}" type="button" data-choice="adjustments.${signKey}" data-value="plus">+ add cost</button><button class="${on(a[signKey],'minus')}" type="button" data-choice="adjustments.${signKey}" data-value="minus">− reduce cost</button></div><label class="field"><span>One-off amount</span>${field(`adjustments.${amountKey}`,a[amountKey],'type="number" min="0" step="1"')}</label><label class="field"><span>Reason</span>${field(`adjustments.${reasonKey}`,a[reasonKey],'placeholder="Optional note"')}</label></div>`;
  };
  return `<section class="card cashback-card">
    <div class="compact-workspace-title"><strong>💳 Cashback Card</strong><span>${appointment.cashback.enabled ? `~£${money(cashbackResult.selected)}/m` : 'Not included'}</span></div>
    <div class="compare-grid cashback-compare">
      <div class="compare-column current-column cashback-current"><div class="compare-label">CURRENT</div><div class="cashback-current-message"><strong>No Cashback Card adjustment</strong><small>Nothing is deducted from the Current total here.</small></div></div>
      <div class="compare-column uw-column cashback-uw"><div class="compare-label">UW</div>
        <label class="compact-toggle full cashback-toggle"><span>Include cashback estimate</span><span class="switch-control"><input type="checkbox" data-field="cashback.enabled"${checked(appointment.cashback.enabled)}><i></i></span></label>
        ${appointment.cashback.enabled ? `<div class="cashback-slider cashback-slider-compact"><div class="slider-heading"><span><strong>Monthly card spend</strong></span><output data-cashback-output>£${money(appointment.cashback.monthlySpend)}</output></div><input type="range" min="0" max="2500" step="50" value="${Number(appointment.cashback.monthlySpend || 0)}" data-field="cashback.monthlySpend" aria-label="Monthly Cashback Card spend"><p class="cashback-estimate">Estimated cashback: <strong>~£${money(cashbackResult.selected)}/m</strong></p><details class="advanced compact-advanced cashback-basis"><summary>Low, Medium or High?</summary><div class="cashback-basis-grid"><button class="pill${on(appointment.cashback.tier,'low')}" type="button" data-choice="cashback.tier" data-value="low"><strong>Low</strong><small>~£${money(cashbackResult.low)}/m</small></button><button class="pill${on(appointment.cashback.tier,'average')}" type="button" data-choice="cashback.tier" data-value="average"><strong>Medium</strong><small>~£${money(cashbackResult.average)}/m</small></button><button class="pill${on(appointment.cashback.tier,'high')}" type="button" data-choice="cashback.tier" data-value="high"><strong>High</strong><small>~£${money(cashbackResult.high)}/m</small></button></div></details></div>` : ''}
      </div>
    </div>

    <details class="advanced advanced-adjustments"><summary>Advanced adjustments</summary>
      <label class="compact-toggle full"><span>Manual recurring adjustment</span><span class="switch-control"><input type="checkbox" data-field="adjustments.recurringEnabled"${checked(a.recurringEnabled)}><i></i></span></label>
      ${a.recurringEnabled ? `<div class="compare-grid field-gap manual-adjustment-grid">${recurringColumn('current','CURRENT')}${recurringColumn('uw','UW')}</div>` : ''}
      <label class="compact-toggle full"><span>One-off benefit / adjustment</span><span class="switch-control"><input type="checkbox" data-field="adjustments.oneOffEnabled"${checked(a.oneOffEnabled)}><i></i></span></label>
      ${a.oneOffEnabled ? `<div class="compare-grid field-gap manual-adjustment-grid">${oneOffColumn('current','CURRENT')}${oneOffColumn('uw','UW')}</div>` : ''}
    </details>
  </section>`;
}

function summaryGatePanel(completion = appointmentCompleteness(appointment)) {
  const content = completion.total
    ? `<p>The summary unlocks when all minimum comparison data for this basket is complete.</p><ul>${completion.missing.map(item => `<li>${escapeHtml(item.label)}</li>`).join('')}</ul>`
    : '<p>Add at least one service to the basket before building a summary.</p>';
  return `<section class="card summary-gate" id="summaryGate"><div class="section-title"><div><div class="eyebrow">Summary locked</div><h2>${completion.total ? `${completion.completed} of ${completion.total} required fields complete` : 'No comparison basket yet'}</h2></div><strong>${completion.percentage}%</strong></div>${content}</section>`;
}

function refreshCompletenessUi() {
  const completion = appointmentCompleteness(appointment);
  const sticky = document.getElementById('stickyBasket');
  if (sticky) sticky.outerHTML = stickyBasketBar();
  const action = document.querySelector('.action-bar [data-go="summary"]');
  if (action) {
    action.textContent = 'Show Summary';
    action.disabled = !completion.complete;
    action.setAttribute('aria-disabled', completion.complete ? 'false' : 'true');
  }
}

function renderAppointment() {
  if (appointment.services.energy && tariffData) syncSelectedTariffTiers();
  const home = appointment.person.homeStatus;
  const completion = appointmentCompleteness(appointment);
  app.innerHTML = `<div class="stack appointment-screen">
    ${customerEssentialsBlock()}
    ${stickyBasketBar()}
    ${appointment.services.energy ? renderEnergy() : ''}${appointment.services.broadband ? renderBroadband() : ''}${appointment.services.mobile ? renderMobile() : ''}${appointment.services.boilerCover && home === 'homeowner' ? renderBoilerCover() : ''}
    ${renderAdjustments()}
    ${energyTariffModal()}
    ${splitEstimatorModal()}
    <section class="action-bar summary-only"><button class="primary wide${completion.complete ? '' : ' gated'}" type="button" data-go="summary" aria-disabled="${completion.complete ? 'false' : 'true'}">Show Summary</button></section>
    ${completion.complete ? '' : summaryGatePanel(completion)}
  </div>`;
}

function updateLiveResults() {
  const result = calculateAppointment(appointment);
  const host = document.querySelector('.energy-price');
  if (host) {
    const label = {
      standardVariable: 'Variable', tracker: 'Tracker', fixed: 'Fixed',
      evVariable: 'EV Variable', economy7Variable: 'Economy 7 Variable', fixedE7: 'Fixed Economy 7'
    }[appointment.energy.selectedTariffFamily] || 'Fixed';
    host.innerHTML = `<strong>UW Energy</strong><span>${result.uw.energy > 0 ? `£${wholeMoney(result.uw.energy)}/m` : 'Waiting for usage'}</span><small>${escapeHtml(label)} · ${result.rules.energyTariff || 1}-service price</small>`;
  }
}

function summaryLines(result) {
  return `<div class="summary-table"><div class="summary-line"><span>Current monthly cost</span><strong>£${wholeMoney(result.current.total)}</strong></div><div class="summary-line"><span>UW service cost</span><strong>£${wholeMoney(result.uw.total)}</strong></div><div class="summary-line"><span>Effective UW monthly position</span><strong>£${wholeMoney(result.effectiveUwMonthly ?? result.uw.total)}</strong></div><div class="summary-line"><span>Effective monthly saving</span><strong class="money ${(result.effectiveMonthlySaving ?? result.monthlyServiceSaving) >= 0 ? 'good' : 'bad'}">${(result.effectiveMonthlySaving ?? result.monthlyServiceSaving) < 0 ? '−' : ''}£${wholeMoney(Math.abs(result.effectiveMonthlySaving ?? result.monthlyServiceSaving))}</strong></div><div class="summary-line"><span>Welcome Bonus</span><strong>£${money(result.welcomeBonus)}</strong></div>${result.mobileIntroBenefit ? `<div class="summary-line"><span>Additional Unlimited first 3 months</span><strong>£${money(result.mobileIntroBenefit)}</strong></div>` : ''}${result.broadbandIntroBenefit ? `<div class="summary-line"><span>Broadband introductory benefit</span><strong>£${money(result.broadbandIntroBenefit)}</strong></div>` : ''}${result.referral ? `<div class="summary-line"><span>Referral</span><strong>£${money(result.referral)}</strong></div>` : ''}${result.nationalLeague ? `<div class="summary-line"><span>National League voucher</span><strong>£${money(result.nationalLeague)}</strong></div>` : ''}${result.oneOff ? `<div class="summary-line"><span>${result.oneOff > 0 ? 'One-off benefit' : 'One-off charge'}</span><strong class="money ${result.oneOff > 0 ? 'good' : 'bad'}">${result.oneOff < 0 ? '−' : ''}£${money(Math.abs(result.oneOff))}</strong></div>` : ''}${result.exitFeeDeduction ? `<div class="summary-line"><span>Exit-fee deduction</span><strong class="money bad">−£${money(result.exitFeeDeduction)}</strong></div>` : ''}<div class="summary-line"><span><strong>First-year result</strong></span><strong class="money ${result.yearOneResult >= 0 ? 'good' : 'bad'}">${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</strong></div></div>`;
}

function basketStrip(services = {}, count = 0) {
  const items = [
    ['energy','⚡🔥','Energy'], ['broadband','🛜','Broadband'], ['mobile','📱','Mobile'], ['boilerCover','🛠️','Boiler Cover']
  ].filter(([key]) => services[key]);
  return `<section class="basket-strip"><div class="section-title"><strong>${count} service${count === 1 ? '' : 's'} in this basket</strong><span class="basket-glyph">▰</span></div><div class="basket-services">${items.map(([key,icon,label]) => `<span class="basket-${key}"><i>${icon}</i>${label}</span>`).join('')}</div></section>`;
}

function monthlySummary(result) {
  const effective = result.effectiveUwMonthly ?? result.uw?.total ?? 0;
  const saving = result.effectiveMonthlySaving ?? result.monthlyServiceSaving ?? 0;
  return `<section class="monthly-summary"><div class="section-title"><strong>Monthly summary <small>(including Cashback Card)</small></strong><span title="The effective UW position includes the selected Cashback Card estimate.">ⓘ</span></div><div class="monthly-grid"><span></span><b>Current</b><b>UW*</b><b>Saving</b><strong>Total monthly</strong><strong>£${wholeMoney(result.current?.total)}</strong><strong>£${wholeMoney(effective)}</strong><strong class="money ${saving >= 0 ? 'good' : 'bad'}">${saving < 0 ? '−' : ''}£${wholeMoney(Math.abs(saving))}</strong></div><p>* UW service cost minus estimated Cashback Card contribution where selected.</p></section>`;
}

function summaryAccordions(result) {
  const serviceAnnual = Number(result.monthlyServiceSaving || 0) * 12;
  const bonusTotal = Number(result.welcomeBonus || 0) + Number(result.mobileIntroBenefit || 0) + Number(result.broadbandIntroBenefit || 0) + Number(result.referral || 0) + Number(result.nationalLeague || 0) + Number(result.oneOff || 0) - Number(result.exitFeeDeduction || 0);
  const cashbackAnnual = Number(result.cashback?.active ? result.cashback.monthlyNet * 12 + result.cashback.feeWaiver : result.cashbackAnnual || 0);
  return `<div class="summary-accordions"><details><summary><span class="accordion-icon">▥</span><strong>Year-one savings on services</strong><b>£${money(serviceAnnual)}</b></summary><div>${summaryLines(result)}</div></details><details><summary><span class="accordion-icon">◆</span><strong>Year-one bonuses &amp; adjustments</strong><b>£${money(bonusTotal)}</b></summary><div class="summary-table"><div class="summary-line"><span>Welcome Bonus</span><strong>£${money(result.welcomeBonus)}</strong></div>${result.mobileIntroBenefit ? `<div class="summary-line"><span>Additional Unlimited offer</span><strong>£${money(result.mobileIntroBenefit)}</strong></div>` : ''}${result.broadbandIntroBenefit ? `<div class="summary-line"><span>Broadband offer</span><strong>£${money(result.broadbandIntroBenefit)}</strong></div>` : ''}${result.referral ? `<div class="summary-line"><span>Referral</span><strong>£${money(result.referral)}</strong></div>` : ''}${result.nationalLeague ? `<div class="summary-line"><span>National League voucher</span><strong>£${money(result.nationalLeague)}</strong></div>` : ''}${result.oneOff ? `<div class="summary-line"><span>${result.oneOff > 0 ? 'One-off benefit' : 'One-off charge'}</span><strong>${result.oneOff < 0 ? '−' : ''}£${money(Math.abs(result.oneOff))}</strong></div>` : ''}${result.exitFeeDeduction ? `<div class="summary-line"><span>Exit-fee deduction</span><strong>−£${money(result.exitFeeDeduction)}</strong></div>` : ''}</div></details><details><summary><span class="accordion-icon">▰</span><strong>Cashback Card benefits</strong><b>${cashbackAnnual ? `£${money(cashbackAnnual)}` : 'Not included'}</b></summary><div><p class="lead">Cashback contribution is folded into the effective monthly UW position above.</p></div></details></div>`;
}

function mealDealBlock(preview, active, customer = false) {
  if (!preview) return '';
  const result = preview.previewResult || preview.result;
  const change = Number(preview.improvement || 0);
  return `<section class="upgrade-card meal-deal-card"><div class="meal-deal-heading"><span class="meal-icon">🥪</span><div><h2>🥪 Meal Deal SIM</h2><p>${active ? 'Previewing the whole basket with the temporary £6 SIM scenario.' : 'See whether a £6 SIM changes the wider basket enough to improve the overall result.'}</p></div></div>${active ? `<div class="preview-badge">Preview only · saved appointment unchanged</div><div class="metric-grid"><div class="metric"><small>SIM cost</small><strong>£${money(preview.addedMonthlyCost)}/mo</strong></div><div class="metric"><small>Annual cost included</small><strong>£${money(preview.addedAnnualCost)}</strong></div><div class="metric"><small>First-year change</small><strong class="money ${change >= 0 ? 'good' : 'bad'}">${change >= 0 ? '+' : '−'}£${money(Math.abs(change))}</strong></div><div class="metric"><small>Energy tariff</small><strong>${result.energyTariff ?? result.rules?.energyTariff ?? '—'}</strong></div></div><div class="meal-actions">${customer ? '' : '<button class="primary" type="button" data-meal-add>Add £6 SIM to basket</button>'}<button class="secondary" type="button" data-meal-back>Back to original basket</button></div>` : '<button class="primary wide" type="button" data-meal-preview>Preview 🥪 Meal Deal SIM →</button>'}</section>`;
}

function renderSummary() {
  const completion = appointmentCompleteness(appointment);
  if (!completion.complete) { view = 'appointment'; renderAppointment(); return; }
  const preview = buildMealDealPreview(appointment);
  const showingPreview = Boolean(mealDealPreviewActive && preview);
  const result = showingPreview ? preview.previewResult : calculateAppointment(appointment);
  const displayAppointment = showingPreview ? preview.appointment : appointment;
  window.scrollTo(0, 0);
  app.innerHTML = `<div class="summary-page partner-summary"><header class="summary-header"><button class="back-chip" type="button" data-go="appointment">‹</button><span class="feature-icon appointment">📋</span><div><strong>Appointment Companion</strong><small>${showingPreview ? '🥪 Meal Deal SIM preview' : 'What they pay now. What they could save.'}</small></div><button class="icon-button" type="button" data-go="profile">•••</button></header>${showingPreview ? '<div class="preview-banner">Preview — the saved appointment has not changed.</div>' : ''}<section class="year-hero"><p>${showingPreview ? 'Preview year one in your pocket' : 'Year one in your pocket'}</p><h1>${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</h1><strong>One app · One password · One bill</strong><small>Prepared for ${escapeHtml(appointment.person.name)}</small><span aria-hidden="true">◒</span></section>${basketStrip(displayAppointment.services,result.rules.serviceCount)}${monthlySummary(result)}${summaryAccordions(result)}${result.e7StandardAnnualSaving ? `<p class="notice">Is Economy 7 still right for you? A standard alternative could save about £${money(result.e7StandardAnnualSaving)}/year.</p>` : ''}${mealDealBlock(preview,showingPreview)}<section class="card basket-link-card"><label class="field"><span>Optional personalised basket link</span>${field('summary.basketUrl',appointment.summary.basketUrl,'type="url" placeholder="https://…"')}</label><div data-basket-action>${basketLinkAction(appointment.summary.basketUrl)}</div></section><section class="summary-actions"><button class="primary" type="button" data-share>Share summary</button><button class="secondary" type="button" data-save-snapshot>Save snapshot</button><button class="quiet" type="button" data-copy-figures>Copy figures</button></section><p class="compliance-note">Indicative summary based on the figures entered. Confirm prices and eligibility in the official UW process.</p></div>`;
}

function basketLinkAction(url) {
  const safeBasketUrl = safeHttps(url);
  if (safeBasketUrl) return `<a class="action primary wide" href="${escapeHtml(safeBasketUrl)}" target="_blank" rel="noopener">Open basket →</a>`;
  return url ? '<p class="notice warn">Use a valid HTTPS basket URL before opening or sharing it.</p>' : '';
}

function refreshBasketLinkAction() {
  const host = document.querySelector('[data-basket-action]');
  if (host) host.innerHTML = basketLinkAction(appointment.summary.basketUrl);
}

function renderMakeMoney() {
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">Make Money</div><h1>Partner opportunities</h1><p class="lead">The current earnings tool and referral route are ready. Connector and Partner opportunity journeys have room to grow without blocking Save Money.</p></section><section class="card tool-card"><div class="tool-icon">💷</div><div class="tool-copy"><h2>${TOOLS.pet.label}</h2><p class="lead">Open the current PET experience.</p></div><button class="primary" type="button" data-tool="pet">Open PET</button></section><section class="card"><h2>Referrals</h2><p class="lead">Referral and National League inputs remain in the Save Money appointment and feed the first-year summary when eligible.</p>${currentRecord ? '<button class="secondary" type="button" data-go="appointment">Open appointment</button>' : '<button class="secondary" type="button" data-go="launchpad">Choose a person</button>'}</section><div class="grid-2"><section class="card placeholder"><h2>Connector</h2><p class="lead">Reserved for a later focused journey.</p></section><section class="card placeholder"><h2>Partner opportunity</h2><p class="lead">Reserved for a later focused journey.</p></section></div></div>`;
}

function renderTools() {
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">Tools</div><h1>Specialist conversations</h1><p class="lead">${currentRecord ? `Using ${escapeHtml(appointment.person.name)}'s known region and usage where the tool supports it.` : 'These tools also work without an Appointment Companion profile.'}</p></section><section class="card tool-card"><div class="tool-icon">📈</div><div class="tool-copy"><h2>Should I Fix?</h2><p class="lead">Compare usage against current and fixed tariff scenarios.</p></div><button class="primary" type="button" data-tool="fix">Open</button></section><section class="card tool-card"><div class="tool-icon">🚙</div><div class="tool-copy"><h2>EV Companion</h2><p class="lead">Explore home and EV charging costs with a standalone, shareable tool.</p></div><button class="primary" type="button" data-tool="ev">Open</button></section><section class="card tool-card"><div class="tool-icon">💷</div><div class="tool-copy"><h2>PET</h2><p class="lead">Partner Earnings - First 60 Days.</p></div><button class="secondary" type="button" data-tool="pet">Open</button></section></div>`;
}

function conflictValue(value) {
  if (value === undefined) return 'Not set';
  if (value === null) return 'None';
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return json.length > 160 ? `${json.slice(0,157)}…` : json;
  }
  const textValue = String(value);
  return textValue.length > 160 ? `${textValue.slice(0,157)}…` : textValue;
}

function renderMore() {
  const brand = branding();
  const auth = getCloudAuth();
  const conflicts = people.filter(person => person.conflict);
  app.innerHTML = `<div class="stack"><section class="card hero"><div class="eyebrow">More</div><h1>Settings &amp; customer safety</h1><p class="lead">Local storage remains primary. Cloud adds backup, sync and cross-device support.</p></section>
    <section class="card"><div class="section-title"><div><div class="eyebrow">People</div><h2>${people.length} saved on this device</h2></div><button class="secondary" type="button" data-manage-people>Manage</button></div></section>
    <section class="card cloud-card"><div class="section-title"><div><div class="eyebrow">Cloud</div><h2>${auth ? 'Connected for this session' : 'Optional connection'}</h2></div><span>${auth ? '☁️' : '📵'}</span></div><form id="cloudForm" class="grid-2"><label class="field"><span>Partner ID</span><input name="partner_id" autocomplete="username" value="${escapeHtml(auth?.partner_id || '')}"></label><label class="field"><span>Workspace key</span><input name="workspace_key" type="password" autocomplete="current-password" value="${escapeHtml(auth?.workspace_key || '')}"></label><div class="action-row"><button class="primary" type="submit">Save for session &amp; sync</button>${auth ? '<button class="quiet" type="button" data-cloud-disconnect>Disconnect</button>' : ''}</div></form><p class="hint">The workspace key stays in session storage and is never included in a customer share.</p></section>
    ${conflicts.length ? `<section class="card"><div class="section-title"><div><div class="eyebrow">Cloud conflicts</div><h2>Inspect before choosing</h2></div></div><div class="conflict-list">${conflicts.map(row => `<details class="conflict-inspector"><summary><span>🔍</span><strong>${escapeHtml(row.customer_name)}</strong><small>${row.conflict.paths?.length || 1} difference${(row.conflict.paths?.length || 1)===1?'':'s'}</small></summary><div class="conflict-table"><div class="conflict-head"><b>Field</b><b>This device</b><b>Cloud</b></div>${(row.conflict.paths || []).map(item => `<div class="conflict-line"><strong>${escapeHtml(item.path || 'Record')}</strong><span>${escapeHtml(conflictValue(item.local))}</span><span>${escapeHtml(conflictValue(item.remote))}</span></div>`).join('') || '<p class="hint">The Cloud record changed in a way that needs a choice.</p>'}</div><div class="action-row"><button class="secondary" type="button" data-conflict="${row.local_id}" data-choice="local">Keep mine</button><button class="quiet" type="button" data-conflict="${row.local_id}" data-choice="cloud">Use Cloud</button></div></details>`).join('')}</div></section>` : ''}
    <section class="card"><div class="eyebrow">Partner identity</div><h2>Customer-facing shares</h2>${brand.name ? '' : '<p class="notice">Set this up once. The role defaults to Authorised Utility Warehouse Partner.</p>'}<form id="brandingForm" class="grid-2"><label class="field"><span>Name</span><input name="name" value="${escapeHtml(brand.name || '')}"></label><label class="field"><span>Role</span><input name="role" value="${escapeHtml(brand.role || 'Authorised Utility Warehouse Partner')}"></label><label class="field"><span>Short message</span><input name="strap" value="${escapeHtml(brand.strap || '')}"></label><label class="field"><span>Join link (https)</span><input name="joinUrl" type="url" value="${escapeHtml(brand.joinUrl || '')}"></label><button class="primary" type="submit">Save details</button></form></section>
    <section class="card flat"><p class="hint">Appointment Companion V${VERSION}. Local database: ${customerStore.database.name}. October 2026 rule boundary.</p></section></div>`;
}

function resultFromShared(data = {}) {
  return {
    current: data.current || {}, uw: data.uw || {}, monthlyServiceSaving: data.monthlyServiceSaving || 0,
    effectiveUwMonthly: data.effectiveUwMonthly, effectiveMonthlySaving: data.effectiveMonthlySaving,
    welcomeBonus: data.welcomeBonus || 0, mobileIntroBenefit: data.mobileIntroBenefit || 0,
    broadbandIntroBenefit: data.broadbandIntroBenefit || 0, referral: data.referral || 0,
    nationalLeague: data.nationalLeague || 0, exitFees: data.exitFees || 0,
    exitFeeDeduction: data.exitFeeDeduction || 0, oneOff: data.oneOff || 0,
    cashbackAnnual: Number(data.cashbackMonthlyNet || 0) * 12 + Number(data.cashbackFeeWaiver || 0),
    yearOneResult: data.yearOneResult || 0,
    e7StandardAnnualSaving: data.energyInsight?.standardAnnualSaving || data.e7StandardAnnualSaving || 0
  };
}

function renderCustomerView(data) {
  sharedSummaryData = data;
  document.documentElement.classList.add('shared-view');
  document.getElementById('topbar').hidden = true;
  nav.hidden = true;
  const preview = data.mealDealPreview || null;
  const showingPreview = Boolean(sharedMealDealActive && preview);
  const source = showingPreview ? preview.result : data;
  const result = resultFromShared(source);
  const services = showingPreview ? preview.services : data.services || {};
  const serviceCount = showingPreview ? preview.result.serviceCount : Number(data.serviceCount || 0);
  app.innerHTML = `<div class="summary-page customer-summary"><header class="summary-header"><span class="feature-icon appointment">📋</span><div><strong>Appointment Companion</strong><small>${showingPreview ? '🥪 Meal Deal SIM preview' : 'Your personalised summary'}</small></div></header>${showingPreview ? '<div class="preview-banner">Preview only — this does not change the Partner’s saved appointment.</div>' : ''}<section class="year-hero"><p>${showingPreview ? 'Preview year one in your pocket' : 'Year one in your pocket'}</p><h1>${result.yearOneResult < 0 ? '−' : ''}£${money(Math.abs(result.yearOneResult))}</h1><strong>One app · One password · One bill</strong><small>Prepared for ${escapeHtml(data.personName || 'you')}</small><span aria-hidden="true">◒</span></section>${basketStrip(services,serviceCount)}${monthlySummary(result)}${summaryAccordions(result)}${result.e7StandardAnnualSaving ? `<p class="notice">Is Economy 7 still right for you? A standard alternative could save about £${money(result.e7StandardAnnualSaving)}/year.</p>` : ''}${mealDealBlock(preview,showingPreview,true)}${data.basketUrl ? `<section class="customer-cta"><span class="basket-glyph">▰</span><div><h2>Ready to get started?</h2><p>View your basket and take the next step.</p></div><a class="action primary wide" href="${escapeHtml(data.basketUrl)}" rel="noopener">View your basket →</a></section>` : ''}<div class="partner">${data.partnerName ? `<small>Your Partner</small><strong>${escapeHtml(data.partnerName)}</strong><p>${escapeHtml(data.partnerRole || '')}${data.partnerStrap ? `<br>${escapeHtml(data.partnerStrap)}` : ''}</p>` : ''}${data.joinUrl ? `<a href="${escapeHtml(data.joinUrl)}" rel="noopener">Start saving here →</a>` : ''}</div><p class="compliance-note">Illustrative summary, not a formal quote.</p></div>`;
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
  if (nextView === 'summary' && !appointmentCompleteness(appointment).complete) return showSummaryBlocked();
  if ((nextView !== view || nextSection !== section) && !(await guard.confirmNavigation())) return;
  section = nextSection;
  if (nextView === 'launchpad' && currentRecord) return leavePerson();
  if (['appointment', 'profile', 'summary'].includes(nextView) && !currentRecord) { view = 'launchpad'; section = 'save'; }
  else view = nextView;
  render();
}

async function createPerson(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!cleaned) {
    toast('Enter name first.');
    const input = document.getElementById('personNameInput');
    input?.focus();
    input?.classList.add('needs-attention');
    setTimeout(() => input?.classList.remove('needs-attention'), 1400);
    return;
  }
  appointment = createAppointment(cleaned);
  essentialsExpanded = true;
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
  if (!appointmentCompleteness(appointment).complete) return showSummaryBlocked();
  if (guard.isDirty()) await persistActive(true);
  const data = buildShareData(appointment, branding());
  const url = buildShareUrl(appointment, branding());
  shareDialog.innerHTML = `<div class="modal-card"><div class="section-title"><div><div class="eyebrow">Customer-safe share</div><h2>Share ${escapeHtml(appointment.person.name)}'s summary</h2></div><button class="quiet" data-close-dialog type="button">Close</button></div><p class="lead">Works with or without a basket link. Private notes, Cloud credentials and admin controls are excluded.</p><div class="metric-grid"><div class="metric"><small>Service count</small><strong>${data.serviceCount}</strong></div><div class="metric"><small>Energy tariff</small><strong>${data.energyTariff || '—'}</strong></div><div class="metric"><small>Welcome Bonus</small><strong>£${data.welcomeBonus}</strong></div></div><div class="modal-actions"><button class="primary" type="button" data-whatsapp data-url="${escapeHtml(url)}">WhatsApp</button><button class="secondary" type="button" data-copy-link data-url="${escapeHtml(url)}">Copy link</button><button class="quiet" type="button" data-copy-figures>Copy figures</button><a class="action quiet" href="${escapeHtml(url)}" target="_blank" rel="noopener">Preview customer view</a></div></div>`;
  shareDialog.showModal();
}

function visibleFiguresData() {
  const data = buildShareData(appointment, branding());
  const preview = mealDealPreviewActive ? data.mealDealPreview : null;
  if (!preview) return data;
  return {
    ...data,
    ...preview.result,
    services: preview.services,
    serviceCount: preview.result.serviceCount,
    energyTariff: preview.result.energyTariff,
    energyInsight: preview.result.e7StandardAnnualSaving ? { standardAnnualSaving: preview.result.e7StandardAnnualSaving } : null
  };
}

async function saveSummarySnapshot(type = 'summary_saved') {
  if (!appointmentCompleteness(appointment).complete) return showSummaryBlocked();
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
  if (!syncSelectedTariffTiers()) return false;
  if (appointment.energy.electricityProfile === 'economy7') {
    const standard = clone(appointment);
    standard.energy.peakOffPeak = false;
    standard.energy.electricityProfile = 'standard';
    standard.energy.selectedTariffFamily = 'fixed';
    const standardTier = buildIndicativeTiers(tariffData, standard)[calculateAppointment(appointment).rules.energyTariff || 1];
    if (standardTier) appointment.energy.e7StandardAnnualCost = standardTier.annual;
  }
  markChanged();
  render();
  return true;
}

function showSummaryBlocked() {
  mealDealPreviewActive = false;
  view = 'appointment';
  section = 'save';
  render();
  document.getElementById('summaryGate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('Complete the listed comparison fields to unlock the summary.');
  return false;
}

document.addEventListener('input', event => {
  const target = event.target;
  if (target.id === 'personNameInput') { showDuplicateWarning(target.value); showPersonSearch(target.value); return; }
  if (!target.dataset.field) return;
  setPath(appointment, target.dataset.field, inputValue(target));
  if (target.dataset.formatNumber === 'integer') {
    const rawDigits = String(target.value || '').replace(/[^0-9]/g,'').replace(/^0+(?=\d)/,'');
    target.value = rawDigits ? Number(rawDigits).toLocaleString('en-GB') : '';
  }
  if (target.dataset.field === 'cashback.monthlySpend') {
    const output = document.querySelector('[data-cashback-output]');
    if (output) output.textContent = `£${money(target.value)}/m`;
  }
  if ((target.type === 'number' || target.dataset.type === 'number') && target.value === '') {
    appointment.completion.entered = appointment.completion.entered.filter(path => path !== target.dataset.field);
  } else markComparisonFieldEntered(appointment, target.dataset.field);
  if (target.dataset.field === 'energy.billUsageAvailable' && !target.checked) {
    if (appointment.energy.electricityUsageSource === 'bill') appointment.energy.electricityUsageSource = 'uw';
    if (appointment.energy.gasUsageSource === 'bill') appointment.energy.gasUsageSource = 'uw';
  }
  if (target.dataset.field === 'energy.peakOffPeak') {
    appointment.energy.electricityProfile = target.checked
      ? appointment.energy.electricityProfile === 'standard' ? 'economy7' : appointment.energy.electricityProfile
      : 'standard';
    if (target.checked) {
      appointment.energy.selectedTariffFamily = appointment.energy.selectedTariffFamily === 'fixed'
        ? 'fixedE7'
        : appointment.energy.electricityProfile === 'ev' ? 'evVariable' : 'economy7Variable';
    } else if (['fixedE7','economy7Variable','evVariable'].includes(appointment.energy.selectedTariffFamily)) {
      appointment.energy.selectedTariffFamily = appointment.energy.selectedTariffFamily === 'fixedE7' ? 'fixed' : 'standardVariable';
    }
  }
  if (target.dataset.field === 'benefits.referral' && target.checked) appointment.benefits.nationalLeague = false;
  if (target.dataset.field === 'benefits.nationalLeague' && target.checked) appointment.benefits.referral = false;
  markChanged();
  refreshCompletenessUi();
  if (target.dataset.field === 'summary.basketUrl') refreshBasketLinkAction();
  const billUsageMatch = target.dataset.field.match(/^energy\.(electricity|gas)BillKwh$/);
  if (billUsageMatch) {
    const button = document.querySelector(`[data-choice="energy.${billUsageMatch[1]}UsageSource"][data-value="bill"]`);
    if (button) button.disabled = !(Number(String(target.value).replace(/,/g,'')) > 0);
  }
  if (/^energy\.(region|annualElectricityKwh|annualGasKwh|electricity(Uw|Bill|Estimated)Kwh|gas(Uw|Bill|Estimated)Kwh|dayKwh|nightKwh)$/.test(target.dataset.field)) refreshIndicativePanel();
  updateLiveResults();
});

document.addEventListener('change', event => {
  const path = event.target.dataset.field;
  if (!path) return;
  if (event.target.dataset.roundWhole === 'true' && event.target.value !== '') {
    const rounded = Math.round(Number(String(event.target.value).replace(/,/g,'')) || 0);
    event.target.value = String(rounded);
    setPath(appointment, path, rounded);
    markChanged();
  }
  if (event.target.dataset.formatNumber === 'integer' && event.target.value !== '') {
    const numeric = Math.round(Number(String(event.target.value).replace(/,/g,'')) || 0);
    event.target.value = numeric.toLocaleString('en-GB');
  }
  if (path === 'broadband.packageId' && event.target.value) {
    const selectedPackage = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === event.target.value);
    if (selectedPackage) {
      appointment.broadband.uwMonthly = selectedPackage.monthly;
      markChanged();
      render();
      return;
    }
  }
  if (/^energy\.(region|electricity(Uw|Bill|Estimated)Kwh|gas(Uw|Bill|Estimated)Kwh|dayKwh|nightKwh|currentDayRate|currentNightRate|currentStandingCharge)$/.test(path)) {
    markChanged();
    render();
    return;
  }
  if (['energy.billUsageAvailable','energy.peakOffPeak','energy.adjustmentEnabled','broadband.freeMonthsOffer','broadband.homePhoneEnabled','cashback.enabled','adjustments.recurringEnabled','adjustments.oneOffEnabled','person.homeStatus','benefits.referral','benefits.nationalLeague'].includes(path) || /\.exitFeesApply$/.test(path)) render();
});

document.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id === 'personForm') return createPerson(new FormData(event.target).get('name'));
  if (event.target.id === 'cloudForm') {
    const data = Object.fromEntries(new FormData(event.target));
    setCloudAuth(data);
    toast('Cloud credentials saved for this session. Syncing…');
    try { await syncAll(); people = await customerStore.list(); setSaveState('Saved · Cloud synced','good'); }
    catch { setSaveState('Saved locally · Cloud unavailable', 'bad'); toast('Cloud is unavailable. Local work remains safe.'); }
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
  if (target.hasAttribute('data-edit-essentials')) {
    essentialsExpanded = true;
    render();
    requestAnimationFrame(() => document.querySelector('.essentials-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return;
  }
  if (target.dataset.serviceSetup) {
    const name = target.dataset.serviceSetup;
    const wasActive = Boolean(appointment.services[name]);
    if (!wasActive) {
      appointment.services[name] = true;
      if (name === 'boilerCover' && appointment.person.homeStatus !== 'homeowner') appointment.services.boilerCover = false;
    }
    serviceSetupOpen = serviceSetupOpen === name && wasActive ? '' : name;
    if (!wasActive) markChanged();
    render();
    return;
  }
  if (target.dataset.serviceRemove) {
    const name = target.dataset.serviceRemove;
    appointment.services[name] = false;
    if (serviceSetupOpen === name) serviceSetupOpen = '';
    if (name === 'energy') energyTariffOpen = false;
    markChanged(); render(); return;
  }
  if (target.dataset.quickEnergyFuel) {
    appointment.energy.fuel = target.dataset.quickEnergyFuel;
    serviceSetupOpen = '';
    markChanged(); render(); return;
  }
  if (target.dataset.quickBroadbandFamily) {
    appointment.broadband.connectionFamily = target.dataset.quickBroadbandFamily;
    const chosen = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === appointment.broadband.packageId);
    const chosenFamily = chosen && (/^fibre/.test(chosen.id) ? 'full' : 'part');
    if (chosenFamily && chosenFamily !== appointment.broadband.connectionFamily) {
      appointment.broadband.packageId = '';
      appointment.broadband.uwMonthly = 0;
    }
    serviceSetupOpen = '';
    markChanged(); render(); return;
  }
  if (target.dataset.quickPackage) {
    const chosen = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === target.dataset.quickPackage);
    if (!chosen) return;
    appointment.broadband.packageId = chosen.id;
    appointment.broadband.connectionFamily = /^fibre/.test(chosen.id) ? 'full' : 'part';
    appointment.broadband.uwMonthly = chosen.monthly;
    serviceSetupOpen = '';
    markChanged(); render(); return;
  }
  if (target.dataset.energyUsageSource) {
    const source = target.dataset.energyUsageSource;
    const fuels = appointment.energy.fuel === 'electricity'
      ? ['electricity']
      : appointment.energy.fuel === 'gas'
        ? ['gas']
        : ['electricity','gas'];
    if (source === 'bill' && !energyUsageReady('bill')) {
      toast('Add the current provider usage first.');
      return;
    }
    fuels.forEach(fuel => { appointment.energy[`${fuel}UsageSource`] = source; });
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-open-split-estimator')) {
    splitEstimatorOpen = true;
    render();
    return;
  }
  if (target.hasAttribute('data-close-split-estimator')) {
    splitEstimatorOpen = false;
    render();
    return;
  }
  if (target.dataset.currentVat) {
    appointment.energy.currentRatesIncludeVat = target.dataset.currentVat === 'inc';
    markChanged(); render(); return;
  }
  if (target.dataset.estimateBand) {
    const energy = appointment.energy;
    const hasExisting = [energy.electricityUwKwh, energy.gasUwKwh, energy.electricityBillKwh, energy.gasBillKwh].some(value => Number(value || 0) > 0);
    if (hasExisting && !window.confirm('This will replace the usage already entered in the Current and UW columns. Use the selected estimate instead?')) return;
    const electricity = Number(target.dataset.electricity || 0);
    const gas = Number(target.dataset.gas || 0);
    if (energy.fuel !== 'gas') {
      energy.electricityUwKwh = 0; energy.electricityBillKwh = 0;
      energy.electricityEstimatedKwh = electricity; energy.electricityUsageSource = 'estimated';
    }
    if (energy.fuel !== 'electricity') {
      energy.gasUwKwh = 0; energy.gasBillKwh = 0;
      energy.gasEstimatedKwh = gas; energy.gasUsageSource = 'estimated';
    }
    appointment.completion.entered = appointment.completion.entered.filter(path => !/^energy\.(electricity|gas)(Uw|Bill)Kwh$/.test(path));
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-toggle-energy-tariff')) {
    energyTariffOpen = true;
    render();
    return;
  }
  if (target.hasAttribute('data-close-energy-tariff')) {
    energyTariffOpen = false;
    render();
    return;
  }
  if (target.dataset.tariffFamily) {
    appointment.energy.selectedTariffFamily = target.dataset.tariffFamily;
    syncSelectedTariffTiers(target.dataset.tariffFamily);
    markChanged(); render(); return;
  }
  if (target.dataset.broadbandFamily) {
    appointment.broadband.connectionFamily = target.dataset.broadbandFamily;
    const selectedPackage = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === appointment.broadband.packageId);
    const selectedFamily = selectedPackage && (/^fibre/.test(selectedPackage.id) ? 'full' : 'part');
    if (selectedFamily && selectedFamily !== appointment.broadband.connectionFamily) {
      appointment.broadband.packageId = '';
      appointment.broadband.uwMonthly = 0;
    }
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-toggle-sim-names')) {
    appointment.mobile.showNames = !appointment.mobile.showNames;
    markChanged(); render(); return;
  }
  if (target.dataset.service) {
    const name = target.dataset.service;
    appointment.services[name] = !appointment.services[name];
    if (name === 'boilerCover' && appointment.person.homeStatus !== 'homeowner') appointment.services.boilerCover = false;
    markChanged(); render(); return;
  }
  if (target.dataset.choice) {
    setPath(appointment, target.dataset.choice, target.dataset.value);
    if (target.dataset.choice === 'broadband.homePhoneBundle') {
      appointment.broadband.homePhoneMonthly = target.dataset.value === 'peakSaver' ? 13 : target.dataset.value === 'offPeakSaver' ? 6.5 : 0;
    }
    if (target.dataset.choice === 'person.homeStatus') {
      if (target.dataset.value === 'tenant') {
        appointment.services.boilerCover = false;
        if (serviceSetupOpen === 'boilerCover') serviceSetupOpen = '';
      }
    }
    if (target.dataset.choice === 'energy.electricityProfile') {
      appointment.energy.peakOffPeak = true;
      appointment.energy.selectedTariffFamily = target.dataset.value === 'ev'
        ? 'evVariable'
        : appointment.energy.selectedTariffFamily === 'fixed' || appointment.energy.selectedTariffFamily === 'fixedE7'
          ? 'fixedE7'
          : 'economy7Variable';
    }
    markChanged(); render(); return;
  }
  if (target.dataset.simCount) {
    const count = Number(target.dataset.simCount);
    appointment.mobile.simCount = count;
    appointment.mobile.sims = Array.from({ length: count }, (_, index) => ({ ...(appointment.mobile.sims[index] || createSim(index)), include: true }));
    if (serviceSetupOpen === 'mobile') serviceSetupOpen = '';
    markChanged(); render(); return;
  }
  if (target.dataset.simPlan) {
    const index = Number(target.dataset.simPlan);
    appointment.mobile.sims[index].planId = target.dataset.value;
    appointment.mobile.sims[index].uwMonthly = mobilePlanPrice(target.dataset.value);
    markComparisonFieldEntered(appointment, `mobile.sims.${index}.uwMonthly`);
    markChanged(); render(); return;
  }
  if (target.dataset.package) {
    const selectedPackage = UW_RULES_2026_10_01.broadband.packages.find(item => item.id === target.dataset.package);
    if (!selectedPackage) return;
    appointment.broadband.packageId = selectedPackage.id;
    appointment.broadband.connectionFamily = /^fibre/.test(selectedPackage.id) ? 'full' : 'part';
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
    splitEstimatorOpen = false;
    markChanged(); render(); return;
  }
  if (target.hasAttribute('data-save')) return persistActive(false);
  if (target.hasAttribute('data-use-indicative')) return applyIndicativeTariffs();
  if (target.hasAttribute('data-save-snapshot')) return saveSummarySnapshot('summary_saved');
  if (target.hasAttribute('data-meal-preview')) {
    if (sharedSummaryData) { sharedMealDealActive = true; renderCustomerView(sharedSummaryData); }
    else { mealDealPreviewActive = true; renderSummary(); }
    return;
  }
  if (target.hasAttribute('data-meal-back')) {
    if (sharedSummaryData) { sharedMealDealActive = false; renderCustomerView(sharedSummaryData); }
    else { mealDealPreviewActive = false; renderSummary(); }
    return;
  }
  if (target.hasAttribute('data-meal-add')) {
    const preview = buildMealDealPreview(appointment);
    if (!preview) return;
    appointment = normaliseAppointment(clone(preview.appointment));
    mealDealPreviewActive = false;
    markChanged();
    view = 'appointment';
    render();
    document.querySelector('.service-mobile')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`${preview.addedSimCount} £6 Meal Deal SIM${preview.addedSimCount === 1 ? '' : 's'} added. Add the customer's current cost and check exit fees if they apply.`);
    return;
  }
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
    if (!appointmentCompleteness(appointment).complete) return showSummaryBlocked();
    const text = figuresText(visibleFiguresData());
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
    essentialsExpanded = !appointment.person.homeStatus;
    persistedAppointment = clone(appointment);
    view = 'profile';
  } else {
    currentRecord = null;
    appointment = createAppointment();
    essentialsExpanded = true;
    persistedAppointment = clone(appointment);
  }
  guard.initialise(appointment);
  render();
  loadTariffs(TARIFF_FEED_URL, {
    onData: (data, info) => {
      tariffData = data;
      tariffInfo = info;
      if (appointment.services.energy) syncSelectedTariffTiers();
      if (view === 'appointment' && appointment.services.energy) render();
    },
    onError: (_error, info) => { tariffInfo = info; }
  }).catch(() => {});
  if (migration.imported) toast(`${migration.imported} existing ${migration.imported === 1 ? 'profile' : 'profiles'} copied safely into V3.03.`);
  scheduleSync(500);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => setSaveState('Saved locally · PWA update pending'));
  setInterval(() => scheduleSync(0), 45000);
}

boot().catch(error => {
  console.error(error);
  app.innerHTML = `<section class="card"><h1>V3.03 needs attention</h1><p>${escapeHtml(error.message)}</p><p>Your existing donor data has not been changed.</p></section>`;
});
