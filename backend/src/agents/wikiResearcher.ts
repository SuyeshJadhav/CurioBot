import { ai } from "../lib/gemini";
import { initWikiMcp, executeWikiTool } from "../lib/mcp"
import { AgentStateType } from "../types";

export const wikiResearcherAgent = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
	const { geminiTools } = await initWikiMcp()
	const wikiResults: string[] = []
	const topic = state.currentTopic!
	console.log(`\n 📚 [Wiki Researcher] Researching: "${topic.title}"...`);

	const prompt = `Research the topic: "${topic.title}". Use your tools to search Wikipedia and read relevant articles. Gather enough information to write a comprehensive summary.`
	const conversationHistory: any[] = [{ role: "user", parts: [{ text: prompt }] }]

	let response = await ai.models.generateContent({
		model: "gemini-3.1-flash-lite-preview",
		contents: conversationHistory,
		config: {
			tools: [{ functionDeclarations: geminiTools }]
		},
	});

	let searchCount = 0;
	const MAX_SEARCHES = 3;
	while (true) {
		const candidate = response.candidates?.[0];
		if (!candidate || !candidate.content) break;

		conversationHistory.push(candidate.content);

		const toolCallPart = candidate.content.parts?.find((p: any) => p.functionCall);
		if (!toolCallPart?.functionCall) break;

		if (!toolCallPart?.functionCall || searchCount >= MAX_SEARCHES) break;

		const { name, args } = toolCallPart.functionCall as { name: string, args: Record<string, any> };

		searchCount++

		console.log(`  🔎 [Wiki Researcher] Executing Tool: "${name}"`);

		const { rawResult, text } = await executeWikiTool(name, args)
		wikiResults.push(text);

		conversationHistory.push({
			role: "user",
			parts: [{
				functionResponse: {
					name,
					response: rawResult
				}
			}]
		});

		response = await ai.models.generateContent({
			model: "gemini-3.1-flash-lite-preview",
			contents: conversationHistory,
			config: { tools: [{ functionDeclarations: geminiTools as any }] },
		});
	}
	console.log(`  ✅ [Wiki Researcher] Collected ${wikiResults.length} Wikipedia sources`);
	return { wikiResearch: wikiResults }
}