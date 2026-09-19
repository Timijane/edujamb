import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  validateQuestionSetInput,
} from "@/lib/question-types";

export const runtime = "nodejs";

async function requireSuperAdmin(request: Request) {
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
    admin?.role !== "super_admin"
  ) {
    throw new Error("Super Admin access required.");
  }

  return decoded;
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ questionSetId: string }>;
  }
) {
  try {
    await requireSuperAdmin(request);

    const { questionSetId } = await context.params;

    const body = await request.json();

    const data = validateQuestionSetInput(body);

    const db = getAdminDb();

    const setRef = db
      .collection("academicQuestionSets")
      .doc(questionSetId);

    const existing = await setRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Question set not found." },
        { status: 404 }
      );
    }

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

    await setRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: questionSetId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update question set.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ questionSetId: string }>;
  }
) {
  try {
    await requireSuperAdmin(request);

    const { questionSetId } = await context.params;

    const db = getAdminDb();

    const setRef = db
      .collection("academicQuestionSets")
      .doc(questionSetId);

    const existing = await setRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Question set not found." },
        { status: 404 }
      );
    }

    const questions = await db
      .collection("academicQuestions")
      .where("questionSetId", "==", questionSetId)
      .get();

    const batch = db.batch();

    questions.docs.forEach((doc) => {
      batch.update(doc.ref, {
        questionSetId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    batch.delete(setRef);

    await batch.commit();

    return NextResponse.json({
      success: true,
      deletedQuestionLinks: questions.size,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete question set.",
      },
      { status: 400 }
    );
  }
}
