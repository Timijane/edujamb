"use client";

import { FormEvent, useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import Link from "next/link";

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");

  if (value.length !== 6) {
    return `rgba(255,255,255,${alpha})`;
  }

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function positionClass(position?: SiteSettings["authCardPosition"]) {
  if (position === "left") return "justify-start";
  if (position === "right") return "justify-end";
  return "justify-center";
}

function logoAlignment(position?: SiteSettings["authLogoPosition"]) {
  if (position === "left") return "mr-auto";
  if (position === "right") return "ml-auto";
  return "mx-auto";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);

  useEffect(() => {
    getDoc(doc(db, "siteSettings", "site"))
      .then((snap) => {
        if (snap.exists()) {
          setSettings({
            ...defaultSiteSettings,
            ...(snap.data() as SiteSettings),
          });
        }
      })
      .catch(() => {});
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(
        auth,
        cleanEmail,
        actionCodeSettings
      );

      setMessage(
        "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder."
      );
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Too many reset attempts. Please wait a while and try again."
        );
      } else if (err?.code === "auth/unauthorized-continue-uri") {
        setError(
          "Password reset is not fully configured for this domain. Please contact the administrator."
        );
      } else {
        setError(
          "We could not send the reset email right now. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const backgroundStyle =
    settings.loginBackgroundType === "image" && settings.loginBackgroundImage
      ? {
          backgroundImage: `url(${settings.loginBackgroundImage})`,
          backgroundPosition:
            settings.loginBackgroundPosition || "center",
          backgroundSize: "cover",
        }
      : settings.loginBackgroundType === "color"
        ? {
            backgroundColor:
              settings.loginBackgroundColor || "#f8fafc",
          }
        : {};

  const cardOpacity = Math.min(
    1,
    Math.max(0.35, settings.authCardOpacity ?? 0.95)
  );

  const cardStyle = {
    width: `min(100%, ${settings.authCardWidth || "1180px"})`,
    borderRadius: `${settings.authCardRadius ?? 32}px`,
    backgroundColor: hexToRgba("#ffffff", cardOpacity),
    backdropFilter: `blur(${settings.authCardBlur ?? 20}px)`,
    WebkitBackdropFilter: `blur(${settings.authCardBlur ?? 20}px)`,
  };

  return (
    <main
      className={`relative flex min-h-screen items-center overflow-hidden px-5 py-10 sm:px-8 ${positionClass(
        settings.authCardPosition
      )}`}
      style={{
        ...backgroundStyle,
        background:
          settings.loginBackgroundType === "gradient" ||
          !settings.loginBackgroundType
            ? "linear-gradient(135deg, #020617 0%, #1e1b4b 52%, #164e63 100%)"
            : undefined,
      }}
    >
      {settings.loginBackgroundType === "image" &&
        settings.loginBackgroundImage && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: hexToRgba(
                "#020617",
                settings.loginOverlayOpacity ?? 0.18
              ),
            }}
          />
        )}

      <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-orange-400/15 blur-3xl" />

      <section
        className="relative mx-auto border border-white/20 p-7 shadow-2xl sm:p-10"
        style={cardStyle}
      >
        {settings.authLogoVisible !== false ? (
          settings.logo ? (
            <div
              className={`mb-8 flex ${logoAlignment(
                settings.authLogoPosition
              )}`}
            >
              <img
                src={settings.logo}
                alt="EduJAMB"
                className="hidden object-contain sm:block"
                style={{
                  width: `${settings.authLogoSize ?? 200}px`,
                  maxWidth: "100%",
                  height: "auto",
                }}
              />

              <img
                src={settings.logo}
                alt="EduJAMB"
                className="block object-contain sm:hidden"
                style={{
                  width: `${settings.authLogoMobileSize ?? 190}px`,
                  maxWidth: "100%",
                  height: "auto",
                }}
              />
            </div>
          ) : (
            <div
              className={`mb-8 flex text-2xl font-black text-slate-950 ${logoAlignment(
                settings.authLogoPosition
              )}`}
            >
              EduJAMB
            </div>
          )
        ) : null}

        <div className="mx-auto max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
            Account recovery
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Forgot your password?
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            Enter the email address connected to your EduJAMB account and
            we&apos;ll send you a secure link to create a new password.
          </p>

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
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            {message && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white shadow-xl transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 text-sm text-slate-500 sm:flex-row">
            <span>Remember your password?</span>

            <Link
              href="/login"
              className="font-black text-indigo-600 hover:text-indigo-800"
            >
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
