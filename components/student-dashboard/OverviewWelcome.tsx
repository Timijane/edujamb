"use client";

type HeroConfig = {
  enabled: boolean;
  backgroundMode: "color" | "gradient" | "image" | "image-gradient";
  backgroundColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: string;
  imageUrl: string;
  imagePosition: string;
  imageSize: "cover" | "contain";
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  showWelcomeText: boolean;
  showUsername: boolean;
  showTargetScore: boolean;
  showSubjects: boolean;
  showExam: boolean;
  customText: string;
  textColor: string;
  radius: number;
  shadow: string;
};

type OverviewWelcomeProps = {
  firstName: string;
  username: string;
  targetScore: string;
  exam: string;
  subjects: string[];
  hero: HeroConfig;
};

export default function OverviewWelcome({
  firstName,
  username,
  targetScore,
  exam,
  subjects,
  hero,
}: OverviewWelcomeProps) {
  if (!hero.enabled) return null;

  const background =
    hero.backgroundMode === "color"
      ? hero.backgroundColor
      : hero.backgroundMode === "gradient"
        ? `linear-gradient(${hero.gradientDirection}, ${hero.gradientStart}, ${hero.gradientEnd})`
        : hero.backgroundMode === "image-gradient"
          ? `linear-gradient(${hero.gradientDirection}, ${hero.gradientStart}aa, ${hero.gradientEnd}aa), url("${hero.imageUrl}")`
          : `url("${hero.imageUrl}")`;

  const backgroundSize =
    hero.backgroundMode === "color" || hero.backgroundMode === "gradient"
      ? undefined
      : hero.imageSize;

  return (
    <section
      className="relative min-h-[220px] overflow-hidden p-7 sm:min-h-[250px] sm:p-9"
      style={{
        background,
        backgroundSize,
        backgroundPosition: hero.imagePosition,
        borderRadius: hero.radius,
        boxShadow: hero.shadow,
        color: hero.textColor,
      }}
    >
      {hero.overlayEnabled && hero.imageUrl && (
        <div
          className="absolute inset-0"
          style={{
            background: hero.overlayColor,
            opacity: hero.overlayOpacity,
          }}
        />
      )}

      <div className="relative z-10 max-w-3xl">
        {hero.showWelcomeText && (
          <>
            <p className="text-sm font-medium opacity-75">Welcome back,</p>

            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              {firstName || "Student"}.
            </h1>
          </>
        )}

        {hero.showUsername && (
          <p className="mt-2 text-sm opacity-75">
            @{username || "student"}
          </p>
        )}

        {hero.customText && (
          <p className="mt-3 max-w-2xl text-sm font-medium opacity-85 sm:text-base">
            {hero.customText}
          </p>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {hero.showTargetScore && (
            <WelcomeStat label="Target Score" value={targetScore || "Not set"} />
          )}

          {hero.showSubjects && (
            <WelcomeStat
              label="Subjects"
              value={`${subjects.length} selected`}
            />
          )}

          {hero.showExam && (
            <WelcomeStat label="Exam" value={exam || "JAMB"} />
          )}
        </div>
      </div>

      <div
        className="absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{
          background: `${hero.textColor}22`,
        }}
      />

      <div
        className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl"
        style={{
          background: `${hero.textColor}18`,
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
      <p className="text-xs font-medium opacity-65">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}
