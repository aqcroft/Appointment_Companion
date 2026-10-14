# Link the live Cold Outreach Apps Script to GitHub (one-time setup)

**Goal:** make GitHub's `PWA/outreach/backend/Code.gs` the source of truth and use GitHub Actions to update the **existing** Google Apps Script deployment after approved changes. No routine copy/paste into the Apps Script editor.

This is a separate setup from the installable PWA. Until the steps below are completed, the existing CRM, Apps Script web app, deployment and GitHub Pages app all continue unchanged.

## 1. Identify the *existing* project

Open **Cold Outreach CRM v1** Google Sheet → **Extensions → Apps Script**.

- Send the **Apps Script editor URL** (`https://script.google.com/home/projects/.../edit`) to the developer. This URL is **not** a credential.
- In **Project Settings** copy the **Script ID**. The *Sheet ID* is different - do not use the CRM spreadsheet ID in its place.
- In **Deploy → Manage deployments**, select the currently active Cold Outreach **Web app** and copy its **Deployment ID**. It is important to reuse the active deployment, not create a new one.
- Confirm this is the Apps Script project that is actually serving the PWA's saved `/exec` backend connection.
- Back up the live Apps Script project before initial synchronisation. Check for manual changes newer than GitHub's `Code.gs`. Do not blindly overwrite them.

## 2. Enable the Google Apps Script API and authorise clasp

Google's own CLI, `clasp`, manages Apps Script projects via the official Apps Script API: https://developers.google.com/apps-script/guides/clasp

1. Open https://script.google.com/home/usersettings and turn on **Google Apps Script API** for the account owning the project.
2. On a trusted computer with Node.js 22+, install `clasp`: `npm install -g @google/clasp@3.4.1`.
3. Run `clasp login` and authorise the account that owns the existing Cold Outreach Apps Script project.
4. This creates a local `~/.clasprc.json` (on Windows, the equivalent file in the user's home directory). It contains OAuth credentials including a refresh token.
5. In the existing GitHub repository **Settings → Secrets and variables → Actions → Secrets**, create **repository secret** `OUTREACH_CLASPRC_JSON` containing that file's *entire JSON contents*. **Never paste it into ChatGPT, issues, screenshots, source files or a commit.**
6. Delete any incidental copies used when transferring this credential to GitHub, and protect your Google account and GitHub repository with two-factor authentication.

**Important:** A `clasp` refresh token can give significant Apps Script access. GitHub Actions secrets do not make untrusted commits safe. Only trusted changes to `main` should ever run an authorised deployment workflow. Remove the secret and revoke its Google OAuth grant if access should be disabled.

## 3. Identify the project and preserve the web-app URL

In the repository, under **Settings → Secrets and variables → Actions → Variables**, create:

| Variable | Value |
| --- | --- |
| `OUTREACH_SCRIPT_ID` | Script ID from the **existing Apps Script project** |
| `OUTREACH_DEPLOYMENT_ID` | Deployment ID of the **current live web app** |
| `OUTREACH_DEPLOY_AUTOMATIC` | `false` initially; enable only after a successful test |

These are *not* the private workspace key and are not the Google Sheets/Drive IDs. **Never change or share** the existing `CRM_WORKSPACE_KEY` script property.

The workflow verifies that the deployment belongs to the identified script, pulls *all* of the live project's files, preserves the live manifest/other files, and updates only its `Code` script file before pushing. It then targets the **existing deployment ID** so that the PWA's backend `/exec` URL remains the same.

## 4. Test safely before enabling automatic deployment

1. Merge the reviewed GitHub Actions workflow into `main`.
2. Open the repo's **Actions** tab → **Cold Outreach - deploy existing Apps Script backend** → **Run workflow** with **publish = false**. This is a read-only preflight: it verifies the connection and reads the live project and deployment metadata **without writing any changes**.
3. Review whether the live `Code.gs` and the GitHub source have diverged; reconcile anything important before publishing.
4. Once verified, explicitly run again with **publish = true**. This is an intentional production update. The workflow updates the **existing** deployed web app.
5. Test health, Pipeline, full prospect record, screenshot retrieval and a safe CRM edit in the PWA.
6. If all tests pass, change GitHub variable `OUTREACH_DEPLOY_AUTOMATIC` to `true`. Thereafter an approved change to `PWA/outreach/backend/Code.gs` that lands on `main` triggers deployment automatically.

The workflow is deliberately **fail-closed**: without the exact IDs, secret or automatic-deployment opt-in it cannot alter the live script. Main-branch changes are the deployment boundary, not unmerged branches or draft pull requests.

## Operating routine once linked

- Ask for a change here, with expected behaviour.
- Make the change in GitHub, increment the relevant version/changelog, run checks, review the diff.
- Merge the approved code into `main`. If automatic deployment is enabled, GitHub Actions updates the existing Apps Script backend. Otherwise use the explicit manual publish action.
- **Confirm the workflow result and re-test live functionality before calling the change deployed.** A GitHub commit alone is not proof that the backend is live.

## Troubleshooting

- A green GitHub code commit with no Actions deployment usually means `OUTREACH_DEPLOY_AUTOMATIC` remains `false` or the workflow has not been merged.
- An authentication failure may require `clasp login` again and updating **only** the GitHub secret.
- A Script ID error means the wrong project was linked; the script's ID is different from the CRM Google Sheet ID.
- A missing deployment ID or mismatch fails before any remote changes.
- If GitHub succeeds but the PWA still serves older responses, check the existing deployment version and the PWA's saved `/exec` URL; do not make a new web-app deployment without a migration plan.
