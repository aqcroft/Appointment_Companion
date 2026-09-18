import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveUwRules } from '../js/rules/uw-rules-2026-10-01.js';

const sim = planId => ({ include: true, planId });
const basket = ({ energy = true, broadband = false, boilerCover = false, homeStatus = 'homeowner', plans = [] } = {}) => ({
  services: { energy, broadband, mobile: plans.length > 0, boilerCover },
  homeStatus,
  mobile: { simCount: plans.length || 1, sims: plans.map(sim) }
});

const cases = [
  ['Energy + 1 Essentials', basket({ plans: ['essentialMax'] }), 2, 2, 0, 6, 0],
  ['Energy + 2 Essentials', basket({ plans: ['essentialMax','essentialMax'] }), 2, 3, 0, 12, 0],
  ['Energy + 3 Essentials', basket({ plans: ['essentialMax','essentialMax','essentialMax'] }), 2, 3, 0, 18, 0],
  ['Energy + 1 Unlimited', basket({ plans: ['unlimitedMax'] }), 2, 2, 50, 13, 0],
  ['Energy + 1 Unlimited + 1 Essentials', basket({ plans: ['unlimitedMax','essentialMax'] }), 2, 3, 50, 19, 0],
  ['Energy + 2 Unlimited', basket({ plans: ['unlimitedMax','unlimitedMax'] }), 3, 3, 50, 26, 39],
  ['Energy + 3 Unlimited', basket({ plans: ['unlimitedMax','unlimitedMax','unlimitedMax'] }), 3, 3, 50, 39, 78],
  ['Energy + Broadband + 1 Essentials', basket({ broadband: true, plans: ['essentialMax'] }), 3, 3, 50, 6, 0],
  ['Energy + Broadband + 2 Essentials', basket({ broadband: true, plans: ['essentialMax','essentialMax'] }), 3, 3, 50, 12, 0],
  ['Energy + Broadband + 1 Unlimited + 1 Essentials', basket({ broadband: true, plans: ['unlimitedMax','essentialMax'] }), 3, 3, 150, 19, 0],
  ['Energy + Broadband + 2 Unlimited', basket({ broadband: true, plans: ['unlimitedMax','unlimitedMax'] }), 4, 3, 150, 26, 39]
];

for (const [name, facts, count, tariff, bonus, mobile, intro] of cases) {
  test(name, () => {
    const result = deriveUwRules(facts);
    assert.equal(result.serviceCount, count);
    assert.equal(result.energyTariff, tariff);
    assert.equal(result.welcomeBonus, bonus);
    assert.equal(result.ongoingMobileMonthly, mobile);
    assert.equal(result.mobileIntroBenefit, intro);
    assert.ok(result.energyTariff <= 3);
  });
}

test('Boiler Cover contributes but has no retired introductory benefit', () => {
  const result = deriveUwRules(basket({ boilerCover: true }));
  assert.equal(result.serviceCount, 2);
  assert.equal(result.energyTariff, 2);
  assert.equal(result.welcomeBonus, 50);
  assert.equal(result.boilerCoverMonthly, 25);
  assert.equal(result.boilerCoverIntroBenefit, 0);
});

test('Tenant cannot add Boiler Cover', () => {
  const result = deriveUwRules(basket({ boilerCover: true, homeStatus: 'tenant' }));
  assert.equal(result.boilerCover, false);
  assert.equal(result.boilerCoverMonthly, 0);
  assert.equal(result.serviceCount, 1);
});

for (const [name, facts, expectedCount, expectedBonus] of [
  ['Energy + Broadband + Boiler Cover', basket({ broadband: true, boilerCover: true }), 3, 150],
  ['Energy + Mobile + Boiler Cover', basket({ boilerCover: true, plans: ['essentialMax'] }), 3, 50],
  ['Energy + Broadband + Mobile + Boiler Cover', basket({ broadband: true, boilerCover: true, plans: ['essentialMax'] }), 4, 150]
]) {
  test(name, () => {
    const result = deriveUwRules(facts);
    assert.equal(result.serviceCount, expectedCount);
    assert.equal(result.welcomeBonus, expectedBonus);
    assert.equal(result.energyTariff, 3);
    assert.equal(result.boilerCoverIntroBenefit, 0);
  });
}

test('Income Protector is always zero and not a service type', () => {
  const facts = basket();
  facts.services.incomeProtector = true;
  const result = deriveUwRules(facts);
  assert.equal(result.incomeProtectorMonthly, 0);
  assert.equal(result.serviceCount, 1);
  assert.equal(result.serviceTypes, 1);
});

test('Essentials SIMs do not increase Welcome Bonus service types', () => {
  const result = deriveUwRules(basket({ broadband: true, boilerCover: true, plans: ['essentialMax'] }));
  assert.equal(result.serviceTypes, 3);
  assert.equal(result.welcomeBonus, 150);
  assert.equal(result.energyTariff, 3);
});

test('Unlimited Mobile can still contribute a Welcome Bonus service type', () => {
  const result = deriveUwRules(basket({ broadband: true, boilerCover: true, plans: ['unlimitedMax'] }));
  assert.equal(result.serviceTypes, 4);
  assert.equal(result.welcomeBonus, 250);
  assert.equal(result.energyTariff, 3);
});
