"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { JAMB_SUBJECTS, StudentProfile } from "@/lib/student-types";
import { useRouter } from "next/navigation";

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Federal Capital Territory",
];

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");

  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [showRealNamePublicly, setShowRealNamePublicly] = useState(false);
  const [showBirthDay, setShowBirthDay] = useState(false);
  const [showBirthMonth, setShowBirthMonth] = useState(false);
  const [showBirthYear, setShowBirthYear] = useState(false);

  const [school, setSchool] = useState("");
  const [educationLevel, setEducationLevel] = useState("");

  const [examYear, setExamYear] = useState("2027");
  const [targetScore, setTargetScore] = useState("");
  const [preferredCourse, setPreferredCourse] = useState("");
  const [preferredInstitution, setPreferredInstitution] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  const [completion, setCompletion] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch("/api/student/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load your profile.");
        }

        const student: StudentProfile = data.student;

        setFirstName(student.firstName || "");
        setLastName(student.lastName || "");
        setUsername(student.username || "");
        setPhone(student.phone || "");
        setState(student.state || "");
        setGender(student.gender || "");
        setDateOfBirth(student.dateOfBirth || "");

        setShowRealNamePublicly(
          Boolean(student.showRealNamePublicly)
        );

        setShowBirthDay(Boolean(student.showBirthDay));
        setShowBirthMonth(Boolean(student.showBirthMonth));
        setShowBirthYear(Boolean(student.showBirthYear));

        setSchool(student.school || "");
        setEducationLevel(student.educationLevel || "");
        setExamYear(student.examYear || "2027");
        setTargetScore(student.targetScore || "");
        setPreferredCourse(student.preferredCourse || "");
        setPreferredInstitution(student.preferredInstitution || "");
        setSubjects(student.subjects || []);

        setCompletion(
          student.profileCompletionPercentage || 0
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  function toggleSubject(subject: string) {
    setSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : current.length < 4
          ? [...current, subject]
          : current
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!auth.currentUser) {
      router.replace("/login");
      return;
    }

    if (subjects.length !== 4) {
      setError("Please select exactly four JAMB subjects.");
      return;
    }

    setSaving(true);

    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("/api/student/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          phone,
          state,
          school,
          educationLevel,
          dateOfBirth,
          gender,
          showRealNamePublicly,
          showBirthDay,
          showBirthMonth,
          showBirthYear,
          examYear,
          targetScore,
          preferredCourse,
          preferredInstitution,
          subjects,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save your profile."
        );
      }

      setCompletion(data.profileCompletionPercentage || 100);
      setSuccess("Profile saved successfully.");

      setTimeout(() => {
        router.replace("/dashboard");
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5ff]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" />
          <p className="font-bold text-violet-700">
            Preparing your profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5ff] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">

        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            EduJAMB Student Profile
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            Complete your profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Your profile powers your JAMB preparation, community identity,
            competitions, analytics and personalized learning.
          </p>
        </header>

        <section className="mb-6 rounded-3xl bg-gradient-to-br from-violet-800 to-purple-950 p-6 text-white shadow-xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-violet-200">
                Profile completion
              </p>
              <p className="mt-1 text-3xl font-black">
                {completion}%
              </p>
            </div>

            <p className="text-right text-xs text-violet-200">
              Core information is required<br />
              before dashboard access.
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(completion, 100)}%` }}
            />
          </div>
        </section>

        <form
          onSubmit={submit}
          className="space-y-6"
        >

          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle
              title="Your identity"
              description="This information identifies you across EduJAMB."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField
                label="First name"
                value={firstName}
              />

              <ReadOnlyField
                label="Last name"
                value={lastName}
              />

              <Field
                label="Username"
                required
                value={username}
                onChange={setUsername}
                placeholder="e.g. timi_2027"
                hint="3–20 characters: letters, numbers and underscores."
              />

              <Field
                label="WhatsApp number"
                required
                value={phone}
                onChange={setPhone}
                placeholder="+2348012345678"
                hint="Include your international country code."
              />
            </div>

            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <Toggle
                checked={showRealNamePublicly}
                onChange={setShowRealNamePublicly}
                label="Show my real name publicly"
                description={
                  showRealNamePublicly
                    ? `${firstName} ${lastName} and @${username || "username"} may appear publicly.`
                    : `Only @${username || "username"} will be used as your public identity.`
                }
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle
              title="Personal information"
              description="Optional information. You control what parts of your birthday can be public."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Gender"
                value={gender}
                onChange={setGender}
                options={["Male", "Female", "Prefer not to say"]}
              />

              <Field
                label="Date of birth"
                type="date"
                value={dateOfBirth}
                onChange={setDateOfBirth}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-black text-gray-900">
                Birthday visibility
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Your actual date of birth remains private. These settings
                control what other students can see.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Toggle
                  checked={showBirthDay}
                  onChange={setShowBirthDay}
                  label="Show day"
                />

                <Toggle
                  checked={showBirthMonth}
                  onChange={setShowBirthMonth}
                  label="Show month"
                />

                <Toggle
                  checked={showBirthYear}
                  onChange={setShowBirthYear}
                  label="Show year"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle
              title="Education"
              description="Help EduJAMB understand your educational background."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="State"
                required
                value={state}
                onChange={setState}
                options={NIGERIAN_STATES}
              />

              <Field
                label="School"
                value={school}
                onChange={setSchool}
                placeholder="Your current school"
              />

              <SelectField
                label="Education level"
                value={educationLevel}
                onChange={setEducationLevel}
                options={[
                  "Secondary School",
                  "Graduate",
                  "Other",
                ]}
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
            <SectionTitle
              title="JAMB preparation"
              description="These details personalize your future CBT, analytics and recommendations."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="JAMB examination year"
                required
                value={examYear}
                onChange={setExamYear}
              />

              <Field
                label="Expected / target JAMB score"
                required
                type="number"
                min="0"
                max="400"
                value={targetScore}
                onChange={setTargetScore}
                placeholder="e.g. 300"
              />

              <Field
                label="Course of study"
                required
                value={preferredCourse}
                onChange={setPreferredCourse}
                placeholder="e.g. Computer Science"
              />

              <Field
                label="Preferred institution"
                required
                value={preferredInstitution}
                onChange={setPreferredInstitution}
                placeholder="e.g. University of Lagos"
              />
            </div>

            <div className="mt-6">
              <p className="mb-1 text-sm font-black text-gray-900">
                Choose exactly 4 JAMB subjects
              </p>

              <p className="mb-4 text-xs text-gray-500">
                {subjects.length}/4 selected
              </p>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {JAMB_SUBJECTS.map((subject) => {
                  const selected = subjects.includes(subject);

                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                        selected
                          ? "border-violet-600 bg-violet-50 text-violet-800"
                          : "border-gray-200 bg-white text-gray-700 hover:border-violet-300"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-violet-700 px-5 py-4 font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving your profile..."
              : "Save Profile & Continue"}
          </button>

        </form>
      </div>
    </main>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-black text-gray-950">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  hint,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-900">
        {label}
        {required && (
          <span className="ml-1 text-violet-600">*</span>
        )}
      </span>

      <input
        required={required}
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />

      {hint && (
        <span className="mt-1.5 block text-xs text-gray-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-900">
        {label}
      </span>

      <input
        readOnly
        value={value}
        className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3.5 text-sm text-gray-500 outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-gray-900">
        {label}
        {required && (
          <span className="ml-1 text-violet-600">*</span>
        )}
      </span>

      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100"
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${
          checked ? "bg-violet-700" : "bg-gray-300"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>

      <span>
        <span className="block text-sm font-bold text-gray-900">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-gray-500">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
