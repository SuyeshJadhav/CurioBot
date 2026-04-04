import { AgentState, AgentStateType } from "../types";
import { topicPickerAgent } from "./topicPicker";
import { researcherAgent } from "./researcher";
import { writerAgent } from "./writer";
import { StateGraph, START, END } from '@langchain/langgraph'

const graph = new StateGraph(AgentState)
  .addNode("topic picker", topicPickerAgent)
  .addNode("researcher", researcherAgent)
  .addNode("writer", writerAgent)

  .addEdge(START, "topic picker")
  .addEdge("topic picker", "researcher")
  .addEdge("researcher", "writer")
  .addEdge("writer", END)

const app = graph.compile()

import { addSeenTopic } from "../lib/memory";

export async function supervisorAgent(interests: string[]): Promise<AgentStateType> {
  console.log("\n🎯 [Supervisor] Starting pipeline...");

  const result = await app.invoke({ interests });
  
  if (result.currentTopic) {
    console.log(`\n💾 [Memory] Saving "${result.currentTopic.title}" to vector database...`);
    await addSeenTopic(result.currentTopic.title, result.currentTopic.summary);
  }
  
  return result;
}
