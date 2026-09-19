import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyBearerToken, isAllowedRole } from "@/lib/auth-server";
import { academicSlug } from "@/lib/academic-constants";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const decoded = await verifyBearerToken(request);
  const db = getAdminDb();

  const adminSnap = await db.collection("adminUsers").doc(decoded.uid).get();

  if (!adminSnap.exists) {
    throw new Error("FORBIDDEN");
  }

  const admin = adminSnap.data();

  if (
    admin?.active !== true ||
    !isAllowedRole(admin?.role, ["super_admin", "admin"])
  ) {
    throw new Error("FORBIDDEN");
  }

  return { uid: decoded.uid, role: admin.role };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await getAdminDb()
      .collection("academicSubjects")
      .orderBy("order", "asc")
      .get();

    const subjects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      subjects,
    });
  } catch (error) {
    console.error("Academic subjects GET error:", error);

    const message = error instanceof Error ? error.message : "";

    return NextResponse.json(
      {
        success: false,
        message:
          message === "FORBIDDEN"
            ? "You are not authorized to manage academic subjects."
            : "Unable to load academic subjects.",
      },
      { status: message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();

    const name = text(body.name);
    const code = text(body.code).toUpperCase();
    const description = text(body.description);
    const active = body.active !== false;
    const order = number(body.order, 0);

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Subject name is required." },
        { status: 400 }
      );
    }

    if (!code || !/^[A-Z0-9_-]{2,10}$/.test(code)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Subject code must contain 2–10 letters, numbers, underscores or hyphens.",
        },
        { status: 400 }
      );
    }

    const slug = academicSlug(name);

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "A valid subject name is required." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    const duplicateSnap = await db
      .collection("academicSubjects")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      return NextResponse.json(
        { success: false, message: "A subject with this name already exists." },
        { status: 409 }
      );
    }

    const subjectRef = db.collection("academicSubjects").doc();

    await subjectRef.set({
      name,
      slug,
      code,
      description,
      active,
      order,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: admin.uid,
    });

    return NextResponse.json({
      success: true,
      subject: {
        id: subjectRef.id,
        name,
        slug,
        code,
        description,
        active,
        order,
      },
    });
  } catch (error) {
    console.error("Academic subject POST error:", error);

    const message = error instanceof Error ? error.message : "";

    return NextResponse.json(
      {
        success: false,
        message:
          message === "FORBIDDEN"
            ? "You are not authorized to manage academic subjects."
            : "Unable to create academic subject.",
      },
      { status: message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}
