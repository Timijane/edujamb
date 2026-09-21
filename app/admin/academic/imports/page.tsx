"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type QuestionSetType =
  | "Passage + Questions"
  | "Chart + Questions"
  | "Table + Questions"
  | "Image + Questions";

type ImportElement = {
  id: string;
  type: string;
  text: string;
  page?: number;
  order: number;
  confidence: "high" | "medium" | "low";
  questionNumber?: string;
  options?: string[];
  possibleAnswer?: string;
  possibleExplanation?: string;
  year?: number;
  category?: string;
  possibleTopicId?: string;
  possibleTopicTitle?: string;
  questionSetId?: string;
  questionSetType?: QuestionSetType;
};

type ImportRecord = {
  id: string;
  fileName: string;
  contentType: string;
  extractedText: string;
  status: string;
  reviewStatus: string;
  elementCount?: number;
  elements?: ImportElement[];
};

type Subject = {
  id: string;
  name: string;
  code: string;
};

type Topic = {
  id: string;
  title: string;
  description?: string;
};

type TopicDraft = {
  title: string;
  description: string;
};

const CATEGORIES = [
  "JAMB Past Question",
  "Practice",
  "Mock Exam",
  "Revision",
] as const;

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export default function AcademicImportsPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsForSubject, setTopicsForSubject] = useState<Topic[]>([]);

  const [selected, setSelected] = useState<ImportRecord | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );

  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("Practice");

  const [difficulty, setDifficulty] =
    useState<(typeof DIFFICULTIES)[number]>("Medium");

  const [topics, setTopics] = useState<TopicDraft[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState("textbook");

  const [screening, setScreening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [message, setMessage] = useState("");

  async function api<T = Record<string, unknown>>(url: string, options: RequestInit = {}): Promise<T> {
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

    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();

    let data: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("The server returned invalid JSON.");
      }
    } else if (raw.trim()) {
      throw new Error(raw.trim());
    }

    if (!response.ok) {
      throw new Error(
        typeof data.error === "string" ? data.error : "Request failed."
      );
    }

    return data as T;
  }

  async function load() {
    const [importsData, subjectsData] = await Promise.all([
      api<{ imports: ImportRecord[] }>("/api/admin/academic/import"),
      api<{ subjects: Subject[] }>("/api/admin/academic/subjects"),
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
          error instanceof Error
            ? error.message
            : "Unable to load import data.",
        );
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function loadTopics(subjectId: string) {
    setSelectedTopic("");
    setTopicsForSubject([]);

    if (!subjectId) return;

    setLoadingTopics(true);

    try {
      const data = await api<{ topics: Topic[] }>(
        `/api/admin/academic/subjects/${subjectId}/topics`,
      );

      setTopicsForSubject(data.topics || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load subject topics.",
      );
    } finally {
      setLoadingTopics(false);
    }
  }

  function selectImport(item: ImportRecord) {
    setSelected(item);
    setSelectedQuestions(new Set());
    setSelectedTopic("");
    setSelectedSubject("");
    setTopicsForSubject([]);
    setTopics([]);
    setMessage("");
  }

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

      setSelected((current) =>
        current
          ? {
              ...current,
              reviewStatus: action === "approve" ? "approved" : "rejected",
              status: action === "approve" ? "reviewed" : "rejected",
            }
          : current,
      );

      setMessage(
        action === "approve"
          ? "Document approved."
          : "Document rejected.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Review failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function screenDocument() {
    if (!selected || !selectedSubject) {
      setMessage("Select a document and subject first.");
      return;
    }

    setScreening(true);
    setMessage("");

    try {
      const data = await api<{
        elements?: ImportElement[];
        elementCount?: number;
      }>("/api/admin/academic/import/screen", {
        method: "POST",
        body: JSON.stringify({
          importId: selected.id,
          subjectId: selectedSubject,
        }),
      });

      setSelected((current) =>
        current
          ? {
              ...current,
              elements: data.elements || [],
              elementCount:
                typeof data.elementCount === "number"
                  ? data.elementCount
                  : 0,
              status: "screened",
            }
          : current,
      );

      setMessage(
        `Screening complete: ${data.elementCount || 0} elements detected.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to screen document.",
      );
    } finally {
      setScreening(false);
    }
  }

  const questions = useMemo(
    () =>
      (selected?.elements || []).filter(
        (element) => element.type === "question",
      ),
    [selected],
  );

  const questionSets = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        type: QuestionSetType;
        questions: ImportElement[];
      }
    >();

    for (const question of questions) {
      if (!question.questionSetId || !question.questionSetType) continue;

      const existing = groups.get(question.questionSetId);

      if (existing) {
        existing.questions.push(question);
      } else {
        groups.set(question.questionSetId, {
          id: question.questionSetId,
          type: question.questionSetType,
          questions: [question],
        });
      }
    }

    return Array.from(groups.values());
  }, [questions]);

  function toggleQuestion(id: string) {
    setSelectedQuestions((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function selectAllQuestions() {
    setSelectedQuestions(new Set(questions.map((question) => question.id)));
  }

  function clearQuestions() {
    setSelectedQuestions(new Set());
  }

  function selectSet(questionSetId: string) {
    const set = questionSets.find((item) => item.id === questionSetId);

    if (!set) return;

    setSelectedQuestions((current) => {
      const next = new Set(current);

      const allSelected = set.questions.every((question) =>
        next.has(question.id),
      );

      for (const question of set.questions) {
        if (allSelected) {
          next.delete(question.id);
        } else {
          next.add(question.id);
        }
      }

      return next;
    });
  }

  async function importQuestions() {
    if (!selected) return;

    if (selected.reviewStatus !== "approved") {
      setMessage("Approve the document before importing questions.");
      return;
    }

    if (!selectedSubject || !selectedTopic) {
      setMessage("Select both a subject and topic.");
      return;
    }

    const elements =
      selected.elements?.filter((element) =>
        selectedQuestions.has(element.id),
      ) || [];

    if (!elements.length) {
      setMessage("Select at least one question.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const data = await api(
        "/api/admin/academic/import/questions",
        {
          method: "POST",
          body: JSON.stringify({
            importId: selected.id,
            subjectId: selectedSubject,
            topicId: selectedTopic,
            category,
            difficulty,
            elements,
          }),
        },
      );

      setMessage(
        `${data.imported} question${data.imported === 1 ? "" : "s"} imported as drafts${
          data.questionSetCount
            ? ` with ${data.questionSetCount} question set${data.questionSetCount === 1 ? "" : "s"}`
            : ""
        }.`,
      );

      setSelectedQuestions(new Set());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Question import failed.",
      );
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
    value: string,
  ) {
    setTopics((current) =>
      current.map((topic, i) =>
        i === index
          ? {
              ...topic,
              [field]: value,
            }
          : topic,
      ),
    );
  }

  async function convertResource() {
    if (!selected) return;

    if (selected.reviewStatus !== "approved") {
      setMessage("Approve the document before converting it into an AI resource.");
      return;
    }

    if (!selectedSubject || !selectedTopic) {
      setMessage("Select both a subject and topic.");
      return;
    }

    const title = resourceTitle.trim() || selected.fileName;

    setSaving(true);
    setMessage("");

    try {
      const data = await api(
        `/api/admin/academic/import/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "convert_resource",
            subjectId: selectedSubject,
            topicId: selectedTopic,
            resourceType,
            title,
          }),
        },
      );

      setMessage(
        `AI resource created as a draft with ${data.chunkCount || 0} searchable chunks. Publish it before the AI Coach can use it.`,
      );

      setResourceTitle("");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Resource conversion failed.",
      );
    } finally {
      setSaving(false);
    }
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
        },
      );

      setMessage(
        `${data.created || topics.length} topics imported as drafts.`,
      );

      setTopics([]);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Topic conversion failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="edu-app min-h-screen p-6">
        Loading academic imports…
      </main>
    );
  }

  return (
    <main className="edu-app min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-600">
              SUPER ADMIN · ACADEMIC CONTENT
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Academic Document Import
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Extract, review, classify and import academic content without
              automatically publishing it.
            </p>
          </div>

          <a
            href="/admin/academic"
            className="edu-button edu-button-secondary w-fit"
          >
            Back to Academic Manager
          </a>
        </header>

        {message && (
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="edu-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Documents</h2>

              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">
                {imports.length}
              </span>
            </div>

            {!imports.length ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {imports.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectImport(item)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected?.id === item.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="truncate font-medium text-gray-900">
                      {item.fileName}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      {item.reviewStatus} · {item.status}
                    </div>

                    {item.elementCount ? (
                      <div className="mt-2 text-xs text-purple-600">
                        {item.elementCount} detected elements
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="edu-surface min-w-0 p-4 md:p-6">
            {!selected ? (
              <div className="flex min-h-[600px] items-center justify-center text-center text-gray-500">
                <div>
                  <div className="text-lg font-semibold text-gray-700">
                    Select an academic document
                  </div>
                  <p className="mt-1 text-sm">
                    The document analysis workspace will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <section className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-gray-900">
                      {selected.fileName}
                    </h2>

                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>
                        {selected.extractedText.length.toLocaleString()}{" "}
                        characters
                      </span>

                      <span>
                        {selected.elements?.length || 0} detected elements
                      </span>

                      <span>
                        Status: {selected.reviewStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
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
                </section>

                <section>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">
                      1. Intelligent Screening
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Analyse the document against the selected subject and
                      its published scheme-of-work topics.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedSubject}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedSubject(value);
                        loadTopics(value);
                      }}
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
                      onClick={screenDocument}
                      disabled={screening || !selectedSubject}
                    >
                      {screening ? "Screening…" : "Screen Document"}
                    </button>
                  </div>

                  {selected.elements?.length ? (
                    <div className="mt-5 overflow-hidden rounded-2xl border">
                      <div className="flex flex-col gap-3 border-b bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">
                            Detected Elements
                          </p>

                          <p className="text-xs text-gray-500">
                            Questions can be reviewed and imported individually.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
                            onClick={selectAllQuestions}
                            disabled={!questions.length}
                          >
                            Select All Questions
                          </button>

                          <button
                            className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"
                            onClick={clearQuestions}
                            disabled={!selectedQuestions.size}
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="divide-y">
                        {selected.elements.map((element) => (
                          <div
                            key={element.id}
                            className="p-4"
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold uppercase">
                                {element.type}
                              </span>

                              <span className="text-xs text-gray-500">
                                {element.confidence} confidence
                              </span>

                              {element.questionNumber && (
                                <span className="text-xs text-gray-500">
                                  Question {element.questionNumber}
                                </span>
                              )}

                              {element.questionSetType && (
                                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                  {element.questionSetType}
                                </span>
                              )}
                            </div>

                            <p className="text-sm leading-6 text-gray-800">
                              {element.text}
                            </p>

                            {element.options?.length ? (
                              <div className="mt-3 grid gap-1.5 md:grid-cols-2">
                                {element.options.map((option, index) => (
                                  <div
                                    key={`${element.id}-${index}`}
                                    className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                  >
                                    <span className="font-semibold">
                                      {String.fromCharCode(65 + index)}.
                                    </span>{" "}
                                    {option}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {element.possibleTopicTitle ? (
                              <div className="mt-3 rounded-xl bg-purple-50 p-3 text-sm text-purple-900">
                                <span className="font-semibold">
                                  Suggested topic:
                                </span>{" "}
                                {element.possibleTopicTitle}
                              </div>
                            ) : null}

                            {element.type === "question" && (
                              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={selectedQuestions.has(element.id)}
                                  onChange={() =>
                                    toggleQuestion(element.id)
                                  }
                                  className="h-4 w-4"
                                />

                                <span className="text-sm font-medium">
                                  Import this question
                                </span>
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="border-t pt-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">
                      2. Question Sets
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Shared passages, charts, tables and images are grouped
                      with their detected questions.
                    </p>
                  </div>

                  {!questionSets.length ? (
                    <div className="rounded-xl border border-dashed p-5 text-sm text-gray-500">
                      No question sets detected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questionSets.map((set) => {
                        const selectedCount = set.questions.filter(
                          (question) =>
                            selectedQuestions.has(question.id),
                        ).length;

                        return (
                          <button
                            key={set.id}
                            onClick={() => selectSet(set.id)}
                            className="w-full rounded-2xl border p-4 text-left hover:bg-gray-50"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold">
                                  {set.type}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {set.questions.length} detected questions
                                </p>
                              </div>

                              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                                {selectedCount}/{set.questions.length} selected
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="border-t pt-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">
                      3. Import Selected Questions
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Imported questions remain unpublished drafts until
                      reviewed and published by an authorised administrator.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedSubject}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedSubject(value);
                        loadTopics(value);
                      }}
                    >
                      <option value="">Select subject</option>

                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedTopic}
                      onChange={(event) =>
                        setSelectedTopic(event.target.value)
                      }
                      disabled={!selectedSubject || loadingTopics}
                    >
                      <option value="">
                        {loadingTopics
                          ? "Loading topics…"
                          : "Select topic"}
                      </option>

                      {topicsForSubject.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-xl border px-4 py-3"
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target
                            .value as (typeof CATEGORIES)[number],
                        )
                      }
                    >
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-xl border px-4 py-3"
                      value={difficulty}
                      onChange={(event) =>
                        setDifficulty(
                          event.target
                            .value as (typeof DIFFICULTIES)[number],
                        )
                      }
                    >
                      {DIFFICULTIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {selectedQuestions.size} question
                          {selectedQuestions.size === 1 ? "" : "s"} selected
                        </p>

                        <p className="text-xs text-gray-500">
                          Questions will be created as drafts.
                        </p>
                      </div>

                      <button
                        className="edu-button edu-button-primary"
                        onClick={importQuestions}
                        disabled={
                          saving ||
                          selected.reviewStatus !== "approved" ||
                          !selectedSubject ||
                          !selectedTopic ||
                          !selectedQuestions.size
                        }
                      >
                        {saving
                          ? "Importing…"
                          : "Import Questions as Drafts"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="border-t pt-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">
                      4. Scheme of Work Import
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Existing manual topic conversion remains available for
                      documents that contain scheme-of-work material.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedSubject}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedSubject(value);
                        loadTopics(value);
                      }}
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

                  <div className="mt-3 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-xl border px-4 py-3"
                      placeholder="Type a topic title"
                      value={newTopic}
                      onChange={(event) =>
                        setNewTopic(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTopic();
                        }
                      }}
                    />
                  </div>

                  {topics.length ? (
                    <div className="mt-4 space-y-3">
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
                                onChange={(event) =>
                                  updateTopic(
                                    index,
                                    "title",
                                    event.target.value,
                                  )
                                }
                              />

                              <textarea
                                className="min-h-24 w-full rounded-xl border px-4 py-3 text-sm"
                                placeholder="Optional description / scope"
                                value={topic.description}
                                onChange={(event) =>
                                  updateTopic(
                                    index,
                                    "description",
                                    event.target.value,
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
                  ) : null}

                  <button
                    className="edu-button edu-button-secondary mt-5 w-full"
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
                </section>

                <section className="border-t pt-8">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">
                      5. AI Learning Resource
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Convert this approved document into searchable material
                      that JAMBMASTER AI Coach can use when teaching students.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-xl border px-4 py-3"
                      placeholder={`Resource title (default: ${selected.fileName})`}
                      value={resourceTitle}
                      onChange={(event) =>
                        setResourceTitle(event.target.value)
                      }
                    />

                    <select
                      className="rounded-xl border px-4 py-3"
                      value={resourceType}
                      onChange={(event) =>
                        setResourceType(event.target.value)
                      }
                    >
                      <option value="textbook">Textbook</option>
                      <option value="study_note">Study Note</option>
                      <option value="syllabus">Syllabus</option>
                      <option value="scheme_of_work">Scheme of Work</option>
                      <option value="reference">Reference</option>
                      <option value="other">Other</option>
                    </select>

                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedSubject}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedSubject(value);
                        loadTopics(value);
                      }}
                    >
                      <option value="">Select subject</option>

                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-xl border px-4 py-3"
                      value={selectedTopic}
                      onChange={(event) =>
                        setSelectedTopic(event.target.value)
                      }
                      disabled={!selectedSubject || loadingTopics}
                    >
                      <option value="">
                        {loadingTopics
                          ? "Loading topics…"
                          : "Select topic"}
                      </option>

                      {topicsForSubject.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 rounded-xl bg-purple-50 p-4 text-sm text-purple-800">
                    <strong>AI retrieval:</strong>{" "}
                    The document will be split into searchable chunks and
                    linked to the selected subject and topic. It will remain
                    inactive and unpublished until reviewed.
                  </div>

                  <button
                    className="edu-button edu-button-primary mt-5 w-full"
                    onClick={convertResource}
                    disabled={
                      saving ||
                      selected.reviewStatus !== "approved" ||
                      !selectedSubject ||
                      !selectedTopic
                    }
                  >
                    {saving
                      ? "Converting…"
                      : "Convert to AI Learning Resource"}
                  </button>
                </section>

                <section className="border-t pt-8">
                  <details>
                    <summary className="cursor-pointer font-semibold text-gray-800">
                      View Raw Extracted Source
                    </summary>

                    <pre className="mt-4 max-h-[500px] overflow-auto rounded-2xl bg-gray-50 p-4 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700">
                      {selected.extractedText}
                    </pre>
                  </details>
                </section>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
