import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import { validateQuestionInput } from "@/lib/question-types";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const token = await verifyBearerToken(request);

  const admin = await getAdminDb()
    .collection("adminUsers")
    .doc(token.uid)
    .get();

  if (
    !admin.exists ||
    admin.data()?.active !== true ||
    !["super_admin", "admin"].includes(admin.data()?.role)
  ) {
    throw new Error("Admin access required.");
  }

  return token;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ questionId: string }> }
) {
  try {
    const token = await requireAdmin(request);
    const { questionId } = await context.params;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const ref = db.collection("academicQuestions").doc(questionId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    const existing = snapshot.data() || {};
    const body = await request.json();

    const merged = {
      ...existing,
      ...body,
      subjectId:
        body.subjectId !== undefined
          ? body.subjectId
          : existing.subjectId,
      topicId:
        body.topicId !== undefined
          ? body.topicId
          : existing.topicId,
      question:
        body.question !== undefined
          ? body.question
          : existing.question,
      options:
        body.options !== undefined
          ? body.options
          : existing.options,
      correctOption:
        body.correctOption !== undefined
          ? body.correctOption
          : existing.correctOption,
      explanation:
        body.explanation !== undefined
          ? body.explanation
          : existing.explanation,
      category:
        body.category !== undefined
          ? body.category
          : existing.category,
      difficulty:
        body.difficulty !== undefined
          ? body.difficulty
          : existing.difficulty,
      year:
        body.year !== undefined
          ? body.year
          : existing.year,
      published:
        body.published !== undefined
          ? body.published
          : existing.published,
      active:
        body.active !== undefined
          ? body.active
          : existing.active,
      questionSetId:
        body.questionSetId !== undefined
          ? body.questionSetId
          : existing.questionSetId,
      questionContent:
        body.questionContent !== undefined
          ? body.questionContent
          : existing.questionContent,
      optionContent:
        body.optionContent !== undefined
          ? body.optionContent
          : existing.optionContent,
      explanationContent:
        body.explanationContent !== undefined
          ? body.explanationContent
          : existing.explanationContent,
      imageUrl:
        body.imageUrl !== undefined
          ? body.imageUrl
          : existing.imageUrl,
    };

    const input = validateQuestionInput(merged);

    const subject = await db
      .collection("academicSubjects")
      .doc(input.subjectId)
      .get();

    if (!subject.exists) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    const topic = await db
      .collection("academicTopics")
      .doc(input.topicId)
      .get();

    if (
      !topic.exists ||
      topic.data()?.subjectId !== input.subjectId
    ) {
      return NextResponse.json(
        { error: "Topic does not belong to this subject." },
        { status: 400 }
      );
    }

    if (input.questionSetId) {
      const questionSet = await db
        .collection("academicQuestionSets")
        .doc(input.questionSetId)
        .get();

      if (!questionSet.exists) {
        return NextResponse.json(
          { error: "Question set not found." },
          { status: 400 }
        );
      }

      const questionSetData = questionSet.data();

      if (
        questionSetData?.subjectId !== input.subjectId ||
        questionSetData?.topicId !== input.topicId
      ) {
        return NextResponse.json(
          {
            error:
              "Question set does not belong to the selected subject and topic.",
          },
          { status: 400 }
        );
      }
    }

    const previousQuestionSetId =
      typeof existing.questionSetId === "string"
        ? existing.questionSetId
        : "";

    const nextQuestionSetId = input.questionSetId || "";

    const batch = db.batch();

    batch.update(ref, {
      ...input,
      updatedBy: token.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (
      previousQuestionSetId &&
      previousQuestionSetId !== nextQuestionSetId
    ) {
      const previousSetRef = db
        .collection("academicQuestionSets")
        .doc(previousQuestionSetId);

      batch.update(previousSetRef, {
        questionIds: FieldValue.arrayRemove(questionId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (
      nextQuestionSetId &&
      previousQuestionSetId !== nextQuestionSetId
    ) {
      const nextSetRef = db
        .collection("academicQuestionSets")
        .doc(nextQuestionSetId);

      batch.update(nextSetRef, {
        questionIds: FieldValue.arrayUnion(questionId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      questionId,
    });
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
  context: { params: Promise<{ questionId: string }> }
) {
  try {
    await requireAdmin(request);
    const { questionId } = await context.params;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const ref = db.collection("academicQuestions").doc(questionId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      );
    }

    const data = snapshot.data() || {};
    const questionSetId =
      typeof data.questionSetId === "string"
        ? data.questionSetId
        : "";

    const batch = db.batch();

    batch.delete(ref);

    if (questionSetId) {
      const questionSetRef = db
        .collection("academicQuestionSets")
        .doc(questionSetId);

      batch.update(questionSetRef, {
        questionIds: FieldValue.arrayRemove(questionId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      questionId,
    });
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
