# Repository working practices

## Preview-first changes for Appointment Companion

When a user asks to experiment with changes or preview a new feature:

1. Create or reuse a feature branch for the proposed source-code changes. Leave the production page, calculator and profile flows on `main` unchanged until approved.
2. Build the requested change on that branch and update the relevant in-app version, concise About/changelog details and PWA cache/version references as applicable.
3. A GitHub branch is NOT automatically a hosted web preview. This repository's current GitHub Pages publication uses `main`. To provide a working phone-friendly preview, publish a **separate, clearly marked, temporary preview route** under `PWA/consolidated-v1/` on `main`, with versioned **copies** of all changed JS/CSS/HTML dependencies. Serve the preview from the same `https://aqcroft.github.io/Appointment_Companion/` origin; do not use raw.githack.com/rawcdn.githack.com.
4. A preview must be visibly labelled PREVIEW, use `?local=1` when supported, not register or overwrite a production service worker, and not change production tool routes or live data. Use test customer details for previewing; because Pages shares an origin with the live app, never assume local browser storage is isolated.
5. Provide the exact **rendered browser URL** as well as the draft pull request. Verify the paths and script references exist; do not confuse GitHub's branch file viewer with a website.
6. Keep the pull request in draft until reviewed. Record preview/test details and limitations transparently. Do not claim browser testing if only static checks have run.
7. After the user approves a merge into `main`, separately delete the temporary preview folder and its preview-only files. Do not leave endless obsolete previews.
8. Preserve calculated accuracy: compare consistent tariffs, region, services, dates, usage and units; never fabricate unavailable costs.

The first dedicated example is:
- Feature branch: `feature/ev-tradeoff-fuel-comparison-20261008`
- Temporary Pages route: `PWA/consolidated-v1/ev-preview-v2473/`
- Review PR: `#20`

## Version control and release notes

Every user-visible code or behaviour change must increment the in-app semantic version (patch for fixes/polish; minor for new functionality; major only when appropriate). Update the concise in-app release notes, any loading/cache tokens needed for the new assets and associated tests in the same change. Avoid mutating customer profile state from a display-only enhancement.
