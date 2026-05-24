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
    institutesKeys.push({ name, isOfficial: false, answers: key.answers })
    console.log(`  Included: ${name}`)
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
const mappingPath = isCsat
  ? path.join(__dirname, 'keys', 'paper_mapping_CSAT.json')
  : path.join(__dirname, 'keys', 'paper_mapping_GS.json')
const questionsPath = isCsat
  ? path.join(__dirname, 'keys', 'csat', 'questions_CSAT.json')
  : path.join(__dirname, 'keys', 'questions.json')

const officialKey  = readJsonOptional(officialKeyPath, { name: 'Official UPSC Key', isOfficial: true, answers: {} })
const mapping      = readJsonOptional(mappingPath, { B: {}, C: {}, D: {} })
const questions    = readJsonOptional(questionsPath, { questions: [] })

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
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${appConfig.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
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

  <p class="footer">${appConfig.contactEmail}</p>
</div>
</body>
</html>`
  fs.writeFileSync(path.join(distDir, 'index.html'), landing)
  console.log('Built: dist/index.html (paper selector)')
}
