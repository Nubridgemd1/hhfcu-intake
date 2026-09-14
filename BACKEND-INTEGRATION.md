# Heritage Hub FCU - Intake Form: Backend Integration

The form is **not** a `mailto:` form. It submits over HTTPS to one endpoint you choose.
Set that endpoint once and it delivers every submission (fields **+ uploaded files**) reliably on all devices.

**One config line** (top of `index.html`, in `HHFCU_CONFIG`):
```js
window.HHFCU_CONFIG = {
  submitEndpoint: "https://<your-endpoint>",   // <-- the ONLY thing required
  maxFileMB: 25, maxFilesPerBox: 12, orgName: "Heritage Hub Federal Credit Union"
};
```
Until it is set, the form runs in safe "review/download" mode and transmits nothing.

---

## What the form sends
A single **HTTP POST** whose body is **JSON** (Content-Type `text/plain;charset=utf-8`, so it works cross-origin with no preflight):

```jsonc
{
  "application": {
    "_meta": { "org": "...", "formScope": "simple|full", "submittedAt": "ISO-8601", "userAgent": "..." },
    "legal_business_name": "...", "ein": "...", "entity_type": "...",
    "phys_address": "...", "biz_email": "...", "business_purpose": "...",
    "owner_name_1": "...", "owner_ssn_1": "...", "owner_id_num_1": "...",   // section fields
    "eligibility": ["Work","Live"], "accounts": ["Share Savings"],          // checkbox groups = arrays
    "sign_name": "...", "sign_date": "...",
    "_signatureDataUrl": "data:image/png;base64,....",                      // signature image
    "_esign": { "mode":"draw|type", "signedAt":"ISO", "consents": { ... } }
  },
  "documents": [
    { "box":"ein", "label":"EIN Letter (CP-575) or W-9", "filename":"ein.pdf",
      "mimeType":"application/pdf", "size":48213, "contentBase64":"JVBERi0xLj..." }
    // one entry per uploaded file: EIN, formation, DBA, governing docs, owner ID(s), control ID, resolution, other
  ]
}
```
- Checkbox groups (`eligibility`, `accounts`, consents) arrive as **arrays**.
- Each file is **base64** in `documents[].contentBase64` (decode to store). `_signatureDataUrl` is a base64 PNG.
- Return **HTTP 200** on success. The form shows success on delivery.

---

## Two ways to receive it

### Option A - Google Apps Script (zero backend, recommended to start)
Use the included **`hhfcu-intake-endpoint.gs`**. It stores every file in Google Drive and emails a
masked summary + Drive links to `info@heritagehubfederal.org`. No server, no API keys.
Deploy steps are in the top comment of that file (about 5 minutes) - then paste the Web App URL as `submitEndpoint`.

### Option B - your own backend
Any stack. Parse the JSON body, base64-decode each `documents[].contentBase64`, store the files in
**encrypted, access-controlled** storage, notify staff, return 200. Example (Node/Express):
```js
app.post("/intake", express.text({limit:"30mb", type:"*/*"}), (req, res) => {
  const { application, documents } = JSON.parse(req.body);
  documents.forEach(d => {
    const bytes = Buffer.from(d.contentBase64, "base64");
    // save `bytes` as d.filename (d.mimeType) to secure storage; d.box tells you which doc it is
  });
  // persist `application`, notify staff (link to files - do NOT email SSNs/IDs)
  res.json({ received: true });
});
```

---

## Security (this form collects SSNs, IDs, beneficial ownership)
- **HTTPS only.** Files stored **encrypted at rest**, access restricted to authorized staff.
- **Never email SSNs / ID images as attachments or plain text.** Email a summary + a link; keep the
  documents in controlled storage. (The Apps Script masks SSN/ITIN/ID/account/routing in the email body.)
- Enforce the 25 MB/file limit server-side; scan uploads if possible.
- Endpoint controlled by HHFCU (or a security-reviewed vendor - not a generic email relay).

*Prepared for the Heritage Hub FCU intake form. The live form: nubridgemd1.github.io/hhfcu-intake*
