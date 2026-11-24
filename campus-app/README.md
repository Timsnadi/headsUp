# headsUp

A premium, offline-first class tracker for university life.

## Current functionality

- Create, edit, and delete units and their lessons, with per-lesson days, times, modes, locations, and optional online links.
- View lessons in Today and Monday-to-Sunday Week schedules using the Africa/Nairobi time zone.
- Track assignments and exams, and export lessons and deadlines to a reminder-enabled iCalendar file.
- Data stays on the device in IndexedDB through Dexie; no server or sample timetable is used.
- Existing course data and older JSON backups are migrated to units and lessons without removing schedule or related records.

Reminders appear only while the app is open. Use Add to Calendar for alerts when it's closed.

## Setup

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` – local Vite development server
- `npm run build` – production build
- `npm run test` – Vitest test run
- `npm run preview` – preview the production bundle

## Install on iPhone

1. Open the app in Safari.
2. Tap Share.
3. Choose Add to Home Screen.

## Install on Android

1. Open the app in Chrome.
2. Tap the install prompt or menu > Install app.

## Deployment

Deploy the built `dist` folder to any static host such as Cloudflare Pages or Netlify.
