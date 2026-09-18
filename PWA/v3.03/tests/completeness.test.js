import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentCompleteness, markComparisonFieldEntered } from '../js/appointment/completeness.js';
import { createAppointment, createSim, normaliseAppointment } from '../js/state/canonical-state.js';

function homeowner(name = 'Test') {
  const appointment = createAppointment(name);
  appointment.person.homeStatus = 'homeowner';
  return appointment;
}

function completeEnergy(appointment) {
  appointment.services.energy = true;
  appointment.energy.fuel = 'dual';
  appointment.energy.electricityUwKwh = 2500;
  appointment.energy.gasUwKwh = 11500;
  appointment.energy.annualElectricityKwh = 2500;
  appointment.energy.annualGasKwh = 11500;
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

test('home status is a required one-time customer fact', () => {
  const appointment = createAppointment('Customer');
  appointment.services.broadband = true;
  appointment.broadband.currentMonthly = 30;
  appointment.broadband.uwMonthly = 24;
  let status = appointmentCompleteness(appointment);
  assert.equal(status.complete, false);
  assert.equal(status.missing[0].label, 'Customer - homeowner or tenant missing');
  appointment.person.homeStatus = 'tenant';
  status = appointmentCompleteness(appointment);
  assert.equal(status.complete, true);
});

test('Energy UW progress requires quote usage as well as a positive UW price', () => {
  const appointment = homeowner('Energy');
  appointment.services.energy = true;
  appointment.energy.currentMonthly = 100;
  appointment.energy.uwMonthly = 80;
  let status = appointmentCompleteness(appointment);
  assert.equal(status.total, 3);
  assert.equal(status.complete, false);
  assert.equal(status.missing.at(-1).label, 'Energy - UW quote usage / price missing');

  appointment.energy.annualElectricityKwh = 2500;
  appointment.energy.annualGasKwh = 11500;
  status = appointmentCompleteness(appointment);
  assert.equal(status.complete, true);
});

test('Energy exit-fee requirement appears only when enabled', () => {
  const appointment = homeowner('Energy exit');
  completeEnergy(appointment);
  assert.equal(appointmentCompleteness(appointment).total, 3);
  assert.equal(appointmentCompleteness(appointment).complete, true);

  appointment.energy.exitFeesApply = true;
  let status = appointmentCompleteness(appointment);
  assert.equal(status.total, 4);
  assert.equal(status.percentage, 75);
  assert.equal(status.complete, false);
  assert.equal(status.missing.at(-1).label, 'Energy - exit fee missing');

  appointment.energy.electricityExitFee = 75;
  status = appointmentCompleteness(appointment);
  assert.equal(status.complete, true);
});

test('dual-fuel Energy needs only one positive fee when exit fees apply', () => {
  const appointment = homeowner('Dual exit');
  completeEnergy(appointment);
  appointment.energy.exitFeesApply = true;
  appointment.energy.gasExitFee = 60;
  assert.equal(appointmentCompleteness(appointment).complete, true);
});

test('zero Current or UW remains incomplete even when explicitly touched', () => {
  const appointment = homeowner('Zeros');
  appointment.services.broadband = true;
  markComparisonFieldEntered(appointment, 'broadband.currentMonthly');
  markComparisonFieldEntered(appointment, 'broadband.uwMonthly');
  const status = appointmentCompleteness(appointment);
  assert.equal(status.completed, 1);
  assert.equal(status.complete, false);
});

test('Broadband exit-fee requirement is conditional', () => {
  const appointment = homeowner('Broadband');
  completeBroadband(appointment);
  assert.equal(appointmentCompleteness(appointment).total, 3);
  appointment.broadband.exitFeesApply = true;
  assert.equal(appointmentCompleteness(appointment).total, 4);
  assert.equal(appointmentCompleteness(appointment).complete, false);
  appointment.broadband.exitFee = 45;
  assert.equal(appointmentCompleteness(appointment).complete, true);
});

test('one and five SIM baskets contribute two requirements per SIM plus customer status', () => {
  for (const count of [1, 5]) {
    const appointment = homeowner(`${count} SIM`);
    completeMobile(appointment, count);
    const status = appointmentCompleteness(appointment);
    assert.equal(status.total, 1 + count * 2);
    assert.equal(status.complete, true);
  }
});

test('Mobile adds an exit requirement only for SIMs where exit fees apply', () => {
  const appointment = homeowner('Mobile exits');
  completeMobile(appointment, 2);
  appointment.mobile.sims[1].exitFeesApply = true;
  let status = appointmentCompleteness(appointment);
  assert.equal(status.total, 6);
  assert.equal(status.complete, false);
  appointment.mobile.sims[1].exitFee = 30;
  status = appointmentCompleteness(appointment);
  assert.equal(status.complete, true);
});

test('multiple-service baskets include only selected services', () => {
  const appointment = homeowner('Mixed');
  completeEnergy(appointment);
  completeBroadband(appointment);
  completeMobile(appointment, 2);
  assert.equal(appointmentCompleteness(appointment).total, 9);
  appointment.services.broadband = false;
  assert.equal(appointmentCompleteness(appointment).total, 7);
});

test('homeowner Boiler Cover contributes two service requirements and tenant cannot keep it selected', () => {
  const home = homeowner('Homeowner');
  home.services.boilerCover = true;
  home.boilerCover.currentMonthly = 30;
  assert.equal(appointmentCompleteness(home).total, 3);
  assert.equal(appointmentCompleteness(home).complete, true);

  home.boilerCover.exitFeesApply = true;
  assert.equal(appointmentCompleteness(home).total, 4);
  assert.equal(appointmentCompleteness(home).complete, false);
  home.boilerCover.exitFee = 25;
  assert.equal(appointmentCompleteness(home).complete, true);

  const tenant = createAppointment('Tenant');
  tenant.person.homeStatus = 'tenant';
  tenant.services.boilerCover = true;
  const status = appointmentCompleteness(tenant);
  assert.equal(status.total, 1);
  assert.equal(status.complete, false);
});

test('progress denominator changes immediately as services and SIMs are added', () => {
  const appointment = homeowner('Progress');
  completeEnergy(appointment);
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  appointment.services.broadband = true;
  assert.equal(appointmentCompleteness(appointment).percentage, 60);
  completeBroadband(appointment);
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  completeMobile(appointment, 1);
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  appointment.mobile.simCount = 2;
  appointment.mobile.sims.push(createSim(1));
  assert.equal(appointmentCompleteness(appointment).percentage, 78);
});

test('summary unlock follows the conditional Energy exit-fee dot', () => {
  const appointment = homeowner('Gate');
  completeEnergy(appointment);
  assert.equal(appointmentCompleteness(appointment).complete, true);
  appointment.energy.exitFeesApply = true;
  assert.equal(appointmentCompleteness(appointment).percentage, 75);
  assert.equal(appointmentCompleteness(appointment).complete, false);
  appointment.energy.gasExitFee = 50;
  assert.equal(appointmentCompleteness(appointment).percentage, 100);
  assert.equal(appointmentCompleteness(appointment).complete, true);
});

test('legacy positive exit fees infer the new toggle as on', () => {
  const legacy = createAppointment('Legacy');
  delete legacy.broadband.exitFeesApply;
  legacy.broadband.exitFee = 80;
  assert.equal(normaliseAppointment(legacy).broadband.exitFeesApply, true);

  delete legacy.energy.exitFeesApply;
  legacy.energy.electricityExitFee = 100;
  assert.equal(normaliseAppointment(legacy).energy.exitFeesApply, true);
});
