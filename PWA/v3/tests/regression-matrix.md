# Regression status - 15 September 2026

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
| Exit-fee deduction | Pass | `calculations.test.js` |
| Recurring and one-off adjustments | Pass | `calculations.test.js` |
| Blank basket no Cashback-only headline | Pass | `calculations.test.js` |
| Legacy SIM IDs and Income Protector zero shim | Pass | `contracts.test.js` |
| One-sided merge / true conflict | Pass | `contracts.test.js` |
| Share allowlist excludes private/Cloud data | Pass | `contracts.test.js` |
| E7 split helper | Pass | `contracts.test.js` |
| Shell/service worker donor independence | Pass | `contracts.test.js` |

Total at last run: 32 passing, 0 failing.

## Browser integration

Tested through the local HTTP origin in the Codex in-app browser:

- launchpad rendered
- named profile persisted locally
- profile hub and appointment navigation rendered
- homeowner + Energy + Mobile selections rendered
- two Unlimited SIM rule outputs matched the brief
- summary rendered
- share modal rendered
- a fresh reload of the customer hash link rendered the sanitised customer view
- browser error/warning log was empty

## Pending environment/acceptance tests

The live Cloud endpoint, real legacy device database, installed-PWA lifecycle, offline reopen, physical-phone WhatsApp/clipboard handoff and production service-worker update require the deployment/acceptance environment. They remain explicitly unchecked in `manual-smoke-tests.md`; they are not represented as automated passes.
