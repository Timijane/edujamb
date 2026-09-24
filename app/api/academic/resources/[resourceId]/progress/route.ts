import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  try {
    const token = await verifyBearerToken(request);

    if (!token?.uid) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { resourceId } = await params;
    const body = await request.json();

    const progress = Number(body.progress);
    const lastSection =
      typeof body.lastSection === "string"
        ? body.lastSection
        : "";
    const completed = body.completed === true;

    const hasBookmarkFields =
      typeof body.bookmarked === "boolean" ||
      typeof body.bookmarkSection === "string";

    const bookmarked =
      typeof body.bookmarked === "boolean"
        ? body.bookmarked
        : undefined;

    const bookmarkSection =
      typeof body.bookmarkSection === "string"
        ? body.bookmarkSection
        : undefined;

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return NextResponse.json(
        { error: "Progress must be between 0 and 100." },
        { status: 400 },
      );
    }

    const db = getAdminDb();

    const studentSnap = await db
      .collection("students")
      .doc(token.uid)
      .get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 403 },
      );
    }

    const student = studentSnap.data() || {};
    const selectedSubjects = Array.isArray(student.subjects)
      ? student.subjects.map((value) => String(value))
      : [];

    const resourceSnap = await db
      .collection("academicResources")
      .doc(resourceId)
      .get();

    if (!resourceSnap.exists) {
      return NextResponse.json(
        { error: "Academic resource not found." },
        { status: 404 },
      );
    }

    const resource = resourceSnap.data() || {};

    if (
      resource.active !== true ||
      resource.published !== true
    ) {
      return NextResponse.json(
        { error: "This academic resource is not available." },
        { status: 403 },
      );
    }

    const subjectId = String(resource.subjectId || "");

    const subjectSnap = await db
      .collection("academicSubjects")
      .doc(subjectId)
      .get();

    if (!subjectSnap.exists) {
      return NextResponse.json(
        { error: "Resource subject not found." },
        { status: 404 },
      );
    }

    const subject = subjectSnap.data() || {};
    const subjectName = String(subject.name || "");

    if (!selectedSubjects.includes(subjectName)) {
      return NextResponse.json(
        {
          error:
            "This resource is outside your approved subjects.",
        },
        { status: 403 },
      );
    }

    const progressUpdate: Record<string, unknown> = {
      studentId: token.uid,
      resourceId,
      progress: Math.round(progress),
      lastSection,
      completed,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (hasBookmarkFields) {
      if (typeof bookmarked === "boolean") {
        progressUpdate.bookmarked = bookmarked;
      }

      if (typeof bookmarkSection === "string") {
        progressUpdate.bookmarkSection = bookmarkSection;
      }
    }

    await db
      .collection("studentResourceProgress")
      .doc(`${token.uid}_${resourceId}`)
      .set(progressUpdate, { merge: true });

    return NextResponse.json({
      success: true,
      progress: Math.round(progress),
      lastSection,
      completed,
      ...(hasBookmarkFields
        ? {
            bookmarked:
              typeof bookmarked === "boolean"
                ? bookmarked
                : false,
            bookmarkSection:
              typeof bookmarkSection === "string"
                ? bookmarkSection
                : "",
          }
        : {}),
    });
  } catch (error) {
    console.error(
      "[STUDENT RESOURCE PROGRESS]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save reading progress.",
      },
      { status: 400 },
    );
  }
}
