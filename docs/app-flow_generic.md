# App Flow — Multi-Institute Exam Score Checker

> **Template doc.** Replace bracketed tokens before use:
> `[EXAM_NAME]` · `[PAPER_1]` · `[PAPER_2]` · `[ORG_NAME]` · `[TOTAL_Q_P1]` · `[TOTAL_Q_P2]`
> `[CORRECT_MARK_P1]` · `[WRONG_MARK_P1]` · `[CORRECT_MARK_P2]` · `[WRONG_MARK_P2]`

---

## Overview

Single-page application (SPA) built in vanilla JS. No framework. State-driven: every screen is a pure function of `state` → `render()` → `bind()`. Deployed as two separate built HTML files — one per paper. Both files share the same master template (`index_all_institutes.html`) and are produced by a single build script parameterised on paper type.

---

## Screens & State Machine

```
Landing
  ├── New visitor: select booklet Set (A / B / C / D) → Start
  └── Returning visitor (localStorage hit): "View Your Result" or "Start New Attempt"
         ↓
Entry  (10 Qs per page)
  ├── Paginated Q entry — A / B / C / D tap buttons per question
  ├── Progress bar + page-dot navigation
  ├── Inline paper-code editor (pencil icon → Set A/B/C/D toggle)
  └── "Review →" always reachable from header
         ↓
Review
  ├── A/B/C/D answer count summary bar
  ├── Unanswered warning banner (lists Q numbers)
  ├── Tile grid (one tile per question, coloured by answer) — tap → jumps to entry page
  ├── Paper-code editor (large Set buttons)
  └── "Confirm & Submit →"
         ↓
Profile Modal  (conditional — shown only above attempt threshold)
  ├── Fields: Name, Phone (10-digit), Place (radio list + "Others" free text)
  ├── Inline validation; all fields required
  └── "Continue to Score →" → dismisses modal, triggers postScore()
         ↓
Result
  ├── Scores by Institute table (one row per [ORG_NAME] + official key row)
  ├── Q-by-Q Breakdown table (sortable, filterable)
  │   ├── View toggle: Institute Key ↔ Official [EXAM_NAME] Key
  │   ├── Institute picker pills (when multiple institutes + Institute Key selected)
  │   ├── Subject / category filter pills
  │   ├── Status filter: All / Correct / Wrong / Skip
  │   └── "Show Questions" checkbox (inline question text column)
  ├── Subject-wise Performance table (sortable)
  ├── Accuracy table (sortable)
  └── Download Result (standalone offline HTML with embedded state)
```

---

## Key State Fields

| Field | Type | Purpose |
|---|---|---|
| `screen` | string | `'landing' \| 'entry' \| 'review' \| 'result'` |
| `paperCode` | string | `'A' \| 'B' \| 'C' \| 'D'` |
| `responses` | object | `{ "1": "A", "42": "C", ... }` |
| `page` | number | Current entry page (1–N) |
| `tableView` | number | `0` = Institute Key, `1` = Official Key |
| `selectedInstituteIdx` | number | Which institute drives Q-by-Q breakdown |
| `showQuestions` | boolean | Show inline question text in breakdown table |
| `filterSubject` | string | Subject filter (`'all'` or subject key) |
| `filterStatus` | string | `'all' \| 'correct' \| 'wrong' \| 'skip'` |
| `profileSubmitted` | boolean | Whether profile modal was completed |
| `submissionId` | string | Unique ID for backend dedup |

---

## Data Flow

### Score Calculation

```
Student response (Set B / C / D)
  → canonQ(paperCode, questionNo)      ← maps via PAPER_MAPPING to Set A Q#
  → compare vs key.answers[setAQ]      ← institute or official key JSON
  → +[CORRECT_MARK] correct / −[WRONG_MARK] wrong
```

Ambiguous keys (`"A/B"` format) produce a score range: `minScore..maxScore` displayed as band.

### Persistence

State serialised to `localStorage` on every render (key: `exam_state_[PAPER]`). Restored on page load. `scoreSent` flag (stored as `scorePosted`) prevents duplicate backend submissions on reload.

Downloaded HTML injects `window.__DL_STATE__` which takes priority over localStorage.

### Backend Submission (Supabase / equivalent REST endpoint)

Fires once per attempt on result screen entry (after profile modal if shown).

```json
{
  "paper": "[PAPER_1] | [PAPER_2]",
  "paper_code": "A | B | C | D",
  "attempted": 84,
  "skipped": 16,
  "correct_official": null,
  "wrong_official": null,
  "score_official": null,
  "responses": { "1": "A", "2": "C" },
  "candidate_name": "Candidate Name",
  "candidate_phone": "10-digit mobile",
  "candidate_place": "City",
  "submission_id": "unique-id"
}
```

`correct_official` / `wrong_official` / `score_official` are `null` until official key JSON is populated post-exam. No re-submission on reload (guarded by `scoreSent` + localStorage).

---

## Profile Modal Trigger Threshold

```js
function shouldShowProfile() {
  var att = Object.keys(state.responses).length
  return paper === '[PAPER_2]' ? att >= [THRESHOLD_P2] : att >= [THRESHOLD_P1]
}
```

Only students who answered above the threshold see the profile modal before results. Set thresholds to filter out low-effort / test submissions.

---

## URL Routes

| Route | Deployed file | Purpose |
|---|---|---|
| `/paper1` | `all-institutes-paper1-score-checker.html` | [PAPER_1] score checker |
| `/paper2` | `all-institutes-paper2-score-checker.html` | [PAPER_2] score checker |
| `/` | `index.html` | Paper selector landing page |
| `/paper1_key_comparison.html` | static | [PAPER_1] institute key comparison |
| `/paper2_key_comparison.html` | static | [PAPER_2] institute key comparison |
| `/paper1_full.html` | static | Full [PAPER_1] paper with answers |
| `/paper2_full.html` | static | Full [PAPER_2] paper with answers |
| `/subject_analysis.html` | static | Subject analysis dashboard |
| `/cutoff.html` | static | Historical cutoff data |
| `/attempt_planner.html` | static | Attempt count planner tool |
| `/pyqs_paper1.html` | static | [PAPER_1] past-year question bank |
| `/pyqs_paper2.html` | static | [PAPER_2] past-year question bank |

> Adjust slugs to match the exam's natural terminology. Route names must stay stable across deploys — students bookmark and share them.

---

## Institute Key Comparison Page Flow

1. All institute keys loaded as static JS at build time.
2. Checkboxes to toggle institutes (minimum 1 always enforced).
3. Per-question side-by-side answer table.
4. "SHOW" stat row: total Qs · agree count · discrepancy count.
5. Subject / category filter pills.
6. Sortable columns.

---

## Build System

```
node build_all_institutes.js paper1    → dist/all-institutes-paper1-score-checker.html
node build_all_institutes.js paper2    → dist/all-institutes-paper2-score-checker.html
```

Both papers (matches deploy command):
```
node build_all_institutes.js paper1 && node build_all_institutes.js paper2
```

Build auto-discovers `institutes/` folders. Each subfolder = one institute. Empty folder = "Pending" card on result screen.

---

## Institute Key JSON Format

```json
{
  "name": "Institute Display Name",
  "isOfficial": false,
  "answers": {
    "1": "A", "2": "B", "80": "C"
  }
}
```

Missing question = dropped (0 marks, excluded from scoring). `""` or non-ABCD value = dropped. Ambiguous = `"A/B"`.
