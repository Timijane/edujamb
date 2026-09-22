import { getAdminDb } from "@/lib/firebase-admin";

export type JambIntent =
  | "teach"
  | "explain"
  | "quiz"
  | "practice"
  | "past_question"
  | "mock_exam"
  | "study_plan"
  | "performance"
  | "mistake_analysis"
  | "revision"
  | "recommendations"
  | "general";

export type JambResolvedContext = {
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicTitle?: string;
  intent: JambIntent;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function detectIntent(query: string): JambIntent {
  const text = query.toLowerCase();

  if (
    /\b(teach|teach me|lesson|learn|learn about|study)\b/.test(text)
  ) {
    return "teach";
  }

  if (
    /\b(explain|explanation|what is|what are|how does|how do)\b/.test(text)
  ) {
    return "explain";
  }

  if (
    /\b(quiz|test me|ask me questions|question me)\b/.test(text)
  ) {
    return "quiz";
  }

  if (
    /\b(practice|practice questions|give me questions)\b/.test(text)
  ) {
    return "practice";
  }

  if (
    /\b(past question|past questions|utme question|jamb question)\b/.test(text)
  ) {
    return "past_question";
  }

  if (
    /\b(mock|mock exam|cbt)\b/.test(text)
  ) {
    return "mock_exam";
  }

  if (
    /\b(study plan|reading plan|timetable|study schedule)\b/.test(text)
  ) {
    return "study_plan";
  }

  if (
    /\b(mistake|mistakes|wrong answers|wrong answer|analyze my mistakes|explain my mistakes)\b/.test(text)
  ) {
    return "mistake_analysis";
  }

  if (
    /\b(revision|revise|revision plan|what should i revise)\b/.test(text)
  ) {
    return "revision";
  }

  if (
    /\b(recommend|recommendation|recommendations|what should i do next|next step|personalized|personalised|focus on next)\b/.test(text)
  ) {
    return "recommendations";
  }

  if (
    /\b(performance|my score|my scores|my result|my results|weak|weakness|analytics|strengths)\b/.test(text)
  ) {
    return "performance";
  }

  return "general";
}

function scoreMatch(query: string, candidate: string): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  if (!normalizedCandidate) return 0;

  if (normalizedQuery.includes(normalizedCandidate)) {
    return 100;
  }

  const candidateWords = normalizedCandidate
    .split(/\s+/)
    .filter(Boolean);

  const queryWords = normalizedQuery
    .split(/\s+/)
    .filter(Boolean);

  let score = 0;

  for (const word of candidateWords) {
    if (word.length < 3) continue;

    if (queryWords.includes(word)) {
      score += 10;
    }
  }

  return score;
}

export async function resolveJambQuery(
  query: string,
): Promise<JambResolvedContext> {
  const db = getAdminDb();

  const intent = detectIntent(query);

  const subjectSnapshot = await db
    .collection("academicSubjects")
    .where("active", "==", true)
    .where("published", "==", true)
    .get();

  let bestSubject:
    | {
        id: string;
        name: string;
        score: number;
      }
    | undefined;

  for (const doc of subjectSnapshot.docs) {
    const data = doc.data();

    const name = normalize(data.name);
    const code = normalize(data.code);

    const score = Math.max(
      scoreMatch(query, name),
      scoreMatch(query, code),
    );

    if (score > (bestSubject?.score ?? 0)) {
      bestSubject = {
        id: doc.id,
        name,
        score,
      };
    }
  }

  const topicSnapshot = await db
    .collection("academicTopics")
    .where("active", "==", true)
    .where("published", "==", true)
    .limit(300)
    .get();

  let bestTopic:
    | {
        id: string;
        subjectId: string;
        title: string;
        score: number;
      }
    | undefined;

  for (const doc of topicSnapshot.docs) {
    const data = doc.data();

    const subjectId = normalize(data.subjectId);

    if (bestSubject && subjectId !== bestSubject.id) {
      continue;
    }

    const title = normalize(data.title);
    const description = normalize(data.description);

    const score = Math.max(
      scoreMatch(query, title),
      scoreMatch(query, description),
    );

    if (score > (bestTopic?.score ?? 0)) {
      bestTopic = {
        id: doc.id,
        subjectId,
        title,
        score,
      };
    }
  }

  return {
    intent,
    subjectId: bestSubject?.id,
    subjectName: bestSubject?.name,
    topicId: bestTopic?.id,
    topicTitle: bestTopic?.title,
  };
}
