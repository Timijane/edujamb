import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import { JAMB_SUBJECTS } from "@/lib/student-types";

export const runtime = "nodejs";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

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

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function boolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function calculateCompletion(data: {
  username: string;
  phone: string;
  state: string;
  examYear: string;
  targetScore: string;
  preferredCourse: string;
  preferredInstitution: string;
  subjects: string[];
}) {
  const fields = [
    data.username,
    data.phone,
    data.state,
    data.examYear,
    data.targetScore,
    data.preferredCourse,
    data.preferredInstitution,
  ];

  const completedFields = fields.filter(Boolean).length;
  const subjectComplete = data.subjects.length === 4;

  const totalRequirements = fields.length + 1;
  const completedRequirements = completedFields + (subjectComplete ? 1 : 0);

  return Math.round((completedRequirements / totalRequirements) * 100);
}

export async function GET(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);
    const uid = decoded.uid;

    const studentSnap = await getAdminDb()
      .collection("students")
      .doc(uid)
      .get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Student profile was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      student: studentSnap.data(),
    });
  } catch (error) {
    console.error("Student profile GET error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load your profile." },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await verifyBearerToken(request);
    const uid = decoded.uid;
    const body = await request.json();

    const db = getAdminDb();

    const studentRef = db.collection("students").doc(uid);
    const userRef = db.collection("users").doc(uid);

    const studentSnap = await studentRef.get();
    const userSnap = await userRef.get();

    if (!studentSnap.exists || !userSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Student account data was not found." },
        { status: 404 }
      );
    }

    const current = studentSnap.data() || {};

    const username = text(body.username);
    const usernameLower = username.toLowerCase();

    const phone = text(body.phone);
    const state = text(body.state);
    const school = text(body.school);
    const educationLevel = text(body.educationLevel);

    const dateOfBirth = text(body.dateOfBirth);
    const gender = text(body.gender);

    const examYear = text(body.examYear);
    const targetScore = text(body.targetScore);
    const preferredCourse = text(body.preferredCourse);
    const preferredInstitution = text(body.preferredInstitution);

    const subjects = Array.isArray(body.subjects)
      ? body.subjects
          .filter((item: unknown): item is string => typeof item === "string")
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];

    const showRealNamePublicly = boolean(
      body.showRealNamePublicly,
      Boolean(current.showRealNamePublicly)
    );

    const showBirthDay = boolean(
      body.showBirthDay,
      Boolean(current.showBirthDay)
    );

    const showBirthMonth = boolean(
      body.showBirthMonth,
      Boolean(current.showBirthMonth)
    );

    const showBirthYear = boolean(
      body.showBirthYear,
      Boolean(current.showBirthYear)
    );

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Username must be 3–20 characters using letters, numbers or underscores.",
        },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(usernameLower)) {
      return NextResponse.json(
        { success: false, message: "That username is reserved." },
        { status: 400 }
      );
    }

    if (!PHONE_PATTERN.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid WhatsApp number with an international country code, for example +2348012345678.",
        },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { success: false, message: "State is required." },
        { status: 400 }
      );
    }

    if (!examYear) {
      return NextResponse.json(
        { success: false, message: "JAMB examination year is required." },
        { status: 400 }
      );
    }

    const score = Number(targetScore);

    if (
      !targetScore ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 400
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Target JAMB score must be a whole number between 0 and 400.",
        },
        { status: 400 }
      );
    }

    if (!preferredCourse) {
      return NextResponse.json(
        { success: false, message: "Course of study is required." },
        { status: 400 }
      );
    }

    if (!preferredInstitution) {
      return NextResponse.json(
        { success: false, message: "Preferred institution is required." },
        { status: 400 }
      );
    }

    if (subjects.length !== 4 || new Set(subjects).size !== 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select exactly four different JAMB subjects.",
        },
        { status: 400 }
      );
    }

    const invalidSubject = subjects.find(
      (subject: string) => !(JAMB_SUBJECTS as readonly string[]).includes(subject)
    );

    if (invalidSubject) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid JAMB subject: ${invalidSubject}.`,
        },
        { status: 400 }
      );
    }

    const completion = calculateCompletion({
      username,
      phone,
      state,
      examYear,
      targetScore,
      preferredCourse,
      preferredInstitution,
      subjects,
    });

    if (completion < 60) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your profile must be at least 60% complete before you can access the dashboard.",
          profileCompletionPercentage: completion,
        },
        { status: 400 }
      );
    }

    const usernameRef = db.collection("usernames").doc(usernameLower);

    await db.runTransaction(async (transaction) => {
      const usernameSnap = await transaction.get(usernameRef);

      if (
        usernameSnap.exists &&
        usernameSnap.data()?.uid !== uid
      ) {
        throw new Error("USERNAME_TAKEN");
      }

      transaction.set(
        usernameRef,
        {
          uid,
          username,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      transaction.update(studentRef, {
        username,
        usernameLower,
        phone,
        state,
        school,
        educationLevel,
        dateOfBirth,
        gender,
        showRealNamePublicly,
        showBirthDay,
        showBirthMonth,
        showBirthYear,
        examYear,
        targetScore,
        preferredCourse,
        preferredInstitution,
        subjects,
        profileComplete: true,
        profileCompletionPercentage: completion,
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
      message: "Profile completed successfully.",
      profileComplete: true,
      profileCompletionPercentage: completion,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json(
        {
          success: false,
          message: "That username is already taken.",
        },
        { status: 409 }
      );
    }

    console.error("Student profile POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save your profile.",
      },
      { status: 500 }
    );
  }
}
