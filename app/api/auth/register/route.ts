import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = cleanEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = cleanName(body.firstName);
    const lastName = cleanName(body.lastName);

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: "First name, last name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await adminAuth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`.trim(),
        emailVerified: false,
        disabled: false,
      });
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String((error as { code: unknown }).code)
          : "";

      if (code.includes("email-already-exists")) {
        return NextResponse.json(
          { success: false, message: "An account with this email already exists." },
          { status: 409 }
        );
      }

      throw error;
    }

    await adminDb.collection("users").doc(user.uid).set({
      accountType: "student",
      email,
      emailVerified: false,
      onboardingComplete: false,
      selectedExam: null,
      role: "student",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await adminDb.collection("students").doc(user.uid).set({
      firstName,
      lastName,
      username: "",
      usernameLower: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      state: "",
      school: "",
      educationLevel: "",
      examYear: "",
      targetScore: "",
      preferredCourse: "",
      preferredInstitution: "",
      subjects: [],
      profileComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      message: "Student account created successfully.",
    });
  } catch (error) {
    console.error("Student registration error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the account." },
      { status: 500 }
    );
  }
}
