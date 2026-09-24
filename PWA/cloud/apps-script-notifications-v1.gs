/* Appointment Companion Cloud - Partner notification preferences v1

   Add this file to the existing Appointment Companion Cloud Apps Script project.

   In doPost(e), immediately after parsing `action` and `body`, add:

     const notificationResponse = handlePartnerNotificationAction_(action, body);
     if (notificationResponse) return json_(notificationResponse);

   Then deploy a new version of the existing Web App.

   This helper never returns or exposes workspace_key/password values.
*/

const PARTNER_NOTIFICATION_HEADERS_ = [
  'notification_email',
  'tariff_email_opt_in',
  'tariff_push_opt_in',
  'notification_permission',
  'notification_updated_at'
];

function handlePartnerNotificationAction_(action, body) {
  if (action !== 'getNotificationPreferences' && action !== 'setNotificationPreferences') return null;

  const partner = requirePartner_(body);
  const sheet = ensurePartnerNotificationHeaders_();
  const row = findPartnerNotificationRow_(sheet, partner.partner_id);
  if (!row) throw new Error('Partner profile was not found.');

  if (action === 'getNotificationPreferences') {
    return { ok: true, preferences: partnerNotificationPreferences_(row.object) };
  }

  const prefs = body && body.preferences && typeof body.preferences === 'object'
    ? body.preferences
    : {};

  const next = {
    notification_email: cleanNotificationEmail_(prefs.notification_email || row.object.notification_email || row.object.email),
    tariff_email_opt_in: boolCell_(prefs.tariff_email_opt_in),
    tariff_push_opt_in: boolCell_(prefs.tariff_push_opt_in),
    notification_permission: normaliseNotificationPermission_(prefs.notification_permission),
    notification_updated_at: new Date().toISOString()
  };

  updatePartnerNotificationRow_(sheet, row.rowNumber, next);
  const refreshed = findPartnerNotificationRow_(sheet, partner.partner_id);

  return { ok: true, preferences: partnerNotificationPreferences_(refreshed.object) };
}

function ensurePartnerNotificationHeaders_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Partners');
  if (!sheet) throw new Error('Missing Partners sheet.');

  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(String);
  const missing = PARTNER_NOTIFICATION_HEADERS_.filter(h => existing.indexOf(h) < 0);

  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function findPartnerNotificationRow_(sheet, partnerId) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const idCol = headers.indexOf('partner_id');
  if (idCol < 0) throw new Error('Partners sheet has no partner_id column.');

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idCol] || '') === String(partnerId || '')) {
      const object = {};
      headers.forEach((h, j) => object[h] = values[i][j]);
      return { rowNumber: i + 2, object: object };
    }
  }
  return null;
}

function updatePartnerNotificationRow_(sheet, rowNumber, patch) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  Object.keys(patch).forEach(key => {
    const col = headers.indexOf(key);
    if (col >= 0) sheet.getRange(rowNumber, col + 1).setValue(patch[key]);
  });
}

function partnerNotificationPreferences_(row) {
  return {
    notification_email: String(row.notification_email || row.email || '').trim(),
    tariff_email_opt_in: asBool_(row.tariff_email_opt_in),
    tariff_push_opt_in: asBool_(row.tariff_push_opt_in),
    notification_permission: normaliseNotificationPermission_(row.notification_permission),
    notification_updated_at: String(row.notification_updated_at || '')
  };
}

function normaliseNotificationPermission_(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  return ['granted','denied','default','unsupported'].indexOf(v) >= 0 ? v : 'default';
}

function cleanNotificationEmail_(value) {
  return String(value == null ? '' : value).trim().slice(0, 200);
}

function boolCell_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
}

function asBool_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
}
