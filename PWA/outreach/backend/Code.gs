const SPREADSHEET_ID = '1nS-dlFnVq3lYb1mbEMD-HDOszRTnLbUkoWlUlsBwyAY';
const ROOT_FOLDER_ID = '1jXizwpG-CfCHQfa51lcUbCBEX40Q6Akg';
const PROSPECTS_SHEET = 'Prospects';
const HISTORY_SHEET = 'Conversation History';
const KEY_PROPERTY = 'CRM_WORKSPACE_KEY';

function doGet(e) {
  if ((e.parameter.action || '') === 'health') return json({ok:true, service:'Cold Outreach CRM'});
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
  const headers = headerMap(sheet);
  const profileUrl = String(p.profile_url || '').trim();
  const sourceUrl = String(p.source_url || '').trim();
  let name = String(p.name || '').trim() || nameFromProfile(profileUrl) || 'Unnamed prospect';
  const existingRow = findProspectRow(sheet, headers, profileUrl, name);
  const folder = getOrCreateProspectFolder(name);
  const uploaded = saveFiles(folder, body.files || [], name);
  const now = new Date();

  const values = {
    'Name': name,
    'LinkedIn profile': profileUrl,
    'Source post': sourceUrl,
    'Situation': '',
    'Why relevant': '',
    'Date identified': now,
    'Status': 'New',
    'Next action': 'Review and prepare relationship-first outreach',
    'Customer angle': 'Not raised',
    'Notes': String(p.notes || '').trim(),
    'Prospect folder': folder.getUrl(),
    'Track': String(p.track || ''),
    'Source': String(p.source || ''),
    'Relationship': String(p.relationship || ''),
    'North Star': p.track === 'Redundancy / job seeker' ? 'Gold Standard 1' : '',
    'Primary objective': p.track === 'Potential customer' ? 'Customer savings' : 'Partner opportunity'
  };
  writeByHeaders(sheet, headers, existingRow || sheet.getLastRow()+1, values);

  uploaded.forEach(file => appendHistory(ss, {
    prospect:name,date:now,direction:'External',
    type:file.purpose === 'job_preferences' ? 'Job preferences screenshot' : file.purpose === 'auto' ? 'Screenshot - auto classify' : 'Screenshot / source',
    summary:file.purpose === 'job_preferences' ? 'LinkedIn Job preferences captured' : file.purpose === 'auto' ? 'Captured for automatic screenshot classification' : 'Captured with initial prospect record',
    file:file.url,linkedin:sourceUrl || profileUrl,
    next:'Review and prepare relationship-first outreach',status:'New',notes:''
  }));

  return {ok:true,prospect_name:name,row:existingRow || sheet.getLastRow(),folder_url:folder.getUrl(),files:uploaded};
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

  const updates = {'Last contact':now,'Status':'Interested'};
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
  let prospectFiles = childFolder(root,'Prospect Files');
  return childFolder(prospectFiles, cleanName(name));
}
function childFolder(parent,name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function cleanName(v){return String(v||'Unnamed prospect').replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim().slice(0,80)}
function mimeExt(m){return m==='image/png'?'.png':m==='image/webp'?'.webp':m==='image/jpeg'?'.jpg':'.bin'}

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
  return decodeURIComponent(m[1]).replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
