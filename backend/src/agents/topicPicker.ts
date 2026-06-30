import { AgentStateType, NodeMetrics, TopicCandidate } from "../types";
import { ai, safetySettings } from "../lib/gemini";
import { pickRandomTemplate } from "../data/editorialTemplates";
import { getRecentSeenTopics } from "../lib/memory";

const CHAOS_CONCEPTS = [
  "Mycology and fungal networks",
  "Cold War Espionage and double agents",
  "Deep-sea bioluminescence",
  "Medieval alchemy",
  "Quantum entanglement",
  "Urban exploration of abandoned structures",
  "Typography and font design",
  "Ant colony optimization algorithms",
  "Retro-futuristic architecture",
  "The history of salt trade",
  "Epigenetics and cellular memory",
  "Acoustic ecology and natural sounds",
  "Subterranean seed vaults",
  "Automata and mechanical clocks",
  "Victorian poison gardens",
  "Game theory in animal behavior",
  "Cybernetic feedback loops",
  "The Bronze Age Collapse",
  "Nomadic architecture",
  "Obsolete storage media",
  "Bioluminescent mushrooms",
  "The geology of gemstones",
  "Early ballooning and aviation",
  "Philosophy of absurdism",
  "Fractal geometry in nature",
  "Micro-nations and self-proclaimed states",
  "Symbiotic relationships in coral reefs",
  "Synchronized fireflies",
  "The physics of bubbles",
  "Cryptography before computers",
  "The search for extraterrestrial intelligence (SETI)",
  "Miniature painting techniques",
  "Dendrochronology and tree ring dating",
  "Ice core science and climate history",
  "The physics of sailing",
  "Ancient navigation and Polynesian star paths",
  "Historical cryptography and the Voynich manuscript",
  "Volcano acoustics",
  "Parasitic mind control in insects",
  "Rare manuscript preservation",
  "High-frequency trading algorithms",
  "Kinetic sculptures",
  "Extreme weather chasing",
  "The sociology of subcultures",
  "Marine archaeology and shipwrecks",
  "The chemistry of fermentation",
  "Sleep science and lucid dreaming",
  "Synthetic biology",
  "Cognitive biases in design",
  "Space elevator engineering",
  "The psychology of magic tricks",
  "Traditional weaving patterns",
  "The history of the calendar",
  "Rare earth minerals and geopolitics",
  "Biomimetic robots",
  "Deep space probes and Voyager",
  "Linguistic drift and dialect evolution",
  "The mathematics of origami",
  "Bioluminescent bay ecology",
  "The history of maps and cartography",
  "Animal architecture",
  "Atmospheric optics, rainbows, and mirages",
  "Memory palaces and mnemonics",
  "Deep time geology",
  "Solar sail propulsion",
  "Historical glassblowing",
  "Artificial general intelligence ethics",
  "The history of tea ceremonies",
  "Urban microclimates",
  "The science of scent and olfaction",
  "Ancient hydraulic engineering",
  "High-altitude survival physiology",
  "Fictional cartography and imagined geographies",
  "The physics of musical instruments",
  "Superconductors and levitation",
  "The history of writing systems",
  "Carnivorous plants",
  "The mathematics of juggling",
  "Hydrothermal vent ecosystems",
  "Forensic science history",
  "Non-Newtonian fluids",
  "The evolution of eyes",
  "Ancient board games",
  "Glass frog camouflage",
  "The physics of sand dunes",
  "Deep cave exploration",
  "The history of codebreaking",
  "Cyber-physical systems",
  "Architectural acoustics and whispering galleries",
  "The physics of snow and avalanches",
  "Seed dispersal mechanisms",
  "The evolution of cooperation",
  "Deep-sea trench exploration",
  "The history of standard weights and measures",
  "Animal camouflage and mimicry",
  "The science of color perception",
  "High-altitude balloon science",
  "Extreme longevity organisms",
  "The physics of boomerangs",
  "Medieval siege engines"
];

const FALLBACK_CANDIDATE: TopicCandidate = {
  title: "The Strange History of Time Zones",
  category: "history",
  angle: "How a railroad squabble in 1883 divided the planet into arbitrary hourly stripes.",
  hook: "A look at the chaotic transition from local solar clocks to the standardized time zones we live by today.",
  connections: ["railroads", "navigation", "standard time"],
};

function validateCandidate(obj: any): TopicCandidate {
  if (!obj || typeof obj !== "object") {
    throw new Error("Candidate is not a JSON object");
  }
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : "Uncharted Wonder";
  const category =
    typeof obj.category === "string" && obj.category.trim()
      ? obj.category.trim()
      : typeof obj.domain === "string" && obj.domain.trim()
      ? obj.domain.trim()
      : "general";
  const angle =
    typeof obj.angle === "string" && obj.angle.trim()
      ? obj.angle.trim()
      : "An intriguing angle waiting to be explored.";
  const hook =
    typeof obj.hook === "string" && obj.hook.trim()
      ? obj.hook.trim()
      : typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : "A fascinating look at an untold curiosity.";
  const connections = Array.isArray(obj.connections)
    ? obj.connections.filter((c: any) => typeof c === "string")
    : [];

  return { title, angle, category, hook, connections };
}

export async function topicPickerAgent(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const interests = state.interests || [];
  const requestedTitle = state.requestedTopic?.title;

  let candidates: TopicCandidate[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  // Fetch recent seen topics from database for pre-emptive blacklisting
  const recentTopics = await getRecentSeenTopics(state.userId, 20);
  const unifiedBlacklist = Array.from(new Set([
    ...(state.seenTopics || []),
    ...recentTopics
  ]));

  if (requestedTitle && (!state.dedupAttempts || state.dedupAttempts === 0)) {
    console.log(`🔍 [Topic Picker Agent] Generating candidates for requested topic: "${requestedTitle}"`);
    const model = state.userSettings?.model || "gemini-3.1-flash-lite";

    const prompt = `You are the editorial director of a general knowledge magazine (like Kurzgesagt or Wait But Why).
The user wants to read a highly engaging, custom article about: "${requestedTitle}".

IMPORTANT — Banned/Overused Words: Do NOT use any of the following words in titles, hooks, or angles: "ghost", "ghosts", "ghostly", "haunted", "haunting", "phantom", "spectral", "supernatural", "paranormal", "eerie", "spooky". These have been massively overused. Find fresher, more specific vocabulary.

Your task:
Generate 4-6 distinct candidate angles/hooks for this topic. Each candidate should present a different, catchier magazine-style headline, and a specific narrative hook or angle.

Return ONLY a JSON array, no markdown fences:
[
  {
    "title": "A catchy, specific magazine headline representing this angle of the topic",
    "category": "The category (e.g. Science, History, Technology, etc.)",
    "hook": "An intriguing one-sentence hook summary about this angle",
    "angle": "The surprising connection, counterintuitive insight, or hidden mechanism for this angle",
    "connections": ["related topic 1", "related topic 2"]
  }
]`;

    try {
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          safetySettings: safetySettings as any,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" },
                hook: { type: "string" },
                angle: { type: "string" },
                connections: { type: "array", items: { type: "string" } }
              },
              required: ["title", "category", "hook", "angle", "connections"]
            }
          }
        },
      });

      const text = result.text?.replace(/```json|```/g, "").trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          candidates = parsed.map(validateCandidate);
        }
      }
      if (result.usageMetadata) {
        inputTokens = result.usageMetadata.promptTokenCount || 0;
        outputTokens = result.usageMetadata.candidatesTokenCount || 0;
      }
    } catch (err) {
      console.warn("⚠️ [Topic Picker Agent] LLM candidates generation for custom topic failed:", err);
    }
  } else {
    console.log("🔍 [Topic Picker Agent] Selecting topic candidates...");
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

    // Probabilistic Chaos Injection
    const shouldInjectChaos = Math.random() > 0.4;
    let chaosSection = "";
    if (shouldInjectChaos) {
      const randomChaosConcept = CHAOS_CONCEPTS[Math.floor(Math.random() * CHAOS_CONCEPTS.length)];
      chaosSection = `\n\nChaos Intersection Requirement: You MUST force a creative, surprising, and premium intersection of the reader's interests with the concept: "${randomChaosConcept}". Do not make it feel jarring; weave the two together into a coherent, high-quality narrative angle.`;
      console.log(`🌀 [Topic Picker] Chaos injection triggered with concept: "${randomChaosConcept}"`);
    } else {
      console.log("🌀 [Topic Picker] Chaos injection skipped: deep exploration of stated interests selected.");
    }

    const prompt = `You are the editorial director of a general knowledge magazine — think Kurzgesagt, Wait But Why, or a really good Wikipedia rabbit hole. Your job is to pick topic candidates that make a curious person stop scrolling and think "I need to read this."

The reader is broadly curious about: ${interests.join(", ")}${hintSection}

Editorial direction (follow this strictly):
<topic_novelty_guide>${noveltyGuide}</topic_novelty_guide>${chaosSection}

Topics already covered (avoid these): ${unifiedBlacklist.join(", ") || "none yet"}

The topic candidates should fit this editorial frame: "${template}"

A great topic candidate:
- Has a surprising twist, counterintuitive angle, or "wait, really?" moment (unexpected connections)
- Connects something abstract or historical to everyday modern life
- Could be explained to a curious 20-year-old without jargon
- Tells a story, not just facts
- Has a narrative hook and rabbit-hole potential

IMPORTANT — Banned/Overused Words: Do NOT use any of the following words in titles, hooks, or angles: "ghost", "ghosts", "ghostly", "haunted", "haunting", "phantom", "spectral", "supernatural", "paranormal", "eerie", "spooky". These have been massively overused. Find fresher, more specific vocabulary.

Your task:
Generate 4-6 distinct candidate topics.
Return ONLY a JSON array, no markdown fences:
[
  {
    "title": "An engaging, specific title (think magazine headline, not textbook chapter)",
    "category": "one of the interest areas above, or a blend",
    "angle": "the surprising connection or counterintuitive hook — what makes this topic unmissable",
    "hook": "one sentence that makes this topic impossible not to read",
    "connections": ["related topic 1", "related topic 2"]
  }
]`;

    try {
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          safetySettings: safetySettings as any,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" },
                angle: { type: "string" },
                hook: { type: "string" },
                connections: { type: "array", items: { type: "string" } }
              },
              required: ["title", "category", "angle", "hook", "connections"]
            }
          }
        },
      });

      const text = result.text?.replace(/```json|```/g, "").trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          candidates = parsed.map(validateCandidate);
        }
      }
      if (result.usageMetadata) {
        inputTokens = result.usageMetadata.promptTokenCount || 0;
        outputTokens = result.usageMetadata.candidatesTokenCount || 0;
      }
    } catch (err) {
      console.warn("⚠️ [Topic Picker Agent] LLM candidates generation failed:", err);
    }
  }

  // Fallback if no candidates were generated
  if (candidates.length === 0) {
    console.warn("⚠️ [Topic Picker] No candidates generated, using fallback candidate.");
    candidates = [FALLBACK_CANDIDATE];
  }

  const durationMs = Date.now() - startTime;
  const nodeMetric: NodeMetrics = {
    nodeName: "topic picker",
    durationMs,
    success: candidates.length > 0,
    inputTokens,
    outputTokens,
  };

  console.log(`✅ [Topic Picker] Generated ${candidates.length} candidates.`);

  return {
    candidates,
    nodeMetrics: [nodeMetric],
  };
}
