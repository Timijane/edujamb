"use client";

import { useRouter } from "next/navigation";

type QuickAction = {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: string;
  enabled: boolean;
};

type OverviewQuickActionsProps = {
  primaryColor: string;
  cardBorderColor: string;
  mutedTextColor: string;
  features: {
    cbtPractice: boolean;
    pastQuestions: boolean;
    studyPlan: boolean;
    aiCoach: boolean;
  };
};

export default function OverviewQuickActions({
  primaryColor,
  cardBorderColor,
  mutedTextColor,
  features,
}: OverviewQuickActionsProps) {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      id: "cbt",
      label: "Start CBT",
      description: "Practice JAMB questions under exam conditions.",
      route: "/dashboard/practice",
      icon: "⌁",
      enabled: features.cbtPractice,
    },
    {
      id: "past-questions",
      label: "Past Questions",
      description: "Work through previous JAMB questions.",
      route: "/dashboard/past-questions",
      icon: "▧",
      enabled: features.pastQuestions,
    },
    {
      id: "study-plan",
      label: "Study Plan",
      description: "Organise what you should study next.",
      route: "/dashboard/study-plan",
      icon: "☷",
      enabled: features.studyPlan,
    },
    {
      id: "ai-coach",
      label: "AI JAMB Coach",
      description: "Get personalised preparation guidance.",
      route: "/dashboard/coach",
      icon: "✦",
      enabled: features.aiCoach,
    },
  ].filter((action) => action.enabled);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-black text-gray-950">
          Quick Actions
        </h2>

        <p
          className="mt-1 text-sm"
          style={{
            color: mutedTextColor,
          }}
        >
          Jump directly into your preparation.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => router.push(action.route)}
            className="group flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: cardBorderColor,
            }}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black"
              style={{
                background: `${primaryColor}14`,
                color: primaryColor,
              }}
            >
              {action.icon}
            </span>

            <span className="min-w-0">
              <span className="block font-black text-gray-950">
                {action.label}
              </span>

              <span
                className="mt-1 block text-xs leading-5"
                style={{
                  color: mutedTextColor,
                }}
              >
                {action.description}
              </span>
            </span>

            <span
              className="ml-auto text-lg transition-transform group-hover:translate-x-1"
              style={{
                color: primaryColor,
              }}
            >
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
