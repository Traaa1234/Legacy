const TTL_MS = 60_000;

// Store on globalThis with a registry symbol so the cache survives Next.js's
// per-route module compilation. Without this, the API route and the print
// route each get their own (empty) Map.
const STORE_KEY = Symbol.for('legacy.pdf.tokens');
type GlobalWithTokens = typeof globalThis & {
  [STORE_KEY]?: Map<string, number>;
};
const g = globalThis as GlobalWithTokens;
if (!g[STORE_KEY]) {
  g[STORE_KEY] = new Map<string, number>();
}
const tokens: Map<string, number> = g[STORE_KEY];

function cleanup() {
  const now = Date.now();
  for (const [t, exp] of tokens) {
    if (exp < now) tokens.delete(t);
  }
}

export function mintToken(): string {
  cleanup();
  const token = crypto.randomUUID();
  tokens.set(token, Date.now() + TTL_MS);
  return token;
}

export function consumeToken(token: string): boolean {
  cleanup();
  const expires = tokens.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    tokens.delete(token);
    return false;
  }
  tokens.delete(token); // single-use
  return true;
}
