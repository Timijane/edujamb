"use client";

import { useRouter } from "next/navigation";

type OverviewSubjectsCardProps = {
  subjects: string[];
  primaryColor: string;
  cardBorderColor: string;
  mutedTextColor: string;
};

export default function OverviewSubjectsCard({
  subjects,
  primaryColor,
  cardBorderColor,
  mutedTextColor,
}: OverviewSubjectsCardProps) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-950">
            My Subjects
          </h2>

          <p
            className="mt-1 text-sm"
            style={{
              color: mutedTextColor,
            }}
          >
            Your primary JAMB preparation subjects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/subjects")}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-black text-white transition hover:opacity-90"
          style={{
            background: primaryColor,
          }}
        >
          View all
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {subjects.map((subject, index) => (
          <div
            key={`${subject}-${index}`}
            className="flex items-center gap-3 rounded-2xl border p-4"
            style={{
              borderColor: cardBorderColor,
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black"
              style={{
                background: `${primaryColor}14`,
                color: primaryColor,
              }}
            >
              {index + 1}
            </span>

            <span className="min-w-0">
              <span className="block truncate font-black text-gray-950">
                {subject}
              </span>

              <span
                className="mt-0.5 block text-xs"
                style={{
                  color: mutedTextColor,
                }}
              >
                JAMB subject
              </span>
            </span>
          </div>
        ))}

        {subjects.length === 0 && (
          <div
            className="rounded-2xl border p-5 sm:col-span-2"
            style={{
              borderColor: cardBorderColor,
            }}
          >
            <p className="font-bold text-gray-950">
              Your subjects are not available yet.
            </p>

            <p
              className="mt-1 text-sm"
              style={{
                color: mutedTextColor,
              }}
            >
              Complete your student profile to set your four
              JAMB subjects.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
