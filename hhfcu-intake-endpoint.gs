/**
 * Heritage Hub FCU - Business Membership Intake: submission endpoint.
 * Google Apps Script Web App. Zero infrastructure, no server, no API keys.
 *
 * WHAT IT DOES: on each submission it EMAILS the whole application to HHFCU with
 * EVERY uploaded document (and the signature) ATTACHED. The email SUBJECT is the
 * Business name. If the files are too large for one email, it instead saves them
 * to Google Drive and emails secure links (so delivery never fails).
 *
 * ---------- DEPLOY (about 5 minutes) ----------
 * 1. Go to https://script.google.com and sign in with a Google account the
 *    credit union controls (a dedicated "HHFCU Operations" Google account is
 *    ideal; a personal Gmail is not). NOTE: info@heritagehubfederal.org is a
 *    Microsoft 365 mailbox, so you can't sign in AS it here - this script just
 *    SENDS the email TO it. The chosen Google account is only a relay/sender.
 * 2. New project. Delete the sample code. Paste THIS whole file. Save.
 * 3. Deploy > New deployment > (gear) "Web app".
 *      Execute as:   Me
 *      Who has access: Anyone
 *    Deploy > Authorize access (allow Gmail + Drive) > copy the "Web app URL".
 * 4. Send that URL back; it gets set as submitEndpoint in the form.
 * 5. Submit a test application and confirm the email (with attachments) arrives
 *    at info@heritagehubfederal.org. To edit later: Deploy > Manage deployments
 *    > edit > Version: New version.
 * ----------------------------------------------
 */

var NOTIFY_EMAIL  = 'info@heritagehubfederal.org';      // where every application is emailed
var DRIVE_FOLDER  = 'HHFCU Membership Applications';     // only used as large-file fallback
var ATTACH_LIMIT  = 20 * 1024 * 1024;                   // ~20 MB: Exchange-safe cap for one email
var SENSITIVE     = /ssn|itin|id_num|idnumber|cvc|card|account|routing/i; // masked in the body text

function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents);
    var app  = body.application || {};
    var docs = body.documents || [];
    var name = String(app.legal_business_name || app.sign_name || 'Business Application').trim();
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    // 1) turn every uploaded file (+ signature) into an email attachment
    var attachments = [], total = 0;
    for (var i = 0; i < docs.length; i++){
      var d = docs[i]; if (!d.contentBase64) continue;
      var bytes = Utilities.base64Decode(d.contentBase64);
      total += bytes.length;
      attachments.push(Utilities.newBlob(bytes, d.mimeType || 'application/octet-stream',
                        d.filename || ('document-' + (i + 1))));
    }
    if (app._signatureDataUrl){
      var sig = String(app._signatureDataUrl).split(',')[1];
      if (sig){ var sb = Utilities.base64Decode(sig); total += sb.length;
                attachments.push(Utilities.newBlob(sb, 'image/png', 'signature.png')); }
    }

    // 2) readable summary of the application (sensitive fields masked in the text)
    var lines = [];
    Object.keys(app).forEach(function(k){
      if (k.charAt(0) === '_') return;
      var val = app[k]; if (Array.isArray(val)) val = val.join(', ');
      lines.push(k + ': ' + (SENSITIVE.test(k) ? mask_(val) : val));
    });
    var summary =
      'New Heritage Hub FCU membership application\n' +
      'Business: ' + name + '\n' +
      'Type: ' + (app.formScope || '') + '\n' +
      'Received: ' + stamp + '\n' +
      'Documents: ' + attachments.length + '\n\n' +
      lines.join('\n');

    // 3) email HHFCU. Subject = Business name. Attach everything if it fits.
    if (total <= ATTACH_LIMIT){
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: name,
        body: summary + '\n\n(All ' + attachments.length + ' uploaded document(s) are attached to this email.)',
        attachments: attachments
      });
    } else {
      // too large for one email -> store in Drive, email secure links so delivery still succeeds
      var folder = getFolder_(DRIVE_FOLDER).createFolder(name + ' - ' + stamp);
      var links = [];
      for (var j = 0; j < attachments.length; j++){
        links.push('- ' + attachments[j].getName() + ': ' + folder.createFile(attachments[j]).getUrl());
      }
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: name,
        body: summary + '\n\nThe uploaded files were too large to attach; secure links:\n' +
              links.join('\n') + '\n\nSecure folder: ' + folder.getUrl()
      });
    }

    return json_({ received: true });
  } catch (err){
    try { MailApp.sendEmail(NOTIFY_EMAIL, 'HHFCU intake - submission error', String(err)); } catch (x){}
    return json_({ received: false, error: String(err) });
  }
}

function doGet(){ return ContentService.createTextOutput('HHFCU intake endpoint is running.'); }
function getFolder_(nm){ var it = DriveApp.getFoldersByName(nm); return it.hasNext() ? it.next() : DriveApp.createFolder(nm); }
function mask_(v){ v = String(v); return v.length <= 4 ? '****' : ('**** ' + v.slice(-4)); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
