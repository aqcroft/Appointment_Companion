/* Appointment Companion Cloud - Admin + Partner profile v2

   Portable backend layer for v2.42 and future Companion versions.

   Add this file to the existing Appointment Companion Apps Script project.

   In doPost(e), immediately after parsing `action` and `body`, add:

     const adminResponse = handleCompanionAdminAction_(action, body);
     if (adminResponse) return json_(adminResponse);

   Then set Script Property:
     COMPANION_ADMIN_PASSWORD = <Adrian's admin password>

   Deploy a new Web App version.

   Security:
   - the admin password is compared server-side against Script Properties;
   - Partner passwords are returned when created/reset so Adrian can send them
     to the Partner, but follow the existing Companion authentication model and
     are stored in the Partners workspace_key field;
   - Partner profile actions authenticate through the existing requirePartner_()
     helper, so a Partner can only read/update their own profile;
   - getPublicPartnerProfile exposes only customer-facing Partner profile fields
     and never returns workspace_key or admin data.
*/

const COMPANION_PARTNER_HEADERS_ = [
  'partner_id',
  'workspace_key',
  'partner_name',
  'name',
  'mobile',
  'email',
  'partner_slug',
  'join',
  'town',
  'strap',
  'photo_url',
  'booking_url',
  'website_url',
  'status',
  'created_at',
  'updated_at',
  'notification_email',
  'tariff_email_opt_in',
  'tariff_push_opt_in',
  'notification_permission',
  'notification_updated_at'
];

function handleCompanionAdminAction_(action, body) {
  if (action === 'getPublicPartnerProfile') {
    return getPublicPartnerProfile_(body);
  }

  if (action === 'getPartnerProfile' || action === 'savePartnerProfile') {
    return handleCompanionPartnerProfileAction_(action, body);
  }

  const adminActions = [
    'adminPing',
    'adminProvisionPartner',
    'adminListPartners',
    'adminUpdatePartner',
    'adminGetPartnerLoginDetails',
    'adminResetPartnerPassword',
    'adminUploadPartnerPhoto'
  ];
  if (adminActions.indexOf(action) < 0) return null;

  requireCompanionAdmin_(body);

  if (action === 'adminPing') return { ok: true, admin: true };
  if (action === 'adminProvisionPartner') return adminProvisionPartner_(body);
  if (action === 'adminListPartners') return adminListPartners_();
  if (action === 'adminUpdatePartner') return adminUpdatePartner_(body);
  if (action === 'adminGetPartnerLoginDetails') return adminGetPartnerLoginDetails_(body);
  if (action === 'adminResetPartnerPassword') return adminResetPartnerPassword_(body);
  if (action === 'adminUploadPartnerPhoto') return adminUploadPartnerPhoto_(body);
  return null;
}

function getPublicPartnerProfile_(body) {
  const partnerId = cleanAdminLogin_(body && (body.partner_id || body.companion_login_id));
  if (!partnerId) throw new Error('Partner ID is required.');
  const sheet = ensureAdminPartnersSheet_();
  const row = findAdminPartner_(sheet, partnerId);
  if (!row || String(row.status || 'active').toLowerCase() !== 'active') {
    throw new Error('Partner profile is unavailable.');
  }
  return { ok: true, partner: partnerPublicProfile_(row) };
}

function handleCompanionPartnerProfileAction_(action, body) {
  const authPartner = requirePartner_(body);
  const partnerId = String(authPartner && authPartner.partner_id || '').trim();
  if (!partnerId) throw new Error('Partner authentication missing.');

  const sheet = ensureAdminPartnersSheet_();
  const row = findAdminPartner_(sheet, partnerId);
  if (!row) throw new Error('Partner profile could not be found.');

  if (String(row.status || 'active').toLowerCase() !== 'active') {
    throw new Error('This Companion account is not active.');
  }

  if (action === 'getPartnerProfile') {
    return { ok: true, partner: partnerProfileForClient_(row) };
  }

  const input = body && body.partner && typeof body.partner === 'object' ? body.partner : {};
  const clean = completePartnerIdentity_(cleanPartnerProfileInput_(input), row);
  const updated = Object.assign({}, row, clean, {
    partner_id: partnerId,
    updated_at: new Date().toISOString()
  });
  if (!updated.name) throw new Error('Partner name is required.');
  if (!updated.partner_slug) throw new Error('UW Partner slug is required.');
  updated.partner_name = updated.name;

  updateAdminObjectRow_(sheet, row.__row, updated);
  return { ok: true, partner: partnerProfileForClient_(updated) };
}

function adminProvisionPartner_(body) {
  const input = body && body.partner && typeof body.partner === 'object' ? body.partner : {};
  const clean = completePartnerIdentity_(cleanPartnerProfileInput_(input), {});
  const name = clean.name || cleanAdminText_(input.partner_name, 120);
  const loginId = cleanAdminLogin_(input.companion_login_id || input.partner_id);

  if (!name) throw new Error('Partner name is required.');
  if (!loginId) throw new Error('Companion Login ID (UW Partner ID) is required.');
  if (!clean.partner_slug) throw new Error('UW Partner slug is required.');

  const password = makeAdminPassword_();
  const sheet = ensureAdminPartnersSheet_();
  const rows = sheetToAdminObjects_(sheet);
  if (rows.some(r => String(r.partner_id || '').toLowerCase() === loginId.toLowerCase())) {
    throw new Error('That Companion Login ID already exists. Choose another.');
  }

  const now = new Date().toISOString();
  const record = Object.assign({}, clean, {
    partner_id: loginId,
    workspace_key: password,
    partner_name: name,
    name: name,
    status: 'active',
    created_at: now,
    updated_at: now,
    notification_email: clean.email || '',
    tariff_email_opt_in: false,
    tariff_push_opt_in: false,
    notification_permission: 'default',
    notification_updated_at: ''
  });

  appendAdminObject_(sheet, record);

  return {
    ok: true,
    partner: Object.assign(partnerAdminSafeRecord_(record), {
      companion_login_id: loginId,
      password: password
    })
  };
}

function adminListPartners_() {
  const sheet = ensureAdminPartnersSheet_();
  const partners = sheetToAdminObjects_(sheet)
    .filter(r => String(r.partner_id || '').trim())
    .map(partnerAdminSafeRecord_)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return { ok: true, partners: partners };
}

function adminUpdatePartner_(body) {
  const input = body && body.partner && typeof body.partner === 'object' ? body.partner : {};
  const partnerId = cleanAdminLogin_(input.companion_login_id || input.partner_id);
  if (!partnerId) throw new Error('Companion Login ID is required.');

  const sheet = ensureAdminPartnersSheet_();
  const row = findAdminPartner_(sheet, partnerId);
  if (!row) throw new Error('Partner could not be found.');

  const clean = completePartnerIdentity_(cleanPartnerProfileInput_(input), row);
  const updated = Object.assign({}, row, clean, {
    partner_id: String(row.partner_id),
    workspace_key: String(row.workspace_key || ''),
    partner_name: clean.name || row.partner_name || row.name || '',
    status: cleanAdminStatus_(input.status || row.status || 'active'),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  if (!updated.name) updated.name = updated.partner_name;

  updateAdminObjectRow_(sheet, row.__row, updated);
  return { ok: true, partner: partnerAdminSafeRecord_(updated) };
}

function adminGetPartnerLoginDetails_(body) {
  const partnerId = cleanAdminLogin_(body && (body.partner_id || body.companion_login_id));
  if (!partnerId) throw new Error('Companion Login ID is required.');

  const sheet = ensureAdminPartnersSheet_();
  const row = findAdminPartner_(sheet, partnerId);
  if (!row) throw new Error('Partner could not be found.');

  const password = String(row.workspace_key || '');
  if (!password) throw new Error('This Partner does not currently have a password.');

  return {
    ok: true,
    partner: Object.assign(partnerAdminSafeRecord_(row), {
      companion_login_id: String(row.partner_id || ''),
      password: password
    })
  };
}


function adminResetPartnerPassword_(body) {
  const partnerId = cleanAdminLogin_(body && (body.partner_id || body.companion_login_id));
  if (!partnerId) throw new Error('Companion Login ID is required.');

  const sheet = ensureAdminPartnersSheet_();
  const row = findAdminPartner_(sheet, partnerId);
  if (!row) throw new Error('Partner could not be found.');

  const password = makeAdminPassword_();
  const updated = Object.assign({}, row, {
    workspace_key: password,
    updated_at: new Date().toISOString()
  });
  updateAdminObjectRow_(sheet, row.__row, updated);

  return {
    ok: true,
    partner: Object.assign(partnerAdminSafeRecord_(updated), {
      companion_login_id: String(updated.partner_id),
      password: password
    })
  };
}


function adminUploadPartnerPhoto_(body) {
  const input = body && body.photo && typeof body.photo === 'object' ? body.photo : {};
  const dataUrl = String(input.data_url || '');
  const nameHint = cleanAdminText_(input.name || input.partner_name || input.companion_login_id || 'partner', 80);
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('Please choose a JPEG, PNG or WebP image.');

  const bytes = Utilities.base64Decode(match[2]);
  if (!bytes || !bytes.length) throw new Error('The selected photo was empty.');
  if (bytes.length > 1500000) throw new Error('The resized photo is still too large. Please choose a smaller image.');

  const folder = ensureCompanionPartnerPhotoFolder_();
  const filename = makePartnerPhotoFilename_(nameHint);
  const blob = Utilities.newBlob(bytes, 'image/jpeg', filename);
  const file = folder.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    try { file.setTrashed(true); } catch (_) {}
    throw new Error('Google Drive would not allow the Partner photo to be shared publicly. Check the Drive sharing policy and try again.');
  }

  const id = file.getId();
  const photoUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w800';
  return {
    ok: true,
    photo: {
      file_id: id,
      photo_url: photoUrl,
      drive_url: file.getUrl(),
      name: filename
    }
  };
}

function ensureCompanionPartnerPhotoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = String(props.getProperty('COMPANION_PARTNER_PHOTO_FOLDER_ID') || '').trim();
  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch (_) {}
  }

  const folderName = 'Appointment Companion Partner Photos';
  const existing = DriveApp.getFoldersByName(folderName);
  const folder = existing.hasNext() ? existing.next() : DriveApp.createFolder(folderName);
  props.setProperty('COMPANION_PARTNER_PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

function makePartnerPhotoFilename_(value) {
  const base = String(value || 'partner')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'partner';
  return base + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyyMMdd-HHmmss') + '.jpg';
}

function cleanPartnerProfileInput_(input) {
  input = input && typeof input === 'object' ? input : {};
  return {
    name: cleanAdminText_(input.name || input.partner_name, 120),
    mobile: cleanAdminText_(input.mobile, 40),
    email: cleanAdminText_(input.email, 160),
    partner_slug: cleanPartnerSlug_(input.partner_slug || input.slug || input.join || input.join_url || input.uw_link || input.email),
    town: cleanAdminText_(input.town, 120),
    strap: cleanAdminText_(input.strap, 220),
    photo_url: cleanAdminHttps_(input.photo_url || input.photo, 600),
    booking_url: cleanAdminHttps_(input.booking_url || input.booking, 600),
    website_url: cleanAdminHttps_(input.website_url || input.website, 600)
  };
}

function cleanPartnerSlug_(value) {
  let raw = String(value == null ? '' : value).trim();
  const emailMatch = raw.match(/^([^@\s]+)@uw\.partners$/i);
  if (emailMatch) raw = emailMatch[1];
  return raw
    .replace(/^https?:\/\/(?:www\.)?uw\.partners\//i, '')
    .replace(/\/(?:partner\/)?join\/?$/i, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '')
    .slice(0, 120);
}

function partnerSlugFromRow_(row) {
  row = row && typeof row === 'object' ? row : {};
  return cleanPartnerSlug_(row.partner_slug || row.join || row.join_url || row.email || '');
}

function customerJoinFromPartnerSlug_(slug) {
  slug = cleanPartnerSlug_(slug);
  return slug ? 'https://uw.partners/' + slug + '/join' : '';
}

function partnerJoinFromPartnerSlug_(slug) {
  slug = cleanPartnerSlug_(slug);
  return slug ? 'https://uw.partners/' + slug + '/partner/join' : '';
}

function defaultPartnerEmailFromSlug_(slug) {
  slug = cleanPartnerSlug_(slug);
  return slug ? slug + '@uw.partners' : '';
}

function completePartnerIdentity_(clean, fallback) {
  clean = clean && typeof clean === 'object' ? clean : {};
  fallback = fallback && typeof fallback === 'object' ? fallback : {};
  const slug = clean.partner_slug || partnerSlugFromRow_(fallback);
  return Object.assign({}, clean, {
    partner_slug: slug,
    email: clean.email || String(fallback.email || '') || defaultPartnerEmailFromSlug_(slug),
    join: customerJoinFromPartnerSlug_(slug)
  });
}

function partnerPublicProfile_(row) {
  const slug = partnerSlugFromRow_(row);
  return {
    partner_id: String(row.partner_id || ''),
    name: String(row.name || row.partner_name || ''),
    mobile: String(row.mobile || ''),
    partner_slug: slug,
    email: String(row.email || defaultPartnerEmailFromSlug_(slug) || ''),
    join: customerJoinFromPartnerSlug_(slug) || String(row.join || ''),
    partner_join: partnerJoinFromPartnerSlug_(slug),
    town: String(row.town || ''),
    strap: String(row.strap || ''),
    photo_url: String(row.photo_url || ''),
    booking_url: String(row.booking_url || ''),
    website_url: String(row.website_url || '')
  };
}

function partnerProfileForClient_(row) {
  return Object.assign(partnerPublicProfile_(row), {
    status: String(row.status || 'active'),
    updated_at: String(row.updated_at || '')
  });
}

function partnerAdminSafeRecord_(row) {
  const out = partnerProfileForClient_(row);
  out.companion_login_id = String(row.partner_id || '');
  out.created_at = String(row.created_at || '');
  return out;
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

  if (!sheet) {
    sheet = ss.insertSheet('Partners');
    sheet.getRange(1, 1, 1, COMPANION_PARTNER_HEADERS_.length).setValues([COMPANION_PARTNER_HEADERS_]);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(String);
  const missing = COMPANION_PARTNER_HEADERS_.filter(h => existing.indexOf(h) < 0);
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function findAdminPartner_(sheet, partnerId) {
  const target = String(partnerId || '').toLowerCase();
  return sheetToAdminObjects_(sheet).find(r => String(r.partner_id || '').toLowerCase() === target) || null;
}

function sheetToAdminObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values.map((row, index) => {
    const out = { __row: index + 2 };
    headers.forEach((h, i) => out[h] = row[i]);
    return out;
  });
}

function appendAdminObject_(sheet, object) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const row = headers.map(h => Object.prototype.hasOwnProperty.call(object, h) ? object[h] : '');
  sheet.appendRow(row);
}

function updateAdminObjectRow_(sheet, rowNumber, object) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(String);
  const row = headers.map(h => Object.prototype.hasOwnProperty.call(object, h) ? object[h] : '');
  sheet.getRange(Number(rowNumber), 1, 1, headers.length).setValues([row]);
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

function cleanAdminStatus_(value) {
  const status = String(value || '').trim().toLowerCase();
  return status === 'inactive' ? 'inactive' : 'active';
}

function cleanAdminHttps_(value, max) {
  const text = String(value == null ? '' : value).trim().slice(0, max || 600);
  if (!text) return '';
  if (!/^https:\/\//i.test(text)) throw new Error('Links must start with https://');
  return text;
}

function cleanAdminHttpsOrUwJoin_(value) {
  let text = String(value == null ? '' : value).trim();
  if (!text) return '';
  if (/^[a-z0-9._-]+$/i.test(text)) text = 'https://uw.partners/' + text.replace(/^\/+|\/+$/g, '') + '/join';
  return cleanAdminHttps_(text, 600);
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
