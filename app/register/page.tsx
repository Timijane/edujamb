"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create your account.");
      }

      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your EduJAMB account" subtitle="Start your JAMB preparation journey.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" value={firstName} onChange={setFirstName} />
          <Input label="Last name" value={lastName} onChange={setLastName} />
        </div>
        <Input label="Email address" type="email" value={email} onChange={setEmail} />
        <Input label="Password" type="password" value={password} onChange={setPassword} />
        <Input label="Confirm password" type="password" value={confirm} onChange={setConfirm} />

        {error && <ErrorBox message={error} />}

        <button disabled={loading} className="w-full rounded-2xl bg-violet-700 px-5 py-4 font-black text-white shadow-lg shadow-violet-200 disabled:opacity-60">
          {loading ? "Creating account..." : "Create Student Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link href="/login" className="font-black text-violet-700">Log in</Link>
      </p>
    </AuthShell>
  );
}

function Input({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-800">{label}</span>
      <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100" />
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f5ff] px-5 py-10">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center">
        <div className="w-full rounded-[28px] bg-white p-8 shadow-[0_25px_80px_rgba(76,29,149,0.12)] sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 text-2xl font-black text-white">E</div>
            <h1 className="text-3xl font-black tracking-tight text-gray-950">EduJAMB</h1>
            <p className="mt-2 text-sm text-gray-500">{title}</p>
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
