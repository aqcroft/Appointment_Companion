# Appointment Companion changelog

## v2.45.5 - 4th October 2026

- Added 📲 Send fresh login to each Partner row in Companion Admin.
- The action reuses the existing password reset flow, then presents the same copy / WhatsApp-ready credentials card used after Partner creation.
- Updated Admin page/version metadata and PWA cache metadata to v2.45.5.

## v2.45.4 - 4th October 2026

- Added a 🔐 Admin shortcut to the shared Companion menu.
- The Admin shortcut is reachable from Main Companion and via the existing Companion menu route from EV and Should I Fix.
- Admin access remains protected by the separate Companion Admin password.

## v2.45.3 - 4th October 2026

- Fixed Companion Admin loading the stale root-level Cloud client instead of the current PWA Cloud client.
- Partner list and Drive-backed photo upload now use the correct API implementation.
- Existing Partner records, generated passwords and Apps Script data are unchanged.

## v2.45.2 - 4th October 2026

- Fixed stale browser caching on Companion Admin by versioning the shared Cloud client asset.
- This resolves `api.adminListPartners is not a function` and `api.adminUploadPartnerPhoto is not a function` when an older Cloud client was cached.
- Existing Partner rows and generated passwords are unaffected.

## v2.45 - 4th October 2026

- Added Drive-backed Partner profile photo upload to Companion Admin.
- Admin can choose a JPEG, PNG or WebP from phone/computer instead of finding a hosted image URL manually.
- Photos are resized client-side before upload and stored as JPEGs in a dedicated `Appointment Companion Partner Photos` Google Drive folder.
- The backend returns a public Drive thumbnail URL which is stored in the Partner profile.
- The Drive folder ID is retained in Apps Script Properties for reuse.
- Existing URL-based profile photos remain supported as a fallback.
- Bumped the PWA cache/version metadata in line with the universal release rule.

## v2.44 - 4th October 2026

- Added Cloud-backed Partner profiles as the reusable identity layer for multiple Companion users.
- Partner profiles now support Partner ID, name, UW join link, mobile, email, town, strapline, photo URL, booking URL, website URL and active status.
- Added the live Partner admin console for creating and editing Partner profiles and resetting passwords.
- Partner details hydrate onto a device after login while remaining cached locally for offline use.
- EV and Should I Fix sharing now carries the creating Partner ID so public views can resolve the correct Partner branding.
- Retained the v2.43 trusted-device login behaviour.
- Bumped the PWA asset/cache version so installed copies fetch the new profile and sharing code.

## v2.43 - 4th October 2026

- Trusted-device login persistence: a verified Companion Login ID and Password are retained on that device across normal browser, phone and installed-PWA restarts.
- Session authentication is automatically rehydrated from the trusted-device credential.
- Temporary Cloud, network or Apps Script failures no longer clear a verified device login.
- Explicit disconnect, a genuine authentication rejection, or clearing the device's site/app data still removes the trusted-device credential.
- PWA asset/cache version bumped so existing installations fetch the corrected authentication shell.

## v2.42

- Added true local/Cloud discrepancy handling and multi-customer deletion.
- Continued consolidated local-first customer and specialist-tool architecture.
