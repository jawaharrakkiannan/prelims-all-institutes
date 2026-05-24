# UPSC Prelims All-Institutes Score Checker — Project Bible

## What This Is

Multi-institute UPSC prelims score checker. Students enter their responses (Set A/B/C/D) and instantly see their score against every institute's key and the official UPSC key — all on one page.

Live URL: **https://prelims-cse-score-checker.vercel.app**
- `/gs1` → GS Paper 1 checker (100 Qs)
- `/csat` → CSAT Paper 2 checker (80 Qs)
- `/` → paper selector landing page

GitHub: https://github.com/jawaharrakkiannan/prelims-all-institutes

## Build System

```
node build_all_institutes.js gs1    → dist/all-institutes-gs1-score-checker.html
node build_all_institutes.js csat   → dist/all-institutes-csat-score-checker.html
```

Both papers in one command (same as Vercel):
```
node build_all_institutes.js gs1 && node build_all_institutes.js csat
```

`build_all_institutes.js` auto-discovers every folder under `institutes/`, reads their key files, and injects all data as `<script>const VAR = JSON</script>` at the `<!-- INJECT_CONFIG -->` placeholder in `index_all_institutes.html`.

## File Structure

```
prelims-all-institutes/
├── index_all_institutes.html          ← Master template (edit this, never dist/)
├── build_all_institutes.js            ← Build script
├── seed-all.js                        ← Playwright seeder for test submissions
├── vercel.json                        ← Vercel build + routing config
├── .gitignore                         ← Excludes dist/, node_modules/, supabase.config.json, .vercel
├── institutes/
│   ├── Aram IAS/                      ← Empty folder → shows as "Pending" card
│   ├── Forum IAS/
│   │   ├── ForumIAS_institute_key_GS.json
│   │   └── ForumIAS_institute_key_CSAT.json
│   ├── IAS Baba/
│   │   ├── IASBaba_institute_key_GS.json
│   │   └── IASBaba_institute_key_CSAT.json
│   ├── Next IAS/
│   ├── Shankar IAS/
│   ├── Vajiram/
│   └── Vision IAS/
├── keys/
│   ├── official_key_GS.json           ← UPSC official GS1 answers (placeholder until post-exam)
│   ├── official_key_CSAT.json         ← UPSC official CSAT answers (placeholder until post-exam)
│   ├── paper_mapping_GS.json          ← GS1 B/C/D→A permutations (empty until post-exam)
│   └── paper_mapping_CSAT.json        ← CSAT B/C/D→A permutations (empty until post-exam)
└── dist/                              ← Build artifacts (gitignored, never edit directly)
```

## Injected Variables

| JS Variable | Source | Purpose |
|---|---|---|
| `APP_CONFIG` | hardcoded in build script | Branding, exam name, contact |
| `INSTITUTES_KEYS` | auto-discovered from `institutes/` | Array of all institute keys |
| `OFFICIAL_KEY` | `keys/official_key_GS.json` or `official_key_CSAT.json` | UPSC official answers |
| `PAPER_MAPPING` | `keys/paper_mapping_GS.json` or `paper_mapping_CSAT.json` | Maps Q# in Set B/C/D → Set A Q# |
| `QUESTIONS` | `keys/questions.json` | Question text + subject/topic data |
| `PAPER_CONFIG` | hardcoded in build script | Paper-specific constants |
| `SUPABASE_CONFIG` | `supabase.config.json` or env vars | Supabase endpoint + anon key + table |

### INSTITUTES_KEYS format

Each entry:
```json
{ "name": "IAS Baba", "isOfficial": false, "answers": { "1": "A", "2": "C", ... } }
```

Institute with no key file → `answers: {}` → shows "Pending" card on result screen.

### PAPER_CONFIG Schema

```js
// gs1
{ paper: 'GS',   totalQ: 100, perPage: 10, totalPages: 10, correctMark: 2.00, wrongMark: 0.6667 }
// csat
{ paper: 'CSAT', totalQ: 80,  perPage: 10, totalPages: 8,  correctMark: 2.50, wrongMark: 0.8333 }
```

## Supabase Config

**Local** (`supabase.config.json` — gitignored, create manually):
```json
{
  "url": "https://xaybjdmntzmsmwkhciqj.supabase.co",
  "anonKey": "<anon-key>",
  "tableAll": "prelims_scores"
}
```

**Vercel** (env vars set on the project):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_TABLE_ALL` = `prelims_scores`

Build reads `supabase.config.json` first; falls back to env vars if file absent.

## institute Key File Format

```json
{
  "name": "Institute Display Name",
  "isOfficial": false,
  "answers": {
    "1": "A", "2": "B", ..., "100": "C"
  }
}
```

- Missing Q = dropped (0 marks, skipped in scoring)
- `""` or any non-A/B/C/D value = dropped

## Adding a New Institute

1. Create `institutes/<Display Name>/` folder
2. Add `institutes/<Display Name>/<SlugNoSpaces>_institute_key_GS.json` (100 answers)
3. Add `institutes/<Display Name>/<SlugNoSpaces>_institute_key_CSAT.json` (80 answers)
4. Build + verify: `node build_all_institutes.js gs1`
5. Commit and push → Vercel auto-deploys (once GitHub is connected)

Folder name becomes the display name in the result cards. Slug = folder name with spaces removed.

## Template Architecture (index_all_institutes.html)

Single-file vanilla JS SPA. No framework. Pattern: `state → render() → bind()`.

### Key Difference from Single-Institute Build

Result screen shows **one `res-card` per institute** (+ one official key card), instead of two cards. Institute cards with empty keys show a "Pending" state. The Q-by-Q breakdown table below the cards uses a selected institute key — toggle with "Institute Key / Official UPSC Key" buttons; when Institute Key is selected and multiple institutes exist, institute picker pills appear.

### State

```js
const state = {
  screen: 'landing',           // 'landing' | 'entry' | 'review' | 'result'
  paperCode: null,             // 'A' | 'B' | 'C' | 'D'
  responses: {},               // { "1": "A", "42": "C", ... }
  page: 1,
  sortCol: null,
  sortDir: 1,
  tableView: 0,                // 0=Institute key, 1=Official key
  selectedInstituteIdx: 0,     // which institute drives the Q-by-Q table
  // ... filter/sort/collapse state for analysis tables
}
```

### Key Functions

| Function | Purpose |
|---|---|
| `calcScore(key)` | Score responses vs one key object |
| `buildRows(keys)` | Build per-question result rows for breakdown table |
| `isKeyEmpty(key)` | True if all answers fail validKey — marks as pending |
| `canonQ(pc, q)` | Maps student Q# in paper code → Set A Q# via PAPER_MAPPING |
| `postScore()` | POST score to Supabase (fires once on result screen) |
| `renderResult()` | Builds institute cards + breakdown tables |
| `downloadResult()` | Generates standalone downloadable HTML with embedded state |

## Seeding Test Data

```
node seed-all.js gs1 20    # seed 20 GS1 submissions
node seed-all.js csat 10   # seed 10 CSAT submissions
```

Uses IAS Baba key. Requires `playwright` (`npm install playwright` + `npx playwright install chromium`). Targets `https://prelims-cse-score-checker.vercel.app`.

## Vercel Deployment

`vercel.json`:
```json
{
  "buildCommand": "node build_all_institutes.js gs1 && node build_all_institutes.js csat",
  "outputDirectory": "dist",
  "installCommand": "echo skip",
  "headers": [{ "source": "/(.*)", "headers": [{ "key": "Cache-Control", "value": "no-store" }] }],
  "routes": [
    { "src": "/gs1",  "dest": "/all-institutes-gs1-score-checker.html" },
    { "src": "/csat", "dest": "/all-institutes-csat-score-checker.html" },
    { "src": "/",     "dest": "/index.html" }
  ]
}
```

Manual deploy (CLI): `vercel --prod --yes`

## Pending Work (post 25 May 2026 exam)

1. Fill `keys/official_key_GS.json` — real UPSC GS1 answers
2. Fill `keys/official_key_CSAT.json` — real UPSC CSAT answers
3. Fill `keys/paper_mapping_GS.json` — real GS1 B/C/D→A permutations
4. Fill `keys/paper_mapping_CSAT.json` — real CSAT B/C/D→A permutations
5. Add Aram IAS key files once they publish their key
6. Connect GitHub repo to Vercel project for auto-deploys on push

## Exam Context

UPSC Civil Services Prelims 2026 — exam date 25 May 2026

| Paper | Questions | Marks | Correct | Wrong |
|---|---|---|---|---|
| GS Paper 1 | 100 | 200 | +2.00 | −0.6667 |
| CSAT Paper 2 | 80 | 200 | +2.50 | −0.8333 |

Paper codes A/B/C/D (same questions, different order).
