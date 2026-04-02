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

export interface AgentState {
  interests: string[];
  seenTopics: string[];
  currentTopic?: Topic | null;
  article?: string;
  conversationHistory: Message[];
}
