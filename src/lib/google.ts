import "server-only";
import { OAuth2Client } from "google-auth-library";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const GOOGLE_REDIRECT_URI = `${appUrl}/api/auth/google/callback`;

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}
