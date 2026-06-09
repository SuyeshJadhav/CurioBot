<div align="center">
  <!-- <img src="assets/logo.png" alt="CurioBot Logo" width="120" /> -->
  <h1>🌟 CurioBot</h1>

  <p><b>A multi-agent curiosity engine that dynamically researches and generates highly engaging articles based on your interests.</b></p>

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](#)
  [![Gemini](https://img.shields.io/badge/Gemini-2.0-8E75B2?logo=google&logoColor=white)](#)
  [![LangGraph](https://img.shields.io/badge/LangGraph-Agentic-1C3C3C?logo=langchain&logoColor=white)](#)
  [![MCP](https://img.shields.io/badge/Protocol-MCP-4CAF50?logo=network&logoColor=white)](#)

  <br />
  <br />
  <img src="assets/image.png" alt="CurioBot Interface" width="800" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
</div>

---

## 📖 Overview

**CurioBot** is a charming, exploration-driven AI platform built with Node.js, React, and LangGraph. It acts as your personal "Curiosity Engine," utilizing a swarm of specialized autonomous agents to research fascinating topics and synthesize them into beautifully rendered, intellectually stimulating articles.

CurioBot doesn't just give you an article to read; it provides an **Interactive Tutor** that learns the context of the article alongside you, allowing for dynamic, conversational follow-up learning directly in the browser.

---

## ✨ Key Features

- 🧠 **Autonomous Multi-Agent Pipeline:** Orchestrated using LangGraph (`StateGraph`), consisting of specialized nodes: Topic Picker, Deduplication Checker, Web Researcher, Wikipedia MCP Researcher, and Writer.
- 🔄 **Topic Deduplication:** An embedding-based similarity check matching newly picked topics against seen topics in Supabase. Too-similar topics are discarded and retried up to 3 times before using a fallback.
- 📚 **Parallel Research (Web + Wiki MCP):** The Researcher agent queries the Tavily API while the Wiki Researcher queries Wikipedia via the Model Context Protocol (MCP) in parallel, featuring API query caching, timeouts, and cancellation.
- ⚡ **Realtime SSE Progress Streaming:** Server-Sent Events stream the agent execution status in real-time (`picking_topic`, `researching`, `writing_article`) to update the UI checklist dynamically.
- ⏳ **Timeout & Cancellation Protection:** Integrated `AbortSignal` cancellation flows that cleanly terminate running tasks when a client disconnects or times out.
- 📊 **Detailed Observability:** Custom pipeline logging to `logs/pipeline_runs.jsonl` tracking execution duration, token counts, Tavily queries, and estimated API cost per run.
- 🛡️ **Rate Limiting & Safety Locks:** Enforces sliding window rate limits, concurrency locks (blocking multiple parallel generations for the same user), and daily generation ceilings (20 articles/user/day).
- 🎨 **Whimsical Multi-Canvas Viewport:** A custom-designed React 19 pastel journal UI featuring interactive canvas viewports:
  - **Home Canvas:** Pipeline progress checklist and article reader (with TLDR and rabbit holes).
  - **Discover Canvas:** Start custom topic explorations or quick-launch generations using predefined tag buttons.
  - **Search Canvas:** Directory search and bookmarking.
  - **Library Canvas:** Custom collection folders and mappings.
  - **Interests Canvas:** Interactive tag builder.
  - **History Canvas:** Reading session logs.
  - **Saved Sketches Canvas:** Markdown bookmarked notes and sketch editor.
  - **Settings Canvas:** Tailor writing style, tone, preferred model, reading duration, knowledge level, and novelty.

---

## 🏗️ Architecture

CurioBot runs on a sophisticated pipeline driven by Google's Gemini LLMs:

```
[START]
   │
   ▼
┌─────────────────────────┐
│      Topic Picker       │ <────────────────────────┐
└─────────────────────────┘                          │ (Retry < 3 times)
   │                                                 │
   ▼                                                 │
┌─────────────────────────┐   No (Not Fresh)   ┌─────────────┐
│   Deduplication Check   │───────────────────>│ Dedup Retry │
└─────────────────────────┘                    └─────────────┘
   │ Yes (Fresh)                                     │
   ▼                                                 │ Yes (Attempts >= 3)
┌─────────────────────────┐                          ▼
│     Start Research      │                    ┌─────────────┐
└─────────────────────────┘                    │  Fallback   │
   │                                           └─────────────┘
   ├───(Parallel)───┐                                 │
   ▼                ▼                                 ▼
┌──────────────┐ ┌───────────────────┐               ...
│ Researcher   │ │ Wiki Researcher   │
│ (Tavily API) │ │ (Wikipedia MCP)   │
└──────────────┘ └───────────────────┘
   │                │
   ▼                ▼
┌─────────────────────────┐
│         Writer          │
└─────────────────────────┘
   │
   ▼
┌─────────────────────────┐
│      Database Sync      │
└─────────────────────────┘
   │
   ▼
 [END]
```

1. **Topic Picker:** Proposes an engaging topic based on interests, novelty level, and hint triggers.
2. **Deduplication Check:** Re-evaluates similarity with user reading history using vector embeddings.
3. **Researcher & Wiki Researcher:** Runs parallel web search (Tavily) and Wikipedia (MCP Server subprocess) tool-calling loops.
4. **Writer:** Synthesizes research data into a markdown article, TLDR, and adjacent rabbit holes.
5. **Database Sync:** Persists the generated topic embedding and article metadata to Supabase.
6. **Tutor:** An interactive sidebar chatbot calibrated to answer follow-up queries about the active article.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS v4, custom HSL color palette
- **Markdown Rendering:** `react-markdown`, `remark-gfm`

### Backend
- **Server:** Node.js, Express, TypeScript
- **Orchestration:** LangGraph (`@langchain/langgraph`), `@langchain/core`
- **AI Integrations:** Google GenAI SDK (`@google/genai`)
- **API & Protocol:** Model Context Protocol (MCP) SDK, Tavily Search API (`@tavily/core`)
- **Database & Memory:** Supabase SDK (`@supabase/supabase-js`)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- API Keys:
  - `GEMINI_API_KEY` (Google AI Studio)
  - `TAVILY_API_KEY` (Tavily Search)
  - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` (Supabase Project Credentials)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SuyeshJadhav/CurioBot.git
   cd CurioBot
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # Create a .env file and add your API keys: GEMINI_API_KEY, TAVILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running Locally

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend application:**
   ```bash
   cd frontend
   npm run dev
   ```

Visit `http://localhost:5173` to ignite your curiosity!

---

## 📁 Project Structure

```text
CurioBot/
├── backend/
│   ├── src/
│   │   ├── agents/      # LangGraph nodes (supervisor, topicPicker, dedupTopic, researcher, wikiResearcher, writer, tutor)
│   │   ├── data/        # Seed interests and editorial templates
│   │   ├── lib/         # API wrappers (gemini, mcp, supabase, memory, embeddings, tavily, observability)
│   │   ├── middleware/  # Middlewares (logger, auth, rateLimiter, errorHandler)
│   │   ├── routes/      # Modular routers (auth, ai [generate/tutor], articles, library, settings)
│   │   └── types/       # Shared TypeScript types & AgentState Annotation
│   ├── logs/            # Pipeline observability execution files
│   ├── server.ts        # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── actions/     # Modular actions (apiClient, authActions, pipelineActions, libraryActions, settingsActions, curio.ts legacy barrel)
│   │   ├── components/  # Canvas sub-views, layouts, chat widgets
│   │   ├── contexts/    # Split domain contexts (Auth, UserPreferences, Pipeline, Library, Chat, and CurioContext composer)
│   │   ├── types/       # Client TypeScript types
│   │   ├── index.css    # Tailwind v4 custom journal variables
│   │   └── App.tsx      # App shell context mapping
│   └── package.json
├── supabase/            # Database schema & migrations
├── DESIGN.md            # Detailed UI/UX aesthetic guidelines
└── EXPLAIN.md           # Core architectural documentation
```

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
