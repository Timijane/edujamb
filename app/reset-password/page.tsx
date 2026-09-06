"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import {
  defaultSiteSettings,
  SiteSettings,
} from "@/lib/site-settings";

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

function PasswordField({
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();

  const oobCode = searchParams.get("oobCode");

  const [settings, setSettings] =
    useState<SiteSettings>(defaultSiteSettings);

  const [checkingCode, setCheckingCode] = useState(true);
  const [validCode, setValidCode] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
          "Failed to load authentication settings:",
          err
        );
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function verifyCode() {
      setCheckingCode(true);
      setError("");

      if (!oobCode) {
        setValidCode(false);
        setError(
          "This password reset link is missing or invalid."
        );
        setCheckingCode(false);
        return;
      }

      try {
        const resetEmail = await verifyPasswordResetCode(
          auth,
          oobCode
        );

        setEmail(resetEmail);
        setValidCode(true);
      } catch (err: any) {
        console.error(err);

        setValidCode(false);

        if (
          err?.code === "auth/expired-action-code"
        ) {
          setError(
            "This password reset link has expired. Please request a new one."
          );
        } else if (
          err?.code === "auth/invalid-action-code"
        ) {
          setError(
            "This password reset link is invalid or has already been used."
          );
        } else {
          setError(
            "We could not verify this password reset link. Please request a new one."
          );
        }
      } finally {
        setCheckingCode(false);
      }
    }

    verifyCode();
  }, [oobCode]);

  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    const type = settings.loginBackgroundType || "gradient";
    const image = settings.loginBackgroundImage?.trim();

    if (type === "image" && image) {
      const opacity = Math.min(
        0.9,
        Math.max(
          0,
          settings.loginOverlayOpacity ?? 0.18
        )
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
      Math.max(
        0.35,
        settings.authCardOpacity ?? 0.95
      )
    );

    return {
      width: `min(100%, ${
        settings.authCardWidth || "1180px"
      })`,
      borderRadius: `${
        settings.authCardRadius ?? 32
      }px`,
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

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!oobCode) {
      setError(
        "This password reset link is invalid."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(
        auth,
        oobCode,
        password
      );

      setSuccess(
        "Your password has been successfully changed. You can now sign in with your new password."
      );

      setPassword("");
      setConfirm("");
      setValidCode(false);
    } catch (err: any) {
      console.error(err);

      if (
        err?.code === "auth/expired-action-code"
      ) {
        setError(
          "This password reset link has expired. Please request a new one."
        );
      } else if (
        err?.code === "auth/invalid-action-code"
      ) {
        setError(
          "This password reset link is invalid or has already been used."
        );
      } else if (
        err?.code === "auth/weak-password"
      ) {
        setError(
          "Please choose a stronger password."
        );
      } else {
        setError(
          "We could not change your password. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const logoVisible =
    settings.authLogoVisible !== false;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black/10" />

      <section
        className="relative z-10 w-full overflow-hidden border border-white/30 shadow-2xl"
        style={frameStyle}
      >
        <div className="grid min-h-[620px] lg:grid-cols-[0.85fr_1.15fr]">

          {/* BRAND PANEL */}
          <div className="hidden flex-col justify-between bg-slate-950/90 p-10 text-white lg:flex xl:p-14">
            <div>
              {logoVisible && (
                <div className="mb-12 flex justify-start">
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="EduJAMB"
                      className="h-auto max-w-full object-contain"
                      style={{
                        width: `${
                          settings.authLogoSize ??
                          200
                        }px`,
                      }}
                    />
                  ) : (
                    <div className="text-2xl font-black tracking-tight">
                      Edu
                      <span className="text-cyan-400">
                        JAMB
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="max-w-md">
                <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
                  PASSWORD RECOVERY
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                  Set a new password
                </h1>

                <p className="mt-5 text-base leading-7 text-slate-300">
                  Create a new secure password and
                  continue your EduJAMB journey.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-4 h-px w-full bg-white/10" />

              <p className="text-sm leading-6 text-slate-400">
                Your password is securely managed
                through Firebase Authentication.
              </p>
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="flex items-center bg-white/95 px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
            <div className="mx-auto w-full max-w-xl">

              {/* MOBILE LOGO */}
              <div className="mb-8 lg:hidden">
                {logoVisible && (
                  <div className="mb-7 flex justify-center">
                    {settings.logo ? (
                      <img
                        src={settings.logo}
                        alt="EduJAMB"
                        className="h-auto max-w-full object-contain"
                        style={{
                          width: `${
                            settings.authLogoMobileSize ??
                            190
                          }px`,
                        }}
                      />
                    ) : (
                      <div className="text-2xl font-black tracking-tight text-slate-950">
                        Edu
                        <span className="text-indigo-600">
                          JAMB
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  PASSWORD RECOVERY
                </div>
              </div>

              {checkingCode ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

                  <h2 className="text-xl font-black text-slate-950">
                    Verifying reset link
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Please wait while we verify your
                    password reset request.
                  </p>
                </div>
              ) : success ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                    ✓
                  </div>

                  <h2 className="mt-6 text-2xl font-black text-slate-950">
                    Password changed
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                    {success}
                  </p>

                  <Link
                    href="/login"
                    className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-7 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700"
                  >
                    Back to Login
                  </Link>
                </div>
              ) : !validCode ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
                    !
                  </div>

                  <h2 className="mt-6 text-2xl font-black text-slate-950">
                    Reset link unavailable
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                    {error ||
                      "This password reset link cannot be used."}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                      href="/forgot-password"
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition hover:bg-indigo-700"
                    >
                      Request New Link
                    </Link>

                    <Link
                      href="/login"
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Back to Login
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      Create a new password
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {email
                        ? `Resetting the password for ${email}`
                        : "Enter your new password below."}
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

                  <form
                    onSubmit={submit}
                    className="space-y-5"
                  >
                    <div>
                      <label
                        htmlFor="new-password"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        New password
                      </label>

                      <PasswordField
                        value={password}
                        onChange={setPassword}
                        show={showPassword}
                        onToggle={() =>
                          setShowPassword(
                            (value) => !value
                          )
                        }
                        placeholder="Enter new password"
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

                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Confirm new password
                      </label>

                      <PasswordField
                        value={confirm}
                        onChange={setConfirm}
                        show={showConfirm}
                        onToggle={() =>
                          setShowConfirm(
                            (value) => !value
                          )
                        }
                        placeholder="Confirm new password"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading
                        ? "Updating password..."
                        : "Set New Password"}
                    </button>
                  </form>

                  <div className="mt-7 text-center">
                    <Link
                      href="/login"
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading...
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
