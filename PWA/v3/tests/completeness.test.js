import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentCompleteness, markComparisonFieldEntered } from '../js/appointment/completeness.js';
import { createAppointment, createSim, normaliseAppointment } from '../js/state/canonical-state.js';

function completeEnergy(appointment) {
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 80;
}

function completeBroadband(appointment) {
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 35;
  appointment.broadband.uwMonthly = 23.95;
}

function configuredSim(index, current = 10) {
  return { ...createSim(index), planId: 'essentialMax', currentMonthly: current, uwMonthly: 6 };
}

function completeMobile(appointment, count) {
  appointment.services.mobile = true;
  appointment.mobile.simCount = count;
  appointment.mobile.sims = Array.from({ length: count }, (_, index) => configuredSim(index));
}

test('Energy-only basket has two requirements when exit fees do not apply', () => {
  const appointment = createAppointment('Energy');
  appointment.services.energy = true;
  const status = appointmentCompleteness(appointment);
  assert.equal(status.total, 2);
  assert.equal(status.percentage, 0);
  assert.deepEqual(status.missing.map(item => item.label), [
    'Energy - current monthly cost missing',
    'Energy - UW monthly cost missing'
  ]);
});

test('Energy exit-fee requirement appears only when enabled', () => {
  const appointment = createAppointment('Energy exit');
  completeEnergy(appointment);
  assert.equal(appointmentCompleteness(appointment).total, 2);
  assert.equal(appointmentCompleteness(appointment).complete, true);

  appointment.energy.exitFeesApply = true;
  let status = appointmentCompleteness(appointment);
  assert.equal(status.total, 3);
  assert.equal(status.complete, false);
  assert.equal(status.missing.at(-1).label, 'Energy - exit fee missing');

  appointment.energy.electricityExitFee = 75;
  status = appointmentCompleteness(appointment);
  assert.equal(status.complete, true);
});

test('dual-fuel Energy needs only one positive fee when exit fees apply', () => {
  const appointment = createAppointment('Dual exit');
  completeEnergy(appointment);
  appointment.energy.fuel = 'dual';
  appointment.energy.exitFeesApply = true;
  appointment.energy.gasExitFee = 60;
  assert.equal(appointmentCompleteness(appointment).complete, true);
});

test('zero Current or UW remains incomplete even when the field was explicitly touched', () => {
  const appointment = createAppointment('Zeros');
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 0;
  appointment.broadband.uwMonthly = 0;
  markComparisonFieldEntered(appointment, 'broadband.currentMonthly');
  markComparisonFieldEntered(appointment, 'broadband.uwMonthly');
  assert.equal(appointmentCompleteness(appointment).completed, 0);
  assert.equal(appointmentCompleteness(appointment).complete, false);
});

test('Broadband exit-fee requirement is conditional', () => {
  const appointment = createAppointment('Broadband');
  completeBroadband(appointment);
  assert.equal(appointmentCompleteness(appointment).total, 2);
  appointment.broadband.exitFeesApply = true;
  assert.equal(appointmentCompleteness(appointment).total, 3);
  assert.equal(appointmentCompleteness(appointment).complete, false);
  appointment.broadband.exitFee = 45;
  assert.equal(appointmentCompleteness(appointment).complete, true);
});

test('one and five SIM baskets contribute two requirements per included SIM by default', () => {
  for (const count of [1, 5]) {
    const appointment = createAppointment(`${count} SIM`);
    completeMobile(appointment, count);
    const status = appointmentCompleteness(appointment);
    assert.equal(status.total, count * 2);
    assert.equal(status.complete, true);
  }
});

test('Mobile adds an exit requirement only for SIMs where exit fees apply', () => {
  const appointment = createAppointment('Mobile exits');
  completeMobile(appointment, 2);
  appointment.mobile.sims[1].exitFeesApply = true;
  let status = appointmentCompleteness(appointment);
  assert.equal(status.total, 5);
  assert.equal(status.complete, false);
  appointment.mobile.sims[1].exitFee = 30;
  status = appointmentCompleteness(appointment);
  assert.equal(status.complete, true);
});

test('multiple-service baskets include only selected services', () => {
  const appointment = createAppointment('Mixed');
  completeEnergy(appointment);
  completeBroadband(appointment);
  completeMobile(appointment, 2);
  assert.equal(appointmentCompleteness(appointment).total, 8);
  appointment.services.broadband = false;
  assert.equal(appointmentCompleteness(appointment).total, 6);
});

test('homeowner Boiler Cover contributes two requirements by default and tenant Boiler contributes none', () => {
  const homeowner = createAppointment('Homeowner');
  homeowner.person.homeStatus = 'homeowner';
  homeowner.services.boilerCover = true;
  homeowner.boilerCover.currentMonthly = 30;
  assert.equal(appointmentCompleteness(homeowner).total, 2);
  assert.equal(appointmentCompleteness(homeowner).complete, true);

  homeowner.boilerCover.exitFeesApply = true;
  assert.equal(appointmentCompleteness(homeowner).total, 3);
  assert.equal(appointmentCompleteness(homeowner).complete, false);
  homeowner.boilerCover.exitFee = 25;
  assert.equal(appointmentCompleteness(homeowner).complete, true);

  const tenant = createAppointment('Tenant');
  tenant.person.homeStatus = 'tenant';
  tenant.services.boilerCover = true;
  assert.equal(appointmentCompleteness(tenant).total, 0);
});

test('progress denominator changes immediately as services and SIMs are added', () => {
  const appointment = createAppointment('Progress');
  completeEnergy(appointment);
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  appointment.services.broadband = true;
  assert.equal(appointmentCompleteness(appointment).percentage, 50);
  completeBroadband(appointment);
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  completeMobile(appointment, 1);
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  appointment.mobile.simCount = 2;
  appointment.mobile.sims.push(createSim(1));
  assert.equal(appointmentCompleteness(appointment).percentage, 75);
});

test('summary completion reaches 100 percent at the same point it unlocks', () => {
  const appointment = createAppointment('Gate');
  completeEnergy(appointment);
  const complete = appointmentCompleteness(appointment);
  assert.equal(complete.percentage, 100);
  assert.equal(complete.complete, true);

  appointment.energy.exitFeesApply = true;
  const blocked = appointmentCompleteness(appointment);
  assert.equal(blocked.percentage, 67);
  assert.equal(blocked.complete, false);

  appointment.energy.gasExitFee = 50;
  const unlocked = appointmentCompleteness(appointment);
  assert.equal(unlocked.percentage, 100);
  assert.equal(unlocked.complete, true);
});

test('legacy positive exit fees infer the new toggle as on', () => {
  const legacy = createAppointment('Legacy');
  delete legacy.broadband.exitFeesApply;
  legacy.broadband.exitFee = 80;
  const normalised = normaliseAppointment(legacy);
  assert.equal(normalised.broadband.exitFeesApply, true);

  delete legacy.energy.exitFeesApply;
  legacy.energy.electricityExitFee = 100;
  const energyNormalised = normaliseAppointment(legacy);
  assert.equal(energyNormalised.energy.exitFeesApply, true);
});
