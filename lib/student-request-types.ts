export type StudentRequestType =
  | "subject_change"
  | "additional_subject"
  | "profile_preference_change";

export type StudentRequestStatus =
  | "pending"
  | "approved"
  | "denied";

export type StudentRequest = {
  requestId: string;
  studentId: string;

  type: StudentRequestType;

  currentValue: string | string[];
  requestedValue: string | string[];

  reason: string;

  status: StudentRequestStatus;

  submittedAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
  adminNote?: string;
};

export const STUDENT_REQUEST_TYPE_LABELS: Record<
  StudentRequestType,
  string
> = {
  subject_change: "Subject Change",
  additional_subject: "Additional Subject",
  profile_preference_change:
    "Profile Preference Change",
};

export const STUDENT_REQUEST_STATUS_LABELS: Record<
  StudentRequestStatus,
  string
> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
};
