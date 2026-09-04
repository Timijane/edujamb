"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    async function loadSettings() {
      try {
        const snapshot = await getDoc(doc(db, "siteSettings", "site"));
        if (snapshot.exists()) {
          setSettings({ ...defaultSiteSettings, ...(snapshot.data() as SiteSettings) });
        }
      } catch (err) {
        console.error("Failed to load login settings:", err);
      }
    }
    loadSettings();
  }, []);

  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    const type = settings.loginBackgroundType || "gradient";
    if (type === "image" && settings.loginBackgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(9, 16, 31, ${settings.loginOverlayOpacity ?? 0.18}), rgba(9, 16, 31, ${settings.loginOverlayOpacity ?? 0.18})), url(${settings.loginBackgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    if (type === "color") return { backgroundColor: settings.loginBackgroundColor || "#f8fafc" };
    return { background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 38%, #ecfeff 68%, #fff7ed 100%)" };
  }, [settings]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await credential.user.getIdToken();
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || data.active === false) {
        await auth.signOut();
        throw new Error("This account is not authorized or is currently inactive.");
      }

      switch (data.role) {
        case "super_admin":
          router.replace("/admin");
          break;
        case "admin":
        case "supporter":
          router.replace("/staff");
          break;
        case "teacher":
          router.replace("/teacher");
          break;
        case "student":
        default:
          if (data.user?.onboardingComplete) router.replace("/dashboard");
          else router.replace("/onboarding");
          break;
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error && err.message.includes("authorized") ? err.message : "Unable to sign in. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10" style={backgroundStyle}>
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-orange-300/25 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-fuchsia-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-[92vh] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[36px] border border-white/60 bg-white/55 shadow-[0_35px_100px_rgba(15,23,42,0.16)] backdrop-blur-2xl lg:grid-cols-[1.05fr_.95fr]">
          <section className="relative hidden min-h-[680px] overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-indigo-950/90 to-cyan-950/90" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-2xl" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-orange-400/20 blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                {settings.logo ? <img src={settings.logo} alt="EduJAMB" className="h-12 w-auto max-w-[190px] object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">EJ</div>}
                {!settings.logo && <span className="text-xl font-black text-white">EduJAMB</span>}
              </div>
              <div className="mt-24 max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">{settings.loginEyebrow}</p>
                <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white">Prepare with purpose. <span className="text-cyan-300">Perform with confidence.</span></h1>
                <p className="mt-6 max-w-lg text-base leading-7 text-white/70">Your preparation, practice, progress and academic community — connected in one experience.</p>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-3 text-xs font-bold text-white/60">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]" /> Secure Firebase authentication • EduJAMB
            </div>
          </section>

          <section className="flex min-h-[680px] items-center bg-white/85 p-6 sm:p-10 lg:p-14">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-9 lg:hidden">
                {settings.logo ? <img src={settings.logo} alt="EduJAMB" className="h-12 w-auto max-w-[190px] object-contain" /> : <div className="text-2xl font-black text-slate-950">EduJAMB</div>}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">{settings.loginEyebrow}</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-slate-950">{settings.loginTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">{settings.loginSubtitle}</p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-800">Email address</span>
                  <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-slate-950 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                </label>
                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-800">Password</span>
                    <Link href="/forgot-password" className="text-xs font-black text-indigo-600 hover:text-indigo-800">Forgot password?</Link>
                  </div>
                  <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-slate-950 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                </label>

                {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                <button type="submit" disabled={loading} className="group relative w-full overflow-hidden rounded-2xl bg-slate-950 px-5 py-4 font-black text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="relative z-10">{loading ? "Checking your account..." : "Continue to EduJAMB"}</span>
                  <span className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-cyan-400/40 to-transparent transition group-hover:w-40" />
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">New to EduJAMB? <Link href="/register" className="font-black text-indigo-600 hover:text-indigo-800">Create an account</Link></p>
              <p className="mt-8 text-center text-xs leading-5 text-slate-400">One secure login for students, teachers and authorized team members.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
