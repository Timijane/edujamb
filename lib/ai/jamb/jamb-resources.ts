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

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

function scoreText(text: string, query: string): number {
  const source = text.toLowerCase();
  const terms = tokenize(query);

  if (!terms.length) return 0;

  let score = 0;

  for (const term of terms) {
    if (source.includes(term)) {
      score += 1;
    }

    const matches = source.split(term).length - 1;

    if (matches > 1) {
      score += Math.min(matches - 1, 3) * 0.5;
    }
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (
    normalizedQuery.length >= 5 &&
    source.includes(normalizedQuery)
  ) {
    score += 5;
  }

  return score;
}

function scoreChunk(
  title: string,
  text: string,
  query: string,
): number {
  const titleScore = scoreText(title, query) * 5;
  const textScore = scoreText(text, query);

  return titleScore + textScore;
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

  const limit = Math.min(
    Math.max(options.limit ?? 6, 1),
    12,
  );

  /*
   * Query active resources first, then check published in memory.
   *
   * This avoids requiring a Firestore composite index for:
   * active == true + published == true.
   */
  const snapshot = await db
    .collection("academicResources")
    .where("active", "==", true)
    .limit(300)
    .get();

  const ranked: Array<{
    chunk: JambResourceChunk;
    score: number;
  }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as Record<string, unknown>;

    if (data.published !== true) {
      continue;
    }

    const subjectId = normalize(data.subjectId);
    const topicId = normalize(data.topicId);

    if (
      options.subjectId &&
      subjectId !== options.subjectId
    ) {
      continue;
    }

    if (
      options.topicId &&
      topicId !== options.topicId
    ) {
      continue;
    }

    const chunks = Array.isArray(data.chunks)
      ? data.chunks
      : [];

    const sourceName =
      normalize(data.title) ||
      normalize(data.fileName) ||
      "JAMBMASTER Resource";

    const resourceType =
      (normalize(data.resourceType) as JambResourceType) ||
      "other";

    for (const rawChunk of chunks) {
      if (!rawChunk || typeof rawChunk !== "object") {
        continue;
      }

      const chunk = rawChunk as Record<string, unknown>;

      const title = normalize(chunk.title);
      const text = normalize(chunk.text);

      if (!text) {
        continue;
      }

      let score = scoreChunk(title, text, query);

      /*
       * Small relevance bonuses when the caller already resolved
       * the student's subject/topic.
       */
      if (options.subjectId && subjectId === options.subjectId) {
        score += 2;
      }

      if (options.topicId && topicId === options.topicId) {
        score += 3;
      }

      if (score <= 0) {
        continue;
      }

      ranked.push({
        score,
        chunk: {
          id:
            normalize(chunk.id) ||
            `${doc.id}-${ranked.length}`,
          resourceId: doc.id,
          title,
          text,
          subjectId: subjectId || undefined,
          topicId: topicId || undefined,
          chapter:
            normalize(chunk.chapter) || undefined,
          page:
            typeof chunk.page === "number"
              ? chunk.page
              : undefined,
          resourceType,
          sourceName,
        },
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  /*
   * Prevent the same resource from dominating the entire context.
   * A maximum of three chunks from one resource is enough for a
   * focused tutoring response.
   */
  const resourceCounts = new Map<string, number>();
  const selected: JambResourceChunk[] = [];

  for (const item of ranked) {
    const count =
      resourceCounts.get(item.chunk.resourceId) || 0;

    if (count >= 3) {
      continue;
    }

    selected.push(item.chunk);
    resourceCounts.set(
      item.chunk.resourceId,
      count + 1,
    );

    if (selected.length >= limit) {
      break;
    }
  }

  const context =
    selected.length > 0
      ? [
          "JAMBMASTER ACADEMIC RESOURCES:",
          ...selected.map((chunk, index) =>
            [
              `SOURCE ${index + 1}: ${chunk.sourceName}`,
              `Resource type: ${chunk.resourceType}`,
              chunk.title
                ? `Section: ${chunk.title}`
                : "",
              chunk.chapter
                ? `Chapter: ${chunk.chapter}`
                : "",
              chunk.page
                ? `Page: ${chunk.page}`
                : "",
              `Content: ${chunk.text}`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ].join("\n\n")
      : "";

  return {
    chunks: selected,
    context,
  };
}
