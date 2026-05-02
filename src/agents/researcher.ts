import { ai } from "../lib/gemini";
import { searchWeb, SearchResult } from "../lib/tavily";
import { AgentStateType } from "../types";

// --- Tool Definition ---
// This tells Gemini what tools exist and what they do.
// Gemini uses this to decide when and how to call them.
const tools = [
	{
		functionDeclarations: [
			{
				name: "web_search",
				description:
					"Search the web for current, factual information about a topic. Use this to find recent discoveries, detailed explanations, real-world examples, and expert perspectives.",
				parameters: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description:
								"A specific, well-formed search query. Be precise — search for specific aspects, not just the topic name.",
						},
					},
					required: ["query"],
				},
			},
		],
	},
];

export async function researcherAgent(
	state: AgentStateType
): Promise<Partial<AgentStateType>> {
	const topic = state.currentTopic!;
	const allResults: SearchResult[] = [];
	console.log(`\n [Researcher Agent] Researching: "${state.currentTopic?.title}"...`);
	await new Promise((res) => setTimeout(res, 3000))

	const prompt = `You are a research agent tasked with gathering rich, accurate information about: "${topic.title}"

Your goal: collect enough information to write a compelling, detailed article for a curious grad student.

Use it exactly 2 times with different, specific queries to cover:
1. What it is — core concept and mechanism
2. Something surprising, recent, or counterintuitive about it

Start searching now.`;

	const conversationHistory: any[] = [
		{ role: "user", parts: [{ text: prompt }] }
	];

	// First call
	let response = await ai.models.generateContent({
		model: "gemini-3.1-flash-lite-preview",
		contents: conversationHistory,
		config: { tools: tools as any },
	});

	// --- Function calling loop ---
	// Keep looping as long as Gemini wants to call tools
	const MAX_SEARCHES = 2;
	let searchCount = 0;

	while (true) {
		const candidate = response.candidates?.[0];
		if (!candidate || !candidate.content) break;

		conversationHistory.push(candidate.content);

		const parts = candidate.content.parts;
		const toolCallPart = parts?.find((p: any) => p.functionCall);

		if (!toolCallPart?.functionCall || searchCount >= MAX_SEARCHES) {
			break;
		}

		const { name, args } = toolCallPart.functionCall;
		console.log(`  🔎 [Researcher] Searching: "${(args as any).query}"`);

		// 2 second delay between Gemini calls to respect rate limits
		await new Promise((res) => setTimeout(res, 2000));

		const results = await searchWeb((args as any).query);
		allResults.push(...results);
		searchCount++;

		conversationHistory.push({
			role: "user",
			parts: [
				{
					functionResponse: {
						name,
						response: {
							results: results.map((r) => ({
								title: r.title,
								content: r.content.slice(0, 500),
								url: r.url,
							})),
						},
					},
				},
			],
		});

		response = await ai.models.generateContent({
			model: "gemini-3.1-flash-lite-preview",
			contents: conversationHistory,
			config: { tools: tools as any },
		});
	}

	console.log(`  ✅ [Researcher] Collected ${allResults.length} sources`);
	return {
		research: allResults
	};
}