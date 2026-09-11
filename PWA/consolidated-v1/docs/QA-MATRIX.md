# Consolidated v1 QA matrix

The production `/PWA/cloud/` and existing `/local-first/` routes are out of scope for mutation. All checks target `/PWA/consolidated-v1/`.

| Area | Scenario | Result |
|---|---|---|
| Main | Fresh customer, edit, immediate local save, refresh | PASS |
| Main | New customer, local customer list, reopen saved customer | PASS |
| Canonical Energy | Both fuels, actual electricity/gas usage, persistence | PASS |
| Canonical Energy | Low/Medium/High estimates and source provenance | PASS |
| Canonical Energy | Peak/off-peak day/night total and sample-ratio helper | PASS |
| Canonical Mobile | Default one SIM, choose three SIMs, refresh | PASS |
| EV | Main handoff carries canonical electricity usage | PASS |
| EV | Specialist edits autosave, reopen, save and return | PASS |
| Should I Fix | Main handoff carries fuel selection and exact usage | PASS |
| Generic routes | EV and Should I Fix open without customer state | PASS |
| Local-only | Banner, no Cloud-backed EV share, mode propagates | PASS |
| Offline | Reload Main and launch EV after the local server stops | PASS |
| Sharing | Main/EV allowlist contract tests reject IDs, notes and sync/auth fields | PASS |
| PWA | Manifest parses, service worker cache is isolated to consolidated v1 | PASS |
| Cloud sync | Authenticated upload, hydrate, conflict resolution and delete acknowledgement on two real devices | TESTER PASS REQUIRED |
| Sharing | Live Cloud short-link creation and recipient view using Partner credentials | TESTER PASS REQUIRED |

Automated contract check:

```powershell
node PWA/consolidated-v1/tests/contract-tests.cjs
```

The Economy 7 break-even threshold remains intentionally deferred: the inspected donor calculates costs for a supplied off-peak percentage but does not contain a verified reusable threshold formula.
