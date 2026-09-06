"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<SiteSettings>(defaultSiteSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      try {
        const adminSnapshot = await getDoc(
          doc(db, "adminUsers", user.uid)
        );

        if (!adminSnapshot.exists()) {
          router.replace("/admin/login");
          return;
        }

        const adminData = adminSnapshot.data();

        if (
          adminData.role !== "super_admin" ||
          adminData.active === false
        ) {
          router.replace("/admin/login");
          return;
        }

        const settingsSnapshot = await getDoc(
          doc(db, "siteSettings", "site")
        );

        if (settingsSnapshot.exists()) {
          setSettings({
            ...defaultSiteSettings,
            ...(settingsSnapshot.data() as SiteSettings),
          });
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to load profile settings.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  function updateSetting<K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage("");
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      await setDoc(
        doc(db, "siteSettings", "site"),
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Profile settings saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to save profile settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-bold">
            Loading profile settings...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
              EduJAMB CMS
            </p>
            <h1 className="mt-1 text-lg font-black">
              Profile Experience
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Admin
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-bold text-violet-800">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                number="01"
                title="Profile Header"
                description="Control the navigation/header shown on the student profile."
              />

              <div className="space-y-5">
                <Toggle
                  label="Show profile header"
                  checked={settings.profileHeaderVisible !== false}
                  onChange={(value) =>
                    updateSetting("profileHeaderVisible", value)
                  }
                />

                <Toggle
                  label="Show brand name"
                  checked={settings.profileBrandNameVisible !== false}
                  onChange={(value) =>
                    updateSetting("profileBrandNameVisible", value)
                  }
                />

                <Toggle
                  label="Enable mobile menu"
                  checked={
                    settings.profileMobileMenuEnabled !== false
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileMobileMenuEnabled",
                      value
                    )
                  }
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                number="02"
                title="Hero Content"
                description="Control the main profile banner messaging."
              />

              <div className="grid gap-5">
                <TextInput
                  label="Hero title"
                  value={settings.profileHeroTitle || ""}
                  onChange={(value) =>
                    updateSetting("profileHeroTitle", value)
                  }
                />

                <TextArea
                  label="Hero subtitle"
                  value={settings.profileHeroSubtitle || ""}
                  onChange={(value) =>
                    updateSetting("profileHeroSubtitle", value)
                  }
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                number="03"
                title="Hero Appearance"
                description="Control the profile banner background and visual effects."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectInput
                  label="Background type"
                  value={
                    settings.profileHeroBackgroundType || "mixed"
                  }
                  options={[
                    ["mixed", "Mixed / Gradient"],
                    ["gradient", "Gradient"],
                    ["image", "Image"],
                  ]}
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroBackgroundType",
                      value as "gradient" | "image" | "mixed"
                    )
                  }
                />

                <TextInput
                  label="Image URL"
                  value={
                    settings.profileHeroBackgroundImage || ""
                  }
                  placeholder="https://..."
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroBackgroundImage",
                      value
                    )
                  }
                />

                <TextInput
                  label="Background color"
                  type="color"
                  value={
                    settings.profileHeroBackgroundColor ||
                    "#6d28d9"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroBackgroundColor",
                      value
                    )
                  }
                />

                <TextInput
                  label="Secondary color"
                  type="color"
                  value={
                    settings.profileHeroSecondaryColor ||
                    "#312e81"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroSecondaryColor",
                      value
                    )
                  }
                />

                <TextInput
                  label="Accent color"
                  type="color"
                  value={
                    settings.profileHeroAccentColor ||
                    "#c084fc"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroAccentColor",
                      value
                    )
                  }
                />

                <TextInput
                  label="Background position"
                  value={
                    settings.profileHeroBackgroundPosition ||
                    "center"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroBackgroundPosition",
                      value
                    )
                  }
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Toggle
                  label="Decorative elements"
                  checked={
                    settings.profileHeroDecorations !== false
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroDecorations",
                      value
                    )
                  }
                />

                <Toggle
                  label="Background pattern"
                  checked={
                    settings.profileHeroPattern !== false
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroPattern",
                      value
                    )
                  }
                />
              </div>

              <div className="mt-6">
                <RangeInput
                  label="Image overlay opacity"
                  value={settings.profileHeroOverlayOpacity ?? 0.28}
                  min={0}
                  max={0.8}
                  step={0.01}
                  onChange={(value) =>
                    updateSetting(
                      "profileHeroOverlayOpacity",
                      value
                    )
                  }
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                number="04"
                title="Page & Brand Colors"
                description="Control the overall profile page visual identity."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  label="Page background"
                  type="color"
                  value={
                    settings.profilePageBackground ||
                    "#f7f5ff"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profilePageBackground",
                      value
                    )
                  }
                />

                <TextInput
                  label="Primary color"
                  type="color"
                  value={
                    settings.profilePrimaryColor ||
                    "#7c3aed"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profilePrimaryColor",
                      value
                    )
                  }
                />

                <TextInput
                  label="Primary hover color"
                  type="color"
                  value={
                    settings.profilePrimaryHoverColor ||
                    "#6d28d9"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profilePrimaryHoverColor",
                      value
                    )
                  }
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                number="05"
                title="Profile Cards"
                description="Control the glass-card treatment used throughout the profile."
              />

              <div className="space-y-6">
                <RangeInput
                  label="Card opacity"
                  value={settings.profileCardOpacity ?? 0.96}
                  min={0.5}
                  max={1}
                  step={0.01}
                  onChange={(value) =>
                    updateSetting(
                      "profileCardOpacity",
                      value
                    )
                  }
                />

                <RangeInput
                  label="Backdrop blur"
                  value={settings.profileCardBlur ?? 14}
                  min={0}
                  max={40}
                  step={1}
                  suffix="px"
                  onChange={(value) =>
                    updateSetting(
                      "profileCardBlur",
                      value
                    )
                  }
                />

                <RangeInput
                  label="Corner radius"
                  value={settings.profileCardRadius ?? 28}
                  min={0}
                  max={50}
                  step={1}
                  suffix="px"
                  onChange={(value) =>
                    updateSetting(
                      "profileCardRadius",
                      value
                    )
                  }
                />

                <TextInput
                  label="Border color"
                  value={
                    settings.profileCardBorderColor ||
                    "rgba(255,255,255,0.75)"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileCardBorderColor",
                      value
                    )
                  }
                />

                <TextInput
                  label="Box shadow"
                  value={
                    settings.profileCardShadow ||
                    "0 20px 60px rgba(76,29,149,0.10)"
                  }
                  onChange={(value) =>
                    updateSetting(
                      "profileCardShadow",
                      value
                    )
                  }
                />
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div
                className="relative overflow-hidden p-6 text-white"
                style={{
                  background: `linear-gradient(135deg, ${
                    settings.profileHeroBackgroundColor ||
                    "#6d28d9"
                  }, ${
                    settings.profileHeroSecondaryColor ||
                    "#312e81"
                  })`,
                }}
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">
                    Live preview
                  </p>

                  <h2 className="mt-3 text-2xl font-black leading-tight">
                    {settings.profileHeroTitle ||
                      "Build your EduJAMB profile"}
                  </h2>

                  <p className="mt-3 text-xs leading-5 text-violet-100">
                    {settings.profileHeroSubtitle ||
                      "Set up your learning identity and unlock your personalized JAMB preparation experience."}
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <PreviewCard
                  label="Primary color"
                  value={
                    settings.profilePrimaryColor ||
                    "#7c3aed"
                  }
                  color={
                    settings.profilePrimaryColor ||
                    "#7c3aed"
                  }
                />

                <PreviewCard
                  label="Card radius"
                  value={`${settings.profileCardRadius ?? 28}px`}
                />

                <PreviewCard
                  label="Card blur"
                  value={`${settings.profileCardBlur ?? 14}px`}
                />

                <PreviewCard
                  label="Card opacity"
                  value={String(
                    settings.profileCardOpacity ?? 0.96
                  )}
                />

                <div
                  className="rounded-2xl border p-4"
                  style={{
                    background:
                      settings.profilePageBackground ||
                      "#f7f5ff",
                    borderColor:
                      settings.profileCardBorderColor ||
                      "#e2e8f0",
                  }}
                >
                  <p className="text-xs font-black text-slate-700">
                    Profile surface
                  </p>
                  <div
                    className="mt-3 h-12 rounded-xl"
                    style={{
                      background:
                        settings.profilePrimaryColor ||
                        "#7c3aed",
                      borderRadius: `${Math.min(
                        settings.profileCardRadius ?? 28,
                        20
                      )}px`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="mt-4 w-full rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg transition hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile Settings"}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">
        {number}
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 ${
          type === "color" ? "cursor-pointer p-1.5" : ""
        }`}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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

function RangeInput({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-black text-slate-800">
          {label}
        </span>

        <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
          {value}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="w-full accent-violet-600"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-200 hover:shadow-sm"
    >
      <span className="text-sm font-black text-slate-800">
        {label}
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-violet-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function PreviewCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <span className="flex items-center gap-2 text-xs font-black text-slate-800">
        {color && (
          <span
            className="h-5 w-5 rounded-md border border-white shadow-sm"
            style={{ background: color }}
          />
        )}
        {value}
      </span>
    </div>
  );
}
