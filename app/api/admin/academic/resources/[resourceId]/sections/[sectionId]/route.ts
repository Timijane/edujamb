import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken, isAllowedRole } from "@/lib/auth-server";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const token = await verifyBearerToken(request);
  if (!token?.uid) throw new Error("Unauthorized.");

  const db = getAdminDb();
  const snap = await db.collection("adminUsers").doc(token.uid).get();
  const data = snap.data() || {};

  if (!snap.exists || !isAllowedRole(data.role, ["admin", "super_admin"])) {
    throw new Error("Forbidden.");
  }

  return { db, uid: token.uid };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resourceId: string; sectionId: string }> }
) {
  try {
    const { db, uid } = await requireAdmin(request);
    const { resourceId, sectionId } = await params;
    const body = await request.json();

    const ref = db.collection("academicResourceSections").doc(sectionId);
    const snap = await ref.get();

    if (!snap.exists || snap.data()?.resourceId !== resourceId) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const allowed = [
      "title",
      "description",
      "content",
      "order",
      "published",
      "active",
    ];

    const updates: Record<string, unknown> = {
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return NextResponse.json(
        { error: "Section title is required." },
        { status: 400 }
      );
    }

    await ref.set(updates, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update section." },
      { status: 401 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resourceId: string; sectionId: string }> }
) {
  try {
    const { db } = await requireAdmin(request);
    const { resourceId, sectionId } = await params;

    const ref = db.collection("academicResourceSections").doc(sectionId);
    const snap = await ref.get();

    if (!snap.exists || snap.data()?.resourceId !== resourceId) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    await ref.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete section." },
      { status: 401 }
    );
  }
}
