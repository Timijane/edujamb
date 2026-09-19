import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

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
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const token = await requireSuperAdmin(request);
    const { importId } = await params;
    const body = await request.json();

    const db = getAdminDb();
    const importRef = db.collection("academicImports").doc(importId);
    const importSnap = await importRef.get();

    if (!importSnap.exists) {
      return NextResponse.json(
        { error: "Academic import was not found." },
        { status: 404 }
      );
    }

    const action = String(body.action || "");

    if (action === "approve" || action === "reject") {
      const approved = action === "approve";

      await importRef.update({
        reviewStatus: approved ? "approved" : "rejected",
        status: approved ? "reviewed" : "rejected",
        reviewedBy: token.uid,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: approved
          ? "Document approved for conversion."
          : "Document rejected.",
      });
    }

    if (action === "convert") {
      const subjectId = String(body.subjectId || "").trim();
      const topics = Array.isArray(body.topics) ? body.topics : [];

      if (!subjectId) {
        return NextResponse.json(
          { error: "A subject must be selected." },
          { status: 400 }
        );
      }

      if (!topics.length) {
        return NextResponse.json(
          { error: "At least one topic is required." },
          { status: 400 }
        );
      }

      const subjectSnap = await db
        .collection("academicSubjects")
        .doc(subjectId)
        .get();

      if (!subjectSnap.exists) {
        return NextResponse.json(
          { error: "Selected subject does not exist." },
          { status: 404 }
        );
      }

      const batch = db.batch();
      let created = 0;

      topics.forEach((topic: unknown, index: number) => {
        if (!topic || typeof topic !== "object") return;

        const item = topic as Record<string, unknown>;
        const title = String(item.title || "").trim();

        if (!title) return;

        const ref = db.collection("academicTopics").doc();

        batch.set(ref, {
          subjectId,
          title,
          description: String(item.description || "").trim(),
          order:
            typeof item.order === "number"
              ? item.order
              : index + 1,
          active: false,
          published: false,
          source: "document_import",
          sourceImportId: importId,
          createdBy: token.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        created++;
      });

      if (!created) {
        return NextResponse.json(
          { error: "No valid topics were supplied." },
          { status: 400 }
        );
      }

      await batch.commit();

      await importRef.update({
        status: "converted",
        reviewStatus: "converted",
        convertedSubjectId: subjectId,
        convertedTopicCount: created,
        convertedAt: FieldValue.serverTimestamp(),
        convertedBy: token.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        created,
        message:
          "Topics imported as inactive drafts. Review and publish them from Scheme of Work.",
      });
    }

    return NextResponse.json(
      { error: "Unknown import action." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update academic import.",
      },
      { status: 400 }
    );
  }
}
