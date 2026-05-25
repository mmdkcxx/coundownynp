# Short Escape Core Y&P — Codebase Guide

## Files
| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 1038 | Main countdown/info page |
| `spinwheel.html` | 959 | Group assignment spin wheel |
| `photos/` | – | Polaroid images (nginx serves JSON dir listing) |

## Shared Design System

**Fonts**: `Titan One` (headings/numbers), `Caveat` (body, handwritten feel)

**Background**: animated gradient `#1a5ca8→#0d3a7a→#1565c0`, `bg-drift` keyframe, `#bg-canvas` particle overlay (Bokeh + Confetti + Star classes)

**Paper card pattern**:
```css
/* torn bottom edge via clip-path ::after */
background: #fffef7;
box-shadow: 4px 5px 18px rgba(0,0,0,.34);
/* slight rotate on individual cards */
```

**Pins** (absolute, `top:-10px left:50% translateX(-50%)`):
- `.pr` red `#ff8a80→#c62828`
- `.pb` blue `#90caf9→#1565c0`
- `.pg` green `#a5d6a7→#1b5e20`
- `.py` yellow `#ffe082→#e65100`
- Each has `::after` needle `3px×9px` gray gradient

**Washi tape** (`position:absolute top:-9px left/right:-8px height:18px`):
- `.wb` / `.washi-blue` — semi-transparent blue stripe
- `.wc` / `.washi-check` — white checkered

**Scroll reveal**: class `reveal` → `opacity:0 translateY(28px)` → `.visible` via IntersectionObserver

---

## index.html

### Sections
| ID | Content |
|----|---------|
| `#hero` | Countdown timer. `TARGET = new Date(2026,4,30,10,0,0)` |
| `#info` | Price/date/location. Grid: `info-main-card` + `info-side` |
| `#bring` | Things to bring. `bring-grid` 3-col (6-col desktop) |
| `#rundown` | 3-day schedule. `day-blocks-grid` 3-col desktop |

### Key classes
- `board` — hero center column `max-width:760px`
- `sec-content` — section wrapper `max-width:700px` (1100px desktop)
- `cd-card` — countdown unit (flip animation `flip-in`)
- `day-paper` — notebook-line texture + torn header/bottom
- `tb-tan/blue/navy` — timeline time badges
- `polaroid-fixed` — gutter photos (desktop ≥1380px), crossfade cycling

### Desktop (≥1160px)
- Content `max-width:1100px`
- `.side-panel.side-left/right` — fixed, `calc(50% - 545px)` from edge
- `sec-head-card` hidden, `sec-divider` shown
- Polaroids: `MIN_POL_W=1380`, ~1 per 300px page height, balanced L/R

---

## spinwheel.html

### Layout
```
grid-template-columns: 238px  1fr  272px
                        queue  wheel  groups
```

### Data Model (localStorage key: `ynp_spinwheel_v1`)
```json
{
  "groups": ["Kelompok 1","Kelompok 2","Kelompok 3","Kelompok 4"],
  "participants": [{ "name": "str", "group": 0 }],
  "session": {
    "queue": [0,1,2],
    "currentIdx": 0,
    "done": [{ "pidx": 0, "cGroup": 2 }]
  }
}
```

### Group Colors (`GC[0..3]`)
| i | wheel | dot | card bg |
|---|-------|-----|---------|
| 0 | `#e53935` | `#c62828` | `#fff8f8` |
| 1 | `#1e88e5` | `#1565c0` | `#f0f7ff` |
| 2 | `#43a047` | `#2e7d32` | `#f0f7e8` |
| 3 | `#fb8c00` | `#e65100` | `#fffef0` |

### Key Functions
| Function | Purpose |
|----------|---------|
| `drawWheel(rot)` | Canvas draw, `WHEEL_SIZE=400`, pointer at top (3π/2) |
| `segAtPointer(rot)` | Returns current segment index at pointer |
| `calcTarget(curRot, tSeg)` | Compute end rotation: 5 full spins + jitter ±35% |
| `doSpin(targetSeg, cb)` | rAF animation, `easeOut5`, tick sounds |
| `startSpin()` | Init `spinSt`, spin to `spinSt.assigned` |
| `doRetry()` | Odd retry→alternative, even retry→assigned |
| `doConfirm()` | Always saves `spinSt.assigned` (never displayGroup) |
| `initSession()` | Rebuild queue = all participants minus done set |
| `renderUI()` | Calls renderQueue/Done/Groups/Center |
| `burst(color)` | Confetti from viewport center |

### Spin State (`spinSt`)
```js
{ assigned: 0-3, alternative: 0-3, retryCount: 0, displayGroup: 0-3 }
```
Retry rule: `retryCount % 2 === 1` → show alternative, else → show assigned.
**Confirm always writes `assigned`, not `displayGroup`.**

### Admin Panel
- Password: `ynp2026`, gate stored in `adminAuth` (memory-only, resets on reload)
- Key IDs: `adminOverlay`, `adminContent`, `adminAuth`, `participantTbody`
- Import: CSV `Name,0` per line OR JSON `[{"name":"...","group":0}]`

### CSS Shorthand Classes (spinwheel only)
- `.pc` — paper card; `.pc-body` — inner padding
- `.washi .wb/.wc` — washi tape variants
- `.pin .pr/.pb/.pg/.py` — colored pins
- `.gc .gc-0..gc-3` — group cards (colored bg)
- `.adm-*` — admin panel; `.abtn-p/d/s` — primary/danger/secondary buttons
- `.q-item .q-cur` — queue list item / current highlight
