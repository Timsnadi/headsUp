# headsUp

A premium, offline-first class tracker for university life.

## Current functionality

- Create, edit, and delete courses with meeting days, times, semester, and a custom color.
- Track online courses with a joinable HTTP(S) meeting link, or in-person courses with a building and room.
- View saved classes in Today and Monday-to-Sunday Week schedules.
- Course data is stored locally in IndexedDB through Dexie.

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
