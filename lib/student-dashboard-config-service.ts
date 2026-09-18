import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  defaultStudentDashboardConfig,
  normalizeStudentDashboardConfig,
  type StudentDashboardConfig,
} from "@/lib/student-dashboard-config";

const COLLECTION = "studentDashboardConfig";
const CONFIG_ID = "main";

export async function getStudentDashboardConfig(): Promise<StudentDashboardConfig> {
  try {
    const snapshot = await getDoc(
      doc(db, COLLECTION, CONFIG_ID)
    );

    if (!snapshot.exists()) {
      return defaultStudentDashboardConfig;
    }

    return normalizeStudentDashboardConfig(
      snapshot.data() as Partial<StudentDashboardConfig>
    );
  } catch (error) {
    console.error(
      "Failed to load student dashboard configuration:",
      error
    );

    return defaultStudentDashboardConfig;
  }
}

export async function saveStudentDashboardConfig(
  config: StudentDashboardConfig
) {
  const normalized =
    normalizeStudentDashboardConfig(config);

  await setDoc(
    doc(db, COLLECTION, CONFIG_ID),
    {
      ...normalized,
      status: "draft",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return normalized;
}

export async function publishStudentDashboardConfig(
  config: StudentDashboardConfig
) {
  const normalized =
    normalizeStudentDashboardConfig(config);

  await setDoc(
    doc(db, COLLECTION, CONFIG_ID),
    {
      ...normalized,
      status: "published",
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    ...normalized,
    status: "published" as const,
  };
}

export async function ensureStudentDashboardConfig() {
  const snapshot = await getDoc(
    doc(db, COLLECTION, CONFIG_ID)
  );

  if (snapshot.exists()) {
    return normalizeStudentDashboardConfig(
      snapshot.data() as Partial<StudentDashboardConfig>
    );
  }

  await setDoc(
    doc(db, COLLECTION, CONFIG_ID),
    {
      ...defaultStudentDashboardConfig,
      status: "published",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    }
  );

  return defaultStudentDashboardConfig;
}
