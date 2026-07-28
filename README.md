# Project Dashboard

A local-first project manager for developers. Track Supabase, GitHub, deployment, and environment variables for every project — all saved privately in your browser's localStorage. No server, no account, no tracking.

🔗 **Live demo:** _[add your Vercel URL here after deploying]_

---

## Features

- ➕ Create, edit, duplicate, and delete projects
- 🔍 Search, filter by status, and sort
- 🌙 Dark / light mode toggle (respects system preference + manual override)
- 💾 Auto-save — no "Save" button needed
- 📦 Export / import individual projects as JSON
- 🗂️ Full backup and restore of all projects
- 🔐 Supabase API key stored locally (masked by default)
- 🌿 Environment variable manager per project
- 📎 URL hash routing — bookmarkable project links
- ♿ WCAG AA accessible — skip links, focus traps, ARIA live regions

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Structure | Vanilla HTML5 |
| Styling | Vanilla CSS (design tokens, dark mode, responsive) |
| Logic | Vanilla JavaScript (IIFE, no framework, no build step) |
| Storage | Browser `localStorage` |
| Font | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |
| Deploy | [Vercel](https://vercel.com) (static) |

---

## Project Structure

```
project-dashboard/
├── index.html          # HTML structure
├── styles.css          # All CSS (tokens, layout, dark mode, responsive)
├── app.js              # All JavaScript (logic, routing, modals)
├── favicon.svg         # SVG favicon (matches brand icon)
├── apple-touch-icon.png# iOS home screen icon
├── vercel.json         # Vercel deployment config
└── .gitignore
```

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. Vercel auto-detects it as a static site — no build settings needed
5. Click **Deploy** ✅

---

## Local Development

No build step required. Just open `index.html` in your browser:

```bash
# macOS
open index.html

# or use any static server
npx serve .
```

---

## Privacy

All data is stored **only in your browser's `localStorage`**. Nothing is sent to any server. Clearing your browser data will erase your projects — use the **Export backup** feature regularly.

---

## License

MIT — free to use, modify, and share.
