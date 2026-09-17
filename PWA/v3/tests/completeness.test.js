import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentCompleteness, markComparisonFieldEntered } from '../js/appointment/completeness.js';
import { createAppointment, createSim } from '../js/state/canonical-state.js';

function enterZero(appointment, path) {
  markComparisonFieldEntered(appointment, path);
}

function completeEnergy(appointment) {
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 80;
  enterZero(appointment, 'energy.electricityExitFee');
  enterZero(appointment, 'energy.gasExitFee');
}

function completeBroadband(appointment) {
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 35;
  appointment.broadband.uwMonthly = 23.95;
  enterZero(appointment, 'broadband.exitFee');
}

function configuredSim(index, current = 10) {
  return { ...createSim(index), planId: 'essentialMax', currentMonthly: current, uwMonthly: 6, exitFee: 0 };
}

function completeMobile(appointment, count) {
  appointment.services.mobile = true;
  appointment.mobile.simCount = count;
  appointment.mobile.sims = Array.from({ length: count }, (_, index) => configuredSim(index));
  appointment.mobile.sims.forEach((_sim, index) => enterZero(appointment, `mobile.sims.${index}.exitFee`));
}

test('Energy-only basket has three requirements and exact missing labels', () => {
  const appointment = createAppointment('Energy');
  appointment.services.energy = true;
  const status = appointmentCompleteness(appointment);
  assert.equal(status.total, 3);
  assert.equal(status.percentage, 0);
  assert.deepEqual(status.missing.map(item => item.label), [
    'Energy - current monthly cost missing',
    'Energy - UW monthly cost missing',
    'Energy - exit fee missing'
  ]);
});

test('entered zero exit fees are complete while untouched zero defaults are missing', () => {
  const appointment = createAppointment('Zeros');
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 30;
  appointment.broadband.uwMonthly = 20;
  assert.equal(appointmentCompleteness(appointment).missing.at(-1).label, 'Broadband - exit fee missing');
  enterZero(appointment, 'broadband.exitFee');
  assert.equal(appointmentCompleteness(appointment).complete, true);
});

test('one and five SIM baskets contribute three requirements per included SIM', () => {
  for (const count of [1, 5]) {
    const appointment = createAppointment(`${count} SIM`);
    completeMobile(appointment, count);
    const status = appointmentCompleteness(appointment);
    assert.equal(status.total, count * 3);
    assert.equal(status.complete, true);
  }
});

test('multiple-service baskets include only selected services', () => {
  const appointment = createAppointment('Mixed');
  completeEnergy(appointment);
  completeBroadband(appointment);
  completeMobile(appointment, 2);
  assert.equal(appointmentCompleteness(appointment).total, 12);
  appointment.services.broadband = false;
  assert.equal(appointmentCompleteness(appointment).total, 9);
});

test('homeowner Boiler Cover contributes three requirements and tenant Boiler contributes none', () => {
  const homeowner = createAppointment('Homeowner');
  homeowner.person.homeStatus = 'homeowner';
  homeowner.services.boilerCover = true;
  homeowner.boilerCover.currentMonthly = 30;
  enterZero(homeowner, 'boilerCover.exitFee');
  assert.equal(appointmentCompleteness(homeowner).total, 3);
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
  appointment.completion.entered = appointment.completion.entered.filter(path => path !== 'energy.gasExitFee');
  const blocked = appointmentCompleteness(appointment);
  assert.ok(blocked.percentage < 100);
  assert.equal(blocked.complete, false);
});
