"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { DEFAULT_JAMB_SUBJECTS } from "@/lib/academic-constants";

type Subject = {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
  published: boolean;
  order: number;
};

type Topic = {
  id: string;
  title: string;
  description: string;
  active: boolean;
  published: boolean;
  order: number;
};

export default function AcademicAdminPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"subjects" | "scheme" | "upload">("subjects");

  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [document, setDocument] = useState<File | null>(null);

  async function api(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;

    if (!user) throw new Error("You are not signed in.");

    const token = await user.getIdToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function loadSubjects() {
    const data = await api("/api/admin/academic/subjects");
    setSubjects(data.subjects || []);
  }

  async function loadTopics(subjectId: string) {
    const data = await api(
      `/api/admin/academic/subjects/${subjectId}/topics`
    );
    setTopics(data.topics || []);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await loadSubjects();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function createSubject() {
    if (!subjectName.trim() || !subjectCode.trim()) {
      setMessage("Enter the subject name and code.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await api("/api/admin/academic/subjects", {
        method: "POST",
        body: JSON.stringify({
          name: subjectName,
          code: subjectCode,
          description: "",
          active: true,
          published: false,
          order: subjects.length + 1,
        }),
      });

      setSubjectName("");
      setSubjectCode("");
      await loadSubjects();
      setMessage("Subject created as draft.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create.");
    } finally {
      setSaving(false);
    }
  }

  async function createStandardSubjects() {
    setSaving(true);
    setMessage("");

    try {
      const data = await api(
        "/api/admin/academic/subjects/standard",
        { method: "POST" }
      );

      await loadSubjects();

      setMessage(
        data.count > 0
          ? `Created ${data.count} missing standard JAMB subjects as drafts.`
          : "All standard JAMB subjects already exist."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create standard JAMB subjects."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubject(
    subject: Subject,
    field: "active" | "published"
  ) {
    try {
      await api(`/api/admin/academic/subjects/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          [field]: !subject[field],
        }),
      });

      await loadSubjects();

      if (selectedSubject?.id === subject.id) {
        const updated = { ...subject, [field]: !subject[field] };
        setSelectedSubject(updated);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    }
  }

  async function selectSubject(subject: Subject) {
    setSelectedSubject(subject);
    setTab("scheme");
    setMessage("");

    try {
      await loadTopics(subject.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load.");
    }
  }

  async function createTopic() {
    if (!selectedSubject || !topicTitle.trim()) {
      setMessage("Select a subject and enter a topic title.");
      return;
    }

    setSaving(true);

    try {
      await api(
        `/api/admin/academic/subjects/${selectedSubject.id}/topics`,
        {
          method: "POST",
          body: JSON.stringify({
            title: topicTitle,
            description: topicDescription,
            active: true,
            published: false,
            order: topics.length + 1,
          }),
        }
      );

      setTopicTitle("");
      setTopicDescription("");
      await loadTopics(selectedSubject.id);
      setMessage("Topic created as draft.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTopic(topic: Topic, field: "active" | "published") {
    try {
      await api(`/api/admin/academic/topics/${topic.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          [field]: !topic[field],
        }),
      });

      if (selectedSubject) await loadTopics(selectedSubject.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    }
  }

  async function deleteTopic(topic: Topic) {
    if (!confirm(`Delete "${topic.title}"?`)) return;

    try {
      await api(`/api/admin/academic/topics/${topic.id}`, {
        method: "DELETE",
      });

      if (selectedSubject) await loadTopics(selectedSubject.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function uploadDocument() {
    if (!document) {
      setMessage("Choose a PDF, DOCX or TXT document first.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", document);

      await api("/api/admin/academic/import", {
        method: "POST",
        body: form,
      });

      setDocument(null);
      setMessage(
        "Document uploaded as a draft import. Review it before publishing."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="edu-app p-6">Loading Academic Manager…</main>;
  }

  return (
    <main className="edu-app min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">
              SUPER ADMIN
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Academic Manager
            </h1>
            <p className="text-sm text-gray-500">
              Manage subjects, JAMB scheme of work and academic documents.
            </p>
          </div>

          <a
            href="/admin"
            className="edu-button edu-button-secondary w-fit"
          >
            Back to Admin
          </a>
        </div>

        {message && (
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800">
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl">
              📚
            </div>
            <h2 className="font-bold text-gray-900">Subjects & Scheme</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Manage JAMB subjects and their scheme of work.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-purple-700">
              Manage Academic Structure →
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("upload")}
            className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              📄
            </div>
            <h2 className="font-bold text-gray-900">Upload Academic Document</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Upload authoritative PDF, DOCX or TXT academic documents.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-blue-700">
              Upload Document →
            </span>
          </button>

          <a
            href="/admin/academic/imports"
            className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
              🧠
            </div>
            <h2 className="font-bold text-gray-900">Intelligent Import</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Screen documents, detect questions and review imports before publishing.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-amber-700">
              Open Import Control Room →
            </span>
          </a>

          <a
            href="/admin/academic/questions"
            className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
              ❓
            </div>
            <h2 className="font-bold text-gray-900">Question Bank</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Review, edit, publish and manage academic questions.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-green-700">
              Manage Questions →
            </span>
          </a>

          <a
            href="/admin/academic/resources"
            className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl">
              📚
            </div>
            <h2 className="font-bold text-gray-900">AI Learning Resources</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Manage textbooks, study notes and academic resources used by the AI Coach.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-purple-700">
              Manage Resources →
            </span>
          </a>
        </section>

        <div className="edu-surface overflow-hidden">
          <div className="flex overflow-x-auto border-b">
            <button
              className={`px-5 py-4 text-sm font-semibold ${
                tab === "subjects"
                  ? "border-b-2 border-purple-600 text-purple-700"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("subjects")}
            >
              Subjects
            </button>

            <button
              className={`px-5 py-4 text-sm font-semibold ${
                tab === "scheme"
                  ? "border-b-2 border-purple-600 text-purple-700"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("scheme")}
            >
              Scheme of Work
            </button>

            <button
              className={`px-5 py-4 text-sm font-semibold ${
                tab === "upload"
                  ? "border-b-2 border-purple-600 text-purple-700"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("upload")}
            >
              Upload Document
            </button>
          </div>

          <div className="p-4 md:p-6">
            {tab === "subjects" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
                  <input
                    className="rounded-xl border px-4 py-3"
                    placeholder="Subject name"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                  />

                  <input
                    className="rounded-xl border px-4 py-3"
                    placeholder="Code e.g. ENG"
                    value={subjectCode}
                    onChange={(e) =>
                      setSubjectCode(e.target.value.toUpperCase())
                    }
                  />

                  <button
                    className="edu-button edu-button-primary"
                    onClick={createSubject}
                    disabled={saving}
                  >
                    Add Subject
                  </button>
                </div>

                <button
                  className="edu-button edu-button-secondary"
                  onClick={createStandardSubjects}
                  disabled={saving}
                >
                  Create Standard JAMB Subjects
                </button>

                <div className="grid gap-3">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <button
                        className="text-left"
                        onClick={() => selectSubject(subject)}
                      >
                        <div className="font-semibold text-gray-900">
                          {subject.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subject.code} · Order {subject.order}
                        </div>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="edu-button edu-button-secondary"
                          onClick={() => selectSubject(subject)}
                        >
                          Scheme
                        </button>

                        <button
                          className="edu-button edu-button-secondary"
                          onClick={() => toggleSubject(subject, "active")}
                        >
                          {subject.active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          className="edu-button edu-button-secondary"
                          onClick={() => toggleSubject(subject, "published")}
                        >
                          {subject.published ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "scheme" && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => selectSubject(subject)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        selectedSubject?.id === subject.id
                          ? "border-purple-600 bg-purple-50 text-purple-700"
                          : "bg-white text-gray-600"
                      }`}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>

                {!selectedSubject ? (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
                    Select a subject to manage its scheme of work.
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-xl font-bold">
                        {selectedSubject.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Add the authoritative JAMB topics here. New topics
                        remain drafts until published.
                      </p>
                    </div>

                    <div className="grid gap-3">
                      <input
                        className="rounded-xl border px-4 py-3"
                        placeholder="Topic title"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                      />

                      <textarea
                        className="min-h-28 rounded-xl border px-4 py-3"
                        placeholder="Topic description / learning scope"
                        value={topicDescription}
                        onChange={(e) => setTopicDescription(e.target.value)}
                      />

                      <button
                        className="edu-button edu-button-primary w-fit"
                        onClick={createTopic}
                        disabled={saving}
                      >
                        Add Topic
                      </button>
                    </div>

                    <div className="space-y-3">
                      {topics.map((topic, index) => (
                        <div
                          key={topic.id}
                          className="rounded-2xl border p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="font-semibold">
                                {index + 1}. {topic.title}
                              </div>

                              {topic.description && (
                                <p className="mt-1 text-sm text-gray-500">
                                  {topic.description}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                className="edu-button edu-button-secondary"
                                onClick={() =>
                                  toggleTopic(topic, "published")
                                }
                              >
                                {topic.published
                                  ? "Unpublish"
                                  : "Publish"}
                              </button>

                              <button
                                className="edu-button edu-button-secondary"
                                onClick={() =>
                                  toggleTopic(topic, "active")
                                }
                              >
                                {topic.active ? "Deactivate" : "Activate"}
                              </button>

                              <button
                                className="edu-button edu-button-secondary"
                                onClick={() => deleteTopic(topic)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {!topics.length && (
                        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
                          No topics yet.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "upload" && (
              <div className="mx-auto max-w-2xl space-y-5">
                <div>
                  <h2 className="text-xl font-bold">
                    Upload Scheme of Work
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload an authoritative JAMB scheme document. Uploaded
                    documents are treated as drafts and must be reviewed before
                    publication.
                  </p>
                </div>

                <div className="rounded-2xl border-2 border-dashed p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf"
                    onChange={(e) =>
                      setDocument(e.target.files?.[0] || null)
                    }
                  />

                  {document && (
                    <p className="mt-4 text-sm text-gray-600">
                      Selected: {document.name}
                    </p>
                  )}
                </div>

                <button
                  className="edu-button edu-button-primary w-full"
                  onClick={uploadDocument}
                  disabled={saving || !document}
                >
                  {saving ? "Uploading…" : "Upload as Draft"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
