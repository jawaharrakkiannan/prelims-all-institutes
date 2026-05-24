// build_key_comparison.js
// Generates dist/prelims_2026_institute_key_comparison.html
// Run standalone: node build_key_comparison.js
// Or called from build_all_institutes.js

const fs   = require('fs')
const path = require('path')

function readJsonOptional(p, fallback) {
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) }
  catch (e) { console.warn('Could not parse', p, e.message); return fallback }
}

function parseKey(k) {
  if (!k) return null
  const parts = String(k).trim().toUpperCase().split('/')
  const valid = parts.filter(p => 'ABCD'.includes(p) && p.length === 1)
  if (!valid.length) return null
  return valid.length === 1 ? valid[0] : valid.join('/')
}

function remapToSetA(answers, code, mapping, label) {
  const c = code ? String(code).trim().toUpperCase() : null
  if (!c || c === 'A') return answers
  if (!'BCD'.includes(c)) { console.warn('Unknown code "' + c + '" in ' + label + ' -- treating as A'); return answers }
  const codeMap = mapping[c] || {}
  if (!Object.keys(codeMap).length) {
    console.error('ERROR: ' + label + ' has code="' + c + '" but mapping is empty -- stored as-is')
    return answers
  }
  const remapped = {}
  let mapped = 0, skipped = 0
  for (const q of Object.keys(answers)) {
    const setAQ = codeMap[String(q)]
    if (setAQ !== undefined) { remapped[String(setAQ)] = answers[q]; mapped++ }
    else { skipped++ }
  }
  console.log('  Remapped Set ' + c + ' to A: ' + mapped + ' Qs' + (skipped ? ', ' + skipped + ' skipped' : ''))
  return remapped
}

// ── Load data ──────────────────────────────────────────────────────────────

const mapping   = readJsonOptional(path.join(__dirname, 'keys/paper_mapping_GS.json'), { B:{}, C:{}, D:{} })
const questions = (readJsonOptional(path.join(__dirname, 'keys/questions.json'), { questions:[] })).questions

// inverted: setAQ -> { B: codeQ, C: codeQ, D: codeQ }
const invertedMap = {}
for (const code of ['B','C','D']) {
  const cm = mapping[code] || {}
  for (const [codeQ, setAQ] of Object.entries(cm)) {
    if (!invertedMap[setAQ]) invertedMap[setAQ] = {}
    invertedMap[setAQ][code] = parseInt(codeQ)
  }
}

// codeOrder[code] = array of setAQ values in that code's serial order
const codeOrder = { A: [] }
for (let i = 1; i <= 100; i++) codeOrder.A.push(i)
for (const code of ['B','C','D']) {
  const cm = mapping[code] || {}
  const sorted = Object.entries(cm).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  const inCode = new Set()
  codeOrder[code] = []
  for (const [, setAQ] of sorted) { codeOrder[code].push(setAQ); inCode.add(setAQ) }
  for (let i = 1; i <= 100; i++) { if (!inCode.has(i)) codeOrder[code].push(i) }
}

// Institute keys
const institutesDir = path.join(__dirname, 'institutes')
const folders = fs.readdirSync(institutesDir)
  .filter(f => fs.statSync(path.join(institutesDir, f)).isDirectory())
  .sort()

const institutes = []
for (const name of folders) {
  const slug = name.replace(/\s+/g, '')
  const keyFile = path.join(institutesDir, name, slug + '_institute_key_GS.json')
  if (!fs.existsSync(keyFile)) { console.log('  Pending: ' + name); continue }
  try {
    const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'))
    const answers = remapToSetA(key.answers, key.code, mapping, keyFile)
    if (!Object.values(answers).some(v => parseKey(v))) { console.log('  Empty: ' + name); continue }
    institutes.push({ name, answers })
    console.log('  Loaded: ' + name + (key.code && key.code.toUpperCase() !== 'A' ? ' [code ' + key.code + ' to A]' : ''))
  } catch (e) { console.warn('  Could not parse ' + keyFile + ': ' + e.message) }
}

const officialRaw = readJsonOptional(path.join(__dirname, 'keys/official_key_GS.json'),
  { name:'Official UPSC Key', isOfficial:true, answers:{} })
const officialAnswers = remapToSetA(officialRaw.answers, officialRaw.code, mapping, 'official_key_GS.json')
const officialHasAnswers = Object.values(officialAnswers).some(v => parseKey(v))

const allKeys = [
  ...institutes,
  ...(officialHasAnswers ? [{ name:'UPSC Official', answers:officialAnswers, isOfficial:true }] : [])
]

// Question map
const qMap = {}
for (const q of questions) qMap[String(q.number)] = q

function it(s) { return (s || '').replace(/\*([^*]+)\*/g, '<em>$1</em>') }

function buildQHtml(qData) {
  if (!qData || !qData.question) return ''
  let h = ''

  // Context intro
  if (qData.context_intro) h += '<div class="q-lead">' + it(qData.context_intro) + '</div>'

  // Assertion block
  if (qData.assertion && qData.assertion.text) {
    h += '<div class="assertion-block">'
    if (qData.assertion.label) h += '<div class="stmt-label">' + qData.assertion.label + '</div>'
    h += '<div class="stmt-text">' + it(qData.assertion.text) + '</div>'
    h += '</div>'
  }

  // Main question stem
  h += '<div class="q-lead">' + it(qData.question) + '</div>'

  // Statements
  if (qData.statements && qData.statements.length) {
    h += '<ul class="statements">'
    for (const st of qData.statements) {
      h += '<li>' + it(st.text) + '</li>'
    }
    h += '</ul>'
  }

  // Embedded table
  if (qData.table && qData.table.headers) {
    h += '<table class="emb-tbl"><thead><tr>' +
      qData.table.headers.map(c => '<th>' + it(c) + '</th>').join('') +
      '</tr></thead><tbody>'
    for (const row of (qData.table.rows || [])) {
      h += '<tr>' + row.map(c => '<td>' + it(c) + '</td>').join('') + '</tr>'
    }
    h += '</tbody></table>'
  }

  // Scenario text
  if (qData.scenario_text) h += '<div class="q-scenario">' + it(qData.scenario_text) + '</div>'

  // Secondary stem
  if (qData.secondary_stem) h += '<div class="q-lead">' + it(qData.secondary_stem) + '</div>'

  // Secondary statements
  if (qData.secondary_statements && qData.secondary_statements.length) {
    h += '<ul class="statements">'
    for (const st of qData.secondary_statements) h += '<li>' + it(st.text) + '</li>'
    h += '</ul>'
  }

  // Question tail
  if (qData.question_tail) h += '<div class="q-tail">' + it(qData.question_tail) + '</div>'

  // Options
  if (qData.options && qData.options.length) {
    const longOpt = qData.options.some(o => (o.text || '').length > 40)
    h += '<div class="options' + (longOpt ? ' single-col' : '') + '">'
    for (const o of qData.options) {
      h += '<div class="option"><span class="opt-key">' + o.key.toUpperCase() + '</span><span class="opt-text">' + it(o.text) + '</span></div>'
    }
    h += '</div>'
  }

  return h
}

// Build rows (indexed by setAQ)
const rowsBySetAQ = {}
for (let setAQ = 1; setAQ <= 100; setAQ++) {
  const qData = qMap[String(setAQ)] || {}
  const answers = {}
  for (const k of allKeys) answers[k.name] = parseKey(k.answers[String(setAQ)]) || null
  const nonNull = Object.values(answers).filter(v => v !== null)
  const unique  = [...new Set(nonNull)]
  const status  = nonNull.length >= 2 ? (unique.length === 1 ? 'agree' : 'disagree') : 'neutral'
  const codeQNums = {
    A: setAQ,
    B: (invertedMap[setAQ] || {}).B || null,
    C: (invertedMap[setAQ] || {}).C || null,
    D: (invertedMap[setAQ] || {}).D || null
  }
  rowsBySetAQ[setAQ] = {
    setAQ,
    codeQNums,
    qHtml: buildQHtml(qData),
    subject: qData.subject || '',
    answers,
    status
  }
}

const esc = s => JSON.stringify(s).replace(/<\/script/gi, '<\\x2fscript')
const P = '#f97316'
const agreeCount    = Object.values(rowsBySetAQ).filter(r => r.status === 'agree').length
const disagreeCount = Object.values(rowsBySetAQ).filter(r => r.status === 'disagree').length

const instColHeaders = allKeys.map(k =>
  '<th' + (k.isOfficial ? ' class="col-official"' : '') + '>' + k.name + '</th>'
).join('')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Institutes Key Comparison · UPSC CSE Prelims 2026 GS1</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#F7F3EA;color:#1C1510;min-height:100vh}
.page{max-width:1200px;margin:0 auto;padding:24px 16px 60px}
header{margin-bottom:20px}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${P};margin-bottom:8px}
h1{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#1C1510;margin-bottom:4px}
.subtitle{font-family:'JetBrains Mono',monospace;font-size:11px;color:#9CA3AF;letter-spacing:.5px}
/* Controls */
.controls{margin-bottom:16px;display:flex;flex-direction:column;gap:10px}
.ctrl-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.control-label{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9CA3AF;margin-right:4px}
.tog-btn{padding:6px 16px;border-radius:8px;border:1.5px solid #E6E0D5;background:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#9CA3AF;cursor:pointer;transition:all .12s}
.tog-btn.active{background:${P};border-color:${P};color:#fff}
.tog-btn:hover:not(.active){border-color:${P};color:${P}}
/* Stats */
.stats{font-family:'JetBrains Mono',monospace;font-size:11px;color:#9CA3AF;margin-bottom:14px}
.stats span{margin-right:14px}
.s-agree{color:#15803d;font-weight:700}
.s-dis{color:#dc2626;font-weight:700}
/* Table */
.tbl-wrap{overflow-x:auto;border-radius:12px;border:2px solid #fb923c;background:#fff;box-shadow:0 2px 8px rgba(249,115,22,.12)}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:${P};color:#fff;padding:10px 12px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;position:sticky;top:0;z-index:2;border-right:1px solid rgba(255,255,255,.3)}
thead th:last-child{border-right:none}
thead th.col-official{background:#c2410c}
thead th.col-q{text-align:left;min-width:320px;max-width:420px}
thead th:first-child{width:68px}
tbody tr{border-bottom:2px solid #fed7aa;transition:background .1s}
tbody td{border-right:2px solid #fed7aa}
tbody td:last-child{border-right:none}
tbody tr:last-child{border-bottom:none}
tbody tr.row-agree{background:#f0fdf4}
tbody tr.row-disagree{background:#fef2f2}
tbody tr.row-agree:hover{background:#dcfce7}
tbody tr.row-disagree:hover{background:#fee2e2}
tbody tr:not(.row-agree):not(.row-disagree):hover{background:#FBF8F3}
td{padding:8px 12px;text-align:center;vertical-align:top}
td.td-qnum{font-family:'JetBrains Mono',monospace;font-size:.63rem;font-weight:600;color:${P};white-space:nowrap;border-right:1px solid #e2e8f0;vertical-align:top;padding-top:.85rem}
td.td-q{text-align:left;vertical-align:top;padding:.7rem .9rem;color:#374151;font-size:.88rem;line-height:1.6}
.q-lead{font-size:.9rem;color:#111827;line-height:1.65;margin-bottom:.5rem}
.assertion-block{background:#eff6ff;border:1px solid #bfdbfe;border-radius:2px;padding:.55rem .8rem;margin:.35rem 0 .65rem}
.stmt-label{font-family:'JetBrains Mono',monospace;font-size:.58rem;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#2563eb;margin-bottom:.2rem}
.stmt-text{font-size:.87rem;color:#374151;margin:.1rem 0 .4rem;line-height:1.55}
.statements{list-style:none;margin:.3rem 0 .65rem;display:flex;flex-direction:column;gap:.4rem}
.statements li{font-size:.87rem;color:#374151;line-height:1.55;background:rgba(234,88,12,.06);border:1px solid rgba(234,88,12,.18);border-left:3px solid ${P};border-radius:2px;padding:.4rem .75rem}
.q-tail{font-size:.865rem;font-style:italic;color:#14532d;background:#f0fdf4;border-radius:2px;padding:.3rem .6rem;margin:.4rem 0 .5rem;border-left:3px solid #22c55e}
.q-scenario{font-size:.875rem;color:#374151;background:#fff7ed;border:1px solid #fed7aa;border-left:3px solid ${P};border-radius:2px;padding:.4rem .75rem;margin-bottom:.5rem;line-height:1.6}
.emb-tbl{width:100%;border-collapse:collapse;font-size:.8rem;margin:.4rem 0 .55rem;border:1px solid #e2e8f0}
.emb-tbl th{background:#1e293b;color:#f1f5f9;padding:.35rem .65rem;text-align:left;font-size:.7rem;font-weight:600;border-bottom:1px solid #0f172a;font-family:'JetBrains Mono',monospace;letter-spacing:.06em}
.emb-tbl td{padding:.35rem .65rem;border-bottom:1px solid #e2e8f0;color:#374151;vertical-align:top}
.emb-tbl tr:last-child td{border-bottom:none}
.options{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .65rem;margin-top:.65rem}
.options.single-col{grid-template-columns:1fr}
.option{display:flex;align-items:flex-start;gap:.45rem;font-size:.86rem;padding:.38rem .6rem;border-radius:2px;border:1px solid #e2e8f0;background:transparent;color:#374151}
.opt-key{display:inline-flex;align-items:center;justify-content:center;width:1.2rem;height:1.2rem;min-width:1.2rem;border-radius:50%;font-family:'JetBrains Mono',monospace;font-size:.63rem;font-weight:500;margin-top:.1rem;flex-shrink:0;border:1.5px solid #cbd5e1;color:#6b7280}
.opt-text{line-height:1.45;color:inherit}
td.td-ans{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;vertical-align:middle}
td.ans-a{color:#7c3aed} td.ans-b{color:#0284c7} td.ans-c{color:#059669} td.ans-d{color:#d97706}
td.ans-null{color:#D1D5DB;font-size:11px;font-weight:400}
td.ans-ambig{color:#92400e;font-size:11px}
td.td-official{background:rgba(194,65,12,.04)}
.row-hidden{display:none}
</style>
</head>
<body>
<div class="page">
  <header>
    <p class="eyebrow">UPSC CSE Prelims 2026 &middot; GS Paper 1</p>
    <h1>Institutes Key Comparison</h1>
    <p class="subtitle">${allKeys.length} key source${allKeys.length!==1?'s':''} &middot; 100 questions &middot; ${agreeCount} agree &middot; ${disagreeCount} discrepancies</p>
  </header>

  <div class="controls">
    <div class="ctrl-row">
      <span class="control-label">Code</span>
      <button class="tog-btn active" data-code="A">A</button>
      <button class="tog-btn" data-code="B">B</button>
      <button class="tog-btn" data-code="C">C</button>
      <button class="tog-btn" data-code="D">D</button>
    </div>
    <div class="ctrl-row">
      <span class="control-label">Show</span>
      <button class="tog-btn active" data-filter="all">All</button>
      <button class="tog-btn" data-filter="agree">Agree</button>
      <button class="tog-btn" data-filter="disagree">Discrepancies</button>
    </div>
  </div>

  <p class="stats" id="stats-bar"></p>

  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th>Q No.</th>
          <th class="col-q">Question</th>
          ${instColHeaders}
        </tr>
      </thead>
      <tbody id="tbl-body"></tbody>
    </table>
  </div>
</div>

<script>
var ROWS_MAP   = ${esc(rowsBySetAQ)};
var CODE_ORDER = ${esc(codeOrder)};
var KEYS       = ${esc(allKeys.map(k => ({ name: k.name, isOfficial: !!k.isOfficial })))};

var currentCode   = 'A';
var currentFilter = 'all';

function ansClass(v) {
  if (!v) return 'ans-null';
  if (v.length > 1) return 'ans-ambig';
  return 'ans-' + v.toLowerCase();
}

function renderTable() {
  var order = CODE_ORDER[currentCode];
  var agree = 0, disagree = 0, shown = 0;
  var html = '';
  for (var idx = 0; idx < order.length; idx++) {
    var setAQ = order[idx];
    var row = ROWS_MAP[setAQ];
    if (!row) continue;
    var qNum = row.codeQNums[currentCode];
    var qDisp = qNum !== null && qNum !== undefined ? qNum : '—';
    if (row.status === 'agree') agree++;
    else if (row.status === 'disagree') disagree++;
    var hidden = (currentFilter === 'agree' && row.status !== 'agree') ||
                 (currentFilter === 'disagree' && row.status !== 'disagree');
    if (!hidden) shown++;
    var cls = row.status === 'agree' ? 'row-agree' : row.status === 'disagree' ? 'row-disagree' : '';
    if (hidden) cls += (cls ? ' ' : '') + 'row-hidden';

    var ansCells = '';
    for (var ki = 0; ki < KEYS.length; ki++) {
      var k = KEYS[ki];
      var v = row.answers[k.name];
      ansCells += '<td class="td-ans' + (k.isOfficial ? ' td-official' : '') + ' ' + ansClass(v) + '">' + (v || '—') + '</td>';
    }

    html += '<tr class="' + cls + '">' +
      '<td class="td-qnum">Q' + qDisp + '</td>' +
      '<td class="td-q">' + (row.qHtml || '') + '</td>' +
      ansCells +
      '</tr>';
  }
  document.getElementById('tbl-body').innerHTML = html;
  document.getElementById('stats-bar').innerHTML =
    '<span>' + shown + ' shown</span>' +
    '<span class="s-agree">&#10003; ' + agree + ' agree</span>' +
    '<span class="s-dis">&#10007; ' + disagree + ' discrepancies</span>';
}

document.querySelectorAll('[data-code]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('[data-code]').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentCode = btn.dataset.code;
    renderTable();
  });
});

document.querySelectorAll('[data-filter]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('[data-filter]').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTable();
  });
});

renderTable();
</script>
</body>
</html>`

const distDir = path.join(__dirname, 'dist')
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true })
fs.writeFileSync(path.join(distDir, 'prelims_2026_institute_key_comparison.html'), html)
console.log('\nBuilt: dist/prelims_2026_institute_key_comparison.html')
console.log('  ' + allKeys.length + ' key sources | ' + agreeCount + ' agree | ' + disagreeCount + ' disagree')
