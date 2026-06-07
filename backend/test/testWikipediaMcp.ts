import { initWikiMcp, executeWikiTool } from "../src/lib/mcp";

async function run() {
  console.log("Initializing Wikipedia MCP...");
  const { geminiTools } = await initWikiMcp();
  console.log("Tools found:", geminiTools.map((t: any) => t.name));

  console.log("\nExecuting tool findPage for 'Albert Einstein'...");
  const searchResult = await executeWikiTool("findPage", { query: "Albert Einstein" });
  console.log("Search result rawResult status code/keys:", Object.keys(searchResult.rawResult));
  console.log("Search result text length:", searchResult.text.length);
  console.log("Search result text preview:\n", searchResult.text.substring(0, 500));

  console.log("\nExecuting tool getPage for 'Albert Einstein'...");
  const pageResult = await executeWikiTool("getPage", { title: "Albert Einstein" });
  console.log("Page result rawResult keys:", Object.keys(pageResult.rawResult));
  console.log("Page result text length:", pageResult.text.length);
  console.log("Page result text preview:\n", pageResult.text.substring(0, 500));

  console.log("\nAll checks completed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});