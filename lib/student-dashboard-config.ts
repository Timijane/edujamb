export type DashboardNavGroup =
  | "overview"
  | "learning"
  | "practice"
  | "preparation"
  | "competition"
  | "classroom"
  | "community"
  | "account";

export type DashboardNavItem = {
  id: string;
  label: string;
  route: string;
  icon: string;
  group: DashboardNavGroup;
  visible: boolean;
  order: number;
};

export type DashboardWidgetSize = "small" | "medium" | "large" | "full";

export type DashboardWidget = {
  id: string;
  visible: boolean;
  order: number;
  size: DashboardWidgetSize;
  variant: string;
};

export type StudentDashboardConfig = {
  version: number;
  name: string;
  status: "draft" | "published";

  navigation: {
    enabled: boolean;
    style: "sidebar" | "topbar" | "bottom";
    collapsedByDefault: boolean;
    showIcons: boolean;
    showLabels: boolean;
    groups: {
      id: DashboardNavGroup;
      label: string;
      visible: boolean;
      order: number;
    }[];
    items: DashboardNavItem[];
  };

  appearance: {
    pageBackground: string;
    primaryColor: string;
    primaryHoverColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
    mutedTextColor: string;
    cardBackground: string;
    cardBorderColor: string;
    cardBorderWidth: number;
    cardRadius: number;
    cardShadow: string;
    cardOpacity: number;
    cardBlur: number;

    headerBackground: string;
    headerBorderColor: string;

    gradientEnabled: boolean;
    gradientStart: string;
    gradientEnd: string;
    gradientDirection: string;

    headingWeight: number;
    bodyWeight: number;
  };

  layout: {
    contentWidth: "compact" | "standard" | "wide" | "full";
    dashboardColumns: 1 | 2 | 3 | 4;
    mobileColumns: 1 | 2;
    sectionSpacing: "compact" | "standard" | "relaxed";
  };

  hero: {
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

  widgets: DashboardWidget[];

  features: {
    mySubjects: boolean;
    lessons: boolean;
    resources: boolean;
    pastQuestions: boolean;
    bookmarks: boolean;

    cbtPractice: boolean;
    examSimulator: boolean;
    examHistory: boolean;
    performance: boolean;

    studyPlan: boolean;
    aiCoach: boolean;
    recommendations: boolean;

    challenges: boolean;
    battleChallenge: boolean;
    leaderboard: boolean;
    achievements: boolean;

    liveClasses: boolean;
    myClasses: boolean;

    community: boolean;
    discussions: boolean;
    messages: boolean;
    notifications: boolean;

    subscription: boolean;
  };

  rules: {
    allowSubjectChangeRequests: boolean;
    allowAdditionalSubjectRequests: boolean;
    allowProfilePreferenceChangeRequests: boolean;
    allowStudentMessaging: boolean;
    allowCommunityPosts: boolean;
    allowPictureUploads: boolean;
    allowBattleChallenges: boolean;
  };

  updatedAt?: unknown;
  publishedAt?: unknown;
};

export const defaultStudentDashboardConfig: StudentDashboardConfig = {
  version: 1,
  name: "EduJAMB Student Dashboard",
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
        icon: "home",
        group: "overview",
        visible: true,
        order: 1,
      },

      {
        id: "subjects",
        label: "My Subjects",
        route: "/dashboard/subjects",
        icon: "book-open",
        group: "learning",
        visible: true,
        order: 1,
      },
      {
        id: "learning",
        label: "Lessons & Topics",
        route: "/dashboard/learning",
        icon: "graduation-cap",
        group: "learning",
        visible: true,
        order: 2,
      },
      {
        id: "resources",
        label: "Resources & Textbooks",
        route: "/dashboard/resources",
        icon: "library",
        group: "learning",
        visible: true,
        order: 3,
      },
      {
        id: "past-questions",
        label: "Past Questions",
        route: "/dashboard/past-questions",
        icon: "files",
        group: "learning",
        visible: true,
        order: 4,
      },
      {
        id: "bookmarks",
        label: "Bookmarks",
        route: "/dashboard/bookmarks",
        icon: "bookmark",
        group: "learning",
        visible: true,
        order: 5,
      },

      {
        id: "cbt",
        label: "CBT Practice",
        route: "/dashboard/cbt",
        icon: "pen-line",
        group: "practice",
        visible: true,
        order: 1,
      },
      {
        id: "exam-history",
        label: "Exam History",
        route: "/dashboard/exam-history",
        icon: "history",
        group: "practice",
        visible: true,
        order: 2,
      },
      {
        id: "performance",
        label: "Performance & Analytics",
        route: "/dashboard/performance",
        icon: "chart",
        group: "practice",
        visible: true,
        order: 3,
      },

      {
        id: "study-plan",
        label: "Study Plan",
        route: "/dashboard/study-plan",
        icon: "calendar",
        group: "preparation",
        visible: true,
        order: 1,
      },
      {
        id: "ai-coach",
        label: "AI JAMB Coach",
        route: "/dashboard/ai-coach",
        icon: "sparkles",
        group: "preparation",
        visible: true,
        order: 2,
      },
      {
        id: "recommendations",
        label: "Recommendations",
        route: "/dashboard/recommendations",
        icon: "lightbulb",
        group: "preparation",
        visible: true,
        order: 3,
      },

      {
        id: "battle",
        label: "Battle Challenge",
        route: "/dashboard/battle",
        icon: "swords",
        group: "competition",
        visible: true,
        order: 1,
      },
      {
        id: "challenges",
        label: "Challenges",
        route: "/dashboard/challenges",
        icon: "target",
        group: "competition",
        visible: true,
        order: 2,
      },
      {
        id: "leaderboard",
        label: "Leaderboard",
        route: "/dashboard/leaderboard",
        icon: "trophy",
        group: "competition",
        visible: true,
        order: 3,
      },
      {
        id: "achievements",
        label: "Achievements",
        route: "/dashboard/achievements",
        icon: "medal",
        group: "competition",
        visible: true,
        order: 4,
      },

      {
        id: "live-classes",
        label: "Live Classes",
        route: "/dashboard/classes",
        icon: "video",
        group: "classroom",
        visible: true,
        order: 1,
      },
      {
        id: "my-classes",
        label: "My Classes",
        route: "/dashboard/classes",
        icon: "school",
        group: "classroom",
        visible: true,
        order: 2,
      },

      {
        id: "community",
        label: "Academic Feed",
        route: "/dashboard/community",
        icon: "users",
        group: "community",
        visible: true,
        order: 1,
      },
      {
        id: "discussions",
        label: "Discussions",
        route: "/dashboard/community",
        icon: "message-circle",
        group: "community",
        visible: true,
        order: 2,
      },
      {
        id: "messages",
        label: "Messages",
        route: "/dashboard/messages",
        icon: "messages-square",
        group: "community",
        visible: true,
        order: 3,
      },
      {
        id: "notifications",
        label: "Notifications",
        route: "/dashboard/notifications",
        icon: "bell",
        group: "community",
        visible: true,
        order: 4,
      },

      {
        id: "profile",
        label: "Profile",
        route: "/dashboard/profile",
        icon: "user",
        group: "account",
        visible: true,
        order: 1,
      },
      {
        id: "settings",
        label: "Settings",
        route: "/dashboard/settings",
        icon: "settings",
        group: "account",
        visible: true,
        order: 2,
      },
      {
        id: "subscription",
        label: "Subscription",
        route: "/dashboard/subscription",
        icon: "credit-card",
        group: "account",
        visible: true,
        order: 3,
      },
    ],
  },

  appearance: {
    pageBackground: "#f7f5ff",
    primaryColor: "#7c3aed",
    primaryHoverColor: "#6d28d9",
    secondaryColor: "#312e81",
    accentColor: "#c084fc",
    textColor: "#0f172a",
    mutedTextColor: "#64748b",
    cardBackground: "#ffffff",
    cardBorderColor: "#ede9fe",
    cardBorderWidth: 1,
    cardRadius: 24,
    cardShadow: "0 18px 50px rgba(76,29,149,0.08)",
    cardOpacity: 0.98,
    cardBlur: 12,

    headerBackground: "#ffffff",
    headerBorderColor: "#ede9fe",

    gradientEnabled: true,
    gradientStart: "#6d28d9",
    gradientEnd: "#312e81",
    gradientDirection: "135deg",

    headingWeight: 900,
    bodyWeight: 500,
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
      variant: "hero",
    },
    {
      id: "progress",
      visible: true,
      order: 2,
      size: "medium",
      variant: "progress-card",
    },
    {
      id: "target-score",
      visible: true,
      order: 3,
      size: "medium",
      variant: "target-card",
    },
    {
      id: "subjects",
      visible: true,
      order: 4,
      size: "medium",
      variant: "subjects-card",
    },
    {
      id: "study-today",
      visible: true,
      order: 5,
      size: "large",
      variant: "study-plan",
    },
    {
      id: "quick-actions",
      visible: true,
      order: 6,
      size: "full",
      variant: "quick-actions",
    },
    {
      id: "recent-performance",
      visible: true,
      order: 7,
      size: "large",
      variant: "performance",
    },
    {
      id: "streak",
      visible: true,
      order: 8,
      size: "small",
      variant: "streak",
    },
    {
      id: "upcoming-class",
      visible: true,
      order: 9,
      size: "medium",
      variant: "class-card",
    },
    {
      id: "recommendations",
      visible: true,
      order: 10,
      size: "large",
      variant: "recommendations",
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

  hero: {
    enabled: true,
    backgroundMode: "gradient",
    backgroundColor: "#6d28d9",
    gradientStart: "#6d28d9",
    gradientEnd: "#4c1d95",
    gradientDirection: "135deg",
    imageUrl: "",
    imagePosition: "center",
    imageSize: "cover",
    overlayEnabled: false,
    overlayColor: "#000000",
    overlayOpacity: 0.35,
    showWelcomeText: true,
    showUsername: true,
    showTargetScore: true,
    showSubjects: true,
    showExam: true,
    customText: "",
    textColor: "#ffffff",
    radius: 28,
    shadow: "0 18px 45px rgba(16, 24, 40, 0.12)",
  },
};

export function normalizeStudentDashboardConfig(
  value?: Partial<StudentDashboardConfig> | null
): StudentDashboardConfig {
  return {
    ...defaultStudentDashboardConfig,
    ...value,

    navigation: {
      ...defaultStudentDashboardConfig.navigation,
      ...(value?.navigation ?? {}),
      groups: value?.navigation?.groups
        ? value.navigation.groups
        : defaultStudentDashboardConfig.navigation.groups,
      items: value?.navigation?.items
        ? value.navigation.items
        : defaultStudentDashboardConfig.navigation.items,
    },

    appearance: {
      ...defaultStudentDashboardConfig.appearance,
      ...(value?.appearance ?? {}),
    },

    layout: {
      ...defaultStudentDashboardConfig.layout,
      ...(value?.layout ?? {}),
    },

    widgets: value?.widgets
      ? value.widgets
      : defaultStudentDashboardConfig.widgets,

    features: {
      ...defaultStudentDashboardConfig.features,
      ...(value?.features ?? {}),
    },

    rules: {
      ...defaultStudentDashboardConfig.rules,
      ...(value?.rules ?? {}),
    },
  };
}
