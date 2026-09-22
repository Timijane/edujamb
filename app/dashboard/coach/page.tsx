"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  Copy,
  History,
  Loader2,
  Menu,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  User,
  X,
} from "lucide-react";
import { auth } from "@/lib/firebase";

type Citation = {
  title: string;
  url: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type Conversation = {
  id: string;
  title: string;
  lastMessage?: string;
  lastRole?: string;
  interactionId?: string | null;
  archived?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const suggestions = [
  {
    icon: Sparkles,
    title: "Teach me a topic",
    text: "Teach me quadratic equations from the beginning.",
  },
  {
    icon: Target,
    title: "Quiz me",
    text: "Quiz me with JAMB-style questions on my weak areas.",
  },
  {
    icon: History,
    title: "Create a study plan",
    text: "Create a practical JAMB study plan for me.",
  },
];

function formatResponse(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

async function getToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user.getIdToken();
}

export default function CoachPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [previousInteractionId, setPreviousInteractionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    void loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setHistoryLoading(true);

      const token = await getToken();

      const response = await fetch(
        "/api/academic/coach/conversations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load conversations.");
      }

      setConversations(data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function createConversation() {
    const token = await getToken();

    const response = await fetch(
      "/api/academic/coach/conversations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New conversation",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to create conversation.");
    }

    return data.conversation;
  }

  async function startNewChat() {
    if (loading) return;

    setConversationId("");
    setPreviousInteractionId("");
    setMessages([]);
    setMessage("");
    setError("");
    setDrawerOpen(false);
    setEditingId("");
    setEditingTitle("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  async function openConversation(id: string) {
    if (loading || conversationId === id) {
      setDrawerOpen(false);
      return;
    }

    try {
      setConversationLoading(true);
      setError("");

      const token = await getToken();

      const response = await fetch(
        `/api/academic/coach/conversations/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load conversation.");
      }

      setConversationId(id);
      setPreviousInteractionId(
        data.conversation?.interactionId || "",
      );

      const loadedMessages: Message[] = (data.messages || []).map(
        (item: Message) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          citations: Array.isArray(item.citations)
            ? item.citations
            : [],
        }),
      );

      setMessages(loadedMessages);
      setDrawerOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load conversation.",
      );
    } finally {
      setConversationLoading(false);
    }
  }

  async function renameConversation(id: string) {
    const title = editingTitle.trim();

    if (!title) {
      setEditingId("");
      return;
    }

    try {
      const token = await getToken();

      const response = await fetch(
        `/api/academic/coach/conversations/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "rename",
            title,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to rename conversation.");
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id
            ? { ...conversation, title }
            : conversation,
        ),
      );

      setEditingId("");
      setEditingTitle("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to rename conversation.",
      );
    }
  }

  async function archiveConversation(id: string) {
    if (loading) return;

    try {
      const token = await getToken();

      const response = await fetch(
        `/api/academic/coach/conversations/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "archive",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to archive conversation.");
      }

      setConversations((current) =>
        current.filter((conversation) => conversation.id !== id),
      );

      if (conversationId === id) {
        await startNewChat();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive conversation.",
      );
    }
  }

  async function sendMessage(
    event?: FormEvent,
    forcedMessage?: string,
  ) {
    event?.preventDefault();

    const text = (forcedMessage ?? message).trim();

    if (!text || loading) return;

    setMessage("");
    setError("");
    setLoading(true);
    const assistantId = `assistant-${Date.now()}`;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const token = await getToken();

      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const conversation = await createConversation();

        activeConversationId = conversation.id;

        setConversationId(activeConversationId);

        setConversations((current) => [
          {
            id: conversation.id,
            title: conversation.title,
            archived: false,
          },
          ...current,
        ]);
      }


      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          citations: [],
        },
      ]);

      const response = await fetch(
        "/api/academic/coach/stream",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            message: text,
            conversationId: activeConversationId,
            previousInteractionId:
              previousInteractionId || undefined,
          }),
        },
      );

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.error ||
            data.message ||
            "Unable to connect to AI Coach.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const events = buffer.split("\n\n");

        buffer = events.pop() || "";

        for (const rawEvent of events) {
          const line = rawEvent
            .split("\n")
            .find((item) => item.startsWith("data:"));

          if (!line) continue;

          const payload = line.replace(/^data:\s*/, "");

          if (payload === "[DONE]") continue;

          let data: {
            type?: string;
            text?: string;
            interactionId?: string;
            citations?: Citation[];
            message?: string;
          };

          try {
            data = JSON.parse(payload);
          } catch {
            continue;
          }

          if (data.type === "text" && data.text) {
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId
                  ? {
                      ...item,
                      content: item.content + data.text,
                    }
                  : item,
              ),
            );
          }

          if (data.type === "citations" && data.citations) {
            setMessages((current) =>
              current.map((item) => {
                if (item.id !== assistantId) return item;

                const existing = item.citations || [];

                const merged = [
                  ...existing,
                  ...data.citations!,
                ].filter(
                  (citation, index, array) =>
                    array.findIndex(
                      (item) => item.url === citation.url,
                    ) === index,
                );

                return {
                  ...item,
                  citations: merged,
                };
              }),
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
              data.message || "AI Coach stream failed.",
            );
          }
        }
      }

      await loadConversations();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      console.error("AI Coach frontend error:", err);

      setError(errorMessage);

      setMessages((current) =>
        current.filter(
          (item) =>
            item.id !== assistantId,
        ),
      );
    } finally {
      setLoading(false);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  async function copyMessage(item: Message) {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);

      window.setTimeout(() => {
        setCopiedId("");
      }, 1500);
    } catch {
      setError("Unable to copy response.");
    }
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] min-h-[620px] overflow-hidden bg-[#faf9f6] text-zinc-900">
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close history"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:relative lg:z-0 lg:translate-x-0 ${
          drawerOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Bot size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                JAMBMASTER
              </p>
              <p className="text-[11px] text-zinc-500">
                AI Coach
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
          >
            <Plus size={17} />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Recent conversations
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs leading-5 text-zinc-400">
              Your conversations will appear here.
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group rounded-xl ${
                    conversation.id === conversationId
                      ? "bg-zinc-100"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  {editingId === conversation.id ? (
                    <div className="p-2">
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(event) =>
                          setEditingTitle(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void renameConversation(
                              conversation.id,
                            );
                          }

                          if (event.key === "Escape") {
                            setEditingId("");
                          }
                        }}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs outline-none focus:border-zinc-900"
                      />

                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void renameConversation(
                              conversation.id,
                            )
                          }
                          className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-white"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingId("")}
                          className="rounded-md px-2 py-1 text-[11px] text-zinc-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          void openConversation(conversation.id)
                        }
                        className="min-w-0 flex-1 px-3 py-3 text-left"
                      >
                        <p className="truncate text-xs font-medium text-zinc-800">
                          {conversation.title ||
                            "New conversation"}
                        </p>

                        {conversation.lastMessage && (
                          <p className="mt-1 truncate text-[11px] text-zinc-400">
                            {conversation.lastMessage}
                          </p>
                        )}
                      </button>

                      <div className="mr-1 hidden items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => {
                            setEditingId(conversation.id);
                            setEditingTitle(
                              conversation.title,
                            );
                          }}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-800"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          title="Archive"
                          onClick={() =>
                            void archiveConversation(
                              conversation.id,
                            )
                          }
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-white hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <h1 className="text-sm font-semibold sm:text-base">
                AI Coach
              </h1>
              <p className="text-[11px] text-zinc-400 sm:text-xs">
                Your personal JAMB study companion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:flex"
          >
            <Plus size={15} />
            New chat
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {conversationLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading conversation...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-5 py-10 sm:px-8">
              <div className="mx-auto w-full max-w-2xl">
                <div className="mb-7 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg">
                    <Sparkles size={25} />
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    What are we learning today?
                  </h2>

                  <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">
                    Ask me to teach a JAMB topic, explain a question,
                    create a study plan, quiz you, or analyse your
                    performance.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {suggestions.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() =>
                          void sendMessage(undefined, item.text)
                        }
                        className="rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                      >
                        <Icon
                          size={18}
                          className="mb-3 text-zinc-700"
                        />
                        <p className="text-xs font-semibold">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                          {item.text}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
              <div className="space-y-7">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 ${
                      item.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {item.role === "assistant" && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
                        <Bot size={15} />
                      </div>
                    )}

                    <div
                      className={`min-w-0 max-w-[88%] ${
                        item.role === "user"
                          ? "rounded-2xl rounded-br-md bg-zinc-900 px-4 py-3 text-white"
                          : "flex-1"
                      }`}
                    >
                      {item.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {item.content}
                        </p>
                      ) : (
                        <div>
                          <div
                            className="prose prose-sm max-w-none text-zinc-800 prose-headings:mb-2 prose-headings:mt-4 prose-p:my-2 prose-li:my-0.5"
                            dangerouslySetInnerHTML={{
                              __html:
                                formatResponse(item.content),
                            }}
                          />

                          {item.content && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void copyMessage(item)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
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
                            </div>
                          )}

                          {item.citations &&
                            item.citations.length > 0 && (
                              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                  Sources
                                </p>

                                <div className="space-y-1.5">
                                  {item.citations.map(
                                    (citation, index) => (
                                      <a
                                        key={`${citation.url}-${index}`}
                                        href={citation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate rounded-lg px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                      >
                                        {citation.title}
                                      </a>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {item.role === "user" && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-200 text-zinc-600">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
                      <Bot size={15} />
                    </div>

                    <div className="flex items-center gap-2 py-2 text-xs text-zinc-400">
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 bg-[#faf9f6] px-3 pb-3 pt-3 sm:px-6 sm:pb-5">
          <div className="mx-auto max-w-3xl">
            {error && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => setError("")}
                  className="p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form
              onSubmit={(event) => void sendMessage(event)}
              className="relative rounded-2xl border border-zinc-300 bg-white shadow-sm focus-within:border-zinc-500"
            >
              <textarea
                ref={inputRef}
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask JAMBMASTER AI Coach..."
                rows={1}
                disabled={loading}
                className="max-h-32 min-h-[52px] w-full resize-none bg-transparent px-4 py-4 pr-14 text-sm outline-none placeholder:text-zinc-400"
              />

              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <ArrowUp size={17} />
                )}
              </button>
            </form>

            <p className="mt-2 text-center text-[10px] text-zinc-400">
              JAMBMASTER AI Coach can make mistakes. Verify
              important current exam information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
