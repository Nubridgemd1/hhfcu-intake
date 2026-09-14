/**
 * Heritage Hub FCU - Business Membership Intake: submission endpoint.
 * Google Apps Script Web App. Zero infrastructure: it stores the uploaded files
 * in Google Drive and emails a summary to HHFCU. No server, no API keys.
 *
 * ---------- DEPLOY (about 5 minutes) ----------
 * 1. Go to https://script.google.com  (sign in with the HHFCU Google account
 *    that owns info@heritagehubfederal.org, so files + email stay in-house).
 * 2. New project. Delete the sample code. Paste THIS whole file. Save.
 * 3. Deploy > New deployment > gear icon > "Web app".
 *      Description:  HHFCU intake
 *      Execute as:   Me
 *      Who has access: Anyone
 *    Deploy > Authorize access (allow Drive + Gmail) > copy the "Web app URL".
 * 4. In the form's index.html, set:  submitEndpoint: "PASTE_THE_WEB_APP_URL"
 * 5. Submit a test application and confirm the email + Drive folder arrive.
 *    To update later: Deploy > Manage deployments > edit > Version: New version.
 * ----------------------------------------------
 */

var NOTIFY_EMAIL  = 'info@heritagehubfederal.org';   // where submissions are emailed
var DRIVE_FOLDER  = 'HHFCU Membership Applications';  // parent folder created in Drive
var SENSITIVE     = /ssn|itin|id_num|idnumber|cvc|card|account|routing/i; // masked in email

function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents);
    var app  = body.application || {};
    var docs = body.documents || [];
    var name = app.legal_business_name || app.sign_name || 'Applicant';
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    // 1) store every uploaded file in a per-application Drive folder
    var folder = getFolder_(DRIVE_FOLDER).createFolder(name + ' - ' + stamp);
    var links = [];
    for (var i = 0; i < docs.length; i++){
      var d = docs[i];
      if (!d.contentBase64) continue;
      var blob = Utilities.newBlob(Utilities.base64Decode(d.contentBase64),
                   d.mimeType || 'application/octet-stream', d.filename || ('file-' + i));
      links.push('- ' + (d.label || d.box) + ': ' + folder.createFile(blob).getUrl());
    }
    if (app._signatureDataUrl){
      var sig = String(app._signatureDataUrl).split(',')[1];
      if (sig) folder.createFile(Utilities.newBlob(Utilities.base64Decode(sig), 'image/png', 'signature.png'));
    }

    // 2) readable summary (sensitive fields masked in the email; full data is in Drive)
    var lines = [];
    Object.keys(app).forEach(function(k){
      if (k.charAt(0) === '_') return;
      var val = app[k]; if (Array.isArray(val)) val = val.join(', ');
      lines.push(k + ': ' + (SENSITIVE.test(k) ? mask_(val) : val));
    });

    var summary =
      'New Heritage Hub FCU membership application\n' +
      'Type: ' + (app.formScope || '') + '\nReceived: ' + stamp + '\n\n' +
      lines.join('\n') +
      '\n\nDocuments (' + docs.length + '):\n' + (links.join('\n') || '- none') +
      '\n\nSecure folder: ' + folder.getUrl();

    // 3) email HHFCU
    MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: 'New membership application - ' + name, body: summary });

    return json_({ received: true, reference: folder.getId() });
  } catch (err){
    try { MailApp.sendEmail(NOTIFY_EMAIL, 'HHFCU intake - submission error', String(err)); } catch (x){}
    return json_({ received: false, error: String(err) });
  }
}

function doGet(){ return ContentService.createTextOutput('HHFCU intake endpoint is running.'); }
function getFolder_(nm){ var it = DriveApp.getFoldersByName(nm); return it.hasNext() ? it.next() : DriveApp.createFolder(nm); }
function mask_(v){ v = String(v); return v.length <= 4 ? '****' : ('**** ' + v.slice(-4)); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
