"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  cbt: "Sharpen your skills with timed practice questions designed for regular revision.",
  past_questions:
    "Practice authentic JAMB-style questions by subject and examination year.",
  mock: "Take a full-length practice examination and test your readiness under timed conditions.",
};

const MODE_META: Record<
  Mode,
  { questions: number; duration: string; label: string }
> = {
  cbt: {
    questions: 20,
    duration: "30 minutes",
    label: "Quick practice",
  },
  past_questions: {
    questions: 20,
    duration: "30 minutes",
    label: "JAMB revision",
  },
  mock: {
    questions: 40,
    duration: "60 minutes",
    label: "Full simulation",
  },
};

export default function PracticePage() {
  const router = useRouter();
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
  const [started, setStarted] = useState(false);

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
    if (!questions.length || submitted || !started) return;

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
  }, [questions.length, submitted, started]);

  async function loadQuestions() {
    if (!token || !subjectId) {
      setMessage("Please select a subject before starting.");
      return;
    }

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
        throw new Error(data.error || "Unable to load questions.");
      }

      const loadedQuestions = data.questions || [];

      if (!loadedQuestions.length) {
        setStarted(false);
        setQuestions([]);
        setMessage(
          "No published questions are available for this selection yet.",
        );
        return;
      }

      setQuestions(loadedQuestions);
      setStarted(true);
    } catch (error) {
      setStarted(false);
      setQuestions([]);
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
        throw new Error("Answer at least one question before submitting.");
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
        throw new Error(data.error || "Unable to submit attempt.");
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
    setStarted(false);
    setMessage("");
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
              padding: 40,
              textAlign: "center",
              borderRadius: "var(--edu-radius-xl)",
              boxShadow: "var(--edu-shadow-lg)",
            }}
          >
            <p
              className="edu-text-secondary"
              style={{ marginBottom: 8 }}
            >
              {MODE_LABELS[mode]}
            </p>

            <h1 style={{ marginTop: 0 }}>Practice Complete</h1>

            <div style={{ margin: "30px 0" }}>
              <strong style={{ fontSize: 52 }}>
                {result.percentage}%
              </strong>

              <p className="edu-text-secondary">
                {result.score} / {result.totalQuestions} correct
              </p>
            </div>

            <button
              className="edu-button edu-button-primary"
              onClick={() => {
                setStarted(false);
                setSubmitted(false);
                setResult(null);
                setQuestions([]);
              }}
            >
              Back to Practice Centre
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (started && question) {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div style={{ marginBottom: 20 }}>
            <button
              className="edu-button edu-button-secondary"
              onClick={() => {
                setStarted(false);
                setQuestions([]);
              }}
            >
              ← Exit Practice
            </button>
          </div>

          <div
            className="edu-surface"
            style={{
              padding: 20,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
              borderRadius: "var(--edu-radius-lg)",
            }}
          >
            <div>
              <strong>
                Question {current + 1} of {questions.length}
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
              borderRadius: "var(--edu-radius-lg)",
            }}
          >
            <h2>{question.question}</h2>

            <div style={{ marginTop: 24 }}>
              {question.options.map((option, index) => (
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
                      answers[question.id] === index
                        ? "2px solid var(--edu-primary)"
                        : "1px solid var(--edu-border)",
                    borderRadius: "var(--edu-radius-md)",
                    background:
                      answers[question.id] === index
                        ? "var(--edu-primary-soft)"
                        : "var(--edu-surface)",
                    color: "var(--edu-text)",
                    cursor: "pointer",
                  }}
                >
                  <strong>{String.fromCharCode(65 + index)}.</strong>{" "}
                  {option}
                </button>
              ))}
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
                className={
                  current === index
                    ? "edu-button edu-button-primary"
                    : "edu-button edu-button-secondary"
                }
                onClick={() => setCurrent(index)}
                style={{ minHeight: 42 }}
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
              className="edu-button edu-button-secondary"
              disabled={current === 0}
              onClick={() => setCurrent((value) => value - 1)}
            >
              Previous
            </button>

            {current === questions.length - 1 ? (
              <button
                className="edu-button edu-button-primary"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Exam"}
              </button>
            ) : (
              <button
                className="edu-button edu-button-primary"
                onClick={() => setCurrent((value) => value + 1)}
              >
                Next
              </button>
            )}
          </div>

          {message && (
            <div
              className="edu-surface"
              style={{
                padding: 16,
                marginTop: 20,
              }}
            >
              {message}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="edu-app">
      <div className="edu-content">
        <section
          style={{
            padding: "12px 0 32px",
          }}
        >
          <p
            style={{
              color: "var(--edu-primary)",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            PRACTICE CENTRE
          </p>

          <h1
            style={{
              fontSize: "clamp(30px, 5vw, 46px)",
              margin: "0 0 12px",
              letterSpacing: "-0.03em",
            }}
          >
            Prepare. Practice. Perform.
          </h1>

          <p
            className="edu-text-secondary"
            style={{
              maxWidth: 700,
              fontSize: 17,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Build confidence with CBT practice, JAMB past questions
            and realistic mock examinations.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: 18,
            marginBottom: 28,
          }}
        >
          {(Object.keys(MODE_LABELS) as Mode[]).map((item) => {
            const selected = mode === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item === "cbt") {
                    router.push("/dashboard/practice/cbt");
                    return;
                  }

                  changeMode(item);
                }}
                className="edu-surface"
                style={{
                  textAlign: "left",
                  padding: 24,
                  borderRadius: "var(--edu-radius-xl)",
                  border: selected
                    ? "2px solid var(--edu-primary)"
                    : "1px solid var(--edu-border)",
                  background: selected
                    ? "var(--edu-primary-soft)"
                    : "var(--edu-surface)",
                  boxShadow: selected
                    ? "var(--edu-shadow-md)"
                    : "var(--edu-shadow-sm)",
                  cursor: "pointer",
                  transition: "all 160ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "var(--edu-primary)",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {MODE_META[item].label}
                    </p>

                    <h2 style={{ margin: 0 }}>
                      {MODE_LABELS[item]}
                    </h2>
                  </div>

                  {selected && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--edu-primary)",
                      }}
                    >
                      Selected
                    </span>
                  )}
                </div>

                <p
                  className="edu-text-secondary"
                  style={{
                    lineHeight: 1.6,
                    margin: "14px 0 20px",
                  }}
                >
                  {MODE_DESCRIPTIONS[item]}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    flexWrap: "wrap",
                    fontSize: 14,
                    color: "var(--edu-text-secondary)",
                  }}
                >
                  <span>
                    <strong>{MODE_META[item].questions}</strong>{" "}
                    questions
                  </span>

                  <span>
                    <strong>{MODE_META[item].duration}</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        <section
          className="edu-surface"
          style={{
            padding: 24,
            borderRadius: "var(--edu-radius-xl)",
            marginBottom: 20,
          }}
        >
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ margin: "0 0 6px" }}>
              Set up your practice
            </h2>

            <p
              className="edu-text-secondary"
              style={{ margin: 0 }}
            >
              Choose what you want to practise before starting.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                mode === "past_questions"
                  ? "repeat(auto-fit, minmax(240px, 1fr))"
                  : "1fr",
              gap: 18,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Subject
              </label>

              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 15px",
                  borderRadius: "var(--edu-radius-md)",
                  border: "1px solid var(--edu-border)",
                  background: "var(--edu-surface)",
                  color: "var(--edu-text)",
                  fontSize: 15,
                }}
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects available</option>
                ) : (
                  subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
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
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  JAMB Year
                </label>

                <select
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 15px",
                    borderRadius: "var(--edu-radius-md)",
                    border: "1px solid var(--edu-border)",
                    background: "var(--edu-surface)",
                    color: "var(--edu-text)",
                    fontSize: 15,
                  }}
                >
                  <option value="">All available years</option>

                  {Array.from(
                    { length: 11 },
                    (_, index) => 2026 - index,
                  ).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 22,
              padding: 16,
              borderRadius: "var(--edu-radius-md)",
              background: "var(--edu-surface-muted)",
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{MODE_LABELS[mode]}</strong>

              <p
                className="edu-text-secondary"
                style={{ margin: "4px 0 0", fontSize: 14 }}
              >
                {MODE_META[mode].questions} questions ·{" "}
                {MODE_META[mode].duration}
              </p>
            </div>

            <button
              className="edu-button edu-button-primary"
              onClick={loadQuestions}
              disabled={loading || !subjectId}
              style={{
                minWidth: 150,
                minHeight: 48,
              }}
            >
              {loading ? "Preparing..." : "Start Practice"}
            </button>
          </div>
        </section>

        {message && (
          <div
            className="edu-surface"
            style={{
              padding: 20,
              borderRadius: "var(--edu-radius-lg)",
              border: "1px solid var(--edu-border)",
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>
              Practice unavailable
            </strong>

            <span className="edu-text-secondary">
              {message}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
