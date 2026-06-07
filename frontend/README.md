# 🌟 CurioBot Frontend Client

The frontend of CurioBot is a modern, single-page application built with React 19, TypeScript, and Vite. It implements a whimsical **Pastel Journal** visual aesthetic (warm cream backgrounds, soft shadows, hand-sketched border details) that feels like an interactive personal notebook.

## ✨ Core Features

- 📓 **Dual-Pane Explorer Layout:** Browse collections, history, and wonder topics on the left; read synthesized long-form articles in the center; converse with an AI tutor on the right.
- 🎨 **Rich Styling Architecture:** Styled using **Tailwind CSS v4** combined with hand-crafted CSS variables (e.g. `--surface-cream`, `--ink-charcoal`, `--paper-shadow`).
- ⚡ **Realtime Quest Visualizer:** High-fidelity pipeline loader mapping supervisor execution states (Ideation -> Web Search -> Wikipedia Research -> Writing).
- 🔄 **Centralized Context:** State tracking is unified via React Context (`CurioContext.tsx`), eliminating prop-drilling.

---

## 📁 Component Directory Structure

All frontend source files reside inside `frontend/src/`:

```text
src/
├── actions/         # API actions triggering requests to the Express backend
│   └── curio.ts
├── assets/          # Static illustrations and logo assets
├── components/      # Reusable React components grouped by section
│   ├── auth/        # AuthPage page (login & registration screens)
│   ├── canvas/      # Central viewport cards (Ignite, History, Library, Saved, Settings)
│   ├── chat/        # Right-hand Tutor chat components
│   └── layout/      # AppShell window structures and MobileHeader
├── contexts/        # Global React Context providers (CurioContext.tsx)
├── types/           # Core typescript interfaces (curio.d.ts)
├── App.tsx          # Root mounting entrypoint
└── index.css        # Tailwind config, font faces, global journal CSS variables
```

---

## 🔄 Global State Management (`CurioContext.tsx`)

State tracking is maintained inside `contexts/CurioContext.tsx`. The custom hook `useCurio()` exposes:
- **Authentication:** `user` object, JWT `token`, and `login()` / `register()` / `logout()` handlers.
- **Quest Ignition:** `igniteQuest(topic?)` triggering the LangGraph agent chain on the backend.
- **Tutor Chat:** `messages` history and `sendMessage(message)` for continuous conversation.
- **Daily Wonder:** `generateDailyWonder()` querying and saving today's spotlight topic.
- **Library Collections:** Folder management and mapping articles to custom collections.

---

## 🛠️ Getting Started

### Installation
Run npm install in the frontend directory:
```bash
npm install
```

### Development Server
Start the client server using Vite (defaults to `http://localhost:5173`):
```bash
npm run dev
```

### Production Build
Compile typescript files and bundle production-optimized assets:
```bash
npm run build
```
