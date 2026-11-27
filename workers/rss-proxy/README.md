# Techgotgan RSS proxy Worker

This small Worker lets GitHub Actions fetch only the approved public RSS sources that block hosted-runner IP ranges. It uses the shared handler in `src/lib/ingestion/rss-proxy-handler.ts`.

Deploy it as the separate Worker `techgotgan-rss-proxy`:

```bash
npx wrangler@4.165.0 deploy --config workers/rss-proxy/wrangler.jsonc
npx wrangler@4.165.0 secret put RSS_PROXY_TOKEN --config workers/rss-proxy/wrangler.jsonc
```

Use a fresh random bearer token for the Worker secret and the GitHub repository secret with the same name. Do not put its value in a command argument or commit it. Then set the repository variable `RSS_PROXY_URL` to:

```text
https://techgotgan-rss-proxy.<workers.dev-account>.workers.dev/api/rss-proxy
```

The GitHub workflow sends the bearer token only to ingestion and summary jobs. The Worker accepts HTTPS URLs on the source allowlist, validates each redirect, and limits response size and request time.
