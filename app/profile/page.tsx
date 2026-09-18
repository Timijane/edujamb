"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { JAMB_SUBJECTS, StudentProfile } from "@/lib/student-types";
import { defaultSiteSettings, SiteSettings } from "@/lib/site-settings";
import { getPublishedProfileDesign } from "@/lib/profile-design-service";
import {
  defaultProfileDesign,
  normalizeProfileDesign,
  type ProfileDesignConfig,
} from "@/lib/profile-design";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue",
  "Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara",
  "Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau",
  "Rivers","Sokoto","Taraba","Yobe","Zamfara","Federal Capital Territory",
];

const CORE_TOTAL = 8;

function calculateLiveCompletion(values: {
  username: string;
  phone: string;
  state: string;
  examYear: string;
  targetScore: string;
  preferredCourse: string;
  preferredInstitution: string;
  subjects: string[];
}) {
  const checks = [
    Boolean(values.username.trim()),
    Boolean(values.phone.trim()),
    Boolean(values.state),
    Boolean(values.examYear.trim()),
    Boolean(values.targetScore.trim()),
    Boolean(values.preferredCourse.trim()),
    Boolean(values.preferredInstitution.trim()),
    values.subjects.length === 4,
  ];

  return Math.round(
    (checks.filter(Boolean).length / CORE_TOTAL) * 100
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(defaultSiteSettings);
  const [profileDesign, setProfileDesign] =
    useState<ProfileDesignConfig>(defaultProfileDesign);

  const [menuOpen, setMenuOpen] = useState(false);
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
        const [settingsSnapshot, design] = await Promise.all([
          getDoc(doc(db, "siteSettings", "site")),
          getPublishedProfileDesign(),
        ]);

        if (settingsSnapshot.exists()) {
          setSiteSettings({
            ...defaultSiteSettings,
            ...(settingsSnapshot.data() as SiteSettings),
          });
        }

        setProfileDesign(normalizeProfileDesign(design));

        const token = await user.getIdToken();

        const response = await fetch("/api/student/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load your profile."
          );
        }

        const student: StudentProfile = data.student;

        setFirstName(student.firstName || "");
        setLastName(student.lastName || "");
        setUsername(student.username || "");
        setPhone(student.phone || "");
        setState(student.state || "");
        setGender(student.gender || "");
        setDateOfBirth(student.dateOfBirth || "");

        setShowRealNamePublicly(Boolean(student.showRealNamePublicly));
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
          calculateLiveCompletion({
            username: student.username || "",
            phone: student.phone || "",
            state: student.state || "",
            examYear: student.examYear || "2027",
            targetScore: student.targetScore || "",
            preferredCourse: student.preferredCourse || "",
            preferredInstitution: student.preferredInstitution || "",
            subjects: student.subjects || [],
          })
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

  useEffect(() => {
    setCompletion(
      calculateLiveCompletion({
        username,
        phone,
        state,
        examYear,
        targetScore,
        preferredCourse,
        preferredInstitution,
        subjects,
      })
    );
  }, [
    username,
    phone,
    state,
    examYear,
    targetScore,
    preferredCourse,
    preferredInstitution,
    subjects,
  ]);

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

      setCompletion(
        data.profileCompletionPercentage ??
          calculateLiveCompletion({
            username,
            phone,
            state,
            examYear,
            targetScore,
            preferredCourse,
            preferredInstitution,
            subjects,
          })
      );

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

  const design = normalizeProfileDesign(profileDesign);

  const primary =
    design.colors.primary ||
    siteSettings.profilePrimaryColor ||
    "#7c3aed";

  const primaryHover =
    design.colors.primaryHover ||
    siteSettings.profilePrimaryHoverColor ||
    "#6d28d9";

  const pageBackground =
    design.colors.pageBackground ||
    siteSettings.profilePageBackground ||
    "#f7f5ff";

  const heroTitle =
    design.hero.title ||
    siteSettings.profileHeroTitle ||
    "Build your EduJAMB profile";

  const heroSubtitle =
    design.hero.subtitle ||
    siteSettings.profileHeroSubtitle ||
    "Set up your learning identity and unlock your personalized JAMB preparation experience.";

  const heroImage =
    design.hero.backgroundImage ||
    design.assets.heroImage ||
    siteSettings.profileHeroBackgroundImage ||
    "";

  const heroType = design.hero.backgroundType;

  const heroBackground =
    heroType === "solid"
      ? design.hero.backgroundColor
      : heroType === "image" && heroImage
        ? `linear-gradient(rgba(15,23,42,${design.hero.overlayOpacity}),rgba(15,23,42,${Math.min(design.hero.overlayOpacity + 0.1, 0.85)})),url("${heroImage}")`
        : heroType === "mixed" && heroImage
          ? `linear-gradient(rgba(15,23,42,${design.hero.overlayOpacity}),rgba(15,23,42,${Math.min(design.hero.overlayOpacity + 0.1, 0.85)})),url("${heroImage}")`
          : `linear-gradient(135deg, ${design.hero.backgroundColor}, ${design.hero.secondaryColor})`;

  const cardStyle = {
    background: design.colors.cardBackground,
    opacity: design.cards.opacity,
    backdropFilter: `blur(${design.cards.blur}px)`,
    borderRadius: `${design.cards.radius}px`,
    border: `${design.cards.borderWidth}px solid ${design.cards.borderColor}`,
    boxShadow: design.cards.shadow,
  };

  const contentClass =
    design.layout.content === "two-column"
      ? "lg:grid-cols-[minmax(0,1fr)_280px]"
      : "lg:grid-cols-1";

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: pageBackground }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-violet-100"
            style={{ borderTopColor: primary }}
          />
          <p className="text-sm font-bold text-slate-700">
            Preparing your profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background: pageBackground,
        color: design.colors.text,
      }}
    >
      {siteSettings.profileHeaderVisible !== false && (
        <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {design.assets.logo || siteSettings.logo ? (
                  <img
                    src={design.assets.logo || siteSettings.logo}
                    alt="EduJAMB"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span
                    className="text-lg font-black"
                    style={{ color: primary }}
                  >
                    E
                  </span>
                )}
              </div>

              {siteSettings.profileBrandNameVisible !== false && (
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-black tracking-tight text-slate-950">
                    EduJAMB
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    JAMB Preparation
                  </p>
                </div>
              )}
            </button>

            <nav className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-violet-50"
              >
                Dashboard
              </button>
              <span
                className="rounded-xl px-4 py-2.5 text-sm font-black"
                style={{
                  background: `${primary}15`,
                  color: primary,
                }}
              >
                My Profile
              </span>
            </nav>

            {siteSettings.profileMobileMenuEnabled !== false && (
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
              >
                <span className="text-xl">
                  {menuOpen ? "×" : "☰"}
                </span>
              </button>
            )}
          </div>

          {menuOpen &&
            siteSettings.profileMobileMenuEnabled !== false && (
              <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700"
                >
                  Dashboard
                </button>
                <div
                  className="mt-1 rounded-xl px-4 py-3 text-sm font-black"
                  style={{
                    background: `${primary}15`,
                    color: primary,
                  }}
                >
                  My Profile
                </div>
              </div>
            )}
        </header>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        {design.hero.visible && (
          <section
            className={`relative isolate overflow-hidden p-6 text-white sm:p-8 lg:p-10 ${
              design.layout.hero === "centered"
                ? "text-center"
                : ""
            } ${
              design.layout.hero === "minimal"
                ? "rounded-[24px]"
                : "rounded-[30px]"
            }`}
            style={{
              background: heroBackground,
              backgroundSize: "cover",
              backgroundPosition:
                design.hero.backgroundPosition || "center",
              boxShadow: design.cards.shadow,
            }}
          >
            {design.hero.decorations && (
              <>
                <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
                <div className="absolute right-[15%] top-[25%] h-20 w-20 rotate-12 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md" />
              </>
            )}

            {design.hero.pattern && (
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(-45deg, rgba(255,255,255,.35) 1px, transparent 1px)",
                  backgroundSize: "34px 34px",
                }}
              />
            )}

            <div
              className={`relative grid gap-8 ${
                design.layout.hero === "split"
                  ? "lg:grid-cols-[1fr_360px] lg:items-center"
                  : "lg:grid-cols-[1fr_320px] lg:items-center"
              }`}
            >
              <div>
                <div
                  className={`mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] backdrop-blur-md ${
                    design.layout.hero === "centered"
                      ? "mx-auto"
                      : ""
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: design.hero.accentColor,
                    }}
                  />
                  {design.hero.eyebrow}
                </div>

                <h1
                  className="max-w-2xl tracking-[-0.03em]"
                  style={{
                    fontWeight: design.typography.headingWeight,
                    fontSize: `clamp(2rem, 5vw, ${3 * design.typography.headingScale}rem)`,
                  }}
                >
                  {heroTitle}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  {heroSubtitle}
                </p>
              </div>

              {design.hero.showProgress && (
                <div
                  className="relative p-5 text-left text-white"
                  style={{
                    ...cardStyle,
                    background: "rgba(255,255,255,.12)",
                    borderColor: "rgba(255,255,255,.18)",
                    color: "#fff",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white/70">
                        Profile completion
                      </p>
                      <p className="mt-1 text-4xl font-black">
                        {completion}%
                      </p>
                    </div>

                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/20 bg-white/10">
                      <span className="text-sm font-black">
                        {completion}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-black/20">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{
                        width: `${completion}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs leading-5 text-white/70">
                    Complete the core information below to unlock your dashboard.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <form
          onSubmit={submit}
          className={`mt-6 grid gap-6 ${contentClass}`}
        >
          <div className="space-y-6">
            {design.sections.identity && (
              <ProfileSection
                number="01"
                title="Public identity"
                description="Choose how EduJAMB will identify you across the student community."
                style={cardStyle}
                primary={primary}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <ReadOnlyField label="First name" value={firstName} />
                  <ReadOnlyField label="Last name" value={lastName} />

                  <Field
                    label="Username"
                    required
                    value={username}
                    onChange={setUsername}
                    placeholder="e.g. timi_2027"
                    hint="3–20 characters: letters, numbers and underscores."
                    primary={primary}
                  />

                  <Field
                    label="WhatsApp number"
                    required
                    value={phone}
                    onChange={setPhone}
                    placeholder="+2348012345678"
                    hint="Use your international country code."
                    primary={primary}
                  />
                </div>

                <div className="mt-6">
                  <Toggle
                    checked={showRealNamePublicly}
                    onChange={setShowRealNamePublicly}
                    label="Show my real name publicly"
                    description={
                      showRealNamePublicly
                        ? `${firstName} ${lastName} and @${username || "username"} may appear publicly.`
                        : `Only @${username || "username"} will be used as your public identity.`
                    }
                    primary={primary}
                  />
                </div>
              </ProfileSection>
            )}

            {design.sections.personalInformation && (
              <ProfileSection
                number="02"
                title="Personal information"
                description="Optional details. You remain in control of your personal visibility."
                style={cardStyle}
                primary={primary}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="Gender"
                    value={gender}
                    onChange={setGender}
                    options={[
                      "Male",
                      "Female",
                      "Prefer not to say",
                    ]}
                    primary={primary}
                  />

                  <Field
                    label="Date of birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    primary={primary}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-sm font-black text-slate-900">
                    Birthday visibility
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your actual birthday remains private. Choose which parts,
                    if any, other students can see.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Toggle
                      checked={showBirthDay}
                      onChange={setShowBirthDay}
                      label="Show day"
                      primary={primary}
                    />
                    <Toggle
                      checked={showBirthMonth}
                      onChange={setShowBirthMonth}
                      label="Show month"
                      primary={primary}
                    />
                    <Toggle
                      checked={showBirthYear}
                      onChange={setShowBirthYear}
                      label="Show year"
                      primary={primary}
                    />
                  </div>
                </div>
              </ProfileSection>
            )}

            {design.sections.education && (
              <ProfileSection
                number="03"
                title="Education"
                description="Tell EduJAMB where you are coming from academically."
                style={cardStyle}
                primary={primary}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="State"
                    required
                    value={state}
                    onChange={setState}
                    options={NIGERIAN_STATES}
                    primary={primary}
                  />

                  <Field
                    label="School"
                    value={school}
                    onChange={setSchool}
                    placeholder="Your current school"
                    primary={primary}
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
                    primary={primary}
                  />
                </div>
              </ProfileSection>
            )}

            {design.sections.jambPreparation && (
              <ProfileSection
                number="04"
                title="JAMB preparation"
                description="These details power your personalized preparation experience."
                style={cardStyle}
                primary={primary}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="JAMB examination year"
                    required
                    value={examYear}
                    onChange={setExamYear}
                    placeholder="2027"
                    primary={primary}
                  />

                  <Field
                    label="Target JAMB score"
                    required
                    type="number"
                    min="0"
                    max="400"
                    value={targetScore}
                    onChange={setTargetScore}
                    placeholder="e.g. 300"
                    primary={primary}
                  />

                  <Field
                    label="Course of study"
                    required
                    value={preferredCourse}
                    onChange={setPreferredCourse}
                    placeholder="e.g. Computer Science"
                    primary={primary}
                  />

                  <Field
                    label="Preferred institution"
                    required
                    value={preferredInstitution}
                    onChange={setPreferredInstitution}
                    placeholder="e.g. University of Lagos"
                    primary={primary}
                  />
                </div>

                <div className="mt-8 border-t border-slate-100 pt-7">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <p className="text-base font-black text-slate-950">
                        Select your JAMB subjects
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Your normal JAMB combination requires exactly four subjects.
                      </p>
                    </div>

                    <div
                      className="flex h-12 min-w-[86px] items-center justify-center rounded-2xl px-4 text-sm font-black text-white shadow-lg"
                      style={{ background: primary }}
                    >
                      {subjects.length} / 4
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {JAMB_SUBJECTS.map((subject) => {
                      const selected = subjects.includes(subject);

                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          className="group relative min-h-[58px] rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all duration-200"
                          style={{
                            borderColor: selected
                              ? primary
                              : "#e2e8f0",
                            background: selected
                              ? `${primary}12`
                              : "#ffffff",
                            color: selected
                              ? primary
                              : "#334155",
                          }}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs"
                              style={{
                                background: selected
                                  ? primary
                                  : "#f1f5f9",
                                color: selected
                                  ? "#ffffff"
                                  : "#94a3b8",
                              }}
                            >
                              {selected ? "✓" : "+"}
                            </span>
                            <span>{subject}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ProfileSection>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                {success}
              </div>
            )}
          </div>

          {design.sections.completionChecklist && (
            <aside className="hidden lg:block">
              <div
                className="sticky top-24 p-5"
                style={cardStyle}
              >
                <p
                  className="text-xs font-black uppercase tracking-[0.16em]"
                  style={{ color: primary }}
                >
                  Profile checklist
                </p>

                <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  Almost there
                </h2>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completion}%`,
                      background: primary,
                    }}
                  />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-700">
                  {completion}% complete
                </p>

                <div className="mt-6 space-y-3">
                  <ChecklistItem
                    label="Public identity"
                    done={Boolean(username)}
                    primary={primary}
                  />

                  <ChecklistItem
                    label="Contact information"
                    done={Boolean(phone)}
                    primary={primary}
                  />

                  <ChecklistItem
                    label="Education"
                    done={Boolean(state)}
                    primary={primary}
                  />

                  <ChecklistItem
                    label="JAMB preferences"
                    done={Boolean(
                      examYear &&
                        targetScore &&
                        preferredCourse &&
                        preferredInstitution
                    )}
                    primary={primary}
                  />

                  <ChecklistItem
                    label="Four subjects"
                    done={subjects.length === 4}
                    primary={primary}
                  />
                </div>

                <div
                  className="mt-6 rounded-2xl p-4"
                  style={{
                    background: `${primary}10`,
                  }}
                >
                  <p
                    className="text-xs font-black"
                    style={{ color: primary }}
                  >
                    Privacy first
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Your public identity and birthday visibility are controlled
                    by you.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: saving ? "#94a3b8" : primary,
                  }}
                >
                  {saving ? "Saving profile..." : "Save & continue"}
                </button>
              </div>
            </aside>
          )}
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 p-3 shadow-[0_-15px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:hidden">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            document.querySelector("form")?.requestSubmit();
          }}
          className="w-full rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
          style={{
            background: saving ? "#94a3b8" : primary,
          }}
        >
          {saving ? "Saving profile..." : "Save & continue"}
        </button>
      </div>
    </main>
  );
}

function ProfileSection({
  number,
  title,
  description,
  children,
  style,
  primary,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
  style: React.CSSProperties;
  primary: string;
}) {
  return (
    <section
      className="overflow-hidden p-5 sm:p-7"
      style={style}
    >
      <div className="mb-7 flex gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black"
          style={{
            background: `${primary}12`,
            color: primary,
          }}
        >
          {number}
        </div>

        <div>
          <h2
            className="tracking-tight text-slate-950"
            style={{
              fontSize: "1.25rem",
              fontWeight: 900,
            }}
          >
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  type = "text",
  min,
  max,
  primary,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  type?: string;
  min?: string;
  max?: string;
  primary: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
        {label}
        {required && (
          <span style={{ color: primary }}>*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300"
        style={{
          borderColor: undefined,
        }}
      />

      {hint && (
        <span className="mt-1.5 block text-[11px] leading-5 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  primary,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  primary: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
        {label}
        {required && (
          <span style={{ color: primary }}>*</span>
        )}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
    <div>
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </span>

      <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500">
        {value || "Not available"}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  primary,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  primary: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:shadow-sm"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-800">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        )}
      </span>

      <span
        className="relative h-7 w-12 shrink-0 rounded-full transition"
        style={{
          background: checked ? primary : "#e2e8f0",
        }}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function ChecklistItem({
  label,
  done,
  primary,
}: {
  label: string;
  done: boolean;
  primary: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black"
        style={{
          background: done ? "#dcfce7" : "#f1f5f9",
          color: done ? "#15803d" : "#94a3b8",
        }}
      >
        {done ? "✓" : "•"}
      </span>

      <span
        className={`text-sm font-bold ${
          done ? "text-slate-700" : "text-slate-400"
        }`}
        style={done ? { color: primary } : undefined}
      >
        {label}
      </span>
    </div>
  );
}
