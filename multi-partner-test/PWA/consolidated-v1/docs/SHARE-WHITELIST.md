# Share-payload whitelist

All share builders use allowlists. Unknown fields are dropped recursively. Local/customer database IDs, device identity, authentication, private notes, sync metadata and unrelated appointment state are forbidden even if a caller supplies them.

## Main savings-card share

Permitted recipient-facing categories:

- customer display name and card date
- selected service flags/counts
- current/UW service costs, year-one benefit and monthly saving
- welcome/referral/free-month/exit-fee/customer-facing adjustment figures
- cashback, insurance and meal-deal presentation values
- recipient-facing adjustment labels/reasons
- HTTPS basket URL
- sharing Partner display name, public role/strapline and HTTPS join URL
- optional upgraded meal-deal snapshot containing the same figure whitelist

The existing compact keys permitted are:

```text
n dt y f cE uE cB uB uBr cM uM md is cT uT sM ct w rf nl bf mf au
ef ed cn fm cs cbt ip bc bcf it mac mau map oo ool macr maur bl pn pr ps pj
up usc
```

`up` may contain only the figure keys produced by the same card calculator. The main share contains no annual usage figures because its recipient view does not currently need them.

## EV personalised share

Permitted top-level fields:

```text
schema_version view_type customer_name electricityUsageTotalKwh
electricityProfile electricityUsageDayKwh electricityUsageNightKwh ev_state
```

Permitted `ev_state` fields:

```text
schema_version tool_version vehicle_efficiency_mi_kwh vehicle_icon annual_mileage
home_usage_kwh uw_services region ev_offpeak_pct e7_offpeak_pct e7_actual
e7_day_kwh e7_night_kwh away_pct away_rate_p_kwh efficiency_override_mi_kwh
known_ev_kwh dual_fuel period stress_pct
```

`electricity_usage_revision`, `shared_at`, customer IDs and the rest of the customer record are dropped.

## Should I Fix personalised URL

Permitted query fields:

```text
public r f e g eh t o es eu gs gu sp n b
```

These represent public mode, tariff region, fuel mode, relevant usage, electric heating, chosen tariff/custom rates, stress percentage, optional display name and optional HTTPS basket URL. No record IDs or bridge state are encoded.

## Generic specialist shares

- Should I Fix: consolidated public route with `public=1` only.
- EV: standalone consolidated EV route without `ac_launch`, share token or customer query values.
- Generic URLs contain no customer name, usage, basket, IDs or specialist state.

## Always forbidden

```text
local_id cloud_id customer_id device_id session_id workspace_key partner_id
privateNotes notes authentication/session objects storage keys sync state
revision IDs conflict/base snapshots internal timestamps unrelated form state
```

