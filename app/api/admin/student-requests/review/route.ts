import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminAuth } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyBearerToken(request);
    const adminUid = decodedToken.uid;

    if (!adminUid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const auth = getAdminAuth();
    const adminUser = await auth.getUser(adminUid);

    const db = getAdminDb();

    const adminSnapshot = await db
      .collection("adminUsers")
      .doc(adminUid)
      .get();

    if (
      !adminSnapshot.exists ||
      adminSnapshot.data()?.active !== true ||
      adminSnapshot.data()?.role !== "super_admin"
    ) {
      return NextResponse.json(
        { success: false, error: "Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const requestId =
      typeof body?.requestId === "string"
        ? body.requestId.trim()
        : "";

    const decision =
      typeof body?.decision === "string"
        ? body.decision.trim()
        : "";

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required." },
        { status: 400 }
      );
    }

    if (decision !== "approved" && decision !== "denied") {
      return NextResponse.json(
        {
          success: false,
          error: "Decision must be approved or denied.",
        },
        { status: 400 }
      );
    }

    const requestRef = db
      .collection("studentRequests")
      .doc(requestId);

    const studentRef = db
      .collection("students")
      .doc("");

    const result = await db.runTransaction(async (transaction) => {
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      const studentRequest = requestSnapshot.data()!;

      if (studentRequest.status !== "pending") {
        throw new Error("REQUEST_ALREADY_REVIEWED");
      }

      const studentId = studentRequest.studentId;

      if (
        typeof studentId !== "string" ||
        !studentId.trim()
      ) {
        throw new Error("INVALID_STUDENT_ID");
      }

      const actualStudentRef = studentRef.parent.doc(studentId);

      const studentSnapshot = await transaction.get(
        actualStudentRef
      );

      if (!studentSnapshot.exists) {
        throw new Error("STUDENT_NOT_FOUND");
      }

      if (
        decision === "approved" &&
        studentRequest.type === "subject_change"
      ) {
        const requestedSubjects =
          studentRequest.requestedValue;

        if (
          !Array.isArray(requestedSubjects) ||
          requestedSubjects.length !== 4
        ) {
          throw new Error("INVALID_SUBJECT_REQUEST");
        }

        const uniqueSubjects = [
          ...new Set(
            requestedSubjects.filter(
              (subject: unknown): subject is string =>
                typeof subject === "string" &&
                subject.trim().length > 0
            )
          ),
        ];

        if (uniqueSubjects.length !== 4) {
          throw new Error("INVALID_SUBJECT_REQUEST");
        }

        transaction.update(actualStudentRef, {
          subjects: uniqueSubjects,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.update(requestRef, {
        status: decision,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminUid,
        adminNote,
      });

      return {
        requestId,
        studentId,
        status: decision,
        reviewedBy: adminUid,
        reviewedByEmail: adminUser.email ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Student request review failed:",
      error
    );

    const message =
      error instanceof Error ? error.message : "";

    if (message === "REQUEST_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 }
      );
    }

    if (message === "REQUEST_ALREADY_REVIEWED") {
      return NextResponse.json(
        {
          success: false,
          error: "This request has already been reviewed.",
        },
        { status: 409 }
      );
    }

    if (
      message === "STUDENT_NOT_FOUND" ||
      message === "INVALID_STUDENT_ID"
    ) {
      return NextResponse.json(
        { success: false, error: "Student record not found." },
        { status: 404 }
      );
    }

    if (message === "INVALID_SUBJECT_REQUEST") {
      return NextResponse.json(
        {
          success: false,
          error:
            "A subject-change approval must contain exactly four unique subjects.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unable to review student request.",
      },
      { status: 500 }
    );
  }
}
