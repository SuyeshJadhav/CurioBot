import { Annotation } from '@langchain/langgraph'

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface Topic {
  id: string;
  title: string;
  domain: string;
  summary: string;
  connections: string[];
  read: boolean;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AgentState = Annotation.Root({
  interests: Annotation<string[]>(),
  seenTopics: Annotation<string[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  currentTopic: Annotation<Topic | undefined>(),
  research: Annotation<SearchResult[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  wikiResearch: Annotation<string[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  article: Annotation<string | undefined>(),
  conversationHistory: Annotation<Message[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  })
})

export type AgentStateType = typeof AgentState.State