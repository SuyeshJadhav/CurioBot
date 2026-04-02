import { getModel } from "../lib/gemini";
import { AgentState } from "../types";

export async function writerAgent(state: AgentState): Promise<string> {
  const model = getModel();
  const topic = state.currentTopic;

  const prompt = `Write a rich, engaging article about: "${topic?.title}"
	
	Guidelines:
	- Open with a hook that immediately grabs attention
	- Explain the core concept clearly without dumbing it down
	- Weave in surprising details, history, or real-world implications
	- Use clear sections with headers
	- End with open questions or why this still matters
	- Target length: 600-800 words

	Write for a curious 23-year-old Master of Computer Science grad student.
	Be intellectually stimulating - not a textbook, not a blog post. Think long-form magazine article.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
