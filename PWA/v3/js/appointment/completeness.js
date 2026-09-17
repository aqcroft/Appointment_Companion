import { UW_RULES_2026_10_01, deriveUwRules } from '../rules/uw-rules-2026-10-01.js';
import { normaliseAppointment } from '../state/canonical-state.js';

const positive = value => Number(value) > 0;

function entered(appointment, key) {
  return appointment.completion.entered.includes(key);
}

function valueComplete(appointment, key, value) {
  return positive(value) || entered(appointment, key);
}

function energyCurrentComplete(appointment) {
  const energy = appointment.energy;
  if (energy.currentCostMode === 'annual') {
    const keys = [
      ...(energy.fuel !== 'gas' ? ['energy.annualElectricityCost'] : []),
      ...(energy.fuel !== 'electricity' ? ['energy.annualGasCost'] : [])
    ];
    return keys.every(key => valueComplete(appointment, key, energy[key.split('.').at(-1)]));
  }
  if (energy.currentCostMode === 'split') {
    const keys = [
      ...(energy.fuel !== 'gas' ? ['energy.currentElectricityMonthly'] : []),
      ...(energy.fuel !== 'electricity' ? ['energy.currentGasMonthly'] : [])
    ];
    return keys.every(key => valueComplete(appointment, key, energy[key.split('.').at(-1)]));
  }
  if (energy.peakOffPeak && energy.electricityProfile !== 'standard') {
    const profileComplete = positive(energy.dayKwh) || positive(energy.nightKwh);
    const ratesComplete = positive(energy.currentDayRate) && positive(energy.currentNightRate);
    if (profileComplete && ratesComplete) return true;
  }
  return valueComplete(appointment, 'energy.currentMonthly', energy.currentMonthly);
}

function energyUwComplete(appointment) {
  const energy = appointment.energy;
  if (energy.uwQuoteMode !== 'tiers') return valueComplete(appointment, 'energy.uwMonthly', energy.uwMonthly);
  const tariff = deriveUwRules({
    services: appointment.services,
    homeStatus: appointment.person.homeStatus,
    mobile: appointment.mobile
  }).energyTariff || 1;
  const key = `energy.uwTier${Math.max(1, Math.min(3, tariff))}`;
  return valueComplete(appointment, key, energy[key.split('.').at(-1)]);
}

function energyExitComplete(appointment) {
  const energy = appointment.energy;
  const relevant = [
    ...(energy.fuel !== 'gas' ? ['energy.electricityExitFee'] : []),
    ...(energy.fuel !== 'electricity' ? ['energy.gasExitFee'] : [])
  ];
  return relevant.some(key => positive(energy[key.split('.').at(-1)])) || relevant.every(key => entered(appointment, key));
}

function requirement(id, service, label, complete) {
  return { id, service, label, complete: Boolean(complete) };
}

export function comparisonRequirements(input) {
  const appointment = normaliseAppointment(input);
  const requirements = [];

  if (appointment.services.energy) {
    requirements.push(
      requirement('energy.current', 'energy', 'Energy - current monthly cost missing', energyCurrentComplete(appointment)),
      requirement('energy.uw', 'energy', 'Energy - UW monthly cost missing', energyUwComplete(appointment)),
      requirement('energy.exit', 'energy', 'Energy - exit fee missing', energyExitComplete(appointment))
    );
  }

  if (appointment.services.broadband) {
    requirements.push(
      requirement('broadband.current', 'broadband', 'Broadband - current monthly cost missing', valueComplete(appointment, 'broadband.currentMonthly', appointment.broadband.currentMonthly)),
      requirement('broadband.uw', 'broadband', 'Broadband - UW monthly cost missing', valueComplete(appointment, 'broadband.uwMonthly', appointment.broadband.uwMonthly)),
      requirement('broadband.exit', 'broadband', 'Broadband - exit fee missing', valueComplete(appointment, 'broadband.exitFee', appointment.broadband.exitFee))
    );
  }

  if (appointment.services.mobile) {
    appointment.mobile.sims.filter(sim => sim.include !== false).forEach((sim, index) => {
      const prefix = `mobile.sims.${index}`;
      const name = `Mobile SIM ${index + 1}`;
      requirements.push(
        requirement(`${prefix}.current`, 'mobile', `${name} - current monthly cost missing`, valueComplete(appointment, `${prefix}.currentMonthly`, sim.currentMonthly)),
        requirement(`${prefix}.uw`, 'mobile', `${name} - UW monthly cost missing`, sim.uwMonthly !== null && sim.uwMonthly !== ''),
        requirement(`${prefix}.exit`, 'mobile', `${name} - exit fee missing`, valueComplete(appointment, `${prefix}.exitFee`, sim.exitFee))
      );
    });
  }

  if (appointment.services.boilerCover && appointment.person.homeStatus === 'homeowner') {
    requirements.push(
      requirement('boiler.current', 'boilerCover', 'Boiler Cover - current monthly cost missing', valueComplete(appointment, 'boilerCover.currentMonthly', appointment.boilerCover.currentMonthly)),
      requirement('boiler.uw', 'boilerCover', 'Boiler Cover - UW monthly cost missing', positive(appointment.boilerCover.monthly)),
      requirement('boiler.exit', 'boilerCover', 'Boiler Cover - exit fee missing', valueComplete(appointment, 'boilerCover.exitFee', appointment.boilerCover.exitFee))
    );
  }

  return requirements;
}

export function appointmentCompleteness(input) {
  const requirements = comparisonRequirements(input);
  const completed = requirements.filter(item => item.complete).length;
  const total = requirements.length;
  return {
    requirements,
    missing: requirements.filter(item => !item.complete),
    completed,
    total,
    percentage: total ? Math.round(completed / total * 100) : 0,
    complete: total > 0 && completed === total
  };
}

export function markComparisonFieldEntered(input, path) {
  const appointment = input;
  appointment.completion ||= { entered: [] };
  appointment.completion.entered ||= [];
  if (!appointment.completion.entered.includes(path)) appointment.completion.entered.push(path);
  return appointment;
}

export function mobilePlanPrice(planId, rules = UW_RULES_2026_10_01) {
  return Number(rules.mobile[planId]?.monthly || 0);
}
