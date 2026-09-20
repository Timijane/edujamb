"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Analytics = {
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  modes: {
    mode: string;
    attempts: number;
    questions: number;
    correct: number;
    accuracy: number;
  }[];
  weakAreas: {
    topicId: string;
    questions: number;
    correct: number;
    accuracy: number;
  }[];
  strongAreas: {
    topicId: string;
    questions: number;
    correct: number;
    accuracy: number;
  }[];
};

const MODE_NAMES: Record<string, string> = {
  cbt: "CBT Practice",
  past_questions: "Past Questions",
  mock: "Mock Exams",
  battle: "Battle",
};

export default function AnalyticsPage() {
  const [token, setToken] = useState("");
  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        setToken(idToken);

        const response = await fetch(
          "/api/academic/analytics",
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load performance.",
          );
        }

        setAnalytics(data.analytics);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load performance.",
        );
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div
            className="edu-surface"
            style={{ padding: 30 }}
          >
            Loading performance...
          </div>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div
            className="edu-surface"
            style={{ padding: 30 }}
          >
            {message}
          </div>
        </div>
      </main>
    );
  }

  if (!analytics) return null;

  return (
    <main className="edu-app">
      <div className="edu-content">
        <div style={{ marginBottom: 24 }}>
          <h1>Performance & Analytics</h1>

          <p className="edu-text-secondary">
            Track your preparation, accuracy and areas
            that need more attention.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Overall Accuracy"
            value={`${analytics.accuracy}%`}
          />

          <StatCard
            label="Attempts"
            value={String(analytics.totalAttempts)}
          />

          <StatCard
            label="Questions"
            value={String(analytics.totalQuestions)}
          />

          <StatCard
            label="Correct"
            value={String(analytics.totalCorrect)}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          <section
            className="edu-surface"
            style={{ padding: 24 }}
          >
            <h2>Performance by Mode</h2>

            {analytics.modes.length === 0 ? (
              <p className="edu-text-secondary">
                Complete a practice session to see
                performance data.
              </p>
            ) : (
              analytics.modes.map((item) => (
                <div
                  key={item.mode}
                  style={{
                    padding: "16px 0",
                    borderBottom:
                      "1px solid var(--edu-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                    }}
                  >
                    <strong>
                      {MODE_NAMES[item.mode] ||
                        item.mode}
                    </strong>

                    <strong>
                      {item.accuracy}%
                    </strong>
                  </div>

                  <p
                    className="edu-text-secondary"
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    {item.correct} /{" "}
                    {item.questions} correct ·{" "}
                    {item.attempts} attempt
                    {item.attempts === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
              ))
            )}
          </section>

          <section
            className="edu-surface"
            style={{ padding: 24 }}
          >
            <h2>Areas to Improve</h2>

            {analytics.weakAreas.length === 0 ? (
              <p className="edu-text-secondary">
                No weak areas detected yet.
              </p>
            ) : (
              analytics.weakAreas
                .slice(0, 8)
                .map((item) => (
                  <div
                    key={item.topicId}
                    style={{
                      padding: "16px 0",
                      borderBottom:
                        "1px solid var(--edu-border)",
                    }}
                  >
                    <strong>
                      Topic {item.topicId}
                    </strong>

                    <p
                      className="edu-text-secondary"
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {item.accuracy}% accuracy ·{" "}
                      {item.correct} /{" "}
                      {item.questions} correct
                    </p>
                  </div>
                ))
            )}
          </section>

          <section
            className="edu-surface"
            style={{ padding: 24 }}
          >
            <h2>Strong Areas</h2>

            {analytics.strongAreas.length === 0 ? (
              <p className="edu-text-secondary">
                Keep practising to build your
                performance record.
              </p>
            ) : (
              analytics.strongAreas
                .slice(0, 8)
                .map((item) => (
                  <div
                    key={item.topicId}
                    style={{
                      padding: "16px 0",
                      borderBottom:
                        "1px solid var(--edu-border)",
                    }}
                  >
                    <strong>
                      Topic {item.topicId}
                    </strong>

                    <p
                      className="edu-text-secondary"
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {item.accuracy}% accuracy ·{" "}
                      {item.correct} /{" "}
                      {item.questions} correct
                    </p>
                  </div>
                ))
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="edu-surface"
      style={{ padding: 22 }}
    >
      <p
        className="edu-text-secondary"
        style={{ margin: 0 }}
      >
        {label}
      </p>

      <strong
        style={{
          display: "block",
          fontSize: 30,
          marginTop: 8,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
