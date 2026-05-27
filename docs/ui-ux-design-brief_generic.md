# UI/UX Design Brief — Multi-Institute Exam Score Checker

> **Template doc.** Replace bracketed tokens before use:
> `[BRAND_PRIMARY]` · `[BRAND_PAPER2_PRIMARY]` · `[EXAM_NAME]` · `[PAPER_1]` · `[PAPER_2]`
>
> **Enterprise consistency rule:** If this app runs alongside another exam app from the same brand,
> share the same typeface stack, neutral palette, border-radius scale, and animation curve.
> Differentiate only via `--c-accent` (one accent colour per paper). Everything else must match.

---

## Design Philosophy

Academic-warm aesthetic. Not a generic SaaS dashboard. Targets exam aspirants who associate with serious study and printed paper. Uses serif typography, warm off-whites, and restrained colour accents to feel like a well-designed stationery product rather than a startup app.

**Do not use:**
- Full-bleed hero gradients
- Card shadows heavier than `0 2px 24px rgba(11,25,41,.08)`
- More than two accent colours per paper
- Rounded corners above 20px on outer containers
- Icon packs (no icon libraries — only SVG inline where strictly needed)

---

## Colour System

All accent values are injected as CSS custom properties at build time, one set per paper. The neutral layer is always identical across all papers and all apps in the enterprise.

### Neutral (shared across all papers and enterprise apps)

| Token | Value | Role |
|---|---|---|
| Page background | `#F7F3EA` | Warm parchment — body bg |
| Card background | `#fff` | All cards and inputs |
| Body text | `#1A1D2B` | Primary text |
| Secondary text | `#5B6375` | Labels, descriptions |
| Muted text | `#9CA3AF` | Placeholders, captions |
| Border | `#E6E0D5` | Card borders, input borders |
| Divider | `#F0EAE0` | Row separators, light dividers |

### Accent Layer (per-paper, set in build script)

```css
:root {
  --c-accent:          [BRAND_PRIMARY];        /* header bg, active states, active borders */
  --c-on-accent:       #fff;                   /* text on accent bg — always white */
  --c-accent-bg:       [BRAND_PRIMARY_10];     /* subtle tint — table header bg, row hover */
  --c-accent-dark:     [BRAND_PRIMARY_DARK];   /* dark text on light-tinted bg */
  --c-accent-muted:    [BRAND_PRIMARY_MUTED];  /* score denominator, secondary accents */
  --c-accent-border:   [BRAND_PRIMARY_20];     /* table cell borders */
  --c-accent-border-th:[BRAND_PRIMARY_30];     /* table header cell borders */
  --c-accent-divider:  [BRAND_PRIMARY_15];     /* section dividers */
  --c-accent-hover-bg: [BRAND_PRIMARY_08];     /* table row hover bg */
  --c-accent-text-dark:[BRAND_PRIMARY_DARK];   /* text in tinted regions */
}
```

**Reference implementation — Paper 1 (orange):**
```
--c-accent: #f97316  --c-accent-bg: #fff7ed  --c-accent-dark: #7c2d12
--c-accent-muted: #fb923c  --c-accent-border: #fed7aa
```

**Reference implementation — Paper 2 (indigo):**
```
--c-accent: #6366f1  --c-accent-bg: #eef2ff  --c-accent-dark: #312e81
--c-accent-muted: #818cf8  --c-accent-border: #c7d2fe
```

### Semantic Result Colours (fixed, not per-paper)

| State | Background | Text |
|---|---|---|
| Correct row | `#f0fdf4` | `#166534` (bold) |
| Wrong row | `#fef2f2` | `#991B1B` (bold) |
| Ambiguous row | `#fefce8` | `#92400e` (bold) |
| Skipped | — | `#9CA3AF` |
| Dropped | — | `#D1D5DB` italic |

---

## Typography

Three typeface roles with zero overlap.

| Family | Role | Weights used |
|---|---|---|
| **Playfair Display** | Display / scores / booklet set codes (A/B/C/D) | 700, 800 |
| **DM Sans** | Body copy, all labels, institute names | 400, 500, 600, 700, 800 |
| **JetBrains Mono** | Data values, badges, keys, metadata, ALL-CAPS eyebrows | 400, 700 |
| **Lora** | Question text, passage text (reading feel) | 400, 400 italic, 600 |

### Type Scale

| Element | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Score display | Playfair Display | 60px | 800 | `letter-spacing: -.02em` |
| Page title / institute name | Playfair Display | 22px | 700 | |
| Booklet set letter | Playfair Display | 52px | 700 | Review screen |
| Section eyebrow | JetBrains Mono | 9–11px | 700 | `letter-spacing: 2px; text-transform: uppercase` |
| Answer option key | DM Sans | 16px | 800 | Tap targets — bold for confidence |
| Q number | DM Sans | 12px | 700 | `font-variant-numeric: tabular-nums`, muted colour |
| Table header | JetBrains Mono | 10px | 700 | `letter-spacing: 2px; ALL CAPS` |
| Table body | DM Sans | 13px | 400/700 | 700 for numeric cells |
| Question stem | Lora | 0.9rem | 400 | `line-height: 1.78` |
| Passage | Lora | 0.86rem | 400 | Left border, blue tint bg |

---

## Component Inventory

### Buttons

| Class | Appearance | Use |
|---|---|---|
| `.btn` | Full-width, `14px` pad, accent fill | Primary CTAs (Start, Submit, Continue) |
| `.btn-outline` | White bg, `#E6E0D5` border | Secondary / back navigation |
| `.btn-sm` | `7px 14px` pad, 12px DM Sans 700 | Inline nav actions (Prev, Next, Review) |
| `.paper-btn` | 4-column grid, Playfair 30px, `22px 8px` pad | Booklet set selector (A / B / C / D) |
| `.opt-btn` | `flex:1`, 46px min-height, 1.5px border, 16px 800 | Answer taps — must be fingertip-safe |
| `.page-dot` | 30×30px, 6px radius, JetBrains Mono 11px | Pagination nav |

**Active/selected state (universal rule):** `background: var(--c-accent); color: var(--c-on-accent)`. Never use opacity hacks for "selected" — always use explicit colour fill.

**Disabled state:** `opacity: .38; cursor: not-allowed; pointer-events: none`.

### Cards

`.card` — white, `14px` radius, `20px` pad, `1px #E6E0D5` border, `0 1px 4px rgba(0,0,0,.05)` shadow.

`.res-card` — result institute card: `16px` radius, `4px` accent top bar via `::before { height:4px; background:var(--rc-accent) }`. Animated slide-in. Pending/empty state: grey accent `#D1CAC0`.

`.bk-card` — breakdown section card: accent-themed header bar (`.bk-hd`), collapsible.

### Tables

- Sticky `thead`, `position:sticky; top:0; z-index:1`
- Headers: JetBrains Mono 10px 700, `letter-spacing:2px`, ALL CAPS, `var(--c-accent-bg)` bg, `2px solid var(--c-accent)` bottom border
- Sortable: `cursor:pointer`; hover → `var(--c-accent-hover-bg)`; sorted → `↑` or `↓` suffix
- Fixed layout where column widths matter: Q# col 52px, response col 72px, result status col 90px
- Horizontally scrollable wrapper: `.tbl-wrap { overflow-x: auto }`

### Question Cell (inline in breakdown table)

```
.cq-wrap          min 320px, pad 12px 16px — full cell container
.cq-subject       JetBrains Mono 0.65rem, muted brown — subject/category eyebrow
.cq-passage       Lora 0.86rem, #eff6ff bg, left 3px #3b82f6 border — reading passage
.cq-lead          Lora 0.9rem, 1.78 line-height — main question stem
.cq-context       Lora 0.88rem italic — scenario / instruction context
.cq-stmts li      flex row, accent left border, accent-tint bg, JetBrains Mono number prefix
.cq-snum          JetBrains Mono 700 0.74rem, accent colour, min-width 1.6rem — hanging indent
.cq-tail          Lora italic, #f0fdf4 bg, left 3px #22c55e border — follow-on instruction
.cq-assertion     Lora italic, #eff6ff bg — statement-to-evaluate variant
.cq-qtable        compact dark-header table — match lists, data tables
.cq-option        2-col grid (1-col on narrow), circular letter key + text
.cq-opt-key       JetBrains Mono 0.68rem, 20×20px circle, accent border
```

---

## Layout System

**Max-width:** `480px` mobile-first (`.wrap`). Result analysis tables widen to `860px`.

**Three fixed zones:**

```
┌─────────────────────────────────────┐
│  Sticky header  (z-index: 20)       │ ← accent bg, progress bar, nav
│  position: sticky; top: 0           │
├─────────────────────────────────────┤
│                                     │
│  Scrollable content                 │ ← .wrap, cards stacked vertically
│  padding-bottom: 68px               │   (leaves room for fixed bottom nav)
│                                     │
├─────────────────────────────────────┤
│  Fixed bottom nav  (z-index: 20)    │ ← Prev / Next / Submit / Review
│  position: fixed; bottom: 0         │
└─────────────────────────────────────┘
```

No grid framework. Explicit flexbox + inline styles for one-off overrides. Avoid utility class sprawl — this is a single-file SPA.

---

## Interaction Patterns

### Entry Screen
- Tap option → immediate accent fill, no separate submit
- Unanswered = blank (no "skip" button needed)
- Progress bar fills per answered Q; page-dot turns green when all 10 on that page answered
- `Review →` always accessible from header

### Review Screen
- Tile grid coloured by answer (A = blue, B = purple, C = teal, D = indigo, blank = amber)
- Tap tile → jumps to entry page containing that Q
- Amber unanswered banner lists all unanswered Q numbers

### Result Screen
- Score table: neutral rows for institutes, blue-highlighted row for official key
- Pending institutes (empty answers): `⏳ Key not yet uploaded` cell
- Q-by-Q table: view toggle + institute pills + filter pills — all re-render table without page reload
- All analysis tables collapsible via `▼ Show / ▲ Hide` button in card header
- Download button generates self-contained HTML with `window.__DL_STATE__` injected

### Profile Modal
- Semi-transparent backdrop with `backdrop-filter: blur(3px)`
- Radio place list: selected row gets accent border + tinted bg (no JS class needed — inline style on render)
- "Others" selection reveals free-text input below list
- Inline field-level errors: red border + `<p>` error message below field
- No close / dismiss — must complete to see results (if threshold met)

### Erase Confirmation Modal (from Landing)
- Destructive action: full-screen overlay, white card, red CTA
- Two buttons: "Yes, Erase Everything" (red fill) + "Cancel" (outline)
- Never trigger destructive action without this two-step

---

## Animation

```css
@keyframes res-in {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: none }
}
/* Apply to .res-card and .bk-card — stagger via nth-child delay */
.res-card:nth-child(2) { animation-delay: .11s }
```

**Timing function:** `cubic-bezier(.22, 1, .36, 1)` — fast out, slight overshoot. Use for all enter animations.

**Micro-interactions:**
- Buttons: `transition: opacity .15s` → `:active { opacity: .85 }`
- Option tiles: `transition: transform .1s` → `:hover { transform: scale(1.1) }`
- Paper buttons (A/B/C/D): selected gets `transform: scale(1.04); box-shadow: 0 4px 16px [accent]40`
- Progress bar fill: `transition: width .3s`

---

## Responsive Behaviour

**Primary device:** mobile 375–480px. Bottom nav + sticky header optimised for thumb reach.

| Breakpoint | Behaviour |
|---|---|
| < 480px | Single column, full-width cards |
| < 700px | Q option grid collapses 2-col → 1-col |
| > 480px | Cards max-width 480px, centred |
| > 860px | Analysis tables expand to 860px |

Tables use `overflow-x: auto` — horizontal scroll rather than reflow at narrow widths. Data density is intentional; do not collapse columns.

---

## Accessibility

- `accent-color: var(--c-accent)` on all native `<input>` checkboxes and radios
- `font-variant-numeric: tabular-nums` on all score/count figures
- `user-select: none` on sortable `<th>` elements
- All interactive elements have explicit `cursor` styles
- Error states: red border (`#dc2626`) + visible text message — never colour-only
- `letter-spacing` and `text-transform: uppercase` only on JetBrains Mono labels — never on body copy

---

## Design Token Quick Reference

```css
/* Spacing (reference sizes — not a formal scale) */
4px   tight gap (page-dot row)
6px   option button gap
8px   nav item gap
10px  card internal gap
12px  standard section gap
16px  section padding
20px  card padding
28px  landing screen header margin

/* Border radius */
4px   small pills, status badges
7px   .btn-sm
8px   tiles, small cards, modal inner elements
10px  standard buttons, text inputs
12px  paper grid buttons
14px  .card
16px  .res-card, .bk-card
18px  profile modal container
20px  landing outer card

/* Shadow scale */
0 1px 4px rgba(0,0,0,.05)       card (default)
0 2px 24px rgba(11,25,41,.08)   result card
0 4px 32px rgba(0,0,0,.07)      landing card
0 12px 48px rgba(0,0,0,.3)      profile modal
0 24px 64px rgba(0,0,0,.3)      destructive confirm modal
```

---

## Enterprise Consistency Checklist

When launching a second exam app under the same brand, verify:

- [ ] Identical typeface stack (Playfair + DM Sans + JetBrains Mono + Lora)
- [ ] Identical neutral palette (`#F7F3EA` page bg, `#1A1D2B` body text, `#E6E0D5` borders)
- [ ] Identical border-radius scale (above)
- [ ] Identical animation curve (`cubic-bezier(.22,1,.36,1)`)
- [ ] Identical layout zones (sticky header + scroll + fixed bottom nav)
- [ ] Accent colour differs from other papers in the same enterprise (no two papers share accent)
- [ ] Same score table structure (institute rows + official key row, blue highlight for official)
- [ ] Same 4-option A/B/C/D booklet selector on landing
- [ ] Same localStorage key pattern: `exam_state_[PAPER]`
- [ ] Same Supabase payload shape (same column names)
