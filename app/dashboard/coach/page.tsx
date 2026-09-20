"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type CoachContext = {
  performance: {
    totalAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    accuracy: number;
  };
  weakAreas: {
    topicId: string;
    accuracy: number;
    questions: number;
  }[];
  strongAreas: {
    topicId: string;
    accuracy: number;
    questions: number;
  }[];
};

export default function CoachPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<CoachContext | null>(null);
  const [error, setError] = useState("");

  async function askCoach() {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/academic/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to contact JAMB Coach.",
        );
      }

      setContext(data.coachContext);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {});
    return unsubscribe;
  }, []);

  return (
    <main className="edu-page">
      <div className="edu-page-header">
        <div>
          <p className="edu-eyebrow">PREPARATION</p>
          <h1>AI JAMB Coach</h1>
          <p className="edu-muted">
            Get personalised academic guidance based on your
            JAMBMASTER performance.
          </p>
        </div>
      </div>

      <section className="edu-card" style={{ marginTop: 24 }}>
        <h2>What do you want help with?</h2>

        <textarea
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          placeholder="Ask about a topic, your performance, study strategy, or what you should revise next..."
          rows={6}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            border: "1px solid var(--edu-border)",
            resize: "vertical",
            font: "inherit",
            background: "var(--edu-surface)",
            color: "var(--edu-text)",
          }}
        />

        <button
          type="button"
          onClick={askCoach}
          disabled={!message.trim() || loading}
          className="edu-button edu-button-primary"
          style={{ marginTop: 16 }}
        >
          {loading ? "Analysing..." : "Ask JAMB Coach"}
        </button>

        {error && (
          <p
            style={{
              marginTop: 16,
              color: "var(--edu-danger)",
            }}
          >
            {error}
          </p>
        )}
      </section>

      {context && (
        <section
          className="edu-card"
          style={{ marginTop: 20 }}
        >
          <h2>Your Academic Snapshot</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            <div className="edu-card">
              <strong>{context.performance.accuracy}%</strong>
              <p className="edu-muted">Accuracy</p>
            </div>

            <div className="edu-card">
              <strong>
                {context.performance.totalAttempts}
              </strong>
              <p className="edu-muted">Attempts</p>
            </div>

            <div className="edu-card">
              <strong>
                {context.performance.totalQuestions}
              </strong>
              <p className="edu-muted">Questions</p>
            </div>

            <div className="edu-card">
              <strong>
                {context.performance.totalCorrect}
              </strong>
              <p className="edu-muted">Correct</p>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3>Areas to Improve</h3>

            {context.weakAreas.length === 0 ? (
              <p className="edu-muted">
                Not enough performance data yet.
              </p>
            ) : (
              <ul>
                {context.weakAreas.map((area) => (
                  <li key={area.topicId}>
                    {area.topicId} — {area.accuracy}% accuracy
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <h3>Strong Areas</h3>

            {context.strongAreas.length === 0 ? (
              <p className="edu-muted">
                Keep practising to build enough performance
                data.
              </p>
            ) : (
              <ul>
                {context.strongAreas.map((area) => (
                  <li key={area.topicId}>
                    {area.topicId} — {area.accuracy}% accuracy
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
