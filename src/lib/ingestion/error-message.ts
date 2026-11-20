function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "[invalid URL]";
  }
}

export function sanitizeDiagnosticError(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, sanitizeUrl)
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,;]+/gi, "$1[redacted]")
    .replace(/sb_secret_[A-Za-z0-9._~-]+/g, "sb_secret_[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[JWT redacted]");
}

export function getIngestionErrorMessage(cause: unknown): string {
  if (typeof cause === "object" && cause !== null) {
    const record = cause as { code?: unknown; message?: unknown };
    const code = typeof record.code === "string" && /^[a-z0-9._-]{1,40}$/i.test(record.code)
      ? record.code
      : null;
    const message = typeof record.message === "string"
      ? record.message
      : cause instanceof Error
        ? cause.message
        : null;
    const safeMessage = sanitizeDiagnosticError(message);
    if (safeMessage) return code ? `${code}: ${safeMessage}` : safeMessage;
    if (code) return `Ingestion error code ${code}`;
    return cause instanceof Error ? "Ingestion failed" : "Ingestion failed with a non-Error object";
  }
  return sanitizeDiagnosticError(String(cause)) ?? "Ingestion failed";
}
