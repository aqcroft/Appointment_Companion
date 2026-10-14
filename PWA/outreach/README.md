# Cold Outreach - standalone UW Partner PWA

**Launch:** https://aqcroft.github.io/Appointment_Companion/PWA/outreach/

The Outreach tool has its own independently installable PWA identity, icon and service worker. It is hosted as a separate application path alongside Appointment Companion; it is **not a separate GitHub repository** yet.

## Install on your phone
- Android (Chrome): open the launch URL, then use the browser menu > **Install app** (or **Add to Home screen**, depending on browser).
- iPhone (Safari): open the URL, tap **Share** > **Add to Home Screen**.
- Open it from the new **Cold Outreach** ice-cube-and-UW icon, without launching Appointment Companion first.

## Existing CRM remains unchanged
- Uses the existing `Cold Outreach CRM v1` Google Sheet and Apps Script backend at `backend/Code.gs`.
- Connection URL and workspace key remain in the browser's localStorage at this GitHub Pages origin under `acOutreachBackendUrl` and `acOutreachBackendKey`. Moving to the *same URL* and installing on the *same device/browser* preserves them. A different browser or device requires configuring the connection there once.
- Data saves, screenshot uploads, pipeline refresh and ChatGPT retrieval need an internet connection.
- The service worker caches only the local HTML/manifest/icon. It never handles external CRM requests or credentials.

## Releases
- Version: **1.1.0** (14th Oct 2026).
- Release notes: [CHANGELOG.md](CHANGELOG.md).
- When updating the app, increment the semantic version displayed in the HTML About section, update this changelog, and increment the service worker cache version. Keep the manifest `id`, scope, `start_url`, and current localStorage keys stable to avoid creating a second installed app or losing a device's existing settings.
- Never widen the Cold Outreach service-worker scope outside `PWA/outreach/`; Appointment Companion must remain unaffected.
