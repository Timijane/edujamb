import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import type { AcademicImportElement } from "@/lib/academic-import-types";

export const runtime = "nodejs";

const VALID_CATEGORIES = [
  "JAMB Past Question",
  "Practice",
  "Mock Exam",
  "Revision",
] as const;

const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

type SetType =
  | "Passage + Questions"
  | "Chart + Questions"
  | "Table + Questions"
  | "Image + Questions";

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

function isSetType(value: unknown): value is SetType {
  return (
    value === "Passage + Questions" ||
    value === "Chart + Questions" ||
    value === "Table + Questions" ||
    value === "Image + Questions"
  );
}

export async function POST(request: Request) {
  try {
    const token = await requireSuperAdmin(request);
    const body = await request.json();

    const importId = String(body.importId || "").trim();
    const subjectId = String(body.subjectId || "").trim();
    const topicId = String(body.topicId || "").trim();

    const category = String(body.category || "Practice");
    const difficulty = String(body.difficulty || "Medium");

    const selectedElements = Array.isArray(body.elements)
      ? (body.elements as AcademicImportElement[])
      : [];

    if (!importId || !subjectId || !topicId) {
      return NextResponse.json(
        { error: "Import, subject and topic are required." },
        { status: 400 },
      );
    }

    if (!selectedElements.length) {
      return NextResponse.json(
        { error: "Select at least one question to import." },
        { status: 400 },
      );
    }

    if (!VALID_CATEGORIES.includes(category as never)) {
      return NextResponse.json(
        { error: "Invalid question category." },
        { status: 400 },
      );
    }

    if (!VALID_DIFFICULTIES.includes(difficulty as never)) {
      return NextResponse.json(
        { error: "Invalid question difficulty." },
        { status: 400 },
      );
    }

    const db = getAdminDb();

    const [importSnap, subjectSnap, topicSnap] = await Promise.all([
      db.collection("academicImports").doc(importId).get(),
      db.collection("academicSubjects").doc(subjectId).get(),
      db.collection("academicTopics").doc(topicId).get(),
    ]);

    if (!importSnap.exists) {
      return NextResponse.json(
        { error: "Import document not found." },
        { status: 404 },
      );
    }

    if (!subjectSnap.exists) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 },
      );
    }

    if (!topicSnap.exists) {
      return NextResponse.json(
        { error: "Topic not found." },
        { status: 404 },
      );
    }

    const topic = topicSnap.data();

    if (topic?.subjectId !== subjectId) {
      return NextResponse.json(
        { error: "Selected topic does not belong to the selected subject." },
        { status: 400 },
      );
    }

    const batch = db.batch();

    const questionIds: string[] = [];
    const createdSetIds = new Set<string>();

    const elementsBySet = new Map<string, AcademicImportElement[]>();

    for (const element of selectedElements) {
      if (element.type !== "question") continue;

      const question = String(element.text || "").trim();
      if (!question) continue;

      const setId = element.questionSetId;

      if (setId) {
        const current = elementsBySet.get(setId) || [];
        current.push(element);
        elementsBySet.set(setId, current);
      }
    }

    const importData = importSnap.data() || {};
    const allElements = Array.isArray(importData.elements)
      ? (importData.elements as AcademicImportElement[])
      : [];

    for (const [setId, questions] of elementsBySet.entries()) {
      const firstQuestion = questions[0];

      if (!isSetType(firstQuestion.questionSetType)) continue;

      if (createdSetIds.has(setId)) continue;

      const sourceElement = allElements.find(
        (element) =>
          element.questionSetId === setId &&
          element.type !== "question",
      );

      const setRef = db.collection("academicQuestionSets").doc(setId);

      batch.set(setRef, {
        id: setId,
        subjectId,
        topicId,
        title:
          sourceElement?.text?.slice(0, 120) ||
          `${firstQuestion.questionSetType} imported set`,
        type: firstQuestion.questionSetType,
        description: sourceElement?.text || "",
        content: sourceElement
          ? [
              {
                id: sourceElement.id,
                type: "text",
                text: sourceElement.text,
              },
            ]
          : [],
        media: [],
        questionIds: [],
        active: true,
        published: false,
        createdBy: token.uid,
        source: "document_import",
        sourceImportId: importId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      createdSetIds.add(setId);
    }

    for (const element of selectedElements) {
      if (element.type !== "question") continue;

      const question = String(element.text || "").trim();
      if (!question) continue;

      const options = Array.isArray(element.options)
        ? element.options
            .map((option) => String(option).trim())
            .filter(Boolean)
        : [];

      const ref = db.collection("academicQuestions").doc();

      batch.set(ref, {
        subjectId,
        topicId,
        question,
        questionContent: [
          {
            id: crypto.randomUUID(),
            type: "text",
            text: question,
          },
        ],
        options,
        correctOption:
          typeof element.possibleAnswer === "number"
            ? element.possibleAnswer
            : -1,
        explanation: String(element.possibleExplanation || "").trim(),
        year:
          typeof element.year === "number" ? element.year : null,
        category,
        difficulty,
        active: true,
        published: false,
        createdBy: token.uid,
        source: "document_import",
        sourceImportId: importId,
        sourceElementId: element.id,
        questionSetId: element.questionSetId || null,
        questionSetType: element.questionSetType || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      questionIds.push(ref.id);

      if (element.questionSetId) {
        const setRef = db
          .collection("academicQuestionSets")
          .doc(element.questionSetId);

        batch.update(setRef, {
          questionIds: FieldValue.arrayUnion(ref.id),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    if (!questionIds.length) {
      return NextResponse.json(
        { error: "No valid question elements were selected." },
        { status: 400 },
      );
    }

    batch.update(importSnap.ref, {
      lastImportedQuestionIds: FieldValue.arrayUnion(...questionIds),
      lastImportedAt: FieldValue.serverTimestamp(),
      lastImportedBy: token.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      imported: questionIds.length,
      questionSetCount: createdSetIds.size,
      questionIds,
      status: "draft",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import questions.",
      },
      { status: 500 },
    );
  }
}
