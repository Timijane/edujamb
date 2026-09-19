import type {
  AcademicImportConfidence,
  AcademicImportElement,
  AcademicImportElementType,
} from "@/lib/academic-import-types";

type QuestionSetType =
  | "Passage + Questions"
  | "Chart + Questions"
  | "Table + Questions"
  | "Image + Questions";

function confidence(value: number): AcademicImportConfidence {
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

function detectElementType(line: string): AcademicImportElementType {
  const value = line.trim();

  if (!value) return "unknown";

  if (
    /^(passage|comprehension|read the passage|study the passage)\b/i.test(
      value,
    )
  ) {
    return "passage";
  }

  if (/^(chart|graph|figure|plot)\b/i.test(value)) {
    return "chart";
  }

  if (/^(table)\b/i.test(value)) {
    return "table";
  }

  if (/^(image|picture|photo|illustration|diagram)\b/i.test(value)) {
    return "image";
  }

  if (
    /^\d+[\.\)]\s+/.test(value) ||
    /^question\s*\d+/i.test(value) ||
    /^q\s*\d+[\.\):]/i.test(value)
  ) {
    return "question";
  }

  if (/^[A-D][\.\):]\s+/i.test(value)) {
    return "text";
  }

  if (/^(section|chapter|topic|unit|part)\b/i.test(value)) {
    return "heading";
  }

  return "text";
}

function extractQuestionNumber(line: string): string | undefined {
  const match =
    line.match(/^(\d+)[\.\)]\s+/) ||
    line.match(/^question\s*(\d+)/i) ||
    line.match(/^q\s*(\d+)[\.\):]/i);

  return match?.[1];
}

function extractOption(line: string): string | undefined {
  const match = line.trim().match(/^([A-D])[\.\):]\s*(.+)$/i);
  return match ? match[2].trim() : undefined;
}

function detectYear(text: string): number | undefined {
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return undefined;

  const year = Number(match[1]);

  if (year >= 1990 && year <= new Date().getFullYear() + 1) {
    return year;
  }

  return undefined;
}

function setTypeForElement(
  type: AcademicImportElementType,
): QuestionSetType | undefined {
  switch (type) {
    case "passage":
      return "Passage + Questions";
    case "chart":
      return "Chart + Questions";
    case "table":
      return "Table + Questions";
    case "image":
      return "Image + Questions";
    default:
      return undefined;
  }
}

export function screenAcademicText(
  text: string,
): AcademicImportElement[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const elements: AcademicImportElement[] = [];

  let currentQuestion: AcademicImportElement | null = null;
  let currentPassage: AcademicImportElement | null = null;
  let order = 0;

  function flushQuestion() {
    if (!currentQuestion) return;

    elements.push(currentQuestion);
    currentQuestion = null;
    order += 1;
  }

  function flushPassage() {
    if (!currentPassage) return;

    elements.push(currentPassage);
    currentPassage = null;
    order += 1;
  }

  for (const line of lines) {
    const option = extractOption(line);

    if (option && currentQuestion) {
      currentQuestion.options ??= [];
      currentQuestion.options.push(option);
      continue;
    }

    const type = detectElementType(line);

    if (type === "question") {
      flushQuestion();

      currentQuestion = {
        id: crypto.randomUUID(),
        type: "question",
        text: line,
        questionNumber: extractQuestionNumber(line),
        year: detectYear(line),
        order,
        confidence: confidence(0.9),
        options: [],
      };

      continue;
    }

    if (type === "passage") {
      flushQuestion();
      flushPassage();

      currentPassage = {
        id: crypto.randomUUID(),
        type: "passage",
        text: line,
        year: detectYear(line),
        order,
        confidence: confidence(0.85),
      };

      continue;
    }

    if (currentPassage && type === "text") {
      currentPassage.text += `\n${line}`;
      continue;
    }

    if (currentQuestion && type === "text") {
      const optionLike = /^[A-D][\.\):]\s+/i.test(line);

      if (!optionLike && !currentQuestion.options?.length) {
        currentQuestion.text += ` ${line}`;
        continue;
      }
    }

    const element: AcademicImportElement = {
      id: crypto.randomUUID(),
      type,
      text: line,
      year: detectYear(line),
      order,
      confidence: confidence(
        type === "heading" ? 0.85 : 0.65,
      ),
    };

    flushPassage();
    elements.push(element);
    order += 1;
  }

  flushQuestion();
  flushPassage();

  return groupAcademicElements(elements);
}

export function groupAcademicElements(
  elements: AcademicImportElement[],
): AcademicImportElement[] {
  let activeSetId: string | undefined;
  let activeSetType: QuestionSetType | undefined;

  return elements.map((element) => {
    const detectedSetType = setTypeForElement(element.type);

    if (detectedSetType) {
      activeSetId = crypto.randomUUID();
      activeSetType = detectedSetType;

      return {
        ...element,
        questionSetId: activeSetId,
        questionSetType: activeSetType,
      };
    }

    if (element.type === "question" && activeSetId && activeSetType) {
      return {
        ...element,
        questionSetId: activeSetId,
        questionSetType: activeSetType,
      };
    }

    if (
      element.type === "heading" ||
      element.type === "text" ||
      element.type === "unknown"
    ) {
      activeSetId = undefined;
      activeSetType = undefined;
    }

    return element;
  });
}
