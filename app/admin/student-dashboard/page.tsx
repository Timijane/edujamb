"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import {
  defaultStudentDashboardConfig,
  type DashboardNavGroup,
  type StudentDashboardConfig,
} from "@/lib/student-dashboard-config";

import {
  ensureStudentDashboardConfig,
  publishStudentDashboardConfig,
  saveStudentDashboardConfig,
} from "@/lib/student-dashboard-config-service";

import HeroDesigner from "@/components/admin/HeroDesigner";

export default function StudentDashboardAdminPage() {
  const router = useRouter();

  const [config, setConfig] =
    useState<StudentDashboardConfig>(
      defaultStudentDashboardConfig
    );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/staff/login?error=portal");
          return;
        }

        try {
          const adminSnapshot = await getDoc(
            doc(db, "adminUsers", user.uid)
          );

          if (!adminSnapshot.exists()) {
            router.replace("/staff/login?error=portal");
            return;
          }

          const admin = adminSnapshot.data();

          if (
            admin.active !== true ||
            admin.role !== "super_admin"
          ) {
            router.replace("/staff/login?error=portal");
            return;
          }

          const dashboardConfig =
            await ensureStudentDashboardConfig();

          if (mounted) {
            setConfig(dashboardConfig);
            setLoading(false);
          }
        } catch (error) {
          console.error(error);

          if (mounted) {
            setMessage(
              "Unable to load student dashboard configuration."
            );
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const saved =
        await saveStudentDashboardConfig(config);

      setConfig(saved);
      setMessage("Draft saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to save the draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    try {
      setSaving(true);
      setMessage("");

      const published =
        await publishStudentDashboardConfig(config);

      setConfig(published);
      setMessage(
        "Student dashboard configuration published."
      );
    } catch (error) {
      console.error(error);
      setMessage("Failed to publish configuration.");
    } finally {
      setSaving(false);
    }
  }

  function updateNavigation(
    updates: Partial<StudentDashboardConfig["navigation"]>
  ) {
    setConfig((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        ...updates,
      },
    }));
  }

  function updateGroup(
    groupId: DashboardNavGroup,
    updates: Partial<
      StudentDashboardConfig["navigation"]["groups"][number]
    >
  ) {
    setConfig((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        groups: current.navigation.groups.map((group) =>
          group.id === groupId
            ? { ...group, ...updates }
            : group
        ),
      },
    }));
  }

  function updateItem(
    itemId: string,
    updates: Partial<
      StudentDashboardConfig["navigation"]["items"][number]
    >
  ) {
    setConfig((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        items: current.navigation.items.map((item) =>
          item.id === itemId
            ? { ...item, ...updates }
            : item
        ),
      },
    }));
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    setConfig((current) => {
      const items = [...current.navigation.items];
      const index = items.findIndex(
        (item) => item.id === itemId
      );

      if (index === -1) return current;

      const targetIndex = index + direction;

      if (
        targetIndex < 0 ||
        targetIndex >= items.length
      ) {
        return current;
      }

      const currentItem = items[index];
      const targetItem = items[targetIndex];

      if (currentItem.group !== targetItem.group) {
        return current;
      }

      [items[index], items[targetIndex]] = [
        items[targetIndex],
        items[index],
      ];

      return {
        ...current,
        navigation: {
          ...current.navigation,
          items: items.map((item, itemIndex) => ({
            ...item,
            order: itemIndex + 1,
          })),
        },
      };
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="font-bold">
          Loading Student Dashboard Control Center...
        </p>
      </main>
    );
  }

  const groups = [...config.navigation.groups].sort(
    (a, b) => a.order - b.order
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <header className="border-b border-white/10 pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-400">
                Super Admin
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Student Dashboard Control Center
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Configure exactly how the student application
                is structured and presented.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-black hover:bg-violet-500 disabled:opacity-50"
              >
                Publish
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200">
              {message}
            </div>
          )}
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-400">
                Navigation
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Student Navigation
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Decide which navigation structure students see,
                what each item is called and which items are visible.
              </p>
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-slate-300">
              {config.navigation.items.length} items
            </span>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <ToggleCard
              label="Navigation Enabled"
              checked={config.navigation.enabled}
              onChange={(checked) =>
                updateNavigation({ enabled: checked })
              }
            />

            <ToggleCard
              label="Show Icons"
              checked={config.navigation.showIcons}
              onChange={(checked) =>
                updateNavigation({ showIcons: checked })
              }
            />

            <ToggleCard
              label="Show Labels"
              checked={config.navigation.showLabels}
              onChange={(checked) =>
                updateNavigation({ showLabels: checked })
              }
            />

            <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Navigation Style
              </span>

              <select
                value={config.navigation.style}
                onChange={(event) =>
                  updateNavigation({
                    style: event.target
                      .value as StudentDashboardConfig["navigation"]["style"],
                  })
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
              >
                <option value="sidebar">Sidebar</option>
                <option value="topbar">Top Bar</option>
                <option value="bottom">Bottom Navigation</option>
              </select>
            </label>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-black">
              Navigation Groups
            </h3>

            <div className="mt-4 grid gap-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 md:grid-cols-[1fr_180px_130px]"
                >
                  <input
                    value={group.label}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        label: event.target.value,
                      })
                    }
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
                  />

                  <input
                    type="number"
                    min={1}
                    value={group.order}
                    onChange={(event) =>
                      updateGroup(group.id, {
                        order: Number(event.target.value),
                      })
                    }
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
                  />

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={group.visible}
                      onChange={(event) =>
                        updateGroup(group.id, {
                          visible: event.target.checked,
                        })
                      }
                    />

                    <span className="text-sm font-bold">
                      Visible
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HeroDesigner
          value={config.hero}
          onChange={(hero) =>
            setConfig((current) => ({
              ...current,
              hero,
            }))
          }
        />

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">
              Navigation Items
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Individual Items
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Rename, hide and reorder individual student
              navigation entries.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {groups.map((group) => {
              const groupItems = config.navigation.items
                .filter((item) => item.group === group.id)
                .sort((a, b) => a.order - b.order);

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-black">
                      {group.label}
                    </h3>

                    <span className="text-xs font-bold text-slate-500">
                      {groupItems.length} items
                    </span>
                  </div>

                  <div className="space-y-3">
                    {groupItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 lg:grid-cols-[1fr_100px_90px_100px]"
                      >
                        <div>
                          <input
                            value={item.label}
                            onChange={(event) =>
                              updateItem(item.id, {
                                label: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none"
                          />

                          <p className="mt-2 text-xs text-slate-600">
                            {item.route}
                          </p>
                        </div>

                        <input
                          value={item.icon}
                          onChange={(event) =>
                            updateItem(item.id, {
                              icon: event.target.value,
                            })
                          }
                          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none"
                          placeholder="Icon"
                        />

                        <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3">
                          <input
                            type="checkbox"
                            checked={item.visible}
                            onChange={(event) =>
                              updateItem(item.id, {
                                visible: event.target.checked,
                              })
                            }
                          />

                          <span className="text-xs font-bold">
                            Visible
                          </span>
                        </label>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() =>
                              moveItem(item.id, -1)
                            }
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black disabled:opacity-30"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            disabled={
                              index ===
                              groupItems.length - 1
                            }
                            onClick={() =>
                              moveItem(item.id, 1)
                            }
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">
              Appearance
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Student Dashboard Appearance
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Control the visual language of the student application,
              including colours, cards, gradients, spacing and typography.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <ColorField
              label="Page Background"
              value={config.appearance.pageBackground}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    pageBackground: value,
                  },
                }))
              }
            />

            <ColorField
              label="Primary Color"
              value={config.appearance.primaryColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    primaryColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Primary Hover"
              value={config.appearance.primaryHoverColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    primaryHoverColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Secondary Color"
              value={config.appearance.secondaryColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    secondaryColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Accent Color"
              value={config.appearance.accentColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    accentColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Text Color"
              value={config.appearance.textColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    textColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Muted Text"
              value={config.appearance.mutedTextColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    mutedTextColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Card Background"
              value={config.appearance.cardBackground}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    cardBackground: value,
                  },
                }))
              }
            />

            <ColorField
              label="Card Border"
              value={config.appearance.cardBorderColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    cardBorderColor: value,
                  },
                }))
              }
            />

            <ColorField
              label="Header Background"
              value={config.appearance.headerBackground}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    headerBackground: value,
                  },
                }))
              }
            />

            <ColorField
              label="Header Border"
              value={config.appearance.headerBorderColor}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    headerBorderColor: value,
                  },
                }))
              }
            />
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Card Radius"
              value={config.appearance.cardRadius}
              min={0}
              max={60}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    cardRadius: value,
                  },
                }))
              }
            />

            <NumberField
              label="Card Border Width"
              value={config.appearance.cardBorderWidth}
              min={0}
              max={10}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    cardBorderWidth: value,
                  },
                }))
              }
            />

            <NumberField
              label="Card Opacity"
              value={config.appearance.cardOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    cardOpacity: value,
                  },
                }))
              }
            />

            <NumberField
              label="Card Blur"
              value={config.appearance.cardBlur}
              min={0}
              max={40}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    cardBlur: value,
                  },
                }))
              }
            />
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Card Shadow
              </span>

              <input
                value={config.appearance.cardShadow}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      cardShadow: event.target.value,
                    },
                  }))
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
              />
            </label>

            <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Gradient Direction
              </span>

              <input
                value={config.appearance.gradientDirection}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      gradientDirection: event.target.value,
                    },
                  }))
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
                placeholder="135deg"
              />
            </label>
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-black">
                  Gradient Background
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Control the main dashboard gradient independently from
                  the normal page background.
                </p>
              </div>

              <ToggleCard
                label="Enable Gradient"
                checked={config.appearance.gradientEnabled}
                onChange={(checked) =>
                  setConfig((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      gradientEnabled: checked,
                    },
                  }))
                }
              />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <ColorField
                label="Gradient Start"
                value={config.appearance.gradientStart}
                onChange={(value) =>
                  setConfig((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      gradientStart: value,
                    },
                  }))
                }
              />

              <ColorField
                label="Gradient End"
                value={config.appearance.gradientEnd}
                onChange={(value) =>
                  setConfig((current) => ({
                    ...current,
                    appearance: {
                      ...current.appearance,
                      gradientEnd: value,
                    },
                  }))
                }
              />
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <NumberField
              label="Heading Weight"
              value={config.appearance.headingWeight}
              min={100}
              max={900}
              step={100}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    headingWeight: value,
                  },
                }))
              }
            />

            <NumberField
              label="Body Weight"
              value={config.appearance.bodyWeight}
              min={100}
              max={900}
              step={100}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  appearance: {
                    ...current.appearance,
                    bodyWeight: value,
                  },
                }))
              }
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">
              Dashboard Layout
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Layout & Structure
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Control the width, grid structure and spacing of the
              student dashboard.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Content Width"
              value={config.layout.contentWidth}
              options={[
                ["compact", "Compact"],
                ["standard", "Standard"],
                ["wide", "Wide"],
                ["full", "Full Width"],
              ]}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    contentWidth:
                      value as StudentDashboardConfig["layout"]["contentWidth"],
                  },
                }))
              }
            />

            <SelectField
              label="Desktop Columns"
              value={String(config.layout.dashboardColumns)}
              options={[
                ["1", "1 Column"],
                ["2", "2 Columns"],
                ["3", "3 Columns"],
                ["4", "4 Columns"],
              ]}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    dashboardColumns:
                      Number(value) as 1 | 2 | 3 | 4,
                  },
                }))
              }
            />

            <SelectField
              label="Mobile Columns"
              value={String(config.layout.mobileColumns)}
              options={[
                ["1", "1 Column"],
                ["2", "2 Columns"],
              ]}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    mobileColumns:
                      Number(value) as 1 | 2,
                  },
                }))
              }
            />

            <SelectField
              label="Section Spacing"
              value={config.layout.sectionSpacing}
              options={[
                ["compact", "Compact"],
                ["standard", "Standard"],
                ["relaxed", "Relaxed"],
              ]}
              onChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  layout: {
                    ...current.layout,
                    sectionSpacing:
                      value as StudentDashboardConfig["layout"]["sectionSpacing"],
                  },
                }))
              }
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-400">
                Dashboard Widgets
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Widget Control
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Control which dashboard blocks students see,
                their size and their position.
              </p>
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-slate-300">
              {config.widgets.filter((widget) => widget.visible).length} visible
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {[...config.widgets]
              .sort((a, b) => a.order - b.order)
              .map((widget, index, widgets) => (
                <div
                  key={widget.id}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 lg:grid-cols-[1fr_140px_120px_120px]"
                >
                  <div>
                    <p className="font-black capitalize">
                      {widget.id.replace(/-/g, " ")}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Variant: {widget.variant}
                    </p>
                  </div>

                  <label className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Size
                    </span>

                    <select
                      value={widget.size}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          widgets: current.widgets.map(
                            (item) =>
                              item.id === widget.id
                                ? {
                                    ...item,
                                    size: event.target
                                      .value as typeof item.size,
                                  }
                                : item
                          ),
                        }))
                      }
                      className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="full">Full</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={widget.visible}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          widgets: current.widgets.map(
                            (item) =>
                              item.id === widget.id
                                ? {
                                    ...item,
                                    visible:
                                      event.target.checked,
                                  }
                                : item
                          ),
                        }))
                      }
                    />

                    <span className="text-xs font-bold">
                      Visible
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        setConfig((current) => {
                          const items = [
                            ...current.widgets,
                          ].sort(
                            (a, b) => a.order - b.order
                          );

                          const targetIndex = index - 1;

                          [
                            items[index],
                            items[targetIndex],
                          ] = [
                            items[targetIndex],
                            items[index],
                          ];

                          return {
                            ...current,
                            widgets: items.map(
                              (item, itemIndex) => ({
                                ...item,
                                order: itemIndex + 1,
                              })
                            ),
                          };
                        })
                      }
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black disabled:opacity-30"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      disabled={
                        index === widgets.length - 1
                      }
                      onClick={() =>
                        setConfig((current) => {
                          const items = [
                            ...current.widgets,
                          ].sort(
                            (a, b) => a.order - b.order
                          );

                          const targetIndex = index + 1;

                          [
                            items[index],
                            items[targetIndex],
                          ] = [
                            items[targetIndex],
                            items[index],
                          ];

                          return {
                            ...current,
                            widgets: items.map(
                              (item, itemIndex) => ({
                                ...item,
                                order: itemIndex + 1,
                              })
                            ),
                          };
                        })
                      }
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">
              Features & Platform Rules
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Student Feature Control
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Enable or disable student-facing modules and define
              which actions students are allowed to request or perform.
            </p>
          </div>

          <div className="mt-7">
            <h3 className="text-lg font-black">
              Platform Features
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                Object.entries(config.features) as [
                  keyof StudentDashboardConfig["features"],
                  boolean
                ][]
              ).map(([key, enabled]) => (
                <ToggleCard
                  key={key}
                  label={formatLabel(key)}
                  checked={enabled}
                  onChange={(checked) =>
                    setConfig((current) => ({
                      ...current,
                      features: {
                        ...current.features,
                        [key]: checked,
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-black">
              Platform Rules
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                Object.entries(config.rules) as [
                  keyof StudentDashboardConfig["rules"],
                  boolean
                ][]
              ).map(([key, enabled]) => (
                <ToggleCard
                  key={key}
                  label={formatLabel(key)}
                  checked={enabled}
                  onChange={(checked) =>
                    setConfig((current) => ({
                      ...current,
                      rules: {
                        ...current.rules,
                        [key]: checked,
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function SelectField({
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
    <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
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
    <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <div className="mt-3 flex gap-2">
        <input
          type="color"
          value={
            /^#[0-9a-fA-F]{6}$/.test(value)
              ? value
              : "#7c3aed"
          }
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
        />

        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
        />
      </div>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none"
      />
    </label>
  );
}

function ToggleCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4">
      <span className="text-sm font-bold">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5"
      />
    </label>
  );
}
