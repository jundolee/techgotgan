import { IngestionInfrastructureError } from "./error-message";

const RETRY_DELAYS_MS = [500, 1_500, 3_000] as const;

export type SupabaseReadResult<T> = {
  data: T | null;
  error: unknown;
};

export type RetryDelay = (milliseconds: number, signal?: AbortSignal) => Promise<void>;

function isTransientTransportFailure(cause: unknown): boolean {
  let current: unknown = cause;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const record = current as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      status?: unknown;
      cause?: unknown;
    };
    const details = [record.name, record.message, record.code]
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    const statusIsServerError = typeof record.status === "number" && record.status >= 500 && record.status <= 599;

    if (
      statusIsServerError ||
      /fetch failed|network request failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(details)
    ) {
      return true;
    }

    current = record.cause;
    depth += 1;
  }

  return false;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new Error("Supabase read aborted");
}

const defaultDelay: RetryDelay = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason ?? new Error("Supabase read aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
    }
  });

/** Retry only idempotent Supabase reads when the failure is a transient transport problem. */
export async function readWithTransientSupabaseRetry<T>(
  query: () => PromiseLike<SupabaseReadResult<T>>,
  context: string,
  delay: RetryDelay = defaultDelay,
  signal?: AbortSignal,
): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    throwIfAborted(signal);
    try {
      const result = await query();
      throwIfAborted(signal);
      if (!result.error) return result.data;
      lastError = result.error;
    } catch (cause) {
      lastError = cause;
    }

    throwIfAborted(signal);
    if (!isTransientTransportFailure(lastError) || attempt === RETRY_DELAYS_MS.length) {
      throw new IngestionInfrastructureError(context, lastError);
    }

    await delay(RETRY_DELAYS_MS[attempt], signal);
  }

  throw new IngestionInfrastructureError(context, lastError);
}
