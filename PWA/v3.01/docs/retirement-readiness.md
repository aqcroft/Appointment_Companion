# Retirement readiness

## V3-owned runtime

All Appointment Companion runtime assets required for normal V3 startup live under `PWA/v3/`:

- application shell, CSS, icons and manifest
- canonical state, migrations and IndexedDB store
- Cloud client, reconciliation and sync
- October 2026 rules and calculations
- summary and customer share view
- service worker and cache identity
- EV Companion HTML, scripts and styles

There are no temporary donor dependencies. V3 does not fetch or import `v5-companion.html`, `v6.html`, `PWA/consolidated-v1/`, `PWA/cloud/companion_cloud_pilot.html`, `release-v2.x.js`, or old shell-pilot modules.

## Stable external product/service dependencies

| Dependency | Classification | Contract |
|---|---|---|
| Appointment Companion Apps Script endpoint | stable Cloud service | existing list/get/save/delete/share JSON API; optional for normal use |
| Central UW tariff feed | stable data service | JSON `tariffLive` feed with last-good local cache |
| `aqcroft.github.io/ShouldIFix/Oct2026.html` | stable standalone specialist | query parameters for region/fuel/usage; independent and shareable |
| `aqcroft.github.io/UW_PET_GH_v2/...v21.html` | stable standalone specialist | direct Partner tool URL; no customer context sent |

The EV tool no longer depends on the old `PWA/v16c-ev.html` path at runtime; its proven assets are owned under `PWA/v3/tools/ev/`.

## What may be retired later

After the acceptance period, old Appointment Companion donor pages and patch-stack modules can be archived without breaking V3. Retirement must not remove the separate Should I Fix or PET products, the Apps Script Cloud service, or the tariff feed unless their V3 contracts are first replaced.

The service worker precache list is an executable check of V3 ownership: every same-origin shell entry is under `PWA/v3/`.

