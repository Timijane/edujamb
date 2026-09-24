"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Section = {
  id: string;
  title: string;
  description?: string;
  content: string;
  order: number;
  page?: number | null;
  chapter?: string;
};

type Resource = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  resourceType: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  description: string;
  coverImage: string;
  coverMediaId: string;
  author: string;
  source: string;
  introduction: string;
  allowDownload: boolean;
  readerSettings?: {
    fontSize?: number;
    comfortableWidth?: boolean;
  };
};

type ProgressState = {
  progress: number;
  lastSection: string;
  completed: boolean;
  bookmarked: boolean;
  bookmarkSection: string;
};

type ReaderMode = "light" | "dark" | "comfortable";

export default function StudentResourceReader({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const router = useRouter();

  const [resourceId, setResourceId] = useState("");
  const [resource, setResource] = useState<Resource | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [progress, setProgress] = useState<ProgressState>({
    progress: 0,
    lastSection: "",
    completed: false,
    bookmarked: false,
    bookmarkSection: "",
  });

  const [activeSection, setActiveSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fontSize, setFontSize] = useState(18);
  const [readerMode, setReaderMode] = useState<ReaderMode>("light");
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    params.then((value) => setResourceId(value.resourceId));
  }, [params]);

  useEffect(() => {
    const storedFont = window.localStorage.getItem(
      "jambmaster-reader-font-size",
    );

    const storedMode = window.localStorage.getItem(
      "jambmaster-reader-mode",
    );

    if (storedFont) {
      const value = Number(storedFont);
      if (Number.isFinite(value) && value >= 15 && value <= 24) {
        setFontSize(value);
      }
    }

    if (
      storedMode === "light" ||
      storedMode === "dark" ||
      storedMode === "comfortable"
    ) {
      setReaderMode(storedMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "jambmaster-reader-font-size",
      String(fontSize),
    );
  }, [fontSize]);

  useEffect(() => {
    window.localStorage.setItem(
      "jambmaster-reader-mode",
      readerMode,
    );
  }, [readerMode]);

  const getToken = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("You must be signed in.");
    }

    return user.getIdToken();
  }, []);

  const loadReader = useCallback(async () => {
    if (!resourceId) return;

    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch(
        `/api/academic/resources/${resourceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load this textbook.",
        );
      }

      setResource(data.resource || null);

      const loadedSections = Array.isArray(data.sections)
        ? [...data.sections].sort(
            (a: Section, b: Section) =>
              Number(a.order || 0) - Number(b.order || 0),
          )
        : [];

      setSections(loadedSections);

      const loadedProgress = data.progress || {};

      setProgress({
        progress:
          typeof loadedProgress.progress === "number"
            ? loadedProgress.progress
            : 0,
        lastSection:
          typeof loadedProgress.lastSection === "string"
            ? loadedProgress.lastSection
            : "",
        completed: loadedProgress.completed === true,
        bookmarked: loadedProgress.bookmarked === true,
        bookmarkSection:
          typeof loadedProgress.bookmarkSection === "string"
            ? loadedProgress.bookmarkSection
            : "",
      });

      if (loadedProgress.lastSection && loadedSections.length) {
        const savedIndex = loadedSections.findIndex(
          (section: Section) =>
            section.id === loadedProgress.lastSection,
        );

        if (savedIndex >= 0) {
          setActiveSection(savedIndex);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load textbook.",
      );
    } finally {
      setLoading(false);
    }
  }, [resourceId, getToken]);

  useEffect(() => {
    if (!resourceId) return;

    const unsubscribe = onAuthStateChanged(auth, () => {
      if (auth.currentUser) {
        loadReader();
      }
    });

    return unsubscribe;
  }, [resourceId, loadReader]);

  const saveProgress = useCallback(
    async (
      sectionIndex: number,
      completed = false,
      bookmarkOverride?: {
        bookmarked: boolean;
        bookmarkSection: string;
      },
    ) => {
      if (!sections.length || !resourceId) return;

      const safeIndex = Math.max(
        0,
        Math.min(sectionIndex, sections.length - 1),
      );

      const calculatedProgress = completed
        ? 100
        : Math.round(
            ((safeIndex + 1) / sections.length) * 100,
          );

      const lastSection = sections[safeIndex]?.id || "";

      setProgress((current) => ({
        ...current,
        progress: calculatedProgress,
        lastSection,
        completed,
        bookmarked:
          bookmarkOverride?.bookmarked ??
          current.bookmarked,
        bookmarkSection:
          bookmarkOverride?.bookmarkSection ??
          current.bookmarkSection,
      }));

      try {
        const token = await getToken();

        const body: Record<string, unknown> = {
          progress: calculatedProgress,
          lastSection,
          completed,
        };

        if (bookmarkOverride) {
          body.bookmarked = bookmarkOverride.bookmarked;
          body.bookmarkSection =
            bookmarkOverride.bookmarkSection;
        }

        await fetch(
          `/api/academic/resources/${resourceId}/progress`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );
      } catch {
        // Reading should remain usable if a background save fails.
      }
    },
    [sections, resourceId, getToken],
  );

  async function toggleBookmark() {
    if (!sections.length) return;

    const section = sections[activeSection];

    const nextBookmarked =
      progress.bookmarkSection === section.id
        ? false
        : true;

    const nextBookmarkSection = nextBookmarked
      ? section.id
      : "";

    setSaving(true);

    await saveProgress(activeSection, progress.completed, {
      bookmarked: nextBookmarked,
      bookmarkSection: nextBookmarkSection,
    });

    setMessage(
      nextBookmarked
        ? "Bookmark saved."
        : "Bookmark removed.",
    );

    setTimeout(() => setMessage(""), 1800);

    setSaving(false);
  }

  function changeSection(index: number) {
    if (!sections.length) return;

    const safeIndex = Math.max(
      0,
      Math.min(index, sections.length - 1),
    );

    setActiveSection(safeIndex);
    setTocOpen(false);

    void saveProgress(safeIndex, false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function increaseFont() {
    setFontSize((current) =>
      Math.min(24, current + 1),
    );
  }

  function decreaseFont() {
    setFontSize((current) =>
      Math.max(15, current - 1),
    );
  }

  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return sections;

    return sections.filter((section) => {
      return (
        section.title.toLowerCase().includes(term) ||
        section.content.toLowerCase().includes(term) ||
        (section.description || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [sections, searchTerm]);

  const currentSection = sections[activeSection];

  const modeClasses =
    readerMode === "dark"
      ? "bg-slate-950 text-slate-100"
      : readerMode === "comfortable"
        ? "bg-[#f4efe5] text-[#332f2a]"
        : "bg-white text-slate-900";

  const articleWidth =
    readerMode === "comfortable"
      ? "max-w-3xl"
      : "max-w-4xl";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="h-8 w-40 rounded bg-slate-800" />
          <div className="h-40 rounded-3xl bg-slate-900" />
          <div className="h-[500px] rounded-3xl bg-slate-900" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
            !
          </div>
          <h1 className="mt-5 text-xl font-bold">
            Unable to open textbook
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error}
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/resources")
            }
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Back to Academic Library
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${modeClasses}`}>
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          readerMode === "dark"
            ? "border-slate-800 bg-slate-950/95"
            : "border-slate-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() =>
              router.push("/dashboard/resources")
            }
            className="rounded-xl px-3 py-2 text-sm font-semibold opacity-70 transition hover:opacity-100"
          >
            ←
            <span className="ml-1 hidden sm:inline">
              Library
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-widest opacity-50">
              {resource?.subjectName}
            </p>
            <h1 className="truncate text-sm font-bold sm:text-base">
              {resource?.title}
            </h1>
          </div>

          <div className="hidden min-w-[130px] sm:block">
            <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider opacity-50">
              <span>Progress</span>
              <span>{progress.progress}%</span>
            </div>
            <div
              className={`h-1.5 overflow-hidden rounded-full ${
                readerMode === "dark"
                  ? "bg-slate-800"
                  : "bg-slate-200"
              }`}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${progress.progress}%`,
                }}
              />
            </div>
          </div>

          <button
            onClick={toggleBookmark}
            disabled={saving || !currentSection}
            aria-label="Bookmark current section"
            className={`rounded-xl p-2.5 transition ${
              progress.bookmarkSection ===
              currentSection?.id
                ? "bg-amber-500/15 text-amber-500"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {progress.bookmarkSection ===
            currentSection?.id
              ? "★"
              : "☆"}
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-xl p-2.5 opacity-60 hover:opacity-100"
            aria-label="Search textbook"
          >
            ⌕
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-xl p-2.5 opacity-60 hover:opacity-100"
            aria-label="Reader settings"
          >
            ⚙
          </button>
        </div>

        <div className="px-4 pb-2 sm:hidden">
          <div
            className={`h-1.5 overflow-hidden rounded-full ${
              readerMode === "dark"
                ? "bg-slate-800"
                : "bg-slate-200"
            }`}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${progress.progress}%`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-72 shrink-0 border-r border-current/10 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto p-5">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] opacity-45">
              Contents
            </p>

            <nav className="space-y-1">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => changeSection(index)}
                  className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${
                    activeSection === index
                      ? "bg-emerald-500/10 font-bold text-emerald-500"
                      : "opacity-65 hover:bg-current/5 hover:opacity-100"
                  }`}
                >
                  <span className="mr-2 text-xs opacity-50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
            {resource && (
              <section className="mb-10 overflow-hidden rounded-3xl border border-current/10">
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="aspect-[4/5] bg-slate-200 md:aspect-auto">
                    {resource.coverImage ? (
                      <img
                        src={resource.coverImage}
                        alt={resource.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center bg-slate-900 p-8 text-center text-white">
                        <span className="text-lg font-black">
                          {resource.subjectName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center p-6 sm:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">
                      {resource.resourceType}
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                      {resource.title}
                    </h2>

                    {resource.description && (
                      <p className="mt-4 text-sm leading-7 opacity-65">
                        {resource.description}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2 text-xs">
                      {resource.author && (
                        <span className="rounded-full border border-current/10 px-3 py-1.5">
                          {resource.author}
                        </span>
                      )}

                      {resource.source && (
                        <span className="rounded-full border border-current/10 px-3 py-1.5">
                          {resource.source}
                        </span>
                      )}

                      <span className="rounded-full border border-current/10 px-3 py-1.5">
                        {sections.length} sections
                      </span>
                    </div>

                    {resource.introduction && (
                      <div className="mt-6 rounded-2xl bg-current/5 p-4">
                        <p className="text-xs font-black uppercase tracking-widest opacity-50">
                          Introduction
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-7 opacity-75">
                          {resource.introduction}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {currentSection ? (
              <article className={articleWidth}>
                <div className="mb-8">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">
                    Section {activeSection + 1} of{" "}
                    {sections.length}
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    {currentSection.title}
                  </h2>

                  {currentSection.description && (
                    <p className="mt-3 text-base leading-7 opacity-60">
                      {currentSection.description}
                    </p>
                  )}
                </div>

                <div
                  className="reader-content whitespace-pre-wrap break-words leading-[1.9]"
                  style={{
                    fontSize: `${fontSize}px`,
                  }}
                >
                  {currentSection.content}
                </div>

                <div className="mt-12 flex flex-col gap-3 border-t border-current/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() =>
                      changeSection(activeSection - 1)
                    }
                    disabled={activeSection === 0}
                    className="rounded-xl border border-current/10 px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ← Previous
                  </button>

                  {activeSection <
                  sections.length - 1 ? (
                    <button
                      onClick={() =>
                        changeSection(activeSection + 1)
                      }
                      className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
                    >
                      Next section →
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await saveProgress(
                          activeSection,
                          true,
                        );
                        setMessage(
                          "Textbook completed. Excellent work!",
                        );
                        setTimeout(
                          () => setMessage(""),
                          2500,
                        );
                      }}
                      className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
                    >
                      ✓ Mark textbook complete
                    </button>
                  )}
                </div>
              </article>
            ) : (
              <div className="rounded-3xl border border-dashed border-current/15 p-10 text-center">
                <h2 className="text-xl font-bold">
                  No published textbook content yet
                </h2>
                <p className="mt-2 text-sm opacity-60">
                  An administrator needs to publish textbook
                  sections before they can be read here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setTocOpen(true)}
        className="fixed bottom-5 left-5 z-40 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl lg:hidden"
      >
        ☰ Contents
      </button>

      {message && (
        <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-2xl">
          {message}
        </div>
      )}

      {tocOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 lg:hidden">
          <div
            className={`absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-3xl p-5 ${
              readerMode === "dark"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-950"
            }`}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-45">
                  Textbook
                </p>
                <h2 className="text-xl font-black">
                  Contents
                </h2>
              </div>

              <button
                onClick={() => setTocOpen(false)}
                className="rounded-xl border border-current/10 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => changeSection(index)}
                  className={`w-full rounded-xl p-4 text-left ${
                    activeSection === index
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-current/5"
                  }`}
                >
                  <span className="text-xs font-bold opacity-50">
                    Section {index + 1}
                  </span>
                  <div className="mt-1 font-bold">
                    {section.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60">
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-sm p-6 shadow-2xl ${
              readerMode === "dark"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-45">
                  Reader
                </p>
                <h2 className="text-xl font-black">
                  Reading settings
                </h2>
              </div>

              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-xl border border-current/10 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <div className="mt-8">
              <p className="text-sm font-bold">
                Text size
              </p>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={decreaseFont}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-current/10 text-lg font-bold"
                >
                  A−
                </button>

                <div className="flex-1 text-center text-sm opacity-60">
                  {fontSize}px
                </div>

                <button
                  onClick={increaseFont}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-current/10 text-lg font-bold"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-bold">
                Reading mode
              </p>

              <div className="mt-3 space-y-2">
                {(
                  [
                    ["light", "Light"],
                    ["dark", "Dark"],
                    ["comfortable", "Comfortable"],
                  ] as [ReaderMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setReaderMode(mode)}
                    className={`w-full rounded-xl border p-4 text-left text-sm font-bold ${
                      readerMode === mode
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-current/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {resource?.allowDownload && (
              <div className="mt-8 border-t border-current/10 pt-6">
                <p className="text-xs leading-6 opacity-50">
                  Original resource download is enabled for
                  this textbook. The download action can use the
                  stored source file when its delivery URL is
                  available.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 px-4 py-10">
          <div
            className={`mx-auto max-h-full max-w-2xl overflow-y-auto rounded-3xl p-5 shadow-2xl ${
              readerMode === "dark"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="Search this textbook..."
                className="min-w-0 flex-1 rounded-xl border border-current/10 bg-transparent px-4 py-3 outline-none"
              />

              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchTerm("");
                }}
                className="rounded-xl border border-current/10 px-3 py-3"
              >
                ✕
              </button>
            </div>

            <p className="mt-4 text-xs font-semibold opacity-50">
              {searchTerm
                ? `${filteredSections.length} matching section${
                    filteredSections.length === 1
                      ? ""
                      : "s"
                  }`
                : "Search by section title or textbook content."}
            </p>

            <div className="mt-4 space-y-2">
              {searchTerm &&
                filteredSections.map((section) => {
                  const index = sections.findIndex(
                    (item) => item.id === section.id,
                  );

                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchTerm("");
                        changeSection(index);
                      }}
                      className="w-full rounded-xl bg-current/5 p-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Section {index + 1}
                      </p>
                      <p className="mt-1 font-bold">
                        {section.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm opacity-55">
                        {section.content}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
