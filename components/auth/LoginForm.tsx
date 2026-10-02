"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { AlertIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, SpinnerIcon, UserIcon } from "@/components/ui/icons";

/**
 * Admin sign-in form. Uses fetch directly (not apiRequest) because a 401 here
 * means "wrong password", not "session expired".
 */
export function LoginForm({ next }: { next: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        window.location.assign(next);
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(body?.error?.message ?? "Sign-in failed. Please try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setAttempt((n) => n + 1);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && (
        <div
          key={attempt}
          role="alert"
          className="flex animate-shake items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-fg"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          {error}
        </div>
      )}

      <Field label="Username" htmlFor="username" icon={<UserIcon className="h-5 w-5" />}>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="h-[52px] w-full rounded-xl bg-transparent pr-4 pl-12 text-[16px] text-fg outline-none placeholder:text-fg-subtle"
          placeholder="admin"
        />
      </Field>

      <Field label="Password" htmlFor="password" icon={<LockIcon className="h-5 w-5" />}>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-[52px] w-full rounded-xl bg-transparent pr-12 pl-12 text-[16px] text-fg outline-none placeholder:text-fg-subtle"
          placeholder="••••••••••"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </Field>

      <button
        type="submit"
        disabled={busy || !username || !password}
        className="group relative mt-1 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#1d6bff] to-[#5046e5] text-[17px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(59,91,255,0.75)] transition-[transform,box-shadow,filter] duration-200 outline-none hover:shadow-[0_14px_36px_-10px_rgba(59,91,255,0.9)] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-primary-ring active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        {busy ? (
          <>
            <SpinnerIcon className="h-5 w-5" />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-[15px] font-medium text-fg-muted">
        {label}
      </label>
      <div className="relative rounded-xl border border-border-strong bg-surface transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft hover:border-fg-subtle/60">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-muted">{icon}</span>
        {children}
      </div>
    </div>
  );
}
