# V3 migration notes

## Decision

V3 uses a new IndexedDB database, `apptCompanionV3`, and performs a one-time read/copy import from known older local stores. It does not upgrade or write to the current PWA database.

This is the safest coexistence strategy because the current checked-in consolidated app understands schema version 1 only. Writing schema-v3 state back into `apptCompanionConsolidatedV1` could make the old working PWA misinterpret its own records. A separate V3 database leaves all donor data untouched and allows both versions to remain available during acceptance testing.

## Import sources

On first V3 startup, `customer-store.js` reads, without changing:

- IndexedDB `apptCompanionConsolidatedV1/customers`
- IndexedDB `apptCompanionLocalFirstV1/customers`
- `apptCompanionWorkingRecordV1`
- `apptCompanionSaves_v2`

The completion marker `v3-import-2026-09-15` is stored in V3's own `meta` store. Import is idempotent. Records are de-duplicated by Cloud ID first and local ID second. Deleted legacy rows and unnamed drafts are not imported.

## Cloud IDs and coexistence

Existing Cloud IDs are preserved. V3 therefore updates the same Cloud customer instead of creating a duplicate. The old and new local databases can coexist; when each app synchronises, the current Cloud ID remains the cross-version identity.

During the acceptance period, Cloud writes use a schema-v1-compatible envelope. The fields understood by the checked-in consolidated PWA are projected into its `canonical` and `ui_state` shapes, while the complete normalised V3 appointment is retained in `ui_state._v3Appointment`. V3 reads that embedded state back and then overlays any newer schema-v1 fields, so an edit made by the old PWA is not hidden by a stale V3 snapshot. This keeps the shared Cloud record readable in both directions without making the legacy local database writable.

Partners should avoid editing the same person simultaneously in V3 and the old PWA. V3 uses the last acknowledged Cloud snapshot for three-way reconciliation and surfaces genuine same-field changes instead of silently choosing a winner.

## Schema defaults

New V3 fields receive safe defaults:

- Energy region: `11` / East Midlands
- electricity profile: standard
- fuel: dual
- SIM count: 1
- current SIM plan: Go Essentials
- Boiler Cover monthly price: £25
- Boiler introductory benefit: £0
- specialist state: empty object
- Energy active usage source: UW/database when no populated legacy source exists

Legacy active Energy usage is copied into the corresponding source candidate. A legacy `actual` source maps to the bill candidate only when a positive value exists. V3 never infers a populated bill value from an empty legacy record. Once migrated, UW/database and bill candidates remain independent for electricity and gas, while the selected candidate continues to populate the compatibility `annualElectricityKwh` / `annualGasKwh` fields used by calculations and older Cloud projections.

Derived Service count, Energy tariff, Welcome Bonus and totals are recalculated from current facts and the October 2026 rule module.

## Legacy Mobile and Income Protector

Legacy `essentialMax` and `unlimitedMax` IDs are preserved. Friendly or older strings containing “essential” or “unlimited” normalise to those stable IDs. Prices are never migrated as rules; V3 derives £6/£13 from the current rule module.

Historic Income Protector fields may be read but are discarded from current canonical service state. Income Protector cannot appear in the V3 UI and always contributes £0.

## Specialist and basket safety

Existing `specialist_state`, EV state and basket URLs are copied. Basket URLs are retained privately in the profile; only valid HTTPS links can enter a shared customer payload.

## Rollback

Because import is copy-only, returning to the old PWA does not require a database rollback. Removing V3's own IndexedDB database would remove V3-local changes, but would not alter the legacy database. Do not remove either database during the real-world acceptance period.
