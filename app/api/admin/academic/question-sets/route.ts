import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  validateQuestionSetInput,
} from "@/lib/question-types";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Missing authentication token.");
  }

  const token = header.slice("Bearer ".length).trim();

  const decoded = await getAdminAuth().verifyIdToken(token);

  const adminSnap = await getAdminDb()
    .collection("adminUsers")
    .doc(decoded.uid)
    .get();

  if (!adminSnap.exists) {
    throw new Error("Admin access required.");
  }

  const admin = adminSnap.data();

  if (
    admin?.active !== true ||
    !["super_admin", "admin"].includes(String(admin?.role))
  ) {
    throw new Error("Admin access required.");
  }

  return decoded;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await getAdminDb()
      .collection("academicQuestionSets")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const sets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ sets });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load question sets.",
      },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await requireAdmin(request);

    const body = await request.json();

    const data = validateQuestionSetInput(body);

    const db = getAdminDb();

    const subjectSnap = await db
      .collection("academicSubjects")
      .doc(data.subjectId)
      .get();

    if (!subjectSnap.exists) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 400 }
      );
    }

    const topicSnap = await db
      .collection("academicTopics")
      .doc(data.topicId)
      .get();

    if (!topicSnap.exists) {
      return NextResponse.json(
        { error: "Topic not found." },
        { status: 400 }
      );
    }

    const topic = topicSnap.data();

    if (topic?.subjectId !== data.subjectId) {
      return NextResponse.json(
        { error: "Topic does not belong to the selected subject." },
        { status: 400 }
      );
    }

    const ref = db.collection("academicQuestionSets").doc();

    await ref.set({
      ...data,
      questionIds: [],
      createdBy: decoded.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        id: ref.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create question set.",
      },
      { status: 400 }
    );
  }
}
