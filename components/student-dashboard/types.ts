export type DashboardOverviewData = {
  studyMinutesToday: number;
  studyStreak: number;
  preparationProgress: number;
  completedLessons: number;
  totalLessons: number;
  completedQuestions: number;
  totalQuestions: number;
  averageScore: number | null;
  lastScore: number | null;
  lastSubject: string | null;
  upcomingClass: {
    title: string;
    subject: string;
    startsAt: string;
  } | null;
};

export const defaultDashboardOverviewData: DashboardOverviewData = {
  studyMinutesToday: 0,
  studyStreak: 0,
  preparationProgress: 0,
  completedLessons: 0,
  totalLessons: 0,
  completedQuestions: 0,
  totalQuestions: 0,
  averageScore: null,
  lastScore: null,
  lastSubject: null,
  upcomingClass: null,
};
