import { getAdminDb } from "@/lib/firebase-admin";
import { getAcademicAnalytics } from "@/lib/academic-analytics";

export type CoachFeature =
  | "tutor"
  | "quiz"
  | "study_plan"
  | "performance"
  | "mistake_analysis"
  | "revision"
  | "recommendations";

export type CoachFeatureResult = {
  feature: CoachFeature;
  context: string;
  instructions: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function detectFeature(message: string): CoachFeature {
  const value = message.toLowerCase();

  if (/\b(quiz|test me|test my knowledge|ask me questions|question me)\b/.test(value)) {
    return "quiz";
  }

  if (
    /\b(study plan|reading plan|study timetable|study schedule|what should i study|how should i study)\b/.test(
      value,
    )
  ) {
    return "study_plan";
  }

  if (
    /\b(mistake|mistakes|wrong answers|wrong answer|why was i wrong|explain my mistakes|analyze my mistakes)\b/.test(
      value,
    )
  ) {
    return "mistake_analysis";
  }

  if (/\b(revision|revise|revise me|revision plan|what should i revise)\b/.test(value)) {
    return "revision";
  }

  if (
    /\b(performance|my performance|my score|my scores|my result|my results|analytics|weak areas|weakness|strengths)\b/.test(
      value,
    )
  ) {
    return "performance";
  }

  if (
    /\b(recommend|recommendation|recommendations|what should i do next|next step|personalized|personalised|focus on next)\b/.test(
      value,
    )
  ) {
    return "recommendations";
  }

  return "tutor";
}

function accuracyLabel(accuracy: number): string {
  if (accuracy < 50) return "critical weakness";
  if (accuracy < 70) return "weak area";
  if (accuracy < 80) return "developing";
  if (accuracy < 90) return "strong";
  return "excellent";
}

async function getStudentData(userId: string) {
  const snapshot = await getAdminDb().collection("students").doc(userId).get();
  return snapshot.exists ? snapshot.data() || {} : {};
}

async function getPerformanceContext(userId: string): Promise<string> {
  const analytics = await getAcademicAnalytics(userId);

  const weak = Array.isArray(analytics.weakAreas) ? analytics.weakAreas : [];
  const strong = Array.isArray(analytics.strongAreas) ? analytics.strongAreas : [];

  return [
    `Overall accuracy: ${analytics.accuracy}%`,
    `Total attempts: ${analytics.totalAttempts}`,
    `Questions answered: ${analytics.totalQuestions}`,
    `Correct answers: ${analytics.totalCorrect}`,
    weak.length
      ? `Weak areas: ${weak
          .map(
            (item: any) =>
              `${item.topicId} (${item.accuracy}% accuracy; ${accuracyLabel(item.accuracy)})`,
          )
          .join(", ")}`
      : "Weak areas: No sufficiently sampled weak areas yet.",
    strong.length
      ? `Strong areas: ${strong
          .map((item: any) => `${item.topicId} (${item.accuracy}%)`)
          .join(", ")}`
      : "Strong areas: No sufficiently sampled strong areas yet.",
  ].join("\n");
}

async function getRecentMistakes(userId: string): Promise<string> {
  const db = getAdminDb();

  const attempts = await db
    .collection("academicAttempts")
    .where("userId", "==", userId)
    .limit(100)
    .get();

  const mistakes: string[] = [];

  for (const attemptDoc of attempts.docs) {
    const attempt = attemptDoc.data();

    if (!Array.isArray(attempt.answers)) continue;

    for (const answer of attempt.answers) {
      if (answer?.correct !== false || !answer?.questionId) continue;

      const questionDoc = await db
        .collection("academicQuestions")
        .doc(String(answer.questionId))
        .get();

      if (!questionDoc.exists) continue;

      const question = questionDoc.data() || {};
      const options = Array.isArray(question.options)
        ? question.options.map(String)
        : [];

      const selected =
        typeof answer.selectedOption === "number" && answer.selectedOption >= 0
          ? options[answer.selectedOption] || "Unknown"
          : "No answer";

      const correct =
        typeof question.correctOption === "number" &&
        question.correctOption >= 0
          ? options[question.correctOption] || "Unknown"
          : "Unknown";

      mistakes.push(
        [
          `Question: ${text(question.question)}`,
          `Selected answer: ${selected}`,
          `Correct answer: ${correct}`,
          `Explanation: ${text(question.explanation) || "No stored explanation."}`,
          `Subject ID: ${text(question.subjectId)}`,
          `Topic ID: ${text(question.topicId)}`,
          question.year ? `Year: ${question.year}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

      if (mistakes.length >= 15) {
        return mistakes.join("\n\n");
      }
    }
  }

  return mistakes.length
    ? mistakes.join("\n\n")
    : "No recorded incorrect answers are available yet.";
}

function instructionsFor(feature: CoachFeature): string {
  const instructions: Record<CoachFeature, string> = {
    tutor: `
TUTOR MODE:
Teach the requested JAMB concept progressively.
Start simple, then give the accurate academic definition.
Use examples, worked reasoning, common JAMB traps and a short check-for-understanding question.
Do not simply dump textbook text.
`,
    quiz: `
QUIZ MODE:
Act as an interactive JAMB examiner.
Ask one question at a time.
Do not reveal the answer before the student responds.
After the response, mark it, explain the reasoning and continue with an appropriate next question.
Use retrieved JAMB questions whenever available.
Never invent a claimed past JAMB question or year.
`,
    study_plan: `
STUDY PLAN MODE:
Create a practical personalized JAMB study plan from the student's actual subjects, target score, exam year, performance and weak areas.
Prioritize weak areas.
Include learning, revision, practice questions and mock exams.
Do not invent an exam date.
`,
    performance: `
PERFORMANCE ANALYSIS MODE:
Analyze the student's actual performance data.
Identify strengths, weak areas, patterns and priorities.
Do not invent statistics.
Finish with concrete next actions.
`,
    mistake_analysis: `
MISTAKE ANALYSIS MODE:
Analyze the student's recorded incorrect answers.
For useful mistakes, identify the concept, explain the misconception, show the correct reasoning, provide a concise memory aid and give a similar practice question.
Do not shame the student.
`,
    revision: `
REVISION MODE:
Use the student's actual weak areas to build targeted revision.
Prioritize weak areas, then developing areas.
Mix concise teaching, examples, retrieval questions and practice.
`,
    recommendations: `
RECOMMENDATION MODE:
Use the student's actual profile and performance to determine useful next actions.
Give specific recommendations with a reason.
Prioritize evidence-based study actions rather than generic motivation.
Do not make unsupported admission or examination-outcome claims.
`,
  };

  return instructions[feature];
}

export async function buildCoachFeatureContext(
  userId: string,
  message: string,
): Promise<CoachFeatureResult> {
  const feature = detectFeature(message);
  const student = await getStudentData(userId);

  let context = "";

  if (
    feature === "performance" ||
    feature === "quiz" ||
    feature === "tutor"
  ) {
    context = await getPerformanceContext(userId);
  }

  if (feature === "mistake_analysis") {
    context = await getRecentMistakes(userId);
  }

  if (feature === "study_plan") {
    context = [
      `Subjects: ${
        Array.isArray(student.subjects)
          ? student.subjects.join(", ")
          : "Not specified"
      }`,
      `Exam year: ${student.examYear ?? "Not specified"}`,
      `Target score: ${student.targetScore ?? "Not specified"}`,
      `Preferred course: ${student.preferredCourse ?? "Not specified"}`,
      `Preferred institution: ${
        student.preferredInstitution ?? "Not specified"
      }`,
      await getPerformanceContext(userId),
    ].join("\n");
  }

  if (feature === "revision" || feature === "recommendations") {
    context = [
      `Subjects: ${
        Array.isArray(student.subjects)
          ? student.subjects.join(", ")
          : "Not specified"
      }`,
      `Target score: ${student.targetScore ?? "Not specified"}`,
      `Exam year: ${student.examYear ?? "Not specified"}`,
      await getPerformanceContext(userId),
    ].join("\n");
  }

  return {
    feature,
    context: context || "No additional student-specific data is available.",
    instructions: instructionsFor(feature),
  };
}
