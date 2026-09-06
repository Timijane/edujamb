"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  defaultSiteSettings,
  SiteSettings,
} from "@/lib/site-settings";
import { useRouter } from "next/navigation";
import Link from "next/link";

function hexToRgba(hex: string, opacity: number) {
  const clean = hex.replace("#", "").trim();

  if (clean.length !== 6) {
    return `rgba(255,255,255,${opacity})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${opacity})`;
}

function positionClass(
  position?: SiteSettings["authCardPosition"]
) {
  if (position === "left") return "justify-start";
  if (position === "right") return "justify-end";
  return "justify-center";
}

function logoAlignment(
  position?: SiteSettings["authLogoPosition"]
) {
  if (position === "left") return "justify-start";
  if (position === "right") return "justify-end";
  return "justify-center";
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.7 12s3.4-6 9.3-6 9.3 6 9.3 6-3.4 6-9.3 6-9.3-6-9.3-6Z"
        />
        <circle cx="12" cy="12" r="2.7" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.6 6.2A10.5 10.5 0 0 1 12 6c5.9 0 9.3 6 9.3 6a16.8 16.8 0 0 1-3 3.5M6.2 6.8C3.9 8.3 2.7 12 2.7 12s3.4 6 9.3 6c1.1 0 2.1-.2 3-.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4 7 8 6 8-6"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10V7a4 4 0 0 1 8 0v3"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [rememberMe, setRememberMe] =
    useState(false);

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
          "Failed to load login settings:",
          err
        );
      }
    }

    loadSettings();
  }, []);

  const backgroundStyle =
    useMemo<React.CSSProperties>(() => {
      const type =
        settings.loginBackgroundType || "gradient";
      const image =
        settings.loginBackgroundImage?.trim();

      if (type === "image" && image) {
        const opacity = Math.min(
          0.9,
          Math.max(
            0,
            settings.loginOverlayOpacity ?? 0.18
          )
        );

        return {
          backgroundImage:
            `linear-gradient(` +
            `rgba(8,15,30,${opacity}),` +
            `rgba(8,15,30,${opacity})` +
            `), url("${image}")`,
          backgroundSize: "cover",
          backgroundPosition:
            settings.loginBackgroundPosition ||
            "center",
          backgroundRepeat: "no-repeat",
        };
      }

      if (type === "color") {
        return {
          backgroundColor:
            settings.loginBackgroundColor ||
            "#f8fafc",
        };
      }

      return {
        background:
          "radial-gradient(circle at 15% 20%, rgba(168,85,247,0.32), transparent 32%), radial-gradient(circle at 85% 75%, rgba(126,34,206,0.28), transparent 34%), linear-gradient(135deg, #05030a 0%, #100817 42%, #160b24 68%, #030207 100%)",
      };
    }, [settings]);

  const frameStyle =
    useMemo<React.CSSProperties>(() => {
      const opacity = Math.min(
        1,
        Math.max(
          0.35,
          settings.authCardOpacity ?? 0.95
        )
      );

      return {
        width: "100%",
        maxWidth:
          settings.authCardWidth || "920px",
        borderRadius: `${Math.min(
          32,
          Math.max(
            16,
            settings.authCardRadius ?? 24
          )
        )}px`,
        backgroundColor: hexToRgba(
          "#ffffff",
          opacity
        ),
        backdropFilter: `blur(${
          settings.authCardBlur ?? 20
        }px)`,
        WebkitBackdropFilter: `blur(${
          settings.authCardBlur ?? 20
        }px)`,
      };
    }, [settings]);

  const logoVisible =
    settings.authLogoVisible !== false;

  const logoFrameVisible =
    settings.authLogoFrame !== false;

  const logoFrameSize =
    settings.authLogoFrameSize ?? 112;

  const logoFrameStyle =
    useMemo<React.CSSProperties>(() => {
      const size = Math.min(
        180,
        Math.max(72, logoFrameSize)
      );

      return {
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor:
          settings.authLogoFrameBackground ||
          "#ffffff",
        borderColor:
          settings.authLogoFrameBorder ||
          "#e2e8f0",
        borderWidth: `${Math.min(
          8,
          Math.max(
            0,
            settings.authLogoFrameBorderWidth ?? 1
          )
        )}px`,
      };
    }, [
      logoFrameSize,
      settings.authLogoFrameBackground,
      settings.authLogoFrameBorder,
      settings.authLogoFrameBorderWidth,
    ]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError(
        "Please enter your email address and password."
      );
      return;
    }

    setLoading(true);

    try {
      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const token =
        await credential.user.getIdToken();

      const response = await fetch(
        "/api/auth/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.active === false
      ) {
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
          if (
            data.user?.onboardingComplete
          ) {
            router.replace("/dashboard");
          } else {
            router.replace("/onboarding");
          }
          break;
      }
    } catch (err) {
      console.error(err);

      if (
        err instanceof Error &&
        err.message.includes("authorized")
      ) {
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

  const cardPosition = positionClass(
    settings.authCardPosition
  );

  const logoPosition = logoAlignment(
    settings.authLogoPosition
  );

  return (
    <main
      className={`relative min-h-screen overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8 flex ${cardPosition} items-start lg:items-center`}
      style={backgroundStyle}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

      <section
        className="relative z-10 overflow-hidden border border-white/30 shadow-[0_25px_90px_rgba(0,0,0,0.25)]"
        style={frameStyle}
      >
        <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
          {/* BRAND AREA */}
          <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_45%)]" />

            <div className="relative z-10 p-8 xl:p-10">
              {logoVisible && (
                <div
                  className={`flex ${logoPosition}`}
                >
                  {logoFrameVisible ? (
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full border shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                      style={logoFrameStyle}
                    >
                      {settings.logo ? (
                        <img
                          src={settings.logo}
                          alt="EduJAMB"
                          className="h-[72%] w-[72%] object-contain"
                        />
                      ) : (
                        <div className="text-2xl font-black tracking-tight text-slate-950">
                          EJ
                        </div>
                      )}
                    </div>
                  ) : settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="EduJAMB"
                      className="max-w-[150px] object-contain"
                    />
                  ) : (
                    <div className="text-2xl font-black text-white">
                      Edu<span className="text-cyan-400">
                        JAMB
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-12 max-w-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  {settings.loginEyebrow ||
                    "EDUJAMB • JAMB PREPARATION PLATFORM"}
                </p>

                <h1 className="mt-4 text-4xl font-black leading-[1.04] tracking-[-0.04em] text-white xl:text-[44px]">
                  Prepare with purpose.
                  <span className="mt-1 block text-cyan-300">
                    Perform with confidence.
                  </span>
                </h1>

                <p className="mt-5 text-sm leading-6 text-slate-300">
                  {settings.loginSubtitle ||
                    "Continue your preparation journey with EduJAMB."}
                </p>
              </div>
            </div>

            <div className="relative z-10 p-8 pt-0 xl:p-10 xl:pt-0">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  ["CBT", "Practice"],
                  ["Track", "Progress"],
                  ["Smart", "Learning"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3"
                  >
                    <p className="text-sm font-black text-white">
                      {value}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[10px] text-slate-500">
                Secure authentication • EduJAMB
              </p>
            </div>
          </aside>

          {/* ACTION AREA */}
          <div className="bg-white px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-[430px]">
              {/* MOBILE LOGO */}
              {logoVisible && (
                <div
                  className={`mb-6 flex lg:hidden ${logoPosition}`}
                >
                  {logoFrameVisible ? (
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full border shadow-sm"
                      style={{
                        ...logoFrameStyle,
                        width: `${Math.min(
                          100,
                          Math.max(
                            72,
                            logoFrameSize
                          )
                        )}px`,
                        height: `${Math.min(
                          100,
                          Math.max(
                            72,
                            logoFrameSize
                          )
                        )}px`,
                      }}
                    >
                      {settings.logo ? (
                        <img
                          src={settings.logo}
                          alt="EduJAMB"
                          className="h-[70%] w-[70%] object-contain"
                        />
                      ) : (
                        <span className="text-xl font-black text-slate-950">
                          EJ
                        </span>
                      )}
                    </div>
                  ) : settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="EduJAMB"
                      className="max-w-[145px] object-contain"
                    />
                  ) : (
                    <div className="text-2xl font-black text-slate-950">
                      Edu<span className="text-indigo-600">
                        JAMB
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* AUTH TABS */}
              <div className="mb-7 flex items-center border-b border-slate-200">
                <Link
                  href="/login"
                  className="relative px-1 pb-3 text-sm font-black text-slate-950"
                >
                  Log in
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-indigo-600" />
                </Link>

                <Link
                  href="/register"
                  className="ml-6 px-1 pb-3 text-sm font-semibold text-slate-400 transition hover:text-slate-700"
                >
                  Sign up
                </Link>
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
                  {settings.loginEyebrow ||
                    "WELCOME BACK"}
                </p>

                <h2 className="mt-2.5 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-[34px]">
                  {settings.loginTitle ||
                    "Welcome back"}
                </h2>

                <p className="mt-2.5 text-sm leading-6 text-slate-500">
                  {settings.loginSubtitle ||
                    "Continue your preparation journey with EduJAMB."}
                </p>
              </div>

              <form
                onSubmit={submit}
                className="mt-7 space-y-5"
              >
                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <MailIcon />

                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="you@example.com"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="text-sm font-bold text-slate-700"
                    >
                      Password
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-bold text-indigo-600 transition hover:text-indigo-800"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <LockIcon />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    >
                      <EyeIcon
                        open={showPassword}
                      />
                    </button>
                  </div>
                </div>

                {/* OPTIONS */}
                <div className="flex items-center justify-between gap-4">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(
                          event.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Remember me</span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 sm:hidden"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
                  {loading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}

                  {loading
                    ? "Signing you in..."
                    : "Log in"}
                </button>
              </form>

              {/* SIGNUP */}
              <div className="mt-7 text-center text-sm">
                <span className="text-slate-500">
                  Don't have an account?{" "}
                </span>

                <Link
                  href="/register"
                  className="font-black text-indigo-600 transition hover:text-indigo-800"
                >
                  Sign up
                </Link>
              </div>

              <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
                One secure login for students, teachers
                and authorized team members.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
