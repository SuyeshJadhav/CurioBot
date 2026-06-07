import { ai, safetySettings } from "../lib/gemini";
import { initWikiMcp, executeWikiTool } from "../lib/mcp";
import { AgentStateType, NodeMetrics } from "../types";

async function generateContentWithAbort(
  model: string,
  contents: any[],
  config: any,
  signal?: AbortSignal,
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
    config,
  });

  return Promise.race([apiCall, abortPromise]);
}

export const wikiResearcherAgent = async (
  state: AgentStateType,
): Promise<Partial<AgentStateType>> => {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const TIMEOUT_MS = 20000; // 20 seconds timeout for Wikipedia agent

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

  const wikiResults: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let searchCount = 0;

  try {
    const { geminiTools } = await initWikiMcp();
    const topic = state.currentTopic!;
    console.log(`\n📚 [Wiki Researcher] Researching: "${topic.title}"...`);

    const prompt = `Research the topic: "${topic.title}". Use your tools to search Wikipedia and read relevant articles. Gather enough information to write a comprehensive summary.
		
CRITICAL: You MUST use the Wikipedia tools to search and read about "${topic.title}". Do NOT rely purely on your internal knowledge.`;
    const conversationHistory: any[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    const model = state.userSettings?.model || "gemini-3.1-flash-lite";

    let response = await generateContentWithAbort(
      model,
      conversationHistory,
      {
        tools: [{ functionDeclarations: geminiTools }],
        safetySettings: safetySettings as any,
      },
      nodeAbortController.signal,
    );

    if (response.usageMetadata) {
      totalInputTokens += response.usageMetadata.promptTokenCount || 0;
      totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
    }

    const MAX_SEARCHES = 3;

    const nodeAbortPromise = new Promise<never>((_, reject) => {
      nodeAbortController.signal.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });

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
        console.warn(
          `⚠️ [Wiki Researcher] Model chose not to search Wikipedia on first turn. Forcing fallback.`,
        );
        const searchTool = geminiTools.find((t: any) =>
          t.name.toLowerCase().includes("search"),
        );
        if (searchTool) {
          const toolName = searchTool.name;
          const searchArgs = { query: topic.title };
          let textResult = "";
          let rawResult: any = null;
          try {
            const toolPromise = executeWikiTool(toolName, searchArgs);
            const res = await Promise.race([toolPromise, nodeAbortPromise]);
            textResult = res.text;
            rawResult = res.rawResult;
            if (textResult.trim()) {
              wikiResults.push(textResult);
            }
          } catch (err: any) {
            if (err.name === "AbortError" || err.message === "Aborted") {
              throw err;
            }
            console.warn(
              `  ⚠️ [Wiki Researcher] Fallback Wikipedia search failed:`,
              err,
            );
            rawResult = { error: String(err) };
          }
          searchCount++;

          conversationHistory.push(candidate.content);
          conversationHistory.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: rawResult,
                },
              },
            ],
          });

          response = await generateContentWithAbort(
            model,
            conversationHistory,
            {
              tools: [{ functionDeclarations: geminiTools as any }],
              safetySettings: safetySettings as any,
            },
            nodeAbortController.signal,
          );

          if (response.usageMetadata) {
            totalInputTokens += response.usageMetadata.promptTokenCount || 0;
            totalOutputTokens +=
              response.usageMetadata.candidatesTokenCount || 0;
          }

          firstTurn = false;
          continue;
        }
      }

      firstTurn = false;
      conversationHistory.push(candidate.content);

      if (toolCallParts.length === 0 || searchCount >= MAX_SEARCHES) {
        break;
      }

      const functionResponses: any[] = [];

      for (const toolCallPart of toolCallParts) {
        if (searchCount >= MAX_SEARCHES) break;

        const { name, args } = toolCallPart.functionCall as {
          name: string;
          args: Record<string, any>;
        };
        searchCount++;

        console.log(`  🔎 [Wiki Researcher] Executing Tool: "${name}"`);

        try {
          const toolPromise = executeWikiTool(name, args);
          const { rawResult, text } = await Promise.race([
            toolPromise,
            nodeAbortPromise,
          ]);
          if (text.trim()) {
            wikiResults.push(text);
          }

          functionResponses.push({
            functionResponse: {
              name,
              response: rawResult,
            },
          });
        } catch (err: any) {
          if (err.name === "AbortError" || err.message === "Aborted") {
            throw err;
          }
          console.warn(
            `  ⚠️ [Wiki Researcher] Tool execution failed for "${name}":`,
            err,
          );
          functionResponses.push({
            functionResponse: {
              name,
              response: { error: String(err) },
            },
          });
        }
      }

      conversationHistory.push({
        role: "user",
        parts: functionResponses,
      });

      response = await generateContentWithAbort(
        model,
        conversationHistory,
        {
          tools: [{ functionDeclarations: geminiTools as any }],
          safetySettings: safetySettings as any,
        },
        nodeAbortController.signal,
      );

      if (response.usageMetadata) {
        totalInputTokens += response.usageMetadata.promptTokenCount || 0;
        totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
      }
    }

    console.log(
      `  ✅ [Wiki Researcher] Collected ${wikiResults.length} Wikipedia sources`,
    );

    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener("abort", onGraphAbort);
    }

    const durationMs = Date.now() - startTime;
    const nodeMetric: NodeMetrics = {
      nodeName: "wiki researcher",
      durationMs,
      success: true,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };

    return {
      wikiResearch: wikiResults,
      nodeMetrics: [nodeMetric],
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
      console.warn(
        `⚠️ [Wiki Researcher] Timeout wrapper hit (duration ${durationMs}ms): NodeTimeout`,
      );
      const nodeMetric: NodeMetrics = {
        nodeName: "wiki researcher",
        durationMs,
        success: false,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        error: "NodeTimeout",
      };
      return {
        wikiResearch: wikiResults,
        nodeMetrics: [nodeMetric],
      };
    } else {
      console.warn(
        `⚠️ [Wiki Researcher] Failure hit (duration ${durationMs}ms):`,
        err.message || err,
      );
      const nodeMetric: NodeMetrics = {
        nodeName: "wiki researcher",
        durationMs,
        success: false,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        error: String(err.message || err),
      };
      return {
        wikiResearch: wikiResults,
        nodeMetrics: [nodeMetric],
      };
    }
  }
};;
