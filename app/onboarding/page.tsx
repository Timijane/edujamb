"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { JAMB_SUBJECTS } from "@/lib/student-types";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [uidReady, setUidReady] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [state, setState] = useState("");
  const [school, setSchool] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [examYear, setExamYear] = useState("2027");
  const [targetScore, setTargetScore] = useState("300");
  const [preferredCourse, setPreferredCourse] = useState("");
  const [preferredInstitution, setPreferredInstitution] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        setUidReady(true);
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

    if (!uidReady || !auth.currentUser) return;

    if (subjects.length !== 4) {
      setError("Select exactly four JAMB subjects.");
      return;
    }

    setLoading(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          selectedExam: "JAMB",
          phone,
          dateOfBirth,
          gender,
          state,
          school,
          educationLevel,
          examYear,
          targetScore,
          preferredCourse,
          preferredInstitution,
          subjects,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to complete onboarding.");

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete onboarding.");
    } finally {
      setLoading(false);
    }
  }

  if (!uidReady) {
    return <Loading text="Preparing your profile..." />;
  }

  return (
    <main className="min-h-screen bg-[#f7f5ff] px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-6 shadow-[0_25px_80px_rgba(76,29,149,0.12)] sm:p-10">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Step 1 of 1</p>
          <h1 className="mt-2 text-3xl font-black text-gray-950 sm:text-4xl">Complete your EduJAMB profile</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">Your username will be your public identity across the academic community.</p>
        </div>

        <form onSubmit={submit} className="space-y-7">
          <section>
            <h2 className="mb-4 text-lg font-black">Public identity</h2>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Unique username</span>
              <input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. timi_2027" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black">Academic setup</h2>
            <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-violet-600">Exam</p>
              <p className="mt-1 font-black text-gray-950">JAMB</p>
              <p className="mt-1 text-sm text-gray-500">Currently the only enabled examination.</p>
            </div>
            <label className="block">
              <span className="mb-3 block text-sm font-bold">Choose exactly 4 subjects</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {JAMB_SUBJECTS.map((subject) => (
                  <button key={subject} type="button" onClick={() => toggleSubject(subject)} className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${subjects.includes(subject) ? "border-violet-600 bg-violet-50 text-violet-800" : "border-gray-200 bg-white text-gray-700 hover:border-violet-300"}`}>
                    {subjects.includes(subject) ? "✓ " : ""}{subject}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">{subjects.length}/4 selected</p>
            </label>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black">Important information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" value={phone} onChange={setPhone} />
              <Field label="Date of birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
              <SelectField label="Gender" value={gender} onChange={setGender} options={["Male", "Female", "Prefer not to say"]} />
              <Field label="State" value={state} onChange={setState} />
              <Field label="School" value={school} onChange={setSchool} />
              <SelectField label="Education level" value={educationLevel} onChange={setEducationLevel} options={["Secondary School", "Graduate", "Other"]} />
              <Field label="Exam year" value={examYear} onChange={setExamYear} />
              <Field label="Target score" value={targetScore} onChange={setTargetScore} />
              <Field label="Preferred course" value={preferredCourse} onChange={setPreferredCourse} />
              <Field label="Preferred institution" value={preferredInstitution} onChange={setPreferredInstitution} />
            </div>
          </section>

          {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button disabled={loading} className="w-full rounded-2xl bg-violet-700 px-5 py-4 font-black text-white shadow-lg shadow-violet-200 disabled:opacity-60">
            {loading ? "Saving your profile..." : "Finish Setup & Enter Dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span><select required value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-100"><option value="">Select</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
}

function Loading({ text }: { text: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#f7f5ff]"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" /><p className="font-bold text-violet-700">{text}</p></div></main>; }
