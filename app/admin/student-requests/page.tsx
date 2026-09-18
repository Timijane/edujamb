"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  STUDENT_REQUEST_STATUS_LABELS,
  STUDENT_REQUEST_TYPE_LABELS,
  type StudentRequest,
  type StudentRequestStatus,
  type StudentRequestType,
} from "@/lib/student-request-types";

export default function StudentRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState("");
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/staff/login?error=portal";
        return;
      }

      try {
        const snapshot = await getDocs(
          query(
            collection(db, "studentRequests"),
            orderBy("submittedAt", "desc")
          )
        );

        const loaded = snapshot.docs.map(
          (item) =>
            item.data() as StudentRequest
        );

        setRequests(loaded);
      } catch (requestError) {
        console.error(requestError);
        setError("Unable to load student requests.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function reviewRequest(
    requestId: string,
    decision: "approved" | "denied"
  ) {
    const user = auth.currentUser;

    if (!user) {
      window.location.href = "/staff/login?error=portal";
      return;
    }

    setProcessingId(requestId);
    setError("");

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        "/api/admin/student-requests/review",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            decision,
            adminNote: adminNote[requestId] ?? "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to review request."
        );
      }

      setRequests((current) =>
        current.map((item) =>
          item.requestId === requestId
            ? {
                ...item,
                status: decision,
                adminNote:
                  adminNote[requestId] ?? "",
              }
            : item
        )
      );
    } catch (reviewError) {
      console.error(reviewError);

      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review request."
      );
    } finally {
      setProcessingId("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-slate-400">
            Loading student requests...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-400">
              Super Admin
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Student Requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Review student requests that require administrative
              approval before changes are applied.
            </p>
          </div>

          <a
            href="/admin"
            className="inline-flex w-fit rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Back to Admin
          </a>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {(
            ["pending", "approved", "denied"] as StudentRequestStatus[]
          ).map((status) => (
            <div
              key={status}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                {STUDENT_REQUEST_STATUS_LABELS[status]}
              </p>

              <p className="mt-2 text-3xl font-black">
                {
                  requests.filter(
                    (request) => request.status === status
                  ).length
                }
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <p className="font-bold text-slate-300">
                No student requests yet.
              </p>
            </div>
          ) : (
            requests.map((request) => {
              const pending = request.status === "pending";
              const type =
                request.type as StudentRequestType;

              return (
                <article
                  key={request.requestId}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
                          {STUDENT_REQUEST_TYPE_LABELS[type] ??
                            request.type}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                          {STUDENT_REQUEST_STATUS_LABELS[
                            request.status
                          ] ?? request.status}
                        </span>
                      </div>

                      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Student ID
                      </p>

                      <p className="mt-1 break-all font-mono text-sm text-slate-300">
                        {request.studentId}
                      </p>
                    </div>

                    {pending && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={processingId === request.requestId}
                          onClick={() =>
                            reviewRequest(
                              request.requestId,
                              "approved"
                            )
                          }
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={processingId === request.requestId}
                          onClick={() =>
                            reviewRequest(
                              request.requestId,
                              "denied"
                            )
                          }
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Current Value
                      </p>

                      <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
                        {JSON.stringify(
                          request.currentValue,
                          null,
                          2
                        )}
                      </pre>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Requested Value
                      </p>

                      <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
                        {JSON.stringify(
                          request.requestedValue,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Student Reason
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {request.reason}
                    </p>
                  </div>

                  {pending && (
                    <div className="mt-4">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Admin Note
                      </label>

                      <textarea
                        value={adminNote[request.requestId] ?? ""}
                        onChange={(event) =>
                          setAdminNote((current) => ({
                            ...current,
                            [request.requestId]:
                              event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Optional note for the student..."
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                      />
                    </div>
                  )}

                  {request.adminNote && !pending && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Admin Note
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {request.adminNote}
                      </p>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
