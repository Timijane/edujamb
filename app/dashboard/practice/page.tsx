"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Question = {
  id: string;
  subjectId: string;
  topicId: string;
  question: string;
  options: string[];
  year?: number | null;
  category?: string;
  difficulty?: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
};

type Mode = "cbt" | "past_questions" | "mock";

const MODE_LABELS: Record<Mode, string> = {
  cbt: "CBT Practice",
  past_questions: "Past Questions",
  mock: "Mock Exam",
};

const MODE_LIMITS: Record<Mode, number> = {
  cbt: 20,
  past_questions: 20,
  mock: 40,
};

const MODE_TIMES: Record<Mode, number> = {
  cbt: 30 * 60,
  past_questions: 30 * 60,
  mock: 60 * 60,
};

export default function PracticePage() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<Mode>("cbt");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(MODE_TIMES.cbt);

  const [startedAt, setStartedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [result, setResult] = useState<{
    score: number;
    totalQuestions: number;
    percentage: number;
  } | null>(null);

  const [message, setMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const idToken = await user.getIdToken();
      setToken(idToken);

      try {
        const response = await fetch("/api/student/subjects", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          const loadedSubjects = data.subjects || [];
          setSubjects(loadedSubjects);

          if (loadedSubjects.length > 0) {
            setSubjectId(loadedSubjects[0].id);
          }
        }
      } catch {
        setMessage("Unable to load your subjects.");
      }
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    if (!subjectId) return;

    loadQuestions();
  }, [token, mode, subjectId, year]);

  useEffect(() => {
    if (!questions.length || submitted) return;

    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          submit();
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [questions.length, submitted]);

  async function loadQuestions() {
    try {
      setLoading(true);
      setMessage("");
      setSubmitted(false);
      setResult(null);
      setAnswers({});
      setCurrent(0);
      setSeconds(MODE_TIMES[mode]);

      const start = new Date().toISOString();
      setStartedAt(start);

      const body: Record<string, unknown> = {
        action: "questions",
        mode,
        subjectId,
        limit: MODE_LIMITS[mode],
      };

      if (mode === "past_questions" && year) {
        body.year = Number(year);
        body.category = "JAMB Past Question";
      }

      if (mode === "cbt") {
        body.category = "Practice";
      }

      if (mode === "mock") {
        body.category = "Mock Exam";
      }

      const response = await fetch("/api/academic/engine", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load questions.",
        );
      }

      setQuestions(data.questions || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load questions.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (submitted || !questions.length) return;

    try {
      setLoading(true);
      setMessage("");

      const completedAt = new Date().toISOString();

      const submittedAnswers = questions
        .map((question) => ({
          questionId: question.id,
          selectedOption:
            answers[question.id] !== undefined
              ? answers[question.id]
              : -1,
          timeSpentSeconds: 0,
        }))
        .filter(
          (answer) =>
            answer.selectedOption >= 0 &&
            answer.selectedOption <= 3,
        );

      if (!submittedAnswers.length) {
        throw new Error(
          "Answer at least one question before submitting.",
        );
      }

      const response = await fetch("/api/academic/engine", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "submit",
          mode,
          subjectIds: subjectId ? [subjectId] : [],
          answers: submittedAnswers,
          startedAt,
          completedAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to submit attempt.",
        );
      }

      setResult(data.result);
      setSubmitted(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit attempt.",
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setQuestions([]);
    setAnswers({});
    setCurrent(0);
    setSubmitted(false);
    setResult(null);
    setSeconds(MODE_TIMES[nextMode]);

    if (nextMode !== "past_questions") {
      setYear("");
    }
  }

  const question = questions[current];

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }, [seconds]);

  const answeredCount = Object.keys(answers).length;

  if (submitted && result) {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div
            className="edu-surface"
            style={{
              maxWidth: 720,
              margin: "40px auto",
              padding: 32,
              textAlign: "center",
            }}
          >
            <p className="edu-text-secondary">
              {MODE_LABELS[mode]}
            </p>

            <h1>Practice Complete</h1>

            <div style={{ margin: "30px 0" }}>
              <strong style={{ fontSize: 52 }}>
                {result.percentage}%
              </strong>

              <p className="edu-text-secondary">
                {result.score} / {result.totalQuestions} correct
              </p>
            </div>

            <button
              className="edu-button"
              onClick={loadQuestions}
            >
              Practice Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="edu-app">
      <div className="edu-content">
        <div style={{ marginBottom: 24 }}>
          <h1>Practice Centre</h1>

          <p className="edu-text-secondary">
            Prepare with CBT practice, JAMB past questions and
            mock examinations.
          </p>
        </div>

        <div
          className="edu-surface"
          style={{
            padding: 16,
            marginBottom: 20,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {(Object.keys(MODE_LABELS) as Mode[]).map(
            (item) => (
              <button
                key={item}
                className="edu-button"
                onClick={() => changeMode(item)}
                style={{
                  opacity: mode === item ? 1 : 0.55,
                }}
              >
                {MODE_LABELS[item]}
              </button>
            ),
          )}
        </div>

        <div
          className="edu-surface"
          style={{
            padding: 16,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns:
              mode === "past_questions"
                ? "1fr 1fr"
                : "1fr",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Subject
            </label>

            <select
              value={subjectId}
              onChange={(event) =>
                setSubjectId(event.target.value)
              }
              style={{
                width: "100%",
                padding: 12,
                borderRadius:
                  "var(--edu-radius-md)",
                border:
                  "1px solid var(--edu-border)",
                background:
                  "var(--edu-surface)",
              }}
            >
              {subjects.length === 0 ? (
                <option value="">
                  No subjects available
                </option>
              ) : (
                subjects.map((subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {mode === "past_questions" && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                JAMB Year
              </label>

              <select
                value={year}
                onChange={(event) =>
                  setYear(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius:
                    "var(--edu-radius-md)",
                  border:
                    "1px solid var(--edu-border)",
                  background:
                    "var(--edu-surface)",
                }}
              >
                <option value="">
                  All available years
                </option>

                {Array.from(
                  { length: 11 },
                  (_, index) => 2026 - index,
                ).map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

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

        {loading && !question ? (
          <div
            className="edu-surface"
            style={{ padding: 30 }}
          >
            Loading questions...
          </div>
        ) : question ? (
          <>
            <div
              className="edu-surface"
              style={{
                padding: 20,
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>
                  Question {current + 1} of{" "}
                  {questions.length}
                </strong>

                <p
                  className="edu-text-secondary"
                  style={{ margin: "5px 0 0" }}
                >
                  {answeredCount} answered
                </p>
              </div>

              <strong>{formattedTime}</strong>
            </div>

            <div
              className="edu-surface"
              style={{
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h2>{question.question}</h2>

              <div style={{ marginTop: 24 }}>
                {question.options.map(
                  (option, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: index,
                        }))
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: 16,
                        marginBottom: 12,
                        border:
                          "1px solid var(--edu-border)",
                        borderRadius:
                          "var(--edu-radius-md)",
                        background:
                          answers[question.id] === index
                            ? "var(--edu-primary-soft)"
                            : "var(--edu-surface)",
                        cursor: "pointer",
                      }}
                    >
                      <strong>
                        {String.fromCharCode(
                          65 + index,
                        )}
                        .
                      </strong>{" "}
                      {option}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(42px, 1fr))",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {questions.map((item, index) => (
                <button
                  key={item.id}
                  className="edu-button"
                  onClick={() => setCurrent(index)}
                  style={{
                    opacity:
                      current === index
                        ? 1
                        : 0.65,
                    minHeight: 42,
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                className="edu-button"
                disabled={current === 0}
                onClick={() =>
                  setCurrent(
                    (value) => value - 1,
                  )
                }
              >
                Previous
              </button>

              {current === questions.length - 1 ? (
                <button
                  className="edu-button"
                  onClick={submit}
                  disabled={loading}
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  className="edu-button"
                  onClick={() =>
                    setCurrent(
                      (value) => value + 1,
                    )
                  }
                >
                  Next
                </button>
              )}
            </div>
          </>
        ) : (
          <div
            className="edu-surface"
            style={{ padding: 30 }}
          >
            {subjectId
              ? "No published questions are available for this selection yet."
              : "Select one of your JAMB subjects to begin."}
          </div>
        )}
      </div>
    </main>
  );
}
