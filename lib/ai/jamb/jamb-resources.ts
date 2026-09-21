import { getAdminDb } from "@/lib/firebase-admin";

export type JambResourceType =
  | "textbook"
  | "study_note"
  | "syllabus"
  | "scheme_of_work"
  | "reference"
  | "other";

export type JambResourceChunk = {
  id: string;
  resourceId: string;
  title: string;
  text: string;
  subjectId?: string;
  topicId?: string;
  chapter?: string;
  page?: number;
  resourceType: JambResourceType;
  sourceName: string;
};

export type JambResourceRetrievalResult = {
  chunks: JambResourceChunk[];
  context: string;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function scoreText(text: string, query: string): number {
  const source = text.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  if (!terms.length) return 0;

  let score = 0;

  for (const term of terms) {
    if (source.includes(term)) {
      score += 1;
    }
  }

  return score;
}

export async function retrieveJambResources(
  query: string,
  options: {
    subjectId?: string;
    topicId?: string;
    limit?: number;
  } = {},
): Promise<JambResourceRetrievalResult> {
  const db = getAdminDb();

  const limit = Math.min(Math.max(options.limit ?? 6, 1), 12);

  const snapshot = await db
    .collection("academicResources")
    .where("active", "==", true)
    .where("published", "==", true)
    .limit(300)
    .get();

  const ranked: Array<{
    chunk: JambResourceChunk;
    score: number;
  }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;

    const subjectId = normalize(data.subjectId);
    const topicId = normalize(data.topicId);

    if (options.subjectId && subjectId !== options.subjectId) {
      continue;
    }

    if (options.topicId && topicId !== options.topicId) {
      continue;
    }

    const chunks = Array.isArray(data.chunks)
      ? data.chunks
      : [];

    for (const rawChunk of chunks) {
      if (!rawChunk || typeof rawChunk !== "object") {
        continue;
      }

      const chunk = rawChunk as Record<string, unknown>;

      const title = normalize(chunk.title);
      const text = normalize(chunk.text);

      const score =
        scoreText(title, query) * 3 +
        scoreText(text, query);

      if (score <= 0) {
        continue;
      }

      ranked.push({
        score,
        chunk: {
          id: normalize(chunk.id) || `${doc.id}-${ranked.length}`,
          resourceId: doc.id,
          title,
          text,
          subjectId: subjectId || undefined,
          topicId: topicId || undefined,
          chapter: normalize(chunk.chapter) || undefined,
          page:
            typeof chunk.page === "number"
              ? chunk.page
              : undefined,
          resourceType:
            (normalize(data.resourceType) as JambResourceType) ||
            "other",
          sourceName:
            normalize(data.title) ||
            normalize(data.fileName) ||
            "JAMBMASTER Resource",
        },
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  const chunks = ranked
    .slice(0, limit)
    .map((item) => item.chunk);

  const context =
    chunks.length > 0
      ? [
          "JAMBMASTER ACADEMIC RESOURCES:",
          ...chunks.map((chunk, index) =>
            [
              `${index + 1}. ${chunk.sourceName}`,
              chunk.title ? `Section: ${chunk.title}` : "",
              chunk.chapter ? `Chapter: ${chunk.chapter}` : "",
              chunk.page ? `Page: ${chunk.page}` : "",
              `Content: ${chunk.text}`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n")
      : "";

  return {
    chunks,
    context,
  };
}
