import { generateEmbedding } from "../lib/embeddings";
import { AgentStateType, NodeMetrics, Topic } from "../types";
import { ai, safetySettings } from "../lib/gemini";
import { pickRandomTemplate } from "../data/editorialTemplates";
import { AppError } from "../lib/errors";


interface LocalTopic {
  id: string;
  title: string;
  domain: string;
  angle?: string;
  summary: string;
  connections: string[];
  read: boolean;
}

const FALLBACK_TOPIC: LocalTopic = {
  id: "strange-history-of-time-zones",
  title: "The Strange History of Time Zones",
  domain: "history",
  angle:
    "How a railroad squabble in 1883 divided the planet into arbitrary hourly stripes.",
  summary:
    "A look at the chaotic transition from local solar clocks to the standardized time zones we live by today.",
  connections: ["railroads", "navigation", "standard time"],
  read: false,
};

function validateTopic(obj: any): LocalTopic {
  if (!obj || typeof obj !== "object") {
    throw new Error("Candidate is not a JSON object");
  }
  const id =
    typeof obj.id === "string" && obj.id.trim()
      ? obj.id.trim()
      : `topic-${Date.now()}`;
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : "Uncharted Wonder";
  const domain =
    typeof obj.domain === "string" && obj.domain.trim()
      ? obj.domain.trim()
      : "general";
  const angle = typeof obj.angle === "string" ? obj.angle.trim() : undefined;
  const summary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : "A fascinating exploration of an untold wonder.";
  const connections = Array.isArray(obj.connections)
    ? obj.connections.filter((c: any) => typeof c === "string")
    : [];
  const read = !!obj.read;

  return { id, title, domain, angle, summary, connections, read };
}

export async function topicPickerAgent(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const interests = state.interests || [];

  const requestedTitle = state.requestedTopic?.title;
  if (requestedTitle && (!state.dedupAttempts || state.dedupAttempts === 0)) {
    console.log(`🔍 [Topic Picker Agent] Using requested topic: "${requestedTitle}"`);
    const candidate: Topic = {
      id: requestedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title: requestedTitle,
      domain: state.requestedTopic?.domain || interests[0] || "general",
      summary: state.requestedTopic?.summary || `An exploration of ${requestedTitle}.`,
      connections: [],
      read: false
    };
    const durationMs = Date.now() - startTime;
    const nodeMetric: NodeMetrics = {
      nodeName: "topic picker",
      durationMs,
      success: true,
      inputTokens: 0,
      outputTokens: 0,
    };
    return {
      currentTopic: candidate,
      seenTopics: [candidate.title],
      nodeMetrics: [nodeMetric],
    };
  }

  console.log("🔍 [Topic Picker Agent] Selecting topic...");

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";
  const noveltyGuide = ({
    familiar: "Stay close to the reader's existing interests. Pick a topic that deepens or clarifies something they already care about.",
    mixed: "Blend familiar interests with one unexpected adjacent domain. The connection should feel surprising but inevitable.",
    wildcard: "Ignore the interests list. Pick something the reader has never thought about but will immediately find fascinating. Surprise them."
  } as Record<string, string>)[state.userSettings?.topic_novelty ?? "mixed"] ?? "Blend familiar interests with one unexpected adjacent domain.";
  const hintSection = state.hint
    ? `\n\nNudge/Hint: The reader was just reading about "${state.hint}". Try to pick a topic that is related or adjacent to this topic, but feel free to pick any great topic that matches their interests.`
    : "";
  const template = pickRandomTemplate();

  const prompt = `You are the editorial director of a general knowledge magazine — think Kurzgesagt, Wait But Why, or a really good Wikipedia rabbit hole. Your job is to pick topics that make a curious person stop scrolling and think "I need to read this."

The reader is broadly curious about: ${interests.join(", ")}${hintSection}

Editorial direction (follow this strictly):
<topic_novelty_guide>${noveltyGuide}</topic_novelty_guide>


Topics already covered (avoid these): ${state.seenTopics.join(", ") || "none yet"}

The topic should fit this editorial frame: "${template}"

A great topic:
- Has a surprising twist, counterintuitive angle, or "wait, really?" moment
- Connects something abstract or historical to everyday modern life
- Could be explained to a curious 20-year-old without jargon
- Has a narrative arc — it tells a story, not just facts
- Would prompt someone to share it with a friend

A bad topic is one that only specialists care about (e.g. "The Pythagorean Comma", "Hegelian Dialectics", "The Krebs Cycle").

Pick ONE topic and respond with valid JSON only, no markdown:
{
  "id": "unique-kebab-case-slug",
  "title": "An engaging, specific title (think magazine headline, not textbook chapter)",
  "domain": "one of the interest areas above, or a blend",
  "angle": "the surprising hook — what makes this unmissable",
  "summary": "one sentence that makes this impossible not to read",
  "connections": ["related topic 1", "related topic 2", "related topic 3"],
  "read": false
}`;

  let candidate: Topic | null = null;
  let candidateEmbedding: number[] | undefined;
  let sawEmptyResponse = false;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Single attempt — LangGraph retries by looping back to this node via dedupTopicNode
  try {
    const {
      candidate: genCandidate,
      usageMetadata,
      emptyText,
    } = await generateCandidate(prompt, model);
    if (usageMetadata) {
      totalInputTokens += usageMetadata.promptTokenCount || 0;
      totalOutputTokens += usageMetadata.candidatesTokenCount || 0;
    }
    if (emptyText) sawEmptyResponse = true;
    candidate = genCandidate;

    // Generate embedding here — dedupTopicNode reads it from state.topicEmbedding
    if (candidate) {
      candidateEmbedding = await generateEmbedding(
        `${candidate.title}\n${candidate.summary}`,
      );
      if (!candidateEmbedding) {
        console.warn("⚠️ [Topic Picker] Embedding failed, dedup will be skipped.");
      }
      console.log(`✅ [Topic Picker] Selected: "${candidate.title}"`);
    }
  } catch (err) {
    console.warn("⚠️ [Topic Picker] Attempt failed:", err);
    candidate = null;
  }

  if (!candidate) {
    if (sawEmptyResponse) {
      throw new AppError(
        502,
        "Topic picker returned an empty response from Gemini.",
      );
    }
    console.warn(
      "⚠️ [Topic Picker] Failed to select a fresh topic after retries. Using safety fallback.",
    );
    candidate = FALLBACK_TOPIC;
    try {
      candidateEmbedding = await generateEmbedding(
        `${candidate.title}\n${candidate.summary}`,
      );
    } catch (e) {
      console.error("⚠️ Failed to generate embedding for fallback topic:", e);
    }
  }

  const durationMs = Date.now() - startTime;
  const nodeMetric: NodeMetrics = {
    nodeName: "topic picker",
    durationMs,
    success: !!candidate,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };

  return {
    currentTopic: candidate,
    seenTopics: candidate ? [candidate.title] : [],
    topicEmbedding: candidateEmbedding,
    nodeMetrics: [nodeMetric],
  };
}

async function generateCandidate(
  prompt: string,
  model: string,
): Promise<{
  candidate: Topic | null;
  usageMetadata?: any;
  emptyText?: boolean;
}> {
  const result = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      safetySettings: safetySettings as any,
    },
  });

  const text = result.text?.replace(/```json|```/g, "").trim();
  if (!text)
    return {
      candidate: null,
      usageMetadata: result.usageMetadata,
      emptyText: true,
    };

  try {
    const parsed = JSON.parse(text);
    return {
      candidate: validateTopic(parsed),
      usageMetadata: result.usageMetadata,
    };
  } catch (e) {
    console.warn(
      "⚠️ [Topic Picker] Failed to parse candidate JSON:",
      e,
      "Raw text:",
      text,
    );
    return { candidate: null, usageMetadata: result.usageMetadata };
  }
}
