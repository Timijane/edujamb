import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import { validateQuestionInput } from "@/lib/question-types";

export const runtime = "nodejs";

async function requireSuperAdmin(request: Request) {
  const token = await verifyBearerToken(request);

  const admin = await getAdminDb()
    .collection("adminUsers")
    .doc(token.uid)
    .get();

  if (
    !admin.exists ||
    admin.data()?.active !== true ||
    admin.data()?.role !== "super_admin"
  ) {
    throw new Error("Super Admin access required.");
  }

  return token;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const token = await requireSuperAdmin(request);
    const { questionId } = await params;
    const body = await request.json();

    const input = validateQuestionInput(body);
    const db = getAdminDb();

    const ref = db.collection("academicQuestions").doc(questionId);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    const topic = await db
      .collection("academicTopics")
      .doc(input.topicId)
      .get();

    if (!topic.exists || topic.data()?.subjectId !== input.subjectId) {
      return NextResponse.json(
        { error: "Topic does not belong to this subject." },
        { status: 400 }
      );
    }

    await ref.update({
      ...input,
      updatedBy: token.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update question.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { questionId } = await params;

    const db = getAdminDb();
    const ref = db.collection("academicQuestions").doc(questionId);

    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    await ref.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete question.",
      },
      { status: 400 }
    );
  }
}
