# Link the live Cold Outreach Apps Script to GitHub (one-time setup)

**Goal:** make GitHub's `PWA/outreach/backend/Code.gs` the source of truth and use GitHub Actions to update the **existing** Google Apps Script deployment after approved changes. No routine copy/paste into the Apps Script editor.

This is a separate setup from the installable PWA. Until the steps below are completed, the existing CRM, Apps Script web app, deployment and GitHub Pages app all continue unchanged.

## 1. Identify the *existing* project

Open **Cold Outreach CRM v1** Google Sheet → **Extensions → Apps Script**.

- The **Script ID** is already preconfigured from the supplied Apps Script editor URL, so you do not need to enter it again.
- The **existing web app Deployment ID** is also preconfigured from the value you supplied. No need to copy it again or create a GitHub variable for it.
- After Google authorisation, the first read-only preflight will check whether this deployment really belongs to that script project. Nothing is deployed until that verification succeeds.
- Confirm this is the Apps Script project that is actually serving the PWA's saved `/exec` backend connection.
- Back up the live Apps Script project before initial synchronisation. Check for manual changes newer than GitHub's `Code.gs`. Do not blindly overwrite them.

## 2. Authorise the *sandbox* account without changing your main Google login

**Cold Outreach runs on a different Google account from PRISM/Appointment Companion Cloud.** Your existing Node.js and clasp installations can be reused, but **the existing main-account OAuth token must NOT be used** for Cold Outreach unless that Google account genuinely has the necessary script permissions.

1. Make sure the [Apps Script API setting](https://script.google.com/home/usersettings) is enabled **while signed in to the sandbox Google account**.
2. In PowerShell on your existing Windows computer, run:

   ```powershell
   clasp login --user cold-outreach-sandbox
   ```

   This creates a **named** clasp authorisation. When the Google sign-in window opens, choose the **sandbox Google account**, not your main account. The existing default PRISM/Companion login stays available separately.

3. Copy **only the named sandbox credentials** to the clipboard. Run this PowerShell block in the same terminal; it doesn't print the token or overwrite your `.clasprc.json`:

   ```powershell
   $auth = Get-Content "$HOME\.clasprc.json" -Raw | ConvertFrom-Json
   if (-not $auth.tokens.'cold-outreach-sandbox') { throw 'Sandbox clasp login was not found - check the selected Google account.' }
   @{ tokens = @{ 'cold-outreach-sandbox' = $auth.tokens.'cold-outreach-sandbox' } } | ConvertTo-Json -Depth 20 -Compress | Set-Clipboard
   ```

4. Go to [GitHub repository Actions secrets](https://github.com/aqcroft/Appointment_Companion/settings/secrets/actions), click **New repository secret**:
   - Name: `OUTREACH_CLASPRC_JSON`
   - Secret: paste the clipboard contents directly into GitHub and save.
5. **Never paste the credential, clipboard contents, OAuth refresh token or `.clasprc.json` here, in a GitHub issue, or into code.** GitHub's workflow now rejects credentials without the specifically named sandbox profile and rejects an auth file that contains additional named accounts.

Google's own `clasp` CLI supports multiple credentials via `--user` and stores them in a single local auth file. The extract command above copies *only* the sandbox's named credentials, limiting the exposure of your main-account token.

If `clasp` is not recognised, your previous install may not be on this computer. If it is recognised but Google refuses the sandbox login, check that the Apps Script API was enabled in the **sandbox account**, not just your main account.

**Security note:** the sandbox token may still manage multiple Apps Script projects accessible to that sandbox Google account. Treat it as sensitive, protect GitHub account access, and review workflow changes before enabling deployments.

## 3. Existing deployment - identifiers are already configured

The **Script ID and current Web App Deployment ID** are already present in the GitHub workflow. No further ID copying, GitHub deployment variable or new web-app URL is required.

The only optional GitHub Actions variable is `OUTREACH_DEPLOY_AUTOMATIC`:

- Leave it **unset or `false`** initially. This disables deployment-on-push.
- Set it to `true` **only after** the first manually authorised deployment has been tested successfully.

The `CRM_WORKSPACE_KEY` script property is separate and should not be copied into GitHub or this chat. The workflow pulls the project's other code and manifest, replaces only the main `Code` script file, and updates the **existing** deployment ID rather than creating another published URL.

## 4. Test safely before enabling automatic deployment

1. Merge the reviewed GitHub Actions workflow into `main`.
2. Open the repo's **Actions** tab → **Cold Outreach - deploy existing Apps Script backend** → **Run workflow** with **publish = false**. This is a read-only preflight: it verifies the connection and reads the live project and deployment metadata **without writing any changes**.
3. Review whether the live `Code.gs` and the GitHub source have diverged; reconcile anything important before publishing.
4. Once verified, explicitly run again with **publish = true**. This is an intentional production update. The workflow updates the **existing** deployed web app.
5. Test health, Pipeline, full prospect record, screenshot retrieval and a safe CRM edit in the PWA.
6. If all tests pass, change GitHub variable `OUTREACH_DEPLOY_AUTOMATIC` to `true`. Thereafter an approved change to `PWA/outreach/backend/Code.gs` that lands on `main` triggers deployment automatically.

The workflow is deliberately **fail-closed**: without the Google authorisation secret, it cannot access or alter the script. The first manual preflight checks the exact IDs before any deployment; automatic deployment requires a separate opt-in. Main-branch changes are the deployment boundary, not unmerged branches or draft pull requests.

## Operating routine once linked

- Ask for a change here, with expected behaviour.
- Make the change in GitHub, increment the relevant version/changelog, run checks, review the diff.
- Merge the approved code into `main`. If automatic deployment is enabled, GitHub Actions updates the existing Apps Script backend. Otherwise use the explicit manual publish action.
- **Confirm the workflow result and re-test live functionality before calling the change deployed.** A GitHub commit alone is not proof that the backend is live.

## Troubleshooting

- A green GitHub code commit with no Actions deployment usually means `OUTREACH_DEPLOY_AUTOMATIC` remains `false` or the workflow has not been merged.
- An authentication failure may require `clasp login` again and updating **only** the GitHub secret.
- A Script ID error means the wrong project was linked; the script's ID is different from the CRM Google Sheet ID.
- A mismatch between the supplied deployment ID and the existing script project fails before any remote changes.
- If GitHub succeeds but the PWA still serves older responses, check the existing deployment version and the PWA's saved `/exec` URL; do not make a new web-app deployment without a migration plan.
