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

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const db = getAdminDb();
    const snapshot = await db
      .collection("academicQuestions")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const questions = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        subjectId: data.subjectId || "",
        topicId: data.topicId || "",
        question: data.question || "",
        options: Array.isArray(data.options) ? data.options : [],
        correctOption:
          typeof data.correctOption === "number"
            ? data.correctOption
            : 0,
        explanation: data.explanation || "",
        year: data.year ?? null,
        category: data.category || "Practice",
        difficulty: data.difficulty || "Medium",
        imageUrl: data.imageUrl || "",
        active: data.active === true,
        published: data.published === true,
      };
    });

    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load questions.",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = await requireAdmin(request);
    const body = await request.json();

    const input = validateQuestionInput(body);
    const db = getAdminDb();

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

    if (!topic.exists || topic.data()?.subjectId !== input.subjectId) {
      return NextResponse.json(
        { error: "Topic does not belong to this subject." },
        { status: 400 }
      );
    }

    const ref = db.collection("academicQuestions").doc();

    await ref.set({
      ...input,
      createdBy: token.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      questionId: ref.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create question.",
      },
      { status: 400 }
    );
  }
}
