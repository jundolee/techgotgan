import { IngestionInfrastructureError } from "./error-message";

const RETRY_DELAYS_MS = [500, 1_500, 3_000] as const;

export type SupabaseReadResult<T> = {
  data: T | null;
  error: unknown;
};

export type RetryDelay = (milliseconds: number) => Promise<void>;

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

const defaultDelay: RetryDelay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Retry only idempotent Supabase reads when the failure is a transient transport problem. */
export async function readWithTransientSupabaseRetry<T>(
  query: () => PromiseLike<SupabaseReadResult<T>>,
  context: string,
  delay: RetryDelay = defaultDelay,
): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const result = await query();
      if (!result.error) return result.data;
      lastError = result.error;
    } catch (cause) {
      lastError = cause;
    }

    if (!isTransientTransportFailure(lastError) || attempt === RETRY_DELAYS_MS.length) {
      throw new IngestionInfrastructureError(context, lastError);
    }

    await delay(RETRY_DELAYS_MS[attempt]);
  }

  throw new IngestionInfrastructureError(context, lastError);
}
