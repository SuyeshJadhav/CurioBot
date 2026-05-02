import { AgentState, AgentStateType } from "../types";
import { topicPickerAgent } from "./topicPicker";
import { researcherAgent } from "./researcher";
import { writerAgent } from "./writer";
import { StateGraph, START, END } from '@langchain/langgraph'
import { addSeenTopic } from "../lib/memory";
import { wikiResearcherAgent } from "./wikiResearcher";

const graph = new StateGraph(AgentState)
  .addNode("topic picker", topicPickerAgent)
  .addNode("researcher", researcherAgent)
  .addNode("wiki researcher", wikiResearcherAgent)
  .addNode("writer", writerAgent)

  .addEdge(START, "topic picker")

  // 🔀 THE FAN-OUT: Start both researchers at the exact same time
  .addEdge("topic picker", "researcher")
  .addEdge("topic picker", "wiki researcher")

  // 🔀 THE FAN-IN: Wait for both to finish, then trigger the writer
  .addEdge("researcher", "writer")
  .addEdge("wiki researcher", "writer")

  .addEdge("writer", END)

const app = graph.compile()


export async function supervisorAgent(interests: string[]): Promise<AgentStateType> {
  console.log("\n🎯 [Supervisor] Starting pipeline...");

  const result = await app.invoke({ interests });

  if (result.currentTopic) {
    console.log(`\n💾 [Memory] Saving "${result.currentTopic.title}" to vector database...`);
    await addSeenTopic(result.currentTopic.title, result.currentTopic.summary);
  }

  return result;
}
