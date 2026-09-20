const SPREADSHEET_ID = '1nS-dlFnVq3lYb1mbEMD-HDOszRTnLbUkoWlUlsBwyAY';
const ROOT_FOLDER_ID = '1jXizwpG-CfCHQfa51lcUbCBEX40Q6Akg';
const PROSPECTS_SHEET = 'Prospects';
const HISTORY_SHEET = 'Conversation History';
const KEY_PROPERTY = 'CRM_WORKSPACE_KEY';
const OPENAI_KEY_PROPERTY = 'OPENAI_API_KEY';
const OPENAI_MODEL_PROPERTY = 'OPENAI_MODEL';
const DEFAULT_OPENAI_MODEL = 'gpt-5.4';

function doGet(e) {
  if ((e.parameter.action || '') === 'health') {
    return json({ok:true, service:'Cold Outreach CRM', ai_configured:!!getOpenAIKey()});
  }
  return json({ok:false,error:'Unsupported GET action'});
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    requireKey(body.workspace_key);
    const action = body.action || '';
    if (action === 'health') return json({ok:true, ai_configured:!!getOpenAIKey(), model:getOpenAIModel()});
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
function getOpenAIKey() {
  return String(PropertiesService.getScriptProperties().getProperty(OPENAI_KEY_PROPERTY) || '').trim();
}
function getOpenAIModel() {
  return String(PropertiesService.getScriptProperties().getProperty(OPENAI_MODEL_PROPERTY) || DEFAULT_OPENAI_MODEL).trim();
}

function saveProspect(body) {
  const p = body.prospect || {};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROSPECTS_SHEET);
  let headers = ensureProspectHeaders(sheet);

  const captureId = String(body.capture_id || '').trim();
  const profileUrl = String(p.profile_url || '').trim();
  const sourceUrl = String(p.source_url || '').trim();
  const fallbackName = String(p.name || '').trim() || nameFromProfile(profileUrl) || 'Unnamed prospect';
  const existingRow = findProspectRow(sheet, headers, profileUrl, fallbackName);
  const captureHeader = headers['Last capture ID'];

  if (existingRow && captureId && String(sheet.getRange(existingRow, captureHeader).getDisplayValue() || '') === captureId) {
    return {ok:true,duplicate:true,prospect_name:sheet.getRange(existingRow,headers['Name']).getDisplayValue() || fallbackName,row:existingRow,files:[]};
  }

  // Analyse before uploading, so screenshot-derived name/context can drive the CRM record and folder.
  const analysis = analyseProspect(p, body.files || []);
  const name = String(analysis.extracted_name || '').trim() || fallbackName;
  const folder = getOrCreateProspectFolder(name);
  const uploaded = saveFiles(folder, body.files || [], name);
  const now = new Date();

  const values = {
    'Name': name,
    'LinkedIn profile': profileUrl,
    'Source post': sourceUrl,
    'Situation': analysis.situation_summary || String(p.track || ''),
    'Why relevant': analysis.why_relevant || '',
    'Date identified': now,
    'Status': 'New',
    'Next action': analysis.next_action || 'Review draft outreach',
    'Customer angle': 'Not raised',
    'Notes': String(p.notes || '').trim(),
    'Prospect folder': folder.getUrl(),
    'Track': String(p.track || ''),
    'Source': String(p.source || ''),
    'Relationship': String(p.relationship || ''),
    'North Star': p.track === 'Redundancy / job seeker' ? 'Gold Standard 1' : '',
    'Primary objective': p.track === 'Potential customer' ? 'Customer savings' : 'Partner opportunity',
    'Last capture ID': captureId,
    'Target role': analysis.target_role || '',
    'Job preferences': buildJobPreferences(analysis),
    'Recommended approach': analysis.recommendation || '',
    'Analysis summary': analysis.analysis_summary || '',
    'Draft status': 'AI draft - review before sending'
  };

  const targetRow = existingRow || sheet.getLastRow() + 1;
  writeByHeaders(sheet, headers, targetRow, values);

  uploaded.forEach(file => appendHistory(ss, {
    prospect:name,date:now,direction:'External',type:'Screenshot - analysed',
    summary:'Captured and analysed with initial prospect record',
    file:file.url,linkedin:sourceUrl || profileUrl,
    next:analysis.next_action || 'Review draft outreach',status:'New',notes:''
  }));

  appendAnalysisHistory(ss, name, now, profileUrl, analysis);

  return {
    ok:true,
    prospect_name:name,
    row:targetRow,
    folder_url:folder.getUrl(),
    files:uploaded,
    analysis:analysis
  };
}

function analyseProspect(p, files) {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY has not been configured in Apps Script Script Properties.');

  const content = [{
    type:'input_text',
    text: buildAnalysisInput(p)
  }];

  (files || []).forEach(f => {
    const dataUrl = String(f.data_url || '');
    if (/^data:image\//.test(dataUrl)) {
      content.push({type:'input_image', image_url:dataUrl, detail:'auto'});
    }
  });

  const payload = {
    model:getOpenAIModel(),
    store:false,
    reasoning:{effort:'low'},
    instructions:RELATIONSHIP_FIRST_INSTRUCTIONS,
    input:[{role:'user',content:content}],
    text:{
      format:{
        type:'json_schema',
        name:'relationship_first_outreach',
        strict:true,
        schema:{
          type:'object',
          additionalProperties:false,
          properties:{
            extracted_name:{type:'string'},
            screenshot_types:{type:'array',items:{type:'string'}},
            situation_summary:{type:'string'},
            analysis_summary:{type:'string'},
            target_role:{type:'string'},
            target_locations:{type:'array',items:{type:'string'}},
            work_preferences:{type:'array',items:{type:'string'}},
            employment_types:{type:'array',items:{type:'string'}},
            mutual_connections:{type:'array',items:{type:'string'}},
            why_relevant:{type:'string'},
            recommendation:{type:'string',enum:['approach','relationship_first','supportive_comment_only','no_approach']},
            recommendation_reason:{type:'string'},
            public_comment:{type:'string'},
            connection_request_instruction:{type:'string'},
            first_dm:{type:'string'},
            next_action:{type:'string'}
          },
          required:[
            'extracted_name','screenshot_types','situation_summary','analysis_summary','target_role',
            'target_locations','work_preferences','employment_types','mutual_connections','why_relevant',
            'recommendation','recommendation_reason','public_comment','connection_request_instruction',
            'first_dm','next_action'
          ]
        }
      },
      verbosity:'medium'
    }
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer ' + apiKey},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  let data;
  try { data = JSON.parse(text); }
  catch (_) { throw new Error('OpenAI returned a non-JSON response (HTTP ' + status + ').'); }

  if (status < 200 || status >= 300) {
    const message = data && data.error && data.error.message ? data.error.message : 'OpenAI request failed.';
    throw new Error('OpenAI: ' + message);
  }

  const outputText = extractOutputText(data);
  if (!outputText) throw new Error('OpenAI returned no usable analysis text.');

  try { return JSON.parse(outputText); }
  catch (_) { throw new Error('OpenAI analysis could not be parsed as structured JSON.'); }
}

function extractOutputText(data) {
  if (data && typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const output = data && Array.isArray(data.output) ? data.output : [];
  for (let i=0;i<output.length;i++) {
    const content = output[i] && Array.isArray(output[i].content) ? output[i].content : [];
    for (let j=0;j<content.length;j++) {
      if (content[j] && content[j].type === 'output_text' && typeof content[j].text === 'string') return content[j].text.trim();
    }
  }
  return '';
}

function buildAnalysisInput(p) {
  return [
    'Analyse this prospect using the screenshots and supplied context.',
    '',
    'Platform: ' + String(p.source || ''),
    'Situation selected: ' + String(p.track || ''),
    'Relationship: ' + String(p.relationship || ''),
    'Source/post URL: ' + String(p.source_url || ''),
    'Profile/contact URL: ' + String(p.profile_url || ''),
    'Adrian notes: ' + String(p.notes || ''),
    '',
    'Classify each screenshot by content where possible (profile, post, job preferences, conversation/message, other).',
    'Extract only details genuinely visible or supplied. Do not invent missing facts.',
    'For Open to work/job-seeker prospects, treat their desired role/career as the primary goal and UW only as something that might sit alongside it.',
    'Return an empty string or empty array for facts not supported by the inputs.'
  ].join('\n');
}

const RELATIONSHIP_FIRST_INSTRUCTIONS = [
  'You are drafting relationship-first outreach for Adrian Croft, a UK Utility Warehouse Authorised Partner of about 15 years.',
  'Goal: relevance -> curiosity -> permission to explore. People and relationships first, business second.',
  'Use British English, natural spoken wording, simple hyphens only, and "whilst" where natural. Avoid corporate recruitment language, marketing clichés, bait-and-switch wording, excessive polish and the word "quietly".',
  'Never manufacture urgency from redundancy, financial pressure, illness, family circumstances or vulnerability.',
  'For job seekers, never position UW as a replacement for finding the right role. Explicitly protect the role/career they actually want when the evidence supports it. UW can be framed as a way to earn additional income alongside job hunting, contracting, work or family life.',
  'Public LinkedIn comments must be genuinely supportive first and must not mention UW unless the supplied context explicitly says otherwise.',
  'A normal connection request should generally carry no note/message.',
  'If a first DM is appropriate, reveal Utility Warehouse reasonably early. Describe the Authorised Partner opportunity simply as a way to earn additional income alongside whatever else they have going on in life. Adrian can mention about 15 years of experience for credibility where useful.',
  'Keep the first ask small and permission-based. A useful close is: "I simply wanted to ask if you’d be open to exploring whether it could be a good fit for you right now?" Offer information so they can decide for themselves, and make declining genuinely easy.',
  'Do not promise earnings or imply UW will solve financial problems.',
  'Assess first whether the right recommendation is approach, relationship_first, supportive_comment_only, or no_approach. Redundancy/open-to-work status alone is not sufficient reason to approach.',
  'If recommendation is supportive_comment_only or no_approach, leave first_dm empty unless a DM is genuinely appropriate for non-UW relationship-building.',
  'If there is no public post to comment on, leave public_comment empty.',
  'Preserve humanity: even if the person has no interest in UW, the outreach should still feel thoughtful and well-intentioned.',
  'Do not identify or infer sensitive personal characteristics. Use only professional/contextual details supplied or visible in the screenshots.'
].join('\n');

function appendAnalysisHistory(ss, name, now, profileUrl, a) {
  appendHistory(ss,{
    prospect:name,date:now,direction:'System',type:'AI analysis',
    summary:a.analysis_summary || a.situation_summary || '',
    file:'',linkedin:profileUrl,next:a.next_action || '',status:'AI draft',notes:a.recommendation_reason || ''
  });
  if (String(a.public_comment || '').trim()) {
    appendHistory(ss,{
      prospect:name,date:now,direction:'Draft',type:'Suggested public comment - Draft',
      summary:a.public_comment,file:'',linkedin:profileUrl,next:'Review before posting',status:'AI draft',notes:''
    });
  }
  if (String(a.connection_request_instruction || '').trim()) {
    appendHistory(ss,{
      prospect:name,date:now,direction:'Draft',type:'Connection request instruction - Draft',
      summary:a.connection_request_instruction,file:'',linkedin:profileUrl,next:'Review before action',status:'AI draft',notes:''
    });
  }
  if (String(a.first_dm || '').trim()) {
    appendHistory(ss,{
      prospect:name,date:now,direction:'Draft',type:'Suggested first DM - Draft',
      summary:a.first_dm,file:'',linkedin:profileUrl,next:'Review before sending',status:'AI draft',notes:''
    });
  }
}

function buildJobPreferences(a) {
  const parts = [];
  if ((a.target_locations || []).length) parts.push('Locations: ' + a.target_locations.join(', '));
  if ((a.work_preferences || []).length) parts.push('Work: ' + a.work_preferences.join(', '));
  if ((a.employment_types || []).length) parts.push('Employment: ' + a.employment_types.join(', '));
  return parts.join(' | ');
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
    'Last capture ID','Target role','Job preferences','Recommended approach','Analysis summary','Draft status'
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
  return decodeURIComponent(m[1]).replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
