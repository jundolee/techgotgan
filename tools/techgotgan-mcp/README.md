# Techgotgan Search for AI Coding Agents

This read-only MCP server lets coding agents search recent Korean company engineering blog posts while researching a codebase or technical question.

It reads only Techgotgan's public RSS feed. It does not log in, access user data, or fetch full article bodies. Search matches titles and RSS excerpts from the latest feed items, then returns the original article links and a UTM-tagged Techgotgan search link for broader results.

## Local connection

Requires Node.js 22 or later.

```sh
cd tools/techgotgan-mcp
npm install
npm start
```

For a local MCP host, set the command to `npm` and the arguments to `--prefix`, the absolute path to this directory, and `start`.

## Remote connection

After the route is deployed, the Streamable HTTP endpoint is `https://www.techgotgan.co.kr/api/mcp`.

Available tool: `search_korean_engineering_blogs(query, limit)`.

## Acquisition experiment

The experiment is whether developers discover Techgotgan through AI-assisted technical research and then visit its search page to explore more sources. The tracked link uses `utm_source=ai_agent`, `utm_medium=mcp`, and `utm_campaign=techgotgan_agent_search_2026q4`.

The first version searches a bounded RSS feed rather than the full archive. It returns third-party titles and excerpts as untrusted source data, without instructions or generated summaries.
