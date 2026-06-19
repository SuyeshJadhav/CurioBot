import { initResearchMcp, executeResearchTool } from "../src/lib/mcp";

async function run() {
  console.log("Initializing Research MCP...");
  const { geminiTools } = await initResearchMcp();
  console.log("Tools found:", geminiTools.map((t: any) => t.name));

  console.log("\nExecuting tool wikipedia_lookup for 'Albert Einstein'...");
  const wikiResult = await executeResearchTool("wikipedia_lookup", { query: "Albert Einstein" });
  console.log("Wikipedia result rawResult keys:", Object.keys(wikiResult.rawResult));
  console.log("Wikipedia result text length:", wikiResult.text.length);
  console.log("Wikipedia result text preview:\n", wikiResult.text.substring(0, 300));

  console.log("\nExecuting tool web_search for 'Albert Einstein'...");
  const searchResult = await executeResearchTool("web_search", { query: "Albert Einstein", count: 2 });
  console.log("Search result rawResult keys:", Object.keys(searchResult.rawResult));
  console.log("Search result text length:", searchResult.text.length);
  console.log("Search result text preview:\n", searchResult.text.substring(0, 300));

  console.log("\nExecuting tool scrape_page for 'https://example.com'...");
  const scrapeResult = await executeResearchTool("scrape_page", { url: "https://example.com" });
  console.log("Scrape result rawResult keys:", Object.keys(scrapeResult.rawResult));
  console.log("Scrape result text length:", scrapeResult.text.length);
  console.log("Scrape result text preview:\n", scrapeResult.text.substring(0, 300));

  console.log("\nAll checks completed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});