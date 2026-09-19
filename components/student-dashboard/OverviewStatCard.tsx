"use client";

import type { ReactNode } from "react";

type OverviewStatCardProps = {
  label: string;
  value: string;
  description?: string;
  icon: ReactNode;
  accent: string;
};

export default function OverviewStatCard({
  label,
  value,
  description,
  icon,
  accent,
}: OverviewStatCardProps) {
  return (
    <div
      className="rounded-2xl border bg-white p-5 shadow-sm"
      style={{
        borderColor: `${accent}22`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-gray-950">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-sm leading-5 text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{
            background: `${accent}14`,
            color: accent,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
