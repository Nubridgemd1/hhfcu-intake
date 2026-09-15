const fs=require('fs');
let h=fs.readFileSync('index.html','utf8');
const before=h.length;

// 1) title
h=h.replace(/<title>[^<]*<\/title>/, '<title>Open a Business Account — Heritage Hub FCU</title>');

// 2) remove standalone site header + footer (the Duda page already provides site nav/footer)
h=h.replace(/<header class="hh">[\s\S]*?<\/header>\s*/, '');
h=h.replace(/<footer class="hh">[\s\S]*?<\/footer>\s*/, '');

// 3) body background -> white so it blends into the host page
h=h.replace('body{margin:0;background:var(--bg);', 'body{margin:0;background:#ffffff;');

// 4) main padding (no fixed bar to reserve space for)
h=h.replace('main{max-width:920px;margin:0 auto;padding:20px 16px 140px}',
            'main{max-width:960px;margin:0 auto;padding:14px 16px 28px}');

// 5) submit bar: fixed -> in-flow card (works inside an auto-sized iframe)
h=h.replace('.submitbar{position:fixed;left:0;right:0;bottom:0;background:rgba(255,255,255,.97);backdrop-filter:blur(6px);border-top:1px solid var(--line);box-shadow:0 -4px 18px rgba(18,40,76,.08);z-index:50}',
            '.submitbar{position:sticky;bottom:0;background:rgba(255,255,255,.97);backdrop-filter:blur(6px);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);margin-top:8px;z-index:50}');

// 6) replace the intro block with a compact page title for the embed
h=h.replace(/<div class="intro">[\s\S]*?<\/div>\s*/,
`<div class="page-title">
    <h1>Open a Business Account</h1>
    <p>Apply online in minutes. Choose <strong>Simple (single owner)</strong> or <strong>Full business (BSA)</strong> below — these replace the printable <em>Single-Owner</em> and <em>Multiple-Owner</em> applications. Upload documents from your phone, camera, or computer (any file type). Fields marked <span style="color:var(--danger)">*</span> are required.</p>
  </div>
`);

// 7) add page-title styles + a small "embedded" tidy-up before </style>
h=h.replace('</style>',
`  .page-title{margin:2px 0 16px}
  .page-title h1{margin:0 0 6px;font-family:var(--serif);color:var(--navy);font-size:1.55rem;letter-spacing:.3px;line-height:1.15}
  .page-title p{margin:0;color:var(--muted);font-size:.92rem;max-width:70ch}
  /* embed: keep the review modal visible within the iframe viewport */
  .overlay{position:absolute}
</style>`);

// 8) auto-resize reporter so the parent iframe can size to content (no inner scrollbar)
h=h.replace('</body>',
`<script>
/* Embed auto-resize: tells the parent page how tall the form is so the iframe can grow to fit. */
(function(){
  function docH(){return Math.max(document.documentElement.scrollHeight, document.body?document.body.scrollHeight:0);}
  function report(){try{parent.postMessage({hhfcuEmbedHeight:docH()},'*');}catch(e){}}
  window.addEventListener('load',report);
  window.addEventListener('resize',report);
  if(window.ResizeObserver){try{new ResizeObserver(report).observe(document.body);}catch(e){}}
  ['click','input','change'].forEach(function(ev){document.addEventListener(ev,function(){setTimeout(report,120);});});
  setInterval(report,1500);
  report();
})();
</script>
</body>`);

fs.writeFileSync('business-application.html',h);
console.log('wrote business-application.html', h.length, 'chars (from', before, ')');
// sanity
['<header class="hh">','<footer class="hh">'].forEach(s=>console.log('removed', s, '->', h.includes(s)?'STILL PRESENT!':'ok'));
['<div class="page-title">','hhfcuEmbedHeight','Open a Business Account'].forEach(s=>console.log('has', s, '->', h.includes(s)?'ok':'MISSING!'));
