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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const { db } = await requireAdmin(request);
    const { resourceId } = await params;

    const snap = await db
      .collection("academicResourceSections")
      .where("resourceId", "==", resourceId)
      .get();

    const sections = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load sections." },
      { status: 401 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const { db, uid } = await requireAdmin(request);
    const { resourceId } = await params;
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const description =
      typeof body.description === "string" ? body.description : "";
    const order = typeof body.order === "number" ? body.order : 0;
    const published = body.published === true;
    const active = body.active !== false;

    if (!title) {
      return NextResponse.json(
        { error: "Section title is required." },
        { status: 400 }
      );
    }

    const ref = db.collection("academicResourceSections").doc();

    await ref.set({
      resourceId,
      title,
      description,
      content,
      order,
      published,
      active,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create section." },
      { status: 401 }
    );
  }
}
