import type { AcademicImportElement } from "@/lib/academic-import-types";

type TopicCandidate = {
  id: string;
  title: string;
  description?: string;
};

type TopicMatch = {
  topicId: string;
  topicTitle: string;
  confidence: "high" | "medium" | "low";
  score: number;
};

function normalize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function scoreTopic(text: string, topic: TopicCandidate): number {
  const sourceWords = new Set(normalize(text));
  const topicWords = normalize(
    `${topic.title} ${topic.description ?? ""}`,
  );

  if (!topicWords.length) return 0;

  let matches = 0;

  for (const word of topicWords) {
    if (sourceWords.has(word)) {
      matches += 1;
    }
  }

  return matches / topicWords.length;
}

function confidenceFromScore(
  score: number,
): "high" | "medium" | "low" {
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

export function matchAcademicTopics(
  elements: AcademicImportElement[],
  topics: TopicCandidate[],
): AcademicImportElement[] {
  if (!topics.length) return elements;

  return elements.map((element) => {
    const matches = topics
      .map((topic) => ({
        topic,
        score: scoreTopic(
          `${element.text} ${element.possibleExplanation ?? ""}`,
          topic,
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = matches[0];

    if (!best) {
      return element;
    }

    const match: TopicMatch = {
      topicId: best.topic.id,
      topicTitle: best.topic.title,
      confidence: confidenceFromScore(best.score),
      score: Number(best.score.toFixed(3)),
    };

    return {
      ...element,
      possibleTopicId: match.topicId,
      possibleTopicTitle: match.topicTitle,
      confidence: match.confidence,
    };
  });
}
