export type AcademicImportElementType =
  | "question"
  | "question_set"
  | "passage"
  | "table"
  | "chart"
  | "image"
  | "heading"
  | "text"
  | "unknown";

export type AcademicImportConfidence = "high" | "medium" | "low";

export type AcademicImportElement = {
  id: string;
  type: AcademicImportElementType;
  text: string;
  page?: number;
  order: number;

  confidence: AcademicImportConfidence;

  questionNumber?: string;
  options?: string[];
  possibleAnswer?: string;
  possibleExplanation?: string;

  year?: number;
  category?: string;

  media?: {
    type: "image" | "chart" | "table";
    description?: string;
  };

  possibleTopicId?: string;
  possibleTopicTitle?: string;
  questionSetId?: string;
  questionSetType?:
    | "Passage + Questions"
    | "Chart + Questions"
    | "Table + Questions"
    | "Image + Questions";
};

export type AcademicImportScreening = {
  importId: string;
  fileName: string;
  contentType: string;
  pageCount?: number;

  status:
    | "uploaded"
    | "screening"
    | "screened"
    | "needs_ocr"
    | "needs_review"
    | "approved"
    | "rejected";

  hasText: boolean;
  hasImages: boolean;
  hasTables: boolean;
  hasComplexLayout: boolean;

  elements: AcademicImportElement[];

  warnings: string[];

  createdAt?: unknown;
  updatedAt?: unknown;
};
