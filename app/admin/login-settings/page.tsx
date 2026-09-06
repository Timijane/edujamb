"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import { useRouter } from "next/navigation";

export default function LoginSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<SiteSettings>(
    defaultSiteSettings
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      try {
        const adminSnap = await getDoc(
          doc(db, "adminUsers", user.uid)
        );

        if (
          !adminSnap.exists() ||
          adminSnap.data().active !== true ||
          adminSnap.data().role !== "super_admin"
        ) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        const siteSnap = await getDoc(
          doc(db, "siteSettings", "site")
        );

        if (siteSnap.exists()) {
          setSettings({
            ...defaultSiteSettings,
            ...(siteSnap.data() as SiteSettings),
          });
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load authentication settings.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function update<K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await setDoc(
        doc(db, "siteSettings", "site"),
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage(
        "Authentication experience updated successfully."
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to save authentication settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <div className="rounded-2xl bg-white px-6 py-5 shadow-sm">
          <p className="font-bold text-indigo-700">
            Loading authentication settings...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
              Super Admin
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Authentication Experience
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Control Login, Register and password-recovery presentation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            Back to Admin
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7 overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-indigo-950 to-cyan-950 p-7 text-white shadow-xl sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            EduJAMB Auth CMS
          </p>

          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Design the authentication experience without editing code.
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">
            Manage the authentication background, branding, frame,
            logo presentation and Login/Register messaging from one
            Super Admin interface.
          </p>
        </div>

        <form onSubmit={save} className="space-y-6">
          <Panel
            title="1. Authentication Background"
            description="Control the visual environment behind the authentication interface."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Background type"
                value={settings.loginBackgroundType || "gradient"}
                onChange={(value) =>
                  update(
                    "loginBackgroundType",
                    value as SiteSettings["loginBackgroundType"]
                  )
                }
                options={[
                  ["gradient", "Artistic gradient"],
                  ["color", "Solid colour"],
                  ["image", "Uploaded image"],
                ]}
              />

              <TextField
                label="Background image position"
                value={settings.loginBackgroundPosition || "center"}
                onChange={(value) =>
                  update("loginBackgroundPosition", value)
                }
                placeholder="center"
                help="Examples: center, top, center top, 50% 30%."
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-800">
                  Background colour
                </label>

                <div className="flex gap-3">
                  <input
                    type="color"
                    value={settings.loginBackgroundColor || "#f8fafc"}
                    onChange={(event) =>
                      update(
                        "loginBackgroundColor",
                        event.target.value
                      )
                    }
                    className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  />

                  <input
                    value={settings.loginBackgroundColor || "#f8fafc"}
                    onChange={(event) =>
                      update(
                        "loginBackgroundColor",
                        event.target.value
                      )
                    }
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <RangeField
                label="Image overlay opacity"
                value={settings.loginOverlayOpacity ?? 0.18}
                min={0}
                max={0.9}
                step={0.01}
                onChange={(value) =>
                  update("loginOverlayOpacity", value)
                }
                suffix="%"
                percentage
              />
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
              <strong>Background image:</strong> upload and assign an
              image with the purpose <strong>Login Background</strong>{" "}
              from <strong>Admin → Media Manager</strong>.
            </div>
          </Panel>

          <Panel
            title="2. Authentication Frame"
            description="Control the size, transparency, blur, corner radius and position of the main authentication frame."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Frame width"
                value={settings.authCardWidth || "1180px"}
                onChange={(value) =>
                  update("authCardWidth", value)
                }
                placeholder="1180px"
                help="Use CSS values such as 1180px, 90vw or 72rem."
              />

              <SelectField
                label="Frame position"
                value={settings.authCardPosition || "center"}
                onChange={(value) =>
                  update(
                    "authCardPosition",
                    value as SiteSettings["authCardPosition"]
                  )
                }
                options={[
                  ["left", "Left"],
                  ["center", "Center"],
                  ["right", "Right"],
                ]}
              />

              <RangeField
                label="Frame opacity"
                value={settings.authCardOpacity ?? 0.95}
                min={0.35}
                max={1}
                step={0.01}
                onChange={(value) =>
                  update("authCardOpacity", value)
                }
                suffix="%"
                percentage
              />

              <RangeField
                label="Glass blur"
                value={settings.authCardBlur ?? 20}
                min={0}
                max={40}
                step={1}
                onChange={(value) =>
                  update("authCardBlur", value)
                }
                suffix="px"
              />

              <RangeField
                label="Corner radius"
                value={settings.authCardRadius ?? 32}
                min={0}
                max={60}
                step={1}
                onChange={(value) =>
                  update("authCardRadius", value)
                }
                suffix="px"
              />
            </div>
          </Panel>

          <Panel
            title="3. Authentication Branding"
            description="Control how the existing EduJAMB logo appears on authentication pages."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <ToggleField
                label="Show authentication logo"
                checked={settings.authLogoVisible !== false}
                onChange={(value) =>
                  update("authLogoVisible", value)
                }
              />

              <SelectField
                label="Logo position"
                value={settings.authLogoPosition || "left"}
                onChange={(value) =>
                  update(
                    "authLogoPosition",
                    value as SiteSettings["authLogoPosition"]
                  )
                }
                options={[
                  ["left", "Left"],
                  ["center", "Center"],
                  ["right", "Right"],
                ]}
              />

              <RangeField
                label="Desktop logo width"
                value={settings.authLogoSize ?? 200}
                min={60}
                max={500}
                step={5}
                onChange={(value) =>
                  update("authLogoSize", value)
                }
                suffix="px"
              />

              <RangeField
                label="Mobile logo width"
                value={settings.authLogoMobileSize ?? 190}
                min={50}
                max={400}
                step={5}
                onChange={(value) =>
                  update("authLogoMobileSize", value)
                }
                suffix="px"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              The actual logo file remains controlled by the existing
              Media Manager. These settings control how that logo is
              displayed on authentication pages.
            </div>
          </Panel>

          <Panel
            title="4. Authentication Button"
            description="Control the colours of the primary Login and Register buttons."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <ColorField
                label="Button colour"
                value={settings.authButtonColor || "#7c3aed"}
                onChange={(value) =>
                  update("authButtonColor", value)
                }
              />

              <ColorField
                label="Hover colour"
                value={settings.authButtonHoverColor || "#6d28d9"}
                onChange={(value) =>
                  update("authButtonHoverColor", value)
                }
              />

              <ColorField
                label="Button text colour"
                value={settings.authButtonTextColor || "#ffffff"}
                onChange={(value) =>
                  update("authButtonTextColor", value)
                }
              />
            </div>

            <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm leading-6 text-purple-950">
              These colours apply to the primary action buttons on both
              the Login and Register pages.
            </div>
          </Panel>

          <Panel
            title="5. Login Page Content"
            description="Edit the visible Login messaging."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Eyebrow"
                value={settings.loginEyebrow || ""}
                onChange={(value) =>
                  update("loginEyebrow", value)
                }
                placeholder="EDUJAMB • JAMB PREPARATION PLATFORM"
              />

              <TextField
                label="Title"
                value={settings.loginTitle || ""}
                onChange={(value) =>
                  update("loginTitle", value)
                }
                placeholder="Welcome back"
              />

              <TextAreaField
                label="Subtitle"
                value={settings.loginSubtitle || ""}
                onChange={(value) =>
                  update("loginSubtitle", value)
                }
                className="md:col-span-2"
              />
            </div>
          </Panel>

          <Panel
            title="5. Registration Page Content"
            description="Edit the visible Register messaging."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Eyebrow"
                value={settings.registerEyebrow || ""}
                onChange={(value) =>
                  update("registerEyebrow", value)
                }
                placeholder="GET STARTED"
              />

              <TextField
                label="Title"
                value={settings.registerTitle || ""}
                onChange={(value) =>
                  update("registerTitle", value)
                }
                placeholder="Create your account"
              />

              <TextAreaField
                label="Subtitle"
                value={settings.registerSubtitle || ""}
                onChange={(value) =>
                  update("registerSubtitle", value)
                }
                className="md:col-span-2"
              />
            </div>
          </Panel>

          <Panel
            title="6. Authentication Navigation"
            description="The authentication pages remain connected through clear navigation paths."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow
                title="Login → Register"
                description="Create a student account link."
              />

              <InfoRow
                title="Register → Login"
                description="Back to Login link."
              />

              <InfoRow
                title="Login → Forgot Password"
                description="Password recovery link."
              />

              <InfoRow
                title="Forgot Password → Login"
                description="Return to Login link."
              />

              <InfoRow
                title="Reset Password → Login"
                description="Return to Login after changing password."
              />
            </div>
          </Panel>

          <Panel
            title="7. Password Recovery"
            description="Firebase handles the secure password recovery process."
          >
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-black text-emerald-900">
                Secure Firebase password reset
              </p>

              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Users can request a reset email from Forgot Password
                and complete the process on the Set New Password page.
                The authentication system will verify the reset code
                before accepting the new password.
              </p>
            </div>
          </Panel>

          <div className="sticky bottom-4 z-10 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-10 flex-1">
                {message && (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-xl transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Authentication Experience"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <h3 className="text-xl font-black tracking-tight text-slate-950">
        {title}
      </h3>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </label>

      <div className="flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
        />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
          placeholder="#7c3aed"
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      />

      {help && (
        <span className="mt-2 block text-xs leading-5 text-slate-400">
          {help}
        </span>
      )}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </span>

      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  percentage = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix: string;
  percentage?: boolean;
}) {
  const displayValue = percentage
    ? Math.round(value * 100)
    : value;

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-800">
          {label}
        </span>

        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
          {displayValue}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="w-full"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span>
        <span className="block text-sm font-bold text-slate-800">
          {label}
        </span>

        <span className="mt-1 block text-xs text-slate-400">
          {checked ? "Enabled" : "Disabled"}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5 accent-indigo-600"
      />
    </label>
  );
}

function InfoRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}
