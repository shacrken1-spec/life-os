# Personal Life OS

## RULES
- No explanations unless asked
- Code only, no commentary
- Shortest correct solution always
- Never ask permission to create files
- Group related changes in one step

## STACK
- PWA (HTML + CSS + Vanilla JS)
- Google Drive API v3 — storage (JSON files per module)
- Poalim Open Banking API (poalimdev.co.il) — bank data
- Israeli credit card CSV import (Isracard / Cal / Max format)
- No frameworks, no build tools, no npm

## PROJECT STRUCTURE
life-os/
├── index.html
├── sw.js
├── manifest.json
├── style.css
├── auth.js
└── modules/
    ├── dashboard.js
    ├── trading.js
    ├── workout.js
    ├── habits.js
    ├── sleep.js
    ├── supplements.js
    ├── watchlist.js
    ├── goals.js
    └── expenses.js

## DATA
- Google Drive folder: LifeOS/
- One JSON per module
- Drive API v3: files.get, files.update
- Offline queue in memory → sync on reconnect
- No localStorage

## EXPENSES
- Poalim Open Banking API: OAuth2 → GET /accounts → GET /accounts/{id}/transactions
- CSV fallback: Isracard/Cal/Max, auto-detect by header, auto-categorize

## UI
- Dark/light toggle, default dark
- Mobile: bottom nav (5 icons)
- Desktop: sidebar nav
- Colors: #0f0f0f bg, #00d4aa accent
- Font: Inter
- 200ms page transitions only

## MODULES
Dashboard: today cards — P&L, workout ✓/✗, habits %, sleep hrs, expenses today. Numbers only, no charts.
Trading: date/ticker/L/S/entry/exit/size/P&L/setup/notes — table + monthly P&L chart + win-rate by setup
Workout: date/exercise/sets/reps/weight/notes — today session + PR tracker + weekly volume
Habits: name/streak/last_done — checklist + heatmap calendar
Sleep: date/hrs/mood(1-5)/energy(1-5) — input + 30d trend
Supplements: name/dose/time/days — daily checklist
Watchlist: ticker/notes/alert_price — list + Yahoo Finance live price
Goals: title/target/current/unit/deadline — progress bars
Expenses: date/amount/merchant/category/source — daily total + monthly donut + table

## BUILD ORDER — do all steps automatically:
1. index.html + router + bottom nav
2. style.css + dark mode tokens
3. Google Drive auth + CRUD helpers
4. Dashboard
5. All 8 modules
6. Poalim API + CSV import
7. PWA manifest + service worker
8. QA pass

## CONSTRAINTS
- No localStorage
- target="_blank" rel="noopener" on all external links
- Touch targets min 44px
- Zero placeholder content
