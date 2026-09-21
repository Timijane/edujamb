import { getAdminDb } from "@/lib/firebase-admin";

export type JambRetrievalRequest = {
  query?: string;
  subjectId?: string;
  topicId?: string;
  year?: number;
  category?: string;
  difficulty?: string;
  limit?: number;
};

export type JambRetrievedQuestion = {
  id: string;
  subjectId: string;
  topicId: string;
  questionSetId?: string;
  question: string;
  options: string[];
  explanation: string;
  year?: number;
  category: string;
  difficulty: string;
  imageUrl?: string;
};

export type JambRetrievedTopic = {
  id: string;
  subjectId: string;
  title: string;
  description: string;
};

export type JambRetrievalResult = {
  questions: JambRetrievedQuestion[];
  topics: JambRetrievedTopic[];
  context: string;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function matchesQuery(text: string, query: string): boolean {
  if (!query) return true;

  const normalizedText = text.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return terms.every((term) => normalizedText.includes(term));
}

function questionMatches(
  data: Record<string, unknown>,
  request: JambRetrievalRequest,
): boolean {
  if (request.subjectId && data.subjectId !== request.subjectId) {
    return false;
  }

  if (request.topicId && data.topicId !== request.topicId) {
    return false;
  }

  if (request.year !== undefined && data.year !== request.year) {
    return false;
  }

  if (request.category && data.category !== request.category) {
    return false;
  }

  if (request.difficulty && data.difficulty !== request.difficulty) {
    return false;
  }

  const query = normalize(request.query);

  if (!query) return true;

  const searchable = [
    normalize(data.question),
    normalize(data.explanation),
    normalize(data.category),
    normalize(data.difficulty),
  ].join(" ");

  return matchesQuery(searchable, query);
}

export async function retrieveJambKnowledge(
  request: JambRetrievalRequest = {},
): Promise<JambRetrievalResult> {
  const db = getAdminDb();

  const limit = Math.min(Math.max(request.limit ?? 8, 1), 20);

  const questionSnapshot = await db
    .collection("academicQuestions")
    .where("active", "==", true)
    .where("published", "==", true)
    .limit(100)
    .get();

  const questions: JambRetrievedQuestion[] = [];

  for (const doc of questionSnapshot.docs) {
    const data = doc.data() as Record<string, unknown>;

    if (!questionMatches(data, request)) continue;

    questions.push({
      id: doc.id,
      subjectId: normalize(data.subjectId),
      topicId: normalize(data.topicId),
      questionSetId: normalize(data.questionSetId) || undefined,
      question: normalize(data.question),
      options: Array.isArray(data.options)
        ? data.options.map((option) => String(option))
        : [],
      explanation: normalize(data.explanation),
      year: typeof data.year === "number" ? data.year : undefined,
      category: normalize(data.category),
      difficulty: normalize(data.difficulty),
      imageUrl: normalize(data.imageUrl) || undefined,
    });

    if (questions.length >= limit) break;
  }

  const topicSnapshot = await db
    .collection("academicTopics")
    .where("active", "==", true)
    .where("published", "==", true)
    .limit(100)
    .get();

  const topics: JambRetrievedTopic[] = [];

  for (const doc of topicSnapshot.docs) {
    const data = doc.data() as Record<string, unknown>;

    if (request.subjectId && data.subjectId !== request.subjectId) {
      continue;
    }

    const query = normalize(request.query);

    if (
      query &&
      !matchesQuery(
        [
          normalize(data.title),
          normalize(data.description),
        ].join(" "),
        query,
      )
    ) {
      continue;
    }

    topics.push({
      id: doc.id,
      subjectId: normalize(data.subjectId),
      title: normalize(data.title),
      description: normalize(data.description),
    });

    if (topics.length >= limit) break;
  }

  const contextParts: string[] = [];

  if (topics.length > 0) {
    contextParts.push(
      "RELEVANT JAMB TOPICS:\n" +
        topics
          .map(
            (topic) =>
              `- ${topic.title}: ${topic.description || "No description available."}`,
          )
          .join("\n"),
    );
  }

  if (questions.length > 0) {
    contextParts.push(
      "RELEVANT JAMB QUESTIONS:\n" +
        questions
          .map((question, index) => {
            const options = question.options
              .map(
                (option, optionIndex) =>
                  `${String.fromCharCode(65 + optionIndex)}. ${option}`,
              )
              .join(" | ");

            return [
              `${index + 1}. ${question.question}`,
              options ? `Options: ${options}` : "",
              question.explanation
                ? `Explanation: ${question.explanation}`
                : "",
              question.year ? `Year: ${question.year}` : "",
              question.category ? `Category: ${question.category}` : "",
              question.difficulty
                ? `Difficulty: ${question.difficulty}`
                : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n"),
    );
  }

  return {
    questions,
    topics,
    context: contextParts.join("\n\n"),
  };
}

export async function retrieveStudentJambKnowledge(
  userId: string,
  request: JambRetrievalRequest = {},
): Promise<JambRetrievalResult> {
  const db = getAdminDb();

  const studentSnap = await db
    .collection("students")
    .doc(userId)
    .get();

  if (!studentSnap.exists) {
    return retrieveJambKnowledge(request);
  }

  const student = studentSnap.data() || {};

  const selectedSubjects = Array.isArray(student.subjects)
    ? student.subjects.filter(
        (subject): subject is string => typeof subject === "string",
      )
    : [];

  if (selectedSubjects.length === 0) {
    return retrieveJambKnowledge(request);
  }

  const subjectSnapshot = await db
    .collection("academicSubjects")
    .where("active", "==", true)
    .where("published", "==", true)
    .get();

  const selectedSubjectIds = subjectSnapshot.docs
    .filter((doc) => {
      const data = doc.data();

      return selectedSubjects.includes(
        typeof data.name === "string" ? data.name : "",
      );
    })
    .map((doc) => doc.id);

  if (selectedSubjectIds.length === 0) {
    return retrieveJambKnowledge(request);
  }

  const requestedLimit = Math.min(Math.max(request.limit ?? 8, 1), 20);
  const questions: JambRetrievedQuestion[] = [];

  for (const subjectId of selectedSubjectIds) {
    if (
      request.subjectId &&
      request.subjectId !== subjectId
    ) {
      continue;
    }

    let query = db
      .collection("academicQuestions")
      .where("active", "==", true)
      .where("published", "==", true)
      .where("subjectId", "==", subjectId)
      .limit(50);

    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;

      if (!questionMatches(data, request)) continue;

      questions.push({
        id: doc.id,
        subjectId: normalize(data.subjectId),
        topicId: normalize(data.topicId),
        questionSetId: normalize(data.questionSetId) || undefined,
        question: normalize(data.question),
        options: Array.isArray(data.options)
          ? data.options.map((option) => String(option))
          : [],
        explanation: normalize(data.explanation),
        year: typeof data.year === "number" ? data.year : undefined,
        category: normalize(data.category),
        difficulty: normalize(data.difficulty),
        imageUrl: normalize(data.imageUrl) || undefined,
      });

      if (questions.length >= requestedLimit) {
        break;
      }
    }

    if (questions.length >= requestedLimit) {
      break;
    }
  }

  const topicSnapshot = await db
    .collection("academicTopics")
    .where("active", "==", true)
    .where("published", "==", true)
    .limit(200)
    .get();

  const topics: JambRetrievedTopic[] = [];

  for (const doc of topicSnapshot.docs) {
    const data = doc.data() as Record<string, unknown>;
    const subjectId = normalize(data.subjectId);

    if (!selectedSubjectIds.includes(subjectId)) {
      continue;
    }

    if (request.subjectId && request.subjectId !== subjectId) {
      continue;
    }

    const query = normalize(request.query);

    if (
      query &&
      !matchesQuery(
        [
          normalize(data.title),
          normalize(data.description),
        ].join(" "),
        query,
      )
    ) {
      continue;
    }

    topics.push({
      id: doc.id,
      subjectId,
      title: normalize(data.title),
      description: normalize(data.description),
    });

    if (topics.length >= requestedLimit) {
      break;
    }
  }

  const contextParts: string[] = [];

  if (topics.length > 0) {
    contextParts.push(
      "STUDENT'S SELECTED-SUBJECT JAMB TOPICS:\n" +
        topics
          .map(
            (topic) =>
              `- ${topic.title}: ${
                topic.description || "No description available."
              }`,
          )
          .join("\n"),
    );
  }

  if (questions.length > 0) {
    contextParts.push(
      "STUDENT'S SELECTED-SUBJECT JAMB QUESTIONS:\n" +
        questions
          .map((question, index) => {
            const options = question.options
              .map(
                (option, optionIndex) =>
                  `${String.fromCharCode(65 + optionIndex)}. ${option}`,
              )
              .join(" | ");

            return [
              `${index + 1}. ${question.question}`,
              options ? `Options: ${options}` : "",
              question.explanation
                ? `Explanation: ${question.explanation}`
                : "",
              question.year ? `Year: ${question.year}` : "",
              question.category
                ? `Category: ${question.category}`
                : "",
              question.difficulty
                ? `Difficulty: ${question.difficulty}`
                : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n"),
    );
  }

  return {
    questions,
    topics,
    context: contextParts.join("\n\n"),
  };
}
