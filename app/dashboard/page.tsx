"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Student = { firstName: string; lastName: string; username: string; subjects?: string[]; targetScore?: string; };
type Account = { onboardingComplete?: boolean; selectedExam?: string; };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();

        if (!response.ok || data.user?.role !== "student") {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        if (!data.user?.onboardingComplete) {
          router.replace("/onboarding");
          return;
        }

        setAccount(data.user);
        setStudent(data.student);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f7f5ff]"><p className="font-bold text-violet-700">Loading your dashboard...</p></main>;

  async function logout() { await signOut(auth); router.replace("/login"); }

  return (
    <main className="min-h-screen bg-[#f7f5ff]">
      <header className="border-b border-violet-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Student Portal</p><h1 className="text-2xl font-black">EduJAMB</h1></div>
          <button onClick={logout} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold">Sign out</button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-[28px] bg-gradient-to-br from-violet-800 to-purple-950 p-7 text-white shadow-xl">
          <p className="text-sm text-violet-200">Welcome back,</p>
          <h2 className="mt-1 text-3xl font-black">{student?.firstName || user?.displayName || "Student"}.</h2>
          <p className="mt-2 text-sm text-violet-100">Public username: @{student?.username}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Exam" value={account?.selectedExam || "JAMB"} />
            <Stat label="Target" value={student?.targetScore || "—"} />
            <Stat label="Subjects" value={String(student?.subjects?.length || 0)} />
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {["CBT Practice", "Learning Library", "Academic Feed", "Messages", "Classrooms", "AI Study Assistant"].map((item) => (
            <div key={item} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="font-black text-gray-950">{item}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">This module will be connected as we progress through the EduJAMB platform roadmap.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-violet-200">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>; }
