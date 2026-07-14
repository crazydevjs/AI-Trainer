import { getCurrentUser } from "@/lib/auth";

/** Server-side gate for the whole `/settings/developer/*` family. The
 *  individual pages' own `localStorage["forge:dev"]` unlock is a
 *  client-side dev convenience only — it can't be trusted as real access
 *  control in production, since any authenticated user could flip it.
 *  This layout is what actually stops a non-admin from reaching any of
 *  these pages once `NODE_ENV === "production"`. */
export default async function DeveloperSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  const user = isDev ? null : await getCurrentUser();

  if (!isDev && user?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
          Developer settings
        </h1>
        <p className="mt-2 text-sm text-fog">This area isn&apos;t available.</p>
      </div>
    );
  }

  return <>{children}</>;
}
