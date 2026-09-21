"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowUp,
  Bot,
  Brain,
  Check,
  Copy,
  Loader2,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";
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

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function formatResponse(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br />");
}

const suggestions = [
  {
    icon: Brain,
    title: "Teach me a topic",
    prompt:
      "Teach me Photosynthesis from the basics and focus on what I need to know for JAMB.",
  },
  {
    icon: Target,
    title: "Quiz me",
    prompt:
      "Give me 5 JAMB-style Biology questions. Ask them one at a time and don't reveal the answer until I respond.",
  },
  {
    icon: Sparkles,
    title: "Create a study plan",
    prompt:
      "Create a practical 7-day JAMB study plan for me based on my current performance.",
  },
];

export default function CoachPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<CoachContext | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previousInteractionId, setPreviousInteractionId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {});
    return unsubscribe;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  function handleInput(value: string) {
    setMessage(value);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }

  async function askCoach(prompt?: string) {
    const userMessage = (prompt ?? message).trim();

    if (!userMessage || loading) return;

    setMessage("");
    setError("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessageId = `${Date.now()}-user`;
    const assistantMessageId = `${Date.now()}-assistant`;

    setMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: "user",
        content: userMessage,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);

    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      const response = await fetch("/api/academic/coach/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          previousInteractionId,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "Unable to contact JAMB Coach.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event
            .split("\n")
            .find((item) => item.startsWith("data: "));

          if (!line) continue;

          const raw = line.slice(6);

          if (raw === "[DONE]") continue;

          try {
            const data = JSON.parse(raw);

            if (data.type === "text" && data.text) {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantMessageId
                    ? {
                        ...item,
                        content: item.content + data.text,
                      }
                    : item,
                ),
              );
            }

            if (
              data.type === "complete" &&
              data.interactionId
            ) {
              setPreviousInteractionId(data.interactionId);
            }

            if (data.type === "error") {
              throw new Error(
                data.error || "AI stream failed.",
              );
            }
          } catch (parseError) {
            if (
              parseError instanceof Error &&
              parseError.message === "AI stream failed."
            ) {
              throw parseError;
            }
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      setMessages((current) =>
        current.filter(
          (item) =>
            item.id !== assistantMessageId ||
            item.content.trim(),
        ),
      );

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askCoach();
  }

  async function copyMessage(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1800);
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  }

  return (
    <main
      className="min-h-[calc(100vh-68px)]"
      style={{
        background: "var(--edu-app-bg)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-68px)] w-full max-w-6xl flex-col">
        {/* Header */}
        <header
          className="sticky top-0 z-20 border-b px-4 py-4 backdrop-blur-xl sm:px-6"
          style={{
            background: "color-mix(in srgb, var(--edu-surface) 92%, transparent)",
            borderColor: "var(--edu-border)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--edu-primary), var(--edu-primary-dark))",
                  color: "#fff",
                }}
              >
                <Sparkles size={21} strokeWidth={2.4} />
              </div>

              <div className="min-w-0">
                <h1
                  className="truncate text-base font-black sm:text-lg"
                  style={{ color: "var(--edu-text)" }}
                >
                  JAMBMASTER AI Coach
                </h1>
                <p
                  className="truncate text-xs sm:text-sm"
                  style={{ color: "var(--edu-text-secondary)" }}
                >
                  Your personal JAMB study companion
                </p>
              </div>
            </div>

            {context && (
              <div
                className="hidden shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold sm:flex"
                style={{
                  borderColor: "var(--edu-border)",
                  background: "var(--edu-surface)",
                  color: "var(--edu-text-secondary)",
                }}
              >
                <Target size={14} />
                {context.performance.accuracy}% accuracy
              </div>
            )}
          </div>
        </header>

        {/* Conversation */}
        <section className="flex-1 px-3 pb-32 pt-6 sm:px-6 sm:pt-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--edu-primary), var(--edu-primary-dark))",
                  color: "#fff",
                  boxShadow: "var(--edu-shadow-lg)",
                }}
              >
                <Bot size={30} />
              </div>

              <h2
                className="text-3xl font-black tracking-tight sm:text-4xl"
                style={{ color: "var(--edu-text)" }}
              >
                How can I help you study?
              </h2>

              <p
                className="mt-3 max-w-xl text-sm leading-6 sm:text-base"
                style={{ color: "var(--edu-text-secondary)" }}
              >
                Ask me about JAMB subjects, difficult topics,
                practice questions, revision strategies, or your
                academic performance.
              </p>

              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
                {suggestions.map((suggestion) => {
                  const Icon = suggestion.icon;

                  return (
                    <button
                      key={suggestion.title}
                      type="button"
                      onClick={() => askCoach(suggestion.prompt)}
                      className="group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        background: "var(--edu-surface)",
                        borderColor: "var(--edu-border)",
                      }}
                    >
                      <Icon
                        size={19}
                        className="mb-3"
                        style={{ color: "var(--edu-primary)" }}
                      />

                      <span
                        className="block text-sm font-black"
                        style={{ color: "var(--edu-text)" }}
                      >
                        {suggestion.title}
                      </span>

                      <span
                        className="mt-1 block text-xs leading-5"
                        style={{ color: "var(--edu-text-secondary)" }}
                      >
                        {suggestion.title === "Teach me a topic"
                          ? "Understand difficult concepts"
                          : suggestion.title === "Quiz me"
                            ? "Test your JAMB knowledge"
                            : "Plan your preparation"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-7">
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      item.role === "user"
                        ? "flex max-w-[88%] items-start gap-3 sm:max-w-[78%]"
                        : "flex w-full items-start gap-3"
                    }
                  >
                    {item.role === "assistant" && (
                      <div
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: "var(--edu-primary-soft)",
                          color: "var(--edu-primary)",
                        }}
                      >
                        <Bot size={18} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div
                        className={
                          item.role === "user"
                            ? "rounded-3xl rounded-tr-md px-4 py-3.5 shadow-sm"
                            : "rounded-2xl px-1 py-1"
                        }
                        style={
                          item.role === "user"
                            ? {
                                background: "var(--edu-primary)",
                                color: "#fff",
                              }
                            : {
                                color: "var(--edu-text)",
                              }
                        }
                      >
                        {item.role === "assistant" ? (
                          <div
                            className="prose prose-sm max-w-none leading-7 sm:text-[15px]"
                            style={{
                              color: "var(--edu-text)",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: formatResponse(item.content),
                            }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {item.content}
                          </p>
                        )}
                      </div>

                      {item.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() =>
                            copyMessage(item.id, item.content)
                          }
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors hover:bg-black/5"
                          style={{
                            color: "var(--edu-text-muted)",
                          }}
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check size={13} />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {item.role === "user" && (
                      <div
                        className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex"
                        style={{
                          background: "var(--edu-surface-muted)",
                          color: "var(--edu-text-secondary)",
                        }}
                      >
                        <User size={18} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--edu-primary-soft)",
                      color: "var(--edu-primary)",
                    }}
                  >
                    <Bot size={18} />
                  </div>

                  <div
                    className="flex items-center gap-2 rounded-2xl px-2 py-2"
                    style={{ color: "var(--edu-text-secondary)" }}
                  >
                    <Loader2
                      size={17}
                      className="animate-spin"
                      style={{ color: "var(--edu-primary)" }}
                    />
                    <span className="text-sm font-semibold">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="flex items-start gap-3 rounded-2xl border p-4"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--edu-danger) 25%, var(--edu-border))",
                    background:
                      "color-mix(in srgb, var(--edu-danger) 5%, var(--edu-surface))",
                    color: "var(--edu-danger)",
                  }}
                >
                  <X size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">
                      Something went wrong
                    </p>
                    <p className="mt-1 text-sm opacity-90">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        {/* Composer */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t px-3 pb-3 pt-3 backdrop-blur-xl sm:px-6 sm:pb-5"
          style={{
            background:
              "color-mix(in srgb, var(--edu-app-bg) 88%, transparent)",
            borderColor: "var(--edu-border)",
          }}
        >
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSubmit}>
              <div
                className="flex items-end gap-2 rounded-3xl border p-2 shadow-lg"
                style={{
                  background: "var(--edu-surface)",
                  borderColor: "var(--edu-border-strong)",
                  boxShadow: "var(--edu-shadow-lg)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(event) =>
                    handleInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      askCoach();
                    }
                  }}
                  placeholder="Ask JAMBMASTER anything..."
                  rows={1}
                  maxLength={2000}
                  disabled={loading}
                  className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:ring-0 sm:text-[15px]"
                  style={{
                    color: "var(--edu-text)",
                  }}
                />

                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: "var(--edu-primary)",
                    color: "#fff",
                  }}
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2 size={19} className="animate-spin" />
                  ) : (
                    <ArrowUp size={20} strokeWidth={2.6} />
                  )}
                </button>
              </div>
            </form>

            <p
              className="mt-2 text-center text-[10px] sm:text-xs"
              style={{ color: "var(--edu-text-muted)" }}
            >
              JAMBMASTER AI can make mistakes. Always verify
              important academic information.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
