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

  // Public identity
  username: string;
  usernameLower?: string;
  showRealNamePublicly: boolean;

  // Contact
  phone: string;

  // Personal information
  dateOfBirth: string;
  gender: string;

  // Date-of-birth privacy
  showBirthDay: boolean;
  showBirthMonth: boolean;
  showBirthYear: boolean;

  // Education
  state: string;
  school: string;
  educationLevel: string;

  // JAMB preparation
  examYear: string;
  targetScore: string;
  preferredCourse: string;
  preferredInstitution: string;
  subjects: string[];

  // Profile completion
  profileComplete: boolean;
  profileCompletionPercentage: number;
};
