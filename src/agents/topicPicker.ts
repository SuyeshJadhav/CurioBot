import { getModel } from "../lib/gemini";
import { AgentState, Topic } from "../types";

export async function topicPickerAgent(state: AgentState): Promise<Topic> {
  const model = getModel();

  const prompt = `You are a curiosity engine for a grad student who loves learning.

  Given these interest areas: ${state.interests.join(", ")}
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

  const result = await model.generateContent(prompt);
  const text = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
}
