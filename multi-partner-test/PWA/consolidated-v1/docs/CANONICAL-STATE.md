# Consolidated v1 canonical state

## Ownership boundary

The IndexedDB customer record is the operational source of truth. Main owns customer, appointment, basket, Energy and Mobile facts. Specialists own only their namespaced modelling state. Cloud stores a synchronised copy and never supplies the identity required for local operation.

## Customer record

```js
{
  schema_version: 1,
  local_id: "local_...",                 // required, immutable local identity
  cloud_id: "..." | "",                 // optional synchronisation identity
  customer_name: "Sarah",
  appointment_state: {
    schema_version: 1,
    canonical: {
      customerName: "Sarah",
      homeStatus: "homeowner" | "tenant" | null,
      selectedServices: {
        energy: true,
        broadband: false,
        mobile: true
      },
      basketUrl: "https://..." | "",
      privateNotes: "...",
      lastQuoteSharedAt: "ISO-8601" | "",
      energy: {
        energyFuelSelection: "electricity" | "gas" | "both",
        electricityUsageTotalKwh: 3250 | null,
        gasUsageKwh: 11500 | null,
        electricityUsageSource: "actual" | "estimated" | null,
        gasUsageSource: "actual" | "estimated" | null,
        electricityUsageSourceDetail: "manual" | "customer_bill" | "uw_quote" | "extrapolated_sample" | "legacy_unknown" | null,
        gasUsageSourceDetail: "manual" | "customer_bill" | "uw_quote" | "legacy_unknown" | null,
        electricityProfile: "standard" | "economy7" | "ev",
        electricityUsageDayKwh: 2000 | null,
        electricityUsageNightKwh: 1250 | null
      },
      mobile: {
        simCount: 1
      }
    },
    ui_state: { /* non-canonical calculation inputs and presentation state */ }
  },
  specialist_state: {
    ev: { /* EV-only vehicle, mileage, charging and tariff modelling */ },
    fix: { /* Should I Fix-only state if a persisted return value is added */ }
  },
  basket_url: "https://..." | "",         // indexed convenience mirror of canonical.basketUrl
  local_revision: 12,
  client_revision_id: "rev_...",
  cloud_synced_local_revision: 10,
  base_cloud_revision: "..." | "",
  base_cloud_snapshot: { /* last acknowledged Cloud customer */ } | null,
  sync_state: "pending" | "synced" | "conflict" | "pending_delete",
  conflict: null | { local, cloud, base, detected_at },
  deleted: false,
  tombstone: false,
  created_at: "ISO-8601",
  updated_at: "ISO-8601"
}
```

## Invariants

1. `local_id` exists before the first local save and never changes when Cloud connects.
2. `cloud_id` may be empty for the record's entire lifetime.
3. `electricityUsageTotalKwh` is the only canonical total-electricity field.
4. For `electricityProfile = economy7 | ev`, when both split values exist:

   ```text
   electricityUsageTotalKwh = electricityUsageDayKwh + electricityUsageNightKwh
   ```

5. `electricityUsageKwh` is never written into canonical state. It may be projected into a donor UI or specialist launch envelope and read during migration.
6. Manual usage entry sets that fuel's source to `actual`. Choosing a Low/Medium/High fallback sets it to `estimated`.
7. A sample-bill extrapolation sets electricity source to `estimated` with detail `extrapolated_sample`.
8. `simCount` defaults to 1 when Mobile is first selected and is constrained to 1–5.
9. Old donor controls are calculation projections only. They are regenerated from canonical state and removed from stored `ui_state` wherever they duplicate canonical facts.
10. `specialist_state` is namespaced. Main may read it for indicators and hand-off, but does not reimplement specialist models.

## Compatibility representation

The Cloud donor's existing calculation functions still receive a short-lived legacy-shaped form snapshot. The compatibility adapter derives it from canonical state at render, restore and specialist launch time. It is not a second database and cannot overwrite a newer canonical record.

Mapping examples:

| Canonical | Compatibility projection |
|---|---|
| `electricityUsageTotalKwh` | `inputs.electricityUsageKwh` |
| `energyFuelSelection` | `energyHasElectricity`, `energyHasGas`, split fuel flags |
| `electricityUsageSource` | `estimate` or the documented source-detail value |
| `mobile.simCount` | donor `state.simCount` and the generated SIM rows |
| `selectedServices` | donor `state.services` |

