"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  ChartNoAxesColumn,
  CreditCard,
  Files,
  GraduationCap,
  History,
  House,
  Lightbulb,
  Library,
  Medal,
  MessageCircle,
  MessagesSquare,
  PenLine,
  School,
  Settings,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  User,
  Video,
  Circle,
} from "lucide-react";

import type { ComponentType } from "react";

import type { LucideIcon } from "lucide-react";

import { auth } from "@/lib/firebase";
import type {
  DashboardNavItem,
  StudentDashboardConfig,
} from "@/lib/student-dashboard-config";

import OverviewWelcome from "@/components/student-dashboard/OverviewWelcome";
import OverviewStatCard from "@/components/student-dashboard/OverviewStatCard";
import OverviewProgressCard from "@/components/student-dashboard/OverviewProgressCard";
import OverviewQuickActions from "@/components/student-dashboard/OverviewQuickActions";
import OverviewSubjectsCard from "@/components/student-dashboard/OverviewSubjectsCard";

type Student = {
  firstName: string;
  lastName: string;
  username: string;
  subjects?: string[];
  targetScore?: string;
  preferredCourse?: string;
  preferredInstitution?: string;
};

type Account = {
  onboardingComplete?: boolean;
  selectedExam?: string;
};

type AuthMeResponse = {
  user?: Account & {
    role?: string;
  };
  student?: Student;
};

type DashboardConfigResponse = {
  success?: boolean;
  config?: StudentDashboardConfig;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [config, setConfig] =
    useState<StudentDashboardConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);

      try {
        const token = await currentUser.getIdToken();

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data =
          (await response.json()) as AuthMeResponse;

        if (
          !response.ok ||
          data.user?.role !== "student"
        ) {
          await signOut(auth);
          router.replace("/login");
          return;
        }

        if (!data.user?.onboardingComplete) {
          router.replace("/profile");
          return;
        }

        setAccount(data.user);
        setStudent(data.student ?? null);

        const configResponse = await fetch(
          "/api/student/dashboard-config",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const configData =
          (await configResponse.json()) as DashboardConfigResponse;

        if (
          configResponse.ok &&
          configData.success &&
          configData.config
        ) {
          setConfig(configData.config);
        }
      } catch (error) {
        console.error(
          "Failed to initialise student dashboard:",
          error
        );

        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  async function logout() {
    await signOut(auth);
    router.replace("/login");
  }

  const visibleGroups = useMemo(() => {
    if (!config?.navigation.enabled) return [];

    return [...config.navigation.groups]
      .filter((group) => group.visible)
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        ...group,
        items: [...config.navigation.items]
          .filter(
            (item) =>
              item.group === group.id &&
              item.visible &&
              featureAllowsItem(config, item)
          )
          .sort((a, b) => a.order - b.order),
      }))
      .filter((group) => group.items.length > 0);
  }, [config]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" />
          <p className="mt-4 font-bold text-violet-700">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="max-w-md rounded-2xl border bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-black text-gray-950">
            Dashboard unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            We couldn't load your dashboard configuration.
            Please refresh and try again.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-violet-700 px-5 py-3 text-sm font-black text-white"
          >
            Refresh Dashboard
          </button>
        </div>
      </main>
    );
  }

  const appearance = config.appearance;

  return (
    <main
      className="min-h-screen"
      style={{
        background: appearance.pageBackground,
        color: appearance.textColor,
        fontWeight: appearance.bodyWeight,
      }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          background: appearance.headerBackground,
          borderColor: appearance.headerBorderColor,
        }}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-between px-4 py-3 sm:px-6",
            contentWidthClass(config.layout.contentWidth)
          )}
        >
          <div className="flex items-center gap-3">
            {config.navigation.enabled && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border px-3 py-2 text-lg lg:hidden"
                style={{
                  borderColor: appearance.cardBorderColor,
                  background: appearance.cardBackground,
                }}
                aria-label="Open navigation"
              >
                ☰
              </button>
            )}

            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{
                  color: appearance.primaryColor,
                }}
              >
                Student Portal
              </p>

              <h1
                className="text-xl font-black"
                style={{
                  fontWeight: appearance.headingWeight,
                }}
              >
                EduJAMB
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/profile"
              className="hidden rounded-xl border px-4 py-2 text-sm font-bold sm:block"
              style={{
                borderColor: appearance.cardBorderColor,
                background: appearance.cardBackground,
              }}
            >
              {student?.firstName ||
                user?.displayName ||
                "Student"}
            </a>

            <button
              type="button"
              onClick={logout}
              className="rounded-xl px-4 py-2 text-sm font-black text-white"
              style={{
                background: appearance.primaryColor,
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto flex",
          contentWidthClass(config.layout.contentWidth)
        )}
      >
        {config.navigation.enabled &&
          config.navigation.style === "sidebar" && (
            <aside className="hidden w-64 shrink-0 py-6 pr-5 lg:block">
              <DashboardNavigation
                groups={visibleGroups}
                appearance={appearance}
              />
            </aside>
          )}

        {sidebarOpen && config.navigation.enabled && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            />

            <aside
              className="relative h-full w-[min(86vw,320px)] overflow-y-auto p-5 shadow-2xl"
              style={{
                background: appearance.pageBackground,
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-black">
                  Navigation
                </span>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl border px-3 py-2"
                  style={{
                    borderColor:
                      appearance.cardBorderColor,
                    background:
                      appearance.cardBackground,
                  }}
                >
                  ×
                </button>
              </div>

              <DashboardNavigation
                groups={visibleGroups}
                appearance={appearance}
                onNavigate={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {config.navigation.enabled &&
            config.navigation.style === "topbar" && (
              <div className="mb-6 overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  {visibleGroups
                    .flatMap((group) => group.items)
                    .map((item) => (
                      <DashboardNavLink
                        key={item.id}
                        item={item}
                        appearance={appearance}
                      />
                    ))}
                </div>
              </div>
            )}

          <Overview
            config={config}
            student={student}
            account={account}
            router={router}
          />
        </section>
      </div>

      {config.navigation.enabled &&
        config.navigation.style === "bottom" && (
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t p-2 lg:hidden"
            style={{
              background: appearance.headerBackground,
              borderColor: appearance.headerBorderColor,
            }}
          >
            <div className="flex justify-around gap-1 overflow-x-auto">
              {visibleGroups
                .flatMap((group) => group.items)
                .slice(0, 5)
                .map((item) => (
                  <DashboardNavLink
                    key={item.id}
                    item={item}
                    appearance={appearance}
                    compact
                  />
                ))}
            </div>
          </div>
        )}
    </main>
  );
}

function Overview({
  config,
  student,
  account,
  router,
}: {
  config: StudentDashboardConfig;
  student: Student | null;
  account: Account | null;
  router: ReturnType<typeof useRouter>;
}) {
  const appearance = config.appearance;

  const subjects = student?.subjects ?? [];

  return (
    <div className="space-y-6">
      <OverviewWelcome
        firstName={student?.firstName ?? "Student"}
        username={student?.username ?? ""}
        targetScore={student?.targetScore ?? ""}
        exam={account?.selectedExam ?? "JAMB"}
        subjects={subjects}
        primaryColor={appearance.primaryColor}
        secondaryColor={appearance.secondaryColor}
        gradientEnabled={appearance.gradientEnabled}
        gradientStart={appearance.gradientStart}
        gradientEnd={appearance.gradientEnd}
        gradientDirection={appearance.gradientDirection}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStatCard
          label="Study Today"
          value="0 min"
          description="Your study time today"
          icon="◷"
          accent={appearance.primaryColor}
        />

        <OverviewStatCard
          label="Study Streak"
          value="0 days"
          description="Keep building consistency"
          icon="🔥"
          accent={appearance.accentColor}
        />

        <OverviewStatCard
          label="Questions"
          value="0"
          description="Questions completed"
          icon="▧"
          accent={appearance.secondaryColor}
        />

        <OverviewStatCard
          label="Average Score"
          value="—"
          description="Your practice average"
          icon="↗"
          accent={appearance.primaryColor}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <OverviewProgressCard
          title="Preparation Progress"
          subtitle="Your overall JAMB preparation progress"
          progress={0}
          primaryColor={appearance.primaryColor}
          mutedTextColor={appearance.mutedTextColor}
        />

        <OverviewSubjectsCard
          subjects={subjects}
          primaryColor={appearance.primaryColor}
          cardBorderColor={appearance.cardBorderColor}
          mutedTextColor={appearance.mutedTextColor}
        />
      </div>

      <OverviewQuickActions
        primaryColor={appearance.primaryColor}
        cardBorderColor={appearance.cardBorderColor}
        mutedTextColor={appearance.mutedTextColor}
        features={{
          cbtPractice: config.features.cbtPractice,
          pastQuestions: config.features.pastQuestions,
          studyPlan: config.features.studyPlan,
          aiCoach: config.features.aiCoach,
        }}
      />

      <section
        className="rounded-2xl border bg-white p-6 shadow-sm"
        style={{
          borderColor: appearance.cardBorderColor,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">
              Continue Your Preparation
            </h2>

            <p
              className="mt-1 text-sm"
              style={{
                color: appearance.mutedTextColor,
              }}
            >
              Your learning activity, recent results and
              recommendations will appear here as you use
              JAMBMASTER.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/subjects")
            }
            className="rounded-xl px-5 py-3 text-sm font-black text-white"
            style={{
              background: appearance.primaryColor,
            }}
          >
            Explore My Subjects
          </button>
        </div>
      </section>
    </div>
  );
}

function DashboardNavigation({
  groups,
  appearance,
  onNavigate,
}: {
  groups: Array<{
    id: string;
    label: string;
    visible: boolean;
    order: number;
    items: DashboardNavItem[];
  }>;
  appearance: StudentDashboardConfig["appearance"];
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.id}>
          <p
            className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em]"
            style={{
              color: appearance.mutedTextColor,
            }}
          >
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((item) => (
              <DashboardNavLink
                key={item.id}
                item={item}
                appearance={appearance}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function DashboardNavLink({
  item,
  appearance,
  compact = false,
  onNavigate,
}: {
  item: DashboardNavItem;
  appearance: StudentDashboardConfig["appearance"];
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={item.route}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition hover:bg-black/5",
        compact &&
          "min-w-16 flex-col gap-1 px-2 py-2 text-[10px]"
      )}
      style={{
        color: appearance.textColor,
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `${appearance.primaryColor}15`,
          color: appearance.primaryColor,
        }}
      >
        <DashboardIcon name={item.icon} />
      </span>

      <span
        className={cn(
          "truncate",
          compact && "max-w-16"
        )}
      >
        {item.label}
      </span>
    </a>
  );
}

function DashboardIcon({ name }: { name: string }) {
  const iconMap: Record<string, ComponentType<any>> = {
    home: House,
    "book-open": BookOpen,
    "graduation-cap": GraduationCap,
    library: Library,
    files: Files,
    bookmark: Bookmark,
    "pen-line": PenLine,
    history: History,
    chart: ChartNoAxesColumn,
    calendar: CalendarDays,
    sparkles: Sparkles,
    lightbulb: Lightbulb,
    swords: Swords,
    target: Target,
    trophy: Trophy,
    medal: Medal,
    video: Video,
    school: School,
    users: Users,
    "message-circle": MessageCircle,
    "messages-square": MessagesSquare,
    bell: Bell,
    user: User,
    settings: Settings,
    "credit-card": CreditCard,
    award: Award,
  };

  const Icon = iconMap[name] ?? Circle;

  return <Icon size={17} strokeWidth={2.2} />;
}

function featureAllowsItem(
  config: StudentDashboardConfig,
  item: DashboardNavItem
) {
  const featureMap: Record<
    string,
    keyof StudentDashboardConfig["features"] | undefined
  > = {
    "my-subjects": "mySubjects",
    lessons: "lessons",
    resources: "resources",
    "past-questions": "pastQuestions",
    bookmarks: "bookmarks",
    "cbt-practice": "cbtPractice",
    "exam-history": "examHistory",
    performance: "performance",
    "study-plan": "studyPlan",
    "ai-coach": "aiCoach",
    recommendations: "recommendations",
    battle: "battleChallenge",
    challenges: "challenges",
    leaderboard: "leaderboard",
    achievements: "achievements",
    "live-classes": "liveClasses",
    "my-classes": "myClasses",
    "academic-feed": "community",
    discussions: "discussions",
    messages: "messages",
    notifications: "notifications",
    subscription: "subscription",
  };

  const feature = featureMap[item.id];

  if (!feature) return true;

  return config.features[feature];
}

function contentWidthClass(
  width: StudentDashboardConfig["layout"]["contentWidth"]
) {
  switch (width) {
    case "compact":
      return "max-w-5xl";
    case "standard":
      return "max-w-6xl";
    case "wide":
      return "max-w-7xl";
    case "full":
      return "max-w-[1600px]";
    default:
      return "max-w-7xl";
  }
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
