import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import wikiImport from "wikipedia";
import { parse } from "node-html-parser";
import { gotScraping } from 'got-scraping';

// Resolve ESM/CommonJS default export wrapping mismatch
const wiki = typeof (wikiImport as any).default === "function"
  ? (wikiImport as any).default
  : wikiImport;

const server = new McpServer({
  name: "curiobot-research",
  version: "1.0.0",
});

/**
 * TOOL 1: Web search via DuckDuckGo HTML (completely free and keyless)
 * Agent uses this to find current, specific information
 */
server.registerTool(
  "web_search",
  {
    description: "Search the web for current information about a topic. Use for recent events, specific facts, or anything requiring up-to-date sources.",
    inputSchema: {
      query: z.string().describe("Specific search query"),
      count: z.number().optional().default(5).describe("Number of results"),
    }
  },
  async ({ query, count }) => {
    try {
      const response = await gotScraping({
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        timeout: { request: 5000 },
        headerGeneratorOptions: {
          browsers: [{ name: "chrome" }],
          devices: ["desktop"],
          operatingSystems: ["windows", "macos"],
        },
      } as any);
      
      const root = parse(response.body);
      const results: any[] = [];
      const resultElements = root.querySelectorAll(".result__body");

      for (const el of resultElements.slice(0, count)) {
        const titleEl = el.querySelector(".result__a");
        const snippetEl = el.querySelector(".result__snippet");

        if (titleEl) {
          const title = titleEl.text.trim();
          let resultUrl = titleEl.getAttribute("href") || "";

          if (resultUrl.startsWith("//")) {
            resultUrl = "https:" + resultUrl;
          }

          if (resultUrl.includes("uddg=")) {
            try {
              const urlObj = new URL(resultUrl);
              const uddg = urlObj.searchParams.get("uddg");
              if (uddg) {
                resultUrl = decodeURIComponent(uddg);
              }
            } catch {
              const match = resultUrl.match(/uddg=([^&]+)/);
              if (match) {
                resultUrl = decodeURIComponent(match[1]);
              }
            }
          }

          const description = snippetEl ? snippetEl.text.trim() : "";
          results.push({
            title,
            url: resultUrl,
            description,
          });
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(results) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Search failed: ${err.message}` }],
        isError: true,
      };
    }
  },
);

/**
 * TOOL 2: Web page scraper
 * Agent uses this after search to get full content from specific URLs
 */
server.registerTool(
  "scrape_page",
  {
    description: "Fetch and extract readable text content from a specific URL. Use after web_search to get full article content from promising sources.",
    inputSchema: {
      url: z.string().url().describe("The URL to scrape"),
    }
  },
  async ({ url }) => {
    try {
      const response = await gotScraping({
        url,
        timeout: { request: 8000 },
        maxRedirects: 3,
        headerGeneratorOptions: {
          browsers: [{ name: "chrome" }],
          devices: ["desktop"],
          operatingSystems: ["windows", "macos"],
        },
      } as any);

      // Verify content-type to fail-fast on binary/PDF documents
      const contentType = response.headers["content-type"] || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        return {
          content: [
            {
              type: "text",
              text: `Scrape failed: Unsupported content type (${contentType}). Only HTML is supported.`,
            },
          ],
          isError: true,
        };
      }

      const root = parse(response.body);

      // Remove noise elements
      root
        .querySelectorAll(
          "nav, footer, aside, script, style, header, .ads, .cookie-banner, .popup, iframe, noscript",
        )
        .forEach((el) => el.remove());

      // Prefer semantic content containers
      const main =
        root.querySelector("article") ??
        root.querySelector("main") ??
        root.querySelector('[role="main"]') ??
        root.querySelector(".content") ??
        root;

      const text = main.text.replace(/\s+/g, " ").trim().slice(0, 5000);

      if (text.length < 100) {
        return {
          content: [
            { type: "text", text: "Page content too short or unreadable." },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text }],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Scrape failed: ${err.message}` }],
        isError: true,
      };
    }
  },
);

/**
 * TOOL 3: Wikipedia lookup
 * Agent uses this for foundational, encyclopedic background knowledge
 */
server.registerTool(
  "wikipedia_lookup",
  {
    description: "Fetch encyclopedic background information from Wikipedia. Best for foundational concepts, historical context, and established facts. Not suitable for recent events.",
    inputSchema: {
      query: z.string().describe("Topic or concept to look up on Wikipedia"),
    }
  },
  async ({ query }) => {
    try {
      const searchResults = await wiki.search(query);
      if (!searchResults.results.length) {
        return {
          content: [{ type: "text", text: "No Wikipedia results found." }],
          isError: true,
        };
      }

      const page = await wiki.page(searchResults.results[0].title);
      const [summary, content] = await Promise.all([
        page.summary(),
        page.content(),
      ]);

      const text = `SUMMARY:\n${summary.extract || summary.description || JSON.stringify(summary)}\n\nCONTENT:\n${content.slice(0, 4000)}`;

      return {
        content: [{ type: "text", text }],
      };
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `Wikipedia lookup failed: ${err.message}` },
        ],
        isError: true,
      };
    }
  },
);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ CurioBot Research MCP server running");
}

run().catch((err) => {
  console.error("💥 Research MCP crashed:", err);
  process.exit(1);
});
