import { getCurrentUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <SettingsClient
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        googleId: user.googleId,
        hasPassword: Boolean(user.passwordHash),
      }}
    />
  );
}
