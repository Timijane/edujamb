"use client";

import { FormEvent, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    getDoc(doc(db, "siteSettings", "site")).then((snap) => {
      if (snap.exists()) setSettings({ ...defaultSiteSettings, ...(snap.data() as SiteSettings) });
    }).catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.");
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") setError("Please enter a valid email address.");
      else setError("We could not send the reset email right now. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 px-5 py-10">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
      <div className="relative w-full max-w-md rounded-[32px] border border-white/15 bg-white/95 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
        {settings.logo ? <img src={settings.logo} alt="EduJAMB" className="mb-8 h-12 w-auto max-w-[190px] object-contain" /> : <div className="mb-8 text-2xl font-black text-slate-950">EduJAMB</div>}
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Account recovery</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Enter your account email and Firebase will send you a secure password reset link.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Email address</span><input required type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label>
          {message && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button disabled={loading} className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white shadow-xl disabled:opacity-60">{loading ? "Sending reset link..." : "Send reset link"}</button>
        </form>
        <p className="mt-7 text-center text-sm text-slate-500"><Link href="/login" className="font-black text-indigo-600">Back to login</Link></p>
      </div>
    </main>
  );
}
