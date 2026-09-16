import { buildShareData } from './share-data.js';

const toolLabels = Object.freeze({ ev: 'EV Companion', fix: 'Should I Fix?', pet: 'PET' });

export function toolsUsed(activity = []) {
  return [...new Set(activity.map(item => item?.tool).filter(tool => toolLabels[tool]))].map(tool => ({ id: tool, label: toolLabels[tool] }));
}

export function createSummaryActivity(appointment, type = 'summary_saved') {
  const snapshot = buildShareData(appointment);
  return {
    id: globalThis.crypto?.randomUUID?.() || `summary_${Date.now().toString(36)}`,
    type,
    at: new Date().toISOString(),
    headlineResult: snapshot.yearOneResult,
    services: Object.entries(snapshot.services || {}).filter(([, enabled]) => enabled).map(([service]) => service),
    toolsUsed: toolsUsed(appointment.activity),
    snapshot
  };
}

export function summaryHistory(activity = []) {
  return activity.filter(item => item?.snapshot && ['summary_saved', 'summary_shared'].includes(item.type)).slice(-6).reverse();
}
