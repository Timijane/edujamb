"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

type Topic = {
  id: string;
  title: string;
  description: string;
  order: number;
};

type Subject = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  topics: Topic[];
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSubjects() {
      try {
        const user = auth.currentUser;

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const token = await user.getIdToken();

        const response = await fetch("/api/student/subjects", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load subjects.");
        }

        if (mounted) {
          setSubjects(data.subjects || []);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your subjects."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSubjects();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="edu-page">
        <div className="edu-content">
          <div className="edu-surface" style={{ padding: 24 }}>
            Loading your subjects...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="edu-page">
        <div className="edu-content">
          <div className="edu-surface" style={{ padding: 24 }}>
            <h1>My Subjects</h1>
            <p style={{ color: "var(--edu-danger)", marginTop: 8 }}>
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="edu-page">
      <div
        className="edu-content"
        style={{
          maxWidth: "var(--edu-content-max)",
          margin: "0 auto",
          padding: "28px 20px 60px",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              color: "var(--edu-primary)",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Academic Preparation
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              margin: "6px 0 8px",
            }}
          >
            My Subjects
          </h1>

          <p style={{ color: "var(--edu-text-secondary)", margin: 0 }}>
            Your registered JAMB subjects and their published scheme of work.
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="edu-surface" style={{ padding: 32 }}>
            <h2>No published subjects yet</h2>
            <p
              style={{
                color: "var(--edu-text-secondary)",
                marginTop: 8,
              }}
            >
              Your academic content will appear here once your subjects and
              scheme of work have been published by the platform.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {subjects.map((subject) => {
              const isOpen = openSubject === subject.id;

              return (
                <section
                  key={subject.id}
                  className="edu-surface"
                  style={{
                    overflow: "hidden",
                    padding: 0,
                    border:
                      isOpen
                        ? "1px solid var(--edu-primary)"
                        : "1px solid var(--edu-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSubject(isOpen ? null : subject.id)
                    }
                    style={{
                      width: "100%",
                      border: 0,
                      background: "transparent",
                      padding: 22,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "inline-flex",
                            padding: "5px 9px",
                            borderRadius: 999,
                            background: "var(--edu-primary-soft)",
                            color: "var(--edu-primary)",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {subject.code}
                        </div>

                        <h2
                          style={{
                            margin: "12px 0 6px",
                            fontSize: 20,
                          }}
                        >
                          {subject.name}
                        </h2>

                        <p
                          style={{
                            margin: 0,
                            color: "var(--edu-text-secondary)",
                            fontSize: 14,
                          }}
                        >
                          {subject.topics.length} published topic
                          {subject.topics.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <span
                        style={{
                          fontSize: 22,
                          color: "var(--edu-text-muted)",
                        }}
                      >
                        {isOpen ? "−" : "+"}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        borderTop: "1px solid var(--edu-border)",
                        padding: 22,
                      }}
                    >
                      {subject.topics.length === 0 ? (
                        <p
                          style={{
                            color: "var(--edu-text-secondary)",
                            margin: 0,
                          }}
                        >
                          No published scheme-of-work topics yet.
                        </p>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {subject.topics.map((topic, index) => (
                            <div
                              key={topic.id}
                              style={{
                                display: "flex",
                                gap: 12,
                                padding: 14,
                                borderRadius:
                                  "var(--edu-radius-md)",
                                background:
                                  "var(--edu-surface-muted)",
                              }}
                            >
                              <strong
                                style={{
                                  color: "var(--edu-primary)",
                                  minWidth: 28,
                                }}
                              >
                                {index + 1}.
                              </strong>

                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {topic.title}
                                </div>

                                {topic.description && (
                                  <div
                                    style={{
                                      marginTop: 4,
                                      color:
                                        "var(--edu-text-secondary)",
                                      fontSize: 13,
                                    }}
                                  >
                                    {topic.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 18,
                        }}
                      >
                        <Link
                          href={`/dashboard/cbt?subject=${encodeURIComponent(
                            subject.slug
                          )}`}
                          className="edu-button edu-button-primary"
                        >
                          Practice Questions
                        </Link>

                        <Link
                          href={`/dashboard/resources?subject=${encodeURIComponent(
                            subject.slug
                          )}`}
                          className="edu-button edu-button-secondary"
                        >
                          View Resources
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
