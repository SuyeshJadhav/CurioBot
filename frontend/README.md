# 🌟 CurioBot Frontend Client

The frontend of CurioBot is a modern, single-page application built with React 19, TypeScript, and Vite. It implements a whimsical **Pastel Journal** visual aesthetic (warm cream backgrounds, soft shadows, hand-sketched border details) that feels like an interactive personal notebook.

## ✨ Core Features

- 📓 **Dual-Pane Explorer Layout:** Browse collections, history, and explore topics on the left; read synthesized long-form articles in the center; converse with an AI tutor on the right.
- 🎨 **Rich Styling Architecture:** Styled using **Tailwind CSS v4** combined with hand-crafted CSS variables (e.g. `--surface-cream`, `--ink-charcoal`, `--paper-shadow`).
- ⚡ **Realtime Quest Visualizer:** High-fidelity pipeline loader mapping supervisor execution states (Ideation -> Web Search -> Wikipedia Research -> Writing).
- 🔄 **Centralized Context:** State tracking is modularized into dedicated sub-contexts composed in `CurioContext.tsx`, eliminating prop-drilling and unnecessary re-renders.

---

## 📁 Component Directory Structure

All frontend source files reside inside `frontend/src/`:

```text
src/
├── actions/         # API actions triggering requests to the Express backend (apiClient, authActions, libraryActions, pipelineActions, settingsActions, curio.ts)
│   └── curio.ts
├── assets/          # Static illustrations and logo assets
├── components/      # Reusable React components grouped by section
│   ├── auth/        # AuthPage page (login & registration screens)
│   ├── canvas/      # Central viewport cards (Ignite, History, Library, Saved, Settings)
│   ├── chat/        # Right-hand Tutor chat components
│   └── layout/      # AppShell window structures and MobileHeader
├── contexts/        # Global React Context composer (CurioContext.tsx) and domain providers (Auth, Preferences, Pipeline, Library, Chat)
├── types/           # Core typescript interfaces (curio.d.ts)
├── App.tsx          # Root mounting entrypoint
└── index.css        # Tailwind config, font faces, global journal CSS variables
```

---

## 🔄 Global State Management (`CurioContext.tsx`)

State tracking is divided across modular domain-specific context files:
- **`AuthContext.tsx` (`useAuth`)**: Manages the authenticated user, token, active tab, and session authentication actions.
- **`UserPreferencesContext.tsx` (`usePreferences`)**: Manages interest tags and user settings (AI model, reading duration, tone, etc.).
- **`PipelineContext.tsx` (`usePipeline`)**: Manages active article generation progress streaming (`igniteQuest`), recommendations, and user history.
- **`LibraryContext.tsx` (`useLibrary`)**: Manages custom collections, bookmark folders, and saved sketches/notes.
- **`ChatContext.tsx` (`useChat`)**: Manages interactive context-aware tutor chat threads and window visibility.

The root `CurioContext.tsx` aggregates and nests these providers, exporting the hooks for components to import individually and prevent cross-domain re-renders.

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
