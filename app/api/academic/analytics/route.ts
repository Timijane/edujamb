import { NextResponse } from "next/server";
import { verifyBearerToken } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAcademicAnalytics } from "@/lib/academic-analytics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await verifyBearerToken(request);

    const student = await getAdminDb()
      .collection("students")
      .doc(token.uid)
      .get();

    if (!student.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 },
      );
    }

    const analytics = await getAcademicAnalytics(token.uid);

    return NextResponse.json({ analytics });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load academic analytics.",
      },
      { status: 400 },
    );
  }
}
