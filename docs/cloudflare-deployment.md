# Cloudflare Workers deployment

The public Next.js site can be built for Cloudflare Workers with the OpenNext adapter. App-in-Toss continues to use its separate Vite bundle and the existing Supabase Edge Function.

## Build and preview

Install the values from `.dev.vars.example` in a local `.dev.vars` file. Do not commit `.dev.vars`.

```bash
npm run build:cloudflare
npm run preview:cloudflare
```

`npm run smoke:cloudflare` starts a temporary local Worker, verifies the public pages and APIs against Supabase, then removes the temporary secret file and runtime state. The manual GitHub Actions workflow `Cloudflare preview smoke` performs the same check using the repository's Supabase URL and secret.

## First deployment

1. Sign in to a Cloudflare account with Workers Free enabled.
2. `wrangler.jsonc` already has this account's Workers KV namespace ID. For another Cloudflare account, create a free namespace with `npx wrangler kv namespace create techgotgan-next-cache --binding NEXT_INC_CACHE_KV --update-config`, then use its ID in `wrangler.jsonc`.
3. Register a workers.dev account subdomain once. The Worker uses the `techgotgan` account subdomain and the `techgotgan` Worker name.
4. `wrangler.jsonc` contains the public Supabase URL and publishable key as Worker variables. Keep `ADMIN_EMAILS` unset until the owner-only source editor allowlist is intentionally configured; all server actions and the admin backfill API deny access when production admin credentials are missing.
5. Add `SUPABASE_SECRET_KEY` as a Worker secret. Keep it server-side; do not put it in the client bundle or `wrangler.jsonc`.
6. Deploy with `npm run deploy:cloudflare` and verify the generated `workers.dev` URL. The checked-in Wrangler migration creates the SQLite Durable Objects used by the revalidation queue and tag cache.
7. To restore `www.techgotgan.co.kr`, attach a Cloudflare custom domain and update DNS at the current domain provider (KSDOM).

Production fails closed for `/sources`, its Server Actions, and the admin backfill API if neither `ADMIN_EMAILS` nor `ADMIN_PASSWORD` is configured. Set `ADMIN_EMAILS` to the comma-separated Supabase Auth email allowlist before granting access to source management. The backfill API accepts same-origin authenticated POST requests only. GitHub Actions remains responsible for scheduled ingestion and maintenance.

## Free-plan limits

- Workers Free allows 100,000 requests per day and 10 ms CPU time per request. Cloudflare applies this Free-plan limit automatically; custom CPU limits require a paid plan.
- Cloudflare's current Worker bundle limit is 64 MiB uncompressed; `wrangler deploy --dry-run` measured this build at about 18.4 MiB.
- Next.js incremental cache uses Workers KV, which is included in the Workers Free plan (1 GB storage, 100,000 reads/day, 1,000 writes/day). KV is eventually consistent, so cache updates can take up to about 60 seconds to appear globally.
- ISR revalidation uses a Durable Object queue and sharded tag cache. Workers Free includes 100,000 Durable Object requests/day, 13,000 GB-s/day, and 5 GB total SQLite storage across the account.
- This setup avoids enabling R2 or adding its separately billed subscription.
- The Images binding uses Cloudflare's free transformations, currently limited to 5,000 unique transformations each month; new transformations are rejected after that limit rather than billed automatically.
- The OpenNext adapter warns that Next.js 16 `proxy.ts` support is experimental. The preview smoke workflow checks that `/sources` remains protected.
- The GitHub Actions preview workflow exposes `SUPABASE_SECRET_KEY` only to the smoke-test step, not dependency installation or the build.

Cloudflare documents the [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Images pricing](https://developers.cloudflare.com/images/pricing/), and [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare).
