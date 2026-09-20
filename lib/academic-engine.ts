import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export type PracticeMode =
  | "cbt"
  | "past_questions"
  | "mock"
  | "battle";

export type AttemptAnswer = {
  questionId: string;
  selectedOption: number;
  correct: boolean;
  timeSpentSeconds: number;
};

export type AcademicAttempt = {
  userId: string;
  mode: PracticeMode;
  subjectIds: string[];
  questionIds: string[];
  answers: AttemptAnswer[];
  score: number;
  totalQuestions: number;
  percentage: number;
  startedAt?: unknown;
  completedAt?: unknown;
  createdAt?: unknown;
};

export async function getPublishedQuestions(options: {
  subjectId?: string;
  topicId?: string;
  year?: number;
  category?: string;
  difficulty?: string;
  limit?: number;
}) {
  const db = getAdminDb();

  let query = db
    .collection("academicQuestions")
    .where("active", "==", true)
    .where("published", "==", true);

  if (options.subjectId) {
    query = query.where("subjectId", "==", options.subjectId) as typeof query;
  }

  if (options.topicId) {
    query = query.where("topicId", "==", options.topicId) as typeof query;
  }

  if (options.year !== undefined) {
    query = query.where("year", "==", options.year) as typeof query;
  }

  if (options.category) {
    query = query.where("category", "==", options.category) as typeof query;
  }

  if (options.difficulty) {
    query = query.where("difficulty", "==", options.difficulty) as typeof query;
  }

  const snapshot = await query
    .limit(Math.min(options.limit || 50, 100))
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function calculateAttemptResult(
  answers: AttemptAnswer[],
) {
  const totalQuestions = answers.length;
  const score = answers.filter((answer) => answer.correct).length;
  const percentage =
    totalQuestions > 0
      ? Math.round((score / totalQuestions) * 100)
      : 0;

  return {
    score,
    totalQuestions,
    percentage,
  };
}

export async function saveAcademicAttempt(
  attempt: Omit<
    AcademicAttempt,
    "score" | "totalQuestions" | "percentage" | "createdAt"
  >,
) {
  const db = getAdminDb();

  const result = await calculateAttemptResult(attempt.answers);

  const ref = db.collection("academicAttempts").doc();

  await ref.set({
    ...attempt,
    ...result,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    ...result,
  };
}

export async function getStudentPerformance(userId: string) {
  const db = getAdminDb();

  const snapshot = await db
    .collection("academicAttempts")
    .where("userId", "==", userId)
    .limit(200)
    .get();

  const attempts: Array<Record<string, any> & { id: string }> =
    snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  const totalAttempts = attempts.length;

  const totalQuestions = attempts.reduce(
    (sum, attempt) =>
      sum +
      (typeof attempt.totalQuestions === "number"
        ? attempt.totalQuestions
        : 0),
    0,
  );

  const totalCorrect = attempts.reduce(
    (sum, attempt) =>
      sum +
      (typeof attempt.score === "number"
        ? attempt.score
        : 0),
    0,
  );

  const accuracy =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;

  return {
    totalAttempts,
    totalQuestions,
    totalCorrect,
    accuracy,
    attempts,
  };
}

export async function getStudentWeakAreas(userId: string) {
  const db = getAdminDb();

  const snapshot = await db
    .collection("academicAttempts")
    .where("userId", "==", userId)
    .limit(200)
    .get();

  const topicStats = new Map<
    string,
    { total: number; correct: number }
  >();

  for (const doc of snapshot.docs) {
    const attempt = doc.data();

    if (!Array.isArray(attempt.answers)) continue;

    for (const answer of attempt.answers) {
      if (!answer?.questionId) continue;

      const question = await db
        .collection("academicQuestions")
        .doc(String(answer.questionId))
        .get();

      if (!question.exists) continue;

      const topicId = String(
        question.data()?.topicId || "",
      );

      if (!topicId) continue;

      const current = topicStats.get(topicId) || {
        total: 0,
        correct: 0,
      };

      current.total += 1;

      if (answer.correct === true) {
        current.correct += 1;
      }

      topicStats.set(topicId, current);
    }
  }

  return Array.from(topicStats.entries())
    .map(([topicId, stats]) => ({
      topicId,
      ...stats,
      accuracy:
        stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : 0,
    }))
    .filter((item) => item.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy);
}
