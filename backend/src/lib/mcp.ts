import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { Type } from "@google/genai";

export const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/lib/researchMcpServer.ts"],
});

// Prevent subprocess from becoming orphaned on parent process exit/termination
process.on("exit", () => {
  const pid = transport.pid;
  if (pid) {
    try {
      process.kill(pid);
    } catch {}
  }
});
process.on("SIGTERM", () => {
  const pid = transport.pid;
  if (pid) {
    try {
      process.kill(pid);
    } catch {}
  }
});

const researchMcp = new Client({
  name: "curiobot-research-client",
  version: "1.0.0",
});

let connectionPromise: Promise<{ researchMcp: Client; geminiTools: any }> | null =
  null;

export async function initResearchMcp() {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await researchMcp.connect(transport);
      const mcpTools = await researchMcp.listTools();

      const geminiTools = mcpTools.tools.map((mcpTool) => ({
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: {
          type: Type.OBJECT,
          properties: mcpTool.inputSchema.properties as Record<string, any>,
          required: mcpTool.inputSchema.required as string[],
        },
      }));

      return { researchMcp, geminiTools };
    })();
  }
  return connectionPromise;
}

export async function executeResearchTool(name: string, args: Record<string, any>) {
  const mcpResult = await researchMcp.callTool({
    name,
    arguments: args,
  });

  const contentArray = (mcpResult?.content as any[]) || [];
  const textContents = contentArray
    .map((c: any) => (c.type === "text" ? c.text : ""))
    .join("\n");

  return {
    rawResult: mcpResult,
    text: textContents,
  };
}

// Backward-compatibility aliases for imports
export { initResearchMcp as initWikiMcp, executeResearchTool as executeWikiTool };
