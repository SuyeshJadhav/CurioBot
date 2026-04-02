import { AgentState } from "../types";
import { topicPickerAgent } from "./topicPicker";
import { writerAgent } from "./writer";

export async function supervisorAgent(
  interests: string[],
): Promise<AgentState> {
  const state: AgentState = {
    interests,
    seenTopics: [],
    conversationHistory: [],
  };

  console.log("\n🎯 [Supervisor] Starting pipeline...");

  console.log("🔍 [Topic Picker Agent] Selecting topic...");
  state.currentTopic = await topicPickerAgent(state);

  console.log(
    `✍️  [Writer Agent] Writing article on: "${state.currentTopic.title}"...`,
  );
  state.article = await writerAgent(state);

  return state;
}
