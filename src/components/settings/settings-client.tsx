"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck, User as UserIcon, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validators";

export function SettingsClient({
  user,
}: {
  user: { name: string | null; email: string; image: string | null; googleId: string | null; hasPassword: boolean };
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Settings</h1>

      <section className="glass space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-ember" />
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Profile</h2>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-smoke">Name</p>
            <p className="mt-1 text-chalk">{user.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-smoke">Email</p>
            <p className="mt-1 text-chalk">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="glass space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-ember" />
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Security</h2>
        </div>
        <p className="text-sm text-fog">
          Connected accounts: {user.googleId ? "Google linked" : "Google not linked"}.
          {user.hasPassword ? "" : " No password set — sign in with Google only."}
        </p>
        <ChangePasswordForm hasPassword={user.hasPassword} />
        <LogoutEverywhereButton />
      </section>

      <section className="glass space-y-4 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-ember" />
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Billing</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/billing">Manage plan</Link>
          </Button>
        </div>
      </section>

      <section className="glass space-y-4 rounded-3xl border border-ember/30 p-6">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-ember" />
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide">Danger Zone</h2>
        </div>
        <p className="text-sm text-fog">
          Deleting your account permanently removes your profile, workout history, personal
          records, and all other data. This can&apos;t be undone.
        </p>
        <DeleteAccountForm hasPassword={user.hasPassword} email={user.email} />
      </section>
    </div>
  );
}

function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't change password");
        return;
      }
      toast.success("Password updated. You've been logged out everywhere else.");
      reset();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t border-white/10 pt-4">
      {hasPassword && (
        <div>
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p role="alert" className="mt-1 text-xs text-ember">{errors.currentPassword.message}</p>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="newPassword">{hasPassword ? "New password" : "Set a password"}</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p role="alert" className="mt-1 text-xs text-ember">{errors.newPassword.message}</p>
        )}
      </div>
      <Button type="submit" variant="outline" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {hasPassword ? "Update password" : "Set password"}
      </Button>
    </form>
  );
}

function LogoutEverywhereButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout-everywhere", { method: "POST" });
      if (!res.ok) {
        toast.error("Couldn't log out everywhere");
        return;
      }
      toast.success("Logged out on every device");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-white/10 pt-4">
      <Button type="button" variant="outline" onClick={onClick} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Log out everywhere
      </Button>
    </div>
  );
}

function DeleteAccountForm({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    try {
      const body = hasPassword ? { password: confirmValue } : { confirmEmail: confirmValue };
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't delete account");
        return;
      }
      toast.success("Account deleted");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Delete account
      </Button>
    );
  }

  return (
    <div className="space-y-3 border-t border-ember/20 pt-4">
      <Label htmlFor="delete-confirm">
        {hasPassword ? "Enter your password to confirm" : `Type your email (${email}) to confirm`}
      </Label>
      <Input
        id="delete-confirm"
        type={hasPassword ? "password" : "text"}
        value={confirmValue}
        onChange={(e) => setConfirmValue(e.target.value)}
        autoComplete={hasPassword ? "current-password" : "off"}
      />
      <div className="flex gap-3">
        <Button
          type="button"
          variant="danger"
          onClick={onDelete}
          disabled={loading || !confirmValue}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Permanently delete my account
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
