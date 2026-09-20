"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Subject = {
  id: string;
  name: string;
};

type Question = {
  id: string;
  question: string;
  options: string[];
};

type Battle = {
  id: string;
  participantIds: string[];
  questionCount: number;
  status: string;
  scores: Record<string, number>;
};

export default function BattlePage() {
  const [token, setToken] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [battleId, setBattleId] = useState("");
  const [joinId, setJoinId] = useState("");

  const [battle, setBattle] = useState<Battle | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState<number | null>(null);

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
          const loaded = data.subjects || [];
          setSubjects(loaded);

          if (loaded.length) {
            setSubjectId(loaded[0].id);
          }
        }
      } catch {
        setMessage("Unable to load your subjects.");
      }
    });
  }, []);

  async function createBattle() {
    if (!token || !subjectId) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/academic/battle",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
            subjectId,
            questionCount: Number(questionCount),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to create battle.",
        );
      }

      setBattleId(data.battleId);
      await loadBattle(data.battleId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create battle.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function joinBattle() {
    if (!token || !joinId.trim()) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/academic/battle",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "join",
            battleId: joinId.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to join battle.",
        );
      }

      setBattleId(data.battleId);
      await loadBattle(data.battleId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to join battle.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function startBattle() {
    if (!battleId) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/academic/battle",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "start",
            battleId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start battle.",
        );
      }

      await loadBattle(battleId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start battle.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBattle(id: string) {
    const response = await fetch(
      "/api/academic/battle",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get",
          battleId: id,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to load battle.",
      );
    }

    setBattle(data.battle);
    setQuestions(data.questions || []);
    setAnswers({});
    setCurrent(0);
  }

  async function submitBattle() {
    if (!battleId || !questions.length) return;

    try {
      setLoading(true);
      setMessage("");

      const submittedAnswers = questions
        .map((question) => ({
          questionId: question.id,
          selectedOption:
            answers[question.id] ?? -1,
        }))
        .filter(
          (answer) =>
            answer.selectedOption >= 0 &&
            answer.selectedOption <= 3,
        );

      if (!submittedAnswers.length) {
        throw new Error(
          "Answer at least one question.",
        );
      }

      const response = await fetch(
        "/api/academic/battle",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "submit",
            battleId,
            answers: submittedAnswers,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to submit battle.",
        );
      }

      setScore(data.score);
      setBattle((previous) =>
        previous
          ? {
              ...previous,
              scores: {
                ...previous.scores,
                [auth.currentUser?.uid || ""]:
                  data.score,
              },
            }
          : previous,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit battle.",
      );
    } finally {
      setLoading(false);
    }
  }

  const question = questions[current];

  if (!battle) {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div style={{ marginBottom: 24 }}>
            <h1>Battle Challenge</h1>
            <p className="edu-text-secondary">
              Challenge other students using the same
              JAMB question bank.
            </p>
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
              <h2>Create Battle</h2>

              <label
                style={{
                  display: "block",
                  marginTop: 18,
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
                {subjects.map((subject) => (
                  <option
                    key={subject.id}
                    value={subject.id}
                  >
                    {subject.name}
                  </option>
                ))}
              </select>

              <label
                style={{
                  display: "block",
                  marginTop: 18,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Questions
              </label>

              <select
                value={questionCount}
                onChange={(event) =>
                  setQuestionCount(event.target.value)
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
                <option value="5">5 Questions</option>
                <option value="10">10 Questions</option>
                <option value="15">15 Questions</option>
                <option value="20">20 Questions</option>
              </select>

              <button
                className="edu-button"
                onClick={createBattle}
                disabled={loading || !subjectId}
                style={{ marginTop: 20 }}
              >
                Create Battle
              </button>
            </section>

            <section
              className="edu-surface"
              style={{ padding: 24 }}
            >
              <h2>Join Battle</h2>

              <p className="edu-text-secondary">
                Enter the Battle ID shared by another
                student.
              </p>

              <input
                value={joinId}
                onChange={(event) =>
                  setJoinId(event.target.value)
                }
                placeholder="Enter Battle ID"
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
              />

              <button
                className="edu-button"
                onClick={joinBattle}
                disabled={
                  loading || !joinId.trim()
                }
                style={{ marginTop: 20 }}
              >
                Join Battle
              </button>
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (battle.status === "waiting") {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div
            className="edu-surface"
            style={{
              maxWidth: 700,
              margin: "40px auto",
              padding: 32,
              textAlign: "center",
            }}
          >
            <p className="edu-text-secondary">
              Battle ID
            </p>

            <h1>{battle.id}</h1>

            <p>
              Share this ID with the students you want
              to challenge.
            </p>

            <p className="edu-text-secondary">
              Participants:{" "}
              {battle.participantIds.length} / 20
            </p>

            <button
              className="edu-button"
              onClick={startBattle}
              disabled={loading}
              style={{ marginTop: 20 }}
            >
              Start Battle
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (score !== null) {
    return (
      <main className="edu-app">
        <div className="edu-content">
          <div
            className="edu-surface"
            style={{
              maxWidth: 700,
              margin: "40px auto",
              padding: 32,
              textAlign: "center",
            }}
          >
            <p className="edu-text-secondary">
              Battle Complete
            </p>

            <h1>Your Score</h1>

            <strong style={{ fontSize: 56 }}>
              {score}
            </strong>

            <p className="edu-text-secondary">
              out of {battle.questionCount}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="edu-app">
      <div className="edu-content">
        <div
          className="edu-surface"
          style={{
            padding: 20,
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <strong>
            Question {current + 1} of{" "}
            {questions.length}
          </strong>

          <strong>
            Players:{" "}
            {battle.participantIds.length}
          </strong>
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

        {question && (
          <>
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
                          answers[question.id] ===
                          index
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
                display: "flex",
                justifyContent:
                  "space-between",
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
                  onClick={submitBattle}
                  disabled={loading}
                >
                  Submit Battle
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
        )}
      </div>
    </main>
  );
}
