# Regression status - 16 September 2026

Automated command: `cd PWA/v3 && npm test`

## Automated

| Area | Status | Evidence |
|---|---|---|
| Energy + 1/2/3 Essentials | Pass | `rules.test.js` |
| Energy + 1 Unlimited, mixed, 2/3 Unlimited | Pass | `rules.test.js` |
| Energy + Broadband + requested Mobile combinations | Pass | `rules.test.js` |
| Four Boiler Cover combinations | Pass | `rules.test.js` |
| Tenant Boiler Cover rejection | Pass | `rules.test.js` |
| No Boiler introductory benefit / £75 | Pass | rules + calculations tests |
| £6/£13 Mobile and 3-month additional Unlimited | Pass | rule cases |
| Separate Service count / Energy tariff / Welcome Bonus | Pass | rule cases |
| Energy tariff cap 3 | Pass | every rule case assertion |
| Annual and split Energy current cost | Pass | `calculations.test.js` |
| Separate UW/database and customer-bill Energy usage | Pass | `calculations.test.js` + `contracts.test.js` |
| Selected usage source drives calculations without overwriting either source | Pass | `calculations.test.js` |
| Central tariff rows produce indicative tiers | Pass | `calculations.test.js` |
| Exit-fee deduction | Pass | `calculations.test.js` |
| Recurring and one-off adjustments | Pass | `calculations.test.js` |
| Blank basket no Cashback-only headline | Pass | `calculations.test.js` |
| Legacy SIM IDs and Income Protector zero shim | Pass | `contracts.test.js` |
| One-sided merge / true conflict | Pass | `contracts.test.js` |
| Share allowlist excludes private/Cloud data | Pass | `contracts.test.js` |
| Cashback contribution folded into effective monthly basket | Pass | `calculations.test.js` |
| Upgrade preview is non-mutating | Pass | `calculations.test.js` |
| Reopenable compact summary history contract | Pass | `contracts.test.js` |
| E7 split helper | Pass | `contracts.test.js` |
| Shell/service worker donor independence | Pass | `contracts.test.js` |

Total at last run: 39 passing, 0 failing.

## Browser integration

Tested through the local HTTP origin in the Codex in-app browser:

- launchpad rendered
- named profile persisted locally
- profile hub and appointment navigation rendered
- tenant + Energy + Mobile selection rendered, with Boiler Cover absent and the denominator reduced to three
- legacy empty Energy usage correctly fell back to UW/database rather than displaying an empty bill source
- central tariff data loaded and exposed indicative 1/2/3-service costs
- two Unlimited SIM rule outputs matched the brief
- whole-basket Partner summary rendered with first-year hero, basket strip, effective Current/UW/Saving total and expandable detail
- Upgrade preview rendered without changing the appointment
- summary snapshot saved, appeared in profile history, and reopened as a read-only figure snapshot
- share modal rendered
- a fresh reload of the customer hash link rendered the visually distinct sanitised customer view at a 390px viewport, including Upgrade preview
- browser error/warning log was empty

## Pending environment/acceptance tests

The live Cloud endpoint, real legacy device database, installed-PWA lifecycle, offline reopen, physical-phone WhatsApp/clipboard handoff and production service-worker update require the deployment/acceptance environment. They remain explicitly unchecked in `manual-smoke-tests.md`; they are not represented as automated passes.
