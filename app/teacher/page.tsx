"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function TeacherDashboard() {
  const router = useRouter();
  const [name, setName] = useState("Teacher");
  const [checking, setChecking] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) { router.replace("/teacher/login"); return; }
    const snap = await getDoc(doc(db, "teacherUsers", user.uid));
    if (!snap.exists() || snap.data().active !== true) { await signOut(auth); router.replace("/teacher/login"); return; }
    setName(snap.data().displayName || user.displayName || "Teacher");
    setChecking(false);
  }), [router]);

  if (checking) return <main className="flex min-h-screen items-center justify-center"><p className="font-bold text-violet-700">Securing Teacher Portal...</p></main>;

  return <main className="min-h-screen bg-[#f7f5ff]"><header className="border-b border-violet-100 bg-white"><div className="mx-auto flex max-w-6xl justify-between px-5 py-4"><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Teacher Portal</p><h1 className="text-2xl font-black">EduJAMB</h1></div><button onClick={async()=>{await signOut(auth);router.replace("/teacher/login")}} className="rounded-xl border px-4 py-2 text-sm font-bold">Sign out</button></div></header><section className="mx-auto max-w-6xl px-5 py-10"><div className="rounded-[28px] bg-gradient-to-br from-violet-800 to-purple-950 p-8 text-white"><p className="text-violet-200">Welcome,</p><h2 className="mt-1 text-3xl font-black">{name}</h2><p className="mt-2 text-sm text-violet-100">Your teaching workspace is ready for the classroom module.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{["My Classes","Schedule","Students","Materials"].map(x=><div key={x} className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="font-black">{x}</h3><p className="mt-2 text-sm text-gray-500">Coming in the Classroom phase.</p></div>)}</div></section></main>;
}
