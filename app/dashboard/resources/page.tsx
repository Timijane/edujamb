"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";

type Resource = {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  resourceType: string;
  subjectId: string;
  topicId: string;
  coverImage?: string;
  coverMediaId?: string;
  chunkCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type AcademicSubject = {
  id: string;
  name: string;
  code: string;
  description: string;
  image?: string;
  imageMediaId?: string;
};

const subjectStyles: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  ENG: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: "EN",
  },
  MAT: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    icon: "∑",
  },
  PHY: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: "⚡",
  },
  BIO: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "BIO",
  },
};

function subjectName(id: string) {
  const names: Record<string, string> = {
    ENG: "English Language",
    MAT: "Mathematics",
    PHY: "Physics",
    BIO: "Biology",
  };

  return names[id] || id || "Academic";
}

function resourceTypeName(type: string) {
  switch (type) {
    case "textbook":
      return "Textbook";
    case "study_note":
      return "Study Note";
    case "syllabus":
      return "Syllabus";
    default:
      return "Study Material";
  }
}

function getSubjectStyle(id: string) {
  return (
    subjectStyles[id] || {
      bg: "bg-rose-50",
      text: "text-rose-700",
      icon: "📚",
    }
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [academicSubjects, setAcademicSubjects] = useState<AcademicSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [heroOverlay, setHeroOverlay] = useState(38);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  async function getIdToken() {
    const { auth } = await import("@/lib/firebase");

    const user = auth.currentUser;

    if (!user) {
      throw new Error("You must be signed in.");
    }

    return user.getIdToken();
  }

  async function loadAcademicSubjects() {
    const token = await getIdToken();

    const response = await fetch("/api/student/subjects", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load academic subjects.");
    }

    setAcademicSubjects(data.subjects || []);
  }

  async function loadResources() {
    setLoading(true);
    setMessage("");

    try {
      const token = await getIdToken();

      const response = await fetch("/api/academic/resources", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load academic resources.",
        );
      }

      setResources(
        Array.isArray(data.resources) ? data.resources : [],
      );

      const settingsResponse = await fetch(
        "/api/academic/library-settings",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const settingsData = await settingsResponse.json();

      if (settingsResponse.ok) {
        setHeroImage(settingsData.heroImage || "");
        setHeroOverlay(
          typeof settingsData.heroOverlay === "number"
            ? settingsData.heroOverlay
            : 38,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load academic resources.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      const { auth } = await import("@/lib/firebase");

      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          Promise.all([
            loadResources(),
            loadAcademicSubjects(),
          ]).catch((error) => {
            setMessage(
              error instanceof Error
                ? error.message
                : "Unable to load academic library."
            );
            setLoading(false);
          });
        } else {
          setMessage("You must be signed in.");
          setLoading(false);
        }
      });
    };

    initAuth();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const subjects = useMemo(
    () => academicSubjects.map((subject) => subject.code),
    [academicSubjects],
  );

  const topics = useMemo(
    () =>
      Array.from(
        new Set(
          resources
            .map((resource) => resource.topicId)
            .filter(Boolean),
        ),
      ),
    [resources],
  );

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch =
        !query ||
        resource.title.toLowerCase().includes(query) ||
        resource.fileName.toLowerCase().includes(query) ||
        resource.subjectId.toLowerCase().includes(query) ||
        resource.topicId.toLowerCase().includes(query);

      const matchesSubject =
        subjectFilter === "all" ||
        resource.subjectId === subjectFilter;

      const matchesTopic =
        topicFilter === "all" ||
        resource.topicId === topicFilter;

      return (
        matchesSearch &&
        matchesSubject &&
        matchesTopic
      );
    });
  }, [
    resources,
    search,
    subjectFilter,
    topicFilter,
  ]);

  const featuredResource = filteredResources[0];

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10"
          style={
            heroImage
              ? {
                  backgroundImage: `linear-gradient(rgba(2,6,23,${heroOverlay / 100}), rgba(2,6,23,${heroOverlay / 100})), url(${heroImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {!heroImage && (
            <>
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            </>
          )}

          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur">
              <span>🎓</span>
              JAMBMASTER ACADEMIC LIBRARY
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Learn. Practice.
              <span className="block text-blue-300">
                Master your subjects.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Access your approved textbooks, study notes,
              syllabuses and revision materials in one focused
              learning environment.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-black">
                  {resources.length}
                </p>
                <p className="text-xs text-slate-300">
                  Available resources
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-black">
                  {subjects.length}
                </p>
                <p className="text-xs text-slate-300">
                  Subjects covered
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-black">
                  {topics.length}
                </p>
                <p className="text-xs text-slate-300">
                  Topics available
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="mt-7">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search textbooks, topics and study materials..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </div>
        </section>

        {/* Subject navigation */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Your subjects
              </h2>
              <p className="text-sm text-slate-500">
                Browse materials by subject
              </p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSubjectFilter("all")}
              className={`min-w-[125px] rounded-2xl border px-4 py-3 text-left transition ${
                subjectFilter === "all"
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-lg">📚</div>
              <div className="mt-2 text-sm font-bold">
                All Subjects
              </div>
            </button>

            {subjects.map((subject) => {
              const style = getSubjectStyle(subject);
              const subjectData = academicSubjects.find(
                (item) => item.code === subject
              );

              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() =>
                    setSubjectFilter(subject)
                  }
                  className={`min-w-[145px] rounded-2xl border px-4 py-3 text-left transition ${
                    subjectFilter === subject
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {subjectData?.image ? (
                    <img
                      src={subjectData.image}
                      alt={subjectData.name}
                      className="h-12 w-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${
                        subjectFilter === subject
                          ? "bg-white/15 text-white"
                          : `${style.bg} ${style.text}`
                      }`}
                    >
                      {style.icon}
                    </div>
                  )}

                  <div className="mt-2 text-sm font-bold">
                    {subjectData?.name || subjectName(subject)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filters */}
        <section className="mt-6 flex flex-col gap-3 sm:flex-row">
          <select
            value={topicFilter}
            onChange={(event) =>
              setTopicFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-slate-400"
          >
            <option value="all">All topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>

          {(search ||
            subjectFilter !== "all" ||
            topicFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSubjectFilter("all");
                setTopicFilter("all");
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </section>

        {message && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-3xl bg-slate-200"
              />
            ))}
          </section>
        ) : filteredResources.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📚
              </div>

              <h2 className="mt-5 text-xl font-bold">
                No resources found
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Try another search or change your subject
                and topic filters.
              </p>
            </div>
          </section>
        ) : (
          <>
            {/* Featured resource */}
            {featuredResource && (
              <section className="mt-9">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Featured material
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Continue your learning
                  </h2>
                </div>

                <article className="relative overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200">
                  <div className="grid lg:grid-cols-[1fr_280px]">
                    <div className="p-6 sm:p-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {resourceTypeName(
                            featuredResource.resourceType,
                          )}
                        </span>

                        {featuredResource.subjectId && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {subjectName(
                              featuredResource.subjectId,
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                        {featuredResource.title}
                      </h3>

                      {featuredResource.topicId && (
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Topic: {featuredResource.topicId}
                        </p>
                      )}

                      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                        Build your understanding with this
                        JAMB-focused learning material and
                        strengthen your preparation.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setMessage(
                            "The resource reader will be connected in the next step.",
                          )
                        }
                        className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
                      >
                        Start Reading →
                      </button>
                    </div>

                    <div className="flex min-h-[220px] items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8">
                      <div className="text-center text-white">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-4xl backdrop-blur">
                          📖
                        </div>

                        <p className="mt-4 text-sm font-semibold text-white/80">
                          {featuredResource.chunkCount} learning
                          sections
                        </p>

                        <p className="mt-1 text-xs text-white/60">
                          JAMBMASTER Academic Library
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            )}

            {/* Library */}
            <section className="mt-10">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Library
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Study materials
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  {filteredResources.length} available
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredResources.map((resource) => {
                  const style = getSubjectStyle(
                    resource.subjectId,
                  );

                  return (
                    <article
                      key={resource.id}
                      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative h-32 overflow-hidden bg-slate-100">
                        {resource.coverImage ? (
                          <img
                            src={resource.coverImage}
                            alt={`${resource.title} cover`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className={`h-full ${style.bg} p-5`}>
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black shadow-sm ${style.text}`}
                            >
                              {style.icon}
                            </div>
                          </div>
                        )}

                        <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
                          {resourceTypeName(resource.resourceType)}
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          {subjectName(
                            resource.subjectId,
                          )}
                        </p>

                        <h3 className="mt-2 line-clamp-2 min-h-[56px] text-lg font-black leading-7">
                          {resource.title}
                        </h3>

                        {resource.topicId && (
                          <p className="mt-2 text-sm text-slate-500">
                            {resource.topicId}
                          </p>
                        )}

                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                          <span className="text-xs font-medium text-slate-400">
                            {resource.chunkCount} sections
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setMessage(
                                "The resource reader will be connected in the next step.",
                              )
                            }
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                          >
                            Read Material
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
