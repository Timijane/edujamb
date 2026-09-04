"use client";

import { FormEvent, useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.currentUser) router.replace("/dashboard");
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ff] px-5 py-10">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center">
        <div className="w-full rounded-[28px] bg-white p-8 shadow-[0_25px_80px_rgba(76,29,149,0.12)] sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 text-2xl font-black text-white">E</div>
            <h1 className="text-3xl font-black text-gray-950">EduJAMB</h1>
            <p className="mt-2 text-sm text-gray-500">Student Login</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Email address</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Password</span>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>

            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <button disabled={loading} className="w-full rounded-xl bg-violet-700 px-5 py-4 font-black text-white disabled:opacity-60">
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            New to EduJAMB? <Link href="/register" className="font-black text-violet-700">Create an account</Link>
          </p>
          <p className="mt-3 text-center text-xs text-gray-400">
            Teachers use <Link href="/teacher/login" className="font-bold text-violet-600">Teacher Login</Link>. Staff use <Link href="/staff/login" className="font-bold text-violet-600">Staff Login</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
