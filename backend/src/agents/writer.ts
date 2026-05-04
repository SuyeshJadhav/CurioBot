import { ai } from "../lib/gemini";
import { AgentStateType } from "../types";

export async function writerAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
	const topic = state.currentTopic!;
	console.log(`\n✍️  [Writer Agent] Writing article...`);

	// Format research into readable context for the writer
	const researchContext =
		state.research && state.research.length > 0
			? state.research
				.map(
					(r, i) =>
						`Source ${i + 1}: ${r.title}\n${r.content.slice(0, 600)}`
				)
				.join("\n\n---\n\n")
			: "No external research available — use your own knowledge.";

	const prompt = `Write a rich, engaging article about: "${topic.title}"

You have been provided with real research from the web. Use it to make the article factual, current, and specific. Do not make up facts — ground the article in the research provided.

=== RESEARCH ===
${researchContext}
=== END RESEARCH ===

Guidelines:
- Open with a hook that immediately grabs attention
- Explain the core concept clearly without dumbing it down
- Weave in specific facts, names, examples from the research
- Use clear sections with headers
- End with open questions or why this still matters
- Target length: 600-800 words

Write for a curious 23-year-old MCS grad student.
Be intellectually stimulating — think long-form magazine article, not Wikipedia.`;

	const result = await ai.models.generateContent({
		model: "gemini-3.1-flash-lite-preview",
		contents: prompt
	});
	return {
		article: result.text
	};
}