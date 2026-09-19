import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken } from "@/lib/auth-server";

export const runtime = "nodejs";

async function requireSuperAdmin(request: Request) {
  const token = await verifyBearerToken(request);
  const admin = await getAdminDb().collection("adminUsers").doc(token.uid).get();

  if (!admin.exists || admin.data()?.active !== true || admin.data()?.role !== "super_admin") {
    throw new Error("Super Admin access required.");
  }

  return token;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const token = await requireSuperAdmin(request);
    const { topicId } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    for (const key of ["title", "description", "active", "published", "order"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (body.title !== undefined) {
      const title = String(body.title).trim();

      if (!title) {
        return NextResponse.json({ error: "Topic title is required." }, { status: 400 });
      }

      updates.title = title;
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    updates.updatedBy = token.uid;

    await getAdminDb().collection("academicTopics").doc(topicId).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update topic." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { topicId } = await params;

    await getAdminDb().collection("academicTopics").doc(topicId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete topic." },
      { status: 400 }
    );
  }
}
