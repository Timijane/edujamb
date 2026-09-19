"use client";

type OverviewProgressCardProps = {
  title: string;
  subtitle: string;
  progress: number;
  primaryColor: string;
  mutedTextColor: string;
};

export default function OverviewProgressCard({
  title,
  subtitle,
  progress,
  primaryColor,
  mutedTextColor,
}: OverviewProgressCardProps) {
  const safeProgress = Math.min(
    100,
    Math.max(0, Math.round(progress))
  );

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-950">
            {title}
          </h2>

          <p
            className="mt-1 text-sm"
            style={{
              color: mutedTextColor,
            }}
          >
            {subtitle}
          </p>
        </div>

        <span
          className="text-2xl font-black"
          style={{
            color: primaryColor,
          }}
        >
          {safeProgress}%
        </span>
      </div>

      <div
        className="mt-5 h-3 overflow-hidden rounded-full"
        style={{
          background: `${primaryColor}18`,
        }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${safeProgress}%`,
            background: primaryColor,
          }}
        />
      </div>
    </div>
  );
}
