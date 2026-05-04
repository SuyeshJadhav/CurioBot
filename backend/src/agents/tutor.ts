import { ai } from "../lib/gemini";
import { AgentStateType } from "../types";

export async function tutorAgent(
  state: AgentStateType,
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

  // const model = getModel(systemInstruction);

  const chat = ai.chats.create({
    model: "gemini-3.1-flash-lite-preview",
    config: {
      systemInstruction: systemInstruction,
    },
    history: state.conversationHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
  });

  const result = await chat.sendMessage({
    message: question,
  })
  return result.text || "";
}
