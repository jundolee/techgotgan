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
2. Create the response-cache bucket once: `npx wrangler r2 bucket create techgotgan-next-cache`.
3. Add Worker variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ADMIN_EMAILS`.
4. Add `SUPABASE_SECRET_KEY` as a Worker secret. Keep it server-side; do not put it in the client bundle or `wrangler.jsonc`.
5. Deploy with `npm run deploy:cloudflare` and verify the generated `workers.dev` URL.
6. To restore `www.techgotgan.co.kr`, attach a Cloudflare custom domain and update DNS at the current domain provider (KSDOM).

Production fails closed for `/sources` if neither `ADMIN_EMAILS` nor `ADMIN_PASSWORD` is configured. Set `ADMIN_EMAILS` to the comma-separated Supabase Auth email allowlist before granting access to source management. GitHub Actions remains responsible for scheduled ingestion and maintenance.

## Free-plan limits

- Workers Free allows 100,000 requests per day and 10 ms CPU time per request. The Worker configuration keeps that 10 ms limit explicit.
- Cloudflare's current Worker bundle limit is 64 MiB uncompressed; `wrangler deploy --dry-run` measured this build at about 18.4 MiB.
- The R2 cache bucket is configured for Next.js ISR/data caching. R2 Free includes 10 GB-month of storage and included request allowances.
- The Images binding uses Cloudflare's free transformations, currently limited to 5,000 unique transformations each month; new transformations are rejected after that limit rather than billed automatically.
- The OpenNext adapter warns that Next.js 16 `proxy.ts` support is experimental. The preview smoke workflow checks that `/sources` remains protected.

Cloudflare documents the [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Images pricing](https://developers.cloudflare.com/images/pricing/), and [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare).
