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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    async function loadSettings() {
      try {
        const snapshot = await getDoc(doc(db, "siteSettings", "site"));

        if (snapshot.exists()) {
          setSettings({
            ...defaultSiteSettings,
            ...(snapshot.data() as SiteSettings),
          });
        }
      } catch (err) {
        console.error("Failed to load login settings:", err);
      }
    }

    loadSettings();
  }, []);

  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    const type = settings.loginBackgroundType || "gradient";
    const image = settings.loginBackgroundImage?.trim();

    if (type === "image" && image) {
      const opacity = Math.min(
        0.9,
        Math.max(0, settings.loginOverlayOpacity ?? 0.25)
      );

      return {
        backgroundImage: `linear-gradient(rgba(8, 15, 30, ${opacity}), rgba(8, 15, 30, ${opacity})), url("${image}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      };
    }

    if (type === "color") {
      return {
        backgroundColor: settings.loginBackgroundColor || "#f8fafc",
      };
    }

    return {
      background:
        "linear-gradient(135deg, #07111f 0%, #172554 42%, #164e63 72%, #0f172a 100%)",
    };
  }, [settings]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const token = await credential.user.getIdToken();

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || data.active === false) {
        await auth.signOut();
        throw new Error(
          "This account is not authorized or is currently inactive."
        );
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
          if (data.user?.onboardingComplete) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
          break;
      }
    } catch (err) {
      console.error(err);

      if (err instanceof Error && err.message.includes("authorized")) {
        setError(err.message);
      } else {
        setError(
          "Unable to sign in. Please check your email and password."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/10" />

      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/20 bg-white/10 shadow-[0_35px_120px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          
          {/* BRAND / HERO */}
          <section className="relative hidden min-h-[720px] overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div className="absolute inset-0 bg-slate-950/55" />

            <div className="relative z-10">
              <div className="flex items-center gap-4">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt="EduJAMB"
                    className="h-12 w-auto max-w-[200px] object-contain"
                  />
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950 shadow-xl">
                      EJ
                    </div>
                    <span className="text-xl font-black tracking-tight text-white">
                      EduJAMB
                    </span>
                  </>
                )}
              </div>

              <div className="mt-28 max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Your JAMB preparation companion
                </div>

                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  {settings.loginEyebrow || "WELCOME BACK"}
                </p>

                <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white xl:text-6xl">
                  Prepare with purpose.
                  <span className="block text-cyan-300">
                    Perform with confidence.
                  </span>
                </h1>

                <p className="mt-7 max-w-lg text-base leading-7 text-white/70">
                  Your preparation, practice, progress and academic community
                  — connected in one powerful experience.
                </p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Practice" value="CBT" />
                <Stat label="Progress" value="Track" />
                <Stat label="Learning" value="Smart" />
              </div>

              <p className="mt-8 text-xs font-medium text-white/50">
                Secure authentication • EduJAMB
              </p>
            </div>
          </section>

          {/* LOGIN FORM */}
          <section className="flex min-h-[680px] items-center bg-white/95 p-6 sm:p-10 lg:p-14">
            <div className="mx-auto w-full max-w-md">

              <div className="mb-8 lg:hidden">
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt="EduJAMB"
                    className="h-11 w-auto max-w-[190px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                      EJ
                    </div>
                    <span className="text-xl font-black text-slate-950">
                      EduJAMB
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                  {settings.loginEyebrow || "WELCOME BACK"}
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
                  {settings.loginTitle || "Welcome back"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {settings.loginSubtitle ||
                    "Sign in to continue your EduJAMB preparation journey."}
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-800">
                    Email address
                  </span>

                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-800">
                      Password
                    </span>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-black text-indigo-600 transition hover:text-indigo-800"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-16 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative z-10">
                    {loading ? "Signing you in..." : "Sign in to EduJAMB"}
                  </span>

                  {!loading && (
                    <span className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-cyan-400/40 to-transparent transition-all group-hover:w-40" />
                  )}
                </button>
              </form>

              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  New here?
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/register"
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Create a student account
              </Link>

              <p className="mt-7 text-center text-xs leading-5 text-slate-400">
                One secure login for students, teachers and authorized team
                members.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
