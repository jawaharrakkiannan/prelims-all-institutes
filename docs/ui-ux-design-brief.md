# UI/UX Design Brief — UPSC Prelims Score Checker

## Design Philosophy

Academic-warm aesthetic. Not a generic SaaS dashboard — targets UPSC aspirants who associate with serious study and printed paper. Uses serif typography, warm off-whites, and restrained colour accents to feel like a well-designed stationery product rather than a startup app.

---

## Colour System

All accent colours are injected via CSS custom properties set per-paper at build time.

| Token | GS (orange) | CSAT (indigo) | Role |
|---|---|---|---|
| `--c-accent` | `#f97316` | `#6366f1` | Headers, active states, accent lines |
| `--c-on-accent` | `#fff` | `#fff` | Text on accent backgrounds |
| `--c-accent-bg` | `#fff7ed` | `#eef2ff` | Subtle tinted backgrounds |
| `--c-accent-dark` | `#7c2d12` | `#312e81` | Dark text on light accent bg |
| `--c-accent-muted` | `#fb923c` | `#818cf8` | Muted accent (score denominator etc.) |
| `--c-accent-border` | `#fed7aa` | `#c7d2fe` | Table borders, card dividers |
| `--c-accent-divider` | `#ffedd5` | `#e0e7ff` | Section dividers |
| `--c-accent-hover-bg` | `#fff3e8` | `#f5f3ff` | Table row hover |
| `P` (JS) | `#f97316` | `#6366f1` | Inline styles reference this var |

**Global neutrals:**
- Page background: `#F7F3EA` (warm parchment)
- Card background: `#fff`
- Body text: `#1A1D2B`
- Secondary text: `#5B6375`
- Muted text: `#9CA3AF`
- Border: `#E6E0D5`

**Result row colours:**
- Correct: `#f0fdf4` (light green bg)
- Wrong: `#fef2f2` (light red bg)
- Ambiguous: `#fefce8` (light amber bg)

---

## Typography

Three typeface roles, zero font-weight ambiguity.

| Family | Role | Weights |
|---|---|---|
| **Playfair Display** | Display / scores / paper codes | 700, 800 |
| **DM Sans** | Body copy, labels, institute names | 400, 500, 600, 700, 800 |
| **JetBrains Mono** | Data values, badges, keys, metadata | 400, 700 |
| **Lora** | Question text, passage text (reading feel) | 400 italic, 400, 600 |

### Typography Rules
- Score numbers: Playfair Display 800 60px
- Section eyebrows: JetBrains Mono 9px, letter-spacing 2px, ALL CAPS
- Institute/option labels: DM Sans 700
- Q numbers in entry: DM Sans 700 12px, tabular-nums, muted colour
- Answer options (A/B/C/D): DM Sans 800 16px — bold enough to tap confidently

---

## Component Inventory

### Buttons

| Class | Appearance | Use |
|---|---|---|
| `.btn` | Full-width, 14px height, accent fill | Primary CTAs |
| `.btn-outline` | White bg, `#E6E0D5` border | Secondary / back nav |
| `.btn-sm` | `7px 14px` pad, 12px font, inline | Nav row secondary actions |
| `.paper-btn` | 22px×8px pad, Playfair Display 30px | Set A/B/C/D selector grid |
| `.opt-btn` | Flex-1, 46px min-height, 1.5px border, 16px | Answer option taps |
| `.page-dot` | 30×30px, 6px radius, 11px | Pagination nav |

Active/selected states always use `background: P` (accent) with `color: white`.

### Cards

`.card` — white bg, 14px radius, 20px pad, 1px `#E6E0D5` border, soft shadow.

`.res-card` — result institute card: 16px radius, 4px accent top bar via `::before`, animated slide-in (`res-in` keyframe). Pending state uses `--c-accent: #D1CAC0` (grey).

`.bk-card` — breakdown section card: same radius, accent-themed header bar.

### Tables

Sticky thead. JetBrains Mono headers: 10px, 2px letter-spacing, ALL CAPS, `--c-accent-bg` background. Sortable columns — `cursor:pointer`, hover bg, `↑↓` arrow suffix.

Fixed-layout where column widths matter (Q# col 52px, response col 72px, result col 90px).

### Question Display (inline in breakdown table)

```
.cq-wrap        → min 320px cell, 12px 16px pad
.cq-subject     → JetBrains Mono 0.65rem, muted brown, metadata eyebrow
.cq-passage     → Lora 0.86rem, blue tint bg (#eff6ff), left 3px blue border
.cq-lead        → Lora 0.9rem, 1.78 line-height, main question stem
.cq-stmts li    → flex row, accent left border, orange-tint bg, JetBrains Mono number prefix
.cq-snum        → JetBrains Mono 700 0.74rem, accent colour, min-width 1.6rem (hanging indent)
.cq-tail        → italic, green tint bg, left green border (follow-on instruction)
.cq-assertion   → Lora italic, blue tint, statement to evaluate
.cq-qtable      → compact dark-header table for match lists and data tables
.cq-option      → 2-col grid, circular letter key, option text
```

---

## Layout System

Max-width constraint: `480px` on mobile-first `.wrap`. Result page expands to `860px` for wide tables.

**Three layout zones:**

1. **Sticky header** (`position:sticky; top:0; z-index:20`) — accent bg, paper name, progress, nav
2. **Scrollable content** — `.wrap` padded, cards stacked vertically
3. **Fixed bottom nav** (`position:fixed; bottom:0`) — Prev/Next/Review/Submit buttons

No CSS grid framework. Layout is explicit flexbox + inline styles where one-off.

---

## Interaction Patterns

### Entry Page
- Tap option → immediate highlight (accent fill), no submit needed
- Skip = leave blank (no "skip" button — just don't tap)
- Progress bar fills as Qs answered; page-dot turns green when page complete
- "Review →" always accessible from header

### Review Page
- 10×10 tile grid — each tile is `r-tile`: coloured by answer (A=blue, B=purple, C=teal, D=indigo), blank = amber/skip
- Tap tile → jumps to entry page of that Q
- Unanswered warning: amber banner, lists Q numbers

### Result Page
- Institute score table: one row per institute + UPSC official row (blue-highlighted)
- Pending institutes: "Key not yet uploaded" placeholder text
- Q-by-Q table: Institute Key / Official Key toggle; institute picker pills when multiple
- All analysis tables collapsible (▼ Show / ▲ Hide toggle in header)
- Download: generates standalone HTML file with state embedded

### Profile Modal
- Backdrop blur overlay (`backdrop-filter: blur(3px)`)
- Radio place selection — selected option gets accent border + orange-tinted bg
- "Others" expands text input below radio list
- Inline field-level validation errors (red border + error text)

---

## Animation

```css
@keyframes res-in {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: none }
}
```
Applied to `.res-card` and `.bk-card` on result screen. Staggered: `nth-child(2)` gets `animation-delay: .11s`.

Buttons: `transition: opacity .15s` on hover/active; `:active` drops to `.85` opacity.
Option tiles: `transform: scale(1.1)` on hover.

---

## Responsive Behaviour

Primary target: **mobile** (375–480px). Fixed bottom nav + sticky header designed for thumb reach.

Tables are horizontally scrollable (`.tbl-wrap { overflow-x: auto }`). The breakdown table min column widths force horizontal scroll on narrow screens — intentional (data density over reflow).

`@media (max-width: 700px)` collapses GS question options from 2-col to 1-col grid.

---

## Accessibility Notes

- `accent-color: var(--c-accent)` on checkboxes/radios for brand-consistent native controls
- `tabular-nums` on score figures prevents layout shift during number changes
- `user-select: none` on sortable column headers to prevent accidental text selection
- All interactive elements have explicit cursor styles
- Error states use both colour (red border) and text (error message below field)

---

## Design Tokens Quick Reference

```css
/* Spacing scale (not a formal system — reference sizes used) */
gap: 4px (tight)
gap: 6px (option buttons)
gap: 8px (nav items)
gap: 10px (cards)
gap: 12px (standard)
gap: 16px (sections)

/* Border radius */
4px  — small pills, page dots
7px  — sm buttons
8px  — tiles, small cards
10px — standard buttons, inputs
12px — paper grid buttons
14px — cards
16px — res-card, profile modal
18px — landing card
20px — outer landing container radius
```
