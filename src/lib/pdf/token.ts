const TTL_MS = 60_000;
const tokens = new Map<string, number>(); // token → expiresAt (epoch ms)

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
