# Legacy storage and migration inventory

Discovery covered `/PWA/cloud/`, `/local-first/`, the current PWA EV files and the bridge adapters. Migration is read/copy only; existing keys and databases are not deleted by consolidated v1.

## IndexedDB

| Name/version | Contents | Consolidated treatment |
|---|---|---|
| `apptCompanionLocalFirstV1`, version 2 | `customers` keyed by `local_id`; `meta`; local/cloud revisions, specialist state, tombstones and conflicts | Import once into the new consolidated database, preserving `local_id`, then normalise appointment state to schema v1. Continue to read only for migration. |
| `apptCompanionConsolidatedV1`, version 1 | New canonical `customers` and `meta` stores | Sole operational database for consolidated v1. |

## localStorage

| Key/prefix | Current role | Treatment |
|---|---|---|
| `apptCompanionSaves_v2` | Legacy local profile array and Cloud fallback backups | One-time migration source. Read-only compatibility afterward. |
| `apptCompanionWorkingRecordV1` | Bridge/shell working snapshot | One-time migration source, then ephemeral derived bridge projection only. Never canonical. |
| `apptCompanionJourneyV1` | Bridge journey and namespaced specialist state | Import specialist state when no newer local record exists; continue as ephemeral same-tab compatibility. |
| `apptCompanionRecentCustomersV1` | Recent-customer display cache | Derived/rebuildable cache; no migration authority. |
| `apptCompanionSpecialistBackups_v1` | Cloud specialist fallback array | One-time specialist-state recovery source when it can be matched safely; otherwise retain read-only. |
| `apptCompanionEvDraftV1` | Unlinked EV draft | Optional read-only fallback for standalone EV; not merged into a customer without an explicit link. |
| `apptCompanionPartner` | Partner display name/join link used on customer cards | Preserve as device-local settings. Never include in customer canonical state; only whitelisted recipient-facing fields may be shared. |
| `apptCloudPilotPartnerId` | Remembered Companion Login ID | Preserve as a convenience setting. It is not a customer field. |
| `apptCloudPilotCustomerSort`, `apptCloudPilotCustomerSortDir` | Customer-list preference | Preserve as local UI preferences. |
| `apptCompanionOnboardingStateV2` | Onboarding progress | Preserve as local UI state. |
| `apptCompanionOnboardingCompleteV1`, `apptCompanionOnboardingStepV1` | Older onboarding state | Existing compatibility reader may migrate to V2; consolidated customer migration ignores it. |
| `apptCloudDeviceV1` | Random device ID/name | Preserve for advisory device identity only. Never share. |
| `apptCompanionTariffSnapshotV1` | Last verified live tariff response | Preserve as the offline tariff cache; never treat it as a separately maintained tariff source. |

## sessionStorage

| Key/prefix | Current role | Treatment |
|---|---|---|
| `apptCompanionConsolidatedCurrentV1` | New active `local_id` | Canonical active-record pointer for consolidated v1. |
| `apptCompanionLocalFirstCurrentV1` | Local-first active `local_id` | Read once only when importing a local-first session; do not overwrite it. |
| `apptCloudPilotCurrentCustomer` | Active `cloud_id` | Derived from the active consolidated record for Cloud/legacy UI compatibility. |
| `apptCloudPilotAuthSession` | Partner ID/workspace credential for this tab | Preserve session-only. Never migrate into records, URLs or shares. |
| `apptCloudTabSessionV1` | Random tab/session ID | Preserve for advisory presence only. Never share. |
| `apptCompanionLaunchV1:*` | Expiring specialist launch envelope | Continue as ephemeral same-origin hand-off; no long-term migration. |
| `apptCompanionReturnV1:*` | Expiring specialist return envelope | Consume once, then remove. |
| `apptCompanionActiveLaunchV1` | Current bridge launch ID | Ephemeral; remove when return is consumed. |
| `apptCompanionSpecialistReturnNeedsSaveV1` | Cloud-first post-return save signal | Retire. Consolidated specialists save locally before return and background sync follows. |

## Cloud fields and aliases

- `customer_id` maps to local record `cloud_id` only.
- `appointment_state`, `appointment_state_json` and `appointment_snapshot` are accepted migration aliases for the canonical appointment document.
- `ev_state` and `ev_state_json` migrate into `specialist_state.ev`.
- `electricity_usage_kwh` and form `electricityUsageKwh` migrate into `electricityUsageTotalKwh`; they are not active canonical fields.
- Existing `updated_at` is accepted as a base Cloud revision only when no explicit revision is returned.

## Retirement rule

No legacy key is deleted in consolidated v1. A key may be retired from writes after its value is either migrated into canonical IndexedDB or proven to be a rebuildable preference/cache. Destructive cleanup requires a later, separately approved migration release.

