"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorNote, Field, Input, Logo } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (failure) {
      setError(failure);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-pine p-12 text-[#f6f3ec] lg:flex lg:flex-col lg:justify-between">
        <svg viewBox="0 0 600 800" className="absolute inset-0 size-full opacity-40" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M-20 690C120 640 90 520 230 500S400 420 340 300 470 130 640 90" fill="none" stroke="#F2A93B" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" />
          <path d="M-20 420C90 400 150 330 130 240S240 80 330 -20" fill="none" stroke="#3CC4B8" strokeWidth="2" strokeDasharray="2 12" strokeLinecap="round" />
          <circle cx="230" cy="500" r="9" fill="#F2A93B" />
          <circle cx="340" cy="300" r="9" fill="#F6F3EC" />
          <circle cx="130" cy="240" r="7" fill="#3CC4B8" />
        </svg>
        <div className="relative flex items-center gap-3">
          <Logo className="size-10" />
          <span className="font-display text-2xl font-bold">Routara</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl leading-[1.05] font-bold">Know where your team is, without calling anyone.</h1>
          <p className="mt-4 text-lg text-[#c9d8d4]">Live location, attendance and people, together in one place.</p>
        </div>
      </aside>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo className="size-9" />
            <span className="font-display text-xl font-bold">Routara</span>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-ink-2">For managers and admins.</p>
          </div>
          {error != null && <ErrorNote error={error} />}
          <Field label="Email">
            <Input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Button type="submit" variant="primary" busy={busy} className="w-full">
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
