/* Appointment Companion Cloud - Presence v1

   Add this as a NEW Apps Script file in the existing Appointment Companion Cloud
   project. It deliberately does not alter the existing Partners/Customers/Shares
   schema. The Presence sheet is created automatically on first use.

   ONE small edit is required in the existing doPost(e), immediately after:

     if (!action) throw new Error('Missing action.');

   add:

     const presenceResponse = handlePresenceAction_(action, body);
     if (presenceResponse) return json_(presenceResponse);

   Then deploy a new version of the existing Web App.
*/

const PRESENCE_SHEET_NAME_ = 'Presence';
const PRESENCE_HEADERS_ = [
  'presence_id',
  'customer_id',
  'partner_id',
  'device_id',
  'device_name',
  'session_id',
  'tool_id',
  'opened_at',
  'last_seen_at',
  'closed_at'
];
const PRESENCE_ACTIVE_MS_ = 120000;
const PRESENCE_PRUNE_MS_ = 7 * 24 * 60 * 60 * 1000;

function handlePresenceAction_(action, body) {
  if (
    action !== 'touchPresence' &&
    action !== 'listPresence' &&
    action !== 'leavePresence'
  ) {
    return null;
  }

  const partner = requirePartner_(body);

  if (action === 'touchPresence') {
    return {
      ok: true,
      presence: touchPresence_(partner.partner_id, body)
    };
  }

  if (action === 'listPresence') {
    return {
      ok: true,
      presences: listPresence_(
        partner.partner_id,
        String(body.customer_id || '')
      )
    };
  }

  return {
    ok: true,
    presence: leavePresence_(partner.partner_id, body)
  };
}

function ensurePresenceSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRESENCE_SHEET_NAME_);

  if (!sheet) {
    sheet = ss.insertSheet(PRESENCE_SHEET_NAME_);
    sheet
      .getRange(1, 1, 1, PRESENCE_HEADERS_.length)
      .setValues([PRESENCE_HEADERS_]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const current = sheet.getLastColumn()
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    : [];

  const missing = PRESENCE_HEADERS_.filter(h => current.indexOf(h) < 0);
  if (missing.length) {
    throw new Error(
      'Presence sheet exists but is missing headers: ' + missing.join(', ')
    );
  }

  return sheet;
}

function touchPresence_(partnerId, body) {
  const customerId = String(body.customer_id || '').trim();
  const deviceId = cleanText_(body.device_id, 160);
  const deviceName = cleanText_(body.device_name, 120);
  const sessionId = cleanText_(body.session_id, 180);
  const toolId = cleanText_(body.tool_id, 80) || 'appointment';

  if (!customerId) throw new Error('Missing customer_id.');
  if (!deviceId || !sessionId) throw new Error('Presence device/session identity missing.');

  // Confirms the authenticated Partner owns the customer.
  getCustomer_(partnerId, customerId);

  const sheet = ensurePresenceSheet_();
  prunePresence_(sheet);
  const rows = sheetToObjects_(sheet);
  const now = nowIso_();

  const existing = rows.find(r =>
    String(r.partner_id) === partnerId &&
    String(r.customer_id) === customerId &&
    String(r.session_id) === sessionId
  );

  const record = {
    presence_id: existing ? String(existing.presence_id || '') : makeId_('pr'),
    customer_id: customerId,
    partner_id: partnerId,
    device_id: deviceId,
    device_name: deviceName || 'Device',
    session_id: sessionId,
    tool_id: toolId,
    opened_at: existing ? String(existing.opened_at || now) : now,
    last_seen_at: now,
    closed_at: ''
  };

  if (existing) updateObjectRow_(sheet, existing.__row, record);
  else appendObject_(sheet, record);

  return presenceForPartner_(record);
}

function listPresence_(partnerId, customerId) {
  customerId = String(customerId || '').trim();
  if (!customerId) throw new Error('Missing customer_id.');

  getCustomer_(partnerId, customerId);

  const sheet = ensurePresenceSheet_();
  prunePresence_(sheet);
  const cutoff = Date.now() - PRESENCE_ACTIVE_MS_;

  return sheetToObjects_(sheet)
    .filter(r =>
      String(r.partner_id) === partnerId &&
      String(r.customer_id) === customerId &&
      !String(r.closed_at || '').trim() &&
      safeTime_(r.last_seen_at) >= cutoff
    )
    .map(presenceForPartner_)
    .sort((a, b) =>
      String(b.last_seen_at).localeCompare(String(a.last_seen_at))
    );
}

function leavePresence_(partnerId, body) {
  const customerId = String(body.customer_id || '').trim();
  const sessionId = cleanText_(body.session_id, 180);

  if (!customerId || !sessionId) {
    throw new Error('Missing customer_id or session_id.');
  }

  getCustomer_(partnerId, customerId);

  const sheet = ensurePresenceSheet_();
  const rows = sheetToObjects_(sheet);
  const existing = rows.find(r =>
    String(r.partner_id) === partnerId &&
    String(r.customer_id) === customerId &&
    String(r.session_id) === sessionId
  );

  if (!existing) return null;

  const now = nowIso_();
  const record = {
    presence_id: String(existing.presence_id || ''),
    customer_id: customerId,
    partner_id: partnerId,
    device_id: String(existing.device_id || ''),
    device_name: String(existing.device_name || ''),
    session_id: sessionId,
    tool_id: String(existing.tool_id || ''),
    opened_at: String(existing.opened_at || ''),
    last_seen_at: now,
    closed_at: now
  };

  updateObjectRow_(sheet, existing.__row, record);
  return presenceForPartner_(record);
}

function presenceForPartner_(r) {
  return {
    presence_id: String(r.presence_id || ''),
    customer_id: String(r.customer_id || ''),
    device_id: String(r.device_id || ''),
    device_name: String(r.device_name || ''),
    session_id: String(r.session_id || ''),
    tool_id: String(r.tool_id || ''),
    opened_at: String(r.opened_at || ''),
    last_seen_at: String(r.last_seen_at || ''),
    closed_at: String(r.closed_at || '')
  };
}

function safeTime_(v) {
  const t = new Date(String(v || '')).getTime();
  return isNaN(t) ? 0 : t;
}

function prunePresence_(sheet) {
  const cutoff = Date.now() - PRESENCE_PRUNE_MS_;
  const rows = sheetToObjects_(sheet);
  const toDelete = rows
    .filter(r => safeTime_(r.last_seen_at) && safeTime_(r.last_seen_at) < cutoff)
    .map(r => r.__row)
    .sort((a, b) => b - a);

  // Keep this deliberately conservative so a busy sheet cannot spend too long
  // pruning in one request.
  toDelete.slice(0, 50).forEach(row => sheet.deleteRow(row));
}
