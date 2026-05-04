<div align="center">
  <!-- <img src="assets/logo.png" alt="CurioBot Logo" width="120" /> -->
  <h1>🌟 CurioBot</h1>

  <p><b>A multi-agent curiosity engine that dynamically researches and generates highly engaging articles based on your interests.</b></p>

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](#)
  [![Gemini](https://img.shields.io/badge/Gemini-1.5-8E75B2?logo=google&logoColor=white)](#)
  [![LangGraph](https://img.shields.io/badge/LangGraph-Agentic-1C3C3C?logo=langchain&logoColor=white)](#)
  [![MCP](https://img.shields.io/badge/Protocol-MCP-4CAF50?logo=network&logoColor=white)](#)

  <br />
  <br />
  <img src="assets/image.png" alt="CurioBot Interface" width="800" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
</div>

---

## 📖 Overview

**CurioBot** is a charming, exploration-driven AI platform built with Node.js, React, and LangGraph. It acts as your personal "Curiosity Engine," utilizing a swarm of specialized autonomous agents to research fascinating topics and synthesize them into beautifully rendered, intellectually stimulating long-form articles. 

CurioBot doesn't just give you an article to read; it provides an **Interactive Tutor** that learns the context of the article alongside you, allowing for dynamic, conversational follow-up learning directly in the browser.

## ✨ Key Features

- 🧠 **Autonomous Multi-Agent Pipeline:** A 5-phase LangGraph architecture (Supervisor, Topic Picker, Researcher, Writer, and Tutor) communicating via a centralized state memory.
- 🔍 **Iterative Web Investigation:** The Researcher agent autonomously queries the web via the **Tavily API** and **Wikipedia** (using the Model Context Protocol) through intelligent, iterative function calling.
- 🎨 **Whimsical Dual-Pane Interface:** A custom-designed React 19 frontend utilizing Tailwind CSS v4, featuring a warm, pastel journal aesthetic with an animated pipeline visualizer.
- 💬 **Context-Aware Interactive Tutor:** A persistent sidebar chat that maintains multi-turn context integrity, letting you ask follow-up questions about the generated 600-800 word articles.

## 🏗️ Architecture

CurioBot runs on a sophisticated 5-stage pipeline driven by Google's Gemini LLMs:

1. **Orchestration (Supervisor):** Initializes the shared memory state and routes execution between the specialized agents.
2. **Ideation (Topic Picker):** Analyzes your past interests to propose a highly engaging and uniquely tailored topic.
3. **Investigation (Researcher):** Executes iterative function-calling loops, pulling live data from Tavily and Wikipedia via MCP.
4. **Synthesis (Writer):** Compiles the raw research into a well-structured educational article deeply grounded in factual data.
5. **Interaction (Tutor):** Provides a continuous chat interface synced with the frontend, ready to answer questions and bridge new ideas.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19, Vite
- **Styling:** Tailwind CSS v4
- **Markdown:** `react-markdown`, `remark-gfm`

### Backend
- **Server:** Node.js, Express
- **AI & Orchestration:** LangGraph, LangChain, Google GenAI SDK (`@google/genai`)
- **External Tools:** Model Context Protocol (MCP) SDK, Tavily Search API
- **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- API Keys: 
  - `GEMINI_API_KEY` (Google AI Studio)
  - `TAVILY_API_KEY` (Tavily Search)

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
   # Create a .env file and add your API keys: GEMINI_API_KEY, TAVILY_API_KEY
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

## 📁 Project Structure

```text
CurioBot/
├── backend/
│   ├── src/
│   │   ├── agents/      # LangGraph node definitions (Supervisor, Researcher, etc.)
│   │   ├── lib/         # API wrappers (Gemini, Tavily, MCP)
│   │   └── types/       # Shared AgentState definitions
│   ├── server.ts        # Express entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # PipelineVisualizer, TutorSidebar, IgniteCanvas
│   │   ├── index.css    # Tailwind v4 configuration and custom journal aesthetic
│   │   └── App.tsx      # Dual-pane layout and React Context provider
│   └── package.json
├── DESIGN.md            # Detailed UI/UX aesthetic guidelines
└── EXPLAIN.md           # Core architectural documentation
```

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
