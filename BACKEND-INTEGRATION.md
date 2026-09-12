# Heritage Hub FCU — Intake Form Backend Integration

This form is a single static page (`index.html`). It has **one** integration point: a submit
endpoint you host. Once set, the form POSTs the completed application (all fields + uploaded
documents + signature) to your server as `multipart/form-data`.

---

## 1. Wire the endpoint (one line)

At the top of `index.html`, in the `<script>` config block:

```js
window.HHFCU_CONFIG = {
  submitEndpoint: "https://api.heritagehubfederal.org/intake",  // <-- YOUR HTTPS endpoint
  submitMethod:   "POST",
  extraHeaders:   {},        // optional, e.g. { "x-api-key": "…" }  (do NOT put real secrets in client code)
  maxFileMB:      25,
  maxFilesPerBox: 12,
  orgName:        "Heritage Hub Federal Credit Union"
};
```

Until `submitEndpoint` is set the form runs in **safe review mode** (validates + lets the applicant
download a summary; transmits nothing).

---

## 2. The request

- **Method:** `POST`
- **Content-Type:** `multipart/form-data` (the browser sets the boundary automatically — do not override)
- **Body parts:**

| Part name | Type | Description |
|---|---|---|
| `application` | text (JSON string) | **The full structured payload — treat this as the source of truth.** |
| *(each scalar field)* | text | Every text field is ALSO sent as its own flat form field (convenience for form parsers). |
| `doc_ein` | file(s) | EIN letter (CP-575) / W-9 |
| `doc_formation` | file(s) | Certificate of Formation / Incorporation / filing |
| `doc_dba` | file(s) | DBA / assumed-name certificate |
| `doc_governing` | file(s) | Operating/Partnership Agreement / Bylaws |
| `doc_id_owner` | file(s) | Government photo ID — owner(s) |
| `doc_id_control` | file(s) | Government photo ID — control person |
| `doc_resolution` | file(s) | Authorizing resolution |
| `doc_other` | file(s) | Other supporting documents |

> Any box can carry **multiple files under the same field name** (`doc_id_owner` × N). Original
> filenames are preserved. **All content types are accepted** — `application/pdf`, `image/jpeg`,
> `image/png`, `image/heic`, `application/msword`, `…openxmlformats…`, etc. Do not assume PDF-only.

### `application` JSON — shape

```jsonc
{
  "_meta": { "org": "Heritage Hub Federal Credit Union",
             "formScope": "simple" | "full",
             "submittedAt": "2026-09-11T21:30:00.000Z",
             "userAgent": "…" },

  // Section 1 — business
  "legal_business_name": "…", "dba_name": "…", "ein": "12-3456789",
  "date_established": "05/2025", "state_formation": "TX", "entity_type": "Multi-Member LLC",
  "phys_address": "…", "phys_city": "…", "phys_state": "TX", "phys_zip": "77057",
  "biz_phone": "(832) 941-9122", "biz_email": "…", "website": "…", "naics": "…",
  "business_purpose": "…",

  // Section 2 — BSA (full only)
  "est_deposits": "10000.00", "est_withdrawals": "…", "avg_txn": "…", "largest_txn": "…",
  "activity": ["International wire transfers", "Remote deposit capture"],   // array
  "deposit_source": "Business operations",

  // Section 3 — owners (owner_*_N, N = 1..4)
  "owner_name_1": "…", "owner_title_1": "…", "owner_dob_1": "01/01/1980",
  "owner_ssn_1": "000-00-0000", "owner_pct_1": "100", "owner_addr_1": "…",
  "owner_city_1": "…", "owner_state_1": "…", "owner_zip_1": "…",
  "owner_phone_1": "…", "owner_email_1": "…",
  "owner_id_type_1": "Driver License", "owner_id_num_1": "…",
  "owner_id_issuer_1": "TX", "owner_id_exp_1": "…",

  // Section 4 — control person (full only)
  "control_same": true, "control_same_num": "1",     // or the ctrl_* fields below
  "ctrl_name": "…", "ctrl_title": "…", "ctrl_dob": "…", "ctrl_ssn": "…", "…": "…",

  // Section 5 — signers (signer_*_N, N = 1..3)
  "signer_name_1": "…", "signer_title_1": "…", "…": "…",

  // Section 6 — eligibility (array)
  "eligibility": ["Work", "Live"], "seg": "…", "family_member": "…", "eligibility_other": "…",

  // Section 7 — accounts (array) + deposits
  "accounts": ["Business Share Savings", "Share Draft (Checking)"],
  "cd_term": "…", "cd_amount": "…", "fee_par": "5.00",
  "dep_savings": "…", "dep_checking": "…", "dep_cdmm": "…",

  // Section 8 — beneficiaries (bene_*_N, N = 1..2)
  "bene_name_1": "…", "bene_rel_1": "…", "bene_pct_1": "…", "…": "…",

  // Section 10 — consents + e-signature
  "esign_consent": [true], "agree": [true], "esign_adopt": [true],
  "sign_name": "…", "sign_title": "…", "sign_date": "09/11/2026",

  "_signatureDataUrl": "data:image/png;base64,iVBORw0KGgo…",   // signature image
  "_esign": {
    "mode": "draw" | "type",
    "typedName": "Jane A. Doe" | null,
    "signedAt": "2026-09-11T21:29:40.000Z",
    "consents": { "esign_communications": true, "agreement": true, "signature_adoption": true },
    "signerName": "…",
    "userAgent": "…"
  }
}
```

**Notes**
- Checkbox groups (`activity`, `eligibility`, `accounts`, and the consent boxes) arrive as **arrays**.
- `_signatureDataUrl` is a base64 PNG data URL — strip the `data:image/png;base64,` prefix and decode to store the signature image.
- For a compliant e-sign audit trail, **record the signer's IP address and an authoritative server-side
  receipt timestamp** on your end (the browser cannot capture IP); combine with `_esign` from the payload.

---

## 3. The response

- Return **HTTP 2xx** on success — the form shows a success message to the applicant.
- Any **non-2xx** → the form shows an error and invites retry.
- Recommended body (optional): `{ "status": "ok", "reference": "HH-2026-000123" }`.

---

## 4. Security requirements (this form collects SSNs & IDs)

- **HTTPS/TLS only.** Never accept this payload over plain HTTP.
- **Enforce size limits server-side** (client caps 25 MB/file, but validate again).
- **Scan uploads** (AV) and store in **encrypted** storage; restrict access to authorized staff.
- **Encrypt PII at rest** (SSN/ITIN, ID numbers). Consider tokenization.
- **CORS:** if the form is hosted on the **same origin** as the API, nothing to do. If it's on a
  **different origin** (e.g., the GitHub Pages preview posting to your API), your endpoint must send
  `Access-Control-Allow-Origin: <form-origin>` and allow `POST`. For production, host the page and the
  API on the same domain to avoid CORS entirely.

---

## 5. Example handlers

### Node.js / Express (multer, memory storage)

```js
const express = require('express');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });
const app = express();

// accept any doc_* file fields + text fields
app.post('/intake', upload.any(), (req, res) => {
  const application = JSON.parse(req.body.application || '{}');
  // req.files = [{ fieldname:'doc_ein', originalname, mimetype, buffer, size }, ...]
  // TODO: persist application (encrypt PII), store req.files (AV scan + encrypt),
  //       decode application._signatureDataUrl, record req.ip + Date.now() for e-sign audit.
  return res.json({ status: 'ok', reference: makeRef() });
});
```

### Python / Flask

```python
from flask import Flask, request, jsonify
import json
app = Flask(__name__)

@app.post("/intake")
def intake():
    application = json.loads(request.form.get("application", "{}"))
    files = request.files  # keys: doc_ein, doc_formation, doc_id_owner, ...
    for key in files:
        for f in request.files.getlist(key):
            pass  # f.filename, f.mimetype, f.read()  -> AV scan + encrypt + store
    # record request.remote_addr + server timestamp for the e-sign audit trail
    return jsonify(status="ok", reference=make_ref())
```

---

*Heritage Hub Federal Credit Union — membership intake integration. Confidential.*
