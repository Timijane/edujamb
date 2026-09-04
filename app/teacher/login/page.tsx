"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, "teacherUsers", credential.user.uid));
      if (!snap.exists() || snap.data().active !== true) {
        await signOut(auth);
        throw new Error("This account is not authorized as an active teacher.");
      }
      router.replace("/teacher");
    } catch (err) {
      setError(err instanceof Error && err.message.includes("not authorized") ? err.message : "Invalid teacher credentials.");
    } finally { setLoading(false); }
  }

  return <PortalLogin title="Teacher Portal" subtitle="Teach, manage classes and support students." email={email} password={password} setEmail={setEmail} setPassword={setPassword} error={error} loading={loading} onSubmit={submit} footer={<Link href="/login" className="font-bold text-violet-700">Student Login</Link>} />;
}

function PortalLogin({ title, subtitle, email, password, setEmail, setPassword, error, loading, onSubmit, footer }: any) {
  return <main className="min-h-screen bg-[#f7f5ff] px-5 py-10"><div className="mx-auto flex min-h-[90vh] max-w-md items-center"><div className="w-full rounded-[28px] bg-white p-8 shadow-xl sm:p-10"><div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 text-2xl font-black text-white">E</div><h1 className="text-3xl font-black text-gray-950">EduJAMB</h1><p className="mt-2 text-sm font-bold text-violet-700">{title}</p><p className="mt-1 text-xs text-gray-400">{subtitle}</p></div><form onSubmit={onSubmit} className="space-y-5"><label className="block"><span className="mb-2 block text-sm font-bold">Email</span><input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600" /></label><label className="block"><span className="mb-2 block text-sm font-bold">Password</span><input required type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600" /></label>{error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<button disabled={loading} className="w-full rounded-xl bg-violet-700 px-5 py-4 font-black text-white disabled:opacity-60">{loading ? "Signing in..." : "Sign in"}</button></form><p className="mt-6 text-center text-sm text-gray-500">{footer}</p></div></div></main>;
}
