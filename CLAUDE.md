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
    ├── supplements.js
    ├── watchlist.js
    ├── goals.js
    ├── content.js
    ├── braindump.js
    └── focus.js

## DATA
- Google Drive folder: LifeOS/
- One JSON per module
- settings.json: user secrets (Gemini API key) — prompted via modal, never hardcoded in source
- Drive API v3: files.get, files.update
- Offline queue in memory → sync on reconnect
- No localStorage

## UI
- Dark/light toggle, default dark
- Mobile: bottom nav (5 icons)
- Desktop: sidebar nav
- Colors: #0f0f0f bg, #00d4aa accent
- Font: Inter
- 200ms page transitions only

## MODULES
Dashboard: today cards — P&L, workout ✓/✗, habits %, content in progress, brain dump ✓/✗, focus time. Numbers only, no charts.
Trading: date/ticker/L/S/entry/exit/size/P&L/setup/notes — table + monthly P&L chart + win-rate by setup
Workout: date/exercise/sets/reps/weight/notes — today session + PR tracker + weekly volume
Habits: name/streak/last_done — checklist + heatmap calendar
Supplements: name/dose/time/days — daily checklist
Watchlist: ticker/notes/alert_price — list + Yahoo Finance live price
Goals: title/target/current/unit/deadline — progress bars
Content: title/type(book/course/podcast)/status(reading/done/paused)/progress%/rating/notes — grid + progress bars
Braindump: free text per day + timestamp — Gemini API summarize (insights + action items), stored in braindump.json
Focus: Pomodoro 25/5 customizable — current session, today total, weekly bar chart of daily focus hours

## BUILD ORDER — do all steps automatically:
1. index.html + router + bottom nav
2. style.css + dark mode tokens
3. Google Drive auth + CRUD helpers
4. Dashboard
5. All 9 modules
6. PWA manifest + service worker
7. QA pass

## CONSTRAINTS
- No localStorage
- target="_blank" rel="noopener" on all external links
- Touch targets min 44px
- Zero placeholder content
