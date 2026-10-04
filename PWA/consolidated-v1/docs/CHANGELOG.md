# Appointment Companion changelog

## v2.45.12 - 4th October 2026

- Isolated customer summary/share cards from the Partner/editor application stack.
- A #d= customer share now skips Cloud, Partner profile, local persistence, specialist navigation and release scripts that are unnecessary for the customer-facing card.
- Added shared-view interaction hardening so the Breakdown accordions, CTA link and any customer-side meal-deal control retain pointer interaction.
- Any non-card modal overlays are explicitly neutralised when a shared customer card boots.
- Kept the existing share-card design and payload format unchanged.
- Applied master v2.45.12 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.11 - 4th October 2026

- Moved Boiler Cover selection into the main service selector and removed the redundant visible toggle from the Boiler Cover card.
- Kept Boiler Cover homeowner-only and preserved save/restore compatibility through its existing hidden state field.
- Moved the full canonical Energy usage experience behind the Energy cog, including annual electricity usage, annual gas usage, Low / Medium / High estimates, electricity profile and peak/off-peak controls.
- Renamed the cog purpose and canonical section to Energy usage.
- Moved Existing Customer Referral and National League Referral toggles directly below the customer name and above Homeowner / Tenant.
- Restored the customer journey overview at the top with a compact row of the three most recent profiles.
- Recent profile chips show shadowed/active service and specialist-tool indicators.
- Updated the Cloud customer list to understand both legacy summaries and newer canonical ui_state summaries, restoring service icons that could previously appear lost.
- Added Should I Fix (📌) alongside EV (🚙) as a visible specialist-tool usage indicator in the current profile, recent profiles and Cloud customer list.
- Expanded the recent-profile view to retain up to 12 recent profiles before the existing View all Cloud customers option.
- Applied master v2.45.11 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.10 - 4th October 2026

- Hid the entire advanced Energy area from the normal appointment flow. A discreet cog now reveals it only when deliberately needed.
- Moved annual energy usage inside the hidden Energy details area so no usage prompt appears during a standard appointment.
- Kept complex billing/tariff options and manual E7/EV/solar adjustment behind further progressive controls inside Energy details.
- Moved the Broadband 6 months free option into the UW column, immediately below the UW monthly cost and above Whole Home Wi-Fi.
- Renamed Home Cover to Boiler Cover throughout the active appointment experience.
- Retired the 3 months free Boiler Cover offer from all new appointments and new shares.
- Retained legacy shared-link understanding so previously-sent links from the old Boiler Cover offer still render safely.
- Applied master v2.45.10 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.9 - 4th October 2026

- Simplified the Main Companion around progressive disclosure so the normal appointment only shows essential inputs.
- Energy now leads with the Current / UW comparison, while usage, split billing, annual-bill mode and manual energy adjustments live inside collapsed Energy details.
- Energy usage is hidden by default in its own optional accordion.
- Cashback keeps the Average assumption by default while Low / Average / High choices and spending assumptions remain hidden until opened.
- Removed Income Protector from the appointment flow.
- Reworked Home Cover into a Current / UW comparison, with the UW monthly price shown automatically and the current monthly cost entered only when Home Cover is included.
- Home Cover remains homeowner-only and existing shared links remain compatible.
- Applied master v2.45.9 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.8 - 4th October 2026

- Applied the improved side-by-side two-column principle to Main Appointment Companion.
- Energy and Broadband now keep Current and UW side by side on phone-sized screens instead of stacking vertically.
- Within narrow Current/UW columns, secondary fields such as exit fees stack vertically to preserve usable input sizes.
- Each Mobile SIM now uses a Current / UW mini-comparison, keeping present cost and UW plan visually aligned.
- Manual adjustments now use matching Current / UW columns.
- Non-comparison inputs such as customer details, energy usage and notes remain full width.
- Applied master v2.45.8 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.7 - 4th October 2026

- Parked automatic onboarding so it no longer opens on normal Companion startup or returns after profile editing.
- Removed the Setup / onboarding action from Settings.
- Added direct 👤 My profile access to the main Companion menu for every Partner.
- Partner profiles remain Cloud-backed and editable by the logged-in Partner.
- Updated the Admin login message to reflect the simpler login-and-use flow.
- Kept the separate 🔐 Admin area for Adrian's central Partner management.
- Applied the v2.45.7 master release across Main Companion, EV, Should I Fix and Admin.

## v2.45.6 - 4th October 2026

- Established the displayed version as the master Appointment Companion suite version.
- Main Companion, EV Companion, Should I Fix and Companion Admin now all identify as v2.45.6.
- Updated specialist wrapper cache tokens and shared toolbar version so navigating between tools no longer appears to move between different releases.
- Future current-suite releases should advance the same master version across all current Appointment Companion tools.

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
