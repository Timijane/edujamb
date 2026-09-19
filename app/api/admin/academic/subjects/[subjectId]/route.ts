import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
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
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const token = await requireSuperAdmin(request);
    const { subjectId } = await params;

    const body = await request.json();
    const allowed = ["name", "description", "code", "active", "published", "order"];

    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Subject name is required." }, { status: 400 });
      }
      updates.name = name;
      updates.slug = name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!/^[A-Z0-9_-]{2,10}$/.test(code)) {
        return NextResponse.json({ error: "Invalid subject code." }, { status: 400 });
      }
      updates.code = code;
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    updates.updatedBy = token.uid;

    await getAdminDb().collection("academicSubjects").doc(subjectId).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update subject." },
      { status: 401 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { subjectId } = await params;

    await getAdminDb().collection("academicSubjects").doc(subjectId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete subject." },
      { status: 400 }
    );
  }
}
