"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  QUESTION_CATEGORIES,
  QUESTION_DIFFICULTIES,
  QUESTION_SET_TYPES,
  type QuestionCategory,
  type QuestionDifficulty,
  type QuestionSetType,
} from "@/lib/question-types";

type Subject = {
  id: string;
  name: string;
  published: boolean;
  active: boolean;
};

type Topic = {
  id: string;
  title: string;
  subjectId: string;
  published: boolean;
  active: boolean;
};

type QuestionSet = {
  id: string;
  subjectId: string;
  topicId: string;
  title: string;
  type: QuestionSetType;
  description?: string;
  published: boolean;
  active: boolean;
  questionIds?: string[];
};

type QuestionDraft = {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  year: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
};

const emptyQuestion = (): QuestionDraft => ({
  question: "",
  options: ["", "", "", ""],
  correctOption: 0,
  explanation: "",
  year: "",
  category: "JAMB Past Question",
  difficulty: "Medium",
});

export default function AdminQuestionsPage() {
  const [token, setToken] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);

  const [mode, setMode] = useState<"single" | "set">("single");

  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");

  const [setTitle, setSetTitle] = useState("");
  const [setType, setSetType] =
    useState<QuestionSetType>("Passage + Questions");
  const [setDescription, setSetDescription] = useState("");

  const [sharedText, setSharedText] = useState("");
  const [sharedImageUrl, setSharedImageUrl] = useState("");
  const [sharedImageAlt, setSharedImageAlt] = useState("");
  const [sharedImageCaption, setSharedImageCaption] = useState("");

  const [questions, setQuestions] = useState<QuestionDraft[]>([
    emptyQuestion(),
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function api(
    path: string,
    options: RequestInit = {}
  ) {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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

    if (!subjectId && data.subjects?.length) {
      setSubjectId(data.subjects[0].id);
    }
  }

  async function loadTopics(nextSubjectId: string) {
    if (!nextSubjectId) {
      setTopics([]);
      return;
    }

    const data = await api(
      `/api/admin/academic/subjects/${nextSubjectId}/topics`
    );

    setTopics(data.topics || []);

    setTopicId(
      data.topics?.length
        ? data.topics[0].id
        : ""
    );
  }

  async function loadSets() {
    const data = await api(
      "/api/admin/academic/question-sets"
    );

    setSets(data.sets || []);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const idToken = await user.getIdToken();

      setToken(idToken);
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    loadSubjects().catch((error) => {
      setMessage(error.message);
    });

    loadSets().catch((error) => {
      setMessage(error.message);
    });
  }, [token]);

  useEffect(() => {
    if (!token || !subjectId) return;

    loadTopics(subjectId).catch((error) => {
      setMessage(error.message);
    });
  }, [token, subjectId]);

  function updateQuestion(
    index: number,
    patch: Partial<QuestionDraft>
  ) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index
          ? { ...question, ...patch }
          : question
      )
    );
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;

        const options = [...question.options];

        options[optionIndex] = value;

        return {
          ...question,
          options,
        };
      })
    );
  }

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      emptyQuestion(),
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((current) =>
      current.length === 1
        ? current
        : current.filter((_, questionIndex) => questionIndex !== index)
    );
  }

  async function saveSingleQuestion() {
    if (!subjectId || !topicId) {
      throw new Error("Select a subject and topic.");
    }

    const question = questions[0];

    await api("/api/admin/academic/questions", {
      method: "POST",
      body: JSON.stringify({
        ...question,
        subjectId,
        topicId,
        year: question.year || undefined,
        published: false,
      }),
    });
  }

  async function saveQuestionSet() {
    if (!subjectId || !topicId) {
      throw new Error("Select a subject and topic.");
    }

    if (!setTitle.trim()) {
      throw new Error("Question set title is required.");
    }

    if (!questions.length) {
      throw new Error("Add at least one question.");
    }

    const setResponse = await api(
      "/api/admin/academic/question-sets",
      {
        method: "POST",
        body: JSON.stringify({
          subjectId,
          topicId,
          title: setTitle.trim(),
          type: setType,
          description: setDescription.trim(),
          content: [
            ...(sharedText.trim()
              ? [
                  {
                    id: crypto.randomUUID(),
                    type: "text",
                    text: sharedText.trim(),
                  },
                ]
              : []),
            ...(sharedImageUrl.trim()
              ? [
                  {
                    id: crypto.randomUUID(),
                    type: "image",
                    imageUrl: sharedImageUrl.trim(),
                    imageAlt: sharedImageAlt.trim(),
                    imageCaption:
                      sharedImageCaption.trim(),
                  },
                ]
              : []),
          ],
          media: sharedImageUrl.trim()
            ? [
                {
                  url: sharedImageUrl.trim(),
                  type:
                    setType === "Chart + Questions"
                      ? "chart"
                      : setType === "Table + Questions"
                        ? "table"
                        : "image",
                  alt: sharedImageAlt.trim(),
                  caption:
                    sharedImageCaption.trim(),
                },
              ]
            : [],
          published: false,
          active: true,
        }),
      }
    );

    const questionSetId = setResponse.id;

    for (const question of questions) {
      await api("/api/admin/academic/questions", {
        method: "POST",
        body: JSON.stringify({
          ...question,
          subjectId,
          topicId,
          questionSetId,
          year: question.year || undefined,
          published: false,
        }),
      });
    }
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      if (mode === "single") {
        await saveSingleQuestion();
        setMessage("Question saved as draft.");
      } else {
        await saveQuestionSet();
        setMessage(
          "Question set and linked questions saved as drafts."
        );
      }

      setQuestions([emptyQuestion()]);
      setSetTitle("");
      setSetDescription("");
      setSharedText("");
      setSharedImageUrl("");
      setSharedImageAlt("");
      setSharedImageCaption("");

      await loadSets();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedSubject = subjects.find(
    (subject) => subject.id === subjectId
  );

  return (
    <main className="edu-app">
      <div className="edu-content">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <h1>Question Bank</h1>
            <p className="edu-text-secondary">
              Create single questions or reusable question
              sets with shared passages, charts and media.
            </p>
          </div>
        </div>

        <div
          className="edu-surface"
          style={{
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <button
              className="edu-button"
              onClick={() => setMode("single")}
              style={{
                opacity: mode === "single" ? 1 : 0.6,
              }}
            >
              Single Question
            </button>

            <button
              className="edu-button"
              onClick={() => setMode("set")}
              style={{
                opacity: mode === "set" ? 1 : 0.6,
              }}
            >
              Question Set
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
            }}
          >
            <label>
              Subject
              <select
                value={subjectId}
                onChange={(event) =>
                  setSubjectId(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                }}
              >
                {subjects.map((subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Topic
              <select
                value={topicId}
                onChange={(event) =>
                  setTopicId(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                }}
              >
                {topics.map((topic) => (
                  <option
                    key={topic.id}
                    value={topic.id}
                  >
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedSubject && (
            <p
              className="edu-text-secondary"
              style={{ marginTop: 10 }}
            >
              Content subject: {selectedSubject.name}
            </p>
          )}
        </div>

        {mode === "set" && (
          <div
            className="edu-surface"
            style={{
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h2>Shared Content</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 16,
                marginTop: 16,
              }}
            >
              <label>
                Set Type
                <select
                  value={setType}
                  onChange={(event) =>
                    setSetType(
                      event.target.value as QuestionSetType
                    )
                  }
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 6,
                  }}
                >
                  {QUESTION_SET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Set Title
                <input
                  value={setTitle}
                  onChange={(event) =>
                    setSetTitle(event.target.value)
                  }
                  placeholder="e.g. Comprehension Passage 2024"
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 6,
                  }}
                />
              </label>
            </div>

            <label
              style={{
                display: "block",
                marginTop: 16,
              }}
            >
              Description
              <textarea
                value={setDescription}
                onChange={(event) =>
                  setSetDescription(event.target.value)
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                }}
              />
            </label>

            <label
              style={{
                display: "block",
                marginTop: 16,
              }}
            >
              Shared Passage / Text
              <textarea
                value={sharedText}
                onChange={(event) =>
                  setSharedText(event.target.value)
                }
                rows={8}
                placeholder="Paste the shared passage, instructions, data or context here..."
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                }}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 16,
                marginTop: 16,
              }}
            >
              <label>
                Shared Image / Chart URL
                <input
                  value={sharedImageUrl}
                  onChange={(event) =>
                    setSharedImageUrl(event.target.value)
                  }
                  placeholder="Cloudinary image URL"
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 6,
                  }}
                />
              </label>

              <label>
                Image Alt Text
                <input
                  value={sharedImageAlt}
                  onChange={(event) =>
                    setSharedImageAlt(event.target.value)
                  }
                  placeholder="Describe the image"
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 6,
                  }}
                />
              </label>
            </div>

            <label
              style={{
                display: "block",
                marginTop: 16,
              }}
            >
              Image Caption
              <input
                value={sharedImageCaption}
                onChange={(event) =>
                  setSharedImageCaption(
                    event.target.value
                  )
                }
                placeholder="Optional caption"
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 6,
                }}
              />
            </label>
          </div>
        )}

        <div>
          {questions.map((question, questionIndex) => (
            <div
              key={questionIndex}
              className="edu-surface"
              style={{
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2>
                  Question {questionIndex + 1}
                </h2>

                {mode === "set" &&
                  questions.length > 1 && (
                    <button
                      className="edu-button"
                      onClick={() =>
                        removeQuestion(questionIndex)
                      }
                    >
                      Remove
                    </button>
                  )}
              </div>

              <label>
                Question
                <textarea
                  value={question.question}
                  onChange={(event) =>
                    updateQuestion(questionIndex, {
                      question: event.target.value,
                    })
                  }
                  rows={5}
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 6,
                  }}
                />
              </label>

              <div style={{ marginTop: 20 }}>
                <strong>Options</strong>

                {question.options.map(
                  (option, optionIndex) => (
                    <div
                      key={optionIndex}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        marginTop: 10,
                      }}
                    >
                      <input
                        type="radio"
                        checked={
                          question.correctOption ===
                          optionIndex
                        }
                        onChange={() =>
                          updateQuestion(questionIndex, {
                            correctOption: optionIndex,
                          })
                        }
                      />

                      <input
                        value={option}
                        onChange={(event) =>
                          updateOption(
                            questionIndex,
                            optionIndex,
                            event.target.value
                          )
                        }
                        placeholder={`Option ${String.fromCharCode(
                          65 + optionIndex
                        )}`}
                        style={{
                          flex: 1,
                          padding: 12,
                        }}
                      />
                    </div>
                  )
                )}
              </div>

              <label
                style={{
                  display: "block",
                  marginTop: 20,
                }}
              >
                Explanation
                <textarea
                  value={question.explanation}
                  onChange={(event) =>
                    updateQuestion(questionIndex, {
                      explanation: event.target.value,
                    })
                  }
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 12,
                    marginTop: 6,
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <label>
                  Year
                  <input
                    type="number"
                    value={question.year}
                    onChange={(event) =>
                      updateQuestion(questionIndex, {
                        year: event.target.value,
                      })
                    }
                    placeholder="2024"
                    style={{
                      width: "100%",
                      padding: 12,
                      marginTop: 6,
                    }}
                  />
                </label>

                <label>
                  Category
                  <select
                    value={question.category}
                    onChange={(event) =>
                      updateQuestion(questionIndex, {
                        category:
                          event.target.value as QuestionCategory,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: 12,
                      marginTop: 6,
                    }}
                  >
                    {QUESTION_CATEGORIES.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Difficulty
                  <select
                    value={question.difficulty}
                    onChange={(event) =>
                      updateQuestion(questionIndex, {
                        difficulty:
                          event.target
                            .value as QuestionDifficulty,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: 12,
                      marginTop: 6,
                    }}
                  >
                    {QUESTION_DIFFICULTIES.map(
                      (difficulty) => (
                        <option
                          key={difficulty}
                          value={difficulty}
                        >
                          {difficulty}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>

        {mode === "set" && (
          <button
            className="edu-button"
            onClick={addQuestion}
            style={{
              marginBottom: 20,
            }}
          >
            + Add Another Question
          </button>
        )}

        {message && (
          <div
            className="edu-surface"
            style={{
              padding: 16,
              marginBottom: 20,
            }}
          >
            {message}
          </div>
        )}

        <button
          className="edu-button"
          disabled={saving}
          onClick={save}
        >
          {saving
            ? "Saving..."
            : mode === "single"
              ? "Save Question"
              : "Save Question Set"}
        </button>

        {mode === "set" && (
          <div
            className="edu-surface"
            style={{
              padding: 20,
              marginTop: 30,
            }}
          >
            <h2>Existing Question Sets</h2>

            {sets.length === 0 ? (
              <p className="edu-text-secondary">
                No question sets created yet.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {sets.map((set) => (
                  <div
                    key={set.id}
                    style={{
                      border: "1px solid var(--edu-border)",
                      borderRadius:
                        "var(--edu-radius-md)",
                      padding: 16,
                    }}
                  >
                    <strong>{set.title}</strong>

                    <div
                      className="edu-text-secondary"
                      style={{ marginTop: 5 }}
                    >
                      {set.type} ·{" "}
                      {set.questionIds?.length || 0}{" "}
                      questions
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
