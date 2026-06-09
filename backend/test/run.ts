import * as readline from "readline";
import "dotenv/config";

import { tutorAgent } from "../src/agents/tutor";
import { defaultInterests } from "../src/data/interests";
import { supervisorAgent } from "../src/agents/supervisor";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║     🧠 CurioBot — Curiosity Engine    ║");
  console.log("╚═══════════════════════════════════════╝");

  const state = await supervisorAgent(defaultInterests, "1789f323-cbda-4e6c-aea5-644371a71733");
  const topic = state.currentTopic!;

  console.log("\n" + "═".repeat(60));
  console.log(`📖  ${topic.title.toUpperCase()}`);
  console.log(`🏷️   ${topic.domain}  |  ${topic.summary}`);
  console.log("═".repeat(60));
  console.log("\n" + state.article);
  console.log("\n" + "═".repeat(60));
  console.log(`🔗  Related: ${topic.connections.join("  →  ")}`);
  console.log("═".repeat(60));
  console.log('\n💬  Ask anything about this topic. Type "quit" to exit.\n');

  while (true) {
    const input = await ask("You: ");
    if (input.toLowerCase().trim() === "quit") break;
    if (!input.trim()) continue;

    state.conversationHistory.push({ role: "user", content: input });

    const response = await tutorAgent(state, input);
    console.log(`\nCurioBot: ${response.reply}\n`);

    state.conversationHistory.push({ role: "assistant", content: response.reply });
  }

  console.log("\n👋  See you next time!\n");
  rl.close();
}

main().catch((err: any) => {
  console.error("Error:", err);
  console.error("Cause:", err?.cause);
  console.error("Cause code:", err?.cause?.code);
  console.error("Cause message:", err?.cause?.message);
});
