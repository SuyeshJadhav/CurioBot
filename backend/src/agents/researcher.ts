import { ai, safetySettings } from "../lib/gemini";
import { searchWeb, SearchResult } from "../lib/tavily";
import { AgentStateType, NodeMetrics } from "../types";

// --- Tool Definition ---
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

async function generateContentWithAbort(
	model: string,
	contents: any[],
	config: any,
	signal?: AbortSignal
): Promise<any> {
	if (signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}

	const abortPromise = new Promise<never>((_, reject) => {
		if (signal) {
			signal.addEventListener("abort", () => {
				reject(new DOMException("Aborted", "AbortError"));
			});
		}
	});

	const apiCall = ai.models.generateContent({
		model,
		contents,
		config
	});

	return Promise.race([apiCall, abortPromise]);
}

export async function researcherAgent(
	state: AgentStateType
): Promise<Partial<AgentStateType>> {
	const startTime = Date.now();
	const signal = state.signal;

	if (signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}

	const TIMEOUT_MS = 25000; // 25 seconds timeout for researcher agent
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
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let searchCount = 0;

	try {
		const topic = state.currentTopic!;
		console.log(`\n🔍 [Researcher Agent] Researching: "${state.currentTopic?.title}"...`);

		const MAX_SEARCHES = 2;
		const prompt = `You are a research agent tasked with gathering rich, accurate information about: "${topic.title}"

Your goal: collect enough information to write a compelling, detailed article for a curious grad student.

CRITICAL: You MUST use the web_search tool to look up factual information. Do NOT rely purely on your internal knowledge. Start with a search query covering the core concept and mechanism of "${topic.title}".

You may use the web_search tool up to ${MAX_SEARCHES} times. Do NOT plan all queries upfront.
Instead, search iteratively:
1. Start with a query covering the core concept and mechanism.
2. After reviewing those results, decide what is still missing or surprising — then search for that.

Start searching now by invoking the web_search tool.`;

		const conversationHistory: any[] = [
			{ role: "user", parts: [{ text: prompt }] }
		];

		const model = state.userSettings?.model || "gemini-3.1-flash-lite";

		let response = await generateContentWithAbort(
			model,
			conversationHistory,
			{
				tools: tools as any,
				safetySettings: safetySettings as any,
			},
			nodeAbortController.signal
		);

		if (response.usageMetadata) {
			totalInputTokens += response.usageMetadata.promptTokenCount || 0;
			totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
		}

		searchCount = 0;
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
				console.warn(`⚠️ [Researcher] Model chose not to search on first turn. Forcing fallback search for topic: "${topic.title}"`);
				const query = topic.title;
				let results: SearchResult[] = [];
				try {
					results = await searchWeb(query, nodeAbortController.signal);
					const existingUrls = new Set(allResults.map((r) => r.url));
					const freshResults = results.filter((r) => !existingUrls.has(r.url));
					allResults.push(...freshResults);
				} catch (err: any) {
					if (err.name === "AbortError" || err.message === "Aborted") {
						throw err;
					}
					console.warn(`  ⚠️ [Researcher] Fallback search failed for "${query}":`, err);
				}
				searchCount++;

				conversationHistory.push(candidate.content);
				conversationHistory.push({
					role: "user",
					parts: [{
						functionResponse: {
							name: "web_search",
							response: {
								results: results.map((r) => ({
									title: r.title,
									content: r.content.slice(0, 1000).replace(/\s\S+$/, "..."),
									url: r.url,
								})),
							},
						},
					}],
				});

				response = await generateContentWithAbort(
					model,
					conversationHistory,
					{
						tools: tools as any,
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

			if (toolCallParts.length === 0 || searchCount >= MAX_SEARCHES) {
				break;
			}

			const functionResponses: any[] = [];

			for (const toolCallPart of toolCallParts) {
				if (searchCount >= MAX_SEARCHES) break;

				const functionCall = toolCallPart.functionCall;
				if (!functionCall) continue;

				const { name, args } = functionCall;
				console.log(`  🔎 [Researcher] Searching: "${(args as any).query}"`);

				let results: SearchResult[] = [];

				try {
					results = await searchWeb((args as any).query, nodeAbortController.signal);

					const existingUrls = new Set(allResults.map((r) => r.url));
					const freshResults = results.filter((r) => !existingUrls.has(r.url));
					allResults.push(...freshResults);
				} catch (err: any) {
					if (err.name === "AbortError" || err.message === "Aborted") {
						throw err;
					}
					console.warn(`  ⚠️ [Researcher] Search failed for "${(args as any).query}":`, err);
				}

				searchCount++;

				functionResponses.push({
					functionResponse: {
						name,
						response: {
							results: results.map((r) => ({
								title: r.title,
								content: r.content.slice(0, 1000).replace(/\s\S+$/, "..."),
								url: r.url,
							})),
						},
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
					tools: tools as any,
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

		console.log(`  ✅ [Researcher] Collected ${allResults.length} unique sources`);

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
			outputTokens: totalOutputTokens,
			tavilyCount: searchCount
		};

		return {
			research: allResults,
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
		if (isTimeout) {
			console.warn(`⚠️ [Researcher Agent] Timeout wrapper hit (duration ${durationMs}ms): NodeTimeout`);
			const nodeMetric: NodeMetrics = {
				nodeName: "researcher",
				durationMs,
				success: false,
				inputTokens: totalInputTokens,
				outputTokens: totalOutputTokens,
				tavilyCount: searchCount,
				error: "NodeTimeout"
			};
			return {
				research: allResults,
				researchSummary: `Web research timed out. Collected ${allResults.length} sources so far.`,
				nodeMetrics: [nodeMetric]
			};
		} else {
			console.warn(`⚠️ [Researcher Agent] Failure hit (duration ${durationMs}ms):`, err.message || err);
			const nodeMetric: NodeMetrics = {
				nodeName: "researcher",
				durationMs,
				success: false,
				inputTokens: totalInputTokens,
				outputTokens: totalOutputTokens,
				tavilyCount: searchCount,
				error: String(err.message || err)
			};
			return {
				research: allResults,
				researchSummary: `Web research failed: ${err.message || err}. Collected ${allResults.length} sources so far.`,
				nodeMetrics: [nodeMetric]
			};
		}
	}
}