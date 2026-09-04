import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "supporter",
  "teacher",
  "teachers",
  "student",
  "students",
  "edujamb",
  "jambmaster",
  "system",
  "official",
  "moderator",
  "moderators",
  "superadmin",
]);

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);
    const uid = decoded.uid;
    const body = await request.json();

    const username = text(body.username);
    const usernameLower = username.toLowerCase();
    const subjects = Array.isArray(body.subjects)
      ? body.subjects.filter((item: unknown): item is string => typeof item === "string")
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        { success: false, message: "Username must be 3–20 characters using letters, numbers or underscores." },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(usernameLower)) {
      return NextResponse.json(
        { success: false, message: "That username is reserved." },
        { status: 400 }
      );
    }

    if (body.selectedExam !== "JAMB") {
      return NextResponse.json(
        { success: false, message: "JAMB is the only enabled exam at this time." },
        { status: 400 }
      );
    }

    if (subjects.length !== 4 || new Set(subjects).size !== 4) {
      return NextResponse.json(
        { success: false, message: "Please select exactly four different JAMB subjects." },
        { status: 400 }
      );
    }

    const usernameRef = getAdminDb().collection("usernames").doc(usernameLower);
    const studentRef = getAdminDb().collection("students").doc(uid);
    const userRef = getAdminDb().collection("users").doc(uid);

    await getAdminDb().runTransaction(async (transaction) => {
      const [usernameSnap, studentSnap] = await Promise.all([
        transaction.get(usernameRef),
        transaction.get(studentRef),
      ]);

      if (usernameSnap.exists && usernameSnap.data()?.uid !== uid) {
        throw new Error("USERNAME_TAKEN");
      }

      if (!studentSnap.exists) {
        throw new Error("STUDENT_NOT_FOUND");
      }

      transaction.set(
        usernameRef,
        { uid, username, updatedAt: new Date() },
        { merge: true }
      );

      transaction.update(studentRef, {
        username,
        usernameLower,
        phone: text(body.phone),
        dateOfBirth: text(body.dateOfBirth),
        gender: text(body.gender),
        state: text(body.state),
        school: text(body.school),
        educationLevel: text(body.educationLevel),
        examYear: text(body.examYear),
        targetScore: text(body.targetScore),
        preferredCourse: text(body.preferredCourse),
        preferredInstitution: text(body.preferredInstitution),
        subjects,
        profileComplete: true,
        updatedAt: new Date(),
      });

      transaction.update(userRef, {
        selectedExam: "JAMB",
        onboardingComplete: true,
        updatedAt: new Date(),
      });
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json(
        { success: false, message: "That username is already taken." },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Student profile was not found." },
        { status: 404 }
      );
    }

    console.error("Onboarding error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to complete onboarding." },
      { status: 500 }
    );
  }
}
