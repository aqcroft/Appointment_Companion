import { calculateAppointment } from '../appointment/calculations.js';
import { normaliseAppointment } from '../state/canonical-state.js';
import { sanitiseShareData } from './share-policy.js';
import { mealDealSharePreview } from '../appointment/upgrade-preview.js';

const encode = value => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

export const decodeShareData = value => {
  const base64 = String(value || '').replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return sanitiseShareData(JSON.parse(new TextDecoder().decode(bytes)));
};

export function buildShareData(input, branding = {}) {
  const appointment = normaliseAppointment(input);
  const result = calculateAppointment(appointment);
  return sanitiseShareData({
    schemaVersion: 1,
    sharedAt: new Date().toISOString(),
    personName: appointment.person.name,
    services: appointment.services,
    energyInsight: result.e7StandardAnnualSaving ? { standardAnnualSaving: result.e7StandardAnnualSaving } : null,
    current: result.current,
    uw: result.uw,
    monthlyServiceSaving: result.monthlyServiceSaving,
    effectiveUwMonthly: result.effectiveUwMonthly,
    effectiveMonthlySaving: result.effectiveMonthlySaving,
    serviceCount: result.rules.serviceCount,
    energyTariff: result.rules.energyTariff,
    welcomeBonus: result.welcomeBonus,
    mobileIntroBenefit: result.mobileIntroBenefit,
    broadbandIntroBenefit: result.broadbandIntroBenefit,
    referral: result.referral,
    nationalLeague: result.nationalLeague,
    exitFees: result.exitFees,
    exitFeeDeduction: result.exitFeeDeduction,
    cashbackMonthlyNet: result.cashback.active ? result.cashback.monthlyNet : 0,
    cashbackFeeWaiver: result.cashback.active ? result.cashback.feeWaiver : 0,
    oneOff: result.oneOff,
    benefitsTotal: result.benefitsTotal,
    yearOneResult: result.yearOneResult,
    mealDealPreview: mealDealSharePreview(appointment),
    basketUrl: appointment.summary.basketUrl,
    partnerName: branding.name || '',
    partnerRole: branding.role || 'Independent UW Partner',
    partnerStrap: branding.strap || '',
    joinUrl: branding.joinUrl || ''
  });
}

export function buildShareUrl(appointment, branding = {}, base = location.href) {
  const url = new URL(base);
  url.hash = `share=${encode(buildShareData(appointment, branding))}`;
  url.search = '';
  return url.href;
}

export function figuresText(data) {
  const lines = [
    `UW SAVINGS - FIRST 12 MONTHS${data.personName ? ` (${data.personName})` : ''}`,
    `Better off by: £${Math.round(Number(data.yearOneResult) || 0)}`,
    '',
    `Monthly summary: £${Number(data.current?.total || 0).toFixed(2)} → £${Number(data.effectiveUwMonthly ?? data.uw?.total ?? 0).toFixed(2)} effective UW`,
    `Raw UW service cost: £${Number(data.uw?.total || 0).toFixed(2)}`,
    `Effective monthly saving: £${Number(data.effectiveMonthlySaving ?? data.monthlyServiceSaving ?? 0).toFixed(2)}`,
    `Service count: ${data.serviceCount}`,
    `Energy tariff: ${data.energyTariff ? `${data.energyTariff}-service` : 'Not selected'}`,
    `Welcome Bonus: £${Number(data.welcomeBonus || 0).toFixed(0)}`
  ];
  if (data.mobileIntroBenefit) lines.push(`Mobile introductory benefit: £${Number(data.mobileIntroBenefit).toFixed(0)}`);
  if (data.broadbandIntroBenefit) lines.push(`Broadband introductory benefit: £${Number(data.broadbandIntroBenefit).toFixed(0)}`);
  if (data.exitFeeDeduction) lines.push(`Exit-fee deduction: -£${Number(data.exitFeeDeduction).toFixed(0)}`);
  if (data.basketUrl) lines.push('', `Basket: ${data.basketUrl}`);
  if (data.partnerName) lines.push('', `${data.partnerName} - ${data.partnerRole || 'Independent UW Partner'}`);
  return lines.join('\n');
}
