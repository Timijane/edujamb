"use client";

import { useRef, useState } from "react";

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

type HeroDesignerProps = {
  value: HeroConfig;
  onChange: (value: HeroConfig) => void;
};

const CLOUDINARY_CLOUD_NAME = "dmbjrohtn";
const CLOUDINARY_UPLOAD_PRESET = "pelumi";

export default function HeroDesigner({
  value,
  onChange,
}: HeroDesignerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const update = (changes: Partial<HeroConfig>) => {
    onChange({
      ...value,
      ...changes,
    });
  };

  async function uploadImage(file: File) {
    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.secure_url) {
        throw new Error(
          result?.error?.message || "Hero image upload failed."
        );
      }

      update({ imageUrl: result.secure_url });
      setMessage("Hero image uploaded successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Hero image upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  const background =
    value.backgroundMode === "color"
      ? value.backgroundColor
      : value.backgroundMode === "gradient"
        ? `linear-gradient(${value.gradientDirection}, ${value.gradientStart}, ${value.gradientEnd})`
        : value.backgroundMode === "image-gradient"
          ? `linear-gradient(${value.gradientDirection}, ${value.gradientStart}cc, ${value.gradientEnd}cc), url("${value.imageUrl}")`
          : `url("${value.imageUrl}")`;

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-violet-400">
          Hero Design
        </p>

        <h3 className="mt-1 text-xl font-black">
          Student Dashboard Hero
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Design the large welcome area students see at the top of their
          dashboard. You can use a colour, gradient or uploaded image.
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="font-bold">Show Hero</p>
              <p className="mt-1 text-xs text-slate-400">
                Display the hero on the student dashboard.
              </p>
            </div>

            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(event) =>
                update({ enabled: event.target.checked })
              }
              className="h-5 w-5"
            />
          </label>

          <div>
            <label className="mb-2 block text-sm font-bold">
              Background
            </label>

            <select
              value={value.backgroundMode}
              onChange={(event) =>
                update({
                  backgroundMode: event.target.value as HeroConfig["backgroundMode"],
                })
              }
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="color">Solid Colour</option>
              <option value="gradient">Gradient</option>
              <option value="image">Image</option>
              <option value="image-gradient">Image + Gradient</option>
            </select>
          </div>

          {(value.backgroundMode === "color" ||
            value.backgroundMode === "gradient") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ColourControl
                label="Background Colour"
                value={value.backgroundColor}
                onChange={(backgroundColor) =>
                  update({ backgroundColor })
                }
              />

              {value.backgroundMode === "gradient" && (
                <>
                  <ColourControl
                    label="Gradient Start"
                    value={value.gradientStart}
                    onChange={(gradientStart) =>
                      update({ gradientStart })
                    }
                  />

                  <ColourControl
                    label="Gradient End"
                    value={value.gradientEnd}
                    onChange={(gradientEnd) =>
                      update({ gradientEnd })
                    }
                  />
                </>
              )}
            </div>
          )}

          {(value.backgroundMode === "image" ||
            value.backgroundMode === "image-gradient") && (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm font-bold">Hero Image</p>

              <p className="mt-1 text-xs text-slate-400">
                Choose an image directly from your device.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadImage(file);
                  event.target.value = "";
                }}
              />

              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Hero Image"}
              </button>

              {value.imageUrl && (
                <div className="mt-4">
                  <img
                    src={value.imageUrl}
                    alt="Current hero"
                    className="h-32 w-full rounded-xl object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => update({ imageUrl: "" })}
                    className="mt-2 text-xs font-bold text-red-400"
                  >
                    Remove image
                  </button>
                </div>
              )}

              {message && (
                <p className="mt-3 text-xs text-slate-400">
                  {message}
                </p>
              )}
            </div>
          )}

          {value.backgroundMode === "image-gradient" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ColourControl
                label="Gradient Start"
                value={value.gradientStart}
                onChange={(gradientStart) =>
                  update({ gradientStart })
                }
              />

              <ColourControl
                label="Gradient End"
                value={value.gradientEnd}
                onChange={(gradientEnd) =>
                  update({ gradientEnd })
                }
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">
                Image Position
              </label>

              <select
                value={value.imagePosition}
                onChange={(event) =>
                  update({ imagePosition: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Image Size
              </label>

              <select
                value={value.imageSize}
                onChange={(event) =>
                  update({
                    imageSize: event.target.value as "cover" | "contain",
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
              >
                <option value="cover">Fill Area</option>
                <option value="contain">Fit Image</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm font-bold">Hero Content</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Welcome message"
                checked={value.showWelcomeText}
                onChange={(checked) =>
                  update({ showWelcomeText: checked })
                }
              />

              <Toggle
                label="Username"
                checked={value.showUsername}
                onChange={(checked) =>
                  update({ showUsername: checked })
                }
              />

              <Toggle
                label="Target score"
                checked={value.showTargetScore}
                onChange={(checked) =>
                  update({ showTargetScore: checked })
                }
              />

              <Toggle
                label="Subjects"
                checked={value.showSubjects}
                onChange={(checked) =>
                  update({ showSubjects: checked })
                }
              />

              <Toggle
                label="Exam"
                checked={value.showExam}
                onChange={(checked) =>
                  update({ showExam: checked })
                }
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold">
                Custom message
              </label>

              <textarea
                value={value.customText}
                onChange={(event) =>
                  update({ customText: event.target.value })
                }
                rows={3}
                placeholder="Example: Your JAMB journey starts here."
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColourControl
              label="Hero Text Colour"
              value={value.textColor}
              onChange={(textColor) => update({ textColor })}
            />

            <NumberControl
              label="Corner Radius"
              value={value.radius}
              min={0}
              max={60}
              onChange={(radius) => update({ radius })}
            />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold">Live Preview</p>

          <div
            className="relative min-h-[280px] overflow-hidden p-7"
            style={{
              background,
              backgroundSize:
                value.backgroundMode === "color" ||
                value.backgroundMode === "gradient"
                  ? undefined
                  : value.imageSize,
              backgroundPosition: value.imagePosition,
              borderRadius: value.radius,
              color: value.textColor,
              boxShadow: value.shadow,
            }}
          >
            <div className="relative z-10">
              {value.showWelcomeText && (
                <>
                  <p className="text-sm opacity-70">
                    Welcome back,
                  </p>
                  <h4 className="mt-1 text-3xl font-black">
                    Student.
                  </h4>
                </>
              )}

              {value.showUsername && (
                <p className="mt-2 text-sm opacity-70">
                  @student
                </p>
              )}

              {value.customText && (
                <p className="mt-3 text-sm font-medium">
                  {value.customText}
                </p>
              )}

              <div className="mt-7 grid gap-2 sm:grid-cols-3">
                {value.showTargetScore && (
                  <PreviewStat label="Target Score" value="320" />
                )}

                {value.showSubjects && (
                  <PreviewStat label="Subjects" value="4 selected" />
                )}

                {value.showExam && (
                  <PreviewStat label="Exam" value="JAMB" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColourControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
        />

        <span className="text-sm font-mono text-slate-300">
          {value}
        </span>
      </div>
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <span className="text-sm font-medium">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-3">
      <p className="text-[10px] opacity-60">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
