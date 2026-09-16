# Appointment Companion V3 build report

**Build location:** `PWA/v3/`  
**Development branch:** `appointment-companion-v3`  
**Runtime model:** self-contained static ES-module PWA; no build step and no runtime dependency on an older Appointment Companion version.

## Final folder structure

```text
PWA/v3/
├── index.html                         # Main HTML entry point
├── manifest.webmanifest               # Install metadata
├── sw.js                              # V3-only service worker/cache
├── package.json                       # Test command
├── assets/
│   ├── app.css
│   └── icons/
│       ├── app-icon.svg
│       ├── app-icon-192.png
│       └── app-icon-512.png
├── docs/
│   ├── appointment_companion_v3_build_report.md
│   ├── architecture.md
│   ├── feature-matrix.md
│   ├── migration-notes.md
│   └── retirement-readiness.md
├── js/
│   ├── app.js
│   ├── appointment/
│   │   ├── calculations.js
│   │   └── upgrade-preview.js
│   ├── config/
│   │   ├── tools.js
│   │   └── version.js
│   ├── data/
│   │   └── tariff-client.js
│   ├── energy/
│   │   ├── indicative-cost.js
│   │   └── split-helper.js
│   ├── rules/
│   │   └── uw-rules-2026-10-01.js
│   ├── shell/
│   │   └── unsaved-work-guard.js
│   ├── specialists/
│   │   └── launcher.js
│   ├── state/
│   │   ├── canonical-state.js
│   │   ├── cloud-client.js
│   │   ├── cloud-sync.js
│   │   ├── customer-store.js
│   │   ├── migrations.js
│   │   └── reconciliation.js
│   └── summary/
│       ├── history.js
│       ├── share-data.js
│       └── share-policy.js
├── tests/
│   ├── calculations.test.js
│   ├── contracts.test.js
│   ├── manual-smoke-tests.md
│   ├── regression-matrix.md
│   ├── rules.test.js
│   └── serve.cjs
└── tools/
    └── ev/
        ├── index.html
        ├── tariff-cache-v1.js
        ├── v13-ev.js
        ├── v14-ev.css
        ├── v15-ev.css
        ├── v15-freshness.js
        ├── v16b-hero.js
        ├── v16c-ev.css
        ├── v16c-sharing.js
        ├── v16c-table.js
        └── v3-context.js
```

## Entry point and ownership

The main entry point is `PWA/v3/index.html`. It loads `js/app.js`, which boots storage/migration, restores the active person, selects the normal or customer-shared view, renders the UI, and registers `sw.js`.

| Responsibility | Owning file/module |
|---|---|
| App shell and navigation | `index.html`, `assets/app.css`, and the launchpad/profile/Save Money/Make Money/Tools/More render and navigation functions in `js/app.js`; dirty-navigation behaviour is isolated in `js/shell/unsaved-work-guard.js` |
| Person/customer profiles | Profile creation, search, duplicate warning, recent people, active-person context and management UI in `js/app.js`; durable records in `js/state/customer-store.js` |
| Canonical state | `js/state/canonical-state.js`; legacy/state-version conversion in `js/state/migrations.js` |
| Local storage / IndexedDB | `js/state/customer-store.js` owns IndexedDB `apptCompanionV3`; `js/app.js` uses session/local storage only for current-person selection and Partner branding; `js/data/tariff-client.js` owns its last-good tariff cache |
| Cloud sync | API transport in `js/state/cloud-client.js`; orchestration, tombstones and conflict resolution in `js/state/cloud-sync.js`; field-wise three-way merge in `js/state/reconciliation.js`; coexistence envelope in `js/state/migrations.js` |
| Service selection | 2x2 service cards and compact fuel/SIM choices in `js/app.js`; valid persisted service flags in `js/state/canonical-state.js` |
| Energy logic | Progressive input workspace and source selection in `js/app.js`; separate UW/database and bill facts in canonical state; derived costs in `js/appointment/calculations.js`; central-feed indicative costs in `js/energy/indicative-cost.js`; E7 arithmetic in `js/energy/split-helper.js`; tariff/service rules in `js/rules/uw-rules-2026-10-01.js` |
| Broadband logic | Inputs/package selection in `js/app.js`; package prices and offer constants in the rule module; monthly and introductory-benefit calculations in `js/appointment/calculations.js` |
| Mobile logic | SIM UI in `js/app.js`; SIM normalisation in canonical state; plans, prices, service contribution and additional-Unlimited benefit in the rule module; totals in calculations |
| Insurance/service-count logic | Homeowner-only Boiler Cover and all Service count/Energy tariff/Welcome Bonus derivation in `js/rules/uw-rules-2026-10-01.js`; tenant enforcement in canonical state and UI |
| Summary/share view | Partner summary rendering in `js/app.js`; calculated payload/text/link generation in `js/summary/share-data.js`; explicit field and HTTPS allowlist in `js/summary/share-policy.js`; lightweight reopenable snapshots in `js/summary/history.js`; non-mutating Upgrade suggestions in `js/appointment/upgrade-preview.js` |
| Customer-shared view | `#share=...` boot path and `renderCustomerView()` in `js/app.js`, using sanitised data decoded by `js/summary/share-data.js` |
| Basket link handling | `appointment.summary.basketUrl` in canonical state; editing in `js/app.js`; Cloud projection in `js/state/cloud-sync.js`; HTTPS-only customer exposure in the share policy |
| Tariff data integration | Central feed endpoint plus stale-while-revalidate/last-good cache in `js/data/tariff-client.js`; tariff-to-usage conversion in `js/energy/indicative-cost.js`; the owned EV runtime also contains `tools/ev/tariff-cache-v1.js` |
| EV integration | URL/context contract in `js/specialists/launcher.js`; V3-owned EV runtime in `tools/ev/`; prefill/return adapter in `tools/ev/v3-context.js` |
| Should I Fix integration | Stable external URL in `js/config/tools.js`; person, region, fuel and usage query mapping in `js/specialists/launcher.js` |
| Admin/settings | More screen in `js/app.js`: people/deletion, optional Cloud credentials, conflicts and Partner branding; Cloud credentials are session-only through `js/state/cloud-sync.js` |

## Donor provenance

### Carried forward from v5

V5 was used as the functional regression baseline. V3 retains the useful appointment behaviours: flexible monthly/split/annual Energy capture, electricity-before-gas ordering, exit fees, UW single/tier quote capture, manual Energy adjustment, E7 support, Broadband package/add-on/free-month handling, per-SIM Mobile costs and exit fees, Cashback Card calculations, referral and National League benefits, recurring/one-off adjustments, Boiler Cover presence, summary figures and share/copy behaviour. These behaviours were placed behind V3-owned state, rule and calculation modules rather than linking to `v5-companion.html`.

### Carried forward or overridden from v6

The repository contains no `v6.html`, so no v6 application code was copied. The authoritative brief supplied its agreed October 2026 rules: Go Essentials £6/month, Go Unlimited £13/month, three free months for each additional Unlimited SIM, separate Service count/Energy tariff/Welcome Bonus results, and a maximum 3-service Energy tariff. The brief explicitly overrides earlier v6 behaviour by removing the £75/three-month Boiler Cover introductory benefit and keeping Income Protector retired and zero-valued. V6 was not used as an architecture donor.

### Taken from `PWA/consolidated-v1`

The consolidated PWA supplied the architectural contracts: local-first customer records, IndexedDB persistence, optional Apps Script Cloud API/session convention, local/Cloud revision and reconciliation concepts, canonical migration compatibility, specialist state, customer-safe sharing, shared-customer view, service-worker behaviour, individual deletion tombstones, multi-select deletion, inline Energy/Mobile selection, PET destination, specialist launch patterns, and tariff cache behaviour. V3 implements and owns these contracts in its own files and database; it does not load consolidated-v1 at runtime.

## Intentional removals and changes

- Income Protector is absent from the visible journey, stripped during normalisation/migration, and always contributes £0.
- Boiler Cover remains homeowner-only at £25/month but has no free-month wording or £75 introductory benefit.
- PET replaces the obsolete Cashback Challenge navigation shortcut; customer Cashback Card calculations remain.
- Broad insurance comparison/advice was not recreated; only the valid Boiler/service-presence state is collected.
- Runtime composition of v5, v6, consolidated-v1, cloud-pilot and release patch files was removed.
- Blank unnamed visits do not create customer records. The person's name is the persistence gate.
- Service count, Energy tariff and Welcome Bonus are separate derived outputs rather than one overloaded count.
- Customer shares are explicit allowlisted snapshots and exclude notes, credentials, sync metadata and admin controls.
- The Services overview no longer exposes per-service financial comparisons before the whole-basket reveal.
- Mobile and Broadband lead with package selection and centrally owned rule prices; confirmed manual prices remain available only where the existing engine supports them.
- Energy retains both UW/database and optional bill annual usage, with an explicit active source for each fuel; entering a bill figure never overwrites the UW/database figure.
- Partner and customer summaries use the same figures but intentionally different visual treatments. Cashback remains folded into the effective monthly basket position and an Upgrade preview is available in both.
- Profile activity now stores a bounded, reopenable summary snapshot with date, headline, services and relevant tools instead of only logging text.
- Solar is parked; Connector and Partner-opportunity sections are placeholders rather than unfinished workflows.

## Rule determination

All three outputs are derived by `deriveUwRules()` in `js/rules/uw-rules-2026-10-01.js`; none is stored as an editable total.

- **Service count:** Energy contributes 1; Broadband contributes 1; valid homeowner Boiler Cover contributes 1. Mobile contributes 1 when active, or 2 when at least two active SIMs are Go Unlimited. Multiple Essentials do not inflate the count.
- **Energy tariff tier:** only exists when Energy is selected. It is `1 + Broadband (0/1) + up to two active SIM qualifiers + valid Boiler Cover (0/1)`, capped at 3.
- **Welcome Bonus:** counts unique active service types—Energy, Broadband, Mobile and valid Boiler Cover—not individual SIMs. The mapping is 0/1 type = £0, 2 = £50, 3 = £150, 4 = £250.

## Save, restore and sync lifecycle

1. UI changes are normalised immediately, marked dirty and locally autosaved after a 450 ms debounce once a name exists.
2. `customer-store.js` writes the complete schema-v3 appointment plus local/Cloud IDs, revisions, specialist state, timestamps, sync/conflict state and deletion state to `apptCompanionV3/customers`.
3. At startup, V3 opens its database, performs a one-time copy-only import from known legacy IndexedDB/localStorage sources, restores the session's active local ID, and lists people by newest `updated_at`.
4. Cloud is optional. When configured, local saves queue sync; reconnect, window focus, periodic polling and exponential retry resume pending work.
5. Existing Cloud IDs are retained. Reconciliation compares the last acknowledged base with local and remote values, merges one-sided meaningful edits and surfaces genuine same-field conflicts.
6. Cloud writes use a temporary schema-v1-compatible envelope with full V3 state embedded at `ui_state._v3Appointment`, allowing coexistence with the old PWA.
7. Deletion creates a local tombstone, attempts immediate Cloud deletion when possible, and retries later when offline or unavailable.

Energy usage is saved as parallel per-fuel candidates (`electricityUwKwh` / `electricityBillKwh` and gas equivalents) plus a selected source. The legacy-compatible active `annualElectricityKwh` and `annualGasKwh` values are recalculated from that selection. Normalisation, legacy import and Cloud overlay preserve both candidates wherever present; changing the selected source does not delete either candidate.

Summary history is part of the person's bounded `activity` collection. Saving or actually sharing a summary appends a compact customer-safe snapshot containing the headline, services and tools used. The profile reopens that snapshot read-only, so current canonical appointment state is neither replaced nor rolled back.

## Specialist data exchange

Specialist URLs are centralised in `js/config/tools.js`; Cloud is not used as specialist transport.

- EV receives a base64 `ac_context` payload containing local person ID, name, region, fuel/profile and usage. `tools/ev/v3-context.js` applies those values and writes an `apptCompanionV3SpecialistReturn` localStorage message containing EV state when returning or leaving. The main app consumes it on boot/focus into that person's `specialist_state` and activity.
- Should I Fix receives name, region, fuel, electricity usage and gas usage through its documented query parameters. It remains independently usable and currently has no structured return payload.
- PET receives no customer context and opens as an independent Partner tool.

## Remaining limitations and technical debt

- `js/app.js` deliberately centralises rendering and DOM event wiring and is now the largest file. A future UI project should split it into view/controller modules without moving calculations into the UI.
- The Cloud schema-v1 compatibility envelope is transitional and should be retired only with a deliberate Cloud contract migration after old-PWA coexistence ends.
- Array conflicts, including per-SIM state, are reconciled atomically rather than field-by-field.
- Shared summaries live in the URL fragment. They are serverless and private from the server, but URL length limits constrain future payload growth.
- Summary history is intentionally bounded to the six most recent summary entries and is not searchable CRM data.
- The indicative Energy adapter depends on the central tariff feed's documented row fields. Confirmed quotes remain the authoritative route for final customer pricing.
- Should I Fix is currently one-way context transfer; PET has no person-linked state return.
- Connector, Partner opportunity and Solar are intentionally not implemented.
- Live Cloud, production service-worker/offline installation, real legacy-device migration, and physical-phone WhatsApp/clipboard flows still require deployment acceptance testing.
- Automated coverage exercises rules, calculations, migrations, reconciliation and sharing contracts; browser/DOM flows remain manual smoke tests rather than a full end-to-end suite.
- Tariff and external specialist availability remain dependent on their documented external services, with cached fallback only where implemented.

## Safe hook for a future UI/UX redesign

The approved UI/UX overlay was applied at the intended seam: `index.html`, `assets/app.css`, and the render/event-controller portions of `js/app.js`. Future visual iteration should stay at the same seam. Preserve the public data and behaviour boundaries in:

- `js/state/` for schemas, persistence, migration and sync;
- `js/rules/uw-rules-2026-10-01.js` for business rules;
- `js/appointment/calculations.js`, `js/appointment/upgrade-preview.js`, `js/energy/indicative-cost.js` and `js/energy/split-helper.js` for arithmetic and simulations;
- `js/summary/` for the share contract;
- `js/specialists/launcher.js` and `js/config/tools.js` for tool contracts.

A redesigned UI should edit canonical appointment facts, call the calculation/rule modules for derived results, and continue using the existing store/sync/share interfaces. It should not duplicate prices, bonus tables, service-count rules or financial arithmetic in components.
