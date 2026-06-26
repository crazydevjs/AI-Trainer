// Edge-safe constants (no Node/server-only imports) usable from middleware.
export const SESSION_COOKIE = "forge_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
