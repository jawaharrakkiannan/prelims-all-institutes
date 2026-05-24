// Usage: node build_all_institutes.js <gs1|csat>
// Examples:
//   node build_all_institutes.js gs1   → dist/all-institutes-gs1-score-checker.html
//   node build_all_institutes.js csat  → dist/all-institutes-csat-score-checker.html

const fs = require('fs')
const path = require('path')

const paper = process.argv[2]
if (!paper || (paper !== 'gs1' && paper !== 'csat')) {
  console.error('Usage: node build_all_institutes.js <gs1|csat>')
  process.exit(1)
}

const isCsat = paper === 'csat'

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  catch (e) { console.error(`Failed to parse ${filePath}: ${e.message}`); process.exit(1) }
}
function readJsonOptional(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  catch (e) { console.warn(`Warning: could not parse ${filePath}: ${e.message}`); return fallback }
}

// Remap answers from a non-A paper code to Set A question numbers.
// MUST be called before storing any key whose code != A.
function remapToSetA(answers, code, mapping, label) {
  const c = code ? String(code).trim().toUpperCase() : null
  if (!c || c === 'A') return answers
  if (c !== 'B' && c !== 'C' && c !== 'D') {
    console.warn(`  WARNING: unknown code "${code}" in ${label} — treating as Set A`)
    return answers
  }
  const codeMap = mapping[c] || {}
  if (Object.keys(codeMap).length === 0) {
    console.error(`\n  !! ERROR: ${label}\n     has code="${c}" but paper_mapping_${isCsat?'CSAT':'GS'}.json is empty.\n     Answers stored AS-IS — scores WILL BE WRONG once mapping is filled!\n     Fill the mapping file before going live.\n`)
    return answers
  }
  const remapped = {}
  let mapped = 0, skipped = 0
  for (const q of Object.keys(answers)) {
    const setAQ = codeMap[String(q)]
    if (setAQ !== undefined) {
      remapped[String(setAQ)] = answers[q]
      mapped++
    } else {
      console.warn(`  WARNING: no Set-A mapping for Q${q} in code ${c} (${label}) — dropped`)
      skipped++
    }
  }
  console.log(`  Remapped Set ${c} → Set A: ${mapped} Qs${skipped ? `, ${skipped} dropped (no mapping)` : ''}`)
  return remapped
}

// Load mapping FIRST — needed before institute keys can be remapped
const mappingPath = isCsat
  ? path.join(__dirname, 'keys', 'paper_mapping_CSAT.json')
  : path.join(__dirname, 'keys', 'paper_mapping_GS.json')
const mapping = readJsonOptional(mappingPath, { B: {}, C: {}, D: {} })

// Auto-discover institutes
const institutesDir = path.join(__dirname, 'institutes')
const folders = fs.readdirSync(institutesDir)
  .filter(f => fs.statSync(path.join(institutesDir, f)).isDirectory())
  .sort()

const institutesKeys = []
for (const name of folders) {
  const slug = name.replace(/\s+/g, '')
  const keyFile = isCsat
    ? path.join(institutesDir, name, slug + '_institute_key_CSAT.json')
    : path.join(institutesDir, name, slug + '_institute_key_GS.json')
  if (!fs.existsSync(keyFile)) {
    institutesKeys.push({ name, isOfficial: false, answers: {} })
    console.log(`  Pending (no key): ${name}`)
    continue
  }
  try {
    const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'))
    const answers = remapToSetA(key.answers, key.code, mapping, keyFile)
    institutesKeys.push({ name, isOfficial: false, answers })
    const codeTag = key.code && key.code.toUpperCase() !== 'A' ? ` [code ${key.code.toUpperCase()} → remapped to A]` : ''
    console.log(`  Included: ${name}${codeTag}`)
  } catch (e) {
    console.warn(`Warning: could not parse ${keyFile}: ${e.message}`)
  }
}

if (institutesKeys.length === 0) {
  console.error(`No institute key files found for paper: ${paper}`)
  process.exit(1)
}

const officialKeyPath = isCsat
  ? path.join(__dirname, 'keys', 'official_key_CSAT.json')
  : path.join(__dirname, 'keys', 'official_key_GS.json')
const questionsPath = isCsat
  ? path.join(__dirname, 'keys', 'csat', 'questions_CSAT.json')
  : path.join(__dirname, 'keys', 'questions.json')

const officialKeyRaw = readJsonOptional(officialKeyPath, { name: 'Official UPSC Key', isOfficial: true, answers: {} })
const officialKey = {
  ...officialKeyRaw,
  answers: remapToSetA(officialKeyRaw.answers, officialKeyRaw.code, mapping, officialKeyPath)
}
const questions = readJsonOptional(questionsPath, { questions: [] })

const paperConfig = isCsat
  ? { paper: 'CSAT', totalQ: 80,  perPage: 10, totalPages: 8,  correctMark: 2.50, wrongMark: 0.8333 }
  : { paper: 'GS',   totalQ: 100, perPage: 10, totalPages: 10, correctMark: 2.00, wrongMark: 0.6667 }

const appConfig = {
  name: 'UPSC CSE Prelims 2026 Score Checker',
  contactEmail: 'upsc.ai.stack@gmail.com',
  examName: 'UPSC CSE Prelims 2026',
  examPaper: isCsat ? 'CSAT Paper 2' : 'GS Paper 1',
  primaryColor: '#f97316',
  places: [
    'Andhra Pradesh', 'Bihar', 'Delhi/NCR', 'Gujarat', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha',
    'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Other'
  ]
}

const supabasePath = path.join(__dirname, 'supabase.config.json')
let supabaseConfig
if (fs.existsSync(supabasePath)) {
  const supabase = readJson(supabasePath)
  if (!supabase.url || !supabase.anonKey || !supabase.tableAll) {
    console.error('supabase.config.json must contain: url, anonKey, tableAll')
    process.exit(1)
  }
  supabaseConfig = { url: supabase.url, anonKey: supabase.anonKey, table: supabase.tableAll }
} else {
  const url   = process.env.SUPABASE_URL
  const key   = process.env.SUPABASE_ANON_KEY
  const table = process.env.SUPABASE_TABLE_ALL || process.env.SUPABASE_TABLE
  if (!url || !key || !table) {
    console.error('No supabase.config.json and env vars SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_TABLE_ALL not set.')
    process.exit(1)
  }
  supabaseConfig = { url, anonKey: key, table }
  console.log('  Using Supabase config from environment variables.')
}

const esc = s => JSON.stringify(s).replace(/<\/script/gi, '<\\x2fscript')

const templatePath = path.join(__dirname, 'index_all_institutes.html')
if (!fs.existsSync(templatePath)) {
  console.error('index_all_institutes.html not found. Run Task 2 first to create the template.')
  process.exit(1)
}
const html = fs.readFileSync(templatePath, 'utf8')
const injected = `<script>
const APP_CONFIG      = ${esc(appConfig)};
const INSTITUTES_KEYS = ${esc(institutesKeys)};
const OFFICIAL_KEY    = ${esc(officialKey)};
const PAPER_MAPPING   = ${esc(mapping)};
const QUESTIONS       = ${esc(questions)};
const PAPER_CONFIG    = ${esc(paperConfig)};
const SUPABASE_CONFIG = ${esc(supabaseConfig)};
</script>`

const merged = html.replace('<!-- INJECT_CONFIG -->', injected)

const distDir = path.join(__dirname, 'dist')
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true })

const outFile = path.join(distDir, `all-institutes-${paper}-score-checker.html`)
fs.writeFileSync(outFile, merged)
console.log(`\nBuilt: dist/all-institutes-${paper}-score-checker.html (${institutesKeys.length} institute${institutesKeys.length !== 1 ? 's' : ''})`)

// Generate landing page on gs1 build only
if (!isCsat) {
  const P = appConfig.primaryColor || '#f97316'
  const landing = `<!DOCTYPE html>
<!-- Support: upsc.ai.stack@gmail.com — mail for a quick reply -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${appConfig.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#F7F3EA;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px}
.wrap{width:100%;max-width:440px}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${P};margin-bottom:12px}
h1{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#1C1510;line-height:1.25;margin-bottom:6px}
.sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:#9CA3AF;letter-spacing:.5px;margin-bottom:36px}
.paper-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:20px 22px;border-radius:14px;border:2px solid #E6E0D5;background:#fff;cursor:pointer;text-align:left;transition:border-color .15s,box-shadow .15s;margin-bottom:14px;text-decoration:none;color:inherit}
.paper-btn:hover{border-color:${P};box-shadow:0 4px 16px rgba(0,0,0,.08)}
.paper-btn__left{}
.paper-btn__tag{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${P};margin-bottom:4px}
.paper-btn__name{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:#1C1510}
.paper-btn__meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9CA3AF;margin-top:3px}
.paper-btn__arrow{font-size:20px;color:${P};flex-shrink:0;margin-left:12px}
.paper-btn--primary{background:${P};border-color:${P}}
.paper-btn--primary .paper-btn__tag{color:rgba(255,255,255,.75)}
.paper-btn--primary .paper-btn__name{color:#fff}
.paper-btn--primary .paper-btn__meta{color:rgba(255,255,255,.65)}
.paper-btn--primary .paper-btn__arrow{color:#fff}
.paper-btn--primary:hover{border-color:${P};box-shadow:0 4px 20px rgba(249,115,22,.35)}
.footer{margin-top:32px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#C4BDB3;letter-spacing:.5px}
.divider{display:flex;align-items:center;gap:10px;margin:24px 0 16px}
.divider-line{flex:1;height:1px;background:#E6E0D5}
.divider-label{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4BDB3;white-space:nowrap}
.res-group{display:flex;flex-direction:column;width:100%}
.res-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 22px;border-radius:14px;border:2px solid #E6E0D5;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s;margin-bottom:14px;text-decoration:none;color:#1C1510;font-family:'Playfair Display',serif;font-size:17px;font-weight:400;width:100%}
.res-btn:hover{border-color:${P};box-shadow:0 2px 12px rgba(0,0,0,.07)}
.res-btn svg{flex-shrink:0;color:#6B7280;width:18px;height:18px}
.box-2026{border:2px solid ${P};border-radius:16px;background:#fff7ed;padding:16px;margin-bottom:14px}
.box-2026-badge{display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${P};margin-bottom:12px}
.box-2026-badge::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:${P}}
.box-2026 .res-btn{background:#fff;border-color:#FDDCB5;margin-bottom:10px}
.box-2026 .res-btn:last-child{margin-bottom:0}
.box-2026 .res-btn:hover{border-color:${P};background:#fff7ed}
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Score Checker</p>
  <h1>${appConfig.examName}</h1>
  <p class="sub">Select your paper to check your score</p>

  <a href="/gs1" class="paper-btn paper-btn--primary">
    <div class="paper-btn__left">
      <div class="paper-btn__tag">Paper 1</div>
      <div class="paper-btn__name">General Studies</div>
      <div class="paper-btn__meta">100 Questions &middot; 200 Marks &middot; +2 / &minus;0.67</div>
    </div>
    <span class="paper-btn__arrow">&#8594;</span>
  </a>

  <a href="/csat" class="paper-btn">
    <div class="paper-btn__left">
      <div class="paper-btn__tag">Paper 2</div>
      <div class="paper-btn__name">CSAT</div>
      <div class="paper-btn__meta">80 Questions &middot; 200 Marks &middot; +2.5 / &minus;0.83</div>
    </div>
    <span class="paper-btn__arrow" style="color:#9CA3AF">&#8594;</span>
  </a>

  <div class="divider"><span class="divider-line"></span><span class="divider-label">Resources</span><span class="divider-line"></span></div>

  <div class="box-2026">
    <div class="box-2026-badge">UPSC CSE Prelims 2026</div>
    <a href="/prelims_2026_gs_paper.html" class="res-btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
      UPSC 2026 Question Paper
    </a>
    <a href="/prelims_2026_subject_analysis.html" class="res-btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>
      UPSC 2026 Subject-wise Analysis
    </a>
    <a href="/prelims_2026_institute_key_comparison.html" class="res-btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
      Institutes Key Comparison
    </a>
  </div>

  <div class="res-group">
  <a href="/total-qns-attempt-planner.html" class="res-btn">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
    No. of Questions Attempt Strategy
  </a>
  <a href="/upsc_prelims_cutoff.html" class="res-btn">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
    Previous Years Cut-off Details
  </a>
  <a href="/gs_prelims_pyqs_question_bank.html" class="res-btn">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
    UPSC CSE Prelims GS Question Bank
  </a>
  <a href="/gs_mains_pyqs_question_bank.html" class="res-btn">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
    UPSC CSE Mains GS Question Bank
  </a>
  </div>

  <p class="footer">${appConfig.contactEmail}</p>
</div>
</body>
</html>`
  fs.writeFileSync(path.join(distDir, 'index.html'), landing)
  console.log('Built: dist/index.html (paper selector)')

  // Build key comparison page
  require('./build_key_comparison.js')
}
