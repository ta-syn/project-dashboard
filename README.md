<div align="center">

# 🚀 Project Dashboard

**A Local-First Project Manager for Developers**

[![Deploy with Vercel](https://vercelbutton.com/api/button.svg)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fta-syn%2Fproject-dashboard)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

Track Supabase credentials, GitHub repos, deployment URLs, and environment variables for every project — all saved **privately** in your browser's `localStorage`. No server, no account, no tracking.

🔗 **Live demo:** [project-dashboard-alpha-nine.vercel.app](https://project-dashboard-alpha-nine.vercel.app)

</div>

<br/>

## 🌟 Philosophy (Why Local-First?)

As developers, we juggle dozens of side projects. Keeping track of Supabase API keys, Netlify URLs, GitHub branches, and environment variables can quickly become a messy notes app nightmare. 

**Project Dashboard** solves this by keeping all your project metadata in one beautiful, accessible interface. It is built entirely with Vanilla Web Technologies (HTML/CSS/JS) ensuring blazing fast performance, zero dependencies, and absolute privacy.

---

## ✨ Features

- **🎯 Project Hub:** Create, edit, duplicate, and delete projects seamlessly.
- **🔍 Smart Search & Filter:** Instantly find projects by name, description, or filter them by status (Active, Paused, Completed, Archived).
- **🌙 Dynamic Theme:** Automatic dark/light mode based on your OS, plus a manual toggle button with smooth transitions.
- **💾 Auto-Save:** Type and go. Everything saves automatically — no "Save" button needed.
- **📦 Import / Export:** Export individual projects or take a full backup of all your data as JSON.
- **🔐 Secret Masking:** Sensitive environment variables and API keys are hidden by default and can be toggled on demand.
- **♿ 10/10 Accessibility:** Built to WCAG AA standards with skip links, focus traps, ARIA live regions, and screen-reader support.

---

## 🛠️ Tech Stack

This project takes pride in having **zero dependencies**. No npm, no build steps, no heavy frameworks.

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic structure, accessibility landmarks |
| **CSS3** | Design tokens, responsive grid, glassmorphism, dark mode |
| **Vanilla JS** | State management, hash routing (`#project/id`), DOM manipulation |
| **localStorage** | Persistence layer |
| **Vercel** | Lightning-fast static global deployment |

---

## 📂 Project Structure

```text
project-dashboard/
├── index.html              # The core structural shell
├── styles.css              # Custom design system and media queries
├── app.js                  # Application logic, routing, and persistence
├── favicon.svg             # Modern vector favicon
├── apple-touch-icon.png    # High-res iOS home screen icon
├── vercel.json             # Vercel security headers & caching rules
└── .github/workflows/      # CI Pipeline for JavaScript Syntax check
```

---

## 🚀 How to Run Locally

Because there is no build step, running the project locally takes less than a second.

1. Clone the repository:
   ```bash
   git clone https://github.com/ta-syn/project-dashboard.git
   cd project-dashboard
   ```
2. Open `index.html` directly in your favorite browser:
   ```bash
   # On macOS
   open index.html
   ```

---

## 🔒 Privacy & Security

**Your data belongs to you.** 
- This application makes **zero network requests** to external databases.
- Everything is stored entirely on your local machine using the browser's `localStorage` API.
- *Note: Clearing your browser data will erase your projects. Use the "Export All" backup feature regularly.*

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it as you wish.

<div align="center">
  <i>Built with absolute perfection and 10/10 standards.</i>
</div>
