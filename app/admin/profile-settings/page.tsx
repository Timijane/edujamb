"use client";

import { useEffect, useMemo, useState } from "react";
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
  getPublishedProfileDesign,
  listProfileDesigns,
  publishProfileDesign,
  saveProfileDesign,
} from "@/lib/profile-design-service";

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [designs, setDesigns] = useState<ProfileDesignConfig[]>([]);
  const [design, setDesign] =
    useState<ProfileDesignConfig>(defaultProfileDesign);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Design");
  const [mobilePreview, setMobilePreview] = useState(false);

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

        await ensureDefaultProfileDesign();

        const loadedDesigns = await listProfileDesigns();

        if (loadedDesigns.length > 0) {
          setDesigns(sortDesigns(loadedDesigns));

          const published = loadedDesigns.find(
            (item) => item.status === "published"
          );

          setDesign(
            normalizeProfileDesign(
              published || loadedDesigns[0]
            )
          );
        } else {
          setDesign(defaultProfileDesign);
        }
      } catch (loadError) {
        console.error(loadError);
        setError(
          "Unable to load the Profile Design Studio."
        );
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  function updateDesign(
    updater: (
      current: ProfileDesignConfig
    ) => ProfileDesignConfig
  ) {
    setDesign((current) => updater(current));
    setMessage("");
    setError("");
  }

  function updateRoot<K extends keyof ProfileDesignConfig>(
    key: K,
    value: ProfileDesignConfig[K]
  ) {
    updateDesign((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLayout(
    key: keyof ProfileDesignConfig["layout"],
    value: string
  ) {
    updateDesign((current) => ({
      ...current,
      layout: {
        ...current.layout,
        [key]: value,
      } as ProfileDesignConfig["layout"],
    }));
  }

  function updateHero(
    key: keyof ProfileDesignConfig["hero"],
    value: string | number | boolean
  ) {
    updateDesign((current) => ({
      ...current,
      hero: {
        ...current.hero,
        [key]: value,
      } as ProfileDesignConfig["hero"],
    }));
  }

  function updateColors(
    key: keyof ProfileDesignConfig["colors"],
    value: string
  ) {
    updateDesign((current) => ({
      ...current,
      colors: {
        ...current.colors,
        [key]: value,
      },
    }));
  }

  function updateCards(
    key: keyof ProfileDesignConfig["cards"],
    value: string | number
  ) {
    updateDesign((current) => ({
      ...current,
      cards: {
        ...current.cards,
        [key]: value,
      } as ProfileDesignConfig["cards"],
    }));
  }

  function updateTypography(
    key: keyof ProfileDesignConfig["typography"],
    value: number
  ) {
    updateDesign((current) => ({
      ...current,
      typography: {
        ...current.typography,
        [key]: value,
      },
    }));
  }

  function updateSection(
    key: keyof ProfileDesignConfig["sections"],
    value: boolean
  ) {
    updateDesign((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [key]: value,
      },
    }));
  }

  function updateAsset(
    key: keyof ProfileDesignConfig["assets"],
    value: string
  ) {
    updateDesign((current) => ({
      ...current,
      assets: {
        ...current.assets,
        [key]: value,
      },
    }));
  }

  async function saveDraft() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const normalized = normalizeProfileDesign({
        ...design,
        status: "draft",
      });

      await saveProfileDesign(normalized);

      const refreshed = await listProfileDesigns();

      setDesigns(sortDesigns(refreshed));
      setDesign(
        refreshed.find(
          (item) => item.designId === normalized.designId
        ) || normalized
      );

      setMessage("Draft saved successfully.");
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save this design.");
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentDesign() {
    setPublishing(true);
    setMessage("");
    setError("");

    try {
      await saveProfileDesign({
        ...design,
        status: "draft",
      });

      await publishProfileDesign(design.designId);

      const refreshed = await listProfileDesigns();

      setDesigns(sortDesigns(refreshed));

      const published =
        refreshed.find(
          (item) => item.designId === design.designId
        ) ||
        refreshed.find(
          (item) => item.status === "published"
        );

      if (published) {
        setDesign(normalizeProfileDesign(published));
      }

      setMessage(
        "Design published. It is now the active student profile experience."
      );
    } catch (publishError) {
      console.error(publishError);
      setError("Unable to publish this design.");
    } finally {
      setPublishing(false);
    }
  }

  function createNewDesign() {
    const id =
      "design-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7);

    const next = normalizeProfileDesign({
      ...defaultProfileDesign,
      designId: id,
      name: "New Profile Design",
      status: "draft",
    });

    setDesign(next);
    setMessage("New draft created. Customize it and save when ready.");
    setError("");
  }

  function duplicateCurrentDesign() {
    const id =
      "design-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7);

    const next = normalizeProfileDesign({
      ...design,
      designId: id,
      name: `${design.name} Copy`,
      status: "draft",
    });

    setDesign(next);
    setMessage("Design duplicated as a new draft.");
    setError("");
  }

  async function resetToPublished() {
    try {
      const published = await getPublishedProfileDesign();

      setDesign(
        normalizeProfileDesign({
          ...published,
          designId: design.designId,
          name: design.name,
          status: "draft",
        })
      );

      setMessage(
        "Current draft reset to the active published design."
      );
      setError("");
    } catch (resetError) {
      console.error(resetError);
      setError("Unable to reset the draft.");
    }
  }

  function selectDesign(designId: string) {
    const selected = designs.find(
      (item) => item.designId === designId
    );

    if (!selected) {
      return;
    }

    setDesign(normalizeProfileDesign(selected));
    setMessage("");
    setError("");
  }

  const previewStyle = useMemo(
    () => ({
      background:
        design.hero.backgroundType === "solid"
          ? design.hero.backgroundColor
          : `linear-gradient(135deg, ${design.hero.backgroundColor}, ${design.hero.secondaryColor})`,
    }),
    [design]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-black">
            Loading Profile Design Studio...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
              >
                ←
              </button>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                  EduJAMB CMS
                </p>
                <h1 className="truncate text-lg font-black">
                  Profile Design Studio
                </h1>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <StatusPill status={design.status} />

            <button
              type="button"
              onClick={createNewDesign}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black transition hover:bg-white/10"
            >
              + New Design
            </button>

            <button
              type="button"
              onClick={saveDraft}
              disabled={saving || publishing}
              className="rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-2.5 text-sm font-black text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={publishCurrentDesign}
              disabled={publishing || saving}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {(message || error) && (
          <div
            className={`mb-5 rounded-2xl border px-5 py-4 text-sm font-bold ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="mb-5 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
                    Design Library
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Your designs
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={createNewDesign}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition hover:bg-violet-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-180px)] space-y-2 overflow-y-auto p-3">
              {designs.map((item) => (
                <button
                  key={item.designId}
                  type="button"
                  onClick={() => selectDesign(item.designId)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    design.designId === item.designId
                      ? "border-violet-300 bg-violet-50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-violet-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {item.name}
                      </p>

                      <p className="mt-1 truncate text-[10px] font-bold text-slate-400">
                        {item.designId}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        item.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <div className="flex overflow-x-auto border-b border-slate-100 px-2">
              {[
                "Design",
                "Hero",
                "Colors",
                "Cards",
                "Typography",
                "Sections",
                "Assets",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 py-4 text-xs font-black transition ${
                    activeTab === tab
                      ? "border-b-2 border-violet-600 text-violet-700"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-5 sm:p-7">
              {activeTab === "Design" && (
                <DesignTab
                  design={design}
                  updateRoot={updateRoot}
                  updateLayout={updateLayout}
                  duplicateCurrentDesign={duplicateCurrentDesign}
                  resetToPublished={resetToPublished}
                />
              )}

              {activeTab === "Hero" && (
                <HeroTab
                  design={design}
                  updateHero={updateHero}
                />
              )}

              {activeTab === "Colors" && (
                <ColorsTab
                  design={design}
                  updateColors={updateColors}
                />
              )}

              {activeTab === "Cards" && (
                <CardsTab
                  design={design}
                  updateCards={updateCards}
                />
              )}

              {activeTab === "Typography" && (
                <TypographyTab
                  design={design}
                  updateTypography={updateTypography}
                />
              )}

              {activeTab === "Sections" && (
                <SectionsTab
                  design={design}
                  updateSection={updateSection}
                />
              )}

              {activeTab === "Assets" && (
                <AssetsTab
                  design={design}
                  updateAsset={updateAsset}
                />
              )}
            </div>
          </section>

          <section className="min-w-0">
            <div className="sticky top-[96px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                    Live Canvas
                  </p>
                  <p className="mt-1 text-sm font-black">
                    Student profile preview
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobilePreview(!mobilePreview)
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600"
                >
                  {mobilePreview ? "Desktop" : "Mobile"}
                </button>
              </div>

              <div className="overflow-auto bg-slate-100 p-4">
                <div
                  className={`mx-auto overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-all ${
                    mobilePreview
                      ? "max-w-[360px]"
                      : "max-w-[760px]"
                  }`}
                >
                  <DesignPreview design={design} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || publishing}
            className="flex-1 rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={publishCurrentDesign}
            disabled={publishing || saving}
            className="flex-1 rounded-2xl bg-violet-600 px-4 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </main>
  );
}

function sortDesigns(
  items: ProfileDesignConfig[]
) {
  return [...items].sort((a, b) => {
    if (a.status === "published" && b.status !== "published") {
      return -1;
    }

    if (a.status !== "published" && b.status === "published") {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function StatusPill({
  status,
}: {
  status: ProfileDesignConfig["status"];
}) {
  return (
    <span
      className={`rounded-full px-3 py-2 text-[10px] font-black uppercase ${
        status === "published"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-amber-500/15 text-amber-300"
      }`}
    >
      {status}
    </span>
  );
}

function DesignTab({
  design,
  updateRoot,
  updateLayout,
  duplicateCurrentDesign,
  resetToPublished,
}: {
  design: ProfileDesignConfig;
  updateRoot: <K extends keyof ProfileDesignConfig>(
    key: K,
    value: ProfileDesignConfig[K]
  ) => void;
  updateLayout: (
    key: keyof ProfileDesignConfig["layout"],
    value: string
  ) => void;
  duplicateCurrentDesign: () => void;
  resetToPublished: () => void;
}) {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="01"
        title="Design identity"
        description="Give this profile experience a recognizable name."
      />

      <TextInput
        label="Design name"
        value={design.name}
        onChange={(value) => updateRoot("name", value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          label="Hero layout"
          value={design.layout.hero}
          options={[
            ["banner", "Wide Banner"],
            ["split", "Split Layout"],
            ["centered", "Centered"],
            ["minimal", "Minimal"],
          ]}
          onChange={(value) =>
            updateLayout("hero", value)
          }
        />

        <SelectInput
          label="Content layout"
          value={design.layout.content}
          options={[
            ["single", "Single Column"],
            ["two-column", "Two Column"],
          ]}
          onChange={(value) =>
            updateLayout("content", value)
          }
        />

        <SelectInput
          label="Mobile behavior"
          value={design.layout.mobile}
          options={[
            ["stacked", "Stacked"],
            ["compact", "Compact"],
          ]}
          onChange={(value) =>
            updateLayout("mobile", value)
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionButton
          label="Duplicate design"
          onClick={duplicateCurrentDesign}
        />

        <ActionButton
          label="Reset from published"
          onClick={resetToPublished}
        />
      </div>

      <InfoBox>
        Draft changes are isolated from the live student experience
        until you publish this design.
      </InfoBox>
    </div>
  );
}

function HeroTab({
  design,
  updateHero,
}: {
  design: ProfileDesignConfig;
  updateHero: (
    key: keyof ProfileDesignConfig["hero"],
    value: string | number | boolean
  ) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="02"
        title="Hero experience"
        description="Control the first visual students see when they enter their profile."
      />

      <Toggle
        label="Show hero"
        checked={design.hero.visible}
        onChange={(value) =>
          updateHero("visible", value)
        }
      />

      <div className="grid gap-5">
        <TextInput
          label="Eyebrow"
          value={design.hero.eyebrow}
          onChange={(value) =>
            updateHero("eyebrow", value)
          }
        />

        <TextInput
          label="Hero title"
          value={design.hero.title}
          onChange={(value) =>
            updateHero("title", value)
          }
        />

        <TextArea
          label="Hero subtitle"
          value={design.hero.subtitle}
          onChange={(value) =>
            updateHero("subtitle", value)
          }
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          label="Background type"
          value={design.hero.backgroundType}
          options={[
            ["gradient", "Gradient"],
            ["image", "Image"],
            ["mixed", "Mixed"],
            ["solid", "Solid"],
          ]}
          onChange={(value) =>
            updateHero("backgroundType", value)
          }
        />

        <TextInput
          label="Background position"
          value={design.hero.backgroundPosition}
          onChange={(value) =>
            updateHero("backgroundPosition", value)
          }
        />

        <ColorInput
          label="Background color"
          value={design.hero.backgroundColor}
          onChange={(value) =>
            updateHero("backgroundColor", value)
          }
        />

        <ColorInput
          label="Secondary color"
          value={design.hero.secondaryColor}
          onChange={(value) =>
            updateHero("secondaryColor", value)
          }
        />

        <ColorInput
          label="Accent color"
          value={design.hero.accentColor}
          onChange={(value) =>
            updateHero("accentColor", value)
          }
        />

        <TextInput
          label="Background image URL"
          value={design.hero.backgroundImage}
          placeholder="https://..."
          onChange={(value) =>
            updateHero("backgroundImage", value)
          }
        />
      </div>

      <RangeInput
        label="Overlay opacity"
        value={design.hero.overlayOpacity}
        min={0}
        max={0.9}
        step={0.01}
        onChange={(value) =>
          updateHero("overlayOpacity", value)
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          label="Decorations"
          checked={design.hero.decorations}
          onChange={(value) =>
            updateHero("decorations", value)
          }
        />

        <Toggle
          label="Pattern"
          checked={design.hero.pattern}
          onChange={(value) =>
            updateHero("pattern", value)
          }
        />

        <Toggle
          label="Progress indicator"
          checked={design.hero.showProgress}
          onChange={(value) =>
            updateHero("showProgress", value)
          }
        />
      </div>
    </div>
  );
}

function ColorsTab({
  design,
  updateColors,
}: {
  design: ProfileDesignConfig;
  updateColors: (
    key: keyof ProfileDesignConfig["colors"],
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="03"
        title="Visual identity"
        description="Define the complete color language of the profile experience."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <ColorInput
          label="Page background"
          value={design.colors.pageBackground}
          onChange={(value) =>
            updateColors("pageBackground", value)
          }
        />

        <ColorInput
          label="Primary"
          value={design.colors.primary}
          onChange={(value) =>
            updateColors("primary", value)
          }
        />

        <ColorInput
          label="Primary hover"
          value={design.colors.primaryHover}
          onChange={(value) =>
            updateColors("primaryHover", value)
          }
        />

        <ColorInput
          label="Text"
          value={design.colors.text}
          onChange={(value) =>
            updateColors("text", value)
          }
        />

        <ColorInput
          label="Muted text"
          value={design.colors.mutedText}
          onChange={(value) =>
            updateColors("mutedText", value)
          }
        />

        <ColorInput
          label="Card background"
          value={design.colors.cardBackground}
          onChange={(value) =>
            updateColors("cardBackground", value)
          }
        />
      </div>
    </div>
  );
}

function CardsTab({
  design,
  updateCards,
}: {
  design: ProfileDesignConfig;
  updateCards: (
    key: keyof ProfileDesignConfig["cards"],
    value: string | number
  ) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="04"
        title="Card system"
        description="Control the surfaces used throughout the profile."
      />

      <RangeInput
        label="Opacity"
        value={design.cards.opacity}
        min={0.5}
        max={1}
        step={0.01}
        onChange={(value) =>
          updateCards("opacity", value)
        }
      />

      <RangeInput
        label="Backdrop blur"
        value={design.cards.blur}
        min={0}
        max={50}
        step={1}
        suffix="px"
        onChange={(value) =>
          updateCards("blur", value)
        }
      />

      <RangeInput
        label="Corner radius"
        value={design.cards.radius}
        min={0}
        max={60}
        step={1}
        suffix="px"
        onChange={(value) =>
          updateCards("radius", value)
        }
      />

      <RangeInput
        label="Border width"
        value={design.cards.borderWidth}
        min={0}
        max={5}
        step={1}
        suffix="px"
        onChange={(value) =>
          updateCards("borderWidth", value)
        }
      />

      <TextInput
        label="Border color"
        value={design.cards.borderColor}
        onChange={(value) =>
          updateCards("borderColor", value)
        }
      />

      <TextInput
        label="Shadow"
        value={design.cards.shadow}
        onChange={(value) =>
          updateCards("shadow", value)
        }
      />
    </div>
  );
}

function TypographyTab({
  design,
  updateTypography,
}: {
  design: ProfileDesignConfig;
  updateTypography: (
    key: keyof ProfileDesignConfig["typography"],
    value: number
  ) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="05"
        title="Typography"
        description="Tune hierarchy and visual weight without touching application logic."
      />

      <RangeInput
        label="Heading weight"
        value={design.typography.headingWeight}
        min={400}
        max={900}
        step={100}
        onChange={(value) =>
          updateTypography("headingWeight", value)
        }
      />

      <RangeInput
        label="Body weight"
        value={design.typography.bodyWeight}
        min={300}
        max={800}
        step={100}
        onChange={(value) =>
          updateTypography("bodyWeight", value)
        }
      />

      <RangeInput
        label="Heading scale"
        value={design.typography.headingScale}
        min={0.7}
        max={1.5}
        step={0.05}
        suffix="×"
        onChange={(value) =>
          updateTypography("headingScale", value)
        }
      />

      <RangeInput
        label="Body scale"
        value={design.typography.bodyScale}
        min={0.8}
        max={1.3}
        step={0.05}
        suffix="×"
        onChange={(value) =>
          updateTypography("bodyScale", value)
        }
      />
    </div>
  );
}

function SectionsTab({
  design,
  updateSection,
}: {
  design: ProfileDesignConfig;
  updateSection: (
    key: keyof ProfileDesignConfig["sections"],
    value: boolean
  ) => void;
}) {
  const sections: [
    keyof ProfileDesignConfig["sections"],
    string,
    string
  ][] = [
    [
      "identity",
      "Public identity",
      "Username, name and WhatsApp information.",
    ],
    [
      "personalInformation",
      "Personal information",
      "Gender, date of birth and birthday visibility.",
    ],
    [
      "education",
      "Education",
      "State, school and education level.",
    ],
    [
      "jambPreparation",
      "JAMB preparation",
      "Course, institution, score and subjects.",
    ],
    [
      "completionChecklist",
      "Completion checklist",
      "The desktop profile progress sidebar.",
    ],
  ];

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="06"
        title="Section control"
        description="Turn functional profile sections on or off from the design layer."
      />

      <div className="space-y-3">
        {sections.map(([key, label, description]) => (
          <Toggle
            key={key}
            label={label}
            description={description}
            checked={design.sections[key]}
            onChange={(value) =>
              updateSection(key, value)
            }
          />
        ))}
      </div>

      <InfoBox>
        Hiding a section affects presentation. It does not delete
        the student's stored information.
      </InfoBox>
    </div>
  );
}

function AssetsTab({
  design,
  updateAsset,
}: {
  design: ProfileDesignConfig;
  updateAsset: (
    key: keyof ProfileDesignConfig["assets"],
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="07"
        title="Visual assets"
        description="Prepare the design system for uploaded or externally hosted visual assets."
      />

      <TextInput
        label="Logo URL"
        value={design.assets.logo}
        placeholder="https://..."
        onChange={(value) =>
          updateAsset("logo", value)
        }
      />

      <TextInput
        label="Hero image URL"
        value={design.assets.heroImage}
        placeholder="https://..."
        onChange={(value) =>
          updateAsset("heroImage", value)
        }
      />

      <TextInput
        label="Page background image URL"
        value={design.assets.backgroundImage}
        placeholder="https://..."
        onChange={(value) =>
          updateAsset("backgroundImage", value)
        }
      />

      <InfoBox>
        Media Manager integration can be connected to these asset
        fields later without changing the design architecture.
      </InfoBox>
    </div>
  );
}

function DesignPreview({
  design,
}: {
  design: ProfileDesignConfig;
}) {
  const heroBackground =
    design.hero.backgroundType === "image" &&
    design.hero.backgroundImage
      ? `linear-gradient(rgba(20,10,40,${design.hero.overlayOpacity}), rgba(10,5,25,${design.hero.overlayOpacity})), url("${design.hero.backgroundImage}")`
      : design.hero.backgroundType === "solid"
        ? design.hero.backgroundColor
        : `radial-gradient(circle at 10% 20%, ${design.hero.accentColor}66, transparent 32%), linear-gradient(135deg, ${design.hero.backgroundColor}, ${design.hero.secondaryColor})`;

  const cardStyle = {
    background: design.colors.cardBackground,
    opacity: design.cards.opacity,
    borderRadius: design.cards.radius,
    border: `${design.cards.borderWidth}px solid ${design.cards.borderColor}`,
    boxShadow: design.cards.shadow,
    backdropFilter: `blur(${design.cards.blur}px)`,
  };

  return (
    <div
      className="min-h-[650px]"
      style={{
        background: design.colors.pageBackground,
        color: design.colors.text,
      }}
    >
      {design.hero.visible && (
        <section
          className="relative overflow-hidden p-7 text-white"
          style={{
            backgroundImage: heroBackground,
            backgroundPosition:
              design.hero.backgroundPosition,
            backgroundSize: "cover",
          }}
        >
          {design.hero.decorations && (
            <>
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />
            </>
          )}

          {design.hero.pattern && (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(-45deg, rgba(255,255,255,.35) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
          )}

          <div
            className={`relative ${
              design.layout.hero === "centered"
                ? "mx-auto max-w-xl text-center"
                : ""
            }`}
          >
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]">
              {design.hero.eyebrow}
            </span>

            <h2
              className="mt-4 text-3xl font-black leading-tight"
              style={{
                fontWeight:
                  design.typography.headingWeight,
                transform: `scale(${design.typography.headingScale})`,
                transformOrigin:
                  design.layout.hero === "centered"
                    ? "center"
                    : "left",
              }}
            >
              {design.hero.title}
            </h2>

            <p
              className="mt-3 max-w-xl text-xs leading-6 text-white/75"
              style={{
                fontWeight: design.typography.bodyWeight,
              }}
            >
              {design.hero.subtitle}
            </p>

            {design.hero.showProgress && (
              <div className="mt-6 max-w-sm rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between text-[10px] font-black">
                  <span>Profile completion</span>
                  <span>72%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                  <div className="h-full w-[72%] rounded-full bg-white" />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div
        className={`grid gap-4 p-5 ${
          design.layout.content === "two-column"
            ? "sm:grid-cols-2"
            : ""
        }`}
      >
        {design.sections.identity && (
          <PreviewSurface
            style={cardStyle}
            title="Public identity"
            primary={design.colors.primary}
          />
        )}

        {design.sections.personalInformation && (
          <PreviewSurface
            style={cardStyle}
            title="Personal information"
            primary={design.colors.primary}
          />
        )}

        {design.sections.education && (
          <PreviewSurface
            style={cardStyle}
            title="Education"
            primary={design.colors.primary}
          />
        )}

        {design.sections.jambPreparation && (
          <PreviewSurface
            style={cardStyle}
            title="JAMB preparation"
            primary={design.colors.primary}
          />
        )}
      </div>
    </div>
  );
}

function PreviewSurface({
  style,
  title,
  primary,
}: {
  style: React.CSSProperties;
  title: string;
  primary: string;
}) {
  return (
    <div style={style} className="p-5">
      <div
        className="mb-4 h-2 w-16 rounded-full"
        style={{ background: primary }}
      />

      <p className="text-sm font-black">{title}</p>

      <div className="mt-4 space-y-2">
        <div className="h-3 rounded-full bg-slate-100" />
        <div className="h-3 w-3/4 rounded-full bg-slate-100" />
        <div className="h-9 rounded-xl bg-slate-50" />
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        {title}
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </span>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
        rows={4}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function ColorInput({
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

      <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2">
        <input
          type="color"
          value={
            /^#[0-9A-Fa-f]{6}$/.test(value)
              ? value
              : "#7c3aed"
          }
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
        />

        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-slate-900 outline-none"
        />
      </div>
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
          <option
            key={optionValue}
            value={optionValue}
          >
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
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-violet-200 hover:shadow-sm"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-800">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        )}
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

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
    >
      {label}
    </button>
  );
}

function InfoBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs font-bold leading-5 text-violet-800">
      {children}
    </div>
  );
}
