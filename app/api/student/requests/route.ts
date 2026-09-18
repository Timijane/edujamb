import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import {
  type StudentRequestType,
  type StudentRequestStatus,
} from "@/lib/student-request-types";

const VALID_TYPES: StudentRequestType[] = [
  "subject_change",
  "additional_subject",
  "profile_preference_change",
];

const PENDING_STATUS: StudentRequestStatus = "pending";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyBearerToken(request);
    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const type = body?.type as StudentRequestType;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid request type." },
        { status: 400 }
      );
    }

    const reason = cleanString(body?.reason);

    if (!reason || reason.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid reason for the request.",
        },
        { status: 400 }
      );
    }

    const currentValue =
      type === "subject_change" || type === "additional_subject"
        ? cleanStringArray(body?.currentValue)
        : cleanString(body?.currentValue);

    const requestedValue =
      type === "subject_change" || type === "additional_subject"
        ? cleanStringArray(body?.requestedValue)
        : cleanString(body?.requestedValue);

    if (
      (Array.isArray(requestedValue) && requestedValue.length === 0) ||
      (!Array.isArray(requestedValue) && !requestedValue)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Requested value is required.",
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    const existingSnapshot = await db
      .collection("studentRequests")
      .where("studentId", "==", uid)
      .where("type", "==", type)
      .where("status", "==", PENDING_STATUS)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You already have a pending request of this type.",
        },
        { status: 409 }
      );
    }

    const requestRef = db.collection("studentRequests").doc();

    const studentRequest = {
      requestId: requestRef.id,
      studentId: uid,
      type,
      currentValue,
      requestedValue,
      reason,
      status: PENDING_STATUS,
      submittedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      adminNote: "",
    };

    await requestRef.set(studentRequest);

    return NextResponse.json({
      success: true,
      request: {
        ...studentRequest,
        submittedAt: undefined,
      },
    });
  } catch (error) {
    console.error("Student request submission failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to submit request.",
      },
      { status: 500 }
    );
  }
}
