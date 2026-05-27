# App Flow — UPSC Prelims Score Checker

## Overview

Single-page application (SPA) built in vanilla JS. No framework. State-driven: every screen is a pure function of `state` → `render()` → `bind()`. Deployed as two separate built HTML files for GS Paper 1 (`/gs1`) and CSAT Paper 2 (`/csat`).

---

## Screens & State Machine

```
Landing
  ├── New visitor: select Set A/B/C/D → Start
  └── Returning visitor (responses saved): "View Your Result" or "Start New Attempt"
         ↓
Entry  (10 Qs per page, 10 pages for GS / 8 for CSAT)
  ├── Paginated Q entry — A/B/C/D buttons per question
  ├── Progress bar + page-dots nav
  ├── Edit paper code inline (pencil icon)
  └── Review → (any time)
         ↓
Review
  ├── Answer summary bar (A/B/C/D counts)
  ├── Unanswered warning with Q# list
  ├── 10×10 (GS) / 8×10 (CSAT) tile grid — tap to jump back
  ├── Edit paper code (A/B/C/D buttons)
  └── Confirm & Submit →
         ↓
Profile Modal (conditional)
  ├── Shown only if: GS ≥75 attempted, CSAT ≥30 attempted
  ├── Fields: Name, Phone (10-digit), Place (radio + "Others" text)
  ├── Validation: all fields required
  └── "Continue to Score →" → dismisses modal, triggers postScore()
         ↓
Result
  ├── Scores by Institute table (one row per institute + UPSC Official)
  ├── Q-by-Q Breakdown table (sortable, filterable)
  │   ├── View toggle: Institute Key ↔ Official UPSC Key
  │   ├── Institute picker pills (shown when multiple institutes + Institute Key view)
  │   ├── Subject/category filter pills
  │   ├── Status filter: All / Correct / Wrong / Skip
  │   └── Show Questions checkbox (inline question text column)
  ├── Subject-wise Performance table (sortable)
  ├── Accuracy table (sortable)
  └── Download Result button (offline HTML with embedded state)
```

---

## Key State Fields

| Field | Type | Purpose |
|---|---|---|
| `screen` | string | `'landing' \| 'entry' \| 'review' \| 'result'` |
| `paperCode` | string | `'A' \| 'B' \| 'C' \| 'D'` |
| `responses` | object | `{ "1": "A", "42": "C", ... }` |
| `page` | number | Current entry page (1–10) |
| `tableView` | number | `0` = Institute Key, `1` = Official Key |
| `selectedInstituteIdx` | number | Which institute drives Q-by-Q table |
| `showQuestions` | boolean | Show inline question text in breakdown table |
| `filterSubject` | string | Subject filter value (`'all'` or subject key) |
| `filterStatus` | string | `'all' \| 'correct' \| 'wrong' \| 'skip'` |
| `profileSubmitted` | boolean | Whether profile modal was completed |
| `submissionId` | string | Unique ID for Supabase dedup |

---

## Data Flow

### Score Calculation

```
Student response (Set B/C/D)
  → canonQ(paperCode, questionNo)  ← maps via PAPER_MAPPING to Set A Q#
  → compare vs key.answers[setAQ]  ← from institute or official key JSON
  → +2.00 correct / −0.6667 wrong (GS)
  → +2.50 correct / −0.8333 wrong (CSAT)
```

Ambiguous answers (key has `A/B` format) score as a range: `minScore..maxScore`.

### Persistence

State serialised to `localStorage` key `upsc_t1_all_state_GS` or `upsc_t1_all_state_CSAT` on every render. Restored on page load. `scoreSent` flag (`scorePosted` in storage) prevents duplicate Supabase submissions across reloads.

Downloaded HTML files inject `window.__DL_STATE__` which takes priority over localStorage on load.

### Supabase Submission

Fires once per attempt on result screen (after profile if shown). Payload:
```json
{
  "paper": "GS" | "CSAT",
  "paper_code": "A" | "B" | "C" | "D",
  "attempted": 84,
  "skipped": 16,
  "correct_official": null,
  "wrong_official": null,
  "score_official": null,
  "responses": { "1": "A", ... },
  "candidate_name": "Priya Sharma",
  "candidate_phone": "9876543210",
  "candidate_place": "Chennai",
  "submission_id": "lp3abc"
}
```
`correct_official` / `wrong_official` / `score_official` are `null` until the official key JSON is populated post-exam.

---

## Companion Pages (static HTML, separate builds)

| Route | File | Purpose |
|---|---|---|
| `/gs1` | `all-institutes-gs1-score-checker.html` | GS Paper 1 score checker |
| `/csat` | `all-institutes-csat-score-checker.html` | CSAT Paper 2 score checker |
| `/` | `index.html` | Paper selector landing page |
| `/prelims_2026_institute_key_comparison.html` | GS institute key comparison page |
| `/prelims_2026_csat_key_comparison.html` | CSAT institute key comparison page |
| `/prelims_2026_gs_paper.html` | Full GS paper with answers |
| `/prelims_2026_CSAT_paper.html` | Full CSAT paper with answers |
| `/prelims_2026_subject_analysis.html` | Subject analysis dashboard |
| `/upsc_prelims_cutoff.html` | Historical cutoff data |
| `/total-qns-attempt-planner.html` | Attempt planner tool |
| `/gs_prelims_pyqs_question_bank.html` | GS PYQ question bank |
| `/gs_mains_pyqs_question_bank.html` | GS Mains PYQ question bank |

---

## Institute Key Comparison Page Flow

1. All institute keys loaded as static JS data at build time.
2. User selects institutes via checkboxes (minimum 1 always checked).
3. Table shows per-question answers side by side.
4. "SHOW" row with stat chips: total Qs, agree count, discrepancy count.
5. Category/subject filter pills.
6. Sortable columns.
