import { Annotation } from "@langchain/langgraph";

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
  novelty?: number;
  surprise?: number;
  specificity?: number;
  mechanism?: number;
  rabbitHolePotential?: number;
  overallScore?: number;
  primaryQuestion?: string;
  winningCandidateReason?: string;
}

export interface TopicCandidate {
  title: string;
  angle: string;
  category: string;
  hook: string;
  connections: string[];
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
  mustIncludeFacts?: number;
  mustIncludeFactsUsed?: number;
  outlineTargetWords?: number;
  actualArticleWords?: number;
  factConsistency?: number;
  hookStrength?: number;
  narrativeFlow?: number;
  curiosityFactor?: number;
  sectionBalance?: number;
  conclusionQuality?: number;
  unsupportedClaims?: number;
  factCorrections?: number;
  sectionsExpanded?: number;
  sectionsCompressed?: number;
  transitionsImproved?: number;
  hookStrengthened?: boolean;
  informationDensity?: number;
  curiosityGap?: number;
  primaryQuestion?: string;
  winningCandidateReason?: string;
  insightDensity?: number;
  insightOriginality?: number;
  factToInsightRatio?: number;
  insightsGenerated?: number;
  insightsUsed?: number;
}

export interface UserSettings {
  model?: string;
  reading_time?: "2min" | "5min" | "10min";
  knowledge_level?: "beginner" | "intermediate" | "expert";
  topic_novelty?: "familiar" | "mixed" | "wildcard";
  onboarding_complete?: boolean;
}

export interface WriterOutput {
  reasoning?: string;
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

export interface OutlineSection {
  heading: string;
  purpose: string;
  keyFacts: string[];
  example: string;
  transition: string;
  targetWordCount: number;
  formattingHint?: string;
  centralInsight?: string;
}

export interface ArticleOutline {
  title: string;
  hook: string;
  sections: OutlineSection[];
}

export interface ResearchBrief {
  coreConcepts: string[];
  interestingFacts: string[];
  examples: string[];
  controversies: string[];
  historicalContext: string[];
  recentDevelopments: string[];
  articleAngles: string[];
  narrativeHooks: string[];
  counterintuitiveInsights: string[];
  mustIncludeFacts: string[];
  sectionSuggestions: string[];
  premiseNotes?: string[];
  primaryAngle?: string;
  forbiddenAngles?: string[];
  primaryQuestion?: string;
  winningCandidateReason?: string;
}

export interface Insight {
  insight: string;
  whyInteresting: string;
  whyCounterintuitive?: string;
  supportingEvidence: string[];
  confidence: "high" | "medium" | "low";
}

export interface InsightBrief {
  coreInsights: Insight[];
}

export const AgentState = Annotation.Root({
  userId: Annotation<string>(),
  interests: Annotation<string[]>(),
  userSettings: Annotation<UserSettings | undefined>(),
  seenTopics: Annotation<string[]>({
    reducer: (currentState, incomingState) =>
      currentState.concat(incomingState),
    default: () => [],
  }),
  requestedTopic: Annotation<Partial<Topic> | undefined>(),
  currentTopic: Annotation<Topic | undefined>(),
  topicEmbedding: Annotation<number[] | undefined>(),
  candidates: Annotation<TopicCandidate[] | undefined>(),
  signal: Annotation<AbortSignal | undefined>(),
  onWriterWord: Annotation<
    ((word: string) => void | Promise<void>) | undefined
  >(),
  hint: Annotation<string | undefined>(),
  research: Annotation<SearchResult[]>({
    reducer: (currentState, incomingState) =>
      currentState.concat(incomingState),
    default: () => [],
  }),
  wikiResearch: Annotation<string[]>({
    reducer: (currentState, incomingState) =>
      currentState.concat(incomingState),
    default: () => [],
  }),
  researchBrief: Annotation<ResearchBrief | undefined>(),
  insightBrief: Annotation<InsightBrief | undefined>(),
  outline: Annotation<ArticleOutline | undefined>(),
  keyFacts: Annotation<string[] | undefined>(),
  article: Annotation<string | undefined>(),
  tldr: Annotation<string | undefined>(),
  rabbitHoles: Annotation<RabbitHole[] | undefined>(),
  researchSummary: Annotation<string | undefined>(),
  dedupPassed: Annotation<boolean | undefined>(),
  dedupAttempts: Annotation<number>({
    reducer: (current, incoming) => incoming ?? current ?? 0,
    default: () => 0,
  }),
  conversationHistory: Annotation<Message[]>({
    reducer: (currentState, incomingState) =>
      currentState.concat(incomingState),
    default: () => [],
  }),
  nodeMetrics: Annotation<NodeMetrics[]>({
    reducer: (currentState, incomingState) =>
      currentState.concat(incomingState),
    default: () => [],
  }),
  researchFactCount: Annotation<number | undefined>(),
  briefFactCount: Annotation<number | undefined>(),
  outlineSectionCount: Annotation<number | undefined>(),
  articleWordCount: Annotation<number | undefined>(),
  researchFactsUsed: Annotation<number | undefined>(),
  insightsGenerated: Annotation<number | undefined>(),
  insightsUsed: Annotation<number | undefined>(),
});

export type AgentStateType = typeof AgentState.State;
