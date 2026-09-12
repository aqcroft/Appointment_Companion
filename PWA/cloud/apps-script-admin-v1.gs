/* Appointment Companion Cloud - Admin provisioning v1

   Add this file to the existing Appointment Companion Apps Script project.

   In doPost(e), immediately after parsing `action` and `body`, add:

     const adminResponse = handleCompanionAdminAction_(action, body);
     if (adminResponse) return json_(adminResponse);

   Then set Script Property:
     COMPANION_ADMIN_PASSWORD = <Adrian's admin password>

   Deploy a new Web App version.

   Security:
   - the admin password is never stored in the browser by this helper;
   - it is compared server-side against Script Properties;
   - Partner passwords are returned once to the caller so they can be sent to
     the new Partner, but are stored in the existing workspace_key field because
     that is what Companion authentication already uses.
*/

function handleCompanionAdminAction_(action, body) {
  if (action !== 'adminPing' && action !== 'adminProvisionPartner') return null;

  requireCompanionAdmin_(body);

  if (action === 'adminPing') {
    return { ok: true, admin: true };
  }

  const input = body && body.partner && typeof body.partner === 'object' ? body.partner : {};
  const name = cleanAdminText_(input.name || input.partner_name, 120);
  const mobile = cleanAdminText_(input.mobile, 40);
  const email = cleanAdminText_(input.email, 160);
  let loginId = cleanAdminLogin_(input.companion_login_id || input.partner_id);

  if (!name) throw new Error('Partner name is required.');
  if (!loginId) loginId = makeAdminLogin_(name);

  const password = makeAdminPassword_();
  const sheet = ensureAdminPartnersSheet_();
  const rows = sheetToAdminObjects_(sheet);
  if (rows.some(r => String(r.partner_id || '').toLowerCase() === loginId.toLowerCase())) {
    throw new Error('That Companion Login ID already exists. Choose another.');
  }

  const record = {
    partner_id: loginId,
    workspace_key: password,
    partner_name: name,
    name: name,
    mobile: mobile,
    email: email,
    status: 'active',
    created_at: new Date().toISOString()
  };

  appendAdminObject_(sheet, record);

  return {
    ok: true,
    partner: {
      companion_login_id: loginId,
      password: password,
      name: name,
      mobile: mobile,
      email: email
    }
  };
}

function requireCompanionAdmin_(body) {
  const supplied = String(body && body.admin_password || '');
  const expected = String(PropertiesService.getScriptProperties().getProperty('COMPANION_ADMIN_PASSWORD') || '');
  if (!expected) throw new Error('Companion admin password has not been configured.');
  if (!supplied || supplied !== expected) throw new Error('Admin password is incorrect.');
}

function ensureAdminPartnersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Partners');
  const required = ['partner_id','workspace_key','partner_name','name','mobile','email','status','created_at'];

  if (!sheet) {
    sheet = ss.insertSheet('Partners');
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(String);
  const missing = required.filter(h => existing.indexOf(h) < 0);
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function sheetToAdminObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values.map(row => {
    const out = {};
    headers.forEach((h, i) => out[h] = row[i]);
    return out;
  });
}

function appendAdminObject_(sheet, object) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const row = headers.map(h => Object.prototype.hasOwnProperty.call(object, h) ? object[h] : '');
  sheet.appendRow(row);
}

function cleanAdminText_(value, max) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').slice(0, max || 160);
}

function cleanAdminLogin_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 60);
}

function makeAdminLogin_(name) {
  const base = String(name || 'partner')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 40) || 'partner';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return base + '.' + suffix;
}

function makeAdminPassword_() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return out;
}
