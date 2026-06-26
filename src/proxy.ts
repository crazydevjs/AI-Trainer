import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { SESSION_COOKIE } from "@/lib/auth-constants";

// Pages that never require auth.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  // --- Unauthenticated ---
  if (!session) {
    if (isPublic(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // --- Authenticated ---
  // Keep logged-in users out of auth screens.
  if (["/login", "/signup", "/forgot-password"].includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = session.onboarded ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  // Force onboarding completion before entering the app.
  if (!session.onboarded && pathname !== "/onboarding") {
    if (isPublic(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // Onboarded users shouldn't see onboarding again.
  if (session.onboarded && pathname === "/onboarding") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin gate.
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
