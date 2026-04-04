import { getInterests } from "../lib/memory";
import { AgentStateType } from "../types";
import { ai } from "../lib/gemini";

export async function topicPickerAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const interests = await getInterests();

  console.log("🔍 [Topic Picker Agent] Selecting topic...");

  const prompt = `You are a curiosity engine for a grad student who loves learning.

  Given these interest areas: ${interests.map((interest) => interest.interest).join(", ")}
  Already seen topics (avoid these): ${state.seenTopics.join(", ") || "none yet"}

  Pick ONE with valid JSON, no markdown, no explanations:
  {
	"id": "unique-kebab-case-slug",
	"title": "Specific Topic Title",
	"domain": "one of the intrest areas",
	"summary": "one irresistible sentence that makes this impossible not to read",
	"connections": ["related topic 1", "related topic 2", "related topic 3"],
	"read": false
  }`;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt
  })
  const text = result.text?.replace(/```json|```/g, "").trim();

  return {
    currentTopic: JSON.parse(text || ""),
    seenTopics: [JSON.parse(text || "").title]
  };
}
