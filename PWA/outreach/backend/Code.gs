const SPREADSHEET_ID = '1nS-dlFnVq3lYb1mbEMD-HDOszRTnLbUkoWlUlsBwyAY';
const ROOT_FOLDER_ID = '1jXizwpG-CfCHQfa51lcUbCBEX40Q6Akg';
const PROSPECTS_SHEET = 'Prospects';
const HISTORY_SHEET = 'Conversation History';
const KEY_PROPERTY = 'CRM_WORKSPACE_KEY';
function doGet(e) {
  if ((e.parameter.action || '') === 'health') {
    return json({ok:true, service:'Cold Outreach CRM'});
  }
  return json({ok:false,error:'Unsupported GET action'});
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    requireKey(body.workspace_key);
    const action = body.action || '';
    if (action === 'health') return json({ok:true});
    if (action === 'saveProspect') return json(saveProspect(body));
    if (action === 'addHistory') return json(addHistory(body));
    if (action === 'markAction') return json(markAction(body));
    if (action === 'listProspects') return json(listProspects());
    return json({ok:false,error:'Unknown action'});
  } catch (err) {
    return json({ok:false,error:String(err && err.message || err)});
  }
}

function requireKey(key) {
  const expected = PropertiesService.getScriptProperties().getProperty(KEY_PROPERTY);
  if (!expected) throw new Error('CRM_WORKSPACE_KEY has not been configured in Script Properties.');
  if (String(key || '') !== expected) throw new Error('Invalid workspace key.');
}
function saveProspect(body) {
  const p = body.prospect || {};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = ensureProspectHeaders(sheet);

  const captureId = String(body.capture_id || '').trim();
  const profileUrl = String(p.profile_url || '').trim();
  const sourceUrl = String(p.source_url || '').trim();
  const fallbackName = String(p.name || '').trim() || nameFromProfile(profileUrl) || 'Unnamed prospect';
  const existingRow = findProspectRow(sheet, headers, profileUrl, fallbackName);
  const captureHeader = headers['Last capture ID'];

  if (existingRow && captureId && String(sheet.getRange(existingRow, captureHeader).getDisplayValue() || '') === captureId) {
    return {
      ok:true,
      duplicate:true,
      prospect_name:sheet.getRange(existingRow,headers['Name']).getDisplayValue() || fallbackName,
      row:existingRow,
      files:[]
    };
  }

  const name = cleanLinkedInName(fallbackName);
  const folder = getOrCreateProspectFolder(name);
  const uploaded = saveFiles(folder, body.files || [], name);
  const now = new Date();
  const targetRow = existingRow || sheet.getLastRow() + 1;

  const values = {
    'Name': name,
    'LinkedIn profile': profileUrl,
    'Source post': sourceUrl,
    'Situation': '',
    'Why relevant': '',
    'Date identified': now,
    'Status': 'Captured',
    'Next action': 'Process ChatGPT handoff',
    'Customer angle': 'Not raised',
    'Notes': String(p.notes || '').trim(),
    'Prospect folder': folder.getUrl(),
    'Track': String(p.track || ''),
    'Source': String(p.source || ''),
    'Relationship': String(p.relationship || ''),
    'North Star': p.track === 'Redundancy / job seeker' ? 'Gold Standard 1' : '',
    'Primary objective': p.track === 'Potential customer' ? 'Customer savings' : 'Partner opportunity',
    'Last capture ID': captureId,
    'Draft status': 'Awaiting ChatGPT analysis'
  };
  writeByHeaders(sheet, headers, targetRow, values);

  uploaded.forEach(file => appendHistory(ss, {
    prospect:name,date:now,direction:'External',type:'Screenshot / source',
    summary:'Captured with prospect handoff',
    file:file.url,linkedin:sourceUrl || profileUrl,
    next:'Process ChatGPT handoff',status:'Captured',notes:''
  }));

  const handoff = buildHandoffMarkdown({
    name:name,
    row:targetRow,
    captureId:captureId,
    profileUrl:profileUrl,
    sourceUrl:sourceUrl,
    track:String(p.track || ''),
    source:String(p.source || ''),
    relationship:String(p.relationship || ''),
    notes:String(p.notes || '').trim(),
    folderUrl:folder.getUrl(),
    files:uploaded
  });

  const handoffFilename = 'ChatGPT Handoff - ' + cleanName(name) + ' - ' +
    Utilities.formatDate(now, Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd_HHmm') + '.md';
  const handoffFile = folder.createFile(handoffFilename, handoff, MimeType.PLAIN_TEXT);

  appendHistory(ss,{
    prospect:name,date:now,direction:'System',type:'ChatGPT handoff created',
    summary:'Handoff file created for analysis and drafting in the Cold Outreach ChatGPT project.',
    file:handoffFile.getUrl(),linkedin:profileUrl,
    next:'Process ChatGPT handoff',status:'Captured',notes:''
  });

  return {
    ok:true,
    prospect_name:name,
    row:targetRow,
    folder_url:folder.getUrl(),
    files:uploaded,
    handoff_url:handoffFile.getUrl(),
    handoff_filename:handoffFilename,
    handoff_markdown:handoff
  };
}

function buildHandoffMarkdown(x) {
  const fileLines = (x.files || []).map((f,i) =>
    '- Screenshot ' + (i+1) + ': ' + f.name + '\n  - Drive URL: ' + f.url
  ).join('\n');

  return [
    '# Cold Outreach Prospect Handoff',
    '',
    '## Instruction',
    'Process this prospect using the Cold Outreach relationship-first project instructions already available in this ChatGPT project.',
    '',
    'Read the linked prospect screenshots/files from the connected sandbox Google Drive. Analyse only what the supplied material supports. Do not invent missing facts.',
    '',
    'Then:',
    '1. Assess what happened, what the person appears to want, the relationship context, and whether UW is genuinely relevant.',
    '2. Choose the appropriate route: approach, relationship-building first, supportive comment only, or no approach.',
    '3. For LinkedIn outreach, draft the public comment first. Do not mention UW publicly unless the context specifically warrants it.',
    '4. Draft the connection-request instruction. Normally this is a standard connection request with no note.',
    '5. Draft the first UW DM only if appropriate. For job seekers, explicitly protect the role/career they actually want and position UW only alongside it.',
    '6. Present the copy-ready public comment and, separately, the stored first DM.',
    '7. Update the main Google Sheet Prospects row identified below. Populate Situation, Why relevant, Target role, Job preferences, Recommended approach, Analysis summary, Draft status, Status and Next action as appropriate.',
    '8. Append Conversation History entries for the analysis, suggested public comment, connection-request instruction and suggested first DM.',
    '9. Do not mark Comment sent, Connection sent, Connected or First UW DM sent unless Adrian explicitly confirms those actions happened.',
    '',
    '## Prospect identity / CRM key',
    '- Prospect name at capture: ' + x.name,
    '- Prospects sheet row at capture: ' + x.row,
    '- LinkedIn profile: ' + (x.profileUrl || '(none supplied)'),
    '- Capture ID: ' + (x.captureId || '(none)'),
    '- Prospect Drive folder: ' + x.folderUrl,
    '- Main CRM spreadsheet: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit',
    '',
    'Use the LinkedIn profile URL as the primary match key when updating the CRM. Do not create a duplicate prospect row if one already exists.',
    '',
    '## Capture context',
    '- Platform: ' + (x.source || ''),
    '- Situation selected: ' + (x.track || ''),
    '- Relationship: ' + (x.relationship || ''),
    '- Source / original post: ' + (x.sourceUrl || '(none supplied)'),
    '- Adrian notes: ' + (x.notes || '(none)'),
    '',
    '## Uploaded files',
    fileLines || '- No screenshots were uploaded.',
    '',
    '## Final response to Adrian',
    'Keep the response practical and concise. Give the recommended approach, the copy-ready public comment, the connection-request action, and note that the first DM has been stored in the CRM for later if a connection is accepted.'
  ].join('\n');
}

function cleanLinkedInName(name) {
  return String(name || '').replace(/\s+\d{5,}$/,'').trim() || 'Unnamed prospect';
}

function markAction(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = ensureProspectHeaders(sheet);
  const profileUrl = String(body.profile_url || '').trim();
  const name = String(body.prospect_name || '').trim();
  const row = findProspectRow(sheet, headers, profileUrl, name);
  if (!row) throw new Error('Prospect not found in CRM.');

  const actualName = headers['Name'] ? sheet.getRange(row,headers['Name']).getDisplayValue() : name;
  const now = new Date();
  const action = String(body.action_name || '');

  if (action === 'comment_connection_sent') {
    writeByHeaders(sheet,headers,row,{
      'Comment sent':now,
      'Connection sent':now,
      'Initial action date':now,
      'Status':'Connection sent',
      'Last contact':now,
      'Next action':'Wait for connection acceptance'
    });
    appendHistory(ss,{prospect:actualName,date:now,direction:'Outbound',type:'Public comment + connection request',summary:'Public comment posted and normal connection request sent.',file:'',linkedin:profileUrl,next:'Wait for connection acceptance',status:'Connection sent',notes:''});
  } else if (action === 'connected') {
    writeByHeaders(sheet,headers,row,{
      'Connected':now,
      'Connected date':now,
      'Status':'Connected',
      'Last contact':now,
      'Next action':'Send first UW DM'
    });
    appendHistory(ss,{prospect:actualName,date:now,direction:'External',type:'Connection accepted',summary:'LinkedIn connection accepted.',file:'',linkedin:profileUrl,next:'Send first UW DM',status:'Connected',notes:''});
  } else if (action === 'dm_sent') {
    writeByHeaders(sheet,headers,row,{
      'First UW DM sent':now,
      'First DM sent date':now,
      'Status':'DM sent',
      'Last contact':now,
      'Next action':'Follow up in about 1 week if no reply',
      'Follow-up date':new Date(now.getTime()+7*24*60*60*1000)
    });
    appendHistory(ss,{prospect:actualName,date:now,direction:'Outbound',type:'First UW DM sent',summary:'Stored first DM marked as sent.',file:'',linkedin:profileUrl,next:'Follow up in about 1 week if no reply',status:'DM sent',notes:''});
  } else {
    throw new Error('Unknown action.');
  }
  return {ok:true,action:action};
}

function listProspects() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = ensureProspectHeaders(sheet);
  const last = sheet.getLastRow();
  if (last < 2) return {ok:true,prospects:[]};
  const vals = sheet.getRange(2,1,last-1,sheet.getLastColumn()).getValues();
  const drafts = latestDmDrafts(ss);
  const prospects = vals.map((r,idx)=>{
    const get = h => headers[h] ? r[headers[h]-1] : '';
    const name = String(get('Name') || '');
    return {
      row:idx+2,
      name:name,
      profile_url:String(get('LinkedIn profile') || ''),
      source_post:String(get('Source post') || ''),
      source:String(get('Source') || ''),
      track:String(get('Track') || ''),
      relationship:String(get('Relationship') || ''),
      status:String(get('Status') || ''),
      next_action:String(get('Next action') || ''),
      followup_date:dateIso(get('Follow-up date')),
      folder_url:String(get('Prospect folder') || ''),
      comment_sent:!!get('Comment sent'),
      connection_sent:!!get('Connection sent'),
      connected:!!get('Connected'),
      first_dm_sent:!!get('First UW DM sent'),
      first_dm:drafts[name.toLowerCase()] || ''
    };
  }).filter(p=>p.name).reverse();
  return {ok:true,prospects:prospects};
}

function latestDmDrafts(ss) {
  const sheet = ss.getSheetByName(HISTORY_SHEET);
  const last = sheet.getLastRow();
  const out = {};
  if (last < 2) return out;
  const vals = sheet.getRange(2,1,last-1,10).getDisplayValues();
  for (let i=vals.length-1;i>=0;i--) {
    const name=String(vals[i][0]||'').trim();
    const type=String(vals[i][3]||'').trim();
    if (name && type === 'Suggested first DM - Draft' && !out[name.toLowerCase()]) out[name.toLowerCase()] = vals[i][4] || '';
  }
  return out;
}
function dateIso(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd');
}

function addHistory(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = headerMap(sheet);
  const name = String(body.prospect_name || '').trim() || nameFromProfile(body.profile_url) || 'Unnamed prospect';
  const row = findProspectRow(sheet, headers, String(body.profile_url || ''), name);
  if (!row) throw new Error('Prospect not found in CRM.');
  const folder = getOrCreateProspectFolder(name);
  const uploaded = saveFiles(folder, body.files || [], name);
  const now = new Date();
  const followup = body.followup_date ? new Date(body.followup_date + 'T12:00:00') : null;

  appendHistory(ss,{
    prospect:name,date:now,direction:'Conversation',type:'DM / reply update',
    summary:String(body.note || '').trim() || 'Conversation screenshot added',
    file:uploaded.map(x=>x.url).join(' | '),linkedin:String(body.profile_url || ''),
    next:followup ? 'Follow up on agreed date' : 'Review reply and decide next action',
    status:'Active conversation',notes:''
  });

  const updates = {'Last contact':now};
  if (followup) {
    updates['Follow-up date']=followup;
    updates['Next action']='Follow up on agreed date';
  }
  writeByHeaders(sheet,headers,row,updates);
  return {ok:true,prospect_name:name,followup_date:body.followup_date || '',files:uploaded};
}

function appendHistory(ss, item) {
  const sheet = ss.getSheetByName(HISTORY_SHEET);
  sheet.appendRow([
    item.prospect,item.date,item.direction,item.type,item.summary,item.file,item.linkedin,
    item.next,item.status,item.notes
  ]);
}

function saveFiles(folder, files, name) {
  return (files || []).map((f, i) => {
    const data = String(f.data_url || '');
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid screenshot payload.');
    const ext = mimeExt(match[1]);
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd_HHmmss');
    const purpose = cleanName(f.purpose || 'context').replace(/\s+/g,'-').toLowerCase();
    const filename = stamp + '_' + (i+1) + '_' + purpose + '_' + cleanName(name) + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(match[2]), match[1], filename);
    const file = folder.createFile(blob);
    return {id:file.getId(),url:file.getUrl(),name:file.getName(),purpose:String(f.purpose || 'context')};
  });
}

function getOrCreateProspectFolder(name) {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const prospectFiles = childFolder(root,'Prospect Files');
  return childFolder(prospectFiles, cleanName(name));
}
function childFolder(parent,name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function cleanName(v){return String(v||'Unnamed prospect').replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim().slice(0,80)}
function mimeExt(m){return m==='image/png'?'.png':m==='image/webp'?'.webp':m==='image/jpeg'?'.jpg':'.bin'}

function ensureProspectHeaders(sheet) {
  let headers = headerMap(sheet);
  [
    'Last capture ID','Target role','Job preferences','Recommended approach','Analysis summary','Draft status','Initial action date','Connected date','First DM sent date'
  ].forEach(name => ensureHeader(sheet, headers, name));
  return headerMap(sheet);
}
function ensureHeader(sheet, headers, name) {
  if (headers[name]) return headers[name];
  const col = Math.max(1, sheet.getLastColumn() + 1);
  sheet.getRange(1, col).setValue(name);
  headers[name] = col;
  return col;
}
function headerMap(sheet) {
  const last = sheet.getLastColumn();
  const row = sheet.getRange(1,1,1,last).getDisplayValues()[0];
  const map = {};
  row.forEach((v,i)=>{if(v) map[v]=i+1});
  return map;
}
function writeByHeaders(sheet,headers,row,values) {
  Object.keys(values).forEach(k=>{
    if (!headers[k]) return;
    sheet.getRange(row,headers[k]).setValue(values[k]);
  });
}
function findProspectRow(sheet, headers, profileUrl, name) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const width = sheet.getLastColumn();
  const vals = sheet.getRange(2,1,last-1,width).getDisplayValues();
  const pcol = headers['LinkedIn profile'] ? headers['LinkedIn profile']-1 : -1;
  const ncol = headers['Name'] ? headers['Name']-1 : -1;
  for (let i=0;i<vals.length;i++) {
    if (profileUrl && pcol>=0 && vals[i][pcol] === profileUrl) return i+2;
    if (!profileUrl && name && ncol>=0 && vals[i][ncol].toLowerCase() === name.toLowerCase()) return i+2;
  }
  return 0;
}
function nameFromProfile(url) {
  const m=String(url||'').match(/linkedin\.com\/in\/([^/?#]+)/i);
  if(!m)return '';
  return decodeURIComponent(m[1]).replace(/-\d{5,}$/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
