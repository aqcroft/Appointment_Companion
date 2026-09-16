# V3 feature matrix

| Donor feature / requirement | V3 destination | Status | Main regression risk |
|---|---|---|---|
| Local-first IndexedDB | `state/customer-store.js` | Preserved, V3-owned | unnamed junk records |
| Cloud sync and IDs | `state/cloud-sync.js` | Preserved, optional | duplicate Cloud profiles |
| Three-way reconciliation | `state/reconciliation.js` | Enhanced field-wise | false conflicts |
| Individual deletion | People manager + tombstone | Preserved | offline Cloud delete |
| Select multiple/delete | People manager | Preserved | mixed local/Cloud rows |
| Name-first launchpad | `app.js` launchpad | Added | duplicate names |
| Three recent people | launchpad | Added | ordering by `updated_at` |
| Active-person context | top chip/global sections | Added | losing context |
| Save/Make/Tools/More | permanent navigation | Added | mobile navigation |
| Homeowner/tenant | appointment | Preserved | Boiler visibility |
| 2x2 service overview | appointment | Added | child-choice duplication |
| Inline fuel/SIM count | service overview | Preserved | default values |
| Monthly/split/annual Energy cost | Energy workspace | Preserved | electricity/gas order |
| Exit fees | calculations | Preserved | refund threshold/cap |
| Manual Energy adjustment | advanced Energy | Preserved | accidental default use |
| UW quote/tier capture | Energy workspace | Preserved | indicative vs confirmed |
| Region/shared usage | canonical Energy | Added | migration defaults |
| Economy 7 split helper | `energy/split-helper.js` | Preserved/enhanced | zero/sample handling |
| E7 vs Standard | profile Energy insight | Added | overstated result |
| EV current tariff detail | Energy + owned EV tool | Preserved | context prefill |
| Broadband comparison/add-ons | Broadband workspace | Preserved | April/free-month treatment |
| Go Essentials £6 | October rule module | Updated | legacy price return |
| Go Unlimited £13 | October rule module | Updated | legacy price return |
| Additional Unlimited 3 months free | rule/calculation layer | Updated | 6-month regression |
| Service count | rule module | Separate | multiple Essentials |
| Energy tariff | rule module | Separate, cap 3 | 4-service regression |
| Welcome Bonus | unique-type rule | Separate | SIMs counted as types |
| Boiler Cover | homeowner-only service | Preserved | tenant access |
| Boiler 3-month benefit | nowhere | Retired | £75 returning |
| Income Protector | migration shim only | Retired/zero | historic total leakage |
| Cashback Card | advanced appointment | Preserved | confused with PET |
| PET shortcut | tool registry/Make Money | Preserved | old Cashback shortcut |
| Referral/National League | appointment benefits | Preserved | eligibility |
| Recurring/one-off adjustments | advanced appointment | Preserved | monthly/yearly mix |
| Summary/sticky result | appointment/summary | Preserved | total mismatch |
| Share/copy/WhatsApp | summary | Preserved | private-state leak |
| Optional basket link | summary/share | Preserved | summary gating |
| Partner branding | More/share payload | Preserved | share identity |
| Explicit share allowlist | `summary/share-policy.js` | Preserved | new field omitted/leaked |
| Explicit unsaved guard | `shell/unsaved-work-guard.js` | Added | excessive prompting |
| EV standalone/shareable | `tools/ev/` | Preserved, V3-owned | donor dependency |
| Should I Fix standalone | external stable contract | Preserved | context query drift |
| PWA/offline/cache | V3 service worker | Preserved, V3-owned | stale calculations |
| Solar | none | Parked | scope creep |

