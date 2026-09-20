import { getAdminDb } from "@/lib/firebase-admin";

export async function getAcademicAnalytics(userId: string) {
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

  let totalQuestions = 0;
  let totalCorrect = 0;

  const modeStats = new Map<
    string,
    { attempts: number; questions: number; correct: number }
  >();

  const topicStats = new Map<
    string,
    { questions: number; correct: number }
  >();

  for (const attempt of attempts) {
    const mode = String(attempt.mode || "cbt");

    const modeStat = modeStats.get(mode) || {
      attempts: 0,
      questions: 0,
      correct: 0,
    };

    modeStat.attempts += 1;
    modeStat.questions +=
      typeof attempt.totalQuestions === "number"
        ? attempt.totalQuestions
        : 0;
    modeStat.correct +=
      typeof attempt.score === "number"
        ? attempt.score
        : 0;

    modeStats.set(mode, modeStat);

    if (!Array.isArray(attempt.answers)) continue;

    for (const answer of attempt.answers) {
      if (!answer?.questionId) continue;

      totalQuestions += 1;

      if (answer.correct === true) {
        totalCorrect += 1;
      }

      const question = await db
        .collection("academicQuestions")
        .doc(String(answer.questionId))
        .get();

      if (!question.exists) continue;

      const topicId = String(
        question.data()?.topicId || "",
      );

      if (!topicId) continue;

      const topicStat = topicStats.get(topicId) || {
        questions: 0,
        correct: 0,
      };

      topicStat.questions += 1;

      if (answer.correct === true) {
        topicStat.correct += 1;
      }

      topicStats.set(topicId, topicStat);
    }
  }

  const modes = Array.from(modeStats.entries()).map(
    ([mode, stats]) => ({
      mode,
      ...stats,
      accuracy:
        stats.questions > 0
          ? Math.round(
              (stats.correct / stats.questions) * 100,
            )
          : 0,
    }),
  );

  const topics = Array.from(topicStats.entries())
    .map(([topicId, stats]) => ({
      topicId,
      ...stats,
      accuracy:
        stats.questions > 0
          ? Math.round(
              (stats.correct / stats.questions) * 100,
            )
          : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return {
    totalAttempts: attempts.length,
    totalQuestions,
    totalCorrect,
    accuracy:
      totalQuestions > 0
        ? Math.round(
            (totalCorrect / totalQuestions) * 100,
          )
        : 0,
    modes,
    weakAreas: topics.filter(
      (topic) =>
        topic.questions >= 2 &&
        topic.accuracy < 70,
    ),
    strongAreas: topics
      .filter(
        (topic) =>
          topic.questions >= 2 &&
          topic.accuracy >= 80,
      )
      .sort((a, b) => b.accuracy - a.accuracy),
    recentAttempts: attempts
      .sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() || 0;
        const bTime =
          b.createdAt?.toMillis?.() || 0;

        return bTime - aTime;
      })
      .slice(0, 10),
  };
}
