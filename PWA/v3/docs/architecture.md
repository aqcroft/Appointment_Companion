# Appointment Companion V3 architecture

## Ownership

`PWA/v3/` is a self-contained, static, module-based PWA. Its entry point does not fetch or compose an older Appointment Companion HTML file. The main application, state model, rule engine, calculations, IndexedDB store, Cloud client, sharing contract, service worker, styles and EV runtime are all V3-owned.

The implementation uses browser-native ES modules and no framework or build step. `index.html` loads `js/app.js`; `app.js` composes the user experience from focused modules.

## State boundaries

V3 persists customer facts in the schema-v3 appointment state:

- neutral person name and home status
- selected service presence
- shared Energy region, fuel, parallel UW/database and optional bill usage, the selected calculation source, and electricity profile
- appointment inputs for Energy, Broadband, Mobile, Boiler Cover, Cashback Card and adjustments
- optional basket link and private notes
- lightweight activity and standalone specialist state

Service count, Energy tariff, Welcome Bonus and all monetary results are derived. They are not independent canonical facts. This prevents a saved record from carrying contradictory or stale rule outputs.

The canonical normaliser is `js/state/canonical-state.js`. Historic shapes are absorbed by `js/state/migrations.js`, including the deliberate zero-value compatibility treatment for retired Income Protector state.

## Local-first flow

IndexedDB database `apptCompanionV3` is primary. A person is written only after a non-empty name exists. Form changes become dirty immediately and autosave locally after a short debounce. A successful local transaction clears the dirty flag; Cloud synchronisation happens afterwards and cannot block normal work.

Records carry local and Cloud IDs, local and acknowledged revisions, a client revision ID, base Cloud revision/snapshot, sync state, conflicts, deletion tombstones, timestamps, appointment state and specialist state.

Individual deletion and multi-select deletion both create a tombstone. When connected, Cloud deletion is attempted immediately. Otherwise the tombstone remains `pending_delete` and is retried on reconnect.

## Cloud and reconciliation

`js/state/cloud-client.js` owns the current Apps Script API contract. Credentials remain in session storage using the existing session key so V3 can coexist with the current PWA. They are never placed in a customer share.

Cloud saves pass through `toLegacyCompatibleAppointment()` in `js/state/migrations.js`. It emits a schema-v1-compatible projection for the existing PWA and embeds the complete V3 state at `ui_state._v3Appointment`. On read, current schema-v1 fields overlay the embedded copy. This compatibility boundary can be removed only after the old PWA acceptance window closes and the Cloud contract is migrated deliberately.

`js/state/reconciliation.js` performs three-way reconciliation against the last acknowledged Cloud snapshot:

- identical values are accepted
- one-sided changes win automatically
- an empty side does not overwrite a populated side
- two different meaningful edits to the same field create a reviewable conflict
- arrays such as per-SIM state are treated atomically when both sides change

Cloud is backup, sync and cross-device support. No Cloud credential or connection is required to create, edit, reload, summarise or share a local appointment.

## October 2026 rule boundary

`js/rules/uw-rules-2026-10-01.js` owns the versioned business rules:

- Go Essentials £6/month
- Go Unlimited £13/month
- each additional Unlimited SIM receives its first three months free
- distinct Service count, Energy tariff and Welcome Bonus outputs
- Energy tariff capped at 3-service
- Welcome Bonus based on unique service types
- homeowner-only Boiler Cover at £25/month with no introductory benefit
- retired Income Protector always contributes £0

`js/appointment/calculations.js` consumes facts and rule results. It also owns the effective monthly basket position, including the Cashback Card contribution. UI code does not duplicate the rule arithmetic. `js/appointment/upgrade-preview.js` evaluates a cloned appointment through the same calculation boundary and never mutates saved state.

## Appointment and Energy

The approved UI overlay keeps the permanent Save Money / Make Money / Tools / More shell, a name-first launchpad with three recent people, a person profile hub, a service overview, progressive service workspaces and distinct Partner/customer summary treatments. The active person remains context throughout the shell. Boiler Cover is not rendered for tenants.

Energy is one progressive-disclosure workspace. It supports monthly, split electricity/gas and annual bill-cost routes; exit fees; confirmed UW quote capture; Economy 7/EV day-night details; a day/night split helper; a derived E7-vs-standard insight; and an advanced manual adjustment. For each applicable fuel, canonical state retains the UW/database annual usage and an optional customer-bill annual usage independently. A selected source drives the compatibility `annual*Kwh` calculation input; selecting or entering a bill value does not overwrite the UW/database value. `js/energy/indicative-cost.js` converts the central tariff feed into indicative bundle-tier costs without recreating an unofficial quote engine.

Broadband, per-SIM Mobile, Cashback Card, recurring adjustment, one-off adjustment, referral and National League behavior remain available without dominating the common path.

## Sharing

`js/summary/share-policy.js` is an explicit allowlist. `js/summary/share-data.js` produces a compact, customer-safe hash payload used by the same V3 entry point. Partner and customer views use the same figures but have deliberately distinct visual treatments. Both preserve the first-year hero, basket strip, total monthly Current/UW/Saving comparison, expandable detail and Upgrade preview. The customer view excludes private notes, Cloud credentials, sync metadata and Partner controls. Basket links are optional and restricted to HTTPS.

`js/summary/history.js` owns lightweight, reopenable summary activity. Each entry stores its date, headline result, included services, relevant tools used and a compact customer-safe figure snapshot. The profile shows the most recent entries; reopening one is read-only and does not restore or mutate current appointment facts. This is intentionally an activity/history boundary, not a CRM record model.

## Specialist contracts

Tool URLs live in `js/config/tools.js`.

- EV Companion is copied into `PWA/v3/tools/ev/`, remains directly usable/shareable, and accepts V3 context through an `ac_context` query payload. It has a return link to V3.
- Should I Fix remains a stable external standalone product. V3 passes region, fuel and usage through its documented query inputs.
- PET remains the current external Partner Earnings tool. It receives no customer data.

Cloud is not used as transport between V3 and a specialist.

## PWA and cache

`sw.js` uses the V3-only `appointment-companion-v3-*` cache family. It precaches the V3 shell and owned EV runtime, cleans older V3 caches only, uses network-first navigation and cache-first shell assets, and never requests an Appointment Companion donor page.

## Verified repository contradiction

The authoritative brief names `v6.html` and v2.41/v2.42 release files including `earnings-shortcut-v2.42.js`. They are absent from repository commit `8eaf927` on `main`/`origin/main`. The checked-in `PWA/consolidated-v1/` is an earlier runtime-composed consolidated-v1 build. V3 therefore uses the brief itself for the October 2026 rules and deletion requirements, while preserving compatible evidence from the available v5 and consolidated modules. No undocumented alternative behavior was chosen.
