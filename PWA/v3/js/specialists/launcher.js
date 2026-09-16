import { TOOLS } from '../config/tools.js';

function encodeContext(appointment) {
  const energy = appointment.energy || {};
  return btoa(unescape(encodeURIComponent(JSON.stringify({
    localId: appointment._localId || '',
    personName: appointment.person?.name || '',
    region: energy.region || '11',
    annualElectricityKwh: Number(energy.annualElectricityKwh || 0),
    annualGasKwh: Number(energy.annualGasKwh || 0),
    fuel: energy.fuel || 'dual',
    electricityProfile: energy.electricityProfile || 'standard',
    dayKwh: Number(energy.dayKwh || 0),
    nightKwh: Number(energy.nightKwh || 0)
  }))));
}

export function toolUrl(toolId, appointment, base = location.href) {
  const tool = TOOLS[toolId];
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);
  const url = new URL(tool.url, base);
  if (tool.context && appointment?.person?.name) {
    if (toolId === 'fix') {
      url.searchParams.set('n', appointment.person.name.slice(0, 80));
      url.searchParams.set('f', appointment.energy.fuel === 'dual' ? 'dual' : appointment.energy.fuel === 'gas' ? 'gas' : 'elec');
      if (appointment.energy.annualElectricityKwh) url.searchParams.set('e', String(Math.round(appointment.energy.annualElectricityKwh)));
      if (appointment.energy.annualGasKwh) url.searchParams.set('g', String(Math.round(appointment.energy.annualGasKwh)));
      url.searchParams.set('r', appointment.energy.region || '11');
    } else {
      url.searchParams.set('ac_context', encodeContext(appointment));
      url.searchParams.set('ac_return', new URL('./', base).href);
    }
  }
  return url.href;
}

export function launchTool(toolId, appointment) {
  location.assign(toolUrl(toolId, appointment));
}
