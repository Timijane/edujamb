import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

type Chunk = {
  id?: string;
  title?: string;
  text?: string;
  chapter?: string;
  page?: number;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  try {
    const token = await verifyBearerToken(request);

    if (!token?.uid) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { resourceId } = await params;
    const db = getAdminDb();

    const studentSnap = await db
      .collection("students")
      .doc(token.uid)
      .get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 403 },
      );
    }

    const student = studentSnap.data() || {};
    const selectedSubjects = Array.isArray(student.subjects)
      ? student.subjects.map((value) => String(value))
      : [];

    const resourceSnap = await db
      .collection("academicResources")
      .doc(resourceId)
      .get();

    if (!resourceSnap.exists) {
      return NextResponse.json(
        { error: "Academic resource not found." },
        { status: 404 },
      );
    }

    const resource = resourceSnap.data() || {};

    if (
      resource.active !== true ||
      resource.published !== true
    ) {
      return NextResponse.json(
        { error: "This academic resource is not available." },
        { status: 403 },
      );
    }

    const subjectId = String(resource.subjectId || "");

    const subjectSnap = await db
      .collection("academicSubjects")
      .doc(subjectId)
      .get();

    if (!subjectSnap.exists) {
      return NextResponse.json(
        { error: "Resource subject not found." },
        { status: 404 },
      );
    }

    const subject = subjectSnap.data() || {};
    const subjectName = String(subject.name || "");

    if (!selectedSubjects.includes(subjectName)) {
      return NextResponse.json(
        {
          error:
            "This resource is outside your approved subjects.",
        },
        { status: 403 },
      );
    }

    const sectionsSnap = await db
      .collection("academicResourceSections")
      .where("resourceId", "==", resourceId)
      .get();

    let sections = sectionsSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (section: any) =>
          section.active === true &&
          section.published === true,
      )
      .sort(
        (a: any, b: any) =>
          Number(a.order || 0) -
          Number(b.order || 0),
      );

    /*
     * Existing imported resources store their textbook
     * content directly in academicResources.chunks.
     *
     * If CMS sections do not exist yet, use those chunks
     * automatically.
     */
    if (!sections.length && Array.isArray(resource.chunks)) {
      sections = (resource.chunks as Chunk[]).map(
        (chunk, index) => ({
          id: String(
            chunk.id || `chunk-${index + 1}`,
          ),
          title:
            chunk.title ||
            chunk.chapter ||
            `Section ${index + 1}`,
          description: "",
          content: chunk.text || "",
          order: index + 1,
          active: true,
          published: true,
          page: chunk.page || null,
          chapter: chunk.chapter || "",
        }),
      );
    }

    const progressSnap = await db
      .collection("studentResourceProgress")
      .doc(`${token.uid}_${resourceId}`)
      .get();

    const progress = progressSnap.exists
      ? progressSnap.data() || {}
      : {};

    return NextResponse.json({
      resource: {
        id: resourceId,
        title: resource.title || "",
        fileName: resource.fileName || "",
        contentType: resource.contentType || "",
        resourceType:
          resource.resourceType || "other",
        subjectId,
        subjectName,
        topicId: resource.topicId || "",
        description: resource.description || "",
        coverImage: resource.coverImage || "",
        coverMediaId:
          resource.coverMediaId || "",
        author: resource.author || "",
        source: resource.source || "",
        introduction:
          resource.introduction || "",
        allowDownload:
          resource.allowDownload !== false,
        readerSettings:
          resource.readerSettings || {},
      },
      sections,
      progress: {
        progress:
          typeof progress.progress === "number"
            ? progress.progress
            : 0,
        lastSection:
          typeof progress.lastSection === "string"
            ? progress.lastSection
            : "",
        completed:
          progress.completed === true,
        bookmarked:
          progress.bookmarked === true,
        bookmarkSection:
          typeof progress.bookmarkSection === "string"
            ? progress.bookmarkSection
            : "",
      },
    });
  } catch (error) {
    console.error(
      "[STUDENT RESOURCE READER]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load textbook.",
      },
      { status: 400 },
    );
  }
}
