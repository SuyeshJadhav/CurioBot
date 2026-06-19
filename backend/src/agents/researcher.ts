import { ai, safetySettings, withAbort } from "../lib/gemini";
import { SearchResult, AgentStateType, NodeMetrics } from "../types";
import { initResearchMcp, executeResearchTool } from "../lib/mcp";

async function generateContentWithAbort(
	model: string,
	contents: any[],
	config: any,
	signal?: AbortSignal
): Promise<any> {
	return withAbort(
		ai.models.generateContent({
			model,
			contents,
			config
		}),
		signal
	);
}

export async function researcherAgent(
	state: AgentStateType
): Promise<Partial<AgentStateType>> {
	const startTime = Date.now();
	const signal = state.signal;

	if (signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}

	const TIMEOUT_MS = 30000; // 30 seconds timeout for research agent
	const nodeAbortController = new AbortController();
	let isTimeout = false;

	const timer = setTimeout(() => {
		isTimeout = true;
		nodeAbortController.abort();
	}, TIMEOUT_MS);

	const onGraphAbort = () => {
		nodeAbortController.abort();
	};

	if (signal) {
		signal.addEventListener("abort", onGraphAbort);
	}

	const allResults: SearchResult[] = [];
	const wikiResults: string[] = [];
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let toolCallCount = 0;

	try {
		const { geminiTools } = await initResearchMcp();
		const topic = state.currentTopic!;
		console.log(`\n🔍 [Researcher Agent] Researching: "${topic.title}"...`);

		const prompt = `You are a research agent investigating: "${topic.title}"

Primary question to answer: "${topic.primaryQuestion || ""}"
Angle to focus on: "${topic.angle || ""}"

You have three tools:
- web_search: for current information, recent developments, specific facts
- scrape_page: to read full content from promising URLs found via search  
- wikipedia_lookup: for foundational background and established history

Research strategy:
1. Start with wikipedia_lookup for foundational context
2. Use web_search to find current/specific sources (1-2 targeted queries)
3. Use scrape_page on the 1-2 most promising URLs from search results
4. Synthesize everything into a comprehensive research summary

Forbidden angles to ignore: ${(topic as any).forbiddenAngles?.join(", ") || "none"}
Maximum tool calls: 5 total`;

		const conversationHistory: any[] = [
			{ role: "user", parts: [{ text: prompt }] }
		];

		const model = state.userSettings?.model || "gemini-3.1-flash-lite";

		let response = await generateContentWithAbort(
			model,
			conversationHistory,
			{
				tools: [{ functionDeclarations: geminiTools }],
				safetySettings: safetySettings as any,
			},
			nodeAbortController.signal
		);

		if (response.usageMetadata) {
			totalInputTokens += response.usageMetadata.promptTokenCount || 0;
			totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
		}

		let firstTurn = true;

		while (true) {
			if (nodeAbortController.signal.aborted) {
				throw new DOMException("Aborted", "AbortError");
			}

			const candidate = response.candidates?.[0];
			if (!candidate || !candidate.content) break;

			const parts = candidate.content.parts;
			let toolCallParts = parts?.filter((p: any) => p.functionCall) ?? [];

			if (firstTurn && toolCallParts.length === 0) {
				console.warn(`⚠️ [Researcher] Model chose not to search on first turn. Forcing fallback Wikipedia lookup for topic: "${topic.title}"`);
				const query = topic.title;
				let textResult = "";
				let rawResult: any = null;
				try {
					const res = await executeResearchTool("wikipedia_lookup", { query });
					textResult = res.text;
					rawResult = res.rawResult;
					if (textResult.trim()) {
						wikiResults.push(textResult);
					}
				} catch (err: any) {
					console.warn(`  ⚠️ [Researcher] Fallback Wikipedia lookup failed:`, err);
					rawResult = { error: String(err) };
				}
				toolCallCount++;

				conversationHistory.push(candidate.content);
				conversationHistory.push({
					role: "user",
					parts: [{
						functionResponse: {
							name: "wikipedia_lookup",
							response: rawResult,
						},
					}],
				});

				response = await generateContentWithAbort(
					model,
					conversationHistory,
					{
						tools: [{ functionDeclarations: geminiTools }],
						safetySettings: safetySettings as any,
					},
					nodeAbortController.signal
				);

				if (response.usageMetadata) {
					totalInputTokens += response.usageMetadata.promptTokenCount || 0;
					totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
				}

				firstTurn = false;
				continue;
			}

			firstTurn = false;
			conversationHistory.push(candidate.content);

			if (toolCallParts.length === 0 || toolCallCount >= 5) {
				break;
			}

			const functionResponses: any[] = [];

			for (const toolCallPart of toolCallParts) {
				if (toolCallCount >= 5) break;

				const functionCall = toolCallPart.functionCall;
				if (!functionCall) continue;

				const { name, args } = functionCall;
				console.log(`  🔎 [Researcher] Executing Tool: "${name}" with args:`, args);

				let rawResult: any = null;
				let textResult = "";

				try {
					const res = await executeResearchTool(name, args);
					rawResult = res.rawResult;
					textResult = res.text;

					if (name === "web_search") {
						try {
							const parsedResults = JSON.parse(textResult);
							if (Array.isArray(parsedResults)) {
								for (const r of parsedResults) {
									allResults.push({
										title: r.title,
										url: r.url,
										content: r.description || "",
										score: 1.0
									});
								}
							}
						} catch (e) {
							console.warn("  ⚠️ Failed to parse web_search result JSON:", e);
						}
					} else if (name === "scrape_page") {
						if (textResult.trim()) {
							allResults.push({
								title: `Scraped Content from ${args.url}`,
								url: args.url,
								content: textResult,
								score: 1.0
							});
						}
					} else if (name === "wikipedia_lookup") {
						if (textResult.trim()) {
							wikiResults.push(textResult);
						}
					}
				} catch (err: any) {
					console.warn(`  ⚠️ [Researcher] Tool execution failed for "${name}":`, err);
					rawResult = { error: String(err) };
				}

				toolCallCount++;

				functionResponses.push({
					functionResponse: {
						name,
						response: rawResult,
					},
				});
			}

			conversationHistory.push({
				role: "user",
				parts: functionResponses,
			});

			response = await generateContentWithAbort(
				model,
				conversationHistory,
				{
					tools: [{ functionDeclarations: geminiTools }],
					safetySettings: safetySettings as any,
				},
				nodeAbortController.signal
			);

			if (response.usageMetadata) {
				totalInputTokens += response.usageMetadata.promptTokenCount || 0;
				totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
			}
		}

		const finalCandidate = response.candidates?.[0];
		const researchSummary = finalCandidate?.content?.parts
			?.filter((p: any) => p.text)
			?.map((p: any) => p.text as string)
			?.join("\n")
			?? "";

		// Deduplicate results by URL
		const seenUrls = new Set<string>();
		const uniqueResults: SearchResult[] = [];
		for (const r of allResults) {
			if (r && r.url && !seenUrls.has(r.url)) {
				seenUrls.add(r.url);
				uniqueResults.push(r);
			}
		}

		console.log(`  ✅ [Researcher] Collected ${uniqueResults.length} unique sources, ${wikiResults.length} Wikipedia lookups`);

		clearTimeout(timer);
		if (signal) {
			signal.removeEventListener("abort", onGraphAbort);
		}

		const durationMs = Date.now() - startTime;
		const nodeMetric: NodeMetrics = {
			nodeName: "researcher",
			durationMs,
			success: true,
			inputTokens: totalInputTokens,
			outputTokens: totalOutputTokens
		};

		return {
			research: uniqueResults,
			wikiResearch: wikiResults,
			researchSummary,
			nodeMetrics: [nodeMetric]
		};
	} catch (err: any) {
		clearTimeout(timer);
		if (signal) {
			signal.removeEventListener("abort", onGraphAbort);
		}

		if (signal?.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}

		const durationMs = Date.now() - startTime;
		const errorName = isTimeout ? "NodeTimeout" : String(err.message || err);
		console.warn(`⚠️ [Researcher Agent] Failure hit (duration ${durationMs}ms):`, errorName);

		const nodeMetric: NodeMetrics = {
			nodeName: "researcher",
			durationMs,
			success: false,
			inputTokens: totalInputTokens,
			outputTokens: totalOutputTokens,
			error: errorName
		};

		const seenUrls = new Set<string>();
		const uniqueResults: SearchResult[] = [];
		for (const r of allResults) {
			if (r && r.url && !seenUrls.has(r.url)) {
				seenUrls.add(r.url);
				uniqueResults.push(r);
			}
		}

		return {
			research: uniqueResults,
			wikiResearch: wikiResults,
			researchSummary: `Research failed or timed out. Error: ${errorName}. Collected ${uniqueResults.length} web sources, ${wikiResults.length} Wiki sources.`,
			nodeMetrics: [nodeMetric]
		};
	}
}