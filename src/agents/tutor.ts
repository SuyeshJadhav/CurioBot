import { getModel } from "../lib/gemini";
import { AgentState } from "../types";

export async function tutorAgent(
  state: AgentState,
  question: string,
): Promise<string> {
  const systemInstruction = `You are an expert tutor who just taught the user about "${state.currentTopic?.title}".
	
	Here is the article they read:
	${state.article}

	Your job:
	- Answer follow-up questions clearly and engagingly
	- Go deeper than the article when asked
	- Connect ideas to their interests: ${state.interests.join(", ")}
	- If you don't know something, say so honestly
	- Keep responses conversational, not lecture-y
	`;

  const model = getModel(systemInstruction);

  const chat = model.startChat({
    history: state.conversationHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
  });

  const result = await chat.sendMessage(question);
  return result.response.text();
}
