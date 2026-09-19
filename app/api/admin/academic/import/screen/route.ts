import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";
import { matchAcademicTopics } from "@/lib/academic-topic-matcher";
import type { AcademicImportElement } from "@/lib/academic-import-types";

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

export async function POST(request: Request) {
  try {
    const token = await requireSuperAdmin(request);
    const body = await request.json();

    const importId =
      typeof body.importId === "string" ? body.importId.trim() : "";

    const subjectId =
      typeof body.subjectId === "string" ? body.subjectId.trim() : "";

    if (!importId || !subjectId) {
      return NextResponse.json(
        { error: "Import ID and subject ID are required." },
        { status: 400 },
      );
    }

    const db = getAdminDb();

    const importRef = db.collection("academicImports").doc(importId);
    const importSnap = await importRef.get();

    if (!importSnap.exists) {
      return NextResponse.json(
        { error: "Academic import was not found." },
        { status: 404 },
      );
    }

    const subjectSnap = await db
      .collection("academicSubjects")
      .doc(subjectId)
      .get();

    if (!subjectSnap.exists) {
      return NextResponse.json(
        { error: "Academic subject was not found." },
        { status: 404 },
      );
    }

    const importData = importSnap.data() ?? {};

    const elements = Array.isArray(importData.elements)
      ? (importData.elements as AcademicImportElement[])
      : [];

    if (!elements.length) {
      return NextResponse.json(
        { error: "This import has no screened elements." },
        { status: 400 },
      );
    }

    const topicsSnapshot = await db
      .collection("academicTopics")
      .where("subjectId", "==", subjectId)
      .where("active", "==", true)
      .get();

    const topics = topicsSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
      };
    });

    const matchedElements = matchAcademicTopics(elements, topics);

    await importRef.update({
      elements: matchedElements,
      topicMatchSubjectId: subjectId,
      topicMatchPerformedBy: token.uid,
      topicMatchPerformedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      importId,
      subjectId,
      topicCount: topics.length,
      elementCount: matchedElements.length,
      elements: matchedElements,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to screen academic topics.",
      },
      { status: 400 },
    );
  }
}
