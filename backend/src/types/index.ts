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
  angle?: string;
  summary: string;
  connections: string[];
  read: boolean;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface NodeMetrics {
  nodeName: string;
  durationMs: number;
  success: boolean;
  inputTokens?: number;
  outputTokens?: number;
  tavilyCount?: number;
  error?: string;
}

export interface UserSettings {
  model?: string;
  reading_time?: "2min" | "5min" | "10min";
  knowledge_level?: "beginner" | "intermediate" | "expert";
  topic_novelty?: "familiar" | "mixed" | "wildcard";
  onboarding_complete?: boolean;
}

export interface WriterOutput {
  title: string;
  article: string;
  tldr: string;
  rabbit_holes: RabbitHole[];
}

export interface RabbitHole {
  title: string;
  domain: string;
  why: string;
}

export const AgentState = Annotation.Root({
  userId: Annotation<string>(),
  interests: Annotation<string[]>(),
  userSettings: Annotation<UserSettings | undefined>(),
  seenTopics: Annotation<string[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  currentTopic: Annotation<Topic | undefined>(),
  topicEmbedding: Annotation<number[] | undefined>(),
  signal: Annotation<AbortSignal | undefined>(),
  hint: Annotation<string | undefined>(),
  research: Annotation<SearchResult[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  wikiResearch: Annotation<string[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  article: Annotation<string | undefined>(),
  tldr: Annotation<string | undefined>(),
  rabbitHoles: Annotation<RabbitHole[] | undefined>(),
  researchSummary: Annotation<string | undefined>(),
  dedupPassed: Annotation<boolean | undefined>(),
  dedupAttempts: Annotation<number>({
    reducer: (current, incoming) => (incoming ?? current ?? 0),
    default: () => 0
  }),
  conversationHistory: Annotation<Message[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  }),
  nodeMetrics: Annotation<NodeMetrics[]>({
    reducer: (currentState, incomingState) => currentState.concat(incomingState),
    default: () => []
  })
})

export type AgentStateType = typeof AgentState.State