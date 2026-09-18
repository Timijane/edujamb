"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import type {
  DashboardNavItem,
  DashboardWidget,
  StudentDashboardConfig,
} from "@/lib/student-dashboard-config";

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

const FALLBACK_CONFIG: StudentDashboardConfig = {
  version: 1,
  name: "Default Student Dashboard",
  status: "published",
  navigation: {
    enabled: true,
    style: "sidebar",
    collapsedByDefault: false,
    showIcons: true,
    showLabels: true,
    groups: [
      {
        id: "overview",
        label: "Overview",
        visible: true,
        order: 1,
      },
      {
        id: "learning",
        label: "Learning",
        visible: true,
        order: 2,
      },
      {
        id: "practice",
        label: "Practice",
        visible: true,
        order: 3,
      },
      {
        id: "preparation",
        label: "Preparation",
        visible: true,
        order: 4,
      },
      {
        id: "competition",
        label: "Competition",
        visible: true,
        order: 5,
      },
      {
        id: "classroom",
        label: "Classroom",
        visible: true,
        order: 6,
      },
      {
        id: "community",
        label: "Community",
        visible: true,
        order: 7,
      },
      {
        id: "account",
        label: "Account",
        visible: true,
        order: 8,
      },
    ],
    items: [
      {
        id: "overview",
        label: "Overview",
        route: "/dashboard",
        icon: "⌂",
        group: "overview",
        visible: true,
        order: 1,
      },
      {
        id: "my-subjects",
        label: "My Subjects",
        route: "/dashboard/subjects",
        icon: "▣",
        group: "learning",
        visible: true,
        order: 2,
      },
      {
        id: "lessons",
        label: "Lessons & Topics",
        route: "/dashboard/lessons",
        icon: "◫",
        group: "learning",
        visible: true,
        order: 3,
      },
      {
        id: "resources",
        label: "Resources & Textbooks",
        route: "/dashboard/resources",
        icon: "▤",
        group: "learning",
        visible: true,
        order: 4,
      },
      {
        id: "past-questions",
        label: "Past Questions",
        route: "/dashboard/past-questions",
        icon: "▧",
        group: "practice",
        visible: true,
        order: 5,
      },
      {
        id: "bookmarks",
        label: "Bookmarks",
        route: "/dashboard/bookmarks",
        icon: "◇",
        group: "practice",
        visible: true,
        order: 6,
      },
      {
        id: "cbt-practice",
        label: "CBT Practice",
        route: "/dashboard/cbt",
        icon: "⌁",
        group: "practice",
        visible: true,
        order: 7,
      },
      {
        id: "exam-history",
        label: "Exam History",
        route: "/dashboard/exam-history",
        icon: "◷",
        group: "practice",
        visible: true,
        order: 8,
      },
      {
        id: "performance",
        label: "Performance & Analytics",
        route: "/dashboard/performance",
        icon: "↗",
        group: "preparation",
        visible: true,
        order: 9,
      },
      {
        id: "study-plan",
        label: "Study Plan",
        route: "/dashboard/study-plan",
        icon: "☷",
        group: "preparation",
        visible: true,
        order: 10,
      },
      {
        id: "ai-coach",
        label: "AI JAMB Coach",
        route: "/dashboard/ai-coach",
        icon: "✦",
        group: "preparation",
        visible: true,
        order: 11,
      },
      {
        id: "recommendations",
        label: "Recommendations",
        route: "/dashboard/recommendations",
        icon: "★",
        group: "preparation",
        visible: true,
        order: 12,
      },
      {
        id: "battle",
        label: "Battle Challenge",
        route: "/dashboard/battle",
        icon: "⚔",
        group: "competition",
        visible: true,
        order: 13,
      },
      {
        id: "challenges",
        label: "Challenges",
        route: "/dashboard/challenges",
        icon: "♢",
        group: "competition",
        visible: true,
        order: 14,
      },
      {
        id: "leaderboard",
        label: "Leaderboard",
        route: "/dashboard/leaderboard",
        icon: "♛",
        group: "competition",
        visible: true,
        order: 15,
      },
      {
        id: "achievements",
        label: "Achievements",
        route: "/dashboard/achievements",
        icon: "✪",
        group: "competition",
        visible: true,
        order: 16,
      },
      {
        id: "live-classes",
        label: "Live Classes",
        route: "/dashboard/live-classes",
        icon: "●",
        group: "classroom",
        visible: true,
        order: 17,
      },
      {
        id: "my-classes",
        label: "My Classes",
        route: "/dashboard/classes",
        icon: "▦",
        group: "classroom",
        visible: true,
        order: 18,
      },
      {
        id: "academic-feed",
        label: "Academic Feed",
        route: "/dashboard/community",
        icon: "◎",
        group: "community",
        visible: true,
        order: 19,
      },
      {
        id: "discussions",
        label: "Discussions",
        route: "/dashboard/discussions",
        icon: "☏",
        group: "community",
        visible: true,
        order: 20,
      },
      {
        id: "messages",
        label: "Messages",
        route: "/dashboard/messages",
        icon: "✉",
        group: "community",
        visible: true,
        order: 21,
      },
      {
        id: "notifications",
        label: "Notifications",
        route: "/dashboard/notifications",
        icon: "♢",
        group: "account",
        visible: true,
        order: 22,
      },
      {
        id: "profile",
        label: "Profile",
        route: "/profile",
        icon: "◉",
        group: "account",
        visible: true,
        order: 23,
      },
      {
        id: "settings",
        label: "Settings",
        route: "/dashboard/settings",
        icon: "⚙",
        group: "account",
        visible: true,
        order: 24,
      },
      {
        id: "subscription",
        label: "Subscription",
        route: "/dashboard/subscription",
        icon: "₦",
        group: "account",
        visible: true,
        order: 25,
      },
    ],
  },
  appearance: {
    pageBackground: "#f7f5ff",
    primaryColor: "#7c3aed",
    primaryHoverColor: "#6d28d9",
    secondaryColor: "#4c1d95",
    accentColor: "#a78bfa",
    textColor: "#111827",
    mutedTextColor: "#6b7280",
    cardBackground: "#ffffff",
    cardBorderColor: "#e5e7eb",
    cardBorderWidth: 1,
    cardRadius: 24,
    cardShadow: "0 10px 30px rgba(76,29,149,0.08)",
    cardOpacity: 100,
    cardBlur: 0,
    headerBackground: "#ffffff",
    headerBorderColor: "#e5e7eb",
    gradientEnabled: true,
    gradientStart: "#7c3aed",
    gradientEnd: "#4c1d95",
    gradientDirection: "to-br",
    headingWeight: 800,
    bodyWeight: 400,
  },
  layout: {
    contentWidth: "wide",
    dashboardColumns: 3,
    mobileColumns: 1,
    sectionSpacing: "standard",
  },
  widgets: [
    {
      id: "welcome",
      visible: true,
      order: 1,
      size: "full",
      variant: "default",
    },
    {
      id: "progress",
      visible: true,
      order: 2,
      size: "medium",
      variant: "default",
    },
    {
      id: "target-score",
      visible: true,
      order: 3,
      size: "medium",
      variant: "default",
    },
    {
      id: "subjects",
      visible: true,
      order: 4,
      size: "large",
      variant: "default",
    },
    {
      id: "study-today",
      visible: true,
      order: 5,
      size: "medium",
      variant: "default",
    },
    {
      id: "quick-actions",
      visible: true,
      order: 6,
      size: "large",
      variant: "default",
    },
    {
      id: "recent-performance",
      visible: true,
      order: 7,
      size: "medium",
      variant: "default",
    },
    {
      id: "streak",
      visible: true,
      order: 8,
      size: "small",
      variant: "default",
    },
    {
      id: "upcoming-class",
      visible: true,
      order: 9,
      size: "medium",
      variant: "default",
    },
    {
      id: "recommendations",
      visible: true,
      order: 10,
      size: "large",
      variant: "default",
    },
  ],
  features: {
    mySubjects: true,
    lessons: true,
    resources: true,
    pastQuestions: true,
    bookmarks: true,
    cbtPractice: true,
    examSimulator: true,
    examHistory: true,
    performance: true,
    studyPlan: true,
    aiCoach: true,
    recommendations: true,
    challenges: true,
    battleChallenge: true,
    leaderboard: true,
    achievements: true,
    liveClasses: true,
    myClasses: true,
    community: true,
    discussions: true,
    messages: true,
    notifications: true,
    subscription: true,
  },
  rules: {
    allowSubjectChangeRequests: true,
    allowAdditionalSubjectRequests: true,
    allowProfilePreferenceChangeRequests: true,
    allowStudentMessaging: true,
    allowCommunityPosts: true,
    allowPictureUploads: true,
    allowBattleChallenges: true,
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [config, setConfig] =
    useState<StudentDashboardConfig>(FALLBACK_CONFIG);

  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
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

        try {
          const configResponse = await fetch(
            "/api/student/dashboard-config",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const configData = await configResponse.json();

          if (configResponse.ok && configData.success) {
            setConfig(configData.config);
          }
        } catch (configError) {
          console.error(
            "Dashboard configuration failed:",
            configError
          );
        } finally {
          setConfigLoading(false);
        }
      } catch {
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
    if (!config.navigation.enabled) return [];

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

  const visibleWidgets = useMemo(
    () =>
      [...config.widgets]
        .filter((widget) => widget.visible)
        .sort((a, b) => a.order - b.order),
    [config.widgets]
  );

  if (loading || configLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{
          background: FALLBACK_CONFIG.appearance.pageBackground,
        }}
      >
        <div className="text-center">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700"
          />
          <p className="mt-4 font-bold text-violet-700">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  const appearance = config.appearance;
  const layout = config.layout;

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
            contentWidthClass(layout.contentWidth)
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
                style={{ color: appearance.primaryColor }}
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
              {student?.firstName || user?.displayName || "Student"}
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
          contentWidthClass(layout.contentWidth)
        )}
      >
        {config.navigation.enabled && (
          <aside className="hidden w-64 shrink-0 py-6 pr-5 lg:block">
            <Navigation
              groups={visibleGroups}
              appearance={appearance}
              collapsed={config.navigation.collapsedByDefault}
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
                <span className="font-black">Navigation</span>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl border px-3 py-2"
                  style={{
                    borderColor: appearance.cardBorderColor,
                    background: appearance.cardBackground,
                  }}
                >
                  ×
                </button>
              </div>

              <Navigation
                groups={visibleGroups}
                appearance={appearance}
                collapsed={false}
                onNavigate={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {config.navigation.style === "topbar" &&
            config.navigation.enabled && (
              <div className="mb-6 overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  {visibleGroups.flatMap((group) =>
                    group.items.map((item) => (
                      <NavLink
                        key={item.id}
                        item={item}
                        appearance={appearance}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

          <DashboardGrid
            widgets={visibleWidgets}
            config={config}
            student={student}
            account={account}
            router={router}
          />
        </section>
      </div>

      {config.navigation.style === "bottom" &&
        config.navigation.enabled && (
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
                  <NavLink
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

function Navigation({
  groups,
  appearance,
  collapsed,
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
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.id}>
          <p
            className={cn(
              "mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em]",
              collapsed && "sr-only"
            )}
            style={{ color: appearance.mutedTextColor }}
          >
            {group.label}
          </p>

          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                appearance={appearance}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  appearance,
  collapsed = false,
  compact = false,
  onNavigate,
}: {
  item: DashboardNavItem;
  appearance: StudentDashboardConfig["appearance"];
  collapsed?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={item.route}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition",
        compact && "min-w-16 flex-col gap-1 px-2 py-2 text-[10px]"
      )}
      style={{
        color: appearance.textColor,
      }}
    >
      {appearance &&
        true && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${appearance.primaryColor}15`,
              color: appearance.primaryColor,
            }}
          >
            {item.icon}
          </span>
        )}

      {!collapsed && (
        <span
          className={cn(
            "truncate",
            compact && "max-w-16"
          )}
        >
          {item.label}
        </span>
      )}
    </a>
  );
}

function DashboardGrid({
  widgets,
  config,
  student,
  account,
  router,
}: {
  widgets: DashboardWidget[];
  config: StudentDashboardConfig;
  student: Student | null;
  account: Account | null;
  router: ReturnType<typeof useRouter>;
}) {
  const appearance = config.appearance;

  return (
    <div
      className={cn(
        "grid",
        gridColumnsClass(config.layout.dashboardColumns),
        config.layout.sectionSpacing === "compact"
          ? "gap-3"
          : config.layout.sectionSpacing === "relaxed"
            ? "gap-7"
            : "gap-5"
      )}
    >
      {widgets.map((widget) => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          config={config}
          student={student}
          account={account}
          appearance={appearance}
          router={router}
        />
      ))}
    </div>
  );
}

function WidgetCard({
  widget,
  config,
  student,
  account,
  appearance,
  router,
}: {
  widget: DashboardWidget;
  config: StudentDashboardConfig;
  student: Student | null;
  account: Account | null;
  appearance: StudentDashboardConfig["appearance"];
  router: ReturnType<typeof useRouter>;
}) {
  const widthClass = widgetSizeClass(
    widget.size,
    config.layout.dashboardColumns
  );

  const baseStyle = {
    background: appearance.cardBackground,
    borderColor: appearance.cardBorderColor,
    borderWidth: appearance.cardBorderWidth,
    borderRadius: appearance.cardRadius,
    boxShadow: appearance.cardShadow,
    opacity: appearance.cardOpacity / 100,
    backdropFilter:
      appearance.cardBlur > 0
        ? `blur(${appearance.cardBlur}px)`
        : undefined,
  };

  if (widget.id === "welcome") {
    return (
      <div
        className={cn(
          "relative overflow-hidden border p-7 text-white",
          widthClass
        )}
        style={{
          ...baseStyle,
          border: "none",
          background: appearance.gradientEnabled
            ? `linear-gradient(${appearance.gradientDirection}, ${appearance.gradientStart}, ${appearance.gradientEnd})`
            : appearance.primaryColor,
        }}
      >
        <p className="text-sm opacity-80">
          Welcome back,
        </p>

        <h2
          className="mt-1 text-3xl font-black sm:text-4xl"
          style={{
            fontWeight: appearance.headingWeight,
          }}
        >
          {student?.firstName || "Student"}.
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80">
          Your JAMB preparation control centre is ready.
          Keep learning, practising and tracking your progress.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="Exam"
            value={account?.selectedExam || "JAMB"}
          />

          <MiniStat
            label="Target"
            value={student?.targetScore || "—"}
          />

          <MiniStat
            label="Subjects"
            value={String(student?.subjects?.length || 0)}
          />
        </div>
      </div>
    );
  }

  if (widget.id === "subjects") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="My Subjects"
          subtitle="Your selected JAMB subjects"
          appearance={appearance}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(student?.subjects ?? []).map(
            (subject, index) => (
              <div
                key={`${subject}-${index}`}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: appearance.cardBorderColor,
                }}
              >
                <p
                  className="text-xs font-black uppercase tracking-wider"
                  style={{
                    color: appearance.primaryColor,
                  }}
                >
                  Subject {index + 1}
                </p>

                <p className="mt-1 font-black">
                  {subject}
                </p>
              </div>
            )
          )}

          {(!student?.subjects ||
            student.subjects.length === 0) && (
            <p
              className="text-sm"
              style={{
                color: appearance.mutedTextColor,
              }}
            >
              No subjects available yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (widget.id === "target-score") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Target Score"
          subtitle="Your JAMB goal"
          appearance={appearance}
        />

        <p
          className="mt-6 text-5xl font-black"
          style={{
            color: appearance.primaryColor,
          }}
        >
          {student?.targetScore || "—"}
        </p>

        <p
          className="mt-2 text-sm"
          style={{
            color: appearance.mutedTextColor,
          }}
        >
          Progress tracking will appear here as you complete
          CBT sessions and lessons.
        </p>
      </div>
    );
  }

  if (widget.id === "progress") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Preparation Progress"
          subtitle="Your overall JAMB preparation"
          appearance={appearance}
        />

        <div className="mt-6">
          <div className="flex items-end justify-between">
            <span
              className="text-4xl font-black"
              style={{
                color: appearance.primaryColor,
              }}
            >
              0%
            </span>

            <span
              className="text-xs font-bold"
              style={{
                color: appearance.mutedTextColor,
              }}
            >
              Starting point
            </span>
          </div>

          <div
            className="mt-3 h-3 overflow-hidden rounded-full"
            style={{
              background: `${appearance.primaryColor}18`,
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "0%",
                background: appearance.primaryColor,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (widget.id === "quick-actions") {
    const actions = [
      config.features.cbtPractice && {
        label: "Start CBT",
        route: "/dashboard/cbt",
      },
      config.features.pastQuestions && {
        label: "Past Questions",
        route: "/dashboard/past-questions",
      },
      config.features.aiCoach && {
        label: "AI JAMB Coach",
        route: "/dashboard/ai-coach",
      },
      config.features.studyPlan && {
        label: "Study Plan",
        route: "/dashboard/study-plan",
      },
    ].filter(Boolean) as Array<{
      label: string;
      route: string;
    }>;

    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Quick Actions"
          subtitle="Jump straight into your preparation"
          appearance={appearance}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.route}
              type="button"
              onClick={() => router.push(action.route)}
              className="rounded-2xl px-4 py-4 text-left text-sm font-black text-white transition hover:opacity-90"
              style={{
                background: appearance.primaryColor,
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (widget.id === "study-today") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Study Today"
          subtitle="Your daily preparation activity"
          appearance={appearance}
        />

        <div className="mt-5 rounded-2xl border p-5">
          <p className="text-3xl font-black">0 min</p>
          <p
            className="mt-1 text-sm"
            style={{
              color: appearance.mutedTextColor,
            }}
          >
            Study activity will appear here.
          </p>
        </div>
      </div>
    );
  }

  if (widget.id === "streak") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Study Streak"
          subtitle="Keep your consistency going"
          appearance={appearance}
        />

        <p
          className="mt-6 text-4xl font-black"
          style={{
            color: appearance.primaryColor,
          }}
        >
          0 days
        </p>
      </div>
    );
  }

  if (widget.id === "recent-performance") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Recent Performance"
          subtitle="Your latest practice results"
          appearance={appearance}
        />

        <p
          className="mt-5 text-sm"
          style={{
            color: appearance.mutedTextColor,
          }}
        >
          Complete your first CBT or practice session to
          start seeing performance analytics.
        </p>
      </div>
    );
  }

  if (widget.id === "upcoming-class") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Upcoming Class"
          subtitle="Your next live learning session"
          appearance={appearance}
        />

        <p
          className="mt-5 text-sm"
          style={{
            color: appearance.mutedTextColor,
          }}
        >
          No upcoming classes yet.
        </p>
      </div>
    );
  }

  if (widget.id === "recommendations") {
    return (
      <div
        className={cn("border p-6", widthClass)}
        style={baseStyle}
      >
        <WidgetHeading
          title="Recommended For You"
          subtitle="Personalized preparation suggestions"
          appearance={appearance}
        />

        <div className="mt-5 rounded-2xl border p-5">
          <p className="font-black">
            Your recommendations will appear here.
          </p>

          <p
            className="mt-2 text-sm leading-6"
            style={{
              color: appearance.mutedTextColor,
            }}
          >
            As you practise and learn, EduJAMB will use your
            activity and performance to recommend what to
            study next.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("border p-6", widthClass)}
      style={baseStyle}
    >
      <WidgetHeading
        title={formatLabel(widget.id)}
        subtitle="EduJAMB module"
        appearance={appearance}
      />

      <p
        className="mt-4 text-sm leading-6"
        style={{
          color: appearance.mutedTextColor,
        }}
      >
        This dashboard module is enabled and ready for its
        feature implementation.
      </p>
    </div>
  );
}

function WidgetHeading({
  title,
  subtitle,
  appearance,
}: {
  title: string;
  subtitle: string;
  appearance: StudentDashboardConfig["appearance"];
}) {
  return (
    <div>
      <h2 className="text-xl font-black">
        {title}
      </h2>

      <p
        className="mt-1 text-sm"
        style={{
          color: appearance.mutedTextColor,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs text-white/60">
        {label}
      </p>

      <p className="mt-1 text-xl font-black">
        {value}
      </p>
    </div>
  );
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

function gridColumnsClass(
  columns: StudentDashboardConfig["layout"]["dashboardColumns"]
) {
  switch (columns) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 md:grid-cols-2";
    case 4:
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
    case 3:
    default:
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
  }
}

function widgetSizeClass(
  size: DashboardWidget["size"],
  columns: StudentDashboardConfig["layout"]["dashboardColumns"]
) {
  if (size === "full") return "md:col-span-2 xl:col-span-3";

  if (
    size === "large" &&
    columns >= 3
  ) {
    return "md:col-span-2";
  }

  if (
    size === "medium" &&
    columns === 4
  ) {
    return "md:col-span-2 xl:col-span-2";
  }

  return "";
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
