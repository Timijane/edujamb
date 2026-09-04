export const JAMB_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature in English",
  "Commerce",
  "Accounting",
  "Geography",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Agricultural Science",
  "Computer Science",
] as const;

export type StudentProfile = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  state: string;
  school: string;
  educationLevel: string;
  examYear: string;
  targetScore: string;
  preferredCourse: string;
  preferredInstitution: string;
  subjects: string[];
  profileComplete: boolean;
};
