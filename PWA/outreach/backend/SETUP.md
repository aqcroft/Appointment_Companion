# Cold Outreach CRM backend - one-time setup

1. Open the Google Sheet **Cold Outreach CRM v1**.
2. Extensions → Apps Script.
3. Replace the starter code with `PWA/outreach/backend/Code.gs`.
4. In Apps Script → Project Settings → Script Properties, add:
   - Property: `CRM_WORKSPACE_KEY`
   - Value: a long private passphrase of your choice.
5. Deploy → New deployment → Web app.
   - Execute as: Me
   - Who has access: Anyone
6. Copy the Web App URL.
7. Open the Relationship Follow-up tool → **CRM connection**.
8. Paste the Web App URL and the same workspace key, then tap **Test**.

The web app is deliberately hard-wired to the dedicated Cold Outreach CRM spreadsheet and its Drive folder. It does not browse the rest of Drive.

### Updating an existing installation (v1.3.0)
- Keep the existing spreadsheet, script properties and workspace key unchanged.
- Open the **current Apps Script project attached to Cold Outreach CRM v1** and compare its current `Code.gs` with this repository copy before replacing anything. GitHub does not automatically deploy Apps Script code.
- Save a backup/version of the current script, then apply this version of `Code.gs` to that same project.
- **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.** Updating the existing web app preserves its `/exec` URL and the saved PWA connection settings. Simply saving the code or merging GitHub will not update the live Apps Script deployment.
- Confirm the existing functions still work (health, pipeline, capture, drafts), then test `getProspectRecord` and `updateProspectRecord` on a test prospect. Do not change existing rows or delete Drive screenshots as part of deployment.

Current supported actions:
- health
- saveProspect
- addHistory
- screenshot upload into each prospect folder
- update last-contact / next follow-up date
- getProspectRecord (full context, evidence and chronological history)
- updateProspectRecord (notes, status, follow-up date, next action)
- updateDraft, addEvidence, markAction, getProspectOutput
