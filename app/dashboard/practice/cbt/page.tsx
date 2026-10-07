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

const CBT_LIMIT = 20;
const CBT_TIME = 30 * 60;

export default function CbtPracticePage() {
  const [token, setToken] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(CBT_TIME);

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
          mode: "cbt",
          subjectIds: [subjectId],
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
      setSeconds(CBT_TIME);

      const start = new Date().toISOString();
      setStartedAt(start);

      const response = await fetch("/api/academic/engine", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "questions",
          mode: "cbt",
          subjectId,
          limit: CBT_LIMIT,
          category: "Practice",
        }),
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
              CBT Practice
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
                setAnswers({});
                setCurrent(0);
                setSeconds(CBT_TIME);
              }}
            >
              Back to CBT Practice
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
              ← Exit CBT
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
                {loading ? "Submitting..." : "Submit CBT"}
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
        <section style={{ padding: "12px 0 28px" }}>
          <p
            style={{
              color: "var(--edu-primary)",
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 13,
              letterSpacing: "0.06em",
            }}
          >
            CBT PRACTICE
          </p>

          <h1
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              margin: "0 0 10px",
              letterSpacing: "-0.025em",
            }}
          >
            Test your knowledge.
          </h1>

          <p
            className="edu-text-secondary"
            style={{
              maxWidth: 680,
              fontSize: 16,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Choose a subject and begin a timed CBT practice session.
          </p>
        </section>

        <section
          className="edu-surface"
          style={{
            padding: 24,
            borderRadius: "var(--edu-radius-lg)",
            border: "1px solid var(--edu-border)",
            marginBottom: 18,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 6px" }}>Practice setup</h2>

            <p className="edu-text-secondary" style={{ margin: 0 }}>
              Your session will contain 20 questions with a 30-minute time
              limit.
            </p>
          </div>

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
                maxWidth: 520,
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

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--edu-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>CBT Practice</strong>

              <p
                className="edu-text-secondary"
                style={{ margin: "4px 0 0", fontSize: 14 }}
              >
                20 questions · 30 minutes
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
              {loading ? "Preparing..." : "Start CBT"}
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

            <span className="edu-text-secondary">{message}</span>
          </div>
        )}
      </div>
    </main>
  );
}
