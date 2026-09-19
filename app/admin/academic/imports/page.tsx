"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type ImportRecord = {
  id: string;
  fileName: string;
  contentType: string;
  extractedText: string;
  status: string;
  reviewStatus: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
};

type TopicDraft = {
  title: string;
  description: string;
};

export default function AcademicImportsPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<ImportRecord | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topics, setTopics] = useState<TopicDraft[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function api(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;

    if (!user) throw new Error("You are not signed in.");

    const token = await user.getIdToken();

    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${token}`);

    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function load() {
    const [importsData, subjectsData] = await Promise.all([
      api("/api/admin/academic/import"),
      api("/api/admin/academic/subjects"),
    ]);

    setImports(importsData.imports || []);
    setSubjects(subjectsData.subjects || []);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await load();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load data."
        );
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function review(action: "approve" | "reject") {
    if (!selected) return;

    setSaving(true);
    setMessage("");

    try {
      await api(`/api/admin/academic/import/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });

      await load();

      const updated = imports.find((item) => item.id === selected.id);

      if (updated) {
        setSelected({
          ...updated,
          reviewStatus: action === "approve" ? "approved" : "rejected",
          status: action === "approve" ? "reviewed" : "rejected",
        });
      }

      setMessage(
        action === "approve"
          ? "Document approved. You can now convert its content."
          : "Document rejected."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setSaving(false);
    }
  }

  function addTopic() {
    const title = newTopic.trim();

    if (!title) return;

    setTopics((current) => [
      ...current,
      {
        title,
        description: "",
      },
    ]);

    setNewTopic("");
  }

  function removeTopic(index: number) {
    setTopics((current) => current.filter((_, i) => i !== index));
  }

  function updateTopic(
    index: number,
    field: keyof TopicDraft,
    value: string
  ) {
    setTopics((current) =>
      current.map((topic, i) =>
        i === index
          ? {
              ...topic,
              [field]: value,
            }
          : topic
      )
    );
  }

  async function convertTopics() {
    if (!selected) return;

    if (selected.reviewStatus !== "approved") {
      setMessage("Approve the document before converting its content.");
      return;
    }

    if (!selectedSubject) {
      setMessage("Select the subject first.");
      return;
    }

    if (!topics.length) {
      setMessage("Add at least one topic.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const data = await api(
        `/api/admin/academic/import/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "convert",
            subjectId: selectedSubject,
            topics,
          }),
        }
      );

      setMessage(
        `${data.created || topics.length} topics imported as drafts.`
      );

      setTopics([]);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Conversion failed."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="edu-app p-6">Loading imports…</main>;
  }

  return (
    <main className="edu-app min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">
              SUPER ADMIN
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              Academic Document Review
            </h1>

            <p className="text-sm text-gray-500">
              Review documents and convert approved content into scheme-of-work
              topics.
            </p>
          </div>

          <a
            href="/admin/academic"
            className="edu-button edu-button-secondary w-fit"
          >
            Back to Academic Manager
          </a>
        </div>

        {message && (
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <section className="edu-surface p-4">
            <h2 className="mb-4 font-semibold">Documents</h2>

            {!imports.length ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {imports.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelected(item);
                      setTopics([]);
                      setSelectedSubject("");
                    }}
                    className={`w-full rounded-xl border p-4 text-left ${
                      selected?.id === item.id
                        ? "border-purple-500 bg-purple-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="truncate font-medium">
                      {item.fileName}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {item.reviewStatus} · {item.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="edu-surface p-4 md:p-6">
            {!selected ? (
              <div className="flex min-h-[500px] items-center justify-center text-center text-gray-500">
                Select a document to begin review.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      {selected.fileName}
                    </h2>

                    <p className="text-sm text-gray-500">
                      {selected.extractedText.length.toLocaleString()}{" "}
                      extracted characters
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="edu-button edu-button-secondary"
                      onClick={() => review("reject")}
                      disabled={saving}
                    >
                      Reject
                    </button>

                    <button
                      className="edu-button edu-button-primary"
                      onClick={() => review("approve")}
                      disabled={saving}
                    >
                      Approve Document
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Extracted Source
                  </div>

                  <pre className="max-h-[450px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700">
                    {selected.extractedText}
                  </pre>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold">
                    Convert to Scheme of Work
                  </h3>

                  <p className="mb-4 text-sm text-gray-500">
                    Manually select the relevant topics from the source
                    document. They will remain unpublished drafts.
                  </p>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      <option value="">Select subject</option>

                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>

                    <button
                      className="edu-button edu-button-secondary"
                      onClick={addTopic}
                    >
                      Add Topic
                    </button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-xl border px-4 py-3"
                      placeholder="Type a topic title"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTopic();
                        }
                      }}
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    {topics.map((topic, index) => (
                      <div
                        key={`${topic.title}-${index}`}
                        className="rounded-2xl border p-4"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1 space-y-3">
                            <input
                              className="w-full rounded-xl border px-4 py-3 font-medium"
                              value={topic.title}
                              onChange={(e) =>
                                updateTopic(
                                  index,
                                  "title",
                                  e.target.value
                                )
                              }
                            />

                            <textarea
                              className="min-h-24 w-full rounded-xl border px-4 py-3 text-sm"
                              placeholder="Optional description / scope"
                              value={topic.description}
                              onChange={(e) =>
                                updateTopic(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <button
                            className="h-9 rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => removeTopic(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="edu-button edu-button-primary mt-5 w-full"
                    onClick={convertTopics}
                    disabled={
                      saving ||
                      selected.reviewStatus !== "approved" ||
                      !selectedSubject ||
                      !topics.length
                    }
                  >
                    {saving
                      ? "Converting…"
                      : "Convert Topics to Draft Scheme of Work"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
