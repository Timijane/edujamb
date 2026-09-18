"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  defaultProfileDesign,
  normalizeProfileDesign,
  type ProfileDesignConfig,
} from "@/lib/profile-design";
import {
  ensureDefaultProfileDesign,
  listProfileDesigns,
  publishProfileDesign,
  saveProfileDesign,
} from "@/lib/profile-design-service";

const CLOUD_NAME = "dmbjrohtn";
const UPLOAD_PRESET = "pelumi";

const PALETTES = [
  { name: "Royal Purple", colors: ["#7c3aed", "#4c1d95", "#c084fc"] },
  { name: "Violet Bloom", colors: ["#8b5cf6", "#5b21b6", "#ddd6fe"] },
  { name: "Indigo", colors: ["#4f46e5", "#312e81", "#a5b4fc"] },
  { name: "Ocean", colors: ["#0284c7", "#0c4a6e", "#38bdf8"] },
  { name: "Sky", colors: ["#0ea5e9", "#075985", "#7dd3fc"] },
  { name: "Teal", colors: ["#0d9488", "#134e4a", "#5eead4"] },
  { name: "Emerald", colors: ["#059669", "#064e3b", "#6ee7b7"] },
  { name: "Green", colors: ["#16a34a", "#14532d", "#86efac"] },
  { name: "Lime", colors: ["#65a30d", "#365314", "#bef264"] },
  { name: "Yellow", colors: ["#ca8a04", "#713f12", "#fde047"] },
  { name: "Amber", colors: ["#d97706", "#78350f", "#fcd34d"] },
  { name: "Orange", colors: ["#ea580c", "#7c2d12", "#fdba74"] },
  { name: "Red", colors: ["#dc2626", "#7f1d1d", "#fca5a5"] },
  { name: "Rose", colors: ["#e11d48", "#881337", "#fda4af"] },
  { name: "Pink", colors: ["#db2777", "#831843", "#f9a8d4"] },
  { name: "Fuchsia", colors: ["#c026d3", "#701a75", "#f0abfc"] },
  { name: "Berry", colors: ["#be185d", "#500724", "#f9a8d4"] },
  { name: "Plum", colors: ["#9333ea", "#581c87", "#d8b4fe"] },
  { name: "Cobalt", colors: ["#2563eb", "#1e3a8a", "#93c5fd"] },
  { name: "Midnight", colors: ["#334155", "#020617", "#94a3b8"] },
  { name: "Slate", colors: ["#475569", "#1e293b", "#cbd5e1"] },
  { name: "Charcoal", colors: ["#374151", "#111827", "#9ca3af"] },
  { name: "Stone", colors: ["#57534e", "#292524", "#d6d3d1"] },
  { name: "Gold", colors: ["#b7791f", "#713f12", "#f6d365"] },
  { name: "Copper", colors: ["#c2410c", "#431407", "#fb923c"] },
  { name: "Forest", colors: ["#166534", "#052e16", "#4ade80"] },
  { name: "Mint", colors: ["#059669", "#064e3b", "#99f6e4"] },
  { name: "Aqua", colors: ["#0891b2", "#164e63", "#67e8f9"] },
  { name: "Lavender", colors: ["#7e22ce", "#4c1d95", "#e9d5ff"] },
  { name: "Sunset", colors: ["#f97316", "#be123c", "#fda4af"] },
  { name: "Royal Rose", colors: ["#7c3aed", "#be123c", "#f9a8d4"] },
  { name: "Electric", colors: ["#2563eb", "#7c3aed", "#22d3ee"] },
  { name: "Tropical", colors: ["#059669", "#0891b2", "#a7f3d0"] },
];

const GRADIENTS = [
  ["Violet Dream", "#7c3aed", "#312e81"],
  ["Purple Sky", "#a855f7", "#2563eb"],
  ["Royal Night", "#4c1d95", "#111827"],
  ["Ocean Blue", "#0284c7", "#1e3a8a"],
  ["Deep Sea", "#164e63", "#312e81"],
  ["Skyline", "#38bdf8", "#4f46e5"],
  ["Teal Wave", "#0d9488", "#2563eb"],
  ["Emerald Flow", "#059669", "#0f766e"],
  ["Forest", "#166534", "#064e3b"],
  ["Lime Garden", "#65a30d", "#15803d"],
  ["Golden Hour", "#f59e0b", "#dc2626"],
  ["Amber Fire", "#f97316", "#b91c1c"],
  ["Sunset", "#f97316", "#db2777"],
  ["Rose Glow", "#e11d48", "#9333ea"],
  ["Pink Cloud", "#ec4899", "#8b5cf6"],
  ["Fuchsia Night", "#c026d3", "#4c1d95"],
  ["Berry", "#be185d", "#7e22ce"],
  ["Red Velvet", "#dc2626", "#7f1d1d"],
  ["Copper", "#c2410c", "#78350f"],
  ["Gold Royal", "#ca8a04", "#7c2d12"],
  ["Midnight", "#334155", "#020617"],
  ["Slate", "#475569", "#0f172a"],
  ["Charcoal", "#374151", "#111827"],
  ["Plum", "#9333ea", "#581c87"],
  ["Lavender", "#8b5cf6", "#ec4899"],
  ["Cobalt", "#2563eb", "#4f46e5"],
  ["Electric", "#06b6d4", "#7c3aed"],
  ["Aqua", "#0891b2", "#14b8a6"],
  ["Tropical", "#059669", "#0891b2"],
  ["Neon", "#22c55e", "#06b6d4"],
  ["Aurora", "#22d3ee", "#8b5cf6"],
  ["Royal Fire", "#7c3aed", "#f97316"],
  ["Ocean Sunset", "#0284c7", "#f97316"],
];

function cloneDesign(design: ProfileDesignConfig): ProfileDesignConfig {
  return normalizeProfileDesign(JSON.parse(JSON.stringify(design)));
}

function createDesignId() {
  return `profile-${Date.now().toString(36)}`;
}

function updateNested(
  design: ProfileDesignConfig,
  group: keyof ProfileDesignConfig,
  key: string,
  value: unknown
) {
  return normalizeProfileDesign({
    ...design,
    [group]: {
      ...(design[group] as Record<string, unknown>),
      [key]: value,
    },
  });
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
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
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
    >
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
          checked ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}

function Preview({ design }: { design: ProfileDesignConfig }) {
  const hero = design.hero;
  const palette = design.colors;

  const background =
    hero.backgroundType === "solid"
      ? hero.backgroundColor
      : hero.backgroundType === "image" && hero.backgroundImage
        ? `linear-gradient(rgba(15,23,42,${hero.overlayOpacity}),rgba(15,23,42,${hero.overlayOpacity})),url("${hero.backgroundImage}")`
        : `linear-gradient(135deg, ${hero.backgroundColor}, ${hero.secondaryColor})`;

  return (
    <div
      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
      style={{ background: palette.pageBackground }}
    >
      {hero.visible ? (
        <div
          className="relative overflow-hidden p-6 text-white"
          style={{
            background,
            backgroundPosition: hero.backgroundPosition,
            backgroundSize: "cover",
          }}
        >
          {hero.pattern ? (
            <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
          ) : null}

          <div className="relative z-10">
            <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
              {hero.eyebrow}
            </div>

            <h3
              className="max-w-xl font-black leading-tight"
              style={{ fontSize: `${1.8 * hero.title.length > 38 ? 1.6 : 2}rem` }}
            >
              {hero.title}
            </h3>

            <p className="mt-2 max-w-xl text-sm font-medium text-white/80">
              {hero.subtitle}
            </p>

            {hero.showProgress ? (
              <div className="mt-5 max-w-md">
                <div className="mb-2 flex justify-between text-[11px] font-bold">
                  <span>Profile completion</span>
                  <span>60%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-3/5 rounded-full bg-white" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-4 p-5 ${
          design.layout.content === "two-column"
            ? "md:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {[
          ["Public identity", design.sections.identity],
          ["Personal information", design.sections.personalInformation],
          ["Education", design.sections.education],
          ["JAMB preparation", design.sections.jambPreparation],
        ]
          .filter(([, visible]) => visible)
          .map(([label]) => (
            <div
              key={String(label)}
              className="min-h-24 p-4"
              style={{
                background: palette.cardBackground,
                borderRadius: design.cards.radius,
                border: `${design.cards.borderWidth}px solid ${design.cards.borderColor}`,
                boxShadow: design.cards.shadow,
              }}
            >
              <div
                className="text-sm font-black"
                style={{ color: palette.text }}
              >
                {label}
              </div>
              <div
                className="mt-3 h-2 w-2/3 rounded-full"
                style={{ background: palette.primary }}
              />
              <div className="mt-2 h-2 w-1/2 rounded-full bg-slate-100" />
            </div>
          ))}
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [designs, setDesigns] = useState<ProfileDesignConfig[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [design, setDesign] =
    useState<ProfileDesignConfig>(defaultProfileDesign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedDesign = useMemo(
    () => designs.find((item) => item.designId === selectedId),
    [designs, selectedId]
  );

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

        const admin = adminSnapshot.data();

        if (admin.role !== "super_admin" || admin.active === false) {
          router.replace("/admin/login");
          return;
        }

        await ensureDefaultProfileDesign();

        const items = await listProfileDesigns();

        setDesigns(items);

        const published =
          items.find((item) => item.status === "published") ??
          items[0] ??
          defaultProfileDesign;

        setSelectedId(published.designId);
        setDesign(cloneDesign(published));
      } catch (error) {
        console.error(error);
        setMessage("Unable to load Profile Design Studio.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  function selectDesign(id: string) {
    const found = designs.find((item) => item.designId === id);

    if (!found) return;

    setSelectedId(id);
    setDesign(cloneDesign(found));
    setMessage("");
  }

  function createDesign() {
    const newDesign = cloneDesign(design);

    newDesign.designId = createDesignId();
    newDesign.name = "New Profile Design";
    newDesign.status = "draft";
    newDesign.updatedAt = undefined;
    newDesign.publishedAt = undefined;

    setDesign(newDesign);
    setSelectedId(newDesign.designId);
    setDesigns((current) => [...current, newDesign]);
    setMessage("New draft created.");
  }

  function applyPalette(colors: string[]) {
    setDesign((current) =>
      normalizeProfileDesign({
        ...current,
        hero: {
          ...current.hero,
          backgroundType: "mixed",
          backgroundColor: colors[0],
          secondaryColor: colors[1],
          accentColor: colors[2],
        },
        colors: {
          ...current.colors,
          primary: colors[0],
          primaryHover: colors[1],
        },
      })
    );
  }

  function applyGradient(start: string, end: string) {
    setDesign((current) =>
      normalizeProfileDesign({
        ...current,
        hero: {
          ...current.hero,
          backgroundType: "gradient",
          backgroundColor: start,
          secondaryColor: end,
          accentColor: start,
        },
        colors: {
          ...current.colors,
          primary: start,
          primaryHover: end,
        },
      })
    );
  }

  async function uploadHeroImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Please choose an image smaller than 8MB.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const body = new FormData();

      body.append("file", file);
      body.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.secure_url) {
        throw new Error("Image upload failed.");
      }

      setDesign((current) =>
        normalizeProfileDesign({
          ...current,
          hero: {
            ...current.hero,
            backgroundType: "image",
            backgroundImage: result.secure_url,
            backgroundImageMediaId: result.public_id ?? "",
          },
          assets: {
            ...current.assets,
            heroImage: result.secure_url,
            heroImageMediaId: result.public_id ?? "",
          },
        })
      );

      setMessage("Hero image uploaded. Save the draft to keep it.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to upload the hero image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveDraft() {
    setSaving(true);
    setMessage("");

    try {
      const next = cloneDesign(design);

      await saveProfileDesign(next);

      setDesign(next);

      setDesigns((current) => {
        const exists = current.some(
          (item) => item.designId === next.designId
        );

        return exists
          ? current.map((item) =>
              item.designId === next.designId ? next : item
            )
          : [...current, next];
      });

      setMessage("Draft saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setMessage("");

    try {
      await saveProfileDesign(design);
      await publishProfileDesign(design.designId);

      const next = cloneDesign({
        ...design,
        status: "published",
      });

      setDesign(next);

      setDesigns((current) =>
        current.map((item) =>
          item.designId === next.designId
            ? next
            : { ...item, status: "draft" }
        )
      );

      setMessage(
        "Published successfully. Students will use this design."
      );
    } catch (error) {
      console.error(error);
      setMessage("Unable to publish this design.");
    } finally {
      setSaving(false);
    }
  }

  function revertToPublished() {
    const published = designs.find(
      (item) => item.status === "published"
    );

    if (!published) {
      setMessage("No published design is available.");
      return;
    }

    setDesign(cloneDesign(published));
    setSelectedId(published.designId);
    setMessage("Loaded the published design.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-10 w-72 rounded-xl bg-slate-200" />
          <div className="mt-6 h-96 rounded-3xl bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              EduJAMB Admin
            </p>
            <h1 className="text-xl font-black text-slate-950 sm:text-2xl">
              Profile Design Studio
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Back to Admin
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Section
            title="Design"
            description="Choose an existing design or create a new one."
          >
            <div className="space-y-3">
              <select
                value={selectedId}
                onChange={(event) => selectDesign(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-violet-500"
              >
                {designs.map((item) => (
                  <option key={item.designId} value={item.designId}>
                    {item.name} — {item.status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={createDesign}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                + Create New Design
              </button>
            </div>
          </Section>

          <Section
            title="Theme colours"
            description="Choose a complete colour family. No hex codes required."
          >
            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => applyPalette(palette.colors)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-violet-400 hover:shadow-sm"
                >
                  <div className="flex h-9 overflow-hidden rounded-xl">
                    {palette.colors.map((color) => (
                      <span
                        key={color}
                        className="flex-1"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <span className="mt-2 block text-[11px] font-black text-slate-700">
                    {palette.name}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            title="Gradient"
            description="Choose a ready-made hero gradient."
          >
            <div className="grid grid-cols-2 gap-2">
              {GRADIENTS.map(([name, start, end]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyGradient(start, end)}
                  className="rounded-2xl border border-slate-200 p-2 text-left"
                >
                  <div
                    className="h-10 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${start}, ${end})`,
                    }}
                  />
                  <span className="mt-2 block text-[11px] font-black text-slate-700">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            title="Hero"
            description="Control the first thing students see."
          >
            <div className="space-y-4">
              <Toggle
                label="Show hero"
                checked={design.hero.visible}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(current, "hero", "visible", value)
                  )
                }
              />

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Layout
                </span>
                <select
                  value={design.layout.hero}
                  onChange={(event) =>
                    setDesign((current) =>
                      normalizeProfileDesign({
                        ...current,
                        layout: {
                          ...current.layout,
                          hero: event.target
                            .value as ProfileDesignConfig["layout"]["hero"],
                        },
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
                >
                  <option value="banner">Banner</option>
                  <option value="split">Split</option>
                  <option value="centered">Centered</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>

              <input
                value={design.hero.eyebrow}
                onChange={(event) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "hero",
                      "eyebrow",
                      event.target.value
                    )
                  )
                }
                placeholder="Eyebrow"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium"
              />

              <input
                value={design.hero.title}
                onChange={(event) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "hero",
                      "title",
                      event.target.value
                    )
                  )
                }
                placeholder="Hero title"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
              />

              <textarea
                value={design.hero.subtitle}
                onChange={(event) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "hero",
                      "subtitle",
                      event.target.value
                    )
                  )
                }
                rows={3}
                placeholder="Hero subtitle"
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium"
              />

              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-4 text-center">
                <span className="block text-sm font-black text-violet-800">
                  {uploading ? "Uploading..." : "Upload hero image"}
                </span>
                <span className="mt-1 block text-xs font-medium text-violet-600">
                  Choose an image from your phone or computer
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadHeroImage}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {design.hero.backgroundImage ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <img
                    src={design.hero.backgroundImage}
                    alt="Hero preview"
                    className="h-32 w-full object-cover"
                  />
                </div>
              ) : null}

              <Toggle
                label="Decorative elements"
                checked={design.hero.decorations}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(current, "hero", "decorations", value)
                  )
                }
              />

              <Toggle
                label="Background pattern"
                checked={design.hero.pattern}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(current, "hero", "pattern", value)
                  )
                }
              />

              <Toggle
                label="Show completion progress"
                checked={design.hero.showProgress}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(current, "hero", "showProgress", value)
                  )
                }
              />
            </div>
          </Section>

          <Section
            title="Profile sections"
            description="Choose which sections students see."
          >
            <div className="space-y-2">
              <Toggle
                label="Public identity"
                checked={design.sections.identity}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "sections",
                      "identity",
                      value
                    )
                  )
                }
              />
              <Toggle
                label="Personal information"
                checked={design.sections.personalInformation}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "sections",
                      "personalInformation",
                      value
                    )
                  )
                }
              />
              <Toggle
                label="Education"
                checked={design.sections.education}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "sections",
                      "education",
                      value
                    )
                  )
                }
              />
              <Toggle
                label="JAMB preparation"
                checked={design.sections.jambPreparation}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "sections",
                      "jambPreparation",
                      value
                    )
                  )
                }
              />
              <Toggle
                label="Completion checklist"
                checked={design.sections.completionChecklist}
                onChange={(value) =>
                  setDesign((current) =>
                    updateNested(
                      current,
                      "sections",
                      "completionChecklist",
                      value
                    )
                  )
                }
              />
            </div>
          </Section>

          <Section title="Card style">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Soft", "0 10px 30px rgba(15,23,42,.06)", 20],
                ["Elevated", "0 20px 50px rgba(15,23,42,.12)", 24],
                ["Strong", "0 24px 70px rgba(15,23,42,.18)", 28],
                ["Minimal", "none", 16],
              ].map(([name, shadow, radius]) => (
                <button
                  key={String(name)}
                  type="button"
                  onClick={() =>
                    setDesign((current) =>
                      normalizeProfileDesign({
                        ...current,
                        cards: {
                          ...current.cards,
                          shadow: String(shadow),
                          radius: Number(radius),
                        },
                      })
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left"
                >
                  <div className="text-sm font-black text-slate-800">
                    {String(name)}
                  </div>
                  <div
                    className="mt-3 h-10 bg-slate-100"
                    style={{
                      borderRadius: Number(radius),
                      boxShadow: String(shadow),
                    }}
                  />
                </button>
              ))}
            </div>
          </Section>

          <Section title="Actions">
            {message ? (
              <div className="mb-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800">
                {message}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={publish}
                disabled={saving}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                Publish
              </button>
            </div>

            <button
              type="button"
              onClick={revertToPublished}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
            >
              Load Published Design
            </button>
          </Section>
        </div>

        <div className="min-w-0">
          <div className="sticky top-24">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
                  Live preview
                </p>
                <h2 className="text-lg font-black text-slate-950">
                  Student profile
                </h2>
              </div>

              {selectedDesign?.status === "published" ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  Published
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                  Draft
                </span>
              )}
            </div>

            <Preview design={design} />
          </div>
        </div>
      </div>
    </main>
  );
}
