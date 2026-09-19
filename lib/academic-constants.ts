export const DEFAULT_JAMB_SUBJECTS = [
  { name: "English Language", code: "ENG", order: 1 },
  { name: "Mathematics", code: "MAT", order: 2 },
  { name: "Physics", code: "PHY", order: 3 },
  { name: "Chemistry", code: "CHE", order: 4 },
  { name: "Biology", code: "BIO", order: 5 },
  { name: "Economics", code: "ECO", order: 6 },
  { name: "Government", code: "GOV", order: 7 },
  { name: "Literature in English", code: "LIT", order: 8 },
  { name: "Commerce", code: "COM", order: 9 },
  { name: "Accounting", code: "ACC", order: 10 },
  { name: "Geography", code: "GEO", order: 11 },
  { name: "Christian Religious Studies", code: "CRS", order: 12 },
  { name: "Islamic Religious Studies", code: "IRS", order: 13 },
  { name: "Agricultural Science", code: "AGR", order: 14 },
  { name: "Computer Science", code: "CSC", order: 15 },
] as const;

export function academicSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
