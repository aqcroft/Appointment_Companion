## v2.46.10 - 10th October 2026

- Prepared Admin for hash-only password storage with one-time display after creation or reset.
- Existing hash-only credentials cannot be retrieved. Admin now displays a clear message and offers password reset without fabricating a password.
- When the backend identifies itself as v2.45.3 or later, reset supports an optional administrator-chosen password (12-128 characters), entered into a masked dialog, or a generated password.
- On older deployed backends, the existing generated-password reset remains in place; no custom-password option is presented until supported.
- Password storage changes require a separate Google Apps Script Code.gs deployment; this front-end update alone does not change storage.

# Appointment Companion Admin changelog

## v2.46.9 - 10th October 2026

- Bring retrieved login details into view automatically when using **Send login details** on mobile.
- Show request progress and any error beside the selected Partner, rather than only below the entire Partner list.
- Add a 20-second read-only login-details retrieval timeout with a safe Google Sheets fallback hint.
- No password reset, authentication schema change, customer migration or cloud write operations.

## v2.46.8 - 4th October 2026

- Prior Admin interface for Partner provisioning and login details.
