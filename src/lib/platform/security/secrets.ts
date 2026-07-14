
/** Abstraction over `process.env` so call sites never read `process.env`
 *  directly — swapping in a real secrets manager (Vault, AWS Secrets
 *  Manager, etc.) later means changing this file only. Never logs a
 *  secret's value, only its name, so a thrown error is safe to surface. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/** Dev-only fallback secret for HMAC signing when SIGNING_SECRET isn't
 *  set — never used if the env var is present, and clearly named so it
 *  can't be mistaken for a production value. Fails closed in production. */
export function getSigningSecret(): string {
  if (process.env.NODE_ENV === "production") return requireEnv("SIGNING_SECRET");
  return getEnv("SIGNING_SECRET", "forge-dev-signing-secret-do-not-use-in-production");
}
