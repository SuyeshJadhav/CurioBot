import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { Type } from "@google/genai";

export const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/lib/wikipediaMcpServer.ts"],
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

const wikiMcp = new Client({
  name: " Wikipedia-mcp",
  version: "1.0.0",
});

let connectionPromise: Promise<{ wikiMcp: Client; geminiTools: any }> | null =
  null;

export async function initWikiMcp() {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      await wikiMcp.connect(transport);
      const mcpTools = await wikiMcp.listTools();

      const geminiTools = mcpTools.tools.map((mcpTool) => ({
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: {
          type: Type.OBJECT,
          properties: mcpTool.inputSchema.properties as Record<string, any>,
          required: mcpTool.inputSchema.required as string[],
        },
      }));

      return { wikiMcp, geminiTools };
    })();
  }
  return connectionPromise;
}

export async function executeWikiTool(name: string, args: Record<string, any>) {
  const mcpResult = await wikiMcp.callTool({
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
