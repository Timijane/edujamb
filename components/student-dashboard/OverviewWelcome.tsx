"use client";

type OverviewWelcomeProps = {
  firstName: string;
  username: string;
  targetScore: string;
  exam: string;
  subjects: string[];
  primaryColor: string;
  secondaryColor: string;
  gradientEnabled: boolean;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: string;
};

export default function OverviewWelcome({
  firstName,
  username,
  targetScore,
  exam,
  subjects,
  primaryColor,
  secondaryColor,
  gradientEnabled,
  gradientStart,
  gradientEnd,
  gradientDirection,
}: OverviewWelcomeProps) {
  const background = gradientEnabled
    ? `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})`
    : primaryColor;

  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-7 text-white shadow-xl sm:p-9"
      style={{ background }}
    >
      <div className="relative z-10">
        <p className="text-sm font-medium text-white/70">
          Welcome back,
        </p>

        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          {firstName || "Student"}.
        </h1>

        <p className="mt-2 text-sm text-white/75">
          @{username || "student"} · {exam || "JAMB"}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <WelcomeStat
            label="Target Score"
            value={targetScore || "Not set"}
          />

          <WelcomeStat
            label="Subjects"
            value={`${subjects.length} selected`}
          />

          <WelcomeStat
            label="Exam"
            value={exam || "JAMB"}
          />
        </div>
      </div>

      <div
        className="absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{
          background: `${secondaryColor}55`,
        }}
      />

      <div
        className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl"
        style={{
          background: `${primaryColor}55`,
        }}
      />
    </section>
  );
}

function WelcomeStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-medium text-white/60">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-black">
        {value}
      </p>
    </div>
  );
}
