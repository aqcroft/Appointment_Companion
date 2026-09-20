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

Current supported actions:
- health
- saveProspect
- addHistory
- screenshot upload into each prospect folder
- update last-contact / next follow-up date
