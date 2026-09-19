export type AcademicSubject = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  active: boolean;
  published: boolean;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AcademicTopic = {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  order: number;
  active: boolean;
  published: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};
