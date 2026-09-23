"use client";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  assignMediaToAcademic,
  getMediaItems,
  type MediaItem,
} from "@/lib/media";

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
  sourceImportId: string;
  chunkCount: number;
  active: boolean;
  published: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type Subject = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  title: string;
};

async function getIdToken() {
  const { auth } = await import("@/lib/firebase");
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user.getIdToken();
}

async function api(
  url: string,
  options: RequestInit = {},
) {
  const token = await getIdToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export default function AcademicResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const [resourceData, subjectData, mediaData] = await Promise.all([
        api("/api/admin/academic/resources"),
        api("/api/admin/academic/subjects"),
        getMediaItems(),
      ]);

      setResources(resourceData.resources || []);

      setSubjects(
        (subjectData.subjects || []).map((subject: any) => ({
          id: subject.id,
          name: subject.name,
        })),
      );

      setMediaItems(
        mediaData.filter(
          (media) => media.purpose === "academic_resource_cover",
        ),
      );
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

  async function loadTopics(subjectId: string) {
    setSelectedTopic("");

    if (!subjectId) {
      setTopics([]);
      return;
    }

    try {
      const data = await api(
        `/api/admin/academic/subjects/${subjectId}/topics`,
      );

      setTopics(
        (data.topics || []).map((topic: any) => ({
          id: topic.id,
          title: topic.title,
        })),
      );
    } catch (error) {
      setTopics([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load topics.",
      );
    }
  }

  useEffect(() => {
  let unsubscribe: (() => void) | undefined;

  const initAuth = async () => {
    const { auth } = await import("@/lib/firebase");

    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        load();
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

  async function updateResource(
    resourceId: string,
    action: "publish" | "unpublish" | "activate" | "deactivate",
  ) {
    setBusyId(resourceId);
    setMessage("");

    try {
      await api("/api/admin/academic/resources", {
        method: "PATCH",
        body: JSON.stringify({
          resourceId,
          action,
        }),
      });

      await load();
      setMessage("Resource updated successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update resource.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function updateResourceCover(
    resourceId: string,
    mediaId: string,
  ) {
    setBusyId(resourceId);
    setMessage("");

    try {
      if (!mediaId) {
        await api("/api/admin/academic/resources", {
          method: "PATCH",
          body: JSON.stringify({
            resourceId,
            action: "remove-cover",
          }),
        });

        setMessage("Resource cover removed.");
      } else {
        const media = mediaItems.find((item) => item.id === mediaId);

        if (!media) {
          throw new Error("Selected academic cover image was not found.");
        }

        await assignMediaToAcademic(media, { resourceId });

        setMessage("Resource cover updated.");
      }

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update resource cover.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function deleteResource(resourceId: string) {
    const confirmed = window.confirm(
      "Delete this academic resource permanently?",
    );

    if (!confirmed) return;

    setBusyId(resourceId);
    setMessage("");

    try {
      await api("/api/admin/academic/resources", {
        method: "DELETE",
        body: JSON.stringify({ resourceId }),
      });

      await load();
      setMessage("Resource deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete resource.",
      );
    } finally {
      setBusyId("");
    }
  }

  const subjectMap = new Map(
    subjects.map((subject) => [subject.id, subject.name]),
  );

  const filteredResources = resources.filter((resource) => {
    if (selectedSubject && resource.subjectId !== selectedSubject) {
      return false;
    }

    if (selectedTopic && resource.topicId !== selectedTopic) {
      return false;
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-4 py-6 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Academic Manager
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              AI Learning Resources
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Manage approved textbooks, study notes, syllabuses and other
              academic materials available to the JAMBMASTER AI Coach.
            </p>
          </div>

          <a
            href="/admin/academic/imports"
            className="inline-flex w-fit items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            Import Academic Document
          </a>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="font-semibold">Filter Resources</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Narrow the resource library by subject or topic.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={selectedSubject}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedSubject(value);
                loadTopics(value);
              }}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
            >
              <option value="">All subjects</option>

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTopic}
              onChange={(event) => setSelectedTopic(event.target.value)}
              disabled={!selectedSubject}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-zinc-100 focus:border-zinc-500"
            >
              <option value="">All topics</option>

              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Resource Library</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {filteredResources.length} resource
                  {filteredResources.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Loading resources...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-zinc-800">
                No academic resources found.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Approve an imported document and convert it into an AI
                learning resource first.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {filteredResources.map((resource) => {
                const subjectName =
                  subjectMap.get(resource.subjectId) || "Unknown subject";

                const busy = busyId === resource.id;

                return (
                  <article
                    key={resource.id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-zinc-900">
                            {resource.title}
                          </h3>

                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                            {resource.resourceType.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="mt-2 break-all text-xs text-zinc-500">
                          {resource.fileName}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-zinc-600">
                            {subjectName}
                          </span>

                          <span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-zinc-600">
                            {resource.chunkCount} searchable chunks
                          </span>

                          <span
                            className={`rounded-lg px-2.5 py-1.5 ${
                              resource.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {resource.active ? "Active" : "Inactive"}
                          </span>

                          <span
                            className={`rounded-lg px-2.5 py-1.5 ${
                              resource.published
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {resource.published
                              ? "Published"
                              : "Draft"}
                          </span>
                        </div>
                      </div>

                      <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 lg:max-w-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                              Academic Cover
                            </p>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              Use an uploaded academic cover image for this resource.
                            </p>
                          </div>

                          {resource.coverImage && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => updateResourceCover(resource.id, "")}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {resource.coverImage ? (
                          <div className="mb-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                            <img
                              src={resource.coverImage}
                              alt={`${resource.title} cover`}
                              className="h-28 w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="mb-3 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-5 text-center">
                            <p className="text-xs text-zinc-500">
                              No cover image assigned.
                            </p>
                          </div>
                        )}

                        <select
                          value=""
                          disabled={busy || mediaItems.length === 0}
                          onChange={(event) => {
                            if (event.target.value) {
                              updateResourceCover(
                                resource.id,
                                event.target.value,
                              );
                            }
                          }}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-500 disabled:bg-zinc-100"
                        >
                          <option value="">
                            {mediaItems.length === 0
                              ? "No academic cover images uploaded"
                              : resource.coverImage
                                ? "Change cover image..."
                                : "Select cover image..."}
                          </option>

                          {mediaItems.map((media) => (
                            <option key={media.id} value={media.id}>
                              {media.fileName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                        {resource.active ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateResource(
                                resource.id,
                                "deactivate",
                              )
                            }
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateResource(
                                resource.id,
                                "activate",
                              )
                            }
                            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}

                        {resource.published ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateResource(
                                resource.id,
                                "unpublish",
                              )
                            }
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateResource(
                                resource.id,
                                "publish",
                              )
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50"
                          >
                            Publish
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deleteResource(resource.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
