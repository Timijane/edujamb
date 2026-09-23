"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { DEFAULT_JAMB_SUBJECTS } from "@/lib/academic-constants";
import { assignMediaToAcademic, getMediaItems, type MediaItem } from "@/lib/media";

type Subject = {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
  published: boolean;
  order: number;
  image?: string;
  imageMediaId?: string;
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
  const [tab, setTab] = useState<"subjects" | "scheme" | "upload" | "library">("subjects");

  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [document, setDocument] = useState<File | null>(null);

  const [libraryHeroImage, setLibraryHeroImage] = useState("");
  const [libraryHeroMediaId, setLibraryHeroMediaId] = useState("");
  const [libraryHeroOverlay, setLibraryHeroOverlay] = useState(38);
  const [academicMedia, setAcademicMedia] = useState<MediaItem[]>([]);
  const [academicSubjectMedia, setAcademicSubjectMedia] = useState<MediaItem[]>([]);

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

  async function loadLibrarySettings() {
    const data = await api("/api/admin/academic/library-settings");
    setLibraryHeroImage(data.heroImage || "");
    setLibraryHeroMediaId(data.heroImageMediaId || "");
    setLibraryHeroOverlay(
      typeof data.heroOverlay === "number" ? data.heroOverlay : 38
    );
  }

  async function loadAcademicMedia() {
    const items = await getMediaItems();

    setAcademicMedia(
      items.filter((item) => item.purpose === "academic_library_hero")
    );

    setAcademicSubjectMedia(
      items.filter((item) => item.purpose === "academic_subject_image")
    );
  }

  async function saveLibrarySettings() {
    setSaving(true);
    setMessage("");

    try {
      await api("/api/admin/academic/library-settings", {
        method: "PATCH",
        body: JSON.stringify({
          heroImage: libraryHeroImage,
          heroImageMediaId: libraryHeroMediaId,
          heroOverlay: libraryHeroOverlay,
        }),
      });

      setMessage("Academic Library settings saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save Academic Library settings."
      );
    } finally {
      setSaving(false);
    }
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
        await Promise.all([
          loadSubjects(),
          loadLibrarySettings(),
          loadAcademicMedia(),
        ]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function updateSubjectImage(subject: Subject, mediaId: string) {
    const media = academicSubjectMedia.find((item) => item.id === mediaId);

    if (!media) return;

    setSaving(true);
    setMessage("");

    try {
      await api(`/api/admin/academic/subjects/${subject.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          image: media.url,
          imageMediaId: media.id,
        }),
      });

      await loadSubjects();
      setMessage(`${subject.name} image updated.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update subject image."
      );
    } finally {
      setSaving(false);
    }
  }

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

    const maxSize = 5 * 1024 * 1024;

    if (document.size >= maxSize) {
      setMessage("Academic documents must be less than 5 MB.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const extension = document.name
      .toLowerCase()
      .slice(document.name.lastIndexOf("."));

    if (
      !allowedTypes.includes(document.type) &&
      !allowedExtensions.includes(extension)
    ) {
      setMessage("Only PDF, DOCX or TXT documents are allowed.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const cloudinaryForm = new FormData();
      cloudinaryForm.append("file", document);
      cloudinaryForm.append("upload_preset", "pelumi");
      cloudinaryForm.append("folder", "edujamb/academic");

      const cloudinaryResponse = await fetch(
        "https://api.cloudinary.com/v1_1/dmbjrohtn/auto/upload",
        {
          method: "POST",
          body: cloudinaryForm,
        }
      );

      const cloudinaryData = await cloudinaryResponse.json();

      if (!cloudinaryResponse.ok) {
        throw new Error(
          cloudinaryData?.error?.message || "Cloudinary upload failed."
        );
      }

      if (!cloudinaryData.secure_url || !cloudinaryData.public_id) {
        throw new Error("Cloudinary returned an incomplete upload response.");
      }

      await api("/api/admin/academic/import", {
        method: "POST",
        body: JSON.stringify({
          fileUrl: cloudinaryData.secure_url,
          publicId: cloudinaryData.public_id,
          fileName: document.name,
          contentType: document.type,
          size: document.size,
        }),
      });

      setDocument(null);
      setMessage(
        "Document uploaded to Cloudinary and saved as a draft import. Review it before publishing."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Upload failed."
      );
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

            <button
              className={`px-5 py-4 text-sm font-semibold ${
                tab === "library"
                  ? "border-b-2 border-purple-600 text-purple-700"
                  : "text-gray-500"
              }`}
              onClick={() => setTab("library")}
            >
              Academic Library
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

              <button
                className={`px-5 py-4 text-sm font-semibold ${
                  tab === "library"
                    ? "border-b-2 border-purple-600 text-purple-700"
                    : "text-gray-500"
                }`}
                onClick={() => setTab("library")}
              >
                Academic Library
              </button>
          </div>

          <div className="p-4 md:p-6">
              {tab === "library" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Academic Library Presentation
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                      Control the hero image and overlay used on the student Academic Library.
                      These settings affect only the Academic Library.
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="overflow-hidden rounded-2xl border bg-white">
                      <div className="border-b bg-gray-50 px-5 py-4">
                        <h3 className="font-bold text-gray-900">Hero Preview</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          This is how the Academic Library hero will appear to students.
                        </p>
                      </div>

                      <div className="relative min-h-[260px] overflow-hidden bg-slate-950">
                        {libraryHeroImage ? (
                          <>
                            <img
                              src={libraryHeroImage}
                              alt="Academic Library hero"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div
                              className="absolute inset-0 bg-slate-950"
                              style={{ opacity: libraryHeroOverlay / 100 }}
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                            <div className="text-center text-white">
                              <div className="text-5xl">📚</div>
                              <p className="mt-3 font-bold">No hero image selected</p>
                            </div>
                          </div>
                        )}

                        <div className="relative z-10 flex min-h-[260px] items-center px-6 py-8 text-white">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                              JAMBMASTER
                            </p>
                            <h3 className="mt-2 text-3xl font-black">
                              Academic Library
                            </h3>
                            <p className="mt-2 max-w-md text-sm text-white/80">
                              Learn. Practice. Master your subjects.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 rounded-2xl border bg-white p-5">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-gray-800">
                          Hero Image
                        </label>

                        <select
                          value={libraryHeroMediaId}
                          onChange={(e) => {
                            const mediaId = e.target.value;
                            setLibraryHeroMediaId(mediaId);

                            const selected = academicMedia.find(
                              (item) => item.id === mediaId
                            );

                            setLibraryHeroImage(selected?.url || "");
                          }}
                          className="w-full rounded-xl border px-4 py-3 text-sm"
                        >
                          <option value="">No hero image</option>
                          {academicMedia.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.fileName}
                            </option>
                          ))}
                        </select>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Only images assigned the purpose “Academic Library Hero”
                          appear here.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-800">
                            Hero Overlay
                          </label>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                            {libraryHeroOverlay}%
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={libraryHeroOverlay}
                          onChange={(e) =>
                            setLibraryHeroOverlay(Number(e.target.value))
                          }
                          className="mt-4 w-full"
                        />

                        <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                          <span>Bright image</span>
                          <span>Dark image</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={saveLibrarySettings}
                        disabled={saving}
                        className="w-full rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Academic Library Settings"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

                        <div className="mt-3 flex items-center gap-3">
                          {subject.image ? (
                            <img
                              src={subject.image}
                              alt={subject.name}
                              className="h-12 w-16 rounded-lg border object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-16 items-center justify-center rounded-lg border bg-gray-100 text-[10px] text-gray-400">
                              No image
                            </div>
                          )}

                          <select
                            className="rounded-lg border px-3 py-2 text-xs"
                            value={subject.imageMediaId || ""}
                            onChange={(e) =>
                              updateSubjectImage(subject, e.target.value)
                            }
                            disabled={
                              saving || academicSubjectMedia.length === 0
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Select subject image</option>
                            {academicSubjectMedia.map((media) => (
                              <option key={media.id} value={media.id}>
                                {media.fileName}
                              </option>
                            ))}
                          </select>
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
