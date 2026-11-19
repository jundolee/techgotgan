export function getSupabaseServiceHeaders(key: string): Record<string, string> {
  if (key.startsWith("sb_secret_")) return { apikey: key };
  return { apikey: key, authorization: `Bearer ${key}` };
}

export function createSupabaseServiceFetch(
  key: string,
  fetchImplementation: typeof fetch = fetch,
): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("apikey", key);
    if (key.startsWith("sb_secret_")) headers.delete("authorization");
    return fetchImplementation(input, { ...init, headers });
  };
}
