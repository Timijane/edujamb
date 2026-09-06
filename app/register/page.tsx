"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
        console.error("Failed to load registration settings:", err);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create your account."
        );
      }

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      router.replace("/onboarding");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account."
      );
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
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/20 bg-white/10 shadow-[0_35px_120px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">

          {/* BRAND / HERO */}
          <section className="relative hidden min-h-[760px] overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
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
                  Built for serious JAMB preparation
                </div>

                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  START YOUR JOURNEY
                </p>

                <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white xl:text-6xl">
                  Your preparation.
                  <span className="block text-cyan-300">
                    Your progress. Your future.
                  </span>
                </h1>

                <p className="mt-7 max-w-lg text-base leading-7 text-white/70">
                  Create your EduJAMB account and build a smarter,
                  more structured approach to your JAMB preparation.
                </p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm font-black text-white">
                  Everything starts with preparation.
                </p>

                <p className="mt-2 text-xs leading-5 text-white/55">
                  Practice questions, monitor your progress and keep
                  your preparation organized in one place.
                </p>
              </div>

              <p className="mt-7 text-xs font-medium text-white/50">
                Secure account creation • EduJAMB
              </p>
            </div>
          </section>

          {/* REGISTER FORM */}
          <section className="flex min-h-[760px] items-center bg-white/95 p-6 sm:p-10 lg:p-14">
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
                  GET STARTED
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
                  Create your account
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Join EduJAMB and start building a better JAMB
                  preparation routine.
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    autoComplete="given-name"
                  />

                  <Input
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    autoComplete="family-name"
                  />
                </div>

                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  placeholder="you@example.com"
                />

                <PasswordInput
                  label="Password"
                  value={password}
                  show={showPassword}
                  onChange={setPassword}
                  onToggle={() =>
                    setShowPassword((value) => !value)
                  }
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />

                <PasswordInput
                  label="Confirm password"
                  value={confirm}
                  show={showConfirm}
                  onChange={setConfirm}
                  onToggle={() =>
                    setShowConfirm((value) => !value)
                  }
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                />

                {password.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">
                        Password strength
                      </span>

                      <span
                        className={`text-xs font-black ${
                          password.length >= 8
                            ? "text-emerald-600"
                            : "text-orange-600"
                        }`}
                      >
                        {password.length >= 8
                          ? "Good"
                          : "Too short"}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          password.length >= 8
                            ? "w-full bg-emerald-500"
                            : "w-1/2 bg-orange-400"
                        }`}
                      />
                    </div>
                  </div>
                )}

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
                    {loading
                      ? "Creating your account..."
                      : "Create Student Account"}
                  </span>

                  {!loading && (
                    <span className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-cyan-400/40 to-transparent transition-all group-hover:w-40" />
                  )}
                </button>
              </form>

              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Already registered?
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Sign in to your account
              </Link>

              <p className="mt-7 text-center text-xs leading-5 text-slate-400">
                By creating an account, you are starting your
                personalized EduJAMB preparation journey.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </span>

      <input
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      />
    </label>
  );
}

function PasswordInput({
  label,
  value,
  show,
  onChange,
  onToggle,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </span>

      <div className="relative">
        <input
          required
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-16 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
