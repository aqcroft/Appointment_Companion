# Cold Outreach - standalone UW Partner PWA

**Launch:** https://aqcroft.github.io/Appointment_Companion/PWA/outreach/

The Outreach tool has its own independently installable PWA identity, icon and service worker. It is hosted as a separate application path alongside Appointment Companion; it is **not a separate GitHub repository** yet.

## Install on your phone
- If a purple **Install app** button appears inside the app beneath the tabs, use that first. It launches Chrome's native prompt directly and may bypass its overlapping-app menu problem. It only appears when Chrome actually offers an install prompt.
- Android (Chrome): open the launch URL, then use the browser menu > **Install app** (or **Add to Home screen**, depending on browser).
- iPhone (Safari): open the URL, tap **Share** > **Add to Home Screen**.
- Open it from the new **Cold Outreach** ice-cube-and-UW icon, without launching Appointment Companion first.

## Existing CRM remains unchanged
- Uses the existing `Cold Outreach CRM v1` Google Sheet and Apps Script backend at `backend/Code.gs`.
- Connection URL and workspace key remain in the browser's localStorage at this GitHub Pages origin under `acOutreachBackendUrl` and `acOutreachBackendKey`. Moving to the *same URL* and installing on the *same device/browser* preserves them. A different browser or device requires configuring the connection there once.
- Data saves, screenshot uploads, pipeline refresh and ChatGPT retrieval need an internet connection.
- The service worker caches only the local HTML/manifest/icon. It never handles external CRM requests or credentials.

## Prospect records (v1.3.0)
- Pipeline and Follow-ups entries open the same complete prospect record, with editable next steps, notes and saved drafts.
- The **v1.3.0 Apps Script backend must also be deployed** for full history, screenshot links and record edits. If the web app still runs an older deployment, the interface keeps a read-only summary with a clear upgrade message.
- Update the **existing** Apps Script deployment by selecting **Manage deployments → Edit → New version → Deploy**, rather than creating a new URL. The GitHub copy of `backend/Code.gs` is not itself the live web app.
- The live PWA is unchanged until this branch is merged and the cloud backend is updated. Existing CRM rows, Drive files, workspace key, manifest ID and install scope stay intact.

## Releases
- Version: **1.3.0** (14th Oct 2026).
- Release notes: [CHANGELOG.md](CHANGELOG.md).
- When updating the app, increment the semantic version displayed in the HTML About section, update this changelog, and increment the service worker cache version. Keep the manifest `id`, scope, `start_url`, and current localStorage keys stable to avoid creating a second installed app or losing a device's existing settings.
- Never widen the Cold Outreach service-worker scope outside `PWA/outreach/`; Appointment Companion must remain unaffected.
