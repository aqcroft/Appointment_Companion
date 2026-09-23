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
    if (action === 'getProspectOutput') return json(getProspectOutput(body));
    if (action === 'updateDraft') return json(updateDraft(body));
    if (action === 'addEvidence') return json(addEvidence(body));
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
  const overwriteExisting = body.overwrite_existing === true;

  // Existing people are never silently duplicated or overwritten.
  // Return enough context for the Companion to ask Adrian explicitly.
  if (existingRow && !overwriteExisting) {
    const existingName = sheet.getRange(existingRow, headers['Name']).getDisplayValue() || fallbackName;
    const existingCapture = headers['Last capture ID']
      ? String(sheet.getRange(existingRow, headers['Last capture ID']).getDisplayValue() || '')
      : '';
    return {
      ok:true,
      requires_confirmation:true,
      existing_prospect:true,
      same_capture:!!(captureId && existingCapture === captureId),
      prospect_name:existingName,
      row:existingRow,
      existing_capture_id:existingCapture,
      message:'This prospect already exists in the CRM. Confirm overwrite to add the new evidence/details and create a revised ChatGPT handoff. Previous conversation history and action dates will be preserved.'
    };
  }

  const name = cleanLinkedInName(
    existingRow ? (sheet.getRange(existingRow, headers['Name']).getDisplayValue() || fallbackName) : fallbackName
  );
  const folder = getOrCreateProspectFolder(name);
  const uploaded = saveFiles(folder, body.files || [], name);
  const allEvidence = listImageFiles(folder);
  const now = new Date();
  const targetRow = existingRow || sheet.getLastRow() + 1;

  const values = {
    'Name': name,
    'LinkedIn profile': profileUrl,
    'Source post': sourceUrl,
    'Notes': String(p.notes || '').trim(),
    'Prospect folder': folder.getUrl(),
    'Track': String(p.track || ''),
    'Source': String(p.source || ''),
    'Relationship': String(p.relationship || ''),
    'Last capture ID': captureId,
    'Draft status': existingRow ? 'Awaiting ChatGPT re-analysis' : 'Awaiting ChatGPT analysis'
  };

  if (!existingRow) {
    values['Situation'] = '';
    values['Why relevant'] = '';
    values['Date identified'] = now;
    values['Status'] = 'New';
    values['Next action'] = 'Process ChatGPT handoff';
    values['Customer angle'] = 'Not raised';
    values['North Star'] = p.track === 'Redundancy / job seeker' ? 'Gold Standard 1' : '';
    values['Primary objective'] = p.track === 'Potential customer' ? 'Customer savings' : 'Partner opportunity';
  } else {
    const currentStatus = headers['Status'] ? String(sheet.getRange(existingRow, headers['Status']).getDisplayValue() || '') : '';
    if (!currentStatus || currentStatus === 'New') values['Next action'] = 'Process revised ChatGPT handoff';
  }

  writeByHeaders(sheet, headers, targetRow, values);
  setLinkedCell(sheet, targetRow, headers['LinkedIn profile'], profileUrl);
  setLinkedCell(sheet, targetRow, headers['Source post'], sourceUrl);

  uploaded.forEach(file => appendHistory(ss, {
    prospect:name,date:now,direction:'External',type:'Screenshot / source',
    summary:existingRow ? 'Additional evidence captured for revised handoff' : 'Captured with prospect handoff',
    file:file.url,linkedin:sourceUrl || profileUrl,
    next:existingRow ? 'Process revised ChatGPT handoff' : 'Process ChatGPT handoff',
    status:'Captured',notes:''
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
    files:allEvidence,
    refinement:!!existingRow
  });

  const handoffFilename = 'ChatGPT Handoff - ' + cleanName(name) + ' - ' +
    Utilities.formatDate(now, Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd_HHmmss') + '.md';
  const handoffFile = folder.createFile(handoffFilename, handoff, MimeType.PLAIN_TEXT);

  appendHistory(ss,{
    prospect:name,date:now,direction:'System',type:existingRow ? 'Revised ChatGPT handoff created' : 'ChatGPT handoff created',
    summary:existingRow
      ? 'Revised handoff created using all saved screenshot evidence for fresh analysis and drafting.'
      : 'Handoff file created for analysis and drafting in the Cold Outreach ChatGPT project.',
    file:handoffFile.getUrl(),linkedin:profileUrl,
    next:existingRow ? 'Process revised ChatGPT handoff' : 'Process ChatGPT handoff',
    status:'Captured',notes:''
  });

  return {
    ok:true,
    overwritten:!!existingRow,
    prospect_name:name,
    row:targetRow,
    capture_id:captureId,
    folder_url:folder.getUrl(),
    files:uploaded,
    evidence_files:allEvidence,
    handoff_url:handoffFile.getUrl(),
    handoff_filename:handoffFilename,
    handoff_markdown:handoff
  };
}

function addEvidence(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = ensureProspectHeaders(sheet);
  const captureId = String(body.capture_id || '').trim();
  const profileUrl = String(body.profile_url || '').trim();
  const requestedName = String(body.prospect_name || '').trim();
  const last = sheet.getLastRow();
  let row = 0;

  if (captureId && headers['Last capture ID'] && last >= 2) {
    const hit = sheet.getRange(2, headers['Last capture ID'], last - 1, 1)
      .createTextFinder(captureId).matchEntireCell(true).findNext();
    if (hit) row = hit.getRow();
  }
  if (!row) row = findProspectRow(sheet, headers, profileUrl, requestedName);
  if (!row) throw new Error('This prospect could not be found in the CRM.');

  const values = sheet.getRange(row,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  const get = h => headers[h] ? values[headers[h]-1] : '';
  const name = String(get('Name') || requestedName || 'Unnamed prospect');
  const actualProfile = String(get('LinkedIn profile') || profileUrl);
  const sourceUrl = String(get('Source post') || '');
  const extraNote = String(body.note || '').trim();
  const newCaptureId = String(body.new_capture_id || Utilities.getUuid()).trim();
  const folder = getOrCreateProspectFolder(name);
  const uploaded = saveFiles(folder, body.files || [], name);
  if (!uploaded.length && !extraNote) throw new Error('Add at least one screenshot or a refinement note.');

  const now = new Date();
  uploaded.forEach(file => appendHistory(ss, {
    prospect:name,date:now,direction:'External',type:'Screenshot / source',
    summary:'Additional evidence added for revised handoff',
    file:file.url,linkedin:sourceUrl || actualProfile,
    next:'Process revised ChatGPT handoff',status:'Captured',notes:extraNote
  }));

  const existingNotes = String(get('Notes') || '');
  const mergedNotes = [existingNotes, extraNote].filter(Boolean).join('\n\nAdditional refinement context: ');
  const allEvidence = listImageFiles(folder);
  const handoff = buildHandoffMarkdown({
    name:name,
    row:row,
    captureId:newCaptureId,
    profileUrl:actualProfile,
    sourceUrl:sourceUrl,
    track:String(get('Track') || ''),
    source:String(get('Source') || ''),
    relationship:String(get('Relationship') || ''),
    notes:mergedNotes,
    folderUrl:folder.getUrl(),
    files:allEvidence,
    refinement:true
  });

  const handoffFilename = 'ChatGPT Handoff - ' + cleanName(name) + ' - ' +
    Utilities.formatDate(now, Session.getScriptTimeZone() || 'Europe/London', 'yyyy-MM-dd_HHmmss') + '.md';
  const handoffFile = folder.createFile(handoffFilename, handoff, MimeType.PLAIN_TEXT);

  const updates = {
    'Last capture ID':newCaptureId,
    'Draft status':'Awaiting ChatGPT re-analysis'
  };
  const currentStatus = String(get('Status') || '');
  if (!currentStatus || currentStatus === 'New') updates['Next action'] = 'Process revised ChatGPT handoff';
  if (extraNote) updates['Notes'] = mergedNotes;
  writeByHeaders(sheet,headers,row,updates);

  appendHistory(ss,{
    prospect:name,date:now,direction:'System',type:'Revised ChatGPT handoff created',
    summary:'Revised handoff created after additional evidence/context was added. It includes all screenshot evidence currently saved for this prospect.',
    file:handoffFile.getUrl(),linkedin:actualProfile,
    next:'Process revised ChatGPT handoff',status:'Captured',notes:extraNote
  });

  return {
    ok:true,
    overwritten:true,
    prospect_name:name,
    row:row,
    capture_id:newCaptureId,
    folder_url:folder.getUrl(),
    files:uploaded,
    evidence_files:allEvidence,
    handoff_url:handoffFile.getUrl(),
    handoff_filename:handoffFilename,
    handoff_markdown:handoff
  };
}

function listImageFiles(folder) {
  const out = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const file = it.next();
    const mime = String(file.getMimeType() || '');
    if (mime.indexOf('image/') !== 0) continue;
    out.push({
      id:file.getId(),
      url:file.getUrl(),
      name:file.getName(),
      purpose:'context'
    });
  }
  out.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  return out;
}

function buildHandoffMarkdown(x) {
  const fileLines = (x.files || []).map((f,i) =>
    '- Screenshot ' + (i+1) + ': ' + f.name + '\n  - Drive URL: ' + f.url
  ).join('\n');

  return [
    '# Cold Outreach Prospect Handoff',
    '',
    x.refinement ? '## Revised capture\nThis is a refreshed handoff for an existing CRM prospect. Use ALL screenshot evidence listed below, including earlier screenshots plus the newly added evidence/context. Reassess the prospect and write fresh analysis/drafts back to the same CRM row. The newest draft entries should supersede earlier suggested drafts without deleting the history.\n' : '',
    '## Instruction',
    'Process this prospect using the Cold Outreach relationship-first project instructions already available in this ChatGPT project.',
    '',
    'Read the linked prospect screenshots/files from the connected Google Drive. Treat those screenshots plus the capture context below as the factual source material. Analyse only what they support. Do not invent missing facts.',
    '',
    '**Do not browse the web or research the LinkedIn profile/source URLs.** The URLs are CRM/navigation references only. Do not open them unless Adrian explicitly asks for external research. This handoff is intentionally designed to be processed from the screenshots and supplied context.',
    '',
    'Then:',
    '1. Assess what happened, what the person appears to want, the relationship context, and whether UW is genuinely relevant.',
    '2. Choose the appropriate route: approach, relationship-building first, supportive comment only, or no approach.',
    '3. For LinkedIn outreach, draft the public comment first. Do not mention UW publicly unless the context specifically warrants it. If the prospect\'s name appears in the public comment, prefix it with @ so Adrian can tag them easily (for example, @Mark).',
    '4. Draft the connection-request instruction. Normally this is a standard connection request with no note.',
    '5. Draft the first UW DM only if appropriate. For job seekers, explicitly protect the role/career they actually want and position UW only alongside it.',
    '6. Present the copy-ready public comment and, separately, the stored first DM.',
    '6a. When writing Conversation History, use these exact Type labels so the Companion can retrieve the output: `Suggested public comment - Draft`, `Connection request instruction - Draft`, and `Suggested first DM - Draft`.',
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

  if (action === 'comment_sent') {
    writeByHeaders(sheet,headers,row,{
      'Comment sent':now,
      'Initial action date':now,
      'Last contact':now,
      'Next action':'Send connection request'
    });
    appendHistory(ss,{prospect:actualName,date:now,direction:'Outbound',type:'Public comment sent',summary:'Public LinkedIn comment posted.',file:'',linkedin:profileUrl,next:'Send connection request',status:'Comment sent',notes:''});
  } else if (action === 'connection_sent') {
    writeByHeaders(sheet,headers,row,{
      'Connection sent':now,
      'Initial action date':now,
      'Status':'Connection sent',
      'Last contact':now,
      'Next action':'Wait for connection acceptance'
    });
    appendHistory(ss,{prospect:actualName,date:now,direction:'Outbound',type:'Connection request sent',summary:'LinkedIn connection request sent.',file:'',linkedin:profileUrl,next:'Wait for connection acceptance',status:'Connection sent',notes:''});
  } else if (action === 'comment_connection_sent') {
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
  const drafts = latestOutreachDrafts(ss);
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
      public_comment:(drafts[name.toLowerCase()] || {}).public_comment || '',
      connection_instruction:(drafts[name.toLowerCase()] || {}).connection_instruction || '',
      first_dm:(drafts[name.toLowerCase()] || {}).first_dm || '',
      draft_status:String(get('Draft status') || ''),
      capture_id:String(get('Last capture ID') || '')
    };
  }).filter(p=>p.name).reverse();
  return {ok:true,prospects:prospects};
}

function updateDraft(body) {
  const allowed = {
    'Suggested public comment - Draft': true,
    'Suggested first DM - Draft': true,
    'Connection request instruction - Draft': true
  };
  const type = String(body.draft_type || '').trim();
  const content = String(body.content || '').trim();
  if (!allowed[type]) throw new Error('Unsupported draft type.');
  if (!content) throw new Error('Draft content cannot be blank.');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = ensureProspectHeaders(sheet);
  const captureId = String(body.capture_id || '').trim();
  const profileUrl = String(body.profile_url || '').trim();
  const requestedName = String(body.prospect_name || '').trim();
  const last = sheet.getLastRow();
  let row = 0;
  if (captureId && headers['Last capture ID'] && last >= 2) {
    const hit = sheet.getRange(2, headers['Last capture ID'], last - 1, 1).createTextFinder(captureId).matchEntireCell(true).findNext();
    if (hit) row = hit.getRow();
  }
  if (!row) row = findProspectRow(sheet, headers, profileUrl, requestedName);
  if (!row) throw new Error('This prospect could not be found in the CRM.');
  const actualName = String(sheet.getRange(row, headers['Name']).getDisplayValue() || requestedName);
  const actualProfile = String(sheet.getRange(row, headers['LinkedIn profile']).getDisplayValue() || profileUrl);
  const next = headers['Next action'] ? String(sheet.getRange(row,headers['Next action']).getDisplayValue() || '') : '';
  const status = headers['Status'] ? String(sheet.getRange(row,headers['Status']).getDisplayValue() || 'New') : 'New';
  const now = new Date();
  appendHistory(ss,{prospect:actualName,date:now,direction:'Outgoing edit',type:type,summary:content,file:'',linkedin:actualProfile,next:next,status:status,notes:'Edited in Partner Companion.'});
  writeByHeaders(sheet,headers,row,{'Draft status':'Edited in Companion'});
  return {ok:true,prospect_name:actualName,draft_type:type,content:content};
}

function getProspectOutput(body) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  const headers = ensureProspectHeaders(sheet);
  const captureId = String(body.capture_id || '').trim();
  const profileUrl = String(body.profile_url || '').trim();
  const requestedName = String(body.prospect_name || '').trim();
  const last = sheet.getLastRow();
  let row = 0;

  if (captureId && headers['Last capture ID'] && last >= 2) {
    const hit = sheet.getRange(2, headers['Last capture ID'], last - 1, 1)
      .createTextFinder(captureId).matchEntireCell(true).findNext();
    if (hit) row = hit.getRow();
  }
  if (!row) row = findProspectRow(sheet, headers, profileUrl, requestedName);
  if (!row) throw new Error('This prospect could not be found in the CRM.');

  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const get = h => headers[h] ? values[headers[h] - 1] : '';
  const name = String(get('Name') || requestedName || '');
  const drafts = latestDraftsForProspect(ss, name);

  return {
    ok:true,
    prospect:{
      row:row,
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
      public_comment:drafts.public_comment || '',
      connection_instruction:drafts.connection_instruction || '',
      first_dm:drafts.first_dm || '',
      draft_status:String(get('Draft status') || ''),
      capture_id:String(get('Last capture ID') || '')
    }
  };
}

function latestDraftsForProspect(ss, name) {
  const sheet = ss.getSheetByName(HISTORY_SHEET);
  const last = sheet.getLastRow();
  const out = {public_comment:'',connection_instruction:'',first_dm:''};
  if (!name || last < 2) return out;

  const hits = sheet.getRange(2, 1, last - 1, 1)
    .createTextFinder(name).matchEntireCell(true).findAll();

  for (let i = hits.length - 1; i >= 0; i--) {
    const row = hits[i].getRow();
    const vals = sheet.getRange(row, 4, 1, 2).getDisplayValues()[0];
    const type = String(vals[0] || '').trim();
    const content = vals[1] || '';
    if (type === 'Suggested public comment - Draft' && !out.public_comment) out.public_comment = content;
    if (type === 'Connection request instruction - Draft' && !out.connection_instruction) out.connection_instruction = content;
    if (type === 'Suggested first DM - Draft' && !out.first_dm) out.first_dm = content;
    if (out.public_comment && out.connection_instruction && out.first_dm) break;
  }
  return out;
}

function latestOutreachDrafts(ss) {
  const sheet = ss.getSheetByName(HISTORY_SHEET);
  const last = sheet.getLastRow();
  const out = {};
  if (last < 2) return out;
  const vals = sheet.getRange(2,1,last-1,10).getDisplayValues();
  for (let i=vals.length-1;i>=0;i--) {
    const name=String(vals[i][0]||'').trim();
    const type=String(vals[i][3]||'').trim();
    if (!name) continue;
    const key=name.toLowerCase();
    if (!out[key]) out[key]={public_comment:'',connection_instruction:'',first_dm:''};
    if (type === 'Suggested public comment - Draft' && !out[key].public_comment) out[key].public_comment = vals[i][4] || '';
    if (type === 'Connection request instruction - Draft' && !out[key].connection_instruction) out[key].connection_instruction = vals[i][4] || '';
    if (type === 'Suggested first DM - Draft' && !out[key].first_dm) out[key].first_dm = vals[i][4] || '';
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
function setLinkedCell(sheet,row,col,url) {
  const value=String(url||'').trim();
  if(!col)return;
  const cell=sheet.getRange(row,col);
  if(!value){cell.clearContent();return}
  const rich=SpreadsheetApp.newRichTextValue().setText(value).setLinkUrl(value).build();
  cell.setRichTextValue(rich);
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
