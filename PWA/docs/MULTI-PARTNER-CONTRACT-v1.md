# Appointment Companion multi-Partner contract v1

This layer is shared infrastructure. It must not belong to a particular Companion UI version.

## Core rules

1. One Companion Login ID represents one Partner workspace.
2. Customer records remain scoped to the authenticated `partner_id`.
3. Partner passwords are session-only in the browser. The Login ID may be remembered locally.
4. The Cloud `Partners` row is the source of truth for Partner profile/branding data.
5. `apptCompanionPartner` remains the v2.42 offline/local cache so existing Partner settings and onboarding continue to work.
6. A Partner may edit their own customer-facing profile fields after authentication.
7. Admin provisioning is server-authorised and must never depend on a client-side admin flag.
8. Customer-facing specialist shares must ultimately use the Partner who created the share, not hard-coded Adrian branding.
9. v3 should consume these APIs rather than create a separate Partner/auth/profile model.

## Partner record

Existing authentication fields:

- `partner_id` - Companion Login ID
- `workspace_key` - current Companion password

Profile fields:

- `name`
- `mobile`
- `email`
- `join` - UW Partner sign-up/quote link
- `town`
- `strap`
- `photo_url`
- `booking_url`
- `website_url`
- `status`
- `created_at`
- `updated_at`

`partner_name` is retained for compatibility with older Partner rows.

## Partner API

Authenticated with the existing `partner_id` + `workspace_key`:

- `getPartnerProfile`
- `savePartnerProfile`

v2.42 behaviour:

- after successful Cloud login, hydrate `apptCompanionPartner` from the Cloud profile;
- if an older account has a complete local Partner profile but empty Cloud profile fields, migrate the local identity to Cloud;
- existing Partner settings continue to edit `name`, `join`, `town` and `strap`;
- saving the existing Partner settings also syncs those fields to Cloud;
- if the Partner profile API has not yet been deployed, v2.42 must continue working from local settings rather than blocking the appointment tool.

## Existing onboarding is retained

The existing v2.42 flow remains:

1. Connect to Companion - Login ID + password
2. Name this device
3. Partner details
4. Ready

Admin-created Partner profile data should be available by Step 3 so the current Partner details modal opens pre-populated for the Partner to check/edit.

## Admin API

Protected by `COMPANION_ADMIN_PASSWORD` in Apps Script Properties:

- `adminPing`
- `adminProvisionPartner`
- `adminListPartners`
- `adminUpdatePartner`
- `adminResetPartnerPassword`

Admin passwords are not stored by the admin page.

`adminProvisionPartner` generates a Login ID when one is not supplied and generates the Partner password server-side. The returned password is shown to Adrian so it can be sent to the Partner.

## Admin UI

The first admin screen lives at `PWA/admin/index.html` and is deliberately separate from the operational Companion UI.

Primary workflow:

1. Enter admin password.
2. Enter/pre-fill known Partner profile details.
3. Create Partner.
4. Receive generated Login ID + password.
5. Copy the onboarding message or open a pre-filled WhatsApp message to that Partner.

Secondary workflow:

- list Partners;
- edit Partner profile data;
- reset a Partner password and generate a fresh WhatsApp-ready message.

## Rollout dependency

The Apps Script helper `PWA/cloud/apps-script-admin-v1.gs` must be added/updated in the live Appointment Companion Apps Script project, wired into `doPost(e)`, provided with the `COMPANION_ADMIN_PASSWORD` Script Property and deployed as a new Web App version before the new admin/profile API calls can work live.

Until that deployment happens, the branch must remain non-production and v2.42 local Partner settings remain the safe fallback.

## Next integration slice

Customer-facing EV and Should I Fix contact/profile treatments currently contain Adrian-specific details. They must be changed to consume the Partner profile belonging to the share creator before multi-Partner testing is considered complete.
