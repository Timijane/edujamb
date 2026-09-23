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

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await getAdminDb()
      .collection("academicResources")
      .orderBy("createdAt", "desc")
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
        sourceImportId: data.sourceImportId || "",
        chunkCount:
          typeof data.chunkCount === "number"
            ? data.chunkCount
            : Array.isArray(data.chunks)
              ? data.chunks.length
              : 0,
        active: data.active === true,
        published: data.published === true,
        createdBy: data.createdBy || "",
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

export async function PATCH(request: Request) {
  try {
    const token = await requireAdmin(request);
    const body = await request.json();

    const resourceId = String(body.resourceId || "").trim();
    const action = String(body.action || "").trim();

    if (!resourceId) {
      return NextResponse.json(
        { error: "Resource ID is required." },
        { status: 400 },
      );
    }

    if (
      ![
        "publish",
        "unpublish",
        "activate",
        "deactivate",
        "set-cover",
        "remove-cover",
      ].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid resource action." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const ref = db.collection("academicResources").doc(resourceId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Academic resource was not found." },
        { status: 404 },
      );
    }

    if (action === "remove-cover") {
      await ref.update({
        coverImage: "",
        coverMediaId: "",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: token.uid,
      });

      return NextResponse.json({
        success: true,
        resourceId,
        action,
      });
    }

    if (action === "set-cover") {
      const mediaId = String(body.mediaId || "").trim();

      if (!mediaId) {
        return NextResponse.json(
          { error: "Media ID is required for a resource cover." },
          { status: 400 },
        );
      }

      const mediaSnapshot = await db.collection("media").doc(mediaId).get();

      if (!mediaSnapshot.exists) {
        return NextResponse.json(
          { error: "Selected media was not found." },
          { status: 404 },
        );
      }

      const mediaData = mediaSnapshot.data() || {};

      if (mediaData.purpose !== "academic_resource_cover") {
        return NextResponse.json(
          { error: "Selected media is not an academic resource cover." },
          { status: 400 },
        );
      }

      await ref.update({
        coverImage: mediaData.url || "",
        coverMediaId: mediaId,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: token.uid,
      });

      return NextResponse.json({
        success: true,
        resourceId,
        action,
        coverImage: mediaData.url || "",
        coverMediaId: mediaId,
      });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: token.uid,
    };

    if (action === "publish") {
      updates.published = true;
    }

    if (action === "unpublish") {
      updates.published = false;
    }

    if (action === "activate") {
      updates.active = true;
    }

    if (action === "deactivate") {
      updates.active = false;
    }

    await ref.update(updates);

    return NextResponse.json({
      success: true,
      resourceId,
      action,
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

export async function DELETE(request: Request) {
  try {
    const token = await requireAdmin(request);
    const body = await request.json();

    const resourceId = String(body.resourceId || "").trim();

    if (!resourceId) {
      return NextResponse.json(
        { error: "Resource ID is required." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const ref = db.collection("academicResources").doc(resourceId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Academic resource was not found." },
        { status: 404 },
      );
    }

    await ref.delete();

    return NextResponse.json({
      success: true,
      resourceId,
      deletedBy: token.uid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete academic resource.",
      },
      { status: 400 },
    );
  }
}
