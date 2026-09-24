import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const token = await verifyBearerToken(request);

    if (!token?.uid) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = getAdminDb();

    const student = await db.collection("students").doc(token.uid).get();

    if (!student.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 403 }
      );
    }

    const { resourceId } = await params;

    const resource = await db
      .collection("academicResources")
      .doc(resourceId)
      .get();

    if (!resource.exists) {
      return NextResponse.json(
        { error: "Resource not found." },
        { status: 404 }
      );
    }

    const resourceData = resource.data() || {};

    if (resourceData.active !== true || resourceData.published !== true) {
      return NextResponse.json(
        { error: "Resource unavailable." },
        { status: 404 }
      );
    }

    const sectionsSnap = await db
      .collection("academicResourceSections")
      .where("resourceId", "==", resourceId)
      .where("active", "==", true)
      .where("published", "==", true)
      .get();

    const sections = sectionsSnap.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          content: data.content || "",
          order: typeof data.order === "number" ? data.order : 0,
        };
      })
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({
      resource: {
        id: resource.id,
        title: resourceData.title || "",
        fileName: resourceData.fileName || "",
        resourceType: resourceData.resourceType || "",
        subjectId: resourceData.subjectId || "",
        topicId: resourceData.topicId || "",
        description: resourceData.description || "",
        coverImage: resourceData.coverImage || "",
      },
      sections,
    });
  } catch (error) {
    console.error("[ACADEMIC READER]", error);

    return NextResponse.json(
      { error: "Unable to load reader content." },
      { status: 500 }
    );
  }
}
