import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  try {
    await requireAdmin(request);

    const { resourceId } = await params;

    const snapshot = await getAdminDb()
      .collection("academicResources")
      .doc(resourceId)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Academic resource was not found." },
        { status: 404 },
      );
    }

    const data = snapshot.data() || {};

    return NextResponse.json({
      resource: {
        id: snapshot.id,
        title: data.title || "",
        description: data.description || "",
        fileName: data.fileName || "",
        contentType: data.contentType || "",
        resourceType: data.resourceType || "other",
        subjectId: data.subjectId || "",
        topicId: data.topicId || "",
        coverImage: data.coverImage || "",
        coverMediaId: data.coverMediaId || "",
        author: data.author || "",
        source: data.source || "",
        introduction: data.introduction || "",
        allowDownload: data.allowDownload !== false,
        readerSettings: data.readerSettings || {},
        active: data.active === true,
        published: data.published === true,
        chunkCount:
          typeof data.chunkCount === "number"
            ? data.chunkCount
            : Array.isArray(data.chunks)
              ? data.chunks.length
              : 0,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load academic resource.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  try {
    const token = await requireAdmin(request);
    const { resourceId } = await params;
    const body = await request.json();

    const ref = getAdminDb()
      .collection("academicResources")
      .doc(resourceId);

    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Academic resource was not found." },
        { status: 404 },
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: token.uid,
    };

    if (typeof body.title === "string") {
      const value = body.title.trim();

      if (!value) {
        return NextResponse.json(
          { error: "Title cannot be empty." },
          { status: 400 },
        );
      }

      updates.title = value;
    }

    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }

    if (typeof body.author === "string") {
      updates.author = body.author.trim();
    }

    if (typeof body.source === "string") {
      updates.source = body.source.trim();
    }

    if (typeof body.introduction === "string") {
      updates.introduction = body.introduction;
    }

    if (typeof body.allowDownload === "boolean") {
      updates.allowDownload = body.allowDownload;
    }

    if (body.readerSettings && typeof body.readerSettings === "object") {
      updates.readerSettings = {
        ...(snapshot.data()?.readerSettings || {}),
        ...body.readerSettings,
      };
    }

    await ref.update(updates);

    return NextResponse.json({
      success: true,
      resourceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update academic resource.",
      },
      { status: 400 },
    );
  }
}
