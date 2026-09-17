# Companion Bridge v1

Purpose: make EV Companion the first of many independently shareable specialist companions without hard-wiring every new tool into Appointment Companion.

## Principle

Every Partner-side specialist tool uses the same bridge contract:

1. The originating Companion launches the specialist in the same tab.
2. A short `ac_launch` ID goes in the URL. No Workspace Key, private notes or appointment data go in the URL.
3. The full hand-off envelope lives in `sessionStorage`, which survives same-origin same-tab navigation.
4. The specialist receives:
   - `customer_id`
   - complete Appointment Companion state
   - current basket URL
   - existing namespaced specialist states
   - exact origin URL/tool and scroll position
5. The specialist returns via the same bridge with:
   - its own `tool_state`
   - optional updated basket URL
   - optional appointment state
   - optional generic `customer_patch`
6. The originating Companion resumes at the previous journey position.

## Shared browser API

Loaded from `cloud/companion-bridge-v1.js` as:

`window.AppointmentCompanionBridge`

### Launch a specialist

```js
AppointmentCompanionBridge.launch(
  '../v16c-ev.html',
  'ev'
);
```

Optional third argument can override or extend the standard envelope.

### Receive in a specialist

```js
const context = AppointmentCompanionBridge.receive();
```

The specialist can read `context.appointment_state`, `context.basket_url`, `context.customer_id`, `context.journey` and `context.extra`.

### Save specialist state locally in the journey

```js
AppointmentCompanionBridge.setToolState('ev', {
  annual_mileage: 10000,
  efficiency_mi_kwh: 3.2
});
```

States are namespaced, so future tools can use identifiers such as:

- `ev`
- `cashback_challenge`
- `broadband`
- `mobile`
- `insurance`

No Appointment Companion schema change is needed for each new tool because the namespaced `specialists` map is carried inside `_journey` in `appointment_state_json`.

### Return to the originating Companion

```js
AppointmentCompanionBridge.returnToOrigin({
  tool_state: {
    annual_mileage: 12000
  },
  basket_url: 'https://example.com/customer-basket'
});
```

The bridge returns to whichever tool launched it, rather than assuming Appointment Companion is always the origin. This allows chains such as:

Appointment Companion -> EV Companion -> Cashback Challenge -> EV Companion -> Appointment Companion

without bespoke routing.

## Cloud persistence

`companion-bridge-v1.js` wraps the existing `serializeForm()` and `restoreForm()` functions.

It adds two forward-compatible keys to `appointment_state_json`:

- `_journey` - namespaced specialist state and pending generic customer changes
- `_client` - the device/session identity that produced that saved Appointment state

Existing form restoration ignores fields it does not know, whilst the bridge preserves them across saves.

This avoids adding a new Google Sheet column every time a specialist Companion is invented.

## Canonical customer fields

Specialist tools can return a generic `customer_patch` for deliberate changes to canonical customer data, for example a corrected electricity usage figure.

The bridge stores that as a pending patch. Applying it to Cloud should remain a conscious action so a specialist tool cannot silently overwrite canonical usage merely because the customer experimented with a slider.

## Customer-facing shares

The Partner-side bridge is not the customer share mechanism. Customer-facing specialist links should continue to use immutable Cloud share snapshots (`createShare`) with a `view_type` identifying the specialist.

This separation is intentional:

- Partner journey = live, editable, authenticated Cloud customer
- Customer share = immutable, sanitised snapshot with no Partner secret or private notes

A future specialist therefore needs only:

1. Companion Bridge support for the Partner journey.
2. A sanitised snapshot renderer for its customer-facing share.

The main Appointment Companion should not need bespoke changes for that specialist.
