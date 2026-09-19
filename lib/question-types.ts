export const QUESTION_CATEGORIES = [
  "JAMB Past Question",
  "Practice",
  "Mock Exam",
  "Revision",
] as const;

export const QUESTION_DIFFICULTIES = [
  "Easy",
  "Medium",
  "Hard",
] as const;

export const QUESTION_SET_TYPES = [
  "Passage + Questions",
  "Comprehension",
  "Chart + Questions",
  "Table + Questions",
  "Image + Questions",
  "Data Set + Questions",
  "Question Set",
] as const;

export const CONTENT_BLOCK_TYPES = [
  "text",
  "image",
  "heading",
  "quote",
  "list",
  "table",
  "divider",
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
export type QuestionSetType = (typeof QUESTION_SET_TYPES)[number];
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export type ContentBlock = {
  id: string;
  type: ContentBlockType;

  text?: string;
  level?: 1 | 2 | 3;

  imageUrl?: string;
  imageAlt?: string;
  imageCaption?: string;

  items?: string[];

  table?: {
    headers: string[];
    rows: string[][];
  };
};

export type AcademicQuestion = {
  id: string;

  subjectId: string;
  topicId: string;

  questionSetId?: string;

  question: string;

  questionContent?: ContentBlock[];

  options: string[];

  optionContent?: ContentBlock[][];

  correctOption: number;

  explanation: string;

  explanationContent?: ContentBlock[];

  year?: number;

  category: QuestionCategory;
  difficulty: QuestionDifficulty;

  imageUrl?: string;

  active: boolean;
  published: boolean;

  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AcademicQuestionSet = {
  id: string;

  subjectId: string;
  topicId: string;

  title: string;

  type: QuestionSetType;

  description?: string;

  content: ContentBlock[];

  media?: {
    url: string;
    type: "image" | "chart" | "diagram" | "table" | "document";
    alt?: string;
    caption?: string;
  }[];

  questionIds?: string[];

  active: boolean;
  published: boolean;

  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export function validateQuestionInput(body: Record<string, unknown>) {
  const question = String(body.question || "").trim();
  const explanation = String(body.explanation || "").trim();

  const subjectId = String(body.subjectId || "").trim();
  const topicId = String(body.topicId || "").trim();

  const rawOptions = Array.isArray(body.options)
    ? body.options.map((value) => String(value).trim())
    : [];

  const correctOption = Number(body.correctOption);

  const category = String(body.category || "");
  const difficulty = String(body.difficulty || "");

  if (!subjectId) {
    throw new Error("Subject is required.");
  }

  if (!topicId) {
    throw new Error("Topic is required.");
  }

  if (!question) {
    throw new Error("Question text is required.");
  }

  if (rawOptions.length !== 4) {
    throw new Error("Exactly 4 options are required.");
  }

  if (rawOptions.some((option) => !option)) {
    throw new Error("All 4 options must contain text.");
  }

  if (
    !Number.isInteger(correctOption) ||
    correctOption < 0 ||
    correctOption > 3
  ) {
    throw new Error("Correct option must be between 0 and 3.");
  }

  if (!QUESTION_CATEGORIES.includes(category as QuestionCategory)) {
    throw new Error("Invalid question category.");
  }

  if (
    !QUESTION_DIFFICULTIES.includes(
      difficulty as QuestionDifficulty
    )
  ) {
    throw new Error("Invalid question difficulty.");
  }

  let year: number | undefined;

  if (
    body.year !== undefined &&
    body.year !== null &&
    body.year !== ""
  ) {
    year = Number(body.year);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error("Invalid question year.");
    }
  }

  return {
    subjectId,
    topicId,
    question,
    questionContent: Array.isArray(body.questionContent)
      ? body.questionContent
      : [],
    options: rawOptions,
    optionContent: Array.isArray(body.optionContent)
      ? body.optionContent
      : [],
    correctOption,
    explanation,
    explanationContent: Array.isArray(body.explanationContent)
      ? body.explanationContent
      : [],
    questionSetId: String(body.questionSetId || "").trim() || undefined,
    year,
    category: category as QuestionCategory,
    difficulty: difficulty as QuestionDifficulty,
    imageUrl: String(body.imageUrl || "").trim(),
    active: body.active !== false,
    published: body.published === true,
  };
}

export function validateQuestionSetInput(body: Record<string, unknown>) {
  const subjectId = String(body.subjectId || "").trim();
  const topicId = String(body.topicId || "").trim();
  const title = String(body.title || "").trim();
  const type = String(body.type || "").trim();

  if (!subjectId) {
    throw new Error("Subject is required.");
  }

  if (!topicId) {
    throw new Error("Topic is required.");
  }

  if (!title) {
    throw new Error("Question set title is required.");
  }

  if (!QUESTION_SET_TYPES.includes(type as QuestionSetType)) {
    throw new Error("Invalid question set type.");
  }

  const content = Array.isArray(body.content)
    ? body.content
    : [];

  const media = Array.isArray(body.media)
    ? body.media
    : [];

  return {
    subjectId,
    topicId,
    title,
    type: type as QuestionSetType,
    description: String(body.description || "").trim(),
    content,
    media,
    active: body.active !== false,
    published: body.published === true,
  };
}
