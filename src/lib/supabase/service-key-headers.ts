const READ_RETRY_DELAYS_MS = [250, 750] as const;
const RETRYABLE_HTTP_STATUSES = new Set([502, 503, 504]);

export type RetryDelay = (milliseconds: number) => Promise<void>;

function isTransientTransportFailure(cause: unknown): boolean {
  let current: unknown = cause;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const record = current as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
    const details = [record.name, record.message, record.code]
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    if (/fetch failed|network request failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(details)) {
      return true;
    }

    current = record.cause;
    depth += 1;
  }

  return false;
}

const defaultDelay: RetryDelay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function getSupabaseServiceHeaders(key: string): Record<string, string> {
  if (key.startsWith("sb_secret_")) return { apikey: key };
  return { apikey: key, authorization: `Bearer ${key}` };
}

export function createSupabaseServiceFetch(
  key: string,
  fetchImplementation: typeof fetch = fetch,
  delay: RetryDelay = defaultDelay,
): typeof fetch {
  return async (input, init) => {
    const requestHeaders = input instanceof Request ? input.headers : undefined;
    const headers = new Headers(init?.headers ?? requestHeaders);
    headers.set("apikey", key);
    if (key.startsWith("sb_secret_") && headers.get("authorization") === `Bearer ${key}`) {
      headers.delete("authorization");
    }

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const retryableRead = method === "GET" || method === "HEAD";
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await fetchImplementation(input, { ...init, headers });
      } catch (cause) {
        if (!retryableRead || !isTransientTransportFailure(cause) || attempt >= READ_RETRY_DELAYS_MS.length) {
          throw cause;
        }
        await delay(READ_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      if (!retryableRead || !RETRYABLE_HTTP_STATUSES.has(response.status) || attempt >= READ_RETRY_DELAYS_MS.length) {
        return response;
      }

      try {
        await response.body?.cancel();
      } catch {
        // Preserve the original retryable response if its body cannot be cancelled.
      }
      await delay(READ_RETRY_DELAYS_MS[attempt]);
    }
  };
}
