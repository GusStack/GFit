# Zero‑Backend Fitness App (Starter)

Privacy‑first fitness web app that runs entirely in the browser: strength (set/rep/RPE) and timed HIIT (Tabata/EMOM/AMRAP) with offline support. No servers, no tracking. Perfect for GitHub Pages.

## Quick start
1. **Download** this folder as a zip and extract.
2. Create a new GitHub repo and push all files.
3. Enable **GitHub Pages** → Source: `GitHub Actions`.
4. On push to `main`, it auto‑deploys via the included workflow.
5. Open your Pages URL. The app works offline after first load.

## Dev (no build tools required)
Just serve statically (for local testing):
- Python: `python -m http.server 5173`
- Node (serve): `npx serve .`

## Zero data housing
- Data stored in your browser only (`localStorage` + `IndexedDB`).
- Export/Import JSON in Settings.
- Share plans via URL fragment (no server).

## Folders
- `/app` ES‑modules (no framework)
- `/data` exercise library JSON
- `/assets` styles + icons
- `manifest.webmanifest` + `sw.js` for PWA
