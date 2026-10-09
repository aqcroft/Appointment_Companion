# Appointment Companion changelog

## v2.55.0 - 9th October 2026 (draft preview)

- Added a compact usage-source selector for customers who already own an EV.
- Source defaults to **Estimated Annual Consumption (kWh)** from an energy bill, with one alternative: **Figures from agreed sources**. Older alternative source values map to the latter.
- The opening modal addresses the Partner: **Does the potential customer already own an EV?** Its choices are phrased in the third person.
- Source choice is independent of the EV tariff / Economy 7 selector and does not change costs.
- Portable and Cloud shares now describe the annual figures accurately and preserve the selected source.
- Linked customer EV profiles persist the source in their specialist state.
- Legacy shares missing source metadata default to the supplier bill estimate.
- Simplified the personalised EV welcome: car icon, retained the three annual usage cards for existing owners, removed the lengthy explanation and the normal tariff-check line, and tightened the two service/VAT bullets.
- Updated the dynamic basket heading to **Estimated costs based on [selected services] in the UW basket**.
- The EV script reference for the hero uses the existing working v2.54.3 file rather than the missing v2.54.4 asset.


## v2.54.4 - 9th October 2026

- Put day, night and total icons above their centred labels and kWh figures on shared EV welcome cards.
- Reformatted the UW service/basket and VAT notes as clear bullets; retained the live tariff check note.
- Changed the Cloud EV shared-button behaviour to show the calculator immediately and load the model and personalised assumptions behind a visible status.
- Added an explicit retry action for failed core or tariff loading, so customers are not trapped on an unresponsive welcome panel.
- Preserved the portable sharing route and all EV cost calculations unchanged.
- Incremented app and EV versions and updated the PWA cache and script references.


## v2.54.3 - 9th October 2026

- Reworked the EV shared welcome into a compact, teal, phone-friendly summary with an overnight/daytime/total usage split for meter-based shares.
- Restored essential assumption notes for estimated shares, covering mileage, household use, EV efficiency, home overnight usage and charging away from home.
- Changed cloud EV share opening to read the saved customer settings first, then start the EV engine from a working customer button.
- Added an explicit timeout, visible retry message and core-loaded/error events so a slow or failing cloud read does not leave a dead button.
- Left-aligned the second hero controls row to match the hero layout, without changing tariff calculations.
- Incremented the app and EV version, and refreshed script and PWA cache tokens.


## v2.46.3 - 4th October 2026

- Corrected the Should I Fix Tracker comparison for the 1st October cap and tariff change.
- October to December now uses the current live UW Tracker rates rather than a percentage relationship derived from the previous July to September cap.
- Future Tracker estimates now apply each Tracker 6 tier's contractual Direct Debit pence discounts to the modelled price-cap rates on an ex-VAT basis, then apply the correct VAT for that month.
- Corrected VAT display and calculations so electricity is 0% from 1st October 2026 to 31st March 2027 and returns to 5% from 1st April 2027; gas remains at 5%.
- Updated the Should I Fix cache token so installed copies load the corrected calculator immediately.
- Applied master v2.46.3 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.46.2 - 4th October 2026

- Saving an existing Partner profile now collapses the edit form automatically.
- After a successful save, Admin returns to the Partner list and shows a clear "<Partner> saved ✓" confirmation.
- New Partner creation still leaves the generated credential card visible so login details can be copied or sent before closing the form.
- Applied master v2.46.2 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.46.1 - 4th October 2026

- Partner photo selection now automatically centre-crops the selected image to a square before upload.
- The square image is resized to a sensible profile-photo size and converted to JPEG in the browser before being sent to Cloud.
- Added clear photo-upload stages in Admin: selected/cropping, uploading to Drive, success, or a precise failure message.
- Successful upload now explicitly tells Admin to tap Save changes so the returned Drive photo URL is persisted to the Partner profile.
- The Admin preview is now square so it better reflects the stored profile image.
- Applied master v2.46.1 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.46.0 - 4th October 2026

- Introduced UW Partner slug as the canonical Partner identity field.
- Admin suggests the slug automatically from First name + Surname, while allowing manual variations such as tyler.smith1.
- Customer join URL is derived as https://uw.partners/<slug>/join.
- Partner registration URL is derived as https://uw.partners/<slug>/partner/join.
- UW email defaults to <slug>@uw.partners and remains editable for exceptional cases.
- Admin previews both derived UW URLs beneath the single slug field.
- Renamed Website to Personal/business website (optional) to distinguish it from UW links.
- My profile now edits the UW Partner slug rather than a duplicate full join URL and shows the derived customer URL, Partner URL and email pattern.
- Cloud profile schema adds partner_slug and public profiles now return partner_slug plus partner_join.
- Existing profiles remain backward compatible: their slug can be derived from an existing customer join URL or UW email.
- Partner Earnings now prefers the canonical partner_join returned by Cloud.
- Applied master v2.46.0 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.16 - 4th October 2026

- Connected Partner Earnings to the shared Appointment Companion Partner-profile architecture.
- Appointment Companion now passes the logged-in Partner ID into the Partner Earnings Tool.
- Partner Earnings uses that Partner ID to load the Partner's public Cloud profile instead of relying on Adrian-specific hard-coded defaults.
- Partner Earnings now uses the logged-in Partner's name, photo, mobile/WhatsApp, email and booking link where available.
- The PET registration CTA is derived from the Partner's UW join slug as https://uw.partners/<slug>/partner/join.
- If a Partner profile cannot be loaded, PET no longer falls back to another Partner's personal details.
- Partner Earnings shared links retain the originating Partner ID so recipient copies remain branded to the correct Partner.
- Applied master v2.45.16 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.15 - 4th October 2026

- Renamed the Admin login field to Companion Login ID (UW Partner ID).
- New Partner creation now requires the UW Partner ID instead of silently auto-generating a generic Companion login.
- Added clear helper text instructing Admin to use the Partner's UW Partner ID.
- Applied master v2.45.15 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.14 - 4th October 2026

- Simplified Companion Admin so the existing Partner list is visible immediately after unlock.
- Collapsed the full Partner creation/edit form until Create Partner or Edit is selected.
- Reused the same form for new Partner creation and existing Partner editing.
- Split Admin name entry into First name and Surname while continuing to save a normal combined Partner name to Cloud.
- Automatically suggests a UW join slug in first.surname format as the name is entered.
- Keeps the join slug directly editable for variations such as first.surname1.
- Shows the full https://uw.partners/<slug>/join URL beneath the slug and saves that full URL to Cloud.
- Existing full UW join URLs are converted back to the editable slug when a Partner is opened for editing.
- Updated the password-reset confirmation to reflect the already-live backend.
- Applied master v2.45.14 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

## v2.45.13 - 4th October 2026

- Made the authenticated Cloud Partner profile the source of truth for Partner identity and shared-card branding.
- Fixed the legacy getPartner() behaviour that treated a partial profile as no profile at all and could make My profile appear completely blank.
- My profile now merges local and Cloud profile data, with Cloud winning over stale local cache values.
- Async Partner-profile hydration now populates the core name, UW sign-up link, town and strapline fields as well as mobile/email/photo/booking/website fields.
- Sharing no longer opens a first-run Partner setup/onboarding screen.
- A missing Partner name now gives a precise profile-loading message instead of opening setup.
- A missing CTA now asks for either a personalised basket link or a UW sign-up link, without pretending the Partner profile is missing.
- New Partner creation in Admin now requires a UW sign-up slug/link so newly-issued accounts are share-ready immediately.
- Applied master v2.45.13 across Main Companion, EV, Should I Fix, Admin and the shared toolbar.

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
