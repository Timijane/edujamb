import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

async function requireStudent(request: Request) {
  const token = await verifyBearerToken(request);

  const db = getAdminDb();
  const student = await db
    .collection("students")
    .doc(token.uid)
    .get();

  if (!student.exists) {
    throw new Error("Student profile not found.");
  }

  return token;
}

export async function GET(request: Request) {
  try {
    await requireStudent(request);

    const snapshot = await getAdminDb()
      .collection("academicResources")
      .where("active", "==", true)
      .where("published", "==", true)
      .limit(200)
      .get();

    const resources = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || "",
        fileName: data.fileName || "",
        contentType: data.contentType || "",
        resourceType: data.resourceType || "other",
        subjectId: data.subjectId || "",
        topicId: data.topicId || "",
        coverImage: data.coverImage || "",
        coverMediaId: data.coverMediaId || "",
        chunkCount:
          typeof data.chunkCount === "number"
            ? data.chunkCount
            : Array.isArray(data.chunks)
              ? data.chunks.length
              : 0,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    return NextResponse.json({ resources });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load academic resources.",
      },
      { status: 400 },
    );
  }
}
