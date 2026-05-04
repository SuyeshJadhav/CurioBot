import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

/* -------------------------------------------------------
   Health check
   ------------------------------------------------------- */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CurioBot API' });
});

/* -------------------------------------------------------
   POST /api/generate
   Triggers the full LangGraph supervisor pipeline:
     topicPicker → researcher + wikiResearcher → writer
   Returns { topic, article, sessionId }
   ------------------------------------------------------- */
app.post('/api/generate', async (req, res) => {
  const { interests } = req.body as { interests?: string[] };
  const resolvedInterests = interests?.length
    ? interests
    : ['science', 'technology', 'history', 'culture'];

  try {
    // Dynamic import so dotenv is loaded before the agents initialise Gemini
    const { supervisorAgent } = await import('./src/agents/supervisor');

    console.log('\n🚀 [API] /api/generate triggered, interests:', resolvedInterests);
    const result = await supervisorAgent(resolvedInterests);

    if (!result.currentTopic || !result.article) {
      res.status(500).json({ error: 'Pipeline completed but produced no content.' });
      return;
    }

    res.json({
      topic: {
        title: result.currentTopic.title,
        domain: result.currentTopic.domain,
        summary: result.currentTopic.summary,
      },
      article: result.article,
      sessionId: `session-${Date.now()}`,
    });
  } catch (err) {
    console.error('[API] Pipeline error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Pipeline failed to start.',
    });
  }
});

/* -------------------------------------------------------
   POST /api/tutor/chat
   Sends a message to the Tutor agent and returns a reply.
   Body: { message: string, context?: string, history?: Message[] }
   ------------------------------------------------------- */
app.post('/api/tutor/chat', async (req, res) => {
  const { message, context, history } = req.body as {
    message: string;
    context?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!message) {
    res.status(400).json({ error: 'message is required.' });
    return;
  }

  try {
    const { tutorAgent } = await import('./src/agents/tutor');

    // Build a minimal AgentStateType shape for the tutor
    const tutorState = {
      interests: ['science', 'technology'],
      seenTopics: [] as string[],
      currentTopic: context
        ? { id: 'current', title: 'Current Article', domain: 'general', summary: '', connections: [], read: true }
        : undefined,
      research: [],
      wikiResearch: [],
      article: context ?? '',
      conversationHistory: (history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };

    const reply = await tutorAgent(tutorState, message);
    res.json({ reply });
  } catch (err) {
    console.error('[API] Tutor error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Tutor agent error.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ CurioBot API running at http://localhost:${PORT}`);
});
