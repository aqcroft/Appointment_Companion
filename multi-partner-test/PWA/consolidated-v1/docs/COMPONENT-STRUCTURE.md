# Proposed consolidated-v1 structure

```text
PWA/consolidated-v1/
├── index.html                         isolated Main loader
├── canonical-state-v1.js             schema, migration aliases and compatibility projections
├── canonical-controls-v1.js          Energy, usage, split-rate, E7 helper and Mobile UI
├── local-customer-store-v2.js        consolidated IndexedDB database and one-time imports
├── consolidated-controller-v1.js     local commit, customer browser, Cloud reconciliation/conflicts
├── specialist-launcher-v1.js         immediate local hand-off and registry
├── specialist-features-v1.js         EV, Should I Fix and Earnings shortcuts/registration
├── share-policy-v1.js                allowlists and sanitizers
├── specialist-share-v1.js            Cloud token reader/writer guarded by share policy
├── tariff-fetch-v1.js                 last-verified live-feed cache wrapper
├── manifest.webmanifest
├── pwa-register.js
├── sw.js                              route-scoped isolated cache
├── ev/
│   └── index.html                     v16C loader with local-first persistence and whitelisted share
├── should-i-fix/
│   └── index.html                     current PWA donor wrapper with canonical launch projection
└── docs/
    ├── RECONCILIATION.md
    ├── CANONICAL-STATE.md
    ├── SYNC-CONFLICT.md
    ├── MIGRATION-INVENTORY.md
    ├── SHARE-WHITELIST.md
    └── COMPONENT-STRUCTURE.md
```

## Dependency boundaries

- Main visual/calculation donor: `/PWA/cloud/companion_cloud_pilot.html` loaded read-only with a base URL pointing at `/PWA/cloud/`.
- Architectural adapters: consolidated files are derived from `/local-first/`; no Cloud-first save or autosave controller is loaded.
- Shared stable assets: Cloud client, current status icons, PWA EV v16C assets and current tariff feed.
- Consolidated service worker scope: `/PWA/consolidated-v1/` only.
- No source file under `/PWA/cloud/`, `/local-first/` or root `/cloud/` is modified.

## Loading order

1. Donor Main document and its calculation/share functions.
2. Consolidated/local-only flags and cached live-tariff wrapper.
3. Cloud client, device identity and bridge.
4. Canonical schema and controls.
5. IndexedDB store.
6. Local-first-adapted shell UI.
7. Share policy, specialist registry/features and consolidated controller.

The controller becomes active only after canonical controls and IndexedDB are ready. Cloud sync starts after the first local commit and never blocks the Main or specialist routes.

