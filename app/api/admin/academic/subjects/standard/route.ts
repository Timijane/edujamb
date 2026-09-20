import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken, isAllowedRole } from "@/lib/auth-server";
import {
  DEFAULT_JAMB_SUBJECTS,
  academicSlug,
} from "@/lib/academic-constants";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const decoded = await verifyBearerToken(request);
  const db = getAdminDb();

  const snap = await db.collection("adminUsers").doc(decoded.uid).get();

  if (!snap.exists) throw new Error("FORBIDDEN");

  const admin = snap.data();

  if (
    admin?.active !== true ||
    !isAllowedRole(admin?.role, ["super_admin", "admin"])
  ) {
    throw new Error("FORBIDDEN");
  }

  return decoded.uid;
}

export async function POST(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const db = getAdminDb();

    const existingSnapshot = await db.collection("academicSubjects").get();

    const existingCodes = new Set(
      existingSnapshot.docs.map((doc) =>
        String(doc.data().code || "").toUpperCase()
      )
    );

    const created: string[] = [];

    for (const subject of DEFAULT_JAMB_SUBJECTS) {
      if (existingCodes.has(subject.code)) continue;

      const ref = db.collection("academicSubjects").doc();

      await ref.set({
        name: subject.name,
        slug: academicSlug(subject.name),
        code: subject.code,
        description: "",
        active: true,
        published: false,
        order: subject.order,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: uid,
      });

      created.push(subject.name);
    }

    return NextResponse.json({
      success: true,
      created,
      count: created.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return NextResponse.json(
      {
        success: false,
        message:
          message === "FORBIDDEN"
            ? "You are not authorized to manage academic subjects."
            : "Unable to create standard JAMB subjects.",
      },
      { status: message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}
