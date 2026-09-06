"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  defaultSiteSettings,
  SiteSettings,
} from "@/lib/site-settings";
import { useRouter } from "next/navigation";
import Link from "next/link";

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "").trim();

  if (value.length !== 6) {
    return `rgba(255,255,255,${alpha})`;
  }

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

function positionClass(position?: SiteSettings["authCardPosition"]) {
  switch (position) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    default:
      return "justify-center";
  }
}

function logoAlignment(position?: SiteSettings["authLogoPosition"]) {
  switch (position) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    default:
      return "justify-center";
  }
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      />

      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

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

  const [settings, setSettings] =
    useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    async function loadSettings() {
      try {
        const snapshot = await getDoc(
          doc(db, "siteSettings", "site")
        );

        if (snapshot.exists()) {
          setSettings({
            ...defaultSiteSettings,
            ...(snapshot.data() as SiteSettings),
          });
        }
      } catch (err) {
        console.error(
          "Failed to load registration settings:",
          err
        );
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
        Math.max(0, settings.loginOverlayOpacity ?? 0.18)
      );

      return {
        backgroundImage: `linear-gradient(rgba(8,15,30,${opacity}), rgba(8,15,30,${opacity})), url("${image}")`,
        backgroundSize: "cover",
        backgroundPosition:
          settings.loginBackgroundPosition || "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      };
    }

    if (type === "color") {
      return {
        backgroundColor:
          settings.loginBackgroundColor || "#f8fafc",
      };
    }

    return {
      background:
        "linear-gradient(135deg, #07111f 0%, #172554 42%, #164e63 72%, #0f172a 100%)",
    };
  }, [settings]);

  const frameStyle = useMemo<React.CSSProperties>(() => {
    const opacity = Math.min(
      1,
      Math.max(0.35, settings.authCardOpacity ?? 0.95)
    );

    return {
      width: `min(100%, ${settings.authCardWidth || "1180px"})`,
      borderRadius: `${settings.authCardRadius ?? 32}px`,
      backgroundColor: hexToRgba("#ffffff", opacity),
      backdropFilter: `blur(${settings.authCardBlur ?? 20}px)`,
      WebkitBackdropFilter: `blur(${settings.authCardBlur ?? 20}px)`,
    };
  }, [settings]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim();

    if (!cleanFirstName || !cleanLastName) {
      setError("Please enter your first name and last name.");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

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
          firstName: cleanFirstName,
          lastName: cleanLastName,
          email: cleanEmail,
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
        cleanEmail,
        password
      );

      router.replace("/profile");
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to create your account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const logoVisible = settings.authLogoVisible !== false;

  const logoFrameVisible = settings.authLogoFrame !== false;
  const logoFrameSize = Math.max(
    72,
    Math.min(180, settings.authLogoFrameSize ?? 112)
  );

  const logoFrameStyle: React.CSSProperties = {
    width: `${logoFrameSize}px`,
    height: `${logoFrameSize}px`,
    backgroundColor: settings.authLogoFrameBackground || "#ffffff",
    border: `${Math.max(
      0,
      Math.min(6, settings.authLogoFrameBorderWidth ?? 1)
    )}px solid ${
      settings.authLogoFrameBorder || "#e2e8f0"
    }`,
  };

  return (
    <main
      className={`relative flex min-h-screen ${positionClass(
        settings.authCardPosition
      )} items-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10`}
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/10" />

      <section
        className="relative z-10 w-full overflow-hidden border border-white/30 shadow-2xl"
        style={frameStyle}
      >
        <div className="grid min-h-[680px] lg:grid-cols-[0.9fr_1.1fr]">

          {/* BRAND PANEL */}
          <div className="hidden flex-col justify-between bg-slate-950/90 p-10 text-white lg:flex xl:p-14">
            <div>
              {logoVisible && (
                <div
                  className={`mb-12 flex ${logoAlignment(
                    settings.authLogoPosition
                  )}`}
                >
                  {logoFrameVisible ? (
                    <div
                      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-lg"
                      style={logoFrameStyle}
                    >
                      {settings.logo ? (
                        <img
                          src={settings.logo}
                          alt="EduJAMB"
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <div className="text-xl font-black tracking-tight text-slate-950">
                          Edu<span className="text-purple-600">JAMB</span>
                        </div>
                      )}
                    </div>
                  ) : settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="EduJAMB"
                      className="h-auto max-w-full object-contain"
                      style={{
                        width: `${settings.authLogoSize ?? 200}px`,
                      }}
                    />
                  ) : (
                    <div className="text-2xl font-black tracking-tight">
                      Edu<span className="text-purple-400">JAMB</span>
                    </div>
                  )}
                </div>
              )}

              <div className="max-w-md">
                <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
                  {settings.registerEyebrow ||
                    "GET STARTED"}
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                  {settings.registerTitle ||
                    "Create your account"}
                </h1>

                <p className="mt-5 text-base leading-7 text-slate-300">
                  {settings.registerSubtitle ||
                    "Join EduJAMB and start building a better JAMB preparation routine."}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-4 h-px w-full bg-white/10" />

              <p className="text-sm leading-6 text-slate-400">
                Prepare smarter. Practice consistently.
                Build confidence for your JAMB examination.
              </p>
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="flex items-center bg-white/95 px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto w-full max-w-xl">

              {/* MOBILE BRANDING */}
              <div className="mb-8 lg:hidden">
                {logoVisible && (
                  <div
                    className={`mb-7 flex ${logoAlignment(
                      settings.authLogoPosition
                    )}`}
                  >
                    {logoFrameVisible ? (
                      <div
                        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-lg"
                        style={logoFrameStyle}
                      >
                        {settings.logo ? (
                          <img
                            src={settings.logo}
                            alt="EduJAMB"
                            className="h-full w-full object-contain p-3"
                          />
                        ) : (
                          <div className="text-xl font-black tracking-tight text-slate-950">
                            Edu<span className="text-purple-600">JAMB</span>
                          </div>
                        )}
                      </div>
                    ) : settings.logo ? (
                      <img
                        src={settings.logo}
                        alt="EduJAMB"
                        className="h-auto max-w-full object-contain"
                        style={{
                          width: `${settings.authLogoMobileSize ?? 190}px`,
                        }}
                      />
                    ) : (
                      <div className="text-2xl font-black tracking-tight text-slate-950">
                        Edu<span className="text-purple-600">JAMB</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  {settings.registerEyebrow ||
                    "GET STARTED"}
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  {settings.registerTitle ||
                    "Create your account"}
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {settings.registerSubtitle ||
                    "Join EduJAMB and start building a better JAMB preparation routine."}
                </p>
              </div>

              {/* DESKTOP FORM HEADER */}
              <div className="mb-8 hidden lg:block">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Create your account
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Enter your details to get started.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">

                {/* NAMES */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      First name
                    </label>

                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(event) =>
                        setFirstName(event.target.value)
                      }
                      placeholder="First name"
                      autoComplete="given-name"
                      required
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Last name
                    </label>

                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(event) =>
                        setLastName(event.target.value)
                      }
                      placeholder="Last name"
                      autoComplete="family-name"
                      required
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() =>
                      setShowPassword((value) => !value)
                    }
                    placeholder="Create a password"
                  />

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span
                      className={
                        password.length >= 8
                          ? "font-semibold text-emerald-600"
                          : "text-slate-400"
                      }
                    >
                      • 8+ characters
                    </span>

                    <span
                      className={
                        /[A-Z]/.test(password)
                          ? "font-semibold text-emerald-600"
                          : "text-slate-400"
                      }
                    >
                      • Uppercase
                    </span>

                    <span
                      className={
                        /[0-9]/.test(password)
                          ? "font-semibold text-emerald-600"
                          : "text-slate-400"
                      }
                    >
                      • Number
                    </span>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label
                    htmlFor="confirm"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm password
                  </label>

                  <PasswordInput
                    value={confirm}
                    onChange={setConfirm}
                    show={showConfirm}
                    onToggle={() =>
                      setShowConfirm((value) => !value)
                    }
                    placeholder="Confirm your password"
                  />
                </div>

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl px-5 text-sm font-bold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor:
                      settings.authButtonColor || "#7c3aed",
                    color:
                      settings.authButtonTextColor || "#ffffff",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor =
                      settings.authButtonHoverColor || "#6d28d9";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor =
                      settings.authButtonColor || "#7c3aed";
                  }}
                >
                  {loading
                    ? "Creating account..."
                    : "Create account"}
                </button>
              </form>

              {/* LOGIN NAVIGATION */}
              <div className="mt-7 flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-500">
                  Already have an account?
                </span>

                <Link
                  href="/login"
                  className="font-bold text-indigo-600 transition hover:text-indigo-800"
                >
                  Back to Login
                </Link>
              </div>

              <p className="mt-8 text-center text-xs leading-5 text-slate-400">
                By creating an account, you agree to use
                EduJAMB responsibly and provide accurate
                information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
