import { describe, it, expect } from "vitest";

describe("curiosityScorerAgent", () => {
  it("scores candidates, applies hybrid bonuses, and selects the winner", async () => {
    const gemini = await import("../../src/lib/gemini");
    // Mock generateContent to return structured evaluation scores
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          title: "The Accident That Made Sourdough Possible",
          novelty: 9,
          specificity: 9,
          surprise: 9,
          mechanism: 9,
          rabbitHolePotential: 8,
          primaryQuestion: "How did an accident create sourdough?",
          winningCandidateReason: "It connects yeast biology to a ancient culinary mistake."
        },
        {
          title: "History of Bread",
          novelty: 2,
          specificity: 2,
          surprise: 2,
          mechanism: 2,
          rabbitHolePotential: 2,
          primaryQuestion: "What is the history of bread?",
          winningCandidateReason: "General overview of baking history."
        }
      ]),
      usageMetadata: {},
    });

    // Mock embedding generation
    (gemini.ai.models.embedContent as any).mockResolvedValueOnce({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    const { curiosityScorerAgent } = await import("../../src/agents/curiosityScorer");
    const state = {
      userId: "user-1",
      interests: ["cooking", "history"],
      userSettings: {},
      candidates: [
        {
          title: "The Accident That Made Sourdough Possible",
          angle: "How a forgotten bowl of wild yeast starter became sourdough.",
          category: "cooking",
          hook: "Ancient Egyptians accidentally baked the first sourdough.",
          connections: ["baking", "fermentation"]
        },
        {
          title: "History of Bread",
          angle: "A general timeline of grain consumption.",
          category: "history",
          hook: "How bread has been eaten for thousands of years.",
          connections: ["agriculture"]
        }
      ],
      dedupAttempts: 0
    } as any;

    const res = await curiosityScorerAgent(state);

    expect(res.currentTopic).toBeDefined();
    const topic = res.currentTopic!;
    expect(topic.title).toBe("The Accident That Made Sourdough Possible");
    expect(topic.domain).toBe("cooking");
    expect(topic.primaryQuestion).toBe("How did an accident create sourdough?");
    expect(topic.winningCandidateReason).toBe("It connects yeast biology to a ancient culinary mistake.");

    // Check hybrid scoring logic:
    // Base score = 9 + 9 + 9 + 9 + 8 = 44
    // Cooking matches user interest -> +2
    // Title/angle contains "accident" -> +2
    // Title is 6 words (between 5 and 15) -> +1
    // Total should be Math.min(50, 44 + 2 + 2 + 1) = 49
    expect(topic.overallScore).toBe(49);
    expect(res.dedupPassed).toBe(true);
    expect(res.topicEmbedding).toBeDefined();
  });

  it("rejects all candidates if they score below 20 and routes to retry", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          title: "Extremely Boring Topic",
          novelty: 1,
          specificity: 1,
          surprise: 1,
          mechanism: 1,
          rabbitHolePotential: 1,
          primaryQuestion: "Why is it boring?",
          winningCandidateReason: "Boring reason"
        }
      ]),
      usageMetadata: {},
    });

    const { curiosityScorerAgent } = await import("../../src/agents/curiosityScorer");
    const state = {
      userId: "user-1",
      interests: ["cooking"],
      userSettings: {},
      candidates: [
        {
          title: "Extremely Boring Topic",
          angle: "Boring angle.",
          category: "general",
          hook: "Boring hook.",
          connections: []
        }
      ],
      dedupAttempts: 1
    } as any;

    const res = await curiosityScorerAgent(state);

    expect(res.currentTopic).toBeUndefined();
    expect(res.dedupPassed).toBe(false);
    expect(res.dedupAttempts).toBe(2);
  });

  it("disqualifies candidate (overallScore = 0) if novelty is strictly below 7", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          title: "High Quality But Familiar Topic",
          novelty: 6, // strictly below 7
          specificity: 10,
          surprise: 10,
          mechanism: 10,
          rabbitHolePotential: 10,
          primaryQuestion: "Why is it familiar?",
          winningCandidateReason: "Reason"
        }
      ]),
      usageMetadata: {},
    });

    const { curiosityScorerAgent } = await import("../../src/agents/curiosityScorer");
    const state = {
      userId: "user-1",
      interests: ["cooking"],
      userSettings: {},
      candidates: [
        {
          title: "High Quality But Familiar Topic",
          angle: "Familiar angle.",
          category: "general",
          hook: "Familiar hook.",
          connections: []
        }
      ],
      dedupAttempts: 0
    } as any;

    const res = await curiosityScorerAgent(state);
    expect(res.currentTopic).toBeUndefined();
    expect(res.dedupPassed).toBe(false);
    expect(res.dedupAttempts).toBe(1);
  });
});
